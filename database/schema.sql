-- igreen.ai Neon Postgres schema
-- Safe to run repeatedly. Existing members and sustainability records are preserved.

CREATE TABLE IF NOT EXISTS community_users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('personal', 'business', 'corporate')),
  organization text,
  city text,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS community_users_email_unique
  ON community_users (lower(email));

CREATE TABLE IF NOT EXISTS activity_schedules (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('transport', 'energy', 'food', 'waste', 'water')),
  action text NOT NULL,
  quantity numeric(14, 2) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  co2e numeric(14, 2) NOT NULL CHECK (co2e >= 0),
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  start_date date NOT NULL,
  next_run_date date NOT NULL,
  note text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS activity_schedules_no_duplicates
  ON activity_schedules (user_id, category, lower(btrim(action)), quantity, frequency, start_date);

CREATE INDEX IF NOT EXISTS activity_schedules_due_idx
  ON activity_schedules (next_run_date)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS sustainability_impacts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('transport', 'energy', 'food', 'waste', 'water')),
  action text NOT NULL,
  quantity numeric(14, 2) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  co2e numeric(14, 2) NOT NULL CHECK (co2e >= 0),
  action_date date NOT NULL,
  note text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'schedule', 'bulk')),
  schedule_id uuid REFERENCES activity_schedules(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sustainability_impacts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE sustainability_impacts
  ADD COLUMN IF NOT EXISTS schedule_id uuid;

ALTER TABLE sustainability_impacts
  DROP CONSTRAINT IF EXISTS sustainability_impacts_source_check;

ALTER TABLE sustainability_impacts
  ADD CONSTRAINT sustainability_impacts_source_check
  CHECK (source IN ('manual', 'schedule', 'bulk'));

ALTER TABLE sustainability_impacts
  DROP CONSTRAINT IF EXISTS sustainability_impacts_schedule_id_fkey;

ALTER TABLE sustainability_impacts
  ADD CONSTRAINT sustainability_impacts_schedule_id_fkey
  FOREIGN KEY (schedule_id) REFERENCES activity_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sustainability_impacts_user_created_idx
  ON sustainability_impacts (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS sustainability_impacts_no_duplicates
  ON sustainability_impacts (
    user_id,
    category,
    lower(btrim(action)),
    quantity,
    action_date
  );

CREATE UNIQUE INDEX IF NOT EXISTS sustainability_impacts_schedule_occurrence_unique
  ON sustainability_impacts (schedule_id, action_date)
  WHERE schedule_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS goal_assessments (
  user_id uuid PRIMARY KEY REFERENCES community_users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  recommendations jsonb NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);
