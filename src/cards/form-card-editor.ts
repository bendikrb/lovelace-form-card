import {
  CSSResultGroup,
  html,
  css,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import { assert } from "superstruct";
import {
  HomeAssistant,
  LovelaceConfig,
  LovelaceCardEditor,
  fireEvent,
  LocalizeFunc,
} from "../ha";
import { FORM_CARD_EDITOR_NAME } from "../const";
import {
  FormCardConfig,
  formCardConfigStruct,
  FormCardFields,
} from "./form-card-config";
import setupCustomlocalize from "../localize";

import "../components/form-card-editor-fields";
import { FormCardEditorFields } from "../components/form-card-editor-fields";
import { type HaFormSchema } from "../utils/form/ha-form";
import { loadConfigDashboard, loadHaComponents } from "../utils/loader";
import { computeActionsFormSchema } from "../shared/config/actions-config";
import { GENERIC_LABELS } from "../utils/form/generic-fields";
import { type UiAction } from "../utils/form/ha-selector";
import memoizeOne from "memoize-one";

const actions: UiAction[] = ["perform-action", "none"];
const layoutOptions = ["horizontal", "vertical", "default"];
const computeSchema = memoizeOne(
  (t: LocalizeFunc, useCallService: boolean): HaFormSchema[] => [
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
      title: "Actions",
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
        ...computeActionsFormSchema("save_action", actions, useCallService),
      ],
    },
  ]
);

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
      console.log("[form-card-editor] updated()");
    }
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
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
    return (
      this.hass!.localize(
        `ui.panel.lovelace.editor.card.generic.${schema.name}`
      ) ?? schema.name
    );
  };

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const localize = setupCustomlocalize(this.hass!);
    const schema = computeSchema(localize, false);

    return html`
      <div class="header">
        <h2 id="fields-heading" class="name">
          ${localize("editor.form.fields_heading.title")}
        </h2>
      </div>
      <form-card-editor-fields
        role="region"
        .hass=${this.hass}
        aria-labelledby="fields-heading"
        .fields=${this._config?.fields}
        .schema=${schema}
        .disable=${this.disabled}
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
        <h2 id="form-heading" class="name">
          ${localize("editor.form.form_heading.title")}
        </h2>
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
    console.log("[form-card-editor] _fieldsChanged()");
    fireEvent(this, "config-changed", { config: value });
  }

  private _valueChanged(ev: CustomEvent) {
    console.log("[form-card-editor] _valueChanged()");
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
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
