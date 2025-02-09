import type { CSSResultGroup, PropertyValues } from "lit";
import { html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import memoizeOne from "memoize-one";

import type { HomeAssistant } from "home-assistant-types";
import type { ActionConfig } from "home-assistant-types/dist/data/lovelace/config/action";
import type { RenderTemplateResult } from "home-assistant-types/dist/data/ws-templates";

import type { LovelaceRowEditor } from "home-assistant-types/dist/panels/lovelace/types";
import { FormBaseCard } from "../shared/form-base-card";
import { fireEvent, subscribeRenderTemplate, applyToStrings } from "../utils";

import { FORM_ENTITY_ROW_EDITOR_NAME, FORM_ENTITY_ROW_NAME } from "../const";

import type { FormEntityRowConfig } from "./form-entity-row-config";

const OPTIONS = ["icon", "name", "value", "entity"] as const;

@customElement(FORM_ENTITY_ROW_NAME)
export class FormEntityRow extends FormBaseCard {
  protected readonly _formType = "entity-row";

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() protected _config?: FormEntityRowConfig;

  public static async getConfigElement(): Promise<LovelaceRowEditor> {
    await import("./form-entity-row-editor");
    return document.createElement(FORM_ENTITY_ROW_EDITOR_NAME) as LovelaceRowEditor;
  }

  private _schema = memoizeOne(
    (selector: any, name: string, description: string) =>
      [
        {
          name: "value",
          label: name,
          selector: selector && typeof selector === "object" ? selector : {},
          helper: description,
        },
      ] as const
  );

  public static async getStubConfig(hass: HomeAssistant): Promise<FormEntityRowConfig> {
    const entities = Object.keys(hass.states);
    const entity_id = entities[0];
    return {
      type: "custom:form-entity-row",
      name: '{{ state_attr(config.entity, "friendly_name") }}',
      value: "{{ states(config.entity) }}",
      icon: hass.states[entity_id].attributes.icon ?? "",
      entity: entity_id,
      selector: {
        text: {},
      },
      spread_values_to_data: false,
      change_action: {
        action: "none",
      },
    };
  }

  setConfig(config: FormEntityRowConfig) {
    OPTIONS.forEach((key) => {
      if (this._config?.[key] !== config[key] || this._config?.entity !== config.entity) {
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
    super.disconnectedCallback();
    void this._tryDisconnect();
  }

  public isTemplate(key: string) {
    const value = this._config?.[key];
    return value?.includes("{");
  }

  protected _getValue(key: string) {
    return this.isTemplate(key) ? this._templateResults[key]?.result : this._config?.[key];
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

    const selector = await applyToStrings(this._config?.selector, this._renderSelectorTemplate.bind(this));
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

  private async _tryConnectKey(key: string): Promise<void> {
    if (this._unsubRenderTemplates.get(key) !== undefined || !this.hass || !this._config || !this.isTemplate(key)) {
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

  protected _actionHandler(_ev: CustomEvent) {
    // return this._action?.(ev);
    return null;
  }

  render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const entity_id = this._getValue("entity");
    const base = this.hass.states[entity_id];
    const entity = (base && JSON.parse(JSON.stringify(base))) || {
      entity_id: "binary_sensor.",
      attributes: { icon: "no:icon", friendly_name: "" },
      state: "off",
    };

    const icon = this._config.icon !== undefined ? this._config.icon || "no:icon" : undefined;
    const color = this._getValue("color");

    const name =
      this._getValue("name") ?? this._getValue("label") ?? entity?.attributes?.friendly_name ?? entity?.entity_id;

    const state_value = this._getValue("state") ?? base?.state;
    const value = this._getValue("value") ?? state_value;
    const description = this._getValue("description") ?? undefined;

    const schema = this._schema(this._config.selector, name, description);
    const data = {
      value,
    };
    const selectorName = this._config.selector ? `selector-${Object.keys(this._config.selector)[0]}` : "selector-text";
    const wrapperClasses = {
      [selectorName]: true,
    };
    const has_action = true;
    const show_state = false;

    return html`
      <div id="wrapper" class=${classMap(wrapperClasses)}>
        <state-badge
          .hass=${this.hass}
          .stateObj=${entity}
          .overrideIcon=${icon}
          .color=${color}
          @action=${this._actionHandler}
          class=${classMap({ pointer: has_action })}
        ></state-badge>
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${schema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
        ${show_state ? html` <div class="state">${state_value}</div>` : nothing}
      </div>
      <div id="staging">
        <hui-generic-entity-row .hass=${this.hass} .config=${this._config}> </hui-generic-entity-row>
      </div>
      ${this.preview ? this._renderDebug() : nothing}
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

  protected _computeLabel(s: any) {
    return s.label ?? s.name ?? undefined;
  }

  public async performAction(actionConfig: ActionConfig, value: Record<string, any>) {
    if (actionConfig.action !== "call-service" && actionConfig.action !== "perform-action") {
      return;
    }
    await this._performAction(actionConfig, value);
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };
    if (this._config?.change_action) {
      const data = {
        ...value,
      };
      void this.performAction(this._config.change_action, data);
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
        #wrapper ha-form {
          display: inline-flex;
          flex-direction: column;
          width: 100%;
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
