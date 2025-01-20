import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import type { HomeAssistant } from "home-assistant-types";
import type { LovelaceCardEditor } from "home-assistant-types/dist/panels/lovelace/types";
import type { ActionConfig } from "home-assistant-types/dist/data/lovelace/config/action";
import type {
  RenderTemplateError,
  RenderTemplateResult,
} from "home-assistant-types/dist/data/ws-templates";
import type { HaProgressButton } from "home-assistant-types/dist/components/buttons/ha-progress-button";

import { subscribeRenderTemplate } from "../utils/ws-templates";

// import "../ha/components/ha-card";
// import "../ha/components/ha-button";

import { FORM_CARD_EDITOR_NAME, FORM_CARD_NAME } from "../const";
import type { FormCardConfig, FormCardField } from "./form-card-config";
import { cardStyle } from "../utils/card-styles";
import { loadHaComponents, loadConfigDashboard } from "../utils/loader";
import { registerCustomCard } from "../utils/custom-cards";
import { FormBaseCard } from "../shared/form-base-card";
import { fireEvent } from "../utils/fire_event";

registerCustomCard({
  type: FORM_CARD_NAME,
  name: "Form Card",
  description: "Card to build forms",
});

@customElement(FORM_CARD_NAME)
export class FormCard extends FormBaseCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: {
    action: string;
    data?: Record<string, any>;
  };

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() protected _config?: FormCardConfig;

  @state() private _value!: this["value"];

  @state() private _initialValue?: {
    action: string;
    data?: Record<string, any>;
  };

  @state() private _error?: string;

  @state() private _templateResults: Record<
    string,
    Record<string, RenderTemplateResult | RenderTemplateError | undefined>
  > = {};

  // @state() private _unsubRenderTemplates: Map<
  //   string,
  //   Promise<UnsubscribeFunc>
  // > = new Map();

  private _getTemplateKey(fieldId: string, path: string): string {
    return `${fieldId}:${path}`;
  }

  private _findTemplatesInObject(
    obj: any,
    _parentPath = ""
  ): [string, string][] {
    const templates: [string, string][] = [];

    const traverse = (current: any, path: string[] = []) => {
      if (!current) return;

      if (typeof current === "string" && current.includes("{")) {
        templates.push([path.join("."), current]);
      } else if (typeof current === "object" && !Array.isArray(current)) {
        Object.entries(current).forEach(([key, value]) => {
          traverse(value, [...path, key]);
        });
      }
    };

    traverse(obj);
    return templates;
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./form-card-editor");
    await loadHaComponents();
    // await setupFormCardEditorFields();
    return document.createElement(FORM_CARD_EDITOR_NAME) as LovelaceCardEditor;
  }

  public static async getStubConfig(
    hass: HomeAssistant
  ): Promise<FormCardConfig> {
    const entities = Object.keys(hass.states);
    const entity_id = entities[0];
    const field_name = entity_id.substring(0, 15);
    return {
      type: `custom:${FORM_CARD_NAME}`,
      layout: "default",
      fields: {
        [field_name]: {
          name: field_name,
          selector: {
            text: {},
          },
        },
      },
    };
  }

  setConfig(config: FormCardConfig) {
    // Disconnect any templates that are no longer present or have changed
    Object.entries(config.fields).forEach(([fieldId, fieldConfig]) => {
      const oldTemplates = this._findTemplatesInObject(
        this._config?.fields[fieldId] || {}
      );
      const newTemplates = this._findTemplatesInObject(fieldConfig);

      // Disconnect templates that are no longer present or have changed
      oldTemplates.forEach(([path, oldTemplate]) => {
        const newTemplate = newTemplates.find(([p, _]) => p === path)?.[1];
        if (!newTemplate || newTemplate !== oldTemplate) {
          void this._tryDisconnectKey(this._getTemplateKey(fieldId, path));
        }
      });
    });

    this._value = {
      action: "action",
      data: {},
    };

    // Initialize data with default values from config
    if (config.fields) {
      Object.entries(config.fields).forEach(([key, field]) => {
        if (field.value !== undefined) {
          this._value!.data![key] = field.value;
        }
      });
    }

    this._initialValue = structuredClone(this._value);

    this._config = { ...config };
  }

  private async _tryConnect(): Promise<void> {
    if (!this._config?.fields) return;

    Object.entries(this._config.fields).forEach(([fieldId, fieldConfig]) => {
      const templates = this._findTemplatesInObject(fieldConfig);
      templates.forEach(([path, template]) => {
        const templateKey = this._getTemplateKey(fieldId, path);
        this._tryConnectTemplate(
          fieldId,
          path,
          template,
          templateKey,
          fieldConfig
        );
      });
    });
  }

  private async _tryConnectTemplate(
    fieldId: string,
    path: string,
    template: string,
    templateKey: string,
    fieldConfig: FormCardField
  ): Promise<void> {
    if (
      this._unsubRenderTemplates.get(templateKey) !== undefined ||
      !this.hass ||
      !this._config
    ) {
      return;
    }

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResults = {
            ...this._templateResults,
            [fieldId]: {
              ...(this._templateResults[fieldId] || {}),
              [path]: result,
            },
          };
        },
        {
          template,
          entity_ids: fieldConfig.entity,
          variables: {
            config: this._config,
            user: this.hass.user!.name,
            entity: fieldConfig.entity,
          },
          strict: true,
        }
      );
      this._unsubRenderTemplates.set(templateKey, sub);
      await sub;
    } catch (_err) {
      const result = {
        result: template,
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = {
        ...this._templateResults,
        [fieldId]: {
          ...(this._templateResults[fieldId] || {}),
          [path]: result,
        },
      };
      this._unsubRenderTemplates.delete(templateKey);
    }
  }

  private _processTemplatedObject(fieldId: string, obj: any): any {
    if (!obj) return obj;

    const processValue = (value: any): any => {
      if (typeof value === "string" && value.includes("{")) {
        // Find the template result for this value
        const path = this._findTemplatesInObject(obj).find(
          ([_, template]) => template === value
        )?.[0];
        if (path) {
          const res = this._templateResults[fieldId]?.[path] ?? {};
          return "result" in res ? res.result : value;
        }
        return value;
      }

      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          return value.map((item) => processValue(item));
        }
        return Object.entries(value).reduce(
          (acc, [k, v]) => ({ ...acc, [k]: processValue(v) }),
          {}
        );
      }

      return value;
    };

    return processValue(obj);
  }

  public connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
    void loadConfigDashboard();

    void this._tryConnect();
  }

  public isTemplate(key: string) {
    const value = this._config?.[key];
    return value?.includes("{");
  }

  protected _getValue(key: string) {
    return this.isTemplate(key)
      ? this._templateResults[key]?.result
      : this._config?.[key];
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    if (changedProps.has("value") && this.value) {
      this._value = {
        action: this.value.action,
        data: { ...this.value.data },
      };
      this._initialValue = structuredClone(this._value);
    }
    void this._tryConnect();
  }

  private _hasPendingChanges(): boolean {
    return JSON.stringify(this._value) !== JSON.stringify(this._initialValue);
  }

  private async _renderTemplateWithResult(template: string): Promise<string> {
    const variables = {
      config: this._config,
      user: this.hass.user!.name,
      entity: this._config?.entity,
    };
    const val = await this._renderTemplate(template, variables);
    return val.result;
  }

  private _getProcessedFieldValue(key: string, field: any): any {
    // First check if we have a user-edited value
    if (
      this._value?.data?.[key] !== undefined &&
      this._value?.data?.[key] !== this._initialValue?.data?.[key]
    ) {
      return this._value?.data?.[key];
    }

    // Process the field's value template if it exists
    const processedField = this._processTemplatedObject(key, field);
    return processedField.value;
  }

  private _getProcessedFormValue(): this["value"] {
    if (!this._config?.fields) {
      return this._value;
    }

    const processedData: Record<string, any> = {};

    // Process all fields, including ones that haven't been edited
    Object.entries(this._config.fields).forEach(([key, field]) => {
      processedData[key] = this._getProcessedFieldValue(key, field);
    });

    return {
      action: this._value?.action ?? "action",
      data: processedData,
    };
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const hasPendingChanges = this._hasPendingChanges();

    const formFields = Object.entries(this._config.fields).map(
      ([fieldId, fieldConfig]) => {
        // Process the entire field config to resolve any templates
        const processedConfig = this._processTemplatedObject(
          fieldId,
          fieldConfig
        );
        const fieldValue = this._getProcessedFieldValue(fieldId, fieldConfig);

        const entity_id = processedConfig.entity;
        const base = this.hass.states[entity_id];
        const entity = (base && JSON.parse(JSON.stringify(base))) || {
          entity_id: "binary_sensor.",
          attributes: { icon: "no:icon", friendly_name: "" },
          state: "off",
        };

        const name =
          processedConfig.name ??
          entity?.attributes?.friendly_name ??
          entity?.entity_id;

        // const state = processedConfig.state ?? base?.state;
        return {
          key: fieldId,
          name,
          description: processedConfig.description ?? undefined,
          required: processedConfig.required ?? undefined,
          selector: processedConfig.selector ?? undefined,
          entity: entity_id,
          value: fieldValue,
          placeholder: processedConfig.placeholder ?? undefined,
          disabled: processedConfig.disabled ?? undefined,
        };
      }
    );

    const fill_container = false;
    const disabled = false;
    const save_label =
      this._getValue("save_label") ?? this.hass.localize("ui.common.save");

    return html`
      <ha-card class=${classMap({ "fill-container": fill_container })}>
        <div class="card-content">
          ${formFields.map((dataField) => this._renderField(dataField))}
          <div class="card-actions">
            <ha-button
              @click=${this._resetChanges}
              .disabled=${!hasPendingChanges}
            >
              ${this.hass.localize("ui.common.undo")}
            </ha-button>
            <ha-progress-button
              @click=${this._handleSave}
              .disabled=${disabled}
            >
              ${save_label}
            </ha-progress-button>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderField = (dataField: any) => {
    const selector = dataField?.selector ?? { text: undefined };
    const layout = this._config?.layout ?? "default";
    const useSettingsRow = layout === "horizontal" || layout === "vertical";

    // @ts-ignore
    const selectorElement = html`
      <ha-selector
        .hass=${this.hass}
        .selector=${selector}
        .key=${dataField.key}
        @value-changed=${this._formDataChanged}
        .value=${dataField.value}
        .placeholder=${dataField.placeholder ?? undefined}
        .required=${dataField.required ?? undefined}
        .disabled=${dataField.disabled ?? undefined}
        .label=${dataField.name ?? undefined}
        .helper=${dataField.helper ?? undefined}
      ></ha-selector>
    `;

    if (!useSettingsRow) {
      return selectorElement;
    }

    return html`
      <ha-settings-row
        .narrow=${this.narrow}
        .slim=${layout === "horizontal"}
        class=${`layout-${layout}`}
      >
        ${layout === "horizontal"
          ? [
              dataField.name
                ? html`<span slot="heading">${dataField.name}</span>`
                : "",
              dataField.description
                ? html`<span slot="description"
                    >${dataField?.description}</span
                  >`
                : "",
            ]
          : ""}
        ${selectorElement}
      </ha-settings-row>
    `;
  };

  private _formDataChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    const key = target.key;

    if (!this._value) {
      this._value = {
        action: "action",
        data: {},
      };
    }

    this._value = {
      ...this._value,
      data: {
        ...this._value.data,
        [key]: ev.detail.value,
      },
    };

    fireEvent(this, "value-changed", { value: this._value });
  }

  private _resetChanges(): void {
    if (this._initialValue) {
      this._value = structuredClone(this._initialValue);

      fireEvent(this, "value-changed", { value: this._value });
    }
  }

  public async performAction(actionConfig: ActionConfig, value: any) {
    if (
      actionConfig.action !== "call-service" &&
      actionConfig.action !== "perform-action"
    ) {
      return;
    }
    const variables = {
      value: value.value,
    };

    const processedData: Promise<any>[] = Object.entries(
      actionConfig.data ?? actionConfig.service_data ?? {}
    ).map(async ([key, v]): Promise<(string | any)[]> => {
      if (typeof v === "string" && v.includes("{")) {
        return [key, (await this._renderTemplate(v, variables)).result];
      }
      return [key, v];
    });

    const serviceData = (await Promise.all(processedData)).reduce(
      (acc, [key, v]) => ({ ...acc, [key]: v }),
      {}
    );

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

    button.progress = true;
    this._error = undefined;

    try {
      const processedValue = this._getProcessedFormValue()?.data;
      await this.performAction(this._config.save_action, processedValue);

      button.actionSuccess();
    } catch (err: any) {
      button.actionError();
      this._error = err.message;
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
          border-top: var(
            --service-control-items-border-top,
            1px solid var(--divider-color)
          );
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
        .content {
          padding: 28px 20px 0;
          max-width: 1040px;
          margin: 0 auto;
        }
        ha-card {
          max-width: 600px;
          margin: 0 auto;
          height: 100%;
          justify-content: space-between;
          flex-direction: column;
          display: flex;
        }
        .card-content {
          display: flex;
          justify-content: space-between;
          flex-direction: column;
          padding: 16px 16px 0 16px;
        }
        .card-actions {
          text-align: right;
          height: 48px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-top: 16px;
        }
        .card-content > * {
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
