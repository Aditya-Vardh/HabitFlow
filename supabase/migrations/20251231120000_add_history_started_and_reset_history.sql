BEGIN;

-- Add a column to track when history should start for a user
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS history_started_at timestamptz;

-- If history_started_at is NULL for existing users, set it to NOW()
UPDATE profiles
SET history_started_at = COALESCE(history_started_at, NOW());

-- Remove all existing historical data so history starts from now
DELETE FROM task_history;
DELETE FROM habit_logs;

COMMIT;