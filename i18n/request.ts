import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

const SUPPORTED = ["en", "fr", "nl"] as const;
type Locale = (typeof SUPPORTED)[number];

function isSupported(v: string | undefined): v is Locale {
  return SUPPORTED.includes(v as Locale);
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;

  // Fallback: first preferred language from Accept-Language header
  const acceptLang = (await headers()).get("accept-language") ?? "";
  const headerLocale = acceptLang.split(",")[0].split("-")[0].toLowerCase();

  const locale: Locale = isSupported(cookieLocale)
    ? cookieLocale
    : isSupported(headerLocale)
      ? headerLocale
      : "en";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
