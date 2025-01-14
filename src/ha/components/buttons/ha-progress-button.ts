// import "@material/mwc-button";
import { CSSResultGroup, LitElement, TemplateResult } from "lit";
// import "../ha-circular-progress";
// import "../ha-svg-icon";
export declare class HaProgressButton extends LitElement {
  disabled: boolean;
  progress: boolean;
  raised: boolean;
  private _result?;
  render(): TemplateResult;
  actionSuccess(): void;
  actionError(): void;
  private _setResult;
  private _buttonTapped;
  static get styles(): CSSResultGroup;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-progress-button": HaProgressButton;
  }
}
