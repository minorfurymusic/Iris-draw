import React, { useState, useRef } from 'react';
import { Lesson, ColorMode, LessonStep } from '../types';
import { 
  ArrowLeft, 
  ArrowRight, 
  Volume2, 
  Lightbulb, 
  CheckCircle2, 
  Check, 
  Camera, 
  Sparkles, 
  Star,
  Layers,
  ZoomIn,
  RefreshCw,
  Palette
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

interface LessonViewerProps {
  lesson: Lesson;
  initialMode?: ColorMode;
  onBack: () => void;
  onCompleteLesson: (lessonId: string) => void;
  onSavePaperDrawing: (dataUrl: string, title: string, mode: ColorMode) => void;
}

export const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson,
  initialMode = 'pb',
  onBack,
  onCompleteLesson,
  onSavePaperDrawing
}) => {
  const [mode, setMode] = useState<ColorMode>(initialMode);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [paperPhotoUrl, setPaperPhotoUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const step: LessonStep = lesson.steps[currentStepIdx] || lesson.steps[0];
  const totalSteps = lesson.steps.length;
  const isLastStep = currentStepIdx === totalSteps - 1;

  const currentSvg = mode === 'pb' ? step.svgPB : step.svgColor;
  const currentInstruction = mode === 'pb' ? step.instructionPB : step.instructionColor;
  const currentTip = mode === 'pb' ? step.artistTipPB : step.artistTipColor;
  const currentMaterials = mode === 'pb' ? step.materialsPB : step.materialsColor;
  const currentSpeech = mode === 'pb' ? step.speechTextPB : step.speechTextColor;

  const handleNextStep = () => {
    if (isLastStep) {
      soundManager.playTrophyFanfare();
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#38bdf8']
      });
      setIsCompleted(true);
      onCompleteLesson(lesson.id);
    } else {
      soundManager.playSparkle();
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      const nextStep = lesson.steps[nextIdx];
      const nextText = mode === 'pb' ? nextStep.speechTextPB : nextStep.speechTextColor;
      soundManager.speakTip(nextText);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      soundManager.playPencilTap();
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const handleSpeak = () => {
    soundManager.speakTip(currentSpeech);
  };

  // Photo upload from real paper drawing
  const handlePaperPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundManager.playSparkle();
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPaperPhotoUrl(result);
        onSavePaperDrawing(result, `${lesson.title} (No Caderno da Iris)`, mode);
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#10b981', '#f59e0b']
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 flex flex-col gap-6">
      
      {/* Top Header Card */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-purple-100 shadow-md flex flex-wrap items-center justify-between gap-4">
        
        {/* Back and Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.playPencilTap();
              onBack();
            }}
            className="p-2.5 rounded-2xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition cursor-pointer flex items-center gap-1.5 font-bold text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Aulas</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Aula no Caderno de Papel 📖
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                ⏱️ {lesson.durationMinutes} min
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-['Fredoka',sans-serif] font-bold text-purple-950 mt-0.5">
              {lesson.title}
            </h1>
          </div>
        </div>

        {/* Preto e Branco vs Colorido Switcher */}
        <div className="flex items-center gap-1.5 bg-purple-50 p-1.5 rounded-2xl border border-purple-200">
          <button
            onClick={() => {
              soundManager.playPencilTap();
              setMode('pb');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
              mode === 'pb'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-purple-800 hover:bg-purple-100'
            }`}
          >
            <span className="text-base">✏️</span>
            <span>Preto e Branco (Grafite)</span>
          </button>

          <button
            onClick={() => {
              soundManager.playPencilTap();
              setMode('colorido');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
              mode === 'colorido'
                ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-amber-500 text-white shadow-xs'
                : 'text-purple-800 hover:bg-purple-100'
            }`}
          >
            <span className="text-base">🎨</span>
            <span>Colorido (Lápis de Cor)</span>
          </button>
        </div>

      </div>

      {/* Materials Checklist for Physical Table */}
      <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">✏️</span>
          <div>
            <span className="font-['Fredoka',sans-serif] font-bold text-amber-950 text-sm block">
              Materiais no seu estojo para esta etapa:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {currentMaterials.map((mat, idx) => (
                <span 
                  key={idx}
                  className="bg-white/90 border border-amber-300/80 text-amber-900 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                >
                  ✓ {mat}
                </span>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSpeak}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-2xl font-bold text-xs transition cursor-pointer flex-shrink-0 shadow-xs"
        >
          <Volume2 className="w-4 h-4 animate-pulse" />
          <span>Ouvir a Dica do Professor</span>
        </button>
      </div>

      {/* Main Step Viewer (Desk Instructor) */}
      <div className="bg-white rounded-3xl border-2 border-purple-200 p-6 sm:p-8 shadow-lg flex flex-col items-center gap-6">
        
        {/* Step Progress Pill */}
        <div className="w-full flex items-center justify-between text-xs font-bold text-purple-900 border-b border-purple-100 pb-3">
          <span className="font-['Fredoka',sans-serif] text-base text-purple-800">
            Passo {step.stepNumber} de {totalSteps}
          </span>
          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full uppercase tracking-wider">
            {mode === 'pb' ? 'Modo Grafite Realista' : 'Modo Lápis de Cor'}
          </span>
        </div>

        {/* Step Visual Guide (High Realism Rendering) */}
        <div className="relative w-full max-w-md aspect-square bg-[#faf8f5] rounded-3xl border-2 border-purple-100 shadow-inner flex items-center justify-center p-6 overflow-hidden">
          <div 
            className="w-full h-full flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: currentSvg }}
          />

          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-purple-800 shadow-xs border border-purple-200">
            {mode === 'pb' ? 'Desenho a Lápis P&B' : 'Desenho Colorido'}
          </div>
        </div>

        {/* Step Instructions for Paper Drawing */}
        <div className="max-w-xl text-center flex flex-col gap-2">
          <h2 className="text-2xl font-['Fredoka',sans-serif] font-bold text-purple-950">
            {step.title}
          </h2>
          <p className="text-slate-700 text-base font-medium leading-relaxed">
            {currentInstruction}
          </p>
        </div>

        {/* Artist Tip Card */}
        {currentTip && (
          <div className="max-w-xl w-full bg-purple-50/70 border border-purple-200 p-4 rounded-2xl flex items-start gap-3 text-left">
            <div className="p-1 rounded-xl bg-purple-500 text-white flex-shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-purple-950 block">Dica de Desenho no Papel:</span>
              <span className="text-xs text-purple-900 font-medium">{currentTip}</span>
            </div>
          </div>
        )}

        {/* Step Controls */}
        <div className="flex flex-wrap items-center justify-between w-full max-w-xl pt-4 border-t border-purple-100 gap-3">
          <button
            disabled={currentStepIdx === 0}
            onClick={handlePrevStep}
            className={`flex items-center gap-1.5 px-5 py-3 rounded-2xl font-bold text-sm transition cursor-pointer ${
              currentStepIdx === 0
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Passo Anterior</span>
          </button>

          <button
            onClick={handleNextStep}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-700 text-white font-bold px-8 py-3.5 rounded-2xl shadow-md shadow-purple-200 transition active:scale-98 cursor-pointer text-sm sm:text-base"
          >
            <CheckCircle2 className="w-5 h-5 text-amber-300" />
            <span>{isLastStep ? 'Concluir Meu Desenho! 🎉' : 'Já fiz no meu papel! Próximo ✓'}</span>
          </button>
        </div>

      </div>

      {/* Completion Modal with Camera / Photo of Paper Drawing */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border-4 border-purple-300 shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-300 via-amber-400 to-amber-200 flex items-center justify-center text-4xl shadow-md mb-3 animate-bounce">
              ⭐
            </div>

            <h2 className="text-2xl sm:text-3xl font-['Fredoka',sans-serif] font-bold text-purple-950 mb-1">
              Parabéns, Iris! 🎉
            </h2>
            <p className="text-slate-600 font-medium text-sm mb-6">
              Você concluiu o desenho de <span className="font-bold text-purple-700">"{lesson.title}"</span> no seu papel! Agora fotografe seu desenho feito à mão para guardar no seu Álbum Oficial!
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePaperPhotoUpload}
            />

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-bold text-base shadow-lg shadow-emerald-200 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Fotografar Meu Desenho do Papel 📸</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playSparkle();
                  onBack();
                }}
                className="w-full py-3 px-6 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-sm transition cursor-pointer"
              >
                Voltar para a Lista de Aulas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
