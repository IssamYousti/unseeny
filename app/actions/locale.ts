"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const SUPPORTED = ["en", "fr", "nl"];

export async function setLocale(locale: string) {
  if (!SUPPORTED.includes(locale)) return;
  (await cookies()).set("locale", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  revalidatePath("/", "layout");
}
