import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { fireEvent, HomeAssistant } from "../ha";
import type { FormCardFields } from "../cards/form-card-config";
import { loadHaComponents } from "../utils/loader";
import "./form-card-editor-field-row";
import type { FormCardEditorFieldRow } from "./form-card-editor-field-row";
import { mdiPlus } from "../ha/resources/mdi";
import setupCustomlocalize from "../localize";

@customElement("form-card-editor-fields")
export class FormCardEditorFields extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public fields!: FormCardFields;

  @property({ type: Boolean }) public disabled = false;

  private _focusLastActionOnChange = false;

  public connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
  }

  public addFields() {
    // this._openFields = true;
    this._addField();
  }

  private _addField() {
    const key = this._getUniqueKey(
      this.hass.localize("ui.panel.config.script.editor.field.field") ||
        "field",
      this.fields || {}
    );
    const fields = {
      ...(this.fields || {}),
      [key]: {
        selector: {
          text: null,
        },
      },
    };
    this._focusLastActionOnChange = true;
    fireEvent(this, "value-changed", { value: fields });
  }

  public focusLastField() {
    const row = this.shadowRoot!.querySelector<FormCardEditorFieldRow>(
      "form-card-editor-field-row:last-of-type"
    )!;
    row.updateComplete.then(() => {
      row.expand();
      row.scrollIntoView();
      row.focus();
    });
  }

  protected render() {
    if (!this.hass || !this.fields) return nothing;

    const localize = setupCustomlocalize(this.hass!);

    return html`
      <div class="info">
        <div class="fields">
          ${Object.entries(this.fields).map(
            ([key, field]) => html`
              <form-card-editor-field-row
                .key=${key}
                .excludeKeys=${Object.keys(this.fields).filter(
                  (k) => k !== key
                )}
                .field=${field}
                .disabled=${this.disabled}
                @value-changed=${this._fieldChanged}
                .hass=${this.hass}
              >
              </form-card-editor-field-row>
            `
          )}
          <ha-button
            outlined
            @click=${this._addField}
            .disabled=${this.disabled}
            .label=${localize("editor.form.field.add_field")}
          >
            <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
          </ha-button>
        </div>
      </div>
    `;
  }

  private _fieldChanged(ev: CustomEvent) {
    ev.stopPropagation();

    const key = (ev.target as any).key;
    let fields: FormCardFields = {};
    if (ev.detail.value === null) {
      fields = { ...this.fields };
      delete fields[key];
    } else {
      const newValue = { ...ev.detail.value };
      const newKey = newValue.key;
      delete newValue.key;
      const keyChanged = key !== newKey;

      // If key is changed, recreate the object to maintain the same insertion order.
      if (keyChanged) {
        Object.entries(this.fields).forEach(([k, v]) => {
          if (k === key) {
            fields[newKey] = newValue;
          } else fields[k] = v;
        });
      } else {
        fields = { ...this.fields };
        fields[key] = newValue;
      }
    }
    fireEvent(this, "value-changed", { value: fields });
  }

  private _getUniqueKey(base: string, fields: FormCardFields): string {
    let key = base;
    if (base in fields) {
      let i = 2;
      do {
        key = `${base}_${i}`;
        i++;
      } while (key in fields);
    }
    return key;
  }

  static get styles(): CSSResultGroup {
    return css`
      form-card-editor-field-row {
        display: block;
        margin-bottom: 16px;
        scroll-margin-top: 48px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "form-card-editor-fields": FormCardEditorFields;
  }
}
