import type { Locale } from "../config/site";
import { en } from "./en";
import type { WebsiteContent } from "./types";
import { zh } from "./zh";

export const CONTENT = { zh, en } satisfies Record<Locale, WebsiteContent>;
export function getContent(locale: Locale): WebsiteContent {
  return CONTENT[locale];
}
export type { WebsiteContent };
