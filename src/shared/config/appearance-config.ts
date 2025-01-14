import { boolean, Infer, object, optional } from "superstruct";
import { Layout, layoutStruct } from "../../utils/layout";

export const appearanceSharedConfigStruct = object({
  layout: optional(layoutStruct),
  fill_container: optional(boolean()),
});

export type AppearanceSharedConfig = Infer<typeof appearanceSharedConfigStruct>;

export type Appearance = {
  layout: Layout;
  fill_container: boolean;
};
