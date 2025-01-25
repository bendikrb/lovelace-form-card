import { assign, boolean, object, optional, array, string } from "superstruct";
import type { ActionConfig } from "home-assistant-types/dist/data/lovelace/config/action";
import type { LovelaceCardConfig } from "home-assistant-types/dist/data/lovelace/config/card";

import {
  appearanceSharedConfigStruct,
  lovelaceCardConfigStruct,
  entitySharedConfigStruct,
} from "../shared/config";
import { actionConfigStruct } from "../shared/config/struct";
import type { Layout } from "../utils";
import { layoutStruct } from "../utils";

export interface FormCardConfig extends LovelaceCardConfig {
  type: "custom:form-card";
  title?: string;
  layout: Layout;
  fields: FormCardField[];
  save_label?: string;
  save_action?: ActionConfig;
  spread_values_to_data?: boolean;
}

export type FormCardFields = Record<string, FormCardField>;

export interface FormCardField {
  key: string;
  name?: string;
  description?: string;
  required?: boolean;
  selector: {};
  entity?: string;
  value?: any;
  placeholder?: string;
  disabled?: boolean;
}

export const fieldConfigStruct = object({
  key: string(),
  name: optional(string()),
  description: optional(string()),
  required: optional(boolean()),
  selector: object(),
  entity: optional(string()),
  value: optional(string()),
  placeholder: optional(string()),
  disabled: optional(boolean()),
});

export const formCardConfigStruct = assign(
  lovelaceCardConfigStruct,
  assign(entitySharedConfigStruct, appearanceSharedConfigStruct),
  object({
    title: optional(string()),
    layout: layoutStruct,
    fields: array(fieldConfigStruct),
    save_label: optional(string()),
    save_action: optional(actionConfigStruct),
    spread_values_to_data: optional(boolean()),
  })
);
