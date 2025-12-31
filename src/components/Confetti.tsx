import { useEffect } from 'react';

type ConfettiProps = {
  count?: number;
  duration?: number; // ms
  colors?: string[];
  onComplete?: () => void;
};

export default function Confetti({ count = 24, duration = 2500, colors = ['#22d3ee', '#06b6d4', '#34d399', '#f59e0b', '#fb7185'], onComplete }: ConfettiProps) {
  useEffect(() => {
    const t = setTimeout(() => {
      onComplete?.();
    }, duration + 100);
    return () => clearTimeout(t);
  }, [duration, onComplete]);

  const pieces = Array.from({ length: count }).map((_, i) => {
    const left = Math.round(Math.random() * 100);
    const delay = Math.round(Math.random() * 300);
    const rotate = Math.round(Math.random() * 360);
    const size = Math.round(8 + Math.random() * 12);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const style: React.CSSProperties = {
      left: `${left}%`,
      backgroundColor: color,
      width: `${size}px`,
      height: `${size * 0.6}px`,
      transform: `rotate(${rotate}deg)`,
      animationDelay: `${delay}ms`,
    };
    return <div key={i} className="confetti-piece" style={style} />;
  });

  return (
    <div className="confetti-root pointer-events-none">
      {pieces}
    </div>
  );
}
