-- OPENARCADE S02. Apply after feedback schema, on the explicitly selected DB.
-- Additive/idempotent; no scores are seeded. Functions run with invoker rights.
CREATE TABLE IF NOT EXISTS arcade_score_boards (
  game_id text NOT NULL,
  rule_version integer NOT NULL CHECK (rule_version > 0),
  sort_order text NOT NULL CHECK (sort_order IN ('asc','desc')),
  epoch bigint NOT NULL DEFAULT 1,
  ai_sequence bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id,rule_version)
);
CREATE TABLE IF NOT EXISTS arcade_score_rows (
  run_id uuid PRIMARY KEY,
  game_id text NOT NULL,
  rule_version integer NOT NULL,
  score double precision NOT NULL CHECK (score::text NOT IN ('Infinity','-Infinity','NaN')),
  actor text NOT NULL CHECK (actor IN ('human','ai')),
  user_id text,
  display_name text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  removed_at timestamptz,
  CHECK (actor <> 'ai' OR user_id IS NULL)
);
CREATE INDEX IF NOT EXISTS arcade_score_board_idx ON arcade_score_rows(game_id,rule_version,actor,score,created_at,run_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS arcade_score_personal_idx ON arcade_score_rows(user_id,game_id,rule_version) WHERE user_id IS NOT NULL AND removed_at IS NULL;
CREATE TABLE IF NOT EXISTS arcade_score_receipts (
  run_id uuid PRIMARY KEY,
  game_id text NOT NULL,
  rule_version integer NOT NULL,
  fingerprint text NOT NULL CHECK (length(fingerprint)=64),
  actor text NOT NULL,
  initial_user_id text,
  claim_hash text,
  claimed_by text,
  response jsonb NOT NULL,
  pending_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '7 days')
);
ALTER TABLE arcade_score_receipts ADD COLUMN IF NOT EXISTS pending_payload jsonb;
CREATE INDEX IF NOT EXISTS arcade_score_receipt_expiry_idx ON arcade_score_receipts(expires_at) WHERE claim_hash IS NOT NULL;
CREATE TABLE IF NOT EXISTS arcade_score_limits (
  scope_hash text NOT NULL,
  window_start bigint NOT NULL,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (scope_hash,window_start)
);

CREATE OR REPLACE FUNCTION arcade_score_submit(
  p_run_id uuid,p_game_id text,p_rule_version integer,p_order text,p_score double precision,
  p_actor text,p_user_id text,p_display_name text,p_fingerprint text,p_claim_hash text,p_details jsonb
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  receipt arcade_score_receipts%ROWTYPE;
  board arcade_score_boards%ROWTYPE;
  cutoff double precision;
  active_count integer;
  accepted boolean := true;
  is_pending boolean;
  accepted_at timestamptz;
  deadline timestamptz;
  name text;
  answer jsonb;
  names text[] := ARRAY['Albert','Tom','Ada','Grace','Alan','Katherine','Linus','Edsger','Barbara','Donald','Margaret','Claude','Frances','John','Mary','George'];
BEGIN
  IF p_run_id IS NULL OR p_game_id IS NULL OR length(p_game_id)>64 OR p_rule_version<1 OR p_order NOT IN ('asc','desc') OR
     p_score IS NULL OR p_score::text IN ('Infinity','-Infinity','NaN') OR p_actor NOT IN ('human','ai') OR
     p_fingerprint IS NULL OR length(p_fingerprint)<>64 OR p_details IS NULL OR jsonb_typeof(p_details)<>'object' OR
     (p_actor='ai' AND (p_user_id IS NOT NULL OR p_claim_hash IS NOT NULL)) THEN
    RAISE EXCEPTION 'invalid score input' USING ERRCODE='22023';
  END IF;
  -- Global run lock first, then board lock, for every submitting/claiming writer.
  PERFORM pg_advisory_xact_lock(hashtextextended('arcade-score-run:'||p_run_id::text,0));
  SELECT * INTO receipt FROM arcade_score_receipts WHERE run_id=p_run_id FOR UPDATE;
  IF FOUND THEN
    IF receipt.fingerprint<>p_fingerprint OR receipt.game_id<>p_game_id OR receipt.rule_version<>p_rule_version OR
       receipt.actor<>p_actor OR receipt.initial_user_id IS DISTINCT FROM p_user_id THEN
      RETURN jsonb_build_object('status','conflict','runId',p_run_id);
    END IF;
    RETURN receipt.response;
  END IF;
  INSERT INTO arcade_score_boards(game_id,rule_version,sort_order) VALUES(p_game_id,p_rule_version,p_order) ON CONFLICT DO NOTHING;
  SELECT * INTO board FROM arcade_score_boards WHERE game_id=p_game_id AND rule_version=p_rule_version FOR UPDATE;
  IF board.sort_order<>p_order THEN RAISE EXCEPTION 'score order/version conflict' USING ERRCODE='22023'; END IF;
  accepted_at:=clock_timestamp(); deadline:=accepted_at+interval '7 days';
  is_pending:=p_actor='human' AND p_user_id IS NULL AND p_claim_hash IS NOT NULL;
  IF p_actor='ai' THEN
    SELECT count(*) INTO active_count FROM arcade_score_rows WHERE game_id=p_game_id AND rule_version=p_rule_version AND actor='ai' AND removed_at IS NULL;
    IF active_count>=10 THEN
      SELECT score INTO cutoff FROM arcade_score_rows WHERE game_id=p_game_id AND rule_version=p_rule_version AND actor='ai' AND removed_at IS NULL
        ORDER BY CASE WHEN p_order='asc' THEN score END ASC,CASE WHEN p_order='desc' THEN score END DESC,created_at,run_id OFFSET 9 LIMIT 1;
      accepted:=CASE WHEN p_order='asc' THEN p_score<cutoff ELSE p_score>cutoff END;
    END IF;
    IF accepted THEN
      UPDATE arcade_score_boards SET ai_sequence=ai_sequence+1 WHERE game_id=p_game_id AND rule_version=p_rule_version RETURNING * INTO board;
      name:='AI-'||names[1+((board.ai_sequence-1)%array_length(names,1))::integer];
    ELSE name:=NULL;
    END IF;
  ELSE name:=left(coalesce(nullif(p_display_name,''),'Guest'),50);
  END IF;
  IF accepted AND NOT is_pending THEN
    INSERT INTO arcade_score_rows(run_id,game_id,rule_version,score,actor,user_id,display_name,details,created_at)
      VALUES(p_run_id,p_game_id,p_rule_version,p_score,p_actor,p_user_id,name,p_details,accepted_at);
    IF p_actor='ai' THEN
      DELETE FROM arcade_score_rows WHERE run_id IN (
        SELECT run_id FROM arcade_score_rows WHERE game_id=p_game_id AND rule_version=p_rule_version AND actor='ai'
        ORDER BY (removed_at IS NOT NULL),CASE WHEN p_order='asc' THEN score END ASC,CASE WHEN p_order='desc' THEN score END DESC,created_at,run_id OFFSET 10
      );
    END IF;
    UPDATE arcade_score_boards SET epoch=epoch+1 WHERE game_id=p_game_id AND rule_version=p_rule_version;
  END IF;
  answer:=jsonb_build_object('status',CASE WHEN accepted THEN 'accepted' ELSE 'rejected' END,'runId',p_run_id,'qualified',accepted AND NOT is_pending,'pending',is_pending,'displayName',name,'expiresAt',deadline);
  -- Rejected AI receipts contain no score or gameplay payload. Keep a bounded-size
  -- replay marker even after pruning; never reinsert a displaced run on retry.
  INSERT INTO arcade_score_receipts(run_id,game_id,rule_version,fingerprint,actor,initial_user_id,claim_hash,claimed_by,response,pending_payload,created_at,expires_at)
    VALUES(p_run_id,p_game_id,p_rule_version,p_fingerprint,p_actor,p_user_id,p_claim_hash,p_user_id,answer,
      CASE WHEN is_pending THEN jsonb_build_object('score',p_score,'details',p_details) ELSE NULL END,accepted_at,deadline);
  RETURN answer;
END $$;

CREATE OR REPLACE FUNCTION arcade_score_claim(p_run_id uuid,p_claim_hash text,p_user_id text,p_display_name text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE receipt arcade_score_receipts%ROWTYPE; answer jsonb;
BEGIN
  IF p_user_id IS NULL OR p_user_id='' THEN RETURN jsonb_build_object('status','forbidden','runId',p_run_id); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('arcade-score-run:'||p_run_id::text,0));
  SELECT * INTO receipt FROM arcade_score_receipts WHERE run_id=p_run_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','expired','runId',p_run_id); END IF;
  IF receipt.claimed_by IS NULL AND receipt.expires_at<=clock_timestamp() THEN RETURN jsonb_build_object('status','expired','runId',p_run_id); END IF;
  IF receipt.actor<>'human' OR receipt.claim_hash IS NULL OR p_claim_hash IS NULL OR receipt.claim_hash<>p_claim_hash THEN RETURN jsonb_build_object('status','forbidden','runId',p_run_id); END IF;
  IF receipt.claimed_by IS NOT NULL AND receipt.claimed_by<>p_user_id THEN RETURN jsonb_build_object('status','forbidden','runId',p_run_id); END IF;
  IF receipt.claimed_by=p_user_id THEN RETURN jsonb_build_object('status','accepted','runId',p_run_id,'claimed',true); END IF;
  IF receipt.expires_at<=clock_timestamp() THEN RETURN jsonb_build_object('status','expired','runId',p_run_id); END IF;
  PERFORM 1 FROM arcade_score_boards WHERE game_id=receipt.game_id AND rule_version=receipt.rule_version FOR UPDATE;
  IF receipt.pending_payload IS NULL THEN RETURN jsonb_build_object('status','forbidden','runId',p_run_id); END IF;
  INSERT INTO arcade_score_rows(run_id,game_id,rule_version,score,actor,user_id,display_name,details,created_at)
    VALUES(p_run_id,receipt.game_id,receipt.rule_version,(receipt.pending_payload->>'score')::double precision,'human',p_user_id,
      left(coalesce(nullif(p_display_name,''),'Player'),50),receipt.pending_payload->'details',clock_timestamp());
  UPDATE arcade_score_receipts SET claimed_by=p_user_id,pending_payload=NULL WHERE run_id=p_run_id;
  UPDATE arcade_score_boards SET epoch=epoch+1 WHERE game_id=receipt.game_id AND rule_version=receipt.rule_version;
  answer:=jsonb_build_object('status','accepted','runId',p_run_id,'claimed',true);
  RETURN answer;
END $$;

CREATE OR REPLACE FUNCTION arcade_score_rate_limit(p_scope_hash text,p_window_seconds integer,p_limit integer)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE bucket bigint; count_hits integer; remaining integer;
BEGIN
  IF length(p_scope_hash)<>64 OR p_window_seconds<1 OR p_window_seconds>86400 OR p_limit<1 THEN RAISE EXCEPTION 'invalid limit' USING ERRCODE='22023'; END IF;
  bucket:=floor(extract(epoch FROM clock_timestamp())/p_window_seconds)::bigint*p_window_seconds;
  INSERT INTO arcade_score_limits(scope_hash,window_start,hits,expires_at) VALUES(p_scope_hash,bucket,1,to_timestamp(bucket+p_window_seconds*2))
    ON CONFLICT(scope_hash,window_start) DO UPDATE SET hits=LEAST(arcade_score_limits.hits+1,p_limit+1) RETURNING hits INTO count_hits;
  remaining:=greatest(1,ceil(bucket+p_window_seconds-extract(epoch FROM clock_timestamp()))::integer);
  RETURN jsonb_build_object('allowed',count_hits<=p_limit,'retryAfter',remaining);
END $$;

-- Operator-only helpers; do not expose as public API actions. Use the same board
-- lock/epoch on removal, restore or reset. Reapply is idempotent for this schema.
CREATE OR REPLACE FUNCTION arcade_score_set_removed(p_run_id uuid,p_removed boolean)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE item arcade_score_rows%ROWTYPE;
BEGIN
  SELECT * INTO item FROM arcade_score_rows WHERE run_id=p_run_id;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM 1 FROM arcade_score_boards WHERE game_id=item.game_id AND rule_version=item.rule_version FOR UPDATE;
  IF NOT p_removed AND item.actor='ai' THEN RETURN false; END IF; -- restore AI by a new legitimate run, not an unchecked extra row
  UPDATE arcade_score_rows SET removed_at=CASE WHEN p_removed THEN clock_timestamp() ELSE NULL END WHERE run_id=p_run_id;
  UPDATE arcade_score_boards SET epoch=epoch+1 WHERE game_id=item.game_id AND rule_version=item.rule_version;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION arcade_score_cleanup() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM arcade_score_limits WHERE expires_at<clock_timestamp();
  -- Preserve fixed-size run/fingerprint/outcome markers for global idempotency;
  -- expire claim authority without retaining rejected leaderboard scores.
  UPDATE arcade_score_receipts SET claim_hash=NULL,pending_payload=NULL WHERE expires_at<clock_timestamp() AND claimed_by IS NULL AND claim_hash IS NOT NULL;
END $$;
