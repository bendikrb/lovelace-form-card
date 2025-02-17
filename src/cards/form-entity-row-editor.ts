import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import memoizeOne from "memoize-one";

import type { HomeAssistant } from "home-assistant-types";
import type { LocalizeFunc } from "home-assistant-types/dist/common/translations/localize";
import type { LovelaceRowEditor } from "home-assistant-types/dist/panels/lovelace/types";
import type { HaFormSchema } from "home-assistant-types/dist/components/ha-form/types";
import type { EntitiesCardEntityConfig } from "home-assistant-types/dist/panels/lovelace/cards/types";
import type { UiAction } from "home-assistant-types/dist/panels/lovelace/components/hui-action-editor";
// noinspection ES6UnusedImports
import type { ConfigChangedEvent } from "home-assistant-types/dist/panels/lovelace/editor/hui-element-editor";
import { computeDomain } from "../utils/entity/compute_domain";

import { fireEvent, loadHaComponents } from "../utils";
import setupCustomlocalize from "../localize";
import { computeActionsFormSchema } from "../shared/config";

const actions: UiAction[] = ["none", "perform-action"];
const computeSchema = memoizeOne((t: LocalizeFunc): HaFormSchema[] => {
  return [
    {
      name: "entity",
      selector: { entity: {} },
    },
    {
      type: "grid",
      name: "",
      schema: [
        {
          name: "name",
          selector: { text: {} },
        },
        {
          name: "icon",
          selector: { icon: {} },
          context: {
            icon_entity: "entity",
          },
        },
      ],
    },
    {
      name: "default",
      selector: { template: {} },
    },
    {
      name: "selector",
      selector: { selector: {} },
    },
    {
      type: "expandable",
      name: "",
      title: t("editor.form.actions_heading.title"),
      description: {
        suffix: t("editor.form.actions_heading.description"),
      },
      icon: "mdi:playlist-edit",
      schema: [
        {
          name: "spread_values_to_data",
          selector: { boolean: {} },
        },
        ...computeActionsFormSchema("change_action", actions),
      ],
    },
  ] as const;
});

@customElement("form-entity-row-editor")
export class FormEntityRowEditor extends LitElement implements LovelaceRowEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntitiesCardEntityConfig;

  public connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
  }

  public setConfig(config: EntitiesCardEntityConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const localize = setupCustomlocalize(this.hass!);
    const schema = computeSchema(localize);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabel = (schema: HaFormSchema) => {
    const customLocalize = setupCustomlocalize(this.hass!);

    switch (schema.name) {
      case "change_action":
      case "selector":
      case "spread_values_to_data":
      case "default":
        return customLocalize(`editor.card.fields.${schema.name}`);
      default:
        return this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`);
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "form-entity-row-editor": FormEntityRowEditor;
  }
}
