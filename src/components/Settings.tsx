import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { resetTasks, resetHabitsProgress, resetAllProgress, updateProfile, setHistoryStartedNow, exportUserData, deleteAllUserData } from '../lib/settings';
import { X, Trash2, RefreshCw, DownloadCloud, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export default function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth();
  
  // All useState hooks at the top level
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingHabits, setLoadingHabits] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountMessage, setAccountMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fullNameInput, setFullNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [providerList, setProviderList] = useState<string[] | null>(null);
  const [theme, setTheme] = useState<'dark'|'light'|'system'>('dark');
  const [exporting, setExporting] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  if (!open) return null;

  // Apply theme to document immediately when changed
  const applyTheme = (t: 'dark' | 'light' | 'system') => {
    try {
      const root = document.documentElement;
      if (t === 'dark') {
        root.classList.add('dark');
      } else if (t === 'light') {
        root.classList.remove('dark');
      } else {
        // system
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) root.classList.add('dark'); else root.classList.remove('dark');
      }
    } catch {
      // ignore (server rendering or unavailable document)
    }
  };



  useEffect(() => {
    if (!open) {
      // close expanded preview when the modal is closed externally
      setExpanded(false);
      setShowAdvanced(false);
    }
  }, [open]);

  const ensureUser = () => {
    if (!user) throw new Error('Not authenticated');
    return user.id;
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // If using system theme, listen for changes and re-apply
  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    // modern browsers support addEventListener
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler as any);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler as any);
    };
  }, [theme]);

  // Reusable save handler so preview and full modal both use same logic
  const handleSaveProfile = async () => {
    if (!user) return;
    setAccountLoading(true);
    setAccountMessage(null);
    try {
      const existingPrefs = (profile?.preferences && typeof profile.preferences === 'object') ? profile.preferences as any : {};
      const updated = await updateProfile(user.id, { full_name: fullNameInput || null, username: usernameInput || null, preferences: { ...existingPrefs, theme } });
      setProfile(updated ?? profile);
      setAccountMessage({ type: 'success', text: 'Profile and preferences updated.' });
      window.dispatchEvent(new CustomEvent('dataChanged'));
    } catch (err) {
      setAccountMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error updating profile' });
    } finally {
      setAccountLoading(false);
      setTimeout(() => setAccountMessage(null), 4000);
    }
  };
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      if (!user) return;
      try {
        const result = await supabase
          .from('profiles')
          .select('id, email, full_name, username, history_started_at, preferences')
          .eq('id', user.id)
          .maybeSingle();

        const data = result.data as Database['public']['Tables']['profiles']['Row'] | null;

        if (!result.error) {
          setProfile(data ?? null);
          setFullNameInput(data?.full_name ?? '');
          setUsernameInput(data?.username ?? '');
          const prefs = (data?.preferences && typeof data.preferences === 'object') ? data.preferences as any : undefined;
          setTheme(prefs?.theme || 'dark');
        }
      } catch (e) {
        // ignore
      }

      // Try to get provider info from auth user (best-effort)
      try {
        const { data: userData } = await supabase.auth.getUser();
        // @ts-ignore - identities may not be typed
        const identities = (userData?.user as any)?.identities;
        if (Array.isArray(identities)) {
          setProviderList(identities.map((i: any) => i.provider));
        } else {
          setProviderList(null);
        }
      } catch {
        setProviderList(null);
      }
    };

    load();
  }, [open, user]);
  const doResetTasks = async () => {
    const id = ensureUser();
    if (!confirmText || confirmText !== 'RESET') {
      alert("Type 'RESET' in the box to confirm");
      return;
    }
    if (!confirm('Are you sure you want to delete ALL tasks and task history? This is irreversible.')) return;
    setLoadingTasks(true);
    setMessage(null);
    try {
      const res = await resetTasks(id);
      setMessage({ type: 'success', text: `Deleted ${res.deletedTasksCount} tasks and ${res.deletedHistoryCount} history entries.` });
      // auto-clear message after a short period on success
      setTimeout(() => setMessage(null), 5000);
      setConfirmText('');

      // Notify other parts of the app to refresh their data
      try {
        window.dispatchEvent(new CustomEvent('settings:tasksReset', { detail: res }));
        window.dispatchEvent(new CustomEvent('dataChanged'));
      } catch {
        // ignore
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred' });
    } finally {
      setLoadingTasks(false);
    }
  };

  const doResetHabits = async () => {
    const id = ensureUser();
    if (!confirm('This will remove all habit logs and reset streaks to zero. Continue?')) return;
    setLoadingHabits(true);
    setMessage(null);
    try {
      const res = await resetHabitsProgress(id);
      setMessage({ type: 'success', text: `Removed ${res.deletedLogsCount} habit logs and reset ${res.updatedHabitsCount} habits.` });
      // auto-clear message after a short period on success
      setTimeout(() => setMessage(null), 5000);

      try {
        window.dispatchEvent(new CustomEvent('settings:habitsReset', { detail: res }));
        window.dispatchEvent(new CustomEvent('dataChanged'));
      } catch {
        // ignore
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred' });
    } finally {
      setLoadingHabits(false);
    }
  };

  const doResetAll = async () => {
    const id = ensureUser();
    if (!confirmText || confirmText !== 'RESET') {
      alert("Type 'RESET' in the box to confirm");
      return;
    }
    if (!confirm('This will remove ALL tasks, task history, habit logs and reset streaks. This is irreversible. Continue?')) return;

    setLoadingAll(true);
    setMessage(null);
    try {
      const res = await resetAllProgress(id);
      setMessage({ type: 'success', text: `Deleted ${res.tasksResult.deletedTasksCount} tasks, ${res.tasksResult.deletedHistoryCount} history entries, ${res.habitsResult.deletedLogsCount} habit logs and reset ${res.habitsResult.updatedHabitsCount} habits.` });
      // auto-clear message after a short period on success
      setTimeout(() => setMessage(null), 5000);
      setConfirmText('');

      try {
        window.dispatchEvent(new CustomEvent('settings:tasksReset', { detail: res.tasksResult }));
        window.dispatchEvent(new CustomEvent('settings:habitsReset', { detail: res.habitsResult }));
        window.dispatchEvent(new CustomEvent('settings:resetAll', { detail: res }));
        window.dispatchEvent(new CustomEvent('dataChanged'));
      } catch {
        // ignore
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred' });
    } finally {
      setLoadingAll(false);
    }
  };

  return (
    <div>
      {/* Floating preview (compact) */}
      {!expanded && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-black/60 backdrop-blur border border-white/10 rounded-xl w-72 p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Settings</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setExpanded(true)} className="px-2 py-1 rounded bg-white/5 text-white">Open</button>
                <button onClick={onClose} className="p-1 rounded bg-white/5 text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Theme</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setTheme('dark')} className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-white/5' : 'bg-black/20'}`}><Moon className="w-4 h-4"/></button>
                  <button onClick={() => setTheme('light')} className={`px-2 py-1 rounded ${theme === 'light' ? 'bg-white/5' : 'bg-black/20'}`}><Sun className="w-4 h-4"/></button>
                  <button onClick={() => setTheme('system')} className={`px-2 py-1 rounded ${theme === 'system' ? 'bg-white/5' : 'bg-black/20'}`}>Sys</button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-1 block">Name</label>
                <input value={fullNameInput} onChange={(e) => setFullNameInput(e.target.value)} className="px-2 py-1 rounded bg-black/20 text-white w-full" />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-1 block">Username</label>
                <input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="px-2 py-1 rounded bg-black/20 text-white w-full" />
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleSaveProfile} className="px-3 py-2 rounded bg-cyan-400/20 text-cyan-200">Save</button>
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="px-2 py-1 rounded bg-white/5 text-white">Advanced</button>
              </div>

              {accountMessage && (
                <div className={`${accountMessage.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-200' : 'bg-red-500/20 border-red-500/30 text-red-200'} px-3 py-2 rounded text-sm mt-2`}>{accountMessage.text}</div>
              )}

              {showAdvanced && (
                <div className="mt-2 space-y-2 text-sm text-gray-300">
                  <div>Advanced options are available in the full settings.</div>
                  <button onClick={() => setExpanded(true)} className="px-3 py-2 rounded bg-white/5">Open Full Settings</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full settings modal */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Settings</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white">{showAdvanced ? 'Hide Advanced' : 'Show Advanced'}</button>
                <button onClick={() => setExpanded(false)} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white">Collapse</button>
                <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="space-y-6">
              {showAdvanced && (
                <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Reset Tasks</h3>
                  <p className="text-gray-300 mb-3">Delete all tasks and task history for your account.</p>
                  <div className="flex gap-2 items-center">
                    <input
                      aria-label="Type RESET to confirm"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="px-3 py-2 bg-black/20 border border-white/10 rounded-md text-white w-40"
                      placeholder="Type RESET to confirm"
                    />
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => { setConfirmText('RESET'); }}
                        className="px-3 py-2 rounded-lg bg-white/5 text-white border border-white/10 hover:bg-white/10"
                      >
                        Quick Type
                      </button>
                      <button
                        onClick={doResetTasks}
                        disabled={loadingTasks || loadingAll}
                        className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                      >
                        {loadingTasks ? 'Deleting…' : <span className="inline-flex items-center"><Trash2 className="w-4 h-4 mr-2" />Delete Tasks</span>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showAdvanced && (
                <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Reset Habits Progress</h3>
                  <p className="text-gray-300 mb-3">Remove habit logs and set streaks back to zero.</p>
                  <div className="flex gap-2 items-center">
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (confirm('This will set your history start to today (this changes which logs are considered). Continue?')) {
                            (async () => {
                              try {
                                setAccountLoading(true);
                                await setHistoryStartedNow(ensureUser());
                                setAccountMessage({ type: 'success', text: 'History start set to now.' });
                                window.dispatchEvent(new CustomEvent('dataChanged'));
                              } catch (err) {
                                setAccountMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error updating history start' });
                              } finally {
                                setAccountLoading(false);
                                setTimeout(() => setAccountMessage(null), 4000);
                              }
                            })();
                          }
                        }}
                        className="px-3 py-2 rounded-lg bg-white/5 text-white border border-white/10 hover:bg-white/10"
                      >
                        Set History Start (Now)
                      </button>

                      <button
                        onClick={doResetHabits}
                        disabled={loadingHabits || loadingAll}
                        className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30"
                      >
                        {loadingHabits ? 'Resetting…' : <span className="inline-flex items-center"><RefreshCw className="w-4 h-4 mr-2" />Reset Habits</span>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showAdvanced && (
                <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Reset Everything</h3>
                  <p className="text-gray-300 mb-3">Remove tasks, task history, habit logs, and reset all streaks for your account.</p>
                  <div className="flex gap-2 items-center">
                    <input
                      aria-label="Type RESET to confirm"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="px-3 py-2 bg-black/20 border border-white/10 rounded-md text-white w-40"
                      placeholder="Type RESET to confirm"
                    />
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => { setConfirmText('RESET'); }}
                        className="px-3 py-2 rounded-lg bg-white/5 text-white border border-white/10 hover:bg-white/10"
                      >
                        Quick Type
                      </button>
                      <button
                        onClick={doResetAll}
                        disabled={loadingAll || loadingTasks || loadingHabits}
                        className="px-4 py-2 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:bg-pink-500/30"
                      >
                        {loadingAll ? 'Resetting…' : <span className="inline-flex items-center"><Trash2 className="w-4 h-4 mr-2" />Reset All</span>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Account section */}
              <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Account</h3>
                <p className="text-gray-300 mb-3">View and update your profile settings.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">Email</label>
                    <div className="px-3 py-2 rounded-md bg-black/20 border border-white/10 text-white">{profile?.email || user?.email}</div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">Signed-in providers</label>
                    <div className="px-3 py-2 rounded-md bg-black/20 border border-white/10 text-white">{providerList ? providerList.join(', ') : 'Email/password or unknown'}</div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">Full name</label>
                    <input value={fullNameInput} onChange={(e) => setFullNameInput(e.target.value)} className="px-3 py-2 rounded-md bg-black/20 border border-white/10 text-white" />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">Username</label>
                    <input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="px-3 py-2 rounded-md bg-black/20 border border-white/10 text-white" />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">Theme</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setTheme('dark')} className={`px-3 py-2 rounded-md ${theme === 'dark' ? 'bg-white/5' : 'bg-black/20'}`}><Moon className="w-4 h-4 inline-block mr-2"/> Dark</button>
                      <button onClick={() => setTheme('light')} className={`px-3 py-2 rounded-md ${theme === 'light' ? 'bg-white/5' : 'bg-black/20'}`}><Sun className="w-4 h-4 inline-block mr-2"/> Light</button>
                      <button onClick={() => setTheme('system')} className={`px-3 py-2 rounded-md ${theme === 'system' ? 'bg-white/5' : 'bg-black/20'}`}>System</button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={accountLoading}
                    className="px-4 py-2 rounded-lg bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 hover:bg-cyan-400/30"
                  >
                    {accountLoading ? 'Saving…' : 'Save Profile & Preferences'}
                  </button>

                  <button
                    onClick={async () => {
                      if (!profile?.history_started_at) {
                        if (!confirm('History has not been set. Set it to now?')) return;
                      }
                      try {
                        setAccountLoading(true);
                        await setHistoryStartedNow(ensureUser());
                        setAccountMessage({ type: 'success', text: 'History start set to now.' });
                        // refresh profile
                        const result = await supabase.from('profiles').select('history_started_at').eq('id', ensureUser()).maybeSingle();
                        const data = result.data as { history_started_at?: string | null } | null;
                        setProfile((p) => ({ ...(p ?? {}), history_started_at: data?.history_started_at ?? p?.history_started_at } as Database['public']['Tables']['profiles']['Row']));
                        window.dispatchEvent(new CustomEvent('dataChanged'));
                      } catch (err) {
                        setAccountMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error updating history start' });
                      } finally {
                        setAccountLoading(false);
                        setTimeout(() => setAccountMessage(null), 4000);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-white/5 text-white border border-white/10 hover:bg-white/10"
                  >
                    Set History Start to Now
                  </button>

                  <div className="ml-auto text-sm text-gray-300">
                    Last history start: <span className="text-white">{profile?.history_started_at ? new Date(profile.history_started_at).toLocaleString() : 'Not set'}</span>
                  </div>
                </div>

                {accountMessage && (
                  <div className={`${accountMessage.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-200' : 'bg-red-500/20 border-red-500/30 text-red-200'} px-4 py-3 rounded-xl text-sm mt-4`}>
                    {accountMessage.text}
                  </div>
                )}
              </div>

              {/* Export & delete account */}
              <div className="bg-black/30 border border-white/10 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Export</h3>
                <p className="text-gray-300 mb-3">Download a JSON archive of your data.</p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (!user) return;
                      setExporting(true);
                      try {
                        const data = await exportUserData(user.id);
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `habitflow_export_${user.id}_${new Date().toISOString().slice(0,10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        setMessage({ type: 'success', text: 'Export ready — your download should start.' });
                        setTimeout(() => setMessage(null), 4000);
                      } catch (err) {
                        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error exporting data' });
                      } finally {
                        setExporting(false);
                      }
                    }}
                    disabled={exporting}
                    className="px-4 py-2 rounded-lg bg-white/5 text-white border border-white/10 hover:bg-white/10"
                  >
                    {exporting ? 'Preparing…' : <span className="inline-flex items-center"><DownloadCloud className="w-4 h-4 mr-2"/>Export Data</span>}
                  </button>

                  {showAdvanced && (
                    <div className="ml-auto flex items-center gap-2">
                      <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Type DELETE to confirm" className="px-3 py-2 bg-black/20 border border-white/10 rounded-md text-white w-44" />

                      <button
                        onClick={async () => {
                          if (!user) return;
                          if (deleteConfirm !== 'DELETE') { alert("Type 'DELETE' in the box to confirm"); return; }
                          if (!confirm('This will permanently remove ALL your data AND profile. This cannot be undone. Continue?')) return;
                          setDeletingAccount(true);
                          try {
                            const res = await deleteAllUserData(user.id);
                            setMessage({ type: 'success', text: `Deleted profile and data: ${JSON.stringify(res)}` });
                            window.dispatchEvent(new CustomEvent('settings:resetAll', { detail: res }));
                            window.dispatchEvent(new CustomEvent('dataChanged'));
                            // sign out the user after deletion
                            try {
                              await signOut();
                            } catch (e) {
                              // ignore sign out errors
                            }
                          } catch (err) {
                            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error deleting account data' });
                          } finally {
                            setDeletingAccount(false);
                            setDeleteConfirm('');
                          }
                        }}
                        disabled={deletingAccount}
                        className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                      >
                        {deletingAccount ? 'Deleting…' : <span className="inline-flex items-center"><Trash2 className="w-4 h-4 mr-2"/>Delete Account Data</span>}
                      </button>
                    </div>
                  )}
                </div>

                {message && (
                  <div className={`${message.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-200' : 'bg-red-500/20 border-red-500/30 text-red-200'} px-4 py-3 rounded-xl text-sm mt-4`}>
                    {message.text}
                  </div>
                )}
              </div>

              <div className="text-right">
                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
