-- Run once against the dedicated OpenArcade Postgres database.
CREATE TABLE IF NOT EXISTS arcade_plays (game_id text PRIMARY KEY, plays bigint NOT NULL DEFAULT 0 CHECK (plays >= 0));
CREATE TABLE IF NOT EXISTS arcade_votes (game_id text NOT NULL, visitor_id uuid NOT NULL, value smallint NOT NULL CHECK (value IN (-1, 1)), PRIMARY KEY (game_id, visitor_id));
CREATE TABLE IF NOT EXISTS arcade_comments (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, game_id text NOT NULL, body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 280), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS arcade_comments_game_recent ON arcade_comments (game_id, created_at DESC, id DESC);
