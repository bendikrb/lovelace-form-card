import {
  LitElement,
  CSSResultGroup,
  html,
  css,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import memoizeOne from "memoize-one";
import { UnsubscribeFunc } from "home-assistant-js-websocket";

import {
  ActionConfig,
  fireEvent,
  HomeAssistant,
  subscribeRenderTemplate,
  RenderTemplateResult,
} from "../ha";

import { FORM_ENTITY_ROW_NAME } from "../const";

import { FormEntityRowConfig } from "./form-entity-row-config";

import { applyToStrings } from "../utils/tools";

const OPTIONS = [
  "icon",
  "name",
  "show_state",
  "secondary",
  "value",
  "entity",
] as const;

@customElement(FORM_ENTITY_ROW_NAME)
export class FormEntityRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: FormEntityRowConfig;

  private _schema = memoizeOne(
    (selector: any, name: string) =>
      [
        {
          name: "value",
          label: name,
          selector: selector && typeof selector === "object" ? selector : {},
        },
      ] as const
  );

  @state() private _templateResults: Partial<
    Record<string, RenderTemplateResult | undefined>
  > = {};

  @state() private _unsubRenderTemplates: Map<
    string,
    Promise<UnsubscribeFunc>
  > = new Map();

  public static async getStubConfig(
    _hass: HomeAssistant
  ): Promise<FormEntityRowConfig> {
    return {
      type: "custom:form-entity-row",
      name: "Hello, {{user}}",
      secondary: "How are you?",
      icon: "mdi:home",
    };
  }

  setConfig(config: FormEntityRowConfig) {
    OPTIONS.forEach((key) => {
      if (
        this._config?.[key] !== config[key] ||
        this._config?.entity !== config.entity
      ) {
        void this._tryDisconnectKey(key);
      }
    });

    this._config = { ...config };
  }

  public connectedCallback() {
    super.connectedCallback();
    void this._tryConnect();
  }

  public disconnectedCallback() {
    void this._tryDisconnect();
  }

  public isTemplate(key: string) {
    const value = this._config?.[key];
    return value?.includes("{");
  }

  private getValue(key: string) {
    return this.isTemplate(key)
      ? this._templateResults[key]?.result
      : this._config?.[key];
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    void this._tryConnect();
  }

  private async _tryConnect(): Promise<void> {
    for (const key of OPTIONS) {
      await this._tryConnectKey(key);
    }

    const selector = await applyToStrings(
      this._config?.selector,
      this._renderSelectorTemplate.bind(this)
    );
    if (selector && this._config) {
      this._config.selector = selector;
    }
  }

  private async _renderSelectorTemplate(template: string): Promise<string> {
    const variables = {
      config: this._config,
      user: this.hass.user!.name,
      entity: this._config?.entity,
    };
    const val = await this._renderTemplate(template, variables);
    return val.result;
  }

  private async _renderTemplate(
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

  private async _tryConnectKey(key: string): Promise<void> {
    if (
      this._unsubRenderTemplates.get(key) !== undefined ||
      !this.hass ||
      !this._config ||
      !this.isTemplate(key)
    ) {
      return;
    }

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResults = {
            ...this._templateResults,
            [key]: result as RenderTemplateResult,
          };
        },
        {
          template: this._config[key] ?? "",
          entity_ids: this._config.entity,
          variables: {
            config: this._config,
            user: this.hass.user!.name,
            entity: this._config.entity,
          },
          strict: true,
        }
      );
      this._unsubRenderTemplates.set(key, sub);
      await sub;
    } catch (_err) {
      const result = {
        result: this._config[key] ?? "",
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = {
        ...this._templateResults,
        [key]: result,
      };
      this._unsubRenderTemplates.delete(key);
    }
  }

  private async _tryDisconnect(): Promise<void> {
    OPTIONS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: string): Promise<void> {
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

  _actionHandler(_ev: CustomEvent) {
    // return this._action?.(ev);
    return null;
  }

  render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const entity_id = this.getValue("entity");
    const base = this.hass.states[entity_id];
    const entity = (base && JSON.parse(JSON.stringify(base))) || {
      entity_id: "binary_sensor.",
      attributes: { icon: "no:icon", friendly_name: "" },
      state: "off",
    };

    const icon =
      this._config.icon !== undefined
        ? this._config.icon || "no:icon"
        : undefined;
    const color = this.getValue("color");

    const name =
      this.getValue("name") ??
      entity?.attributes?.friendly_name ??
      entity?.entity_id;

    const state_value = this.getValue("state") ?? base?.state;
    const value = this.getValue("value") ?? state_value;

    const schema = this._schema(this._config.selector, name);
    const data = {
      value,
    };

    const has_action = true;
    const show_state = false;

    return html`
      <div id="wrapper" class="">
        <state-badge
          .hass=${this.hass}
          .stateObj=${entity}
          .overrideIcon=${icon}
          .color=${color}
          @action=${this._actionHandler}
          class=${classMap({ pointer: has_action })}
        ></state-badge>
        <div class=${classMap({ info: true, pointer: has_action })}>
          <ha-form
            .hass=${this.hass}
            .data=${data}
            .schema=${schema}
            .computeLabel=${this._computeLabelCallback}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        ${show_state ? html` <div class="state">${state_value}</div>` : nothing}
      </div>
      <div id="staging">
        <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        </hui-generic-entity-row>
      </div>
    `;
  }

  _computeLabelCallback(s) {
    return s.label ?? s.name;
  }

  private async _performAction(action: ActionConfig, value: any) {
    if (
      action.action === "call-service" ||
      action.action === "perform-action"
    ) {
      const variables = {
        value: value.value,
      };
      const actionData = { ...action.data, ...action.service_data };

      const serviceData = {};
      for (const k in actionData) {
        if (typeof actionData[k] === "string") {
          serviceData[k] = (
            await this._renderTemplate(actionData[k], variables)
          ).result;
        } else {
          serviceData[k] = actionData[k];
        }
      }

      const [domain, service] = action.perform_action.split(".");
      const payload = {
        domain,
        service,
        service_data: serviceData,
        target: {},
      };
      if (action.target) {
        payload.target = action.target;
      }

      await this.hass.callWS({
        type: "call_service",
        ...payload,
      });
    }
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };
    if (this._config?.change_action) {
      void this._performAction(this._config.change_action, value);
    }

    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return [
      (customElements.get("hui-generic-entity-row") as any)?.styles,
      css`
        :host {
          display: inline;
        }
        #wrapper {
          display: flex;
          align-items: center;
          flex-direction: row;
        }
        .state {
          text-align: right;
        }
        #wrapper {
          min-height: 40px;
        }
        #wrapper.hidden {
          display: none;
        }
        #staging {
          display: none;
        }
        #selector ha-textfield {
          margin: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "form-entity-row": FormEntityRow;
  }
}
