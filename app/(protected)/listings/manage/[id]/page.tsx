import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createOrUpdateListing, deleteListing, archiveListing } from "../../actions";
import ListingImageUpload from "@/components/ListingImageUpload";
import EquipmentPicker from "@/components/EquipmentPicker";
import AvailabilityManager from "@/components/AvailabilityManager";
import RichTextEditor from "@/components/RichTextEditor";
import CancellationPolicyForm from "@/components/CancellationPolicyForm";
import PropertyRulesForm from "@/components/PropertyRulesForm";
import PricingInput from "@/components/PricingInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { Camera, CheckCircle, AlertTriangle, ShieldCheck, ClipboardList, RefreshCw } from "lucide-react";
import { getPlatformConfig } from "@/lib/platform-config.server";

async function EditListing(props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; saved?: string }> }) {
  const [params, search] = await Promise.all([props.params, props.searchParams]);
  const justCreated = search.created === "1";
  const justSaved = search.saved === "1";

  const [supabase, t] = await Promise.all([
    createClient(),
    getTranslations("manage"),
  ]);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [platformConfig, [{ data }, { data: imageRows }, { data: blockedPeriods }, { data: equipmentItems }, { data: cancellationPolicy }, { data: propertyRules }]] = await Promise.all([
    getPlatformConfig(),
    Promise.all([
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
    supabase
      .from("equipment_items")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("sort_order"),
    supabase
      .from("listing_cancellation_policy")
      .select("*")
      .eq("listing_id", params.id)
      .maybeSingle(),
    supabase
      .from("listing_rules")
      .select("*")
      .eq("listing_id", params.id)
      .maybeSingle(),
  ]),
  ]);

  if (!data) return <p className="p-10">{t("loading")}</p>;

  const existingImages = imageRows ?? [];

  const availabilityLabels = {
    title: t("availability_title"),
    start: t("availability_start"),
    end: t("availability_end"),
    add: t("availability_add"),
    empty: t("availability_empty"),
    remove: t("availability_remove"),
    error_dates: t("availability_error_dates"),
  };

  const isHtml = data.descr?.startsWith("<");

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("edit_title")}</h1>
          <p className="text-muted-foreground mt-1">{data.title} — {data.city}, {data.country}</p>
        </div>

        {/* Pending review banner (after edit) */}
        {justSaved && (
          <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl px-5 py-4">
            <RefreshCw className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Changes saved — pending admin review</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your listing has been updated and sent for re-approval. It will be visible to guests once approved.
              </p>
            </div>
          </div>
        )}

        {/* "Just created" welcome banner */}
        {justCreated && (
          <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4">
            <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Listing created! Now add photos.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload clear photos that show the full private setup — pool, garden, and exterior fences help with approval.
              </p>
            </div>
          </div>
        )}

        {/* Rejection reason (shown if listing was rejected) */}
        {data.is_rejected && data.rejection_reason && (
          <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-2xl px-5 py-4">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Your listing was rejected</p>
              <p className="text-sm text-muted-foreground mt-1">{data.rejection_reason}</p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                Please make the necessary changes and re-submit for review.
              </p>
            </div>
          </div>
        )}

        {/* Photos */}
        <Card className={justCreated ? "ring-2 ring-primary/30" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {t("photos_section")}
            </CardTitle>
          </CardHeader>
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
                <RichTextEditor
                  name="descr"
                  defaultValue={isHtml ? data.descr : undefined}
                  placeholder={t("placeholder_desc")}
                />
                {/* If descr is plain text, pre-fill as plain text in the editor via a separate hidden note */}
                {!isHtml && data.descr && (
                  <p className="text-xs text-muted-foreground">
                    Your current description is in plain text. Start editing to convert it to rich text.
                  </p>
                )}
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
            <CardHeader><CardTitle className="text-base">Equipment</CardTitle></CardHeader>
            <CardContent>
              <EquipmentPicker items={equipmentItems ?? []} selected={data.amenities ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("section_pricing")}</CardTitle></CardHeader>
            <CardContent>
              <PricingInput
                config={platformConfig}
                defaultPrice={Number(data.price_per_night)}
                defaultPriceType={(data.price_type as "guest_pays" | "host_earns") ?? "guest_pays"}
              />
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

        {/* Cancellation policy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Cancellation policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CancellationPolicyForm listingId={data.id} initial={cancellationPolicy} />
          </CardContent>
        </Card>

        {/* Property rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Property rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyRulesForm listingId={data.id} initial={propertyRules} />
          </CardContent>
        </Card>

        <div className="border-t border-border pt-8 flex items-center justify-between flex-wrap gap-4">
          <form action={archiveListing.bind(null, data.id, !data.is_archived)}>
            <button
              type="submit"
              className={`text-sm transition ${
                data.is_archived
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {data.is_archived ? "Unarchive listing" : "Archive listing"}
            </button>
          </form>
          <form action={deleteListing.bind(null, data.id)}>
            <button className="text-sm text-muted-foreground hover:text-destructive transition">
              {t("delete")}
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}

export default function Page(props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; saved?: string }> }) {
  return (
    <Suspense fallback={<div className="p-10 text-muted-foreground">Loading…</div>}>
      <EditListing params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
