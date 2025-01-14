import { assign, boolean, object, optional, string } from "superstruct";
import { appearanceSharedConfigStruct } from "../shared/config/appearance-config";
import { entitySharedConfigStruct } from "../shared/config/entity-config";
import { lovelaceCardConfigStruct } from "../shared/config/lovelace-card-config";
import { ActionConfig, LovelaceCardConfig, actionConfigStruct } from "../ha";
import { Layout, layoutStruct } from "../utils/layout";

export type FormCardConfig = LovelaceCardConfig & {
  title?: string;
  layout: Layout;
  fields: FormCardFields;
  save_label?: string;
  save_action?: ActionConfig;
  spread_values_to_data?: boolean;
};

export const formCardConfigStruct = assign(
  lovelaceCardConfigStruct,
  assign(entitySharedConfigStruct, appearanceSharedConfigStruct),
  object({
    title: optional(string()),
    layout: layoutStruct,
    fields: optional(object()),
    save_label: optional(string()),
    save_action: optional(actionConfigStruct),
    spread_values_to_data: optional(boolean()),
  })
);

export interface FormCardFields {
  [key: string]: FormCardField;
}

export interface FormCardField {
  name?: string;
  description?: string;
  required?: boolean;
  selector?: {};
  entity?: string;
  value?: any;
  placeholder?: string;
  disabled?: boolean;
}
