import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import memoizeOne from "memoize-one";
import { fireEvent } from "../ha";
import { slugify } from "../utils/tools";
import type { SchemaUnion } from "../utils/form/ha-form";
import type { FormCardField } from "../cards/form-card-config";
import { cardStyle } from "../utils/card-styles";
import type { HomeAssistant } from "../ha";
import setupCustomlocalize from "../localize";
import { GENERIC_LABELS } from "../utils/form/generic-fields";
import { haStyle } from "../ha/resources/styles";

import {
  mdiDelete,
  mdiDotsVertical,
  mdiPlaylistEdit,
  mdiPlus,
} from "../ha/resources/mdi";

const preventDefault = (ev: any) => ev.preventDefault();
const stopPropagation = (ev: any) => ev.stopPropagation();

@customElement("form-card-editor-field-row")
export class FormCardEditorFieldRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public key!: string;

  @property({ attribute: false, type: Array }) public excludeKeys: string[] =
    [];

  @property({ attribute: false }) public field!: FormCardField;

  @property({ type: Boolean }) public disabled = false;

  @state() private _uiError?: Record<string, string>;

  @state() private _yamlError?: undefined | "yaml_error" | "key_not_unique";

  @state() private _yamlMode: boolean = false;

  private _errorKey?: string;

  private _schema = memoizeOne(
    () =>
      [
        {
          name: "name",
          selector: { text: {} },
        },
        {
          name: "key",
          selector: { text: {} },
        },
        {
          name: "description",
          selector: { text: {} },
        },
        {
          name: "selector",
          selector: { selector: {} },
        },
        {
          name: "entity",
          selector: { entity: {} },
        },
        {
          name: "value",
          selector: { text: {} },
        },
        {
          name: "required",
          selector: { boolean: {} },
        },
      ] as const
  );

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  protected render() {
    const schema = this._schema();
    const data = { ...this.field, key: this._errorKey ?? this.key };
    const yamlValue = { [this.key]: this.field };
    const localize = setupCustomlocalize(this.hass!);

    // @ts-ignore
    return html`
      <ha-card outlined>
        <ha-expansion-panel leftChevron>
          <h3 slot="header">${this.key}</h3>
          <slot name="icons" slot="icons"></slot>
          <ha-button-menu
            slot="icons"
            @action=${this._handleAction}
            @closed=${stopPropagation}
            @click=${preventDefault}
            fixed
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            >
            </ha-icon-button>
            <ha-list-item graphic="icon">
              ${localize(
                `editor.card.fields.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiPlaylistEdit}
              ></ha-svg-icon>
            </ha-list-item>
            <ha-list-item
              class="warning"
              graphic="icon"
              .disabled=${this.disabled}
            >
              ${localize("editor.card.generic.delete")}
              <ha-svg-icon
                class="warning"
                slot="graphic"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-list-item>
          </ha-button-menu>
          <div class=${classMap({ "card-content": true })}>
            ${this._yamlMode
              ? html` ${this._yamlError
                    ? html` <ha-alert alert-type="error">
                        ${this.hass.localize(
                          `ui.panel.config.script.editor.field.${this._yamlError}`
                        )}
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
                ></ha-form>`}
          </div>
        </ha-expansion-panel>
      </ha-card>
    `;
  }

  private async _handleAction(ev: CustomEvent) {
    switch (ev.detail.index) {
      case 0:
        this._yamlMode = !this._yamlMode;
        break;
      case 1:
        this._onDelete();
        break;
    }
  }

  private _onDelete() {
    if (
      confirm(
        this.hass.localize(
          "ui.panel.config.script.editor.field_delete_confirm_text"
        )
      )
    ) {
      fireEvent(this, "value-changed", { value: null });
    }
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };

    if (typeof value !== "object" || Object.keys(value).length !== 1) {
      this._yamlError = "yaml_error";
      return;
    }
    const key = Object.keys(value)[0];
    if (this.excludeKeys.includes(key)) {
      this._yamlError = "key_not_unique";
      return;
    }
    this._yamlError = undefined;

    const newValue = { ...value[key], key };

    fireEvent(this, "value-changed", { value: newValue });
  }

  private _maybeSetKey(value): void {
    const nameChanged = value.name !== this.field.name;
    const keyChanged = value.key !== this.key;
    if (!nameChanged || keyChanged) {
      return;
    }
    const slugifyName = this.field.name
      ? slugify(this.field.name)
      : this.hass.localize("ui.panel.config.script.editor.field.field") ||
        "field";
    const regex = new RegExp(`^${slugifyName}(_\\d)?$`);
    if (regex.test(this.key)) {
      let key = !value.name
        ? this.hass.localize("ui.panel.config.script.editor.field.field") ||
          "field"
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
      value.key = key;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };
    console.log("_valueChanged", value);
    this._maybeSetKey(value);

    // Don't allow to set an empty key, or duplicate an existing key.
    if (!value.key || this.excludeKeys.includes(value.key)) {
      this._uiError = value.key
        ? {
            key: "key_not_unique",
          }
        : {
            key: "key_not_null",
          };
      this._errorKey = value.key ?? "";
      return;
    }
    this._errorKey = undefined;
    this._uiError = undefined;

    // If we render the default with an incompatible selector, it risks throwing an exception and not rendering.
    // Clear the default when changing the selector type.
    if (
      Object.keys(this.field.selector!)[0] !== Object.keys(value.selector)[0]
    ) {
      delete value.default;
    }

    fireEvent(this, "value-changed", { value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    const customLocalize = setupCustomlocalize(this.hass!);
    if (GENERIC_LABELS.includes(schema.name)) {
      return customLocalize(`editor.card.fields.${schema.name}`);
    }
    switch (schema.name) {
      default:
        return this.hass.localize(
          `ui.panel.config.script.editor.field.${schema.name}`
        );
    }
  };

  private _computeError = (error: string) => {
    return (
      this.hass.localize(
        `ui.panel.config.script.editor.field.${error}` as any
      ) || error
    );
  };

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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "form-card-editor-field-row": FormCardEditorFieldRow;
  }
}
