-- Create table for admin actions/audit logs
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Function to permanently delete a user's data and write an audit record atomically
CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_task_history_count int;
  deleted_tasks_count int;
  deleted_habit_logs_count int;
  deleted_habits_count int;
  deleted_profile_count int;
  result jsonb;
BEGIN
  -- Delete dependent objects first
  DELETE FROM task_history WHERE user_id = _user_id RETURNING id INTO deleted_task_history_count;
  GET DIAGNOSTICS deleted_task_history_count = ROW_COUNT;

  DELETE FROM tasks WHERE user_id = _user_id RETURNING id INTO deleted_tasks_count;
  GET DIAGNOSTICS deleted_tasks_count = ROW_COUNT;

  DELETE FROM habit_logs WHERE user_id = _user_id RETURNING id INTO deleted_habit_logs_count;
  GET DIAGNOSTICS deleted_habit_logs_count = ROW_COUNT;

  DELETE FROM habits WHERE user_id = _user_id RETURNING id INTO deleted_habits_count;
  GET DIAGNOSTICS deleted_habits_count = ROW_COUNT;

  DELETE FROM profiles WHERE id = _user_id RETURNING id INTO deleted_profile_count;
  GET DIAGNOSTICS deleted_profile_count = ROW_COUNT;

  result := jsonb_build_object(
    'deletedTaskHistoryCount', deleted_task_history_count,
    'deletedTasksCount', deleted_tasks_count,
    'deletedHabitLogsCount', deleted_habit_logs_count,
    'deletedHabitsCount', deleted_habits_count,
    'deletedProfileCount', deleted_profile_count
  );

  INSERT INTO admin_actions (user_id, action_type, payload) VALUES (_user_id, 'delete_account', result);

  RETURN result;
END;
$$;

-- Allow authenticated users to call the function (you may tighten this via RLS later)
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO authenticated;

-- Optional: simple policy for admin_actions if you intend to allow users to see their own logs
CREATE POLICY "Allow users to insert admin actions" ON admin_actions
  FOR INSERT
  USING (true);
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Note: You should adapt RLS/policies for your security model in production.
