import { TrendingUp } from 'lucide-react';

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center gap-2 group cursor-pointer">
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl rotate-12 group-hover:rotate-6 transition-transform duration-300 shadow-lg shadow-cyan-500/30"></div>
        <div className="absolute inset-0.5 bg-black/20 rounded-lg flex items-center justify-center">
          <TrendingUp className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-7 h-7'} text-cyan-400 group-hover:text-cyan-300 transition-colors`} />
        </div>
      </div>
      <span className={`font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-blue-400 transition-all ${
        size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-2xl'
      }`}>
        HabitFlow
      </span>
    </div>
  );
}

