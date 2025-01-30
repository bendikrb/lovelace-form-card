import { object, optional } from "superstruct";

import type { ActionConfig } from "home-assistant-types/dist/data/lovelace/config/action";
import type { HaFormSchema } from "home-assistant-types/dist/components/ha-form/types";
import type { UiAction } from "home-assistant-types/dist/panels/lovelace/components/hui-action-editor";

import { actionConfigStruct } from "./action-struct";

export const actionsSharedConfigStruct = object({
  change_action: optional(actionConfigStruct),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

export interface ActionsSharedConfig {
  change_action?: ActionConfig;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export const computeActionsFormSchema = (
  name: string,
  actions?: UiAction[]
): HaFormSchema[] => [
  {
    name,
    selector: { ui_action: { actions, default_action: "none" } },
  },
];
