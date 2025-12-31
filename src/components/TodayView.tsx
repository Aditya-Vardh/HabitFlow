import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, Circle, Clock, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import { Database } from '../lib/database.types';
import { checkAndCreateMissedLogs, updateHabitStreaks } from '../lib/habitUtils';

type Habit = Database['public']['Tables']['habits']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type HabitLog = Database['public']['Tables']['habit_logs']['Row'];
type HabitLogInsert = Database['public']['Tables']['habit_logs']['Insert'];
type HabitLogUpdate = Database['public']['Tables']['habit_logs']['Update'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
type TaskHistoryInsert = Database['public']['Tables']['task_history']['Insert'];

export default function TodayView() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]); // active (non-completed) tasks for the UI
  const [allTasksCount, setAllTasksCount] = useState(0); // total tasks (including completed) for progress calc
  const [completedTasksCount, setCompletedTasksCount] = useState(0); // completed tasks count
  const [habitLogs, setHabitLogs] = useState<Record<string, HabitLog>>({});
  const [loading, setLoading] = useState(true);
  const [isPulsing, setIsPulsing] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user) {
      loadTodayData();
    }

    const handler = (e: Event) => {
      // If something completed elsewhere, refresh today's data
      const detail = (e as CustomEvent).detail || {};
      // Skip events originated from this view (source: 'today') to avoid duplicate loads
      if (detail.source === 'today') return;
      if (user) loadTodayData();
    };

    const fullHandler = () => {
      // pulse the progress ring briefly on full celebration
      setIsPulsing(true);
      window.setTimeout(() => setIsPulsing(false), 1400);
    };

    window.addEventListener('itemCompleted', handler as EventListener);
    window.addEventListener('celebrationFull', fullHandler as EventListener);

    return () => {
      window.removeEventListener('itemCompleted', handler as EventListener);
      window.removeEventListener('celebrationFull', fullHandler as EventListener);
    };
  }, [user]);

  const loadTodayData = async () => {
    try {
      await checkAndCreateMissedLogs(user!.id);
      await updateHabitStreaks(user!.id);
      const [habitsRes, tasksRes, logsRes] = await Promise.all([
        supabase
          .from('habits')
          .select('*')
          .eq('user_id', user!.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        // Fetch all tasks (including completed) so we can compute progress properly
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user!.id)
          .order('due_date', { ascending: true }),
        supabase
          .from('habit_logs')
          .select('*')
          .eq('user_id', user!.id)
          .eq('date', today),
      ]);

      if (habitsRes.error) throw habitsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (logsRes.error) throw logsRes.error;

      setHabits(habitsRes.data || []);

      const allTasks: Task[] = tasksRes.data || [];
      // active tasks shown in UI (not completed)
      setTasks(allTasks.filter(t => t.status !== 'completed'));
      setAllTasksCount(allTasks.length);
      setCompletedTasksCount(allTasks.filter(t => t.status === 'completed').length);

      const logsMap: Record<string, HabitLog> = {};
      ((logsRes.data || []) as HabitLog[]).forEach((log) => {
        logsMap[log.habit_id] = log;
      });
      setHabitLogs(logsMap);

      // after data refreshed, emit progressUpdated so Dashboard can react (e.g., full celebration)
      try {
        const postProgress = calculateProgress();
        window.dispatchEvent(new CustomEvent('progressUpdated', { detail: { progress: postProgress } }));
      } catch {
        // ignore
      }
    } catch (error) {
      console.error('Error loading today data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (habitId: string) => {
    const existingLog = habitLogs[habitId];

    // Optimistic UI update: only update this habit's log locally first
    const newStatus = existingLog?.status === 'completed' ? 'missed' : 'completed';
    setHabitLogs((prev) => ({
      ...prev,
      [habitId]: {
        ...(prev[habitId] || { habit_id: habitId, user_id: user!.id, date: today, id: 'temp-' + habitId }),
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      } as HabitLog,
    }));

    try {
      if (existingLog) {
        const updateData: HabitLogUpdate = {
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('habit_logs') as any)
          .update(updateData)
          .eq('id', existingLog.id);

        if (error) throw error;
      } else {
        const insertData: HabitLogInsert = {
          habit_id: habitId,
          user_id: user!.id,
          date: today,
          status: 'completed',
          completed_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from('habit_logs')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(insertData as any);

        if (error) throw error;
      }

      // update streaks in background
      await updateHabitStreaks(user!.id);

      // Instead of reloading all data (which can reorder items), fetch only today's habit logs and update locally
      try {
        const { data: logsRes, error: logsError } = await supabase
          .from('habit_logs')
          .select('*')
          .eq('user_id', user!.id)
          .eq('date', today);
        if (!logsError && logsRes) {
          const logsMap: Record<string, HabitLog> = {};
          (logsRes as HabitLog[]).forEach((log) => {
            logsMap[log.habit_id] = log;
          });
          setHabitLogs(logsMap);

          // emit updated progress
          try {
            const postProgress = calculateProgress();
            window.dispatchEvent(new CustomEvent('progressUpdated', { detail: { progress: postProgress } }));
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }

      // Emit a global event so the Dashboard can show celebratory effects
      // include source so listeners can avoid duplicate refreshes
      try {
        window.dispatchEvent(new CustomEvent('itemCompleted', { detail: { type: 'habit', id: habitId, source: 'today' } }));
      } catch {
        // ignore
      }
    } catch (error) {
      console.error('Error toggling habit:', error);
      // Revert optimistic update on error
      await loadTodayData();
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const updateData: TaskUpdate = { status: newStatus };

      if (newStatus === 'completed') {
        const completedAt = new Date().toISOString();
        updateData.completed_at = completedAt;

        const task = tasks.find(t => t.id === taskId);
        if (task) {
          const historyData: TaskHistoryInsert = {
            user_id: user!.id,
            task_id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            due_date: task.due_date,
            completed_at: completedAt,
            created_at: task.created_at,
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from('task_history').insert(historyData as any);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tasks') as any)
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
      await loadTodayData();

      // Emit a global event when a task is completed so Dashboard can celebrate
      if (newStatus === 'completed') {
        try {
          window.dispatchEvent(new CustomEvent('itemCompleted', { detail: { type: 'task', id: taskId } }));
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const calculateProgress = () => {
    const totalItems = habits.length + allTasksCount;
    if (totalItems === 0) return 0;

    const completedHabits = habits.filter((h) => habitLogs[h.id]?.status === 'completed').length;
    const completedTasks = completedTasksCount;
    const completed = completedHabits + completedTasks;

    return Math.round((completed / totalItems) * 100);
  };

  const getMotivationalMessage = (progress: number) => {
    if (progress === 0) return "Let's start your day strong!";
    if (progress < 25) return "You've got this! Keep going!";
    if (progress < 50) return "Great progress! You're on a roll!";
    if (progress < 75) return "Fantastic! Almost there!";
    if (progress < 100) return "So close! Finish strong!";
    return "Amazing! You crushed it today!";
  };

  const progress = calculateProgress();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-2xl bg-black/30 rounded-3xl p-8 border border-white/10 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Today's Progress</h2>
            <p className="text-gray-300">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <Sparkles className="w-8 h-8 text-yellow-400" />
        </div>

        <div className="flex items-center gap-6 mb-4">
          <div className={`relative w-32 h-32 ${isPulsing ? 'pulse-ring' : ''}`}>
            <svg className="transform -rotate-90 w-32 h-32">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="url(#gradient)"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">{progress}%</span>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-2xl font-semibold text-white mb-2">{getMotivationalMessage(progress)}</p>
            <div className="space-y-1 text-gray-300">
              <p>{habits.filter((h) => habitLogs[h.id]?.status === 'completed').length} / {habits.length} habits completed</p>
              <p>{completedTasksCount} / {allTasksCount} tasks completed ({tasks.length} remaining)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="backdrop-blur-2xl bg-black/30 rounded-3xl p-6 border border-white/10 shadow-xl shadow-black/30">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            Today's Habits
          </h3>
          <div className="space-y-3">
            {habits.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No habits yet. Create one to get started!</p>
            ) : (
              habits.map((habit) => {
                const log = habitLogs[habit.id];
                const isCompleted = log?.status === 'completed';
                return (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className={`w-full flex items-center gap-3 p-4 min-h-[64px] rounded-xl transition-transform duration-300 will-change-transform backdrop-blur-sm hover:scale-105 active:scale-95 ${
                      isCompleted
                        ? 'bg-green-500/20 border-2 border-green-500/30 shadow-lg shadow-green-500/10 hover:shadow-xl hover:shadow-green-500/20'
                        : 'bg-white/5 border-2 border-white/10 hover:border-cyan-400/30 hover:bg-white/10 hover:shadow-lg hover:shadow-cyan-500/10'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${isCompleted ? 'text-green-300 line-through' : 'text-white'}`}>
                        {habit.title}
                      </p>
                      <p className="text-sm text-gray-400">Streak: {habit.current_streak} days</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="backdrop-blur-2xl bg-black/30 rounded-3xl p-6 border border-white/10 shadow-xl shadow-black/30">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-blue-400" />
            Today's Tasks
          </h3>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No active tasks. You're all caught up!</p>
            ) : (
              tasks.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                const priorityColors = {
                  low: 'text-green-400',
                  medium: 'text-yellow-400',
                  high: 'text-red-400',
                };
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 backdrop-blur-sm hover:scale-105 active:scale-95 ${
                      task.status === 'completed'
                        ? 'bg-green-500/20 border-green-500/30 shadow-lg shadow-green-500/10 hover:shadow-xl hover:shadow-green-500/20'
                        : task.status === 'in_progress'
                        ? 'bg-blue-500/20 border-blue-500/30 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20'
                        : isOverdue
                        ? 'bg-red-500/20 border-red-500/30 shadow-lg shadow-red-500/10 hover:shadow-xl hover:shadow-red-500/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className={`font-medium flex-1 ${task.status === 'completed' ? 'text-green-300 line-through' : 'text-white'}`}>
                        {task.title}
                      </p>
                      <span className={`text-xs font-semibold ${priorityColors[task.priority]}`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-400 mb-3">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        {isOverdue ? (
                          <><AlertCircle className="w-4 h-4 text-red-400" /> Overdue</>
                        ) : task.due_date ? (
                          <><Clock className="w-4 h-4" /> {new Date(task.due_date).toLocaleDateString()}</>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        {task.status !== 'in_progress' && task.status !== 'completed' && (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'in_progress')}
                            className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-medium hover:bg-blue-500/30 transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-blue-500/20"
                          >
                            Start
                          </button>
                        )}
                        {task.status !== 'completed' && (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                            className="px-3 py-1 rounded-lg bg-green-500/20 text-green-300 text-xs font-medium hover:bg-green-500/30 transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-green-500/20"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
