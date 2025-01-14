import { object, optional } from "superstruct";
import { ActionConfig, actionConfigStruct } from "../../ha";
import { HaFormSchema } from "../../utils/form/ha-form";
import { UiAction } from "../../utils/form/ha-selector";

export const actionsSharedConfigStruct = object({
  change_action: optional(actionConfigStruct),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

export type ActionsSharedConfig = {
  change_action?: ActionConfig;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
};

export const computeActionsFormSchema = (
  name: string,
  actions?: UiAction[],
  useCallService?: boolean
): HaFormSchema[] => {
  if (useCallService && actions) {
    actions = actions.map((action) => {
      if (action === "perform-action") {
        return "call-service";
      }
      return action;
    });
  }
  return [
    {
      name,
      selector: { ui_action: { actions } },
    },
  ];
};
