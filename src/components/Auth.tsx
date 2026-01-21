import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import Logo from './Logo';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!fullName.trim()) {
          setError('Please enter your full name');
          setIsLoading(false);
          return;
        }
        await signUp(email, password, fullName);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      // Check if it's a network error (Failed to fetch)
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
        setError('Unable to connect to Supabase. Please set your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables in .env.local');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black p-4 relative overflow-hidden">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black animate-gradient"></div>
      
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
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
      
      {/* Rotating gradient rings */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-cyan-500/10 rounded-full animate-rotate-slow" style={{ transform: 'translate(-50%, -50%)' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 border border-blue-500/10 rounded-full animate-rotate-slow" style={{ transform: 'translate(50%, 50%)', animationDirection: 'reverse' }}></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 border border-purple-500/10 rounded-full animate-rotate-slow" style={{ transform: 'translate(50%, -50%)', animationDuration: '40s' }}></div>
      </div>
      
      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-30"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-2xl bg-black/40 rounded-3xl shadow-2xl border border-white/10 p-8 space-y-6">
          <div className="text-center space-y-2">
            {/* Site logo so users know what they're signing in to */}
            <div className="mx-auto mb-2">
              <Logo size="lg" />
            </div>

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 mb-2 shadow-lg">
              {isLogin ? (
                <LogIn className="w-8 h-8 text-white" />
              ) : (
                <UserPlus className="w-8 h-8 text-white" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-white">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-300">
              {isLogin
                ? 'Sign in to track your habits and tasks'
                : 'Start your productivity journey today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-200 mb-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                  placeholder="John Doe"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold py-3 rounded-xl hover:from-cyan-500 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <div className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-white/5" />
              <div className="text-sm text-gray-400">or</div>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <button
              onClick={() => {
                setError('');
                setIsLoading(true);
                // Open popup synchronously to avoid popup blockers
                const popup = window.open('', 'google_oauth', 'width=600,height=700');

                (async () => {
                  try {
                    const redirectUrl = await signInWithGoogle();
                    if (redirectUrl) {
                      // navigate popup to provider URL so account chooser appears
                      popup?.location.assign(redirectUrl);
                    } else {
                      // If no URL returned, close popup and show error
                      popup?.close();
                      setError('Could not initiate Google sign-in. Please try again.');
                    }
                  } catch (err) {
                    popup?.close();
                    setError(err instanceof Error ? err.message : 'An error occurred during Google sign-in');
                  } finally {
                    setIsLoading(false);
                  }
                })();
              }}
              className="w-full mb-3 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white transition-all"
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" className="w-5 h-5">
                <path fill="#4285F4" d="M533.5 278.4c0-18.5-1.5-36.3-4.4-53.6H272v101.4h146.9c-6.4 34.8-25.8 64.3-55.1 84v69.7h88.9c52-47.9 81.8-118.7 81.8-201.5z"/>
                <path fill="#34A853" d="M272 544.3c73.7 0 135.7-24.4 181-66.5l-88.9-69.7c-24.7 16.6-56.3 26.3-92.2 26.3-70.9 0-131.1-47.8-152.6-111.9H28.2v70.6C73.7 481 166.6 544.3 272 544.3z"/>
                <path fill="#FBBC05" d="M119.4 325.9c-10.9-32.6-10.9-67.3 0-99.9V155.4H28.2c-39.8 79.2-39.8 173.8 0 253L119.4 325.9z"/>
                <path fill="#EA4335" d="M272 107.7c39.8-.6 78.9 14.2 108.6 40.6l81.5-81.5C402.5 24.3 336.2-.6 272 0 166.6 0 73.7 63.3 28.2 155.4l91.2 70.6C140.9 189.8 201.1 107.7 272 107.7z"/>
              </svg>
              Continue with Google
            </button>

            <div className="text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-cyan-300 hover:text-cyan-200 transition-colors text-sm font-medium"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
