import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { mdiPlus, mdiDrag } from "@mdi/js";

import type { HomeAssistant } from "home-assistant-types";
import type { FormCardField } from "../cards/form-card-config";
import type { FormCardEditorFieldRow } from "./form-card-editor-field-row";
import { fireEvent, loadHaComponents, nextRender } from "../utils";
import "./form-card-editor-field-row";
import setupCustomlocalize from "../localize";

@customElement("form-card-editor-fields")
export class FormCardEditorFields extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public fields!: FormCardField[];

  @property({ type: Boolean }) public disabled = false;

  @state() private _showReorder = true;

  private _fieldKeys = new WeakMap<FormCardField, string>();

  private _focusLastFieldOnChange = false;

  public connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
  }

  private _getIndex(key: string) {
    return this.fields?.findIndex((field) => field.name === key) ?? -1;
  }

  private _getKey(field: FormCardField) {
    if (!this._fieldKeys.has(field)) {
      this._fieldKeys.set(field, Math.random().toString());
    }
    return this._fieldKeys.get(field)!;
  }

  private _moveUp(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    const newIndex = index - 1;
    this._move(index, newIndex);
  }

  private _moveDown(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    const newIndex = index + 1;
    this._move(index, newIndex);
  }

  private _move(oldIndex: number, newIndex: number) {
    const fields = this.fields.concat();
    const item = fields.splice(oldIndex, 1)[0];
    fields.splice(newIndex, 0, item);
    this.fields = fields;
    fireEvent(this, "value-changed", { value: fields });
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
    const name = this._getUniqueKey(
      this.hass.localize("ui.panel.config.script.editor.field.field") || "field",
      this.fields || []
    );
    const fields = this.fields.concat({
      name,
      selector: {
        text: {},
      },
    });

    this._focusLastFieldOnChange = true;
    fireEvent(this, "value-changed", { value: fields });
  }

  public focusLastField() {
    const row = this.shadowRoot!.querySelector<FormCardEditorFieldRow>("form-card-editor-field-row:last-of-type")!;
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
          @item-added=${this._fieldAdded}
          @item-removed=${this._fieldRemoved}
        >
          <div class="fields">
            ${repeat(
              this.fields,
              (field) => this._getKey(field),
              (field, idx) => html`
                <form-card-editor-field-row
                  .sortableData=${field}
                  .key=${field.name}
                  .index=${idx}
                  .first=${idx === 0}
                  .last=${idx === this.fields.length - 1}
                  .excludeKeys=${this.fields.filter((f) => f !== field).map((f) => f.name)}
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

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("fields") && this._focusLastFieldOnChange) {
      this._focusLastFieldOnChange = false;

      const row = this.shadowRoot!.querySelector<FormCardEditorFieldRow>("form-card-editor-field-row:last-of-type")!;
      row.updateComplete.then(() => {
        row.expand();
        row.scrollIntoView();
        row.focus();
      });
    }
  }

  private async _fieldAdded(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const { index, data } = ev.detail;
    // noinspection UnnecessaryLocalVariableJS
    const fields = [...this.fields.slice(0, index), data, ...this.fields.slice(index)];
    // Add action locally to avoid UI jump
    this.fields = fields;
    await nextRender();
    fireEvent(this, "value-changed", { value: this.fields });
  }

  private async _fieldRemoved(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const { index } = ev.detail;
    const field = this.fields[index];
    // Remove field locally to avoid UI jump
    this.fields = this.fields.filter((f) => f !== field);
    await nextRender();
    // Ensure field is removed even after update
    const fields = this.fields.filter((f) => f !== field);
    fireEvent(this, "value-changed", { value: fields });
  }

  private _fieldChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const fields = [...this.fields];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      fields.splice(index, 1);
    } else {
      // Store key on new value.
      const key = this._getKey(fields[index]);
      this._fieldKeys.set(newValue, key);

      fields[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: fields });
  }

  private _getUniqueKey(base: string, fields: FormCardField[]): string {
    let key = base;
    if (fields.find((f) => f.name === base)) {
      let i = 2;
      do {
        key = `${base}_${i}`;
        i++;
        // eslint-disable-next-line no-loop-func
      } while (fields.find((f) => f.name === key));
    }
    return key;
  }

  static get styles(): CSSResultGroup {
    // noinspection CssOverwrittenProperties
    return [
      css`
        .fields {
          padding: 16px;
          margin: -16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sortable-ghost {
          background: none;
          border-radius: var(--ha-card-border-radius, 12px);
        }

        .sortable-drag {
          background: none;
        }

        form-card-editor-field-row {
          display: block;
          scroll-margin-top: 48px;
        }

        ha-svg-icon {
          height: 20px;
        }

        .handle {
          padding: 12px;
          cursor: move; /* fallback if grab cursor is unsupported */
          cursor: grab;
        }

        .handle ha-svg-icon {
          pointer-events: none;
          height: 24px;
        }

        .buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          order: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "form-card-editor-fields": FormCardEditorFields;
  }

  // for fire event
  interface HASSDomEvents {
    "move-down": undefined;
    "move-up": undefined;
  }
}
