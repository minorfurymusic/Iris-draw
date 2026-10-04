import React, { useState, useRef, useEffect } from 'react';
import { 
  Wand2, 
  Upload, 
  Sliders, 
  Save, 
  Download, 
  Palette, 
  Sparkles, 
  Check, 
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { applySketchFilter, SketchFilterOptions } from '../utils/sketchFilter';
import { soundManager } from '../utils/audio';

interface PresetPhoto {
  id: string;
  title: string;
  description: string;
  // SVG representation or fallback
  svgData: string;
}

interface PhotoToSketchModalProps {
  onSaveToGallery: (sketchUrl: string, originalPhotoUrl?: string, title?: string) => void;
  onOpenInCanvas: (sketchUrl: string) => void;
}

export const PhotoToSketchModal: React.FC<PhotoToSketchModalProps> = ({
  onSaveToGallery,
  onOpenInCanvas,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('bebe-cao');
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<SketchFilterOptions['mode']>('pencil_realistic');
  const [contrast, setContrast] = useState<number>(30);
  const [darkness, setDarkness] = useState<number>(55);
  const [sketchResultUrl, setSketchResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Curated Family Presets inspired by Iris's photos
  const presets: PresetPhoto[] = [
    {
      id: 'bebe-cao',
      title: 'Iris e o Cãozinho no Cobertor',
      description: 'Foto inesquecível de bebê dormindo com o cachorrinho chihuahua leal.',
      svgData: `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#fdf4ff"/>
        <!-- Ondas do cobertor -->
        <path d="M 0 140 Q 100 110 200 150 Q 300 120 400 170 L 400 300 L 0 300 Z" fill="#f5d0fe"/>
        <path d="M 0 200 Q 120 180 250 220 L 400 210 L 400 300 L 0 300 Z" fill="#e879f9" opacity="0.6"/>
        <!-- Bebe Iris dormindo -->
        <ellipse cx="260" cy="110" rx="55" ry="48" fill="#ffedd5"/>
        <path d="M 235 115 Q 248 124 260 115" stroke="#9a3412" stroke-width="3" fill="none"/>
        <ellipse cx="268" cy="130" rx="4" ry="3" fill="#ea580c"/>
        <circle cx="285" cy="112" r="10" fill="#fed7aa"/>
        <!-- Macacaozinho floral -->
        <path d="M 230 150 C 230 190, 310 190, 320 150 Z" fill="#ffffff"/>
        <circle cx="260" cy="165" r="4" fill="#f43f5e"/>
        <circle cx="280" cy="175" r="4" fill="#f43f5e"/>
        <!-- Cachorrinho chihuahua descansando a cabecinha -->
        <path d="M 90 220 Q 60 180 100 150 Q 150 160 170 200 Q 150 260 90 220 Z" fill="#b45309"/>
        <circle cx="115" cy="190" r="12" fill="#0f172a"/>
        <circle cx="112" cy="186" r="4" fill="#ffffff"/>
        <polygon points="90,215 102,215 96,227" fill="#0f172a"/>
        <path d="M 75 160 Q 50 110 90 100 Q 105 120 95 160 Z" fill="#78350f"/>
        <path d="M 140 165 Q 165 115 130 105 Q 115 125 125 165 Z" fill="#78350f"/>
      </svg>`
    },
    {
      id: 'pescaria-papai',
      title: 'Pescaria no Rio com o Papai',
      description: 'Momento de alegria no rio segurando a vara com o peixinho dourado.',
      svgData: `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#e0f2fe"/>
        <!-- Rio -->
        <path d="M 0 130 Q 200 110 400 140 L 400 300 L 0 300 Z" fill="#0284c7"/>
        <path d="M 0 180 Q 150 160 400 190 L 400 300 L 0 300 Z" fill="#475569"/>
        <!-- Papai com barba e oculos -->
        <circle cx="110" cy="150" r="30" fill="#fed7aa"/>
        <rect x="85" y="142" width="30" height="14" rx="3" fill="#0f172a"/>
        <path d="M 90 165 Q 110 185 130 165 Z" fill="#1e293b"/>
        <path d="M 75 180 L 145 180 L 160 270 L 60 270 Z" fill="#0f172a"/>
        <!-- Vara de pescar -->
        <line x1="110" y1="180" x2="280" y2="40" stroke="#78350f" stroke-width="5" stroke-linecap="round"/>
        <line x1="280" y1="40" x2="280" y2="150" stroke="#ffffff" stroke-width="2"/>
        <!-- Peixinho -->
        <ellipse cx="280" cy="160" rx="10" ry="20" fill="#f59e0b"/>
        <polygon points="280,180 270,195 290,195" fill="#f59e0b"/>
        <!-- Iris sorrindo -->
        <circle cx="320" cy="160" r="24" fill="#fed7aa"/>
        <path d="M 305 190 L 335 190 L 342 240 L 298 240 Z" fill="#ef4444"/>
        <circle cx="312" cy="156" r="3" fill="#0f172a"/>
        <circle cx="328" cy="156" r="3" fill="#0f172a"/>
        <path d="M 314 170 Q 320 176 326 170" stroke="#e11d48" stroke-width="2.5" fill="none"/>
      </svg>`
    },
    {
      id: 'oculos-estilo',
      title: 'Iris e os Óculos Mágicos',
      description: 'Estilo puro com óculos geométricos grandes e copinho de canudo.',
      svgData: `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#fdf2f8"/>
        <!-- Cabelos ondulados castanhos -->
        <path d="M 110 90 Q 90 200 130 260 Q 160 170 150 90 Z" fill="#78350f"/>
        <path d="M 290 90 Q 310 200 270 260 Q 240 170 250 90 Z" fill="#78350f"/>
        <!-- Rostinho -->
        <ellipse cx="200" cy="140" rx="70" ry="78" fill="#fed7aa"/>
        <path d="M 130 90 Q 200 40 270 90 Q 200 70 130 90 Z" fill="#78350f"/>
        <!-- Oculos estilosos -->
        <rect x="135" y="115" width="55" height="45" rx="10" fill="#f8fafc" opacity="0.3" stroke="#0f172a" stroke-width="4"/>
        <rect x="210" y="115" width="55" height="45" rx="10" fill="#f8fafc" opacity="0.3" stroke="#0f172a" stroke-width="4"/>
        <line x1="190" y1="135" x2="210" y2="135" stroke="#0f172a" stroke-width="4"/>
        <!-- Reflexo no oculos -->
        <line x1="145" y1="120" x2="165" y2="155" stroke="#ffffff" stroke-width="4" opacity="0.75"/>
        <line x1="220" y1="120" x2="240" y2="155" stroke="#ffffff" stroke-width="4" opacity="0.75"/>
        <!-- Piscadela e sorriso -->
        <path d="M 150 140 Q 162 150 174 140" stroke="#0f172a" stroke-width="4" fill="none"/>
        <circle cx="238" cy="140" r="8" fill="#0f172a"/>
        <circle cx="234" cy="136" r="3" fill="#ffffff"/>
        <path d="M 190 185 Q 200 193 210 185" stroke="#e11d48" stroke-width="4" fill="none"/>
      </svg>`
    },
    {
      id: 'bolhas-sabao',
      title: 'Bolhas de Sabão Gigantes',
      description: 'A magia das bolhas transparentes flutuando ao entardecer no parque.',
      svgData: `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#1e1b4b"/>
        <!-- Bolha gigante -->
        <circle cx="200" cy="140" r="95" fill="#f5d0fe" opacity="0.3" stroke="#e0e7ff" stroke-width="3"/>
        <path d="M 140 90 Q 170 65 220 75" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round"/>
        <circle cx="240" cy="190" r="10" fill="#38bdf8" opacity="0.8"/>
        <!-- Iris soprando -->
        <circle cx="330" cy="210" r="32" fill="#fed7aa"/>
        <path d="M 315 225 Q 310 230 305 225" stroke="#e11d48" stroke-width="3" fill="none"/>
        <path d="M 305 225 L 290 205" stroke="#38bdf8" stroke-width="4"/>
      </svg>`
    }
  ];

  // Render current selected preset to canvas and apply pencil sketch
  const renderCurrentToSketch = () => {
    setIsProcessing(true);

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (uploadedImageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width > 800 ? 800 : img.width;
        canvas.height = (canvas.width * img.height) / img.width;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const filtered = applySketchFilter(canvas, {
          mode: filterMode,
          contrast,
          pencilDarkness: darkness,
          paperTexture: true
        });
        setSketchResultUrl(filtered.toDataURL('image/png'));
        setIsProcessing(false);
      };
      img.src = uploadedImageSrc;
    } else {
      const activePreset = presets.find(p => p.id === selectedPresetId) || presets[0];
      const svgBlob = new Blob([activePreset.svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 400, 300);
        URL.revokeObjectURL(url);
        const filtered = applySketchFilter(canvas, {
          mode: filterMode,
          contrast,
          pencilDarkness: darkness,
          paperTexture: true
        });
        setSketchResultUrl(filtered.toDataURL('image/png'));
        setIsProcessing(false);
      };
      img.src = url;
    }
  };

  useEffect(() => {
    renderCurrentToSketch();
  }, [selectedPresetId, uploadedImageSrc, filterMode, contrast, darkness]);

  // Handle file upload from user
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundManager.playSparkle();
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setUploadedImageSrc(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveToAlbum = () => {
    if (!sketchResultUrl) return;
    soundManager.playSparkle();
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#a855f7', '#ec4899', '#f59e0b', '#c084fc']
    });

    const activePreset = presets.find(p => p.id === selectedPresetId);
    const title = uploadedImageSrc ? 'Foto da Galeria em Desenho Realista' : (activePreset?.title || 'Desenho Realista');

    onSaveToGallery(sketchResultUrl, uploadedImageSrc || undefined, title);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDownloadSketch = () => {
    if (!sketchResultUrl) return;
    const a = document.createElement('a');
    a.href = sketchResultUrl;
    a.download = `desenho-realista-iris-${Date.now()}.png`;
    a.click();
    soundManager.playSparkle();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col gap-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-2xl"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-purple-500/30 backdrop-blur-md px-3.5 py-1 rounded-full text-amber-300 font-bold text-xs uppercase tracking-wider mb-3">
            <Wand2 className="w-4 h-4" />
            <span>Varinha Mágica da Iris</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-['Fredoka',sans-serif] font-bold mb-2">
            Transformador de Fotos em Desenho Realista
          </h1>
          <p className="text-purple-200 text-sm sm:text-base leading-relaxed">
            Aqui as fotos da Iris e da família viram obras de arte a lápis de grafite e carvão! Escolha uma das memórias especiais ou carregue uma foto do seu celular.
          </p>
        </div>
      </div>

      {/* Main Grid: Selector & Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Photo Selector / Upload */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Upload Button */}
          <div className="bg-white rounded-3xl border-2 border-purple-200 p-5 shadow-sm">
            <h3 className="font-['Fredoka',sans-serif] font-bold text-purple-950 text-base mb-2 flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" />
              Carregar Foto Nova
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Envie qualquer foto do seu computador ou celular para transformar em traço realista.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold py-3 px-4 rounded-2xl border-2 border-dashed border-purple-300 transition cursor-pointer text-sm"
            >
              <ImageIcon className="w-4 h-4 text-purple-600" />
              <span>Escolher Foto do Aparelho</span>
            </button>

            {uploadedImageSrc && (
              <div className="mt-3 flex items-center justify-between bg-purple-100/50 p-2 rounded-xl text-xs">
                <span className="font-bold text-purple-900 truncate">Foto Carregada ✓</span>
                <button
                  onClick={() => setUploadedImageSrc(null)}
                  className="text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  Voltar às fotos da Iris
                </button>
              </div>
            )}
          </div>

          {/* Curated Presets List */}
          <div className="bg-white rounded-3xl border border-purple-100 p-5 shadow-sm flex flex-col gap-3">
            <h3 className="font-['Fredoka',sans-serif] font-bold text-purple-950 text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Memórias Especiais da Iris
            </h3>
            <p className="text-xs text-slate-500">
              Selecione uma foto dos momentos mágicos da Iris:
            </p>

            <div className="flex flex-col gap-2">
              {presets.map((p) => {
                const isSelected = !uploadedImageSrc && selectedPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      soundManager.playPencilTap();
                      setUploadedImageSrc(null);
                      setSelectedPresetId(p.id);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-purple-100/80 border-purple-500 shadow-xs ring-1 ring-purple-400'
                        : 'bg-purple-50/30 border-purple-100 hover:bg-purple-50'
                    }`}
                  >
                    <div 
                      className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-purple-200"
                      dangerouslySetInnerHTML={{ __html: p.svgData }}
                    />
                    <div className="overflow-hidden">
                      <span className="font-bold text-xs text-purple-950 block truncate">
                        {p.title}
                      </span>
                      <span className="text-[11px] text-slate-500 line-clamp-1">
                        {p.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Panel: Interactive Transformation Result */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Main Transformation Showcase Card */}
          <div className="bg-white rounded-3xl border-2 border-purple-200 p-5 sm:p-6 shadow-md flex flex-col gap-4">
            
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 block">
                  Resultado em Tempo Real
                </span>
                <h2 className="text-xl font-['Fredoka',sans-serif] font-bold text-purple-950">
                  {uploadedImageSrc ? 'Sua Foto Transformada' : presets.find(p => p.id === selectedPresetId)?.title}
                </h2>
              </div>

              {/* Style Filter Mode Buttons */}
              <div className="flex items-center gap-1.5 bg-purple-50 p-1.5 rounded-2xl border border-purple-200 text-xs">
                {(['pencil_realistic', 'outline', 'charcoal', 'soft_shading'] as const).map((mode) => {
                  const labels = {
                    pencil_realistic: 'Lápis 2B Realista',
                    outline: 'Contornos Limpos',
                    charcoal: 'Carvão Artístico',
                    soft_shading: 'Sombra Suave'
                  };
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        soundManager.playPencilTap();
                        setFilterMode(mode);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        filterMode === mode
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-purple-800 hover:bg-purple-100'
                      }`}
                    >
                      {labels[mode]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Side-by-side or Main Sketch Display */}
            <div className="relative min-h-[350px] sm:min-h-[420px] bg-amber-50/50 rounded-2xl border-2 border-purple-100 overflow-hidden flex items-center justify-center p-4">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-bold text-purple-900 text-sm">Desenhando a lápis... ✏️</span>
                </div>
              ) : sketchResultUrl ? (
                <img
                  src={sketchResultUrl}
                  alt="Desenho a Lápis Realista"
                  className="max-h-[420px] w-auto max-w-full object-contain rounded-xl shadow-lg border border-stone-200"
                />
              ) : null}

              {savedSuccess && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-white font-bold px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2 animate-bounce">
                  <Check className="w-5 h-5" />
                  <span>Guardado no Álbum da Iris! ✨</span>
                </div>
              )}
            </div>

            {/* Fine Tuning Sliders (Darkness & Contrast) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/60 p-4 rounded-2xl border border-purple-100">
              <div>
                <div className="flex justify-between text-xs font-bold text-purple-900 mb-1">
                  <span>Intensidade do Grafite</span>
                  <span className="font-['Fredoka',sans-serif]">{darkness}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={darkness}
                  onChange={(e) => setDarkness(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-purple-900 mb-1">
                  <span>Contraste das Sombras</span>
                  <span className="font-['Fredoka',sans-serif]">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="80"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Action Buttons: Save to Album / Open on Easel / Download */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveToAlbum}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-700 text-white font-bold py-3 px-6 rounded-2xl shadow-md shadow-purple-200 transition active:scale-98 cursor-pointer"
                >
                  <Save className="w-5 h-5 text-amber-300" />
                  <span>Guardar no Álbum de Arte</span>
                </button>

                {sketchResultUrl && (
                  <button
                    onClick={() => {
                      soundManager.playSparkle();
                      onOpenInCanvas(sketchResultUrl);
                    }}
                    className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold py-3 px-5 rounded-2xl border border-purple-300 transition cursor-pointer text-sm"
                  >
                    <Palette className="w-4 h-4 text-purple-700" />
                    <span>Desenhar no Meu Cavalete</span>
                  </button>
                )}
              </div>

              <button
                onClick={handleDownloadSketch}
                className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-950 p-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PNG</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
