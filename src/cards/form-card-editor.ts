import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { assert } from "superstruct";
import { HomeAssistant, LovelaceCardEditor, LovelaceConfig, fireEvent } from "../ha";
import { computeActionsFormSchema } from "../shared/config/actions-config";
import { HaFormSchema } from "../utils/form/ha-form";
import { loadHaComponents } from "../utils/loader";
import { FORM_CARD_EDITOR_NAME } from "../const";
import { FormCardConfig, formCardConfigStruct } from "./form-card-config";

const SCHEMA: HaFormSchema[] = [
    { name: "entity", selector: { entity: {} } },
    { name: "name", selector: { text: {} } },
    {
        type: "grid",
        name: "",
        schema: [
            {
                name: "icon",
                selector: { icon: {} },
                context: { icon_entity: "entity" },
            },
        ],
    },
    ...computeActionsFormSchema(),
];

@customElement(FORM_CARD_EDITOR_NAME)
export class FormCardEditor extends LitElement implements LovelaceCardEditor {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @state() private _config?: FormCardConfig;

    connectedCallback() {
        super.connectedCallback();
        void loadHaComponents();
    }

    public setConfig(config: FormCardConfig): void {
        assert(config, formCardConfigStruct);
        this._config = config;
    }

    private _computeLabel = (schema: HaFormSchema) => {
        return this.hass!.localize(
            `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    };

    protected render() {
        if (!this.hass || !this._config) {
            return nothing;
        }

        return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
    }

    private _valueChanged(ev: CustomEvent): void {
        fireEvent(this, "config-changed" as keyof HASSDomEvents, { config: ev.detail.value });
    }
}
