-- S03 additive migration, after db/feedback-schema.sql. Review the database
-- target first. Apply to isolated preview before production. Old comments
-- receive no account ownership; existing author fields remain NULL.
BEGIN;
ALTER TABLE arcade_comments ADD COLUMN IF NOT EXISTS author_clerk_user_id text;
ALTER TABLE arcade_comments ADD COLUMN IF NOT EXISTS author_display_name text;
ALTER TABLE arcade_comments ADD COLUMN IF NOT EXISTS removed_at timestamptz;

CREATE TABLE IF NOT EXISTS arcade_comment_profiles (
  clerk_user_id text PRIMARY KEY,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60 AND position('@' IN display_name)=0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS arcade_comment_limits (
  clerk_user_id text PRIMARY KEY,
  minute_start timestamptz NOT NULL,
  minute_count integer NOT NULL CHECK (minute_count BETWEEN 1 AND 5),
  day_start timestamptz NOT NULL,
  day_count integer NOT NULL CHECK (day_count BETWEEN 1 AND 50)
);
CREATE INDEX IF NOT EXISTS arcade_comments_visible_recent
  ON arcade_comments (game_id,created_at DESC,id DESC) WHERE removed_at IS NULL;
COMMIT;
