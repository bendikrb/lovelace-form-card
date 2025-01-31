import { literal, union } from "superstruct";

export type Layout = "default" | "vertical" | "horizontal";

export const layoutStruct = union([literal("default"), literal("horizontal"), literal("vertical")]);
