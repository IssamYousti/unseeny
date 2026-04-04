/**
 * Message moderation — static layer (runs client + server).
 * Detects contact info that must not be shared before booking confirmation.
 *
 * Dynamic DB blacklist is checked server-side only in sendMessage().
 */

export type ModerationResult =
  | { blocked: false }
  | { blocked: true; reason: string; matchedValue?: string };

// ─── English digit words ───────────────────────────────────────────────────
const EN_DIGIT = "zero|one|two|three|four|five|six|seven|eight|nine";

// ─── Dutch digit words ─────────────────────────────────────────────────────
const NL_DIGIT = "nul|een|twee|drie|vier|vijf|zes|zeven|acht|negen";

// Matches 7+ consecutive digit words (very unlikely in normal text)
const SPELLED_DIGITS_EN = new RegExp(
  `(?:${EN_DIGIT})(?:[\\s,\\-]+(?:${EN_DIGIT})){6,}`,
  "i",
);
const SPELLED_DIGITS_NL = new RegExp(
  `(?:${NL_DIGIT})(?:[\\s,\\-]+(?:${NL_DIGIT})){6,}`,
  "i",
);

// Mixed spelled + numeric — e.g. "zero six 1 2 3 4 5 6 7 8"
// Detects alternating digit words and digits in long sequences
const MIXED_SPELLED = new RegExp(
  `(?:(?:${EN_DIGIT}|${NL_DIGIT}|\\d)[\\s,\\-]+){6,}(?:${EN_DIGIT}|${NL_DIGIT}|\\d)`,
  "i",
);

// ─── Core contact-info patterns ────────────────────────────────────────────

const STATIC_PATTERNS: { pattern: RegExp; reason: string }[] = [
  // Email address
  {
    pattern: /[\w.+\-]+@[\w\-]+\.[a-z]{2,}/i,
    reason: "email",
  },

  // International phone: +31 6 12 34 56 78, +1-555-555-5555, etc.
  {
    pattern: /\+\d{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{2,4}[\s.\-]?\d{2,4}([\s.\-]?\d{2,4})?/,
    reason: "phone",
  },

  // 8–15 consecutive digits (unformatted phone)
  {
    pattern: /\b\d{8,15}\b/,
    reason: "phone",
  },

  // Dutch/European mobile: 06-12345678, 06 12 34 56 78, 0031...
  {
    pattern: /\b0\d{1,2}[\s.\-]\d{3,4}[\s.\-]?\d{3,4}([\s.\-]?\d{2,4})?\b/,
    reason: "phone",
  },

  // US format: (123) 456-7890
  {
    pattern: /\(\d{3,4}\)\s?\d{3,4}[\s.\-]\d{4}/,
    reason: "phone",
  },

  // Digits with light obfuscation: 0 6 1 2 3 4 5 6 7 8 (spaced out)
  {
    pattern: /\b(\d[\s.\-]){7,}\d\b/,
    reason: "phone",
  },

  // Spelled-out numbers (English) — 7+ digit words
  {
    pattern: SPELLED_DIGITS_EN,
    reason: "phone_spelled",
  },

  // Spelled-out numbers (Dutch) — 7+ digit words
  {
    pattern: SPELLED_DIGITS_NL,
    reason: "phone_spelled",
  },

  // Mixed spelled + digit sequences
  {
    pattern: MIXED_SPELLED,
    reason: "phone_spelled",
  },

  // WhatsApp deep link
  {
    pattern: /wa\.me\//i,
    reason: "whatsapp",
  },

  // Telegram deep link
  {
    pattern: /t\.me\//i,
    reason: "telegram",
  },

  // Any http/https URL
  {
    pattern: /https?:\/\//i,
    reason: "url",
  },

  // Domain-only links (e.g. "go to google.com")
  {
    pattern: /\b\w{2,30}\.(com|org|net|io|app|co|nl|fr|be|de|uk|info)\b/i,
    reason: "url",
  },

  // Social media domain mentions
  {
    pattern: /instagram\.com|facebook\.com|tiktok\.com|snapchat\.com|twitter\.com|x\.com|linkedin\.com/i,
    reason: "social",
  },

  // @handle — typical platform username format (3–30 chars, letters/numbers/._)
  // Only blocks when it looks like a standalone handle, not mid-sentence mentions
  {
    pattern: /(?:^|\s)@[a-zA-Z0-9_.]{3,30}(?:\s|$)/m,
    reason: "handle",
  },
];

// ─── Public API ────────────────────────────────────────────────────────────

export function moderateMessage(content: string): ModerationResult {
  for (const { pattern, reason } of STATIC_PATTERNS) {
    const match = pattern.exec(content);
    if (match) {
      return { blocked: true, reason, matchedValue: match[0].trim() };
    }
  }
  return { blocked: false };
}

/**
 * Check content against an admin-managed blacklist loaded from DB.
 * Pass the raw rows from chat_blacklist.
 */
export function checkBlacklist(
  content: string,
  items: { type: string; value: string }[],
): ModerationResult {
  const lower = content.toLowerCase();

  for (const item of items) {
    if (item.type === "regex") {
      try {
        const re = new RegExp(item.value, "i");
        const match = re.exec(content);
        if (match) {
          return { blocked: true, reason: "blacklist:regex", matchedValue: match[0] };
        }
      } catch {
        // Invalid regex stored in DB — skip safely
      }
    } else {
      // word / phrase / platform — simple substring match
      if (lower.includes(item.value.toLowerCase())) {
        return { blocked: true, reason: `blacklist:${item.type}`, matchedValue: item.value };
      }
    }
  }
  return { blocked: false };
}

export function getModerationMessage(reason: string): string {
  if (reason.startsWith("blacklist:platform")) {
    return "External messaging platforms cannot be mentioned in chat. Please keep all communication on the platform.";
  }
  if (reason.startsWith("blacklist:")) {
    return "This message contains content that is not permitted on the platform.";
  }
  switch (reason) {
    case "email":
      return "Email addresses cannot be shared in chat. All communication must stay on the platform.";
    case "phone":
    case "phone_spelled":
      return "Phone numbers cannot be shared in chat. Contact details are exchanged after booking confirmation.";
    case "whatsapp":
    case "telegram":
      return "Messaging app links cannot be shared here. Please keep all communication on the platform.";
    case "url":
      return "External links are not allowed in chat.";
    case "social":
      return "Social media links cannot be shared here.";
    case "handle":
      return "External platform handles cannot be shared in chat.";
    default:
      return "This message contains content that is not allowed on the platform.";
  }
}
