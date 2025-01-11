import { assign, boolean, object, optional, string } from "superstruct";
import {
    ActionsSharedConfig,
    actionsSharedConfigStruct,
  } from "../shared/config/actions-config";
  import {
    appearanceSharedConfigStruct,
    AppearanceSharedConfig,
  } from "../shared/config/appearance-config";
  import {
    entitySharedConfigStruct,
    EntitySharedConfig,
  } from "../shared/config/entity-config";
  import { lovelaceCardConfigStruct } from "../shared/config/lovelace-card-config";
import { LovelaceCardConfig } from "../ha";
import { HaFormSchema } from "../utils/form/ha-form";

export type FormCardConfig = LovelaceCardConfig &
  {
    form?: HaFormSchema[];
  };

export const formCardConfigStruct = assign(
  lovelaceCardConfigStruct,
  assign(
    entitySharedConfigStruct,
    appearanceSharedConfigStruct,
    actionsSharedConfigStruct
  ),
  object({
    icon_color: optional(string()),
  })
);

