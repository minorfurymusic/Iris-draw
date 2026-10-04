import React, { useState } from 'react';
import { Lesson, ColorMode } from '../types';
import { CATEGORIES } from '../data/lessons';
import { 
  Play, 
  Clock, 
  Sparkles, 
  Layers, 
  Search, 
  ChevronRight,
  BookOpen,
  Images,
  Camera
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface LessonListProps {
  lessons: Lesson[];
  onSelectLesson: (lesson: Lesson, mode: ColorMode) => void;
  onOpenAlbum: () => void;
  completedLessonIds: string[];
}

export const LessonList: React.FC<LessonListProps> = ({
  lessons,
  onSelectLesson,
  onOpenAlbum,
  completedLessonIds
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [preferredMode, setPreferredMode] = useState<ColorMode>('pb');

  const filteredLessons = lessons.filter((lesson) => {
    const matchesCategory = selectedCategory === 'all' || lesson.category === selectedCategory;
    const matchesSearch = 
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredLesson = lessons.length > 0 ? (lessons[1] || lessons[0]) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col gap-8">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-fuchsia-700 to-indigo-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
        
        <div className="relative z-10 max-w-2xl flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-amber-300 font-bold text-xs uppercase tracking-wider w-fit">
            <span>📖</span>
            <span>Ateliê da Iris</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-['Fredoka',sans-serif] font-bold leading-tight">
            Aprenda a desenhar no papel! 💜
          </h1>

          <p className="text-purple-100 text-sm sm:text-base leading-relaxed">
            Abra seu caderno de desenho na mesa com seus lápis reais. Você pode transformar qualquer foto em desenho realista a lápis no <strong>Álbum de Fotos</strong> ou fotografar suas obras feitas no papel!
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                soundManager.playSparkle();
                onOpenAlbum();
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-black px-6 py-3.5 rounded-2xl shadow-xl shadow-amber-400/25 transition active:scale-98 cursor-pointer text-sm"
            >
              <Images className="w-5 h-5" />
              <span>Abrir Álbum de Fotos & Desenhos P&B</span>
            </button>
          </div>
        </div>

        {/* Featured Mini Showcase or Studio Info */}
        <div className="relative z-10 w-full max-w-xs bg-white/10 backdrop-blur-md border border-white/25 p-5 rounded-3xl shadow-xl flex flex-col items-center text-center">
          {featuredLesson ? (
            <>
              <span className="text-xs font-bold text-amber-300 mb-2 uppercase tracking-wider">
                🌸 Aula em Destaque
              </span>
              <div 
                className="w-36 h-36 rounded-2xl bg-[#faf8f5] p-3 shadow-inner flex items-center justify-center cursor-pointer hover:scale-105 transition"
                onClick={() => onSelectLesson(featuredLesson, preferredMode)}
                dangerouslySetInnerHTML={{ __html: preferredMode === 'pb' ? featuredLesson.coverSvgPB : featuredLesson.coverSvgColor }}
              />
              <h3 className="font-['Fredoka',sans-serif] font-bold text-white text-base mt-3">
                {featuredLesson.title}
              </h3>
            </>
          ) : (
            <div className="flex flex-col items-center p-3">
              <span className="text-5xl mb-2">✏️</span>
              <h3 className="font-['Fredoka',sans-serif] font-bold text-white text-lg">
                Caderno de Arte
              </h3>
              <p className="text-xs text-purple-200 mt-1">
                Pronta para criar arte realista no papel com grafite e cor!
              </p>
            </div>
          )}
        </div>

      </div>

      {/* When lessons exist, show filters & search */}
      {lessons.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    soundManager.playPencilTap();
                    setSelectedCategory(cat.id);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-200 scale-102'
                      : 'bg-white text-purple-900 border border-purple-100 hover:bg-purple-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar aula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-purple-100 text-sm font-medium text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-2xs"
            />
          </div>
        </div>
      )}

      {/* Lessons Grid or Empty State */}
      {lessons.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-purple-200 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
          <div className="w-24 h-24 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-5xl mb-4">
            📖
          </div>
          <h2 className="text-2xl font-['Fredoka',sans-serif] font-bold text-purple-950 mb-2">
            Banco de aulas limpo!
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Todas as aulas foram apagadas conforme sua solicitação. O aplicativo agora está pronto para você adicionar fotos no álbum e transformá-las em desenhos realistas P&B sob demanda!
          </p>
          <button
            onClick={() => onOpenAlbum()}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md cursor-pointer text-sm"
          >
            <Images className="w-5 h-5 text-amber-300" />
            <span>Ir para o Álbum de Fotos</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessons.map((lesson) => {
            const isCompleted = completedLessonIds.includes(lesson.id);
            const coverSvg = preferredMode === 'pb' ? lesson.coverSvgPB : lesson.coverSvgColor;

            return (
              <div
                key={lesson.id}
                className="bg-white rounded-3xl border border-purple-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer hover:-translate-y-1"
              >
                <div 
                  className="relative aspect-4/3 bg-[#faf8f5] flex items-center justify-center p-6 border-b border-purple-50 overflow-hidden"
                  onClick={() => {
                    soundManager.playPencilTap();
                    onSelectLesson(lesson, preferredMode);
                  }}
                >
                  <div 
                    className="w-full h-full max-w-[200px] flex items-center justify-center transition duration-300 group-hover:scale-105"
                    dangerouslySetInnerHTML={{ __html: coverSvg }}
                  />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase">
                      {lesson.category}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-white">
                      P&B
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                      COR
                    </span>
                  </div>

                  {isCompleted && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                      ✓ Concluída
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                  <div>
                    <h3 className="font-['Fredoka',sans-serif] font-bold text-lg text-purple-950 group-hover:text-purple-700 transition">
                      {lesson.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1">
                      {lesson.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-purple-50 gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>{lesson.durationMinutes} min</span>
                      <span>•</span>
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>{lesson.steps.length} passos</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundManager.playPencilTap();
                          onSelectLesson(lesson, 'pb');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-black text-white font-bold text-xs transition cursor-pointer"
                      >
                        ✏️ P&B
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundManager.playPencilTap();
                          onSelectLesson(lesson, 'colorido');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer"
                      >
                        🎨 Cor
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
