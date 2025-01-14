export interface Fields {
  [key: string]: Field;
}
export interface Field {
  name?: string;
  description?: string;
  advanced?: boolean;
  required?: boolean;
  example?: string;
  default?: any;
  selector?: any;
}

export const MODES = ["single", "restart", "queued", "parallel"] as const;

export interface ScriptConfig {
  alias: string;
  description?: string;
  icon?: string;
  mode?: (typeof MODES)[number];
  max?: number;
  fields?: Fields;
}
