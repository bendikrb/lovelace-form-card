import { any, array, boolean, dynamic, enums, literal, object, optional, string, type, union } from "superstruct";
import type { BaseActionConfig } from "home-assistant-types/dist/data/lovelace/config/action";

const actionConfigStructUser = object({
  user: string(),
});

export const actionConfigStructConfirmation = union([
  boolean(),
  object({
    text: optional(string()),
    excemptions: optional(array(actionConfigStructUser)),
  }),
]);

const actionConfigStructUrl = object({
  action: literal("url"),
  url_path: string(),
  confirmation: optional(actionConfigStructConfirmation),
});

const actionConfigStructService = object({
  action: string(),
  service: optional(string()),
  perform_action: optional(string()),
  service_data: optional(any()),
  data: optional(any()),
  target: optional(any()),
  confirmation: optional(actionConfigStructConfirmation),
});

const actionConfigStructNavigate = object({
  action: literal("navigate"),
  navigation_path: string(),
  navigation_replace: optional(boolean()),
  confirmation: optional(actionConfigStructConfirmation),
});

const actionConfigStructAssist = type({
  action: literal("assist"),
  pipeline_id: optional(string()),
  start_listening: optional(boolean()),
});

const actionConfigStructMoreInfo = type({
  action: literal("more-info"),
  entity: optional(string()),
});

export const actionConfigStructType = object({
  action: string(),
  confirmation: optional(actionConfigStructConfirmation),
});

export const actionConfigStruct = dynamic<any>((value) => {
  if (value && typeof value === "object" && "action" in value) {
    const action = (value as BaseActionConfig).action!;
    if (
      action === "call-service" ||
      action === "perform-action" ||
      (typeof action === "string" && action.includes("."))
    ) {
      return actionConfigStructService;
    }
    switch (action) {
      case "navigate": {
        return actionConfigStructNavigate;
      }
      case "url": {
        return actionConfigStructUrl;
      }
      case "assist": {
        return actionConfigStructAssist;
      }
      case "more-info": {
        return actionConfigStructMoreInfo;
      }
    }
  }

  return actionConfigStructType;
});
