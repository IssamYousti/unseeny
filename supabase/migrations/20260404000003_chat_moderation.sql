-- ─────────────────────────────────────────────────────────────────────────────
-- Admin-managed chat blacklist
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE chat_blacklist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL CHECK (type IN ('word', 'phrase', 'regex', 'platform')),
  value       text NOT NULL,
  description text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE chat_blacklist ENABLE ROW LEVEL SECURITY;
-- No public SELECT — keeps the list hidden from users trying to reverse-engineer it.
-- Service role (admin client) bypasses RLS for management.

-- ─────────────────────────────────────────────────────────────────────────────
-- Violation audit log
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE chat_violations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_content text NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  sender_id       uuid REFERENCES auth.users(id)   ON DELETE SET NULL,
  matched_rule    text NOT NULL,   -- e.g. 'email', 'phone', 'blacklist:word', 'blacklist:regex'
  matched_value   text,            -- the specific value that triggered the rule
  is_reviewed     boolean DEFAULT false,
  reviewed_at     timestamptz,
  reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_action   text,            -- 'dismissed' | 'warned'
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE chat_violations ENABLE ROW LEVEL SECURITY;
-- Service role only — admins access via admin client.

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed initial blacklist
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO chat_blacklist (type, value, description) VALUES
  -- Messaging platforms
  ('platform', 'whatsapp',   'WhatsApp messaging app'),
  ('platform', 'telegram',   'Telegram messaging app'),
  ('platform', 'signal',     'Signal messaging app'),
  ('platform', 'viber',      'Viber messaging app'),
  ('platform', 'wechat',     'WeChat messaging app'),
  ('platform', 'line app',   'Line messaging app'),
  ('platform', 'discord',    'Discord messaging app'),
  ('platform', 'skype',      'Skype'),
  ('platform', 'facetime',   'FaceTime video call'),
  ('platform', 'snapchat',   'Snapchat'),
  ('platform', 'instagram',  'Instagram DM redirect'),
  -- Off-platform contact attempts (EN)
  ('phrase', 'my number is',      'Attempting to share phone number'),
  ('phrase', 'call me at',        'Requesting off-platform call'),
  ('phrase', 'text me at',        'Requesting off-platform text'),
  ('phrase', 'reach me at',       'Off-platform contact attempt'),
  ('phrase', 'contact me outside','Off-platform contact attempt'),
  ('phrase', 'send me an email',  'Requesting off-platform email'),
  -- Off-platform contact attempts (NL)
  ('phrase', 'mijn nummer',       'Dutch: my number'),
  ('phrase', 'bel me',            'Dutch: call me'),
  ('phrase', 'stuur me een bericht op', 'Dutch: send me a message on'),
  -- Off-platform contact attempts (FR)
  ('phrase', 'mon numéro',        'French: my number'),
  ('phrase', 'appelez-moi',       'French: call me'),
  ('phrase', 'contactez-moi sur', 'French: contact me on'),
  -- Common obfuscation patterns
  ('word', 'wa.me',           'WhatsApp link shortener'),
  ('word', 't.me',            'Telegram link shortener');
