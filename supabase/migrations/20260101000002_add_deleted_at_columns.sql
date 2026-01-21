-- Add deleted_at field to support soft deletes and undo grace period
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE task_history
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE habit_logs
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Make sure queries filter out deleted rows by default in your app.
