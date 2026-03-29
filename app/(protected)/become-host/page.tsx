import { applyForHost } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Home, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("becomeHost");

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-14">

        <div className="flex items-start gap-4 mb-10">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t("page_title")}</h1>
            <p className="text-muted-foreground mt-1.5 leading-relaxed">{t("page_desc")}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("card_title")}</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              {t("card_desc")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={applyForHost} className="space-y-5">

              <div className="space-y-2">
                <Label htmlFor="full_name">{t("label_name")}</Label>
                <Input id="full_name" name="full_name" placeholder={t("placeholder_name")} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("label_phone")}</Label>
                <Input id="phone" name="phone" type="tel" placeholder={t("placeholder_phone")} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">{t("label_country")}</Label>
                <Input id="country" name="country" placeholder={t("placeholder_country")} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_description">{t("label_property")}</Label>
                <Textarea
                  id="property_description"
                  name="property_description"
                  placeholder={t("placeholder_property")}
                  required
                  className="min-h-28 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="privacy_guarantee">{t("label_privacy")}</Label>
                <Textarea
                  id="privacy_guarantee"
                  name="privacy_guarantee"
                  placeholder={t("placeholder_privacy")}
                  required
                  className="min-h-28 resize-none"
                />
              </div>

              <Button type="submit" className="w-full mt-2">
                {t("submit")}
              </Button>

            </form>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
