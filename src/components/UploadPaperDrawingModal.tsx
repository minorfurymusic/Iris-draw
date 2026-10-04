import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Check, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ColorMode } from '../types';
import { soundManager } from '../utils/audio';

interface UploadPaperDrawingModalProps {
  onSaveDrawing: (dataUrl: string, title: string, mode: ColorMode, notes?: string) => void;
  onDone: () => void;
}

export const UploadPaperDrawingModal: React.FC<UploadPaperDrawingModalProps> = ({
  onSaveDrawing,
  onDone
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('Meu Desenho no Caderno');
  const [mode, setMode] = useState<ColorMode>('pb');
  const [notes, setNotes] = useState<string>('Feito no papel com lápis');
  const [saved, setSaved] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundManager.playSparkle();
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSave = () => {
    if (!photoPreview) return;

    soundManager.playTrophyFanfare();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#a855f7', '#10b981', '#f59e0b', '#ec4899']
    });

    onSaveDrawing(photoPreview, title, mode, notes);
    setSaved(true);
    setTimeout(() => {
      onDone();
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:px-6 flex flex-col gap-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-amber-300 font-bold text-xs uppercase tracking-wider mb-2">
            <Camera className="w-4 h-4" />
            <span>Mural de Obras Feitas no Papel</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-['Fredoka',sans-serif] font-bold">
            Fotografar Meu Desenho do Papel 📸
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base mt-1 max-w-xl">
            Tire uma foto do caderno de desenho da Iris para guardar no álbum oficial e acompanhar a evolução artística dela!
          </p>
        </div>

        <div className="text-5xl">📖</div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl border-2 border-purple-200 p-6 sm:p-8 shadow-lg flex flex-col gap-6">
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCapture}
        />

        {!photoPreview ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-3 border-dashed border-purple-300 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:bg-purple-50/50 transition group"
          >
            <div className="w-20 h-20 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-4xl group-hover:scale-110 transition shadow-inner">
              📸
            </div>
            <div>
              <h3 className="font-['Fredoka',sans-serif] font-bold text-xl text-purple-950 mb-1">
                Tirar Foto ou Escolher Imagem do Desenho
              </h3>
              <p className="text-sm text-slate-500 max-w-md">
                Aponte a câmera do celular ou tablet para o caderno de papel da Iris com boa luz.
              </p>
            </div>
            <button
              type="button"
              className="mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-2xl shadow-md cursor-pointer"
            >
              Abrir Câmera / Galeria
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="relative aspect-4/3 max-w-md mx-auto w-full bg-slate-100 rounded-2xl overflow-hidden border-2 border-purple-200 shadow-md flex items-center justify-center">
              <img
                src={photoPreview}
                alt="Pré-visualização do desenho no papel"
                className="max-h-full max-w-full object-contain"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-3 right-3 bg-white/95 text-purple-900 font-bold text-xs px-3 py-1.5 rounded-full shadow-md border border-purple-200 cursor-pointer"
              >
                Tirar Outra Foto 🔄
              </button>
            </div>

            {/* Title & Details Form */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-purple-900 uppercase tracking-wider block mb-1">
                  Nome da Obra:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-purple-50/50 border border-purple-200 text-sm font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-purple-900 uppercase tracking-wider block mb-1">
                    Tipo de Desenho:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('pb')}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                        mode === 'pb' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      ✏️ Preto e Branco
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('colorido')}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                        mode === 'colorido' ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      🎨 Colorido
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-900 uppercase tracking-wider block mb-1">
                    Materiais Usados:
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Lápis 2B, 4B e Esfuminho"
                    className="w-full px-4 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs font-medium text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleConfirmSave}
                disabled={saved}
                className="mt-2 w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-600 hover:from-emerald-600 text-white font-bold text-base shadow-lg shadow-emerald-200 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {saved ? (
                  <>
                    <Check className="w-5 h-5 text-amber-300" />
                    <span>Salvo no Álbum da Iris! ✨</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Guardar no Álbum de Obras de Arte (+2 Estrelas ⭐)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
