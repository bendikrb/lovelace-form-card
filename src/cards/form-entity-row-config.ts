import type { ActionConfig } from "home-assistant-types/dist/data/lovelace/config/action";
import type { Selector } from "home-assistant-types/dist/data/selector";
import type { EntityConfig } from "home-assistant-types/dist/panels/lovelace/entity-rows/types";

export interface FormEntityRowConfig extends EntityConfig {
  type: "custom:form-entity-row";
  value?: string;
  selector?: Selector;
  change_action?: ActionConfig;
  spread_values_to_data?: boolean;
}
