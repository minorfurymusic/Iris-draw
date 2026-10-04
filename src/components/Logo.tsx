import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showSubtitle = true }) => {
  const iconSizes = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const titleSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl sm:text-4xl'
  };

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Magical Emblem with Iris Flower & Golden Pencil */}
      <div className={`relative ${iconSizes[size]} flex-shrink-0 group`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-amber-400 rounded-2xl blur-xs opacity-75 group-hover:opacity-100 transition duration-300"></div>
        <div className="relative w-full h-full bg-gradient-to-b from-purple-700 via-purple-800 to-indigo-900 rounded-2xl p-1.5 shadow-md border border-purple-400/40 flex items-center justify-center overflow-hidden">
          {/* Subtle floral background ray */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(192,132,252,0.4),transparent_70%)]"></div>

          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
            {/* Purple Iris Petals */}
            <path
              d="M 50 50 C 35 40 25 25 35 15 C 45 10 50 30 50 50 Z"
              fill="#c084fc"
              opacity="0.9"
            />
            <path
              d="M 50 50 C 65 40 75 25 65 15 C 55 10 50 30 50 50 Z"
              fill="#a855f7"
              opacity="0.9"
            />
            <path
              d="M 50 50 C 42 30 44 12 50 8 C 56 12 58 30 50 50 Z"
              fill="#e9d5ff"
            />
            {/* Drooping Petals */}
            <path
              d="M 50 50 C 30 55 20 75 32 85 C 45 88 48 65 50 50 Z"
              fill="#7e22ce"
            />
            <path
              d="M 50 50 C 70 55 80 75 68 85 C 55 88 52 65 50 50 Z"
              fill="#6b21a8"
            />
            <path
              d="M 50 50 C 40 65 38 85 50 92 C 62 85 60 65 50 50 Z"
              fill="#9333ea"
            />
            {/* Golden Pencil crossing through */}
            <g transform="rotate(35 50 50)">
              {/* Pencil Body */}
              <rect x="46" y="20" width="8" height="50" rx="1.5" fill="#f59e0b" stroke="#78350f" strokeWidth={1}/>
              <line x1="50" y1="20" x2="50" y2="70" stroke="#fbbf24" strokeWidth={1.5}/>
              {/* Wood Tip */}
              <polygon points="46,70 54,70 50,82" fill="#fde68a" stroke="#78350f" strokeWidth={0.8}/>
              {/* Graphite Tip */}
              <polygon points="48,76 52,76 50,82" fill="#1e293b"/>
              {/* Purple Eraser */}
              <rect x="46" y="14" width="8" height="6" rx="1.5" fill="#e879f9"/>
              <rect x="45.5" y="18" width="9" height="2.5" fill="#cbd5e1"/>
            </g>

            {/* Magic sparkles */}
            <polygon points="80,25 82,29 86,30 82,31 80,35 78,31 74,30 78,29" fill="#fef08a"/>
            <polygon points="20,65 21,68 24,69 21,70 20,73 19,70 16,69 19,68" fill="#ffffff"/>
            <circle cx="50" cy="50" r="3" fill="#fbbf24"/>
          </svg>
        </div>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-['Fredoka',sans-serif] font-bold tracking-wide ${titleSizes[size]} bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-900 bg-clip-text text-transparent`}>
            Ateliê da Iris
          </span>
          <span className="text-amber-400 text-sm animate-pulse">✨</span>
        </div>
        {showSubtitle && (
          <span className="text-xs font-semibold text-purple-600/80 -mt-1 tracking-wider uppercase">
            Escola de Desenho Realista
          </span>
        )}
      </div>
    </div>
  );
};
