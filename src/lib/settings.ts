import { supabase } from './supabase';

export async function resetTasks(userId: string) {
  // Soft-delete: set deleted_at so we can undo within a grace period
  const now = new Date().toISOString();

  const history = await supabase
    .from('task_history')
    // @ts-expect-error Supabase type inference
    .update({ deleted_at: now })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select('id, deleted_at');
  const { data: deletedHistory, error: historyError } = history;
  if (historyError) throw historyError;

  const tasks = await supabase
    .from('tasks')
    // @ts-expect-error Supabase type inference
    .update({ deleted_at: now })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select('id, deleted_at');
  const { data: deletedTasks, error } = tasks;
  if (error) throw error;

  return {
    deletedHistoryCount: (deletedHistory || []).length,
    deletedTasksCount: (deletedTasks || []).length,
    deletedHistoryIds: (deletedHistory || []).map((r: any) => r.id),
    deletedTaskIds: (deletedTasks || []).map((r: any) => r.id),
    deletedAt: now,
  };
}

export async function resetHabitsProgress(userId: string) {
  // Soft-delete habit logs and reset streaks so we can undo within a grace period
  const now = new Date().toISOString();

  const logs = await supabase
    .from('habit_logs')
    // @ts-expect-error Supabase type inference
    .update({ deleted_at: now })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select('id, deleted_at');
  const { data: deletedLogs, error: logsError } = logs;
  if (logsError) throw logsError;

  const habits = await supabase
    .from('habits')
    // @ts-expect-error Supabase type inference
    .update({ current_streak: 0, best_streak: 0 })
    .eq('user_id', userId)
    .select('id');
  const { data: updatedHabits, error: updateError } = habits;

  if (updateError) throw updateError;

  return {
    deletedLogsCount: (deletedLogs || []).length,
    deletedLogIds: (deletedLogs || []).map((r: any) => r.id),
    updatedHabitsCount: (updatedHabits || []).length,
    deletedAt: now,
  };
}

export async function resetAllProgress(userId: string) {
  const tasksResult = await resetTasks(userId);
  const habitsResult = await resetHabitsProgress(userId);

  return {
    tasksResult,
    habitsResult,
    summary: {
      totalDeletedHistory: (tasksResult.deletedHistoryCount || 0),
      totalDeletedTasks: (tasksResult.deletedTasksCount || 0),
      totalDeletedHabitLogs: (habitsResult.deletedLogsCount || 0),
      totalUpdatedHabits: (habitsResult.updatedHabitsCount || 0),
      deletedAt: tasksResult.deletedAt || habitsResult.deletedAt || null,
    },
  };
}

export async function updateProfile(userId: string, updates: { full_name?: string | null; username?: string | null; preferences?: any; history_started_at?: string | null }) {
  const result = await supabase
    .from('profiles')
    // @ts-expect-error Supabase type inference
    .update(updates)
    .eq('id', userId)
    .select('*')
    .maybeSingle();
  const { data, error } = result;

  if (error) throw error;
  return data;
}

export async function setHistoryStartedNow(userId: string) {
  const now = new Date().toISOString();
  return await updateProfile(userId, { history_started_at: now });
}

export async function exportUserData(userId: string) {
  const [tasksRes, habitsRes, habitLogsRes, taskHistoryRes, profileRes] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('habits').select('*').eq('user_id', userId),
    supabase.from('habit_logs').select('*').eq('user_id', userId),
    supabase.from('task_history').select('*').eq('user_id', userId),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (habitsRes.error) throw habitsRes.error;
  if (habitLogsRes.error) throw habitLogsRes.error;
  if (taskHistoryRes.error) throw taskHistoryRes.error;
  if (profileRes.error) throw profileRes.error;

  return {
    profile: profileRes.data || null,
    tasks: tasksRes.data || [],
    habits: habitsRes.data || [],
    habit_logs: habitLogsRes.data || [],
    task_history: taskHistoryRes.data || [],
    exported_at: new Date().toISOString(),
  };
}

export async function restoreRows(table: string, ids: string[]) {
  if (!ids || ids.length === 0) return [];
  const result = await supabase.from(table)
    // @ts-expect-error Supabase type inference
    .update({ deleted_at: null }).in('id', ids).select('id');
  const { data, error } = result;
  if (error) throw error;
  return data || [];
}

export async function restoreTaskHistory(userId: string, ids: string[]) {
  // ensure ownership
  // Using a simple restoreRows then filter by user is less efficient; so scope by user
  if (!ids || ids.length === 0) return [];
  const result = await supabase
    .from('task_history')
    // @ts-expect-error Supabase type inference
    .update({ deleted_at: null })
    .eq('user_id', userId)
    .in('id', ids)
    .select('id');
  const { data, error } = result;
  if (error) throw error;
  return data || [];
}

export async function restoreHabitLogs(userId: string, ids: string[]) {
  if (!ids || ids.length === 0) return [];
  const result = await supabase
    .from('habit_logs')
    // @ts-expect-error Supabase type inference
    .update({ deleted_at: null })
    .eq('user_id', userId)
    .in('id', ids)
    .select('id');
  const { data, error } = result;
  if (error) throw error;
  return data || [];
}

export async function deleteAllUserData(userId: string) {
  // Delete dependent tables first, then profile
  const { data: deletedTaskHistory, error: thErr } = await supabase.from('task_history').delete().eq('user_id', userId).select('id');
  if (thErr) throw thErr;

  const { data: deletedTasks, error: tErr } = await supabase.from('tasks').delete().eq('user_id', userId).select('id');
  if (tErr) throw tErr;

  const { data: deletedHabitLogs, error: hlErr } = await supabase.from('habit_logs').delete().eq('user_id', userId).select('id');
  if (hlErr) throw hlErr;

  const { data: deletedHabits, error: hErr } = await supabase.from('habits').delete().eq('user_id', userId).select('id');
  if (hErr) throw hErr;

  const { data: deletedProfile, error: pErr } = await supabase.from('profiles').delete().eq('id', userId).select('id');
  if (pErr) throw pErr;

  return {
    deletedTaskHistoryCount: (deletedTaskHistory || []).length,
    deletedTasksCount: (deletedTasks || []).length,
    deletedHabitLogsCount: (deletedHabitLogs || []).length,
    deletedHabitsCount: (deletedHabits || []).length,
    deletedProfileCount: (deletedProfile || []).length,
  };
}
