import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { HomeAssistant } from "../../ha";
import "../ha-alert";
import "../ha-selector/ha-selector";
import {
  HaFormDataContainer,
  HaFormElement,
  HaFormSchema,
} from "../../utils/form/ha-form";
export declare class HaForm extends LitElement implements HaFormElement {
  hass?: HomeAssistant;
  data: HaFormDataContainer;
  // @ts-ignore
  schema: readonly HaFormSchema[];
  error?: Record<string, string | string[]>;
  warning?: Record<string, string>;
  disabled: boolean;
  computeError?: (schema: any, error: any) => string;
  computeWarning?: (schema: any, warning: any) => string;
  computeLabel?: (schema: any, data: HaFormDataContainer) => string;
  computeHelper?: (schema: any) => string | undefined;
  localizeValue?: (key: string) => string;
  protected getFormProperties(): Record<string, any>;
  focus(): Promise<void>;
  protected willUpdate(changedProps: PropertyValues): void;
  protected render(): TemplateResult;
  protected fieldElementName(type: string): string;
  private _generateContext;
  protected createRenderRoot(): Element | ShadowRoot;
  protected addValueChangedListener(element: Element | ShadowRoot): void;
  private _computeLabel;
  private _computeHelper;
  private _computeError;
  private _computeWarning;
  static get styles(): CSSResultGroup;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-form": HaForm;
  }
}
