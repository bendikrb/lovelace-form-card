import { CSSResultGroup, LitElement, PropertyValues, nothing } from "lit";
import "./ha-svg-icon";
export declare class HaIcon extends LitElement {
  icon?: string;
  private _path?;
  private _secondaryPath?;
  private _viewBox?;
  private _legacy;
  willUpdate(changedProps: PropertyValues): void;
  protected render(): typeof nothing | import("lit-html").TemplateResult<1>;
  private _loadIcon;
  private _setCustomPath;
  private _setPath;
  static get styles(): CSSResultGroup;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-icon": HaIcon;
  }
}
