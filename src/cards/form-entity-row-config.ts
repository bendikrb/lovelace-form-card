import { ActionConfig, LovelaceCardConfig } from "../ha";
import type { HaFormSelector } from "../utils/form/ha-form";

export type FormEntityRowConfig = LovelaceCardConfig & {
  type: string;
  name?: string;
  icon?: string;
  show_state?: boolean;
  value?: string;
  entity?: string;
  selector?: HaFormSelector;
  secondary?: string;
  state?: string;
  change_action?: ActionConfig;
};
