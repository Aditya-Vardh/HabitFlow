import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, CheckCircle, XCircle, Filter, TrendingUp, Award, Trash2 } from 'lucide-react';
import { Database } from '../lib/database.types';

type HabitLog = Database['public']['Tables']['habit_logs']['Row'] & {
  habits?: { title: string; color: string };
};
type TaskHistory = Database['public']['Tables']['task_history']['Row'];

export default function HistoryView() {
  const { user } = useAuth();
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'habits' | 'tasks'>('habits');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [profileCreatedAt, setProfileCreatedAt] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfileAndHistory();
    }
  }, [user]);

  // Fetch profile to determine account age and then load history accordingly
  const loadProfileAndHistory = async () => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', user!.id)
        .maybeSingle() as { data: { created_at: string } | null; error: unknown };

      if (profileError) throw profileError;

      const createdAt = (profile as { created_at: string } | null)?.created_at ?? null;
      setProfileCreatedAt(createdAt);

      // Determine if user is new (created within last 24 hours)
      if (createdAt) {
        const createdDate = new Date(createdAt);
        const days = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        setIsNewUser(days <= 1);

        // If user was created today, prune any older task_history entries older than account creation date
        if (days <= 1) {
          try {
            // delete older task_history rows so brand-new users don't see old data
            const { error: delErr } = await supabase
              .from('task_history')
              .delete()
              .lt('completed_at', createdAt)
              .eq('user_id', user!.id);
            if (delErr) console.error('Error pruning old task_history:', delErr);
          } catch (e) {
            console.error('Error pruning old task_history:', e);
          }

          // also prune habit_logs older than creation date
          try {
            const { error: delHabitErr } = await supabase
              .from('habit_logs')
              .delete()
              .lt('date', createdAt)
              .eq('user_id', user!.id);
            if (delHabitErr) console.error('Error pruning old habit_logs:', delHabitErr);
          } catch (e) {
            console.error('Error pruning old habit_logs:', e);
          }
        }
      }

      // finally load history normally (will respect prunes above)
      await loadHistory();
    } catch (error) {
      console.error('Error loading profile/history:', error);
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      // If user is new, only load history since account creation (profileCreatedAt)
      const habitQuery = supabase
        .from('habit_logs')
        .select('*, habits(title, color)')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(100);

      const taskQuery = supabase
        .from('task_history')
        .select('*')
        .eq('user_id', user!.id)
        .order('completed_at', { ascending: false })
        .limit(100);

      if (isNewUser && profileCreatedAt) {
        habitQuery.gte('date', profileCreatedAt);
        taskQuery.gte('completed_at', profileCreatedAt);
      }

      const [logsRes, historyRes] = await Promise.all([habitQuery, taskQuery]);

      if (logsRes.error) throw logsRes.error;
      if (historyRes.error) throw historyRes.error;

      setHabitLogs(logsRes.data || []);
      setTaskHistory(historyRes.data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLogs = () => {
    let filtered = habitLogs;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter((log) => new Date(log.date) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter((log) => new Date(log.date) >= monthAgo);
    }

    return filtered;
  };

  const getFilteredTasks = () => {
    let filtered = taskHistory;

    if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter((task) => new Date(task.completed_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter((task) => new Date(task.completed_at) >= monthAgo);
    }

    return filtered;
  };

  const calculateStats = () => {
    const completed = habitLogs.filter((log) => log.status === 'completed').length;
    const missed = habitLogs.filter((log) => log.status === 'missed').length;
    const total = habitLogs.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, missed, total, completionRate };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">History & Progress</h2>
        <p className="text-gray-300">Review your past achievements and patterns</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <span className="text-2xl font-bold text-white">{stats.completed}</span>
          </div>
          <p className="text-green-300 font-medium">Completed</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-2xl p-6 border border-red-500/30">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-8 h-8 text-red-400" />
            <span className="text-2xl font-bold text-white">{stats.missed}</span>
          </div>
          <p className="text-red-300 font-medium">Missed</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-6 border border-blue-500/30">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">{stats.completionRate}%</span>
          </div>
          <p className="text-blue-300 font-medium">Success Rate</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">{taskHistory.length}</span>
          </div>
          <p className="text-purple-300 font-medium">Tasks Done</p>
        </div>
      </div>

      {isNewUser && (
        <div className="mt-4 p-4 rounded-xl bg-yellow-900/20 border border-yellow-500/20 text-yellow-300">
          You are a new user — older history entries (before account creation) were pruned to keep your history focused.
        </div>
      )}

      <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setView('habits')}
              className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${
                view === 'habits'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
              }`}
            >
              Habit Logs
            </button>
            <button
              onClick={() => setView('tasks')}
              className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${
                view === 'tasks'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
              }`}
            >
              Completed Tasks
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDateFilter(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <option value="all">All Time</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last Month</option>
            </select>

            {view === 'habits' && (
              <select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
                <option value="skipped">Skipped</option>
              </select>
            )}

            <button
              onClick={async () => {
                if (!confirm('Clear all history? This will permanently delete your habit logs and completed tasks.')) return;
                setActionLoading(true);
                try {
                  const { error: thErr } = await supabase.from('task_history').delete().eq('user_id', user!.id);
                  const { error: hlErr } = await supabase.from('habit_logs').delete().eq('user_id', user!.id);
                  if (thErr || hlErr) {
                    console.error('Error clearing history:', thErr || hlErr);
                    alert('Failed to clear history. See console for details.');
                  } else {
                    // reload empty state
                    setTaskHistory([]);
                    setHabitLogs([]);
                  }
                } catch (e) {
                  console.error('Error clearing history:', e);
                } finally {
                  setActionLoading(false);
                }
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${actionLoading ? 'opacity-60 cursor-wait' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'}`}
              disabled={actionLoading}
            >
              Clear History
            </button>
          </div>
        </div>

        {view === 'habits' ? (
          <div className="space-y-3">
            {getFilteredLogs().length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No habit logs found</p>
              </div>
            ) : (
              getFilteredLogs().map((log) => {
                const statusColors = {
                  completed: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-300', icon: CheckCircle },
                  missed: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-300', icon: XCircle },
                  skipped: { bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-300', icon: XCircle },
                };
                const colors = statusColors[log.status];
                const StatusIcon = colors.icon;

                return (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-center gap-4">
                      <StatusIcon className={`w-6 h-6 ${colors.text}`} />
                      <div>
                        <p className="font-medium text-white">{log.habits?.title || 'Unknown Habit'}</p>
                        <p className="text-sm text-gray-400">
                          {new Date(log.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {log.completed_at && (
                        <span className="text-sm text-gray-400">
                          {new Date(log.completed_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-3 py-1 rounded-lg ${colors.bg} ${colors.text} uppercase`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {getFilteredTasks().length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No completed tasks found</p>
              </div>
            ) : (
              getFilteredTasks().map((task) => {
                const priorityColors = {
                  low: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
                  medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
                  high: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
                };
                const colors = priorityColors[task.priority];

                return (
                  <div
                    key={task.id}
                    className="flex items-start justify-between p-4 rounded-xl border-2 bg-white/5 border-white/10 hover:border-cyan-400/50 transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <h4 className="font-medium text-white">{task.title}</h4>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-400 mb-2 ml-7">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-gray-400 ml-7">
                        <span>
                          Completed: {new Date(task.completed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {task.due_date && (
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 whitespace-nowrap ml-4">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-lg ${colors.bg} ${colors.text}`}>
                        {task.priority.toUpperCase()}
                      </span>
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this history entry?')) return;
                          try {
                            const { error } = await supabase.from('task_history').delete().eq('id', task.id).eq('user_id', user!.id);
                            if (error) throw error;
                            setTaskHistory((prev) => prev.filter((t) => t.id !== task.id));
                          } catch (e) {
                            console.error('Error deleting history item:', e);
                            alert('Failed to delete history entry. See console for details.');
                          }
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400 transition-colors"
                        title="Delete history entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
