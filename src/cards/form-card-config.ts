import { assign, boolean, object, optional, array, string, any } from "superstruct";
import type { ActionConfig } from "home-assistant-types/dist/data/lovelace/config/action";
import type { LovelaceCardConfig } from "home-assistant-types/dist/data/lovelace/config/card";
import type { Selector } from "home-assistant-types/dist/data/selector";

import { lovelaceCardConfigStruct, entitySharedConfigStruct } from "../shared/config";
import { actionConfigStruct } from "../shared/config/struct";

export interface FormCardConfig extends LovelaceCardConfig {
  type: "custom:form-card";
  title?: string;
  fields: FormCardField[];
  save_label?: string;
  save_action?: ActionConfig;
  spread_values_to_data?: boolean;
  reset_on_submit?: boolean;
}

export type FormCardFields = Record<string, FormCardField>;

export interface FormCardField {
  name: string;
  selector: Selector;
  label?: string;
  description?: string;
  entity?: string;
  default?: any;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export const fieldConfigStruct = object({
  name: string(),
  selector: object(),
  label: optional(string()),
  description: optional(string()),
  entity: optional(string()),
  default: optional(any()),
  disabled: optional(boolean()),
  placeholder: optional(string()),
  required: optional(boolean()),
});

export const formCardConfigStruct = assign(
  lovelaceCardConfigStruct,
  entitySharedConfigStruct,
  object({
    title: optional(string()),
    fields: array(fieldConfigStruct),
    save_label: optional(string()),
    save_action: optional(actionConfigStruct),
    spread_values_to_data: optional(boolean()),
    reset_on_submit: optional(boolean()),
  })
);
