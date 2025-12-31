import { supabase } from './supabase';
import type { Database } from './database.types';

type HabitUpdate = Database['public']['Tables']['habits']['Update'];
type HabitLog = Database['public']['Tables']['habit_logs']['Row'];
type HabitLogInsert = Database['public']['Tables']['habit_logs']['Insert'];

export async function updateHabitStreaks(userId: string) {
  try {
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (habitsError) throw habitsError;
    if (!habits) return;

    const habitList = habits as Array<{ id: string }>;

    for (const habit of habitList) {
      const { data: logs, error: logsError } = await supabase
        .from('habit_logs')
        .select('date, status')
        .eq('habit_id', habit.id)
        .order('date', { ascending: false })
        .limit(365);

      if (logsError) throw logsError;
      if (!logs || logs.length === 0) continue;

      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;

      const sortedLogs: HabitLog[] = (logs as HabitLog[]).sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      for (let i = 0; i < sortedLogs.length; i++) {
        const log = sortedLogs[i];

        if (log.status === 'completed') {
          tempStreak++;

          if (i === 0 && (log.date === today || log.date === yesterday)) {
            currentStreak = tempStreak;
          }

          if (tempStreak > bestStreak) {
            bestStreak = tempStreak;
          }
        } else if (log.status === 'missed') {
          if (tempStreak > 0 && i === 0) {
            currentStreak = 0;
          }
          tempStreak = 0;
        }
      }

      const updateData: HabitUpdate = {
        current_streak: currentStreak,
        best_streak: Math.max(bestStreak, currentStreak),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('habits') as any)
        .update(updateData)
        .eq('id', habit.id);

      if (updateError) throw updateError;
    }
  } catch (error) {
    console.error('Error updating habit streaks:', error);
  }
}

export async function checkAndCreateMissedLogs(userId: string) {
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('frequency', 'daily');

    if (habitsError) throw habitsError;
    if (!habits) return;

    for (const habit of (habits as Array<{ id: string }>)) {
      const { data: existingLog, error: logError } = await supabase
        .from('habit_logs')
        .select('id')
        .eq('habit_id', habit.id)
        .eq('date', yesterday)
        .maybeSingle();

      if (logError) throw logError;

      if (!existingLog) {
        const insertData: HabitLogInsert = {
          habit_id: habit.id,
          user_id: userId,
          date: yesterday,
          status: 'missed',
        };
        const { error: insertError } = await supabase
          .from('habit_logs')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(insertData as any);

        if (insertError) throw insertError;
      }
    }

    await updateHabitStreaks(userId);
  } catch (error) {
    console.error('Error checking missed logs:', error);
  }
}
