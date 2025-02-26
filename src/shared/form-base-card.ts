import { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import type { HomeAssistant, ServiceCallRequest } from "home-assistant-types";
import type { HassServiceTarget, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { RenderTemplateResult } from "home-assistant-types/dist/data/ws-templates";
import type { CallServiceActionConfig } from "home-assistant-types/dist/data/lovelace/config/action";
import type { FormCardConfig } from "../cards/form-card-config";
import type { FormEntityRowConfig } from "../cards/form-entity-row-config";

import { fireEvent, getValue, hasTemplate, subscribeRenderTemplate } from "../utils";

export type FormType = "base" | "card" | "entity-row";

export class FormBaseCard extends LitElement {
  protected readonly _formType: FormType = "base";

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public preview = false;

  @property({ attribute: false }) public formData?: Record<string, any>;

  @state() protected _formData!: this["formData"];

  @state() protected _initialValue?: Record<string, any>;

  @state() protected _config?: FormCardConfig | FormEntityRowConfig;

  @state() protected _templateResults: Record<string, RenderTemplateResult | undefined> = {};

  @state() protected _unsubRenderTemplates = new Map<string, Promise<UnsubscribeFunc>>();

  protected _debugData: HASSDomEvents["form-card-submit-action"] | null = null;

  constructor() {
    super();
    this.addEventListener("form-card-submit-action", (e: Event) => {
      this._debugData = (e as CustomEvent<HASSDomEvents["form-card-submit-action"]>).detail;
      this.requestUpdate();
    });
  }

  protected _updateInitialValue(): void {
    this._initialValue = structuredClone(this._formData);
  }

  protected _hasPendingChanges(): boolean {
    return JSON.stringify(this._formData) !== JSON.stringify(this._initialValue);
  }

  protected async _renderTemplate(template: string, variables: Record<string, any>): Promise<RenderTemplateResult> {
    return new Promise<RenderTemplateResult>((resolve, reject) => {
      const unsubscribePromise = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          resolve(result as RenderTemplateResult);
          unsubscribePromise.then((unsubscribe) => unsubscribe()).catch(reject);
        },
        {
          template,
          variables: {
            config: this._config,
            user: this.hass.user!.name,
            entity: this._config?.entity,
            ...variables,
          },
          strict: true,
        }
      );
      unsubscribePromise.catch(reject);
    });
  }

  protected async _tryDisconnectKey(key: string): Promise<void> {
    const unsubRenderTemplate = this._unsubRenderTemplates.get(key);
    if (!unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
      this._unsubRenderTemplates.delete(key);
    } catch (err: any) {
      if (err.code === "not_found" || err.code === "template_error") {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  protected isTemplate(key: string) {
    const value = getValue(key, this._config);
    return hasTemplate(value);
  }

  protected _getProcessedValue(key: string) {
    const value = getValue(key, this._config);
    if (this.isTemplate(key)) {
      const tpl = this._templateResults[key] ?? {};
      return "result" in tpl ? tpl.result : value;
    }
    return value;
  }

  protected async _performAction(actionConfig: CallServiceActionConfig, value: Record<string, any>) {
    const is_entity_row = this._formType === "entity-row";
    if (is_entity_row && Object.prototype.hasOwnProperty.call(value, "value")) {
      value = value.value ?? "";
    }

    // noinspection JSDeprecatedSymbols
    const perform_action = actionConfig.perform_action ?? actionConfig.service;
    // noinspection JSDeprecatedSymbols
    const actionData = actionConfig.data ?? actionConfig.service_data ?? {};
    let actionTarget: HassServiceTarget;
    if ((!actionConfig.target || Object.keys(actionConfig.target).length === 0) && this._config?.entity) {
      actionTarget = { entity_id: this._config.entity };
    } else {
      actionTarget = actionConfig.target ?? {};
    }

    const [domain, service] = perform_action.split(".");
    const variables = {
      value,
      config: this._config,
    };

    // Render all entries in service data as templates
    const processedData: Promise<any>[] = Object.entries(actionData).map(
      async ([key, v]): Promise<(string | any)[]> => {
        if (typeof v === "string" && hasTemplate(v)) {
          return [key, (await this._renderTemplate(v, variables)).result];
        }
        return [key, v];
      }
    );
    const processedTarget = Object.entries(actionTarget).map(async ([key, v]): Promise<(string | any)[]> => {
      if (typeof v === "string" && hasTemplate(v)) {
        return [key, (await this._renderTemplate(v, variables)).result];
      }
      return [key, v];
    });

    const { entity_id, ...serviceData } = (await Promise.all(processedData)).reduce(
      (acc, [key, v]) => ({ ...acc, [key]: v }),
      {}
    );
    const serviceTarget: HassServiceTarget = (await Promise.all(processedTarget)).reduce(
      (acc, [key, v]) => ({ ...acc, [key]: v }),
      {}
    );

    if (this._config?.spread_values_to_data && !is_entity_row) {
      Object.entries(value).forEach(([key, v]) => {
        if (!serviceData[key]) {
          serviceData[key] = v;
        }
      });
    }
    if (
      is_entity_row &&
      !Object.prototype.hasOwnProperty.call(serviceData, "value") &&
      this._config?.spread_values_to_data
    ) {
      serviceData.value = value;
    }

    if (this.preview) {
      fireEvent(this, "form-card-submit-action", {
        domain,
        service,
        data: serviceData,
        target: serviceTarget,
      });
    } else {
      await this.hass.callService(domain, service, serviceData, serviceTarget);
    }
  }
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "form-card-submit-action": {
      domain: ServiceCallRequest["domain"];
      service: ServiceCallRequest["service"];
      data: ServiceCallRequest["serviceData"];
      target: ServiceCallRequest["target"];
    };
  }
}
