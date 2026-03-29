import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createOrUpdateListing, deleteListing } from "../../actions";
import ListingImageUpload from "@/components/ListingImageUpload";
import AmenitiesPicker from "@/components/AmenitiesPicker";
import AvailabilityManager from "@/components/AvailabilityManager";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getTranslations } from "next-intl/server";

async function EditListing(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const [supabase, t, ta] = await Promise.all([
    createClient(),
    getTranslations("manage"),
    getTranslations("amenities"),
  ]);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data }, { data: imageRows }, { data: blockedPeriods }] = await Promise.all([
    supabase.from("listings").select("*").eq("id", params.id).single(),
    supabase
      .from("listing_images")
      .select("id, storage_path, position")
      .eq("listing_id", params.id)
      .order("position", { ascending: true }),
    supabase
      .from("blocked_periods")
      .select("id, start_date, end_date")
      .eq("listing_id", params.id)
      .order("start_date", { ascending: true }),
  ]);

  if (!data) return <p className="p-10">{t("loading")}</p>;

  const existingImages = imageRows ?? [];

  const amenityLabels = {
    section_title: ta("section_title"),
    private_pool: ta("private_pool"),
    private_garden: ta("private_garden"),
    ac: ta("ac"),
    wifi: ta("wifi"),
    parking: ta("parking"),
    bbq: ta("bbq"),
    kitchen: ta("kitchen"),
    outdoor_dining: ta("outdoor_dining"),
    washing_machine: ta("washing_machine"),
    baby_cot: ta("baby_cot"),
    no_cameras: ta("no_cameras"),
    prayer_room: ta("prayer_room"),
    halal_kitchen: ta("halal_kitchen"),
    gym: ta("gym"),
    sauna: ta("sauna"),
    ev_charger: ta("ev_charger"),
  };

  const availabilityLabels = {
    title: t("availability_title"),
    start: t("availability_start"),
    end: t("availability_end"),
    add: t("availability_add"),
    empty: t("availability_empty"),
    remove: t("availability_remove"),
    error_dates: t("availability_error_dates"),
  };

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("edit_title")}</h1>
          <p className="text-muted-foreground mt-1">{data.title} — {data.city}, {data.country}</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("photos_section")}</CardTitle></CardHeader>
          <CardContent>
            <ListingImageUpload listingId={data.id} userId={user.id} existingImages={existingImages} />
          </CardContent>
        </Card>

        <form action={createOrUpdateListing} className="space-y-6">
          <input type="hidden" name="listing_id" value={data.id} />

          <Card>
            <CardHeader><CardTitle className="text-base">{t("section_basic")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t("label_title")}</Label>
                <Input id="title" name="title" defaultValue={data.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descr">{t("label_description")}</Label>
                <Textarea id="descr" name="descr" defaultValue={data.descr || ""} rows={5} className="resize-none" placeholder={t("placeholder_desc")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("section_location")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="street">{t("label_street")}</Label><Input id="street" name="street" defaultValue={data.street} required /></div>
                <div className="space-y-2"><Label htmlFor="house_number">{t("label_house_number")}</Label><Input id="house_number" name="house_number" defaultValue={data.house_number} required /></div>
                <div className="space-y-2"><Label htmlFor="house_number_addition">{t("label_addition")}</Label><Input id="house_number_addition" name="house_number_addition" defaultValue={data.house_number_addition || ""} placeholder={t("placeholder_addition")} /></div>
                <div className="space-y-2"><Label htmlFor="zip_code">{t("label_zip")}</Label><Input id="zip_code" name="zip_code" defaultValue={data.zip_code} required /></div>
                <div className="space-y-2"><Label htmlFor="city">{t("label_city")}</Label><Input id="city" name="city" defaultValue={data.city} required /></div>
                <div className="space-y-2"><Label htmlFor="country">{t("label_country")}</Label><Input id="country" name="country" defaultValue={data.country} required /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("section_details")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label htmlFor="max_guests">{t("label_guests")}</Label><Input id="max_guests" name="max_guests" type="number" min={1} defaultValue={data.max_guests} required /></div>
                <div className="space-y-2"><Label htmlFor="bedrooms">{t("label_bedrooms")}</Label><Input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={data.bedrooms} required /></div>
                <div className="space-y-2"><Label htmlFor="bathrooms">{t("label_bathrooms")}</Label><Input id="bathrooms" name="bathrooms" type="number" min={0} defaultValue={data.bathrooms} required /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{amenityLabels.section_title}</CardTitle></CardHeader>
            <CardContent>
              <AmenitiesPicker selected={data.amenities ?? []} labels={amenityLabels} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("section_pricing")}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="price_per_night">{t("label_price")}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  <Input id="price_per_night" name="price_per_night" type="number" min={1} defaultValue={data.price_per_night} required className="pl-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full sm:w-auto">{t("save")}</Button>
        </form>

        {/* Availability (blocked dates) — outside the main form */}
        <Card>
          <CardHeader><CardTitle className="text-base">{availabilityLabels.title}</CardTitle></CardHeader>
          <CardContent>
            <AvailabilityManager
              listingId={data.id}
              initialPeriods={blockedPeriods ?? []}
              labels={availabilityLabels}
            />
          </CardContent>
        </Card>

        <div className="border-t border-border pt-8">
          <p className="text-sm text-muted-foreground mb-3">{t("danger_zone")}</p>
          <form action={deleteListing.bind(null, data.id)}>
            <button className="text-sm text-destructive hover:underline">{t("delete")}</button>
          </form>
        </div>

      </div>
    </main>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <EditListing params={props.params} />
    </Suspense>
  );
}
