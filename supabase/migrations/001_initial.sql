-- Members sourced from WhatsApp group (auto-populated by scraper)
CREATE TABLE members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_name   text UNIQUE NOT NULL,
  display_name    text,
  avatar_url      text,
  created_at      timestamptz DEFAULT now()
);

-- A race/challenge
CREATE TABLE races (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  goal_target     numeric NOT NULL,
  goal_unit       text NOT NULL DEFAULT 'km',
  starts_at       timestamptz,
  ends_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- Who's in the race (auto-populated from WhatsApp group)
CREATE TABLE race_members (
  race_id         uuid REFERENCES races(id) ON DELETE CASCADE,
  member_id       uuid REFERENCES members(id) ON DELETE CASCADE,
  joined_at       timestamptz DEFAULT now(),
  PRIMARY KEY (race_id, member_id)
);

-- Each screenshot = one entry
CREATE TABLE progress_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id         uuid REFERENCES races(id) ON DELETE CASCADE NOT NULL,
  member_id       uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  screenshot_url  text NOT NULL,
  extracted_value numeric,
  extraction_raw  jsonb,
  source          text NOT NULL DEFAULT 'manual' CHECK (source IN ('scraper', 'manual')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'extracted', 'failed', 'manual_override')),
  whatsapp_ts     timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- Index for dedup check
CREATE UNIQUE INDEX idx_dedup_whatsapp ON progress_entries (member_id, whatsapp_ts)
  WHERE whatsapp_ts IS NOT NULL;

-- Computed view for the race track
CREATE VIEW race_standings AS
SELECT
  pe.race_id,
  pe.member_id,
  MAX(pe.extracted_value) AS personal_best,
  LEAST(MAX(pe.extracted_value) / r.goal_target * 100, 100) AS progress_pct,
  COUNT(*)::int AS total_posts,
  MAX(pe.created_at) AS last_post_at,
  CASE
    WHEN MAX(pe.created_at) IS NULL THEN 'sleeping'
    WHEN MAX(pe.extracted_value) >= r.goal_target THEN 'finished'
    WHEN now() - MAX(pe.created_at) < INTERVAL '2 days' THEN 'active'
    WHEN now() - MAX(pe.created_at) < INTERVAL '5 days' THEN 'warm'
    WHEN now() - MAX(pe.created_at) < INTERVAL '10 days' THEN 'cold'
    ELSE 'inactive'
  END AS activity_status
FROM progress_entries pe
JOIN races r ON r.id = pe.race_id
WHERE pe.status IN ('extracted', 'manual_override')
GROUP BY pe.race_id, pe.member_id, r.goal_target;

-- Storage bucket for screenshots (run via Supabase dashboard or API)
-- CREATE POLICY on storage.objects for screenshots bucket

-- Supabase Storage: create a bucket called 'screenshots' via the dashboard
-- and set it to public or use signed URLs
