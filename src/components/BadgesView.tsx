import React from 'react';
import { AchievementBadge } from '../types';
import { Award, Star, Sparkles, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface BadgesViewProps {
  badges: AchievementBadge[];
  starsCount: number;
}

export const BadgesView: React.FC<BadgesViewProps> = ({ badges, starsCount }) => {
  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col gap-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-amber-200 font-bold text-xs uppercase tracking-wider mb-2">
            <Award className="w-4 h-4" />
            <span>Medalhas & Troféus da Iris</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-['Fredoka',sans-serif] font-bold">
            Galeria de Conquistas da Artista 🏆
          </h1>
          <p className="text-purple-100 text-sm sm:text-base mt-1 max-w-xl">
            A cada traço e cada desenho concluído, a Iris sobe de nível na sua jornada de desenhista realista!
          </p>
        </div>

        {/* Stars Counter Display */}
        <div className="bg-white/15 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center gap-4 text-center">
          <div>
            <span className="block text-4xl font-['Fredoka',sans-serif] font-black text-amber-300">
              {starsCount}
            </span>
            <span className="text-xs font-bold text-amber-100 uppercase tracking-wider">
              Estrelas de Ouro
            </span>
          </div>
          <div className="text-4xl animate-bounce">⭐</div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-3xl border border-purple-100 p-6 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm font-bold text-purple-950">
          <span>Medalhas Desbloqueadas: {unlockedCount} de {badges.length}</span>
          <span className="text-purple-600">{Math.round((unlockedCount / badges.length) * 100)}%</span>
        </div>
        <div className="w-full h-3 bg-purple-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-purple-600 rounded-full transition-all duration-500"
            style={{ width: `${(unlockedCount / badges.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {badges.map((badge) => {
          return (
            <div
              key={badge.id}
              onClick={() => {
                if (badge.unlocked) soundManager.playSparkle();
              }}
              className={`p-6 rounded-3xl border transition-all duration-300 flex items-start gap-4 ${
                badge.unlocked
                  ? 'bg-white border-purple-200 shadow-md hover:shadow-xl hover:-translate-y-1'
                  : 'bg-slate-50/60 border-slate-200 opacity-60'
              }`}
            >
              <div 
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm ${
                  badge.unlocked
                    ? 'bg-gradient-to-tr from-amber-200 via-purple-100 to-fuchsia-100 border border-purple-200'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {badge.icon}
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-['Fredoka',sans-serif] font-bold text-lg text-purple-950">
                    {badge.title}
                  </h3>
                  {badge.unlocked && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {badge.description}
                </p>
                {badge.unlocked && badge.unlockedAt && (
                  <span className="text-[10px] text-purple-600 font-bold mt-1">
                    ✨ Conquistado: {badge.unlockedAt}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
