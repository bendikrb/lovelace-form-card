import { ActionConfig, LovelaceCardConfig } from "../ha";
import type { HaFormSelector } from "../utils/form/ha-form";


export type FormEntityRowConfig = LovelaceCardConfig &
{
  type: string;
  name?: string;
  icon?: string;
  show_state?: boolean;
  value?: string;
  entity?: string;
  selector?: HaFormSelector;
  secondary?: string;
  state?: string;
  change_action?: ActionConfig;
}


const SELECTOR_SCHEMAS = {
  action: [] as const,
  area: [
    {
      name: "multiple",
      selector: { boolean: {} },
    },
  ] as const,
  attribute: [
    {
      name: "entity_id",
      selector: { entity: {} },
    },
  ] as const,
  boolean: [] as const,
  color_temp: [
    {
      name: "unit",
      selector: { select: { options: ["kelvin", "mired"] } },
    },
    {
      name: "min",
      selector: { number: { mode: "box" } },
    },
    {
      name: "max",
      selector: { number: { mode: "box" } },
    },
  ] as const,
  condition: [] as const,
  date: [] as const,
  datetime: [] as const,
  device: [
    {
      name: "multiple",
      selector: { boolean: {} },
    },
  ] as const,
  duration: [
    {
      name: "enable_day",
      selector: { boolean: {} },
    },
    {
      name: "enable_millisecond",
      selector: { boolean: {} },
    },
  ] as const,
  entity: [
    {
      name: "multiple",
      selector: { boolean: {} },
    },
  ] as const,
  floor: [
    {
      name: "multiple",
      selector: { boolean: {} },
    },
  ] as const,
  icon: [] as const,
  location: [] as const,
  media: [] as const,
  number: [
    {
      name: "min",
      selector: { number: { mode: "box", step: "any" } },
    },
    {
      name: "max",
      selector: { number: { mode: "box", step: "any" } },
    },
    {
      name: "step",
      selector: { number: { mode: "box", step: "any" } },
    },
  ] as const,
  object: [] as const,
  color_rgb: [] as const,
  select: [
    {
      name: "options",
      selector: { object: {} },
    },
    {
      name: "multiple",
      selector: { boolean: {} },
    },
  ] as const,
  state: [
    {
      name: "entity_id",
      selector: { entity: {} },
    },
  ] as const,
  target: [] as const,
  template: [] as const,
  text: [
    {
      name: "multiple",
      selector: { boolean: {} },
    },
    {
      name: "multiline",
      selector: { boolean: {} },
    },
    { name: "prefix", selector: { text: {} } },
    { name: "suffix", selector: { text: {} } },
  ] as const,
  theme: [] as const,
  time: [] as const,
};