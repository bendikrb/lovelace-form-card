import type { HomeAssistant } from "home-assistant-types";
import * as en from "./translations/en.json";
import * as nb from "./translations/nb.json";

const languages: Record<string, unknown> = {
  en,
  nb,
};

const DEFAULT_LANG = "en";

function getTranslatedString(key: string, lang: string): string | undefined {
  try {
    return key.split(".").reduce((o, i) => (o as Record<string, unknown>)[i], languages[lang]) as string;
  } catch (_) {
    return undefined;
  }
}

export default function setupCustomlocalize(hass?: HomeAssistant) {
  return (key: string) => {
    const lang = hass?.locale.language ?? DEFAULT_LANG;

    let translated = getTranslatedString(key, lang);
    if (!translated) translated = getTranslatedString(key, DEFAULT_LANG);
    if (!translated) translated = hass?.localize(key);
    return translated ?? key;
  };
}
