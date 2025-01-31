import type { CSSResultGroup, PropertyValues } from "lit";
import { html, css, LitElement, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import { assert } from "superstruct";
import type { HomeAssistant } from "home-assistant-types";
import type { LovelaceConfig } from "home-assistant-types/dist/data/lovelace/config/types";
import type { LovelaceCardEditor } from "home-assistant-types/dist/panels/lovelace/types";
import type { LocalizeFunc } from "home-assistant-types/dist/common/translations/localize";
import type { HaFormSchema } from "home-assistant-types/dist/components/ha-form/types";
import type { UiAction } from "home-assistant-types/dist/panels/lovelace/components/hui-action-editor";

import memoizeOne from "memoize-one";
import { FORM_CARD_EDITOR_NAME } from "../const";
import type { FormCardConfig, FormCardFields } from "./form-card-config";
import { formCardConfigStruct } from "./form-card-config";
import setupCustomlocalize from "../localize";

import type { FormCardEditorFields } from "../components/form-card-editor-fields";
import { fireEvent, loadConfigDashboard, loadHaComponents } from "../utils";
import { computeActionsFormSchema } from "../shared/config";
import { GENERIC_LABELS } from "../utils/form/generic-fields";

import "../components/form-card-editor-fields";

const actions: UiAction[] = ["none", "perform-action"];
const layoutOptions = ["default", "horizontal", "vertical"];
const computeSchema = memoizeOne((t: LocalizeFunc): HaFormSchema[] => [
  {
    name: "title",
    selector: {
      text: {},
    },
  },
  {
    name: "layout",
    selector: {
      select: {
        options: layoutOptions.map((v) => ({
          value: v,
          label: t(`editor.form.layout_picker.values.${v}`),
        })),
      },
    },
  },
  {
    type: "expandable",
    title: t("editor.form.actions_heading.title"),
    description: {
      suffix: t("editor.form.actions_heading.description"),
    },
    name: "",
    schema: [
      {
        name: "save_label",
        selector: { text: {} },
      },
      {
        name: "spread_values_to_data",
        selector: { boolean: {} },
      },
      ...computeActionsFormSchema("save_action", actions),
    ],
  },
]);

@customElement(FORM_CARD_EDITOR_NAME)
export class FormCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @state() private _config?: FormCardConfig;

  @state() private _dirty = false;

  @property({ attribute: false }) public config!: FormCardConfig;

  @query("form-card-editor-fields")
  private _formFields?: FormCardEditorFields;

  private _openFields = true;

  protected updated(changedProps: PropertyValues) {
    if (this._openFields && changedProps.has("config")) {
      this._openFields = true;
      this._formFields?.updateComplete.then(() => {
        this._formFields?.focusLastField();
      });
    }
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this.hass.loadFragmentTranslation("config");
  }

  connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
    void loadConfigDashboard();
  }

  public setConfig(config: FormCardConfig): void {
    assert(config, formCardConfigStruct);
    this._config = config;
  }

  private _computeLabel = (schema: HaFormSchema) => {
    const customLocalize = setupCustomlocalize(this.hass!);

    if (GENERIC_LABELS.includes(schema.name)) {
      return customLocalize(`editor.card.fields.${schema.name}`) ?? schema.name;
    }
    return this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`) ?? schema.name;
  };

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const localize = setupCustomlocalize(this.hass!);
    const schema = computeSchema(localize);

    return html`
      <div class="header">
        <h2 id="fields-heading" class="name">${localize("editor.form.fields_heading.title")}</h2>
      </div>
      <form-card-editor-fields
        role="region"
        aria-labelledby="fields-heading"
        .fields=${this._config?.fields}
        .schema=${schema}
        .disable=${this.disabled}
        .hass=${this.hass}
        @value-changed=${this._fieldsChanged}
      ></form-card-editor-fields>
      ${!("fields" in this._config)
        ? html`
            <ha-button
              outlined
              @click=${this._addFields}
              .disabled=${this.disabled}
              .label=${localize("editor.form.field.add_fields")}
            >
              <ha-icon icon="mdi:form-text-box" slot="icon"></ha-icon>
            </ha-button>
          `
        : nothing}
      <div class="header">
        <h2 id="form-heading" class="name">${localize("editor.form.form_heading.title")}</h2>
      </div>
      <ha-form
        aria-labelledby="form-heading"
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  //
  private _addFields() {
    if ("fields" in this._config!) {
      return;
    }
    this._formFields?.addFields();
    this._dirty = true;
  }

  private _fieldsChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = {
      ...this._config!,
      fields: ev.detail.value as FormCardFields,
    };
    fireEvent(this, "config-changed", { config: value });
  }

  private _valueChanged(ev: CustomEvent) {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {|
          display: block;
        }

        ha-card {
          overflow: hidden;
        }

        .description {
          margin: 0;
        }

        p {
          margin-bottom: 0;
        }

        .header {
          display: flex;
          align-items: center;
        }

        .header:first-child {
          margin-top: -16px;
        }

        .header .name {
          font-size: 20px;
          font-weight: 400;
          flex: 1;
        }

        .header a {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "form-card-editor": FormCardEditor;
  }
}
