export const SITE = { name: "Orbis", defaultLocale: "en", locales: ["zh", "en"] } as const;
export type Locale = (typeof SITE.locales)[number];
export type LocalizedPage = "home" | "privacy";

export function localizedPath(locale: Locale, page: LocalizedPage): string {
  return page === "home" ? `/${locale}/` : `/${locale}/privacy/`;
}

export function siteOrigin(): string {
  return process.env.PUBLIC_SITE_ORIGIN ?? "http://localhost:8788";
}
