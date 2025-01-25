import { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import type { HomeAssistant, ServiceCallRequest } from "home-assistant-types";
import type {
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";

import type { RenderTemplateResult } from "home-assistant-types/dist/data/ws-templates";
import type { CallServiceActionConfig } from "home-assistant-types/dist/data/lovelace/config/action";
import { fireEvent, subscribeRenderTemplate } from "../utils";
import type { FormCardConfig } from "../cards/form-card-config";
import type { FormEntityRowConfig } from "../cards/form-entity-row-config";

export class FormBaseCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public editMode? = false;

  @state() protected _config?: FormCardConfig | FormEntityRowConfig;

  @state() protected _unsubRenderTemplates = new Map<
    string,
    Promise<UnsubscribeFunc>
  >();

  protected async _renderTemplate(
    template: string,
    variables: Record<string, any>
  ): Promise<RenderTemplateResult> {
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

  protected async _performAction(
    actionConfig: CallServiceActionConfig,
    value: Record<string, any>
  ) {
    // noinspection JSDeprecatedSymbols
    const perform_action = actionConfig.perform_action ?? actionConfig.service;
    // noinspection JSDeprecatedSymbols
    const actionData = actionConfig.data ?? actionConfig.service_data ?? {};

    const [domain, service] = perform_action.split(".");
    const variables = {
      value,
      config: this._config,
    };

    // Render all entries in service data as templates
    const processedData: Promise<any>[] = Object.entries(actionData).map(
      async ([key, v]): Promise<(string | any)[]> => {
        if (typeof v === "string" && v.includes("{")) {
          return [key, (await this._renderTemplate(v, variables)).result];
        }
        return [key, v];
      }
    );

    const { entity_id, ...serviceData } = (
      await Promise.all(processedData)
    ).reduce((acc, [key, v]) => ({ ...acc, [key]: v }), {});

    if (this._config?.spread_values_to_data) {
      Object.entries(value).forEach(([key, v]) => {
        if (!serviceData[key]) {
          serviceData[key] = v;
        }
      });
    }

    let serviceTarget: HassServiceTarget | undefined;
    if (actionConfig.target) {
      serviceTarget = actionConfig.target;
    } else if (entity_id) {
      serviceTarget = { entity_id };
    }

    if (this.editMode) {
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
