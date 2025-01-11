import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import {
  ActionHandlerEvent,
  HomeAssistant,
  LovelaceCardEditor,
} from "../ha";

import { FORM_CARD_EDITOR_NAME, FORM_CARD_NAME } from "../const";
import { FormCardConfig } from "./form-card-config";
import { cardStyle } from "../utils/card-styles";


@customElement(FORM_CARD_NAME)
export class FormCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() protected _config?: FormCardConfig;

  // protected get _stateObj(): E | undefined {
  //   if (!this._config || !this.hass || !this._config.entity) return undefined;

  //   const entityId = this._config.entity;
  //   return this.hass.states[entityId] as E;
  // }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./form-card-editor");
    return document.createElement(
      FORM_CARD_EDITOR_NAME
    ) as LovelaceCardEditor;
  }

  setConfig(config: FormCardConfig): void {
    this._config = {
      ...config,
    };
  }

  public static async getStubConfig(
    _hass: HomeAssistant
  ): Promise<FormCardConfig> {
    // const entities = Object.keys(hass.states);
    return {
      type: `custom:${FORM_CARD_NAME}`,
      form: [

      ]
      // entity: entities[0],
    };
  }

  private _handleAction(_ev: ActionHandlerEvent) {
    // handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  protected render() {
    if (!this._config || !this.hass || !this._config.entity) {
      return nothing;
    }

    // const stateObj = this._stateObj;
    // if (!stateObj) {
    //   return this.renderNotFound(this._config);
    // }

    // const name = this._config.name || stateObj.attributes.friendly_name || "";
    // const icon = this._config.icon;
    // const appearance = computeAppearance(this._config);
    const fill_container = false;
    // const picture = computeEntityPicture(stateObj, appearance.icon_type);
    // const rtl = computeRTL(this.hass);

    return html`
      <ha-card
        class=${classMap({ "fill-container": fill_container })}
      >

      </ha-card>
    `;
  }


  static get styles(): CSSResultGroup {
    return [
      cardStyle,
      css`

      `,
    ];
  }
}
