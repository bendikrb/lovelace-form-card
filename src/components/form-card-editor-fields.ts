import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { mdiPlus, mdiDrag } from "@mdi/js";

import type { HomeAssistant } from "home-assistant-types";

import type { FormCardField, FormCardFields } from "../cards/form-card-config";
import type { FormCardEditorFieldRow } from "./form-card-editor-field-row";
// eslint-disable-next-line
import type { HaSortable } from "home-assistant-types/dist/components/ha-sortable";
import { fireEvent } from "../utils/fire_event";
import { loadHaComponents } from "../utils/loader";
import "./form-card-editor-field-row";
import setupCustomlocalize from "../localize";
import { reorderRecord } from "../utils/tools";

@customElement("form-card-editor-fields")
export class FormCardEditorFields extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public fields!: FormCardFields;

  @property({ type: Boolean }) public disabled = false;

  @state() private _showReorder = true;

  private _fieldKeys = new WeakMap<FormCardField, string>();

  private _focusLastActionOnChange = false;

  public connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
  }

  private _getIndex(key: string) {
    return Object.keys(this.fields).indexOf(key);
  }

  // private _getKey(index: number) {
  //   const keys = Object.keys(this.fields);
  //   return keys[index] ?? keys[0];
  // }
  private _getKey(field: FormCardField) {
    return Object.values(this.fields).indexOf(field) ?? -1;
  }

  private _moveUp(ev) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    const newIndex = index - 1;
    this._move(index, newIndex);
  }

  private _moveDown(ev) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    const newIndex = index + 1;
    this._move(index, newIndex);
  }

  private _move(oldIndex: number, newIndex: number) {
    let fields: FormCardFields = {};
    fields = { ...this.fields };
    this.fields = reorderRecord(fields, oldIndex, newIndex);
    fireEvent(this, "value-changed", { value: this.fields });
  }

  private _fieldMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    this._move(oldIndex, newIndex);
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
        <ha-sortable
          handle-selector=".handle"
          draggable-selector="form-card-editor-field-row"
          .disabled=${!this._showReorder || this.disabled}
          group="fields"
          invert-swap
          @item-moved=${this._fieldMoved}
        >
          <div class="fields">
            ${repeat(
              Object.values(this.fields),
              (field) => this._getKey(field),
              (field, idx) => html`
                <form-card-editor-field-row
                  .key=${Object.keys(this.fields)[idx]}
                  .sortableData=${field}
                  .index=${idx}
                  .first=${idx === 0}
                  .last=${idx === Object.keys(this.fields).length - 1}
                  .excludeKeys=${Object.keys(this.fields).filter(
                    (k) => k !== Object.keys(this.fields)[idx]
                  )}
                  .field=${field}
                  .disabled=${this.disabled}
                  @move-down=${this._moveDown}
                  @move-up=${this._moveUp}
                  @value-changed=${this._fieldChanged}
                  .hass=${this.hass}
                >
                  ${this._showReorder && !this.disabled
                    ? html`
                        <div class="handle" slot="icons">
                          <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                        </div>
                      `
                    : nothing}
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
        </ha-sortable>
      </div>
    `;
  }

  protected _renderFields() {
    return Object.entries(this.fields).map(
      ([key, field]) => html`
        <form-card-editor-field-row
          .key=${key}
          .sortableData=${field}
          .index=${this._getIndex(key)}
          .first=${this._getIndex(key) === 0}
          .last=${this._getIndex(key) === Object.keys(this.fields).length - 1}
          .excludeKeys=${Object.keys(this.fields).filter((k) => k !== key)}
          .field=${field}
          .disabled=${this.disabled}
          @move-down=${this._moveDown}
          @move-up=${this._moveUp}
          @value-changed=${this._fieldChanged}
          .hass=${this.hass}
        >
          ${this._showReorder && !this.disabled
            ? html`
                <div class="handle" slot="icons">
                  <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                </div>
              `
            : nothing}
        </form-card-editor-field-row>
      `
    );
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
    return [
      css`
        form-card-editor-field-row {
          display: block;
          margin-bottom: 16px;
          scroll-margin-top: 48px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "form-card-editor-fields": FormCardEditorFields;
  }
}
