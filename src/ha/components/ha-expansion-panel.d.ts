import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import "./ha-svg-icon";
export declare class HaExpansionPanel extends LitElement {
  expanded: boolean;
  outlined: boolean;
  leftChevron: boolean;
  header?: string;
  secondary?: string;
  _showContent: boolean;
  private _container;
  protected render(): TemplateResult;
  protected willUpdate(changedProps: PropertyValues): void;
  private _handleTransitionEnd;
  private _toggleContainer;
  private _focusChanged;
  static get styles(): CSSResultGroup;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-expansion-panel": HaExpansionPanel;
  }
  interface HASSDomEvents {
    "expanded-changed": {
      expanded: boolean;
    };
    "expanded-will-change": {
      expanded: boolean;
    };
  }
}
