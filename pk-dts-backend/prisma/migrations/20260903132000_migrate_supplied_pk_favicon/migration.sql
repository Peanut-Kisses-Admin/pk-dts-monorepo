UPDATE "system_appearance_settings"
SET
  "settings_json" = jsonb_set(
    COALESCE("settings_json", '{}'::jsonb),
    '{faviconUrl}',
    '"/images/pk-dts-mark-v3.png"'::jsonb,
    true
  ),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "settings_json" ->> 'faviconUrl' IN (
  '/images/dts-logo.png',
  '/images/pk-dts-logo.png',
  '/images/pk-dts-logo-v2.png',
  '/images/peanut_kisses_logo-removebg-preview.png'
);
