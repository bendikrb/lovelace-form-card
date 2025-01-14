import { ActionConfig, ItemPath } from "../../ha";

export type Selector =
  | ActionSelector
  | AddonSelector
  | AreaSelector
  | AreaFilterSelector
  | AttributeSelector
  | BooleanSelector
  | ColorRGBSelector
  | ColorTempSelector
  | ConditionSelector
  | ConversationAgentSelector
  | ConfigEntrySelector
  | ConstantSelector
  | CountrySelector
  | DateSelector
  | DateTimeSelector
  | DeviceSelector
  | FloorSelector
  | LegacyDeviceSelector
  | DurationSelector
  | EntitySelector
  | LegacyEntitySelector
  | FileSelector
  | IconSelector
  | LabelSelector
  | LanguageSelector
  | LocationSelector
  | MediaSelector
  | NavigationSelector
  | NumberSelector
  | ObjectSelector
  | AssistPipelineSelector
  | QRCodeSelector
  | SelectSelector
  | SelectorSelector
  | StateSelector
  | StatisticSelector
  | StringSelector
  | STTSelector
  | TargetSelector
  | TemplateSelector
  | ThemeSelector
  | TimeSelector
  | TriggerSelector
  | TTSSelector
  | TTSVoiceSelector
  | UiActionSelector
  | UiColorSelector;

export interface ActionSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  action: {};
}

export interface AddonSelector {
  addon: {
    name?: string;
    slug?: string;
  };
}

export interface AreaSelector {
  area: {
    entity?: {
      integration?: EntitySelector["entity"]["integration"];
      domain?: EntitySelector["entity"]["domain"];
      device_class?: EntitySelector["entity"]["device_class"];
    };
    device?: {
      integration?: DeviceSelector["device"]["integration"];
      manufacturer?: DeviceSelector["device"]["manufacturer"];
      model?: DeviceSelector["device"]["model"];
    };
    multiple?: boolean;
  };
}

export interface AreaFilterSelector {
  area_filter: {} | null;
}

export interface AttributeSelector {
  attribute: {
    entity_id?: string;
  };
}

export interface BooleanSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  boolean: {};
}

export interface ColorRGBSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  color_rgb: {};
}

export interface ColorTempSelector {
  color_temp: {
    min_mireds?: number;
    max_mireds?: number;
  };
}

export interface ConditionSelector {
  condition: {
    path?: ItemPath;
  } | null;
}
export interface ConversationAgentSelector {
  conversation_agent: {
    language?: string;
  } | null;
}
export interface ConfigEntrySelector {
  config_entry: {
    integration?: string;
  } | null;
}
export interface ConstantSelector {
  constant: {
    value: string | number | boolean;
    label?: string;
    translation_key?: string;
  } | null;
}
export interface CountrySelector {
  country: {
    countries: string[];
    no_sort?: boolean;
  } | null;
}

export interface DateSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  date: {};
}

export interface DateTimeSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  datetime: {};
}
interface DeviceSelectorFilter {
  integration?: string;
  manufacturer?: string;
  model?: string;
}
export interface DeviceSelector {
  device: {
    integration?: string;
    manufacturer?: string;
    model?: string;
    entity?: {
      domain?: EntitySelector["entity"]["domain"];
      device_class?: EntitySelector["entity"]["device_class"];
    };
    multiple?: boolean;
  };
}

export interface FloorSelector {
  floor: {
    entity?: EntitySelectorFilter | readonly EntitySelectorFilter[];
    device?: DeviceSelectorFilter | readonly DeviceSelectorFilter[];
    multiple?: boolean;
  } | null;
}
export interface LegacyDeviceSelector {
  device: DeviceSelector["device"] & {
    /**
     * @deprecated Use filter instead
     */
    integration?: DeviceSelectorFilter["integration"];
    /**
     * @deprecated Use filter instead
     */
    manufacturer?: DeviceSelectorFilter["manufacturer"];
    /**
     * @deprecated Use filter instead
     */
    model?: DeviceSelectorFilter["model"];
  };
}

export interface DurationSelector {
  duration: {
    enable_day?: boolean;
  };
}

interface EntitySelectorFilter {
  integration?: string;
  domain?: string | readonly string[];
  device_class?: string | readonly string[];
  supported_features?: number | [number];
}

export interface EntitySelector {
  entity: {
    integration?: string;
    domain?: string | string[];
    device_class?: string;
    multiple?: boolean;
    include_entities?: string[];
    exclude_entities?: string[];
  };
}

export interface LegacyEntitySelector {
  entity: EntitySelector["entity"] & {
    /**
     * @deprecated Use filter instead
     */
    integration?: EntitySelectorFilter["integration"];
    /**
     * @deprecated Use filter instead
     */
    domain?: EntitySelectorFilter["domain"];
    /**
     * @deprecated Use filter instead
     */
    device_class?: EntitySelectorFilter["device_class"];
  };
}

export interface StatisticSelector {
  statistic: {
    device_class?: string;
    multiple?: boolean;
  };
}
export interface FileSelector {
  file: {
    accept: string;
  } | null;
}
export interface IconSelector {
  icon: {
    placeholder?: string;
    fallbackPath?: string;
  };
}
export interface LabelSelector {
  label: {
    multiple?: boolean;
  };
}
export interface LanguageSelector {
  language: {
    languages?: string[];
    native_name?: boolean;
    no_sort?: boolean;
  } | null;
}
export interface LocationSelector {
  location: { radius?: boolean; icon?: string };
}

export interface LocationSelectorValue {
  latitude: number;
  longitude: number;
  radius?: number;
}

export interface MediaSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  media: {};
}

export interface MediaSelectorValue {
  entity_id?: string;
  media_content_id?: string;
  media_content_type?: string;
  metadata?: {
    title?: string;
    thumbnail?: string | null;
    media_class?: string;
    children_media_class?: string | null;
    navigateIds?: { media_content_type: string; media_content_id: string }[];
  };
}
export interface NavigationSelector {
  navigation: {} | null;
}

export interface NumberSelector {
  number: {
    min?: number;
    max?: number;
    step?: number;
    mode?: "box" | "slider";
    unit_of_measurement?: string;
  };
}

export interface ObjectSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  object: {};
}

export interface SelectOption {
  value: string;
  label: string;
}
export interface AssistPipelineSelector {
  assist_pipeline: {
    include_last_used?: boolean;
  } | null;
}
export interface SelectSelector {
  select: {
    multiple?: boolean;
    custom_value?: boolean;
    mode?: "list" | "dropdown";
    options: string[] | SelectOption[];
  };
}
export interface SelectorSelector {
  selector: {} | null;
}
export interface StateSelector {
  state: {
    extra_options?: {
      label: string;
      value: any;
    }[];
    entity_id?: string;
    attribute?: string;
  } | null;
}
export interface StringSelector {
  text: {
    multiline?: boolean;
    type?:
      | "number"
      | "text"
      | "search"
      | "tel"
      | "url"
      | "email"
      | "password"
      | "date"
      | "month"
      | "week"
      | "time"
      | "datetime-local"
      | "color";
    suffix?: string;
  };
}
export interface STTSelector {
  stt: {
    language?: string;
  } | null;
}

export interface TargetSelector {
  target: {
    entity?: {
      integration?: EntitySelector["entity"]["integration"];
      domain?: EntitySelector["entity"]["domain"];
      device_class?: EntitySelector["entity"]["device_class"];
    };
    device?: {
      integration?: DeviceSelector["device"]["integration"];
      manufacturer?: DeviceSelector["device"]["manufacturer"];
      model?: DeviceSelector["device"]["model"];
    };
  };
}

export interface TemplateSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  template: {};
}

export interface ThemeSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  theme: {};
}
export interface TimeSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  time: {};
}
export interface TriggerSelector {
  trigger: {
    path?: ItemPath;
  } | null;
}
export interface TTSSelector {
  tts: {
    language?: string;
  } | null;
}
export interface TTSVoiceSelector {
  tts_voice: {
    engineId?: string;
    language?: string;
  } | null;
}

export type UiAction = Exclude<ActionConfig["action"], "fire-dom-event">;

export interface UiActionSelector {
  ui_action: {
    actions?: UiAction[];
  } | null;
}
export interface UiColorSelector {
  ui_color: {
    default_color?: boolean;
  } | null;
}

export interface QRCodeSelector {
  qr_code: {
    data: string;
    scale?: number;
    error_correction_level?: "low" | "medium" | "quartile" | "high";
    center_image?: string;
  } | null;
}
