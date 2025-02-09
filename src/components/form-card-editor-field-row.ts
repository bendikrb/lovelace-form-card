// noinspection ES6UnusedImports

import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import memoizeOne from "memoize-one";

import type { HomeAssistant } from "home-assistant-types";
import type { SchemaUnion } from "home-assistant-types/dist/components/ha-form/types";
import type { HaYamlEditor } from "home-assistant-types/dist/components/ha-yaml-editor";
import type { HaExpansionPanel } from "home-assistant-types/dist/components/ha-expansion-panel";

import { mdiDelete, mdiDotsVertical, mdiPlaylistEdit, mdiArrowUp, mdiArrowDown } from "@mdi/js";
import { haStyle } from "../shared/styles";

import { hasTemplate, fireEvent, slugify, cardStyle } from "../utils";
import type { FormCardField } from "../cards/form-card-config";
import setupCustomlocalize from "../localize";
import { GENERIC_LABELS } from "../utils/form/generic-fields";
import { handleStructError } from "../shared/config";

const preventDefault = (ev: any) => ev.preventDefault();
const stopPropagation = (ev: any) => ev.stopPropagation();

@customElement("form-card-editor-field-row")
export class FormCardEditorFieldRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public key!: string;

  @property({ attribute: false, type: Array }) public excludeKeys: string[] = [];

  @property({ attribute: false }) public field!: FormCardField;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public first?: boolean;

  @property({ type: Boolean }) public last?: boolean;

  @property({ type: Boolean }) public disabled = false;

  @state() private _uiError?: Record<string, string>;

  @state() private _yamlError?: undefined | "yaml_error" | "key_not_unique";

  @state() private _warnings?: string[];

  @state() private _uiModeAvailable = true;

  @state() private _yamlMode = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  private _errorKey?: string;

  private _schema = memoizeOne(
    () =>
      [
        {
          type: "grid",
          name: "",
          schema: [
            {
              name: "name",
              selector: { text: { autocomplete: "off" } },
            },
            {
              name: "label",
              selector: { text: { autocomplete: "off" } },
            },
          ],
        },
        {
          name: "selector",
          selector: { selector: {} },
        },
        {
          type: "grid",
          name: "",
          schema: [
            {
              name: "description",
              selector: { text: { autocomplete: "off" } },
            },
            {
              name: "default",
              selector: { text: { autocomplete: "off" } },
            },
          ],
        },
        {
          name: "entity",
          selector: { entity: {} },
        },
        {
          type: "grid",
          name: "",
          schema: [
            {
              name: "disabled",
              selector: { boolean: {} },
            },
            {
              name: "required",
              selector: { boolean: {} },
            },
          ],
        },
      ] as const
  );

  protected willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("field")) {
      return;
    }
    const field = this.field;
    this._uiModeAvailable = !hasTemplate(field);

    if (!this._uiModeAvailable && !this._yamlMode) {
      this._yamlMode = true;
    }
  }

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("field")) {
      return;
    }
    if (this._yamlMode) {
      const yamlEditor = this._yamlEditor;
      if (yamlEditor && JSON.stringify(yamlEditor.value) !== JSON.stringify([this.field])) {
        yamlEditor.setValue([this.field]);
      }
    }
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  protected render() {
    const schema = this._schema();
    const data = { ...this.field, name: this._errorKey ?? this.key };
    const yamlValue = [this.field];
    const localize = setupCustomlocalize(this.hass!);
    const headerLabel = this._computeHeaderLabel(data);

    // @ts-ignore
    return html`
      <ha-card outlined>
        <ha-expansion-panel leftChevron>
          <h3 slot="header">${headerLabel}</h3>
          <slot name="icons" slot="icons"></slot>
          <ha-button-menu
            slot="icons"
            @action=${this._handleAction}
            @closed=${stopPropagation}
            @click=${preventDefault}
            fixed
          >
            <ha-icon-button slot="trigger" .label=${localize("ui.common.menu")} .path=${mdiDotsVertical}>
            </ha-icon-button>
            <ha-list-item graphic="icon" .disabled=${this.disabled || this.first}>
              ${localize("ui.panel.config.automation.editor.move_up")}
              <ha-svg-icon slot="graphic" .path=${mdiArrowUp}></ha-svg-icon
            ></ha-list-item>

            <ha-list-item graphic="icon" .disabled=${this.disabled || this.last}>
              ${localize("ui.panel.config.automation.editor.move_down")}
              <ha-svg-icon slot="graphic" .path=${mdiArrowDown}></ha-svg-icon>
            </ha-list-item>

            <ha-list-item graphic="icon" .disabled=${!this._uiModeAvailable}>
              ${localize(`ui.panel.config.automation.editor.edit_${!this._yamlMode ? "yaml" : "ui"}`)}
              <ha-svg-icon slot="graphic" .path=${mdiPlaylistEdit}></ha-svg-icon>
            </ha-list-item>

            <li divider role="separator"></li>

            <ha-list-item class="warning" graphic="icon" .disabled=${this.disabled}>
              ${localize("editor.card.generic.delete")}
              <ha-svg-icon class="warning" slot="graphic" .path=${mdiDelete}></ha-svg-icon>
            </ha-list-item>
          </ha-button-menu>
          <div class=${classMap({ "card-content": true })}>
            ${this._warnings
              ? html`<ha-alert
                  alert-type="warning"
                  .title=${this.hass.localize("ui.errors.config.editor_not_supported")}
                >
                  ${this._warnings!.length > 0 && this._warnings![0] !== undefined
                    ? html` <ul>
                        ${this._warnings!.map((warning) => html`<li>${warning}</li>`)}
                      </ul>`
                    : ""}
                  ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
                </ha-alert>`
              : ""}
            ${this._yamlMode
              ? html` ${this._yamlError
                    ? html` <ha-alert alert-type="error">
                        ${this.hass.localize(`ui.panel.config.script.editor.field.${this._yamlError}`)}
                      </ha-alert>`
                    : nothing}
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${yamlValue}
                    @value-changed=${this._onYamlChange}
                  ></ha-yaml-editor>`
              : html` <ha-form
                  .schema=${schema}
                  .data=${data}
                  .error=${this._uiError}
                  .hass=${this.hass}
                  .disabled=${this.disabled}
                  .computeLabel=${this._computeLabelCallback}
                  .computeError=${this._computeError}
                  @value-changed=${this._valueChanged}
                  @ui-mode-not-available=${this._handleUiModeNotAvailable}
                ></ha-form>`}
          </div>
        </ha-expansion-panel>
      </ha-card>
    `;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    // Prevent possible parent action-row from switching to yamlMode
    ev.stopPropagation();

    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
  }

  private async _handleAction(ev: CustomEvent) {
    switch (ev.detail.index) {
      case 0:
        fireEvent(this, "move-up");
        break;
      case 1:
        fireEvent(this, "move-down");
        break;
      case 2:
        this._yamlMode = !this._yamlMode;
        this.expand();
        break;
      case 3:
        this._onDelete();
        break;
    }
  }

  private _onDelete() {
    if (confirm(this.hass.localize("ui.panel.config.script.editor.field_delete_confirm_text"))) {
      fireEvent(this, "value-changed", { value: null });
    }
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    const value = (ev.detail.value as FormCardField[])[0];

    if (typeof value !== "object") {
      this._yamlError = "yaml_error";
      return;
    }
    const key = value.name;
    if (this.excludeKeys.includes(key)) {
      this._yamlError = "key_not_unique";
      return;
    }
    this._yamlError = undefined;

    const newValue = { ...value };

    fireEvent(this, "value-changed", { value: newValue });
  }

  private _maybeSetKey(value: FormCardField): void {
    const labelChanged = value.label !== this.field.label;
    const keyChanged = value.name !== this.key;
    if (!labelChanged || keyChanged) {
      return;
    }
    const slugifyLabel = this.field.label
      ? slugify(this.field.label)
      : this.hass.localize("ui.panel.config.script.editor.field.field") || "field";
    const regex = new RegExp(`^${slugifyLabel}(_\\d)?$`);
    if (regex.test(this.key)) {
      let key = !value.name
        ? this.hass.localize("ui.panel.config.script.editor.field.field") || "field"
        : slugify(value.name);
      if (this.excludeKeys.includes(key as string)) {
        let uniqueKey = key;
        let i = 2;
        do {
          uniqueKey = `${key}_${i}`;
          i++;
        } while (this.excludeKeys.includes(uniqueKey));
        key = uniqueKey;
      }
      value.name = key;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as FormCardField;
    this._maybeSetKey(value);

    // Don't allow to set an empty key, or duplicate an existing key.
    if (!value.name || this.excludeKeys.includes(value.name)) {
      this._uiError = value.name
        ? {
            key: "key_not_unique",
          }
        : {
            key: "key_not_null",
          };
      this._errorKey = value.name ?? "";
      return;
    }
    this._errorKey = undefined;
    this._uiError = undefined;

    // If we render the default with an incompatible selector, it risks throwing an exception and not rendering.
    // Clear the default when changing the selector type.
    if (Object.keys(this.field.selector!)[0] !== Object.keys(value.selector)[0]) {
      delete value.default;
    }

    fireEvent(this, "value-changed", { value });
  }

  private _computeHeaderLabel(field: FormCardField) {
    let labelPrefix = "";
    if (field.selector) {
      const selectorType = Object.keys(field.selector)[0];
      labelPrefix = this.hass.localize(`ui.components.selectors.selector.types.${selectorType}`) ?? "";
    }
    return `${labelPrefix ? `${labelPrefix}: ` : ""}${field.name}`;
  }

  private _computeLabelCallback = (schema: SchemaUnion<ReturnType<typeof this._schema>>): string => {
    const customLocalize = setupCustomlocalize(this.hass!);
    if (GENERIC_LABELS.includes(schema.name)) {
      return customLocalize(`editor.card.fields.${schema.name}`);
    }
    return this.hass.localize(`ui.panel.config.script.editor.field.${schema.name}`);
  };

  private _computeError = (error: string) =>
    this.hass.localize(`ui.panel.config.script.editor.field.${error}` as any) || error;

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      cardStyle,
      css`
        ha-button-menu,
        ha-icon-button {
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }

        .disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 0 0 8px;
          --expansion-panel-content-padding: 0;
        }
        .card-content {
          padding: 16px;
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius, 12px);
          border-top-left-radius: var(--ha-card-border-radius, 12px);
        }
        mwc-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
        mwc-list-item.hidden {
          display: none;
        }
        .warning ul {
          margin: 4px 0;
        }

        .root > :not([own-margin]):not(:last-child) {
          margin-bottom: 24px;
        }

        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }

        .action-icon {
          display: none;
        }

        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "form-card-editor-field-row": FormCardEditorFieldRow;
  }
}
