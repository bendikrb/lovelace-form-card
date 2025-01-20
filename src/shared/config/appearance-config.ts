import type { Infer } from "superstruct";
import { boolean, object, optional } from "superstruct";
import type { Layout } from "../../utils/layout";
import { layoutStruct } from "../../utils/layout";

export const appearanceSharedConfigStruct = object({
  layout: optional(layoutStruct),
  fill_container: optional(boolean()),
});

export type AppearanceSharedConfig = Infer<typeof appearanceSharedConfigStruct>;

export interface Appearance {
  layout: Layout;
  fill_container: boolean;
}
