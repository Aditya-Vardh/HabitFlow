import { useState, useEffect } from 'react';
import type { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, CheckCircle, TrendingUp, History, Loader2 } from 'lucide-react';
import TodayView from './TodayView';
import HabitsView from './HabitsView';
import TasksView from './TasksView';
import HistoryView from './HistoryView';
import Logo from './Logo';
import Confetti from './Confetti';
import { useRef } from 'react';

type View = 'today' | 'habits' | 'tasks' | 'history';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>('today');
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);

  const [celebrationActive, setCelebrationActive] = useState(false);
  const [celebrationColor, setCelebrationColor] = useState<string | null>(null);
  const [celebrationFull, setCelebrationFull] = useState(false);
  const celebrateTimeout = useRef<number | null>(null);
  // track manual dismiss of full celebration to avoid immediate reopen
  const lastFullDismiss = useRef<number | null>(null);

  useEffect(() => {
    const itemHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const type = detail.type || 'task';
      // Choose color based on type
      const color = type === 'habit' ? '#34d399' : '#22d3ee';

      // Small celebration for single item completion
      setCelebrationColor(color);
      setCelebrationActive(true);

      if (celebrateTimeout.current) {
        window.clearTimeout(celebrateTimeout.current);
      }
      celebrateTimeout.current = window.setTimeout(() => {
        setCelebrationActive(false);
        setCelebrationColor(null);
        celebrateTimeout.current = null;
      }, 2600);
    };

    const progressHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const progress = Number(detail.progress || 0);
      if (progress === 100) {
        // Do not reopen if the user dismissed the full celebration recently
        const dismissedAt = lastFullDismiss.current;
        if (dismissedAt && Date.now() - dismissedAt < 5000) return;

        // Full celebration for 100%
        setCelebrationColor('#fb7185'); // party pink
        setCelebrationFull(true);
        setCelebrationActive(true);

        // Notify others that a full celebration started so they can pulse UI
        try {
          window.dispatchEvent(new CustomEvent('celebrationFull'));
        } catch {
          // ignore
        }

        // Auto-hide after a timeout and remember dismissal time to prevent immediate reopen
        if (celebrateTimeout.current) {
          window.clearTimeout(celebrateTimeout.current);
        }
        celebrateTimeout.current = window.setTimeout(() => {
          setCelebrationActive(false);
          setCelebrationColor(null);
          setCelebrationFull(false);
          lastFullDismiss.current = Date.now();
          celebrateTimeout.current = null;
        }, 4500);

        // larger confetti for full completion
        // render handled below by conditional props
      }
    };

    window.addEventListener('itemCompleted', itemHandler as EventListener);
    window.addEventListener('progressUpdated', progressHandler as EventListener);
    return () => {
      window.removeEventListener('itemCompleted', itemHandler as EventListener);
      window.removeEventListener('progressUpdated', progressHandler as EventListener);
      if (celebrateTimeout.current) {
        window.clearTimeout(celebrateTimeout.current);
      }
    };
  }, []);


  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      // If no user, stop loading
      setLoading(false);
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        // Continue even if profile fails to load
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Continue even if profile fails to load
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const navItems = [
    { id: 'today' as View, label: 'Today', icon: Home },
    { id: 'habits' as View, label: 'Habits', icon: TrendingUp },
    { id: 'tasks' as View, label: 'Tasks', icon: CheckCircle },
    { id: 'history' as View, label: 'History', icon: History },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden ${celebrationActive ? 'celebrate-active' : ''}`}>
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black animate-gradient"></div>
      {/* Celebration overlay (shows briefly on completion) */}
      <div className="celebrate-overlay" />
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large floating cyan orb */}
        <div className="absolute w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent rounded-full blur-3xl animate-float"></div>
        
        {/* Medium floating blue orb */}
        <div className="absolute w-[500px] h-[500px] bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl animate-float-reverse" style={{ top: '60%', right: '10%' }}></div>
        
        {/* Small floating purple orb */}
        <div className="absolute w-[400px] h-[400px] bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-transparent rounded-full blur-3xl animate-float" style={{ bottom: '20%', left: '20%' }}></div>
        
        {/* Pulsing gradient orb */}
        <div className="absolute w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(56,189,248,0.1),transparent_70%)] rounded-full blur-3xl animate-pulse-slow" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
      </div>
      
      {/* Animated gradient mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent via-blue-500/5 to-transparent animate-gradient"></div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30 fixed"></div>
      
      {/* Rotating gradient rings */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-cyan-500/10 rounded-full animate-rotate-slow" style={{ transform: 'translate(-50%, -50%)' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 border border-blue-500/10 rounded-full animate-rotate-slow" style={{ transform: 'translate(50%, 50%)', animationDirection: 'reverse' }}></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 border border-purple-500/10 rounded-full animate-rotate-slow" style={{ transform: 'translate(50%, -50%)', animationDuration: '40s' }}></div>
      </div>

      {/* Confetti (render when celebrating)
            If a full celebration (progress=100) is active, render more pieces */}
      {celebrationActive && (
        <div className={`${celebrationFull ? 'celebrate-full' : ''}`}>
          <Confetti
            count={celebrationFull ? 100 : 36}
            duration={celebrationFull ? 4200 : 2400}
            colors={[celebrationColor || '#22d3ee', '#34d399', '#f97316', '#fb7185']}
          />
        </div>
      )}

      {/* Full-screen celebration overlay (shows when celebrationFull is true) */}
      {celebrationFull && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center full-celebration-overlay"
          onClick={() => {
            // allow dismiss early
            setCelebrationActive(false);
            setCelebrationColor(null);
            setCelebrationFull(false);
            if (celebrateTimeout.current) {
              window.clearTimeout(celebrateTimeout.current);
              celebrateTimeout.current = null;
            }
          }}
        >
          <div className="celebration-content text-center pointer-events-auto p-6 max-w-xl mx-auto">
            <div className="celebration-badge w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl shadow-lg">
              🎉
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-2 animate-scale-in">You did it!</h1>
            <p className="text-white/80 mb-4">You've reached 100% of today's goals — amazing work. Keep it up!</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // dismiss and remember dismissal time to avoid immediate re-show
                  setCelebrationActive(false);
                  setCelebrationColor(null);
                  setCelebrationFull(false);
                  lastFullDismiss.current = Date.now();
                  if (celebrateTimeout.current) {
                    window.clearTimeout(celebrateTimeout.current);
                    celebrateTimeout.current = null;
                  }
                }}
                className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                Nice!
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); /* placeholder for share */ }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-yellow-400 text-white font-semibold hover:scale-105 transition-transform"
              >
                Share
              </button>
            </div>
            {/* Decorative sparkles */}
            <div className="sparkles" aria-hidden />
          </div>
        </div>
      )}
      
      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-30"></div>

      <div className="relative z-10">
        <header className="backdrop-blur-2xl bg-black/40 border-b border-white/10 sticky top-0 z-50 shadow-lg shadow-black/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Logo size="md" />
                <div>
                  <p className="text-sm text-gray-300">Welcome back, <span className="text-white font-semibold">{profile?.full_name || 'User'}</span></p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all duration-200 border border-white/10 backdrop-blur-sm hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-cyan-500/20"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap backdrop-blur-sm ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/30 scale-105'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:scale-105 hover:border-cyan-400/30 active:scale-95'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentView === 'today' && <TodayView />}
          {currentView === 'habits' && <HabitsView />}
          {currentView === 'tasks' && <TasksView />}
          {currentView === 'history' && <HistoryView />}
        </main>
      </div>
    </div>
  );
}
