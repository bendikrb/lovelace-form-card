import { css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import type { CSSResultGroup, PropertyValues } from "lit";
import type { HomeAssistant } from "home-assistant-types";
import type { LovelaceCard, LovelaceCardEditor } from "home-assistant-types/dist/panels/lovelace/types";
import type { ActionConfig } from "home-assistant-types/dist/data/lovelace/config/action";
import type { RenderTemplateResult } from "home-assistant-types/dist/data/ws-templates";
import type { HaProgressButton } from "home-assistant-types/dist/components/buttons/ha-progress-button";
import type { HaFormSchema, HaFormSelector } from "home-assistant-types/dist/components/ha-form/types";

import {
  subscribeRenderTemplate,
  cardStyle,
  loadHaComponents,
  loadConfigDashboard,
  registerCustomCard,
  fireEvent,
  slugify,
  loadDeveloperToolsTemplate,
  hasTemplate,
} from "../utils";
import setupCustomlocalize from "../localize";

import { FORM_CARD_EDITOR_NAME, FORM_CARD_NAME } from "../const";
import type { FormCardConfig, FormCardField } from "./form-card-config";
import { handleStructError } from "../shared/config";
import { FormBaseCard } from "../shared/form-base-card";
import { computeInitialHaFormData } from "../utils/form/compute-initial-ha-form-data";

registerCustomCard({
  type: FORM_CARD_NAME,
  name: "Form Card",
  description: "Card to build forms",
});

@customElement(FORM_CARD_NAME)
export class FormCard extends FormBaseCard implements LovelaceCard {
  protected readonly _formType = "card";

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: {
    action: string;
    data?: Record<string, any>;
  };

  @state() protected _config?: FormCardConfig;

  @state() private _processedSchema: HaFormSchema[] = [];

  @state() private _formData?: Record<string, any>;

  @state() private _errorMsg?: string;

  @state() private _warnings?: string[];

  @state() private _yamlMode = false;

  setConfig(config: FormCardConfig) {
    if (!config.fields) {
      throw new Error("You need to define form fields");
    }

    // Disconnect old templates
    // if (this._config) {
    //   this._disconnectOldTemplates(this._config, config);
    // }
    this._value = {
      action: "action",
      data: {},
    };

    this._config = { ...config };
  }

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    void loadHaComponents();
    void loadConfigDashboard();

    void this._tryConnect();
    if (this.hass && this._config) {
      this._processedSchema = this._schema(this._config.fields);
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has("hass") || changedProps.has("_config")) {
      if (this.hass && this._config) {
        this._tryConnect().then(() => {
          this._processedSchema = this._schema(this._config!.fields);
        });
      }
    }

    if (changedProps.has("_templateResults")) {
      this._processedSchema = this._schema(this._config!.fields);
    }
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./form-card-editor");
    await loadHaComponents();
    await loadDeveloperToolsTemplate();
    return document.createElement(FORM_CARD_EDITOR_NAME) as LovelaceCardEditor;
  }

  public static async getStubConfig(hass: HomeAssistant): Promise<FormCardConfig> {
    const entities = Object.keys(hass.states);
    const entity_id = entities[0];
    const field_name = entity_id.substring(0, 15);
    const field_key = slugify(field_name);
    return {
      type: `custom:${FORM_CARD_NAME}`,
      fields: [
        {
          name: field_key,
          label: field_name,
          selector: {
            text: {},
          },
        },
      ],
    };
  }

  public getCardSize(): number {
    return 3;
  }

  private _findTemplatesInObject(obj: any, path: string[] = []): [string, string][] {
    const templates: [string, string][] = [];

    if (typeof obj === "string" && hasTemplate(obj)) {
      templates.push([path.join("."), obj]);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (path?.[0] === "fields") {
          index = item.name;
        }
        templates.push(...this._findTemplatesInObject(item, [...path, String(index)]));
      });
    } else if (typeof obj === "object" && obj !== null) {
      for (const key in obj) {
        if (key !== "name") {
          templates.push(...this._findTemplatesInObject(obj[key], [...path, key]));
        }
      }
    }

    return templates;
  }

  private _getTemplateKey(fieldId: string | undefined, path: string): string {
    return fieldId ? `${fieldId}.${path}` : path;
  }

  private async _tryConnect(): Promise<void> {
    if (!this._config) return;

    const allTemplates: { fieldId?: string; path: string; template: string }[] = [];

    const foundTemplates = this._findTemplatesInObject(this._config);
    foundTemplates.forEach(([path, template]) => {
      allTemplates.push({ path, template });
    });

    // Connect all templates
    const promises = allTemplates.map((t) => this._tryConnectTemplate(t.fieldId, t.path, t.template));
    await Promise.all(promises);
  }

  private async _tryConnectTemplate(fieldId: string | undefined, path: string, template: string): Promise<void> {
    const templateKey = this._getTemplateKey(fieldId, path);

    if (this._unsubRenderTemplates.has(templateKey) || !this.hass) {
      return;
    }

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResults = {
            ...this._templateResults,
            [templateKey]: result as RenderTemplateResult,
          };
        },
        {
          template,
          variables: {
            fields: this._value,
            value: this._value,
          },
          strict: true,
          report_errors: true,
        }
      );
      this._unsubRenderTemplates.set(templateKey, sub);
      await sub;
    } catch (err) {
      // Handle subscription failure (e.g., set a default value)
      this._templateResults = {
        ...this._templateResults,
        [templateKey]: { result: "Subscription failed" } as RenderTemplateResult,
      };
      this._unsubRenderTemplates.delete(templateKey);
    }
  }

  private _processTemplatedObject(fieldId: string, obj: any, pathPrefix = ""): any {
    if (!obj) return obj;
    pathPrefix = pathPrefix ? `${pathPrefix}.` : "";

    const processValue = (value: any): any => {
      if (typeof value === "string" && hasTemplate(value)) {
        // Find the template result for this value
        const path = this._findTemplatesInObject(obj).find(([_, template]) => template === value)?.[0];
        if (path) {
          const templateKey = this._getTemplateKey(`${pathPrefix}${fieldId}`, path);
          const res = this._templateResults[templateKey] ?? {};
          return "result" in res ? res.result : value;
        }
        return value;
      }

      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          return value.map((item) => processValue(item));
        }
        return Object.entries(value).reduce((acc, [k, v]) => ({ ...acc, [k]: processValue(v) }), {});
      }

      return value;
    };

    return processValue(obj);
  }

  private _schema(fields: FormCardField[]): HaFormSchema[] {
    return fields.map((field) => {
      const templatedField = this._processTemplatedObject(field.name, field, "fields");
      if (templatedField.entity && !templatedField.default) {
        const entity_id = templatedField.entity;
        const base = this.hass.states[entity_id];
        const entity = (base && JSON.parse(JSON.stringify(base))) || {
          entity_id: "binary_sensor.",
          attributes: { icon: "no:icon", friendly_name: "" },
          state: "off",
        };
        templatedField.default = entity?.state ?? undefined;
      }

      const schemaItem: HaFormSelector = {
        name: field.name,
        selector: templatedField.selector,
        required: templatedField.required,
        disabled: templatedField.disabled,
        default: templatedField.default,
        description: templatedField.placeholder
          ? {
              suggested_value: templatedField.placeholder,
            }
          : undefined,
        context: {
          label: templatedField.label,
          description: templatedField.description,
          entity: templatedField.entity,
        },
      };
      return schemaItem;
    });
  }

  private get _formDataProcessed() {
    if (this._formData !== undefined) {
      return this._formData;
    }

    this._formData = computeInitialHaFormData(this._processedSchema);
    return this._formData;
  }

  render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const formData = this._formDataProcessed;
    const title = this._getProcessedValue("title");
    const hasPendingChanges = this._hasPendingChanges();
    const fill_container = false;
    const save_label = this._getProcessedValue("save_label") ?? this.hass.localize("ui.common.save");

    return html`
      <ha-card
        .header=${title}
        class=${classMap({
          "fill-container": fill_container,
          "no-header": !title,
        })}
      >
        <div class="card-content">
          ${this._warnings
            ? html`<ha-alert alert-type="warning" .title=${this.hass.localize("ui.errors.config.editor_not_supported")}>
                ${this._warnings!.length > 0 && this._warnings![0] !== undefined
                  ? html` <ul>
                      ${this._warnings!.map((warning) => html`<li>${warning}</li>`)}
                    </ul>`
                  : ""}
                ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
              </ha-alert>`
            : ""}
          <ha-form
            .hass=${this.hass}
            .schema=${this._processedSchema}
            .data=${formData}
            .error=${this._errorMsg}
            .computeLabel=${this._computeLabel}
            .computeHelper=${this._computeHelper}
            .computeError=${this._computeError}
            @value-changed=${this._formDataChanged}
            @ui-mode-not-available=${this._handleUiModeNotAvailable}
          ></ha-form>
          ${this._errorMsg ? html`<div class="error">${this._errorMsg}</div>` : nothing}
          <div class="card-actions">
            <ha-button @click=${this._resetChanges} .disabled=${!hasPendingChanges}>
              ${this.hass.localize("ui.common.undo")}
            </ha-button>
            <ha-progress-button @click=${this._handleSave}> ${save_label} </ha-progress-button>
          </div>
        </div>
        ${this.preview ? this._renderDebug() : nothing}
      </ha-card>
    `;
  }

  private _renderDebug() {
    if (!this._debugData) {
      return nothing;
    }
    return html`
      <ha-expansion-panel class="debug">
        <span slot="header">Debug</span>
        <ha-yaml-editor read-only auto-update .value=${this._debugData}></ha-yaml-editor>
      </ha-expansion-panel>
    `;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    ev.stopPropagation();

    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
  }

  private _computeLabel = (schema: HaFormSchema): string => {
    if (schema.context?.label) {
      return schema.context.label;
    }
    return schema.name;
  };

  private _computeHelper = (schema: HaFormSchema): string | undefined => {
    if (schema.context?.description) {
      return schema.context.description;
    }
    return undefined;
  };

  private _computeError = (error: string) => error;

  private _resetChanges(): void {
    if (this._initialValue) {
      this._value = structuredClone(this._initialValue);

      fireEvent(this, "value-changed", { value: this._value });
    }
  }

  private _formDataChanged(ev: CustomEvent) {
    // ev.stopPropagation();
    // const value = {
    //   ...ev.detail.value,
    // };
    //
    // this._value = value;
    // fireEvent(this, "value-changed", { value });
    this._formData = ev.detail.value;
  }

  public async performAction(actionConfig: ActionConfig, value: any) {
    if (actionConfig.action !== "call-service" && actionConfig.action !== "perform-action") {
      return;
    }
    const variables = {
      value,
    };

    // noinspection JSDeprecatedSymbols
    const processedData: Promise<any>[] = Object.entries(actionConfig.data ?? actionConfig.service_data ?? {}).map(
      async ([key, v]): Promise<(string | any)[]> => {
        if (typeof v === "string" && hasTemplate(v)) {
          return [key, (await this._renderTemplate(v, variables)).result];
        }
        return [key, v];
      }
    );

    const serviceData = (await Promise.all(processedData)).reduce((acc, [key, v]) => ({ ...acc, [key]: v }), {});

    const updatedActionConfig = {
      ...actionConfig,
      serviceData,
    };

    await this._performAction(updatedActionConfig, value);
  }

  private async _handleSave(ev: CustomEvent) {
    const button = ev.target as HaProgressButton;
    if (button.progress) {
      return;
    }
    if (!this._config?.save_action) {
      return;
    }
    const customLocalize = setupCustomlocalize(this.hass!);
    const formData = this._value;
    const allRequiredInfoFilledIn =
      formData === undefined
        ? // If no data filled in, just check that any field is required
          this._processedSchema.find((field) => field.required) === undefined
        : // If data is filled in, make sure all required fields are
          formData &&
          this._processedSchema.every((field) => !field.required || !["", undefined].includes(formData![field.name]));

    if (!allRequiredInfoFilledIn) {
      this._errorMsg = customLocalize("card.not_all_required_fields");
      return;
    }

    button.progress = true;
    this._errorMsg = undefined;

    try {
      // const processedValue = this._getProcessedFormValue()?.data;
      const processedValue = this._value;
      await this.performAction(this._config.save_action, processedValue);

      button.actionSuccess();
      if (this._config.reset_on_submit) {
        this._resetChanges();
      } else {
        this._updateInitialValue();
      }
    } catch (err: any) {
      button.actionError();
      this._errorMsg = err.message;
    } finally {
      button.progress = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      cardStyle,
      css`
        ha-settings-row.layout-horizontal {
        }
        ha-settings-row {
          --paper-time-input-justify-content: flex-end;
          --settings-row-content-width: 100%;
          --settings-row-prefix-display: contents;
          border-top: var(--service-control-items-border-top, 1px solid var(--divider-color));
        }
        .error {
          color: red;
        }
        .description {
          justify-content: space-between;
          display: flex;
          align-items: center;
          padding-right: 2px;
          padding-inline-end: 2px;
          padding-inline-start: initial;
        }
        .description p {
          direction: ltr;
        }
        ha-expansion-panel {
          --ha-card-border-radius: 0;
          --expansion-panel-summary-padding: 0 16px;
          --expansion-panel-content-padding: 0;
        }
        ha-card {
          max-width: 600px;
          margin: 0 auto;
          height: 100%;
          justify-content: space-between;
          flex-direction: column;
          display: flex;
        }
        ha-alert,
        ha-form {
          margin-top: 24px;
          display: block;
        }
        .card-content {
          display: flex;
          justify-content: space-between;
          flex-direction: column;
          padding: 0 16px 0 16px;
        }
        .no-header .card-content {
          padding-top: 16px;
        }
        .card-actions {
          text-align: right;
          height: 48px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-top: 16px;
        }
        .card-content > *:not(:first-child) {
          display: block;
          margin-top: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "form-card": FormCard;
  }
}
