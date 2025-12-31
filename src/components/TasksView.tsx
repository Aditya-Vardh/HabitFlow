import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertCircle, X, ListTodo } from 'lucide-react';
import { Database } from '../lib/database.types';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
type TaskHistoryInsert = Database['public']['Tables']['task_history']['Insert'];

export default function TasksView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
    due_date: '',
  });

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const createSampleTasks = async () => {
    const sampleTasks = [
      {
        title: 'Review project documentation',
        description: 'Go through the project requirements and update documentation',
        priority: 'high' as const,
        status: 'pending' as const,
        due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
      {
        title: 'Team meeting preparation',
        description: 'Prepare agenda and notes for the weekly team meeting',
        priority: 'medium' as const,
        status: 'pending' as const,
        due_date: null,
      },
      {
        title: 'Code review',
        description: 'Review pull requests and provide feedback',
        priority: 'high' as const,
        status: 'in_progress' as const,
        due_date: new Date().toISOString().split('T')[0],
      },
      {
        title: 'Update dependencies',
        description: 'Check and update npm packages to latest versions',
        priority: 'low' as const,
        status: 'pending' as const,
        due_date: null,
      },
      {
        title: 'Write unit tests',
        description: 'Add test coverage for new features',
        priority: 'medium' as const,
        status: 'pending' as const,
        due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      },
    ];

    try {
      const tasksToInsert: TaskInsert[] = sampleTasks.map(task => ({
        ...task,
        user_id: user!.id,
      }));

      const { error } = await supabase
        .from('tasks')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(tasksToInsert as any);

      if (error) throw error;
      await loadTasks();
    } catch (error) {
      console.error('Error creating sample tasks:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // If no tasks exist, create sample tasks
      if ((data || []).length === 0) {
        await createSampleTasks();
        return;
      }
      
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        due_date: task.due_date || '',
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        due_date: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const taskData = {
        ...formData,
        due_date: formData.due_date || null,
      };

      if (editingTask) {
        const updateData: TaskUpdate = {
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          status: taskData.status,
          due_date: taskData.due_date,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('tasks') as any)
          .update(updateData)
          .eq('id', editingTask.id);

        if (error) throw error;
      } else {
        const insertData: TaskInsert = {
          ...taskData,
          user_id: user!.id,
        };
        const { error } = await supabase
          .from('tasks')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(insertData as any);

        if (error) throw error;
      }

      await loadTasks();
      closeModal();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) throw error;
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
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
          await supabase
            .from('task_history')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert(historyData as any);
        }
      } else {
        updateData.completed_at = null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tasks') as any)
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();

      // Emit celebration event when a task gets completed
      if (newStatus === 'completed') {
        try {
          window.dispatchEvent(new CustomEvent('itemCompleted', { detail: { type: 'task', id: taskId, source: 'tasks' } }));
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const priorityColors = {
    low: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
    medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
    high: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
  };

  const statusColors = {
    pending: { bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400' },
    in_progress: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
    completed: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">My Tasks</h2>
          <p className="text-gray-300">Organize and complete your tasks efficiently</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all duration-200 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          New Task
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-6 py-2 rounded-xl font-medium whitespace-nowrap transition-all duration-200 backdrop-blur-sm ${
              filter === status
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/30 scale-105'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:scale-105 hover:border-cyan-400/30 active:scale-95'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            <span className="ml-2 text-sm">
              ({status === 'all' ? tasks.length : tasks.filter(t => t.status === status).length})
            </span>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map((task) => {
          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
          const colors = priorityColors[task.priority];
          const statusColor = statusColors[task.status];

          return (
            <div
              key={task.id}
              className={`backdrop-blur-2xl rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer group hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20 active:scale-95 ${
                isOverdue ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' : `bg-black/30 ${statusColor.border} border-white/10 hover:border-cyan-400/30`
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className={`font-bold text-lg mb-1 ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-white'}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${colors.bg} ${colors.text}`}>
                      {task.priority.toUpperCase()}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${statusColor.bg} ${statusColor.text}`}>
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openModal(task); }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all duration-200 backdrop-blur-sm border border-white/10 hover:scale-110 active:scale-95 hover:border-cyan-400/30"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:scale-110 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {task.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{task.description}</p>
              )}

              {task.due_date && (
                <div className={`flex items-center gap-2 text-sm mb-4 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                  {isOverdue ? (
                    <><AlertCircle className="w-4 h-4" /> Overdue</>
                  ) : (
                    <><Clock className="w-4 h-4" /> Due {new Date(task.due_date).toLocaleDateString()}</>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-white/10">
                {task.status === 'pending' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'in_progress'); }}
                    className="flex-1 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 text-sm font-medium hover:bg-blue-500/30 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-blue-500/20"
                  >
                    Start
                  </button>
                )}
                {task.status !== 'completed' ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'completed'); }}
                    className="flex-1 px-3 py-2 rounded-lg bg-green-500/20 text-green-300 text-sm font-medium hover:bg-green-500/30 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-green-500/20 flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'pending'); }}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-500/20 text-gray-300 text-sm font-medium hover:bg-gray-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="col-span-full backdrop-blur-2xl bg-black/30 rounded-2xl p-12 border border-white/10 shadow-xl shadow-black/30 text-center">
            <ListTodo className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No tasks found</h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all' ? 'Create your first task to get started!' : `No ${filter} tasks yet.`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => openModal()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-cyan-500/30 backdrop-blur-sm"
              >
                <Plus className="w-5 h-5" />
                Create Your First Task
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-2xl bg-black/40 rounded-3xl p-8 border border-white/10 max-w-md w-full shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                {editingTask ? 'Edit Task' : 'New Task'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors backdrop-blur-sm border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 backdrop-blur-sm"
                  placeholder="e.g., Complete project proposal"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 resize-none backdrop-blur-sm"
                  placeholder="Add details about the task"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 backdrop-blur-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value as 'pending' | 'in_progress' | 'completed' })}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 backdrop-blur-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 backdrop-blur-sm"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-colors backdrop-blur-sm border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-cyan-500/30 backdrop-blur-sm"
                >
                  {editingTask ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
