export const SITE = { name: "Orbis", defaultLocale: "en", locales: ["zh", "en"] } as const;
export type Locale = (typeof SITE.locales)[number];
export type LocalizedPage = "home" | "privacy";

export function localizedPath(locale: Locale, page: LocalizedPage): string {
  return page === "home" ? `/${locale}/` : `/${locale}/${page}/`;
}

export interface SiteOriginOptions {
  requireExplicit?: boolean;
}

export function siteOrigin(options: SiteOriginOptions = {}): string {
  const configured = process.env.PUBLIC_SITE_ORIGIN?.trim();
  if (!configured) {
    if (options.requireExplicit) {
      throw new Error("PUBLIC_SITE_ORIGIN is required for production builds.");
    }
    return "http://localhost:8788";
  }

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error("PUBLIC_SITE_ORIGIN must be a valid absolute URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("PUBLIC_SITE_ORIGIN must use HTTP or HTTPS.");
  }
  if (options.requireExplicit && parsed.protocol !== "https:") {
    throw new Error("PUBLIC_SITE_ORIGIN must use HTTPS for production builds.");
  }
  return parsed.origin;
}
