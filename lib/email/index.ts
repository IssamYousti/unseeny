import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// TODO: replace with "Unseeny <noreply@unseeny.com>" once a domain is verified in Resend
const FROM = "Unseeny <onboarding@resend.dev>";
const BASE_URL = process.env.APP_URL ?? "http://localhost:3000";

// ─── Shared template wrapper ──────────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unseeny</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F5F0;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F5F0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#2D2D91;border-radius:16px 16px 0 0;padding:32px 40px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">
                Unseeny
              </p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:0.5px;">
                PRIVATE PROPERTIES FOR PEACEFUL STAYS
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-left:1px solid #E8E3DA;border-right:1px solid #E8E3DA;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F0EDE6;border-radius:0 0 16px 16px;border:1px solid #E8E3DA;border-top:none;padding:20px 40px;">
              <p style="margin:0;font-size:12px;color:#9B95A3;line-height:1.6;">
                You're receiving this because you have an account on Unseeny.<br/>
                <a href="${BASE_URL}" style="color:#2D2D91;text-decoration:none;">unseeny.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#1A1A3E;line-height:1.3;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:16px 0 0;font-size:15px;color:#4A4A6A;line-height:1.7;">${text}</p>`;
}

function button(text: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td style="background-color:#2D2D91;border-radius:10px;">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;letter-spacing:0.3px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

function goldBadge(text: string): string {
  return `<p style="margin:0 0 24px;display:inline-block;background-color:#FDF3DC;border:1px solid #D4A017;border-radius:20px;padding:6px 16px;font-size:12px;font-weight:bold;color:#8B6914;letter-spacing:0.5px;">
    ${text}
  </p>`;
}

function greenBadge(text: string): string {
  return `<p style="margin:0 0 24px;display:inline-block;background-color:#F0FDF4;border:1px solid #86EFAC;border-radius:20px;padding:6px 16px;font-size:12px;font-weight:bold;color:#16A34A;letter-spacing:0.5px;">
    ${text}
  </p>`;
}

function infoBox(rows: { label: string; value: string }[]): string {
  const inner = rows
    .map(
      (r) =>
        `<tr><td style="padding:8px 12px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;">${r.label}</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #F3F4F6;">${r.value}</td></tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;border-collapse:separate;">
    ${inner}
  </table>`;
}

function divider(): string {
  return `<hr style="margin:28px 0;border:none;border-top:1px solid #E8E3DA;" />`;
}

// ─── Email 1: Host application approved ──────────────────────────────────────

export async function sendApplicationApproved(to: string, firstName: string) {
  const html = layout(`
    ${goldBadge("✓ APPLICATION APPROVED")}
    ${heading("You're approved to host on Unseeny")}
    ${paragraph(`Hi ${firstName}, great news — your host application has been reviewed and approved by our team.`)}
    ${paragraph("You can now create your first listing. Make sure your property description highlights what makes it completely private.")}
    ${button("Create your first listing", `${BASE_URL}/listings/manage`)}
    ${divider()}
    ${paragraph("If you have any questions, just reply to this email.")}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: "You're approved — start listing on Unseeny",
    html,
  });
}

// ─── Email 2: Host application rejected ──────────────────────────────────────

export async function sendApplicationRejected(to: string, firstName: string, adminNotes?: string | null) {
  const html = layout(`
    ${heading("Your host application was not approved")}
    ${paragraph(`Hi ${firstName}, thank you for applying to host on Unseeny.`)}
    ${paragraph("After reviewing your application, our team has decided not to approve it at this time. Unseeny has strict privacy standards — every property must offer complete seclusion, no overlooking neighbours, and no shared spaces.")}
    ${adminNotes ? `${divider()}<p style="margin:0;font-size:14px;color:#4A4A6A;line-height:1.7;"><strong>Reviewer note:</strong> ${adminNotes}</p>` : ""}
    ${divider()}
    ${paragraph("If your property meets our standards and you believe this was a mistake, you're welcome to reapply after making any necessary changes.")}
    ${button("Learn about our standards", `${BASE_URL}`)}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: "Your Unseeny host application",
    html,
  });
}

// ─── Email 3a: Booking approved by host — payment required ───────────────────

export async function sendBookingApproved(
  to: string,
  firstName: string,
  listingTitle: string,
  checkIn: string,
  checkOut: string,
  totalPrice: number,
) {
  const nights = Math.floor(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
  );

  const html = layout(`
    ${goldBadge("✓ BOOKING APPROVED")}
    ${heading("Your booking has been approved!")}
    ${paragraph(`Hi ${firstName}, great news — the host has approved your booking request for <strong>"${listingTitle}"</strong>.`)}
    ${paragraph("To secure your stay, please complete your payment within <strong>24 hours</strong>. Your dates will be released if payment is not received in time.")}
    ${infoBox([
      { label: "Check-in", value: checkIn },
      { label: "Check-out", value: checkOut },
      { label: "Duration", value: `${nights} night${nights !== 1 ? "s" : ""}` },
      { label: "Total", value: `€${totalPrice.toLocaleString()}` },
    ])}
    ${button("Complete payment", `${BASE_URL}/bookings`)}
    ${divider()}
    ${paragraph("If you no longer wish to proceed, you can cancel your request from your bookings page.")}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Action required — complete payment for "${listingTitle}"`,
    html,
  });
}

// ─── Email 3b: Listing approved ───────────────────────────────────────────────

export async function sendListingApproved(to: string, firstName: string, listingTitle: string, listingId: string) {
  const html = layout(`
    ${goldBadge("✓ LISTING APPROVED")}
    ${heading(`"${listingTitle}" is now live`)}
    ${paragraph(`Hi ${firstName}, your listing has been reviewed and approved. Guests can now find and request to book your property.`)}
    ${paragraph("Make sure your listing has photos — properties with photos receive significantly more enquiries.")}
    ${button("View your listing", `${BASE_URL}/listings/${listingId}`)}
    ${divider()}
    ${paragraph("Tip: keep your calendar up to date and respond to booking requests promptly.")}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your listing "${listingTitle}" is live on Unseeny`,
    html,
  });
}

// ─── Email 4: Booking request to host ────────────────────────────────────────

export async function sendBookingRequest(
  to: string,
  hostFirstName: string,
  guestName: string,
  listingTitle: string,
  conversationId: string,
  checkIn: string,
  checkOut: string,
  nights: number,
  guestsCount: number,
  totalPrice: number,
) {
  const html = layout(`
    ${heading("New booking request")}
    ${paragraph(`Hi ${hostFirstName}, <strong>${guestName}</strong> has requested to book <strong>"${listingTitle}"</strong>.`)}
    ${infoBox([
      { label: "Check-in", value: checkIn },
      { label: "Check-out", value: checkOut },
      { label: "Duration", value: `${nights} night${nights !== 1 ? "s" : ""}` },
      { label: "Guests", value: String(guestsCount) },
      { label: "Total", value: `€${totalPrice.toLocaleString()}` },
    ])}
    ${paragraph("Review the request and confirm or decline in your bookings dashboard.")}
    ${button("View booking request", `${BASE_URL}/listings/bookings`)}
    ${divider()}
    ${paragraph("Responding quickly improves your host rating and gives guests confidence.")}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `New booking request for "${listingTitle}"`,
    html,
  });
}

// ─── Email 5: Booking confirmed (to guest) ───────────────────────────────────

export async function sendBookingConfirmed(
  to: string,
  guestFirstName: string,
  listingTitle: string,
  checkIn: string,
  checkOut: string,
  conversationId: string | null,
) {
  const nights = Math.floor(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
  );

  const html = layout(`
    ${greenBadge("✓ BOOKING CONFIRMED")}
    ${heading("Your stay is confirmed!")}
    ${paragraph(`Hi ${guestFirstName}, great news — your booking for <strong>"${listingTitle}"</strong> has been confirmed by the host.`)}
    ${infoBox([
      { label: "Check-in", value: checkIn },
      { label: "Check-out", value: checkOut },
      { label: "Duration", value: `${nights} night${nights !== 1 ? "s" : ""}` },
    ])}
    ${paragraph("The full address will be shared with you before your arrival.")}
    ${conversationId ? button("Message your host", `${BASE_URL}/chat/${conversationId}`) : ""}
    ${divider()}
    ${paragraph("We hope you enjoy a perfect, private stay.")}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Booking confirmed — "${listingTitle}"`,
    html,
  });
}

// ─── Email 7: New listing notification (to subscribers) ──────────────────────

export async function sendNewListingNotification(
  to: string[],
  listingTitle: string,
  listingId: string,
  city: string | null,
  country: string | null,
) {
  if (to.length === 0) return;

  const location = [city, country].filter(Boolean).join(", ");

  const html = layout(`
    ${goldBadge("✦ NEW PROPERTY LIVE")}
    ${heading(`New private property: "${listingTitle}"`)}
    ${paragraph(`A new verified private property has just been listed on Unseeny${location ? ` in <strong>${location}</strong>` : ""}.`)}
    ${paragraph("This property has been reviewed and approved by our team for complete privacy — no overlooking neighbours, no shared spaces.")}
    ${button("View property", `${BASE_URL}/listings/${listingId}`)}
    ${divider()}
    <p style="font-size:12px;color:#9B95A3;margin:0;">
      You're receiving this because you subscribed to property alerts on Unseeny.<br/>
      To unsubscribe, reply to this email with "unsubscribe".
    </p>
  `);

  // Send in batches to avoid rate limits
  const BATCH = 50;
  for (let i = 0; i < to.length; i += BATCH) {
    const batch = to.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map((email) =>
        resend.emails.send({
          from: FROM,
          to: email,
          subject: `New private property on Unseeny: "${listingTitle}"`,
          html,
        }),
      ),
    );
  }
}

// ─── Email 6: Booking rejected (to guest) ────────────────────────────────────

export async function sendBookingRejected(
  to: string,
  guestFirstName: string,
  listingTitle: string,
  checkIn: string,
  checkOut: string,
) {
  const html = layout(`
    ${heading("Your booking request was not accepted")}
    ${paragraph(`Hi ${guestFirstName}, unfortunately the host was unable to confirm your booking for <strong>"${listingTitle}"</strong> (${checkIn} → ${checkOut}).`)}
    ${paragraph("The host may be unavailable for those dates or the property may no longer be accepting requests. We encourage you to explore other available properties.")}
    ${button("Browse properties", `${BASE_URL}/listings`)}
    ${divider()}
    ${paragraph("If you have questions, you can still message the host directly through your chat history.")}
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Booking update for "${listingTitle}"`,
    html,
  });
}
