/**
 * Message moderation — detects contact information that guests/hosts
 * should not share directly (email, phone, social links).
 * All communication must stay on-platform until a booking is confirmed.
 */

type ModerationResult =
  | { blocked: false }
  | { blocked: true; reason: string };

// ─── Contact info patterns ────────────────────────────────────────────────────

const CONTACT_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    // Email addresses: user@domain.tld
    pattern: /[\w.+\-]+@[\w\-]+\.[a-z]{2,}/i,
    reason: "email",
  },
  {
    // International phone: +31 6 12 34 56 78, +1-555-555-5555
    pattern: /\+\d{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{2,4}[\s.\-]?\d{2,4}([\s.\-]?\d{2,4})?/,
    reason: "phone",
  },
  {
    // 10–14 consecutive digits (unformatted phone number)
    pattern: /\b\d{10,14}\b/,
    reason: "phone",
  },
  {
    // Dutch/European mobile: 06-12345678 or 06 12345678
    pattern: /\b0\d{1,2}[\s.\-]\d{6,8}\b/,
    reason: "phone",
  },
  {
    // US format: (123) 456-7890
    pattern: /\(\d{3,4}\)\s?\d{3,4}[\s.\-]\d{4}/,
    reason: "phone",
  },
  {
    // WhatsApp links
    pattern: /wa\.me\//i,
    reason: "whatsapp",
  },
  {
    // Telegram links
    pattern: /t\.me\//i,
    reason: "telegram",
  },
  {
    // Any http/https URL
    pattern: /https?:\/\//i,
    reason: "url",
  },
  {
    // Social media handles followed by username (prevents @instagram, @snapchat, etc.)
    pattern: /instagram\.com|facebook\.com|tiktok\.com|snapchat\.com|twitter\.com|x\.com/i,
    reason: "social",
  },
];

// ─── Configurable word blacklist ──────────────────────────────────────────────
// Add lowercase words/phrases to block. Leave empty to disable.

const WORD_BLACKLIST: string[] = [];

// ─── Public API ───────────────────────────────────────────────────────────────

export function moderateMessage(content: string): ModerationResult {
  for (const { pattern, reason } of CONTACT_PATTERNS) {
    if (pattern.test(content)) {
      return { blocked: true, reason };
    }
  }

  const lower = content.toLowerCase();
  for (const word of WORD_BLACKLIST) {
    if (lower.includes(word.toLowerCase())) {
      return { blocked: true, reason: "blacklist" };
    }
  }

  return { blocked: false };
}

export function getModerationMessage(reason: string): string {
  switch (reason) {
    case "email":
      return "Email addresses cannot be shared in chat. All communication must stay on the platform.";
    case "phone":
      return "Phone numbers cannot be shared in chat. Contact details are exchanged after booking confirmation.";
    case "whatsapp":
    case "telegram":
      return "Messaging app links cannot be shared here. Please keep all communication on the platform.";
    case "url":
      return "External links are not allowed in chat.";
    case "social":
      return "Social media links cannot be shared here.";
    default:
      return "This message contains content that is not allowed on the platform.";
  }
}
