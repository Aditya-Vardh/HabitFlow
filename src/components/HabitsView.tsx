import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, TrendingUp, X, Flame } from 'lucide-react';
import { Database } from '../lib/database.types';

type Habit = Database['public']['Tables']['habits']['Row'];
type HabitInsert = Database['public']['Tables']['habits']['Insert'];
type HabitUpdate = Database['public']['Tables']['habits']['Update'];

const habitColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function HabitsView() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'daily',
    icon: 'target',
    color: '#3b82f6',
  });

  useEffect(() => {
    if (user) {
      loadHabits();
    }
  }, [user]);

  const createSampleHabits = async () => {
    const sampleHabits = [
      {
        title: 'Morning Exercise',
        description: 'Start your day with 30 minutes of physical activity',
        frequency: 'daily',
        icon: '💪',
        color: '#3b82f6',
      },
      {
        title: 'Read for 30 minutes',
        description: 'Expand your knowledge by reading daily',
        frequency: 'daily',
        icon: '📚',
        color: '#10b981',
      },
      {
        title: 'Drink 8 glasses of water',
        description: 'Stay hydrated throughout the day',
        frequency: 'daily',
        icon: '💧',
        color: '#06b6d4',
      },
      {
        title: 'Meditation',
        description: 'Take 10 minutes for mindfulness and relaxation',
        frequency: 'daily',
        icon: '🧘',
        color: '#8b5cf6',
      },
      {
        title: 'Journal Writing',
        description: 'Reflect on your day and write down thoughts',
        frequency: 'daily',
        icon: '✍️',
        color: '#f59e0b',
      },
    ];

    try {
      const habitsToInsert = sampleHabits.map(habit => ({
        ...habit,
        user_id: user!.id,
      }));

      const { error } = await supabase
        .from('habits')
        .insert(habitsToInsert);
      if (error) throw error;
      await loadHabits();
    } catch (error) {
      console.error('Error creating sample habits:', error);
    }
  };

  const loadHabits = async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // If no habits exist, create sample habits
      if ((data || []).length === 0) {
        await createSampleHabits();
        return;
      }
      
      setHabits(data || []);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (habit?: Habit) => {
    if (habit) {
      setEditingHabit(habit);
      setFormData({
        title: habit.title,
        description: habit.description,
        frequency: habit.frequency,
        icon: habit.icon,
        color: habit.color,
      });
    } else {
      setEditingHabit(null);
      setFormData({
        title: '',
        description: '',
        frequency: 'daily',
        icon: 'target',
        color: '#3b82f6',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingHabit(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingHabit) {
        const updateData: HabitUpdate = {
          title: formData.title,
          description: formData.description,
          frequency: formData.frequency,
          icon: formData.icon,
          color: formData.color,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('habits') as any)
          .update(updateData)
          .eq('id', editingHabit.id);

        if (error) throw error;
      } else {
        const insertData: HabitInsert = {
          ...formData,
          user_id: user!.id,
        };
        const { error } = await supabase.from('habits').insert(insertData);

        if (error) throw error;
      }

      await loadHabits();
      closeModal();
    } catch (error) {
      console.error('Error saving habit:', error);
    }
  };

  const deleteHabit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this habit?')) return;

    try {
      const { error } = await supabase.from('habits').delete().eq('id', id);

      if (error) throw error;
      await loadHabits();
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const toggleActive = async (habit: Habit) => {
    try {
      const updateData: HabitUpdate = { is_active: !habit.is_active };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('habits') as any)
        .update(updateData)
        .eq('id', habit.id);

      if (error) throw error;
      await loadHabits();
    } catch (error) {
      console.error('Error toggling habit:', error);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">My Habits</h2>
          <p className="text-gray-300">Build consistency and track your progress</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-cyan-500/40"
        >
          <Plus className="w-5 h-5" />
          New Habit
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.map((habit) => (
          <div
            key={habit.id}
            className={`backdrop-blur-2xl rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer group ${
              habit.is_active
                ? 'bg-black/30 border-white/10 hover:border-cyan-400/50 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/20 active:scale-95'
                : 'bg-black/20 border-white/10 opacity-60 hover:opacity-80'
            }`}
            style={{ borderColor: habit.is_active ? `${habit.color}30` : undefined }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg"
                style={{ backgroundColor: habit.color }}
              >
                {habit.icon.length > 1 && /[\u{1F300}-\u{1F9FF}]/u.test(habit.icon) ? habit.icon : habit.icon.charAt(0).toUpperCase()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); openModal(habit); }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all duration-200 backdrop-blur-sm border border-white/10 hover:scale-110 active:scale-95 hover:border-cyan-400/30"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:scale-110 active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{habit.title}</h3>
            {habit.description && (
              <p className="text-gray-400 text-sm mb-4">{habit.description}</p>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-white font-semibold">{habit.current_streak} days</span>
              </div>
              <div className="text-sm text-gray-400">
                Best: {habit.best_streak} days
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span className="text-sm text-gray-400 capitalize">{habit.frequency}</span>
              <button
                onClick={(e) => { e.stopPropagation(); toggleActive(habit); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                  habit.is_active
                    ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30 hover:shadow-lg hover:shadow-green-500/20'
                    : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                }`}
              >
                {habit.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        ))}

        {habits.length === 0 && (
          <div className="col-span-full backdrop-blur-xl bg-white/10 rounded-2xl p-12 border border-white/20 text-center">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No habits yet</h3>
            <p className="text-gray-400 mb-6">Start building better habits today!</p>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all duration-200 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create Your First Habit
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                {editingHabit ? 'Edit Habit' : 'New Habit'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
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
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="e.g., Morning Exercise"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {habitColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        formData.color === color ? 'ring-2 ring-white scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all duration-200 shadow-lg"
                >
                  {editingHabit ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
