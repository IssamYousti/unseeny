import { createOrUpdateListing } from "../actions";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import EquipmentPicker from "@/components/EquipmentPicker";
import RichTextEditor from "@/components/RichTextEditor";

export default async function CreateListingPage() {
  const [t, supabase] = await Promise.all([
    getTranslations("manage"),
    createClient(),
  ]);

  // Load equipment items from DB
  const { data: equipmentItems } = await supabase
    .from("equipment_items")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("sort_order");

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("create_title")}</h1>
          <p className="text-muted-foreground mt-1">{t("create_desc")}</p>
        </div>

        <form action={createOrUpdateListing} className="space-y-6">

          <Card>
            <CardHeader><CardTitle className="text-base">{t("section_basic")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t("label_title")}</Label>
                <Input id="title" name="title" placeholder={t("placeholder_title")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descr">{t("label_description")}</Label>
                <RichTextEditor name="descr" placeholder={t("placeholder_desc")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("section_location")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="street">{t("label_street")}</Label><Input id="street" name="street" placeholder={t("label_street")} required /></div>
                <div className="space-y-2"><Label htmlFor="house_number">{t("label_house_number")}</Label><Input id="house_number" name="house_number" placeholder="42" required /></div>
                <div className="space-y-2"><Label htmlFor="house_number_addition">{t("label_addition")}</Label><Input id="house_number_addition" name="house_number_addition" placeholder={t("placeholder_addition")} /></div>
                <div className="space-y-2"><Label htmlFor="zip_code">{t("label_zip")}</Label><Input id="zip_code" name="zip_code" placeholder={t("placeholder_zip")} required /></div>
                <div className="space-y-2"><Label htmlFor="city">{t("label_city")}</Label><Input id="city" name="city" placeholder={t("label_city")} required /></div>
                <div className="space-y-2"><Label htmlFor="country">{t("label_country")}</Label><Input id="country" name="country" placeholder={t("label_country")} required /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("section_details")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label htmlFor="max_guests">{t("label_guests")}</Label><Input id="max_guests" name="max_guests" type="number" min={1} placeholder="6" required /></div>
                <div className="space-y-2"><Label htmlFor="bedrooms">{t("label_bedrooms")}</Label><Input id="bedrooms" name="bedrooms" type="number" min={0} placeholder="3" required /></div>
                <div className="space-y-2"><Label htmlFor="bathrooms">{t("label_bathrooms")}</Label><Input id="bathrooms" name="bathrooms" type="number" min={0} placeholder="2" required /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Equipment</CardTitle></CardHeader>
            <CardContent>
              <EquipmentPicker items={equipmentItems ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("section_pricing")}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="price_per_night">{t("label_price")}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  <Input id="price_per_night" name="price_per_night" type="number" min={1} placeholder="250" required className="pl-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground">
            After saving, you&apos;ll be taken to the listing page where you can upload photos.
          </p>

          <Button type="submit" className="w-full sm:w-auto">{t("create_submit")}</Button>
        </form>
      </div>
    </main>
  );
}
