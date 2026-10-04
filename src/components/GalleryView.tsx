import React, { useState, useRef, useEffect } from 'react';
import { SavedArtwork, PeopleFolder } from '../types';
import { FOLDER_CONFIGS } from '../data/portraitModels';
import { 
  Plus, 
  Upload, 
  Download, 
  Eye, 
  X, 
  Sparkles, 
  Scissors, 
  Trash2, 
  Check, 
  RefreshCw,
  Image as ImageIcon,
  FolderOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { applySketchFilter } from '../utils/sketchFilter';
import { soundManager } from '../utils/audio';

interface GalleryViewProps {
  customArtworks: SavedArtwork[];
  onAddNewCustomPhoto: (sketchUrl: string, originalUrl?: string, title?: string, folder?: PeopleFolder) => void;
  onLikePhoto: (id: string) => void;
  onDeleteArtwork?: (id: string) => void;
  onClearAllArtworks?: () => void;
  onOpenFolderCatalog?: (folderId?: PeopleFolder) => void;
  onOpenGoogleDriveImport?: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  customArtworks,
  onAddNewCustomPhoto,
  onDeleteArtwork,
  onClearAllArtworks,
  onOpenFolderCatalog,
  onOpenGoogleDriveImport
}) => {
  // Upload and Transformation Modal State
  const [showTransformModal, setShowTransformModal] = useState<boolean>(false);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('Foto');
  const [selectedFolderForPhoto, setSelectedFolderForPhoto] = useState<PeopleFolder>('meninas');
  
  // Background Removal & Sketch Controls
  const [removeBackground, setRemoveBackground] = useState<boolean>(true);
  const [bgTolerance, setBgTolerance] = useState<number>(35);
  const [filterMode, setFilterMode] = useState<'pencil_realistic' | 'outline' | 'charcoal'>('pencil_realistic');
  const [contrast, setContrast] = useState<number>(30);
  const [darkness, setDarkness] = useState<number>(55);
  
  const [sketchResultUrl, setSketchResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Inspector Lightbox
  const [selectedArtwork, setSelectedArtwork] = useState<SavedArtwork | null>(null);

  // IN-APP CONFIRMATION MODALS (Replaces broken window.confirm in iframe sandbox)
  const [artworkToDelete, setArtworkToDelete] = useState<SavedArtwork | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute sketch result when parameters change
  useEffect(() => {
    if (!uploadedImageSrc) return;

    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(800, img.width);
      canvas.height = (canvas.width * img.height) / img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const filtered = applySketchFilter(canvas, {
          mode: filterMode,
          contrast,
          pencilDarkness: darkness,
          paperTexture: !removeBackground,
          removeBackground,
          bgTolerance
        });
        setSketchResultUrl(filtered.toDataURL('image/png'));
      }
      setIsProcessing(false);
    };
    img.src = uploadedImageSrc;
  }, [uploadedImageSrc, removeBackground, bgTolerance, filterMode, contrast, darkness]);

  // Initial file trigger
  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundManager.playSparkle();
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src) {
        setUploadedImageSrc(src);
        setUploadedFileName(file.name.replace(/\.[^/.]+$/, ''));
        setShowTransformModal(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveToAlbum = () => {
    if (!sketchResultUrl) return;

    soundManager.playTrophyFanfare();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#a855f7', '#ec4899', '#f59e0b', '#10b981']
    });

    const title = `Desenho Realista: ${uploadedFileName}`;
    onAddNewCustomPhoto(sketchResultUrl, uploadedImageSrc || undefined, title, selectedFolderForPhoto);

    setShowTransformModal(false);
    setUploadedImageSrc(null);
  };

  const handleDownload = (title: string, dataUrl: string) => {
    soundManager.playSparkle();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const handleConfirmSingleDelete = () => {
    if (!artworkToDelete || !onDeleteArtwork) return;
    soundManager.playPencilTap();
    onDeleteArtwork(artworkToDelete.id);
    if (selectedArtwork?.id === artworkToDelete.id) {
      setSelectedArtwork(null);
    }
    setArtworkToDelete(null);
  };

  const handleConfirmClearAll = () => {
    if (!onClearAllArtworks) return;
    soundManager.playPencilTap();
    onClearAllArtworks();
    setSelectedArtwork(null);
    setShowClearConfirmModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col gap-8">
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelectFile}
      />

      {/* Hero Album Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-purple-500/30 backdrop-blur-md px-3.5 py-1 rounded-full text-amber-300 font-bold text-xs uppercase tracking-wider mb-3">
            <Sparkles className="w-4 h-4" />
            <span>Álbum de Obras & Fotos da Iris</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-['Fredoka',sans-serif] font-bold leading-tight">
            Meu Álbum de Fotos & Desenhos 💜
          </h1>

          <p className="text-purple-100 text-sm sm:text-base leading-relaxed mt-2">
            Adicione fotos da sua família ou do seu dia a dia. A inteligência artificial transforma qualquer foto em um <strong>desenho realista preto e branco</strong> a lápis, com opção de <strong>remover o fundo</strong> para a Iris desenhar com facilidade no papel!
          </p>

          {/* Action Buttons: Add Photo / Clear */}
          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-amber-400/25 transition active:scale-98 cursor-pointer text-sm sm:text-base"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
              <span>Adicionar Foto (IA Transforma em Desenho P&B)</span>
            </button>

            {onOpenGoogleDriveImport && (
              <button
                onClick={onOpenGoogleDriveImport}
                className="flex items-center gap-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 font-bold px-5 py-4 rounded-2xl transition cursor-pointer text-sm sm:text-base backdrop-blur-md active:scale-98"
              >
                <FolderOpen className="w-5 h-5 text-amber-300" />
                <span>Importar do Google Drive (pessoal/desenho) 📂</span>
              </button>
            )}

            {customArtworks.length > 0 && onClearAllArtworks && (
              <button
                onClick={() => {
                  soundManager.playPencilTap();
                  setShowClearConfirmModal(true);
                }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-rose-200 border border-white/20 px-4 py-3.5 rounded-2xl transition cursor-pointer text-xs font-bold"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar Álbum</span>
              </button>
            )}
          </div>
        </div>

        {/* Counter */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl flex items-center gap-4 text-center">
          <div>
            <span className="block text-4xl sm:text-5xl font-['Fredoka',sans-serif] font-black text-amber-300">
              {customArtworks.length}
            </span>
            <span className="text-xs font-bold text-purple-200 uppercase tracking-wider block mt-1">
              {customArtworks.length === 1 ? 'Foto no Álbum' : 'Fotos no Álbum'}
            </span>
          </div>
          <div className="text-4xl animate-bounce">📸</div>
        </div>
      </div>

      {/* Empty State */}
      {customArtworks.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-purple-200 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
          <div className="w-24 h-24 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-5xl mb-4">
            🖼️
          </div>
          <h2 className="text-2xl font-['Fredoka',sans-serif] font-bold text-purple-950 mb-2">
            O Álbum de Fotos está pronto!
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Adicione qualquer foto do seu computador ou celular. Você poderá escolher <strong>remover o fundo</strong> para destacar apenas o personagem ou manter o fundo completo, e a IA transformará em um lindo traço realista a lápis!
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Adicionar Foto para Transformar em P&B</span>
          </button>
        </div>
      ) : (
        /* Grid of Photos in the Album */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {customArtworks.map((art) => (
            <div
              key={art.id}
              onClick={() => setSelectedArtwork(art)}
              className="bg-white rounded-3xl border-2 border-purple-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer hover:-translate-y-1"
            >
              <div className="relative aspect-4/3 bg-[#faf8f5] flex items-center justify-center p-3 border-b border-purple-100">
                <img
                  src={art.dataUrl}
                  alt={art.title}
                  className="max-h-full max-w-full object-contain rounded-xl"
                />
                <span className="absolute top-3 left-3 bg-purple-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                  {art.isPaperPhoto ? 'Desenho no Papel 📸' : 'P&B Realista ✏️'}
                </span>

                <div className="absolute inset-0 bg-purple-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span className="bg-white text-purple-950 font-bold text-xs px-4 py-2 rounded-2xl shadow-md flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>Ver em Tela Cheia</span>
                  </span>
                </div>
              </div>

              <div className="p-4 flex flex-col gap-2">
                <h3 className="font-['Fredoka',sans-serif] font-bold text-base text-purple-950 line-clamp-1">
                  {art.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-purple-50">
                  <span>{art.date}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(art.title, art.dataUrl);
                      }}
                      className="flex items-center gap-1 text-purple-700 font-bold hover:underline cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </button>
                    {onDeleteArtwork && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundManager.playPencilTap();
                          setArtworkToDelete(art);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Apagar foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* IN-APP CONFIRMATION MODAL: DELETE SINGLE ARTWORK */}
      {/* ========================================================= */}
      {artworkToDelete && (
        <div 
          onClick={() => setArtworkToDelete(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 flex flex-col gap-5 shadow-2xl text-center border-2 border-rose-200"
          >
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-3xl mx-auto">
              🗑️
            </div>

            <div>
              <h3 className="font-['Fredoka',sans-serif] font-bold text-xl text-rose-950">
                Apagar Imagem do Álbum?
              </h3>
              <p className="text-xs text-slate-600 mt-2">
                Tem certeza que deseja apagar <strong>"{artworkToDelete.title}"</strong> do álbum?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setArtworkToDelete(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSingleDelete}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md cursor-pointer"
              >
                Sim, Apagar Imagem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* IN-APP CONFIRMATION MODAL: CLEAR ALL ARTWORKS */}
      {/* ========================================================= */}
      {showClearConfirmModal && (
        <div 
          onClick={() => setShowClearConfirmModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 flex flex-col gap-5 shadow-2xl text-center border-2 border-rose-200"
          >
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-3xl mx-auto">
              ⚠️
            </div>

            <div>
              <h3 className="font-['Fredoka',sans-serif] font-bold text-xl text-rose-950">
                Limpar Todo o Álbum?
              </h3>
              <p className="text-xs text-slate-600 mt-2">
                Tem certeza que deseja apagar todas as fotos salvas do álbum? Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md cursor-pointer"
              >
                Sim, Limpar Álbum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TRANSFORM MODAL WITH BACKGROUND REMOVAL */}
      {/* ========================================================= */}
      {showTransformModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative my-8">
            
            {/* Close Button */}
            <button
              onClick={() => setShowTransformModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  IA de Desenho Realista Preto e Branco 🪄
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-['Fredoka',sans-serif] font-bold text-purple-950">
                Transformar Foto em Desenho Realista
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Ajuste os controles abaixo. Use o botão <strong>"Remover Fundo"</strong> para isolar o personagem e facilitar o desenho no papel!
              </p>
            </div>

            {/* Folder Classification Option */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-purple-950">
                Classificar na Pasta de Referências (Opcional):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FOLDER_CONFIGS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFolderForPhoto(f.id)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedFolderForPhoto === f.id
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    <span>{f.icon}</span>
                    <span className="truncate">{f.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Side by side Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Photo */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>Foto Original</span>
                </span>
                <div className="w-full aspect-4/3 bg-slate-100 rounded-2xl border-2 border-purple-100 flex items-center justify-center p-3 overflow-hidden shadow-inner">
                  {uploadedImageSrc && (
                    <img
                      src={uploadedImageSrc}
                      alt="Foto Original"
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  )}
                </div>
              </div>

              {/* Realistic B&W Pencil Result */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Desenho Realista P&B</span>
                    {removeBackground && (
                      <span className="bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full">
                        Fundo Removido ✓
                      </span>
                    )}
                  </span>
                  {isProcessing && (
                    <span className="text-xs text-purple-600 font-bold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Processando...
                    </span>
                  )}
                </div>
                <div className="w-full aspect-4/3 bg-[#faf8f5] rounded-2xl border-2 border-purple-300 flex items-center justify-center p-3 overflow-hidden shadow-inner relative">
                  {sketchResultUrl ? (
                    <img
                      src={sketchResultUrl}
                      alt="Desenho a Lápis Realista P&B"
                      className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-purple-700 text-sm font-bold">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Gerando traço...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Background Removal & Style Toolbar */}
            <div className="bg-purple-50/70 p-4 sm:p-5 rounded-2xl border border-purple-200 flex flex-col gap-4">
              
              {/* PRIMARY FEATURE: Remove Background Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl text-white ${removeBackground ? 'bg-purple-600' : 'bg-slate-400'}`}>
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-['Fredoka',sans-serif] font-bold text-sm text-purple-950 block">
                      Remover Fundo da Imagem
                    </span>
                    <span className="text-xs text-slate-500">
                      Isola o personagem deixando o fundo branco puro para desenhar no papel
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundManager.playPencilTap();
                      setRemoveBackground(true);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                      removeBackground
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Fundo Removido (Foco no Personagem)</span>
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playPencilTap();
                      setRemoveBackground(false);
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                      !removeBackground
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    Manter Fundo Original
                  </button>
                </div>
              </div>

              {/* Background Removal Sensitivity Slider */}
              {removeBackground && (
                <div className="bg-white p-3 rounded-xl border border-purple-100 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold text-purple-900 mb-1">
                      <span>Sensibilidade da Remoção de Fundo</span>
                      <span className="font-['Fredoka',sans-serif] text-purple-700">{bgTolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="75"
                      value={bgTolerance}
                      onChange={(e) => setBgTolerance(Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 max-w-[140px] text-right leading-tight hidden sm:block">
                    Aumente se sobrar partes do fundo; diminua se cortar o personagem.
                  </span>
                </div>
              )}

              {/* Pencil Style Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Estilo de Traço a Lápis:
                </span>
                <div className="flex items-center gap-1.5">
                  {(['pencil_realistic', 'outline', 'charcoal'] as const).map((style) => {
                    const labels = {
                      pencil_realistic: 'Grafite 2B/4B Realista',
                      outline: 'Contornos Limpos',
                      charcoal: 'Carvão Artístico'
                    };
                    return (
                      <button
                        key={style}
                        onClick={() => {
                          soundManager.playPencilTap();
                          setFilterMode(style);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                          filterMode === style
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        {labels[style]}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-purple-100">
              <button
                onClick={() => {
                  modalFileInputRef.current?.click();
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-950 p-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Trocar de Foto</span>
              </button>

              <input
                ref={modalFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSelectFile}
              />

              <div className="flex items-center gap-2">
                {sketchResultUrl && (
                  <button
                    onClick={() => handleDownload(uploadedFileName, sketchResultUrl)}
                    className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold px-4 py-3 rounded-2xl border border-purple-200 transition cursor-pointer text-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar PNG</span>
                  </button>
                )}

                <button
                  onClick={handleSaveToAlbum}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-800 hover:from-purple-800 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-purple-200 transition active:scale-98 cursor-pointer text-sm"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Guardar no Álbum da Iris! ✨</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Inspect Single Photo Lightbox */}
      {selectedArtwork && (
        <div 
          onClick={() => setSelectedArtwork(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 flex flex-col gap-4 shadow-2xl relative"
          >
            <button
              onClick={() => setSelectedArtwork(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl sm:text-2xl font-['Fredoka',sans-serif] font-bold text-purple-950">
              {selectedArtwork.title}
            </h2>

            <div className="w-full aspect-4/3 bg-[#faf8f5] rounded-2xl border-2 border-purple-100 flex items-center justify-center p-4 overflow-hidden shadow-inner">
              <img
                src={selectedArtwork.dataUrl}
                alt={selectedArtwork.title}
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-purple-50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">
                  {selectedArtwork.date}
                </span>
                {onDeleteArtwork && (
                  <button
                    onClick={() => {
                      setArtworkToDelete(selectedArtwork);
                    }}
                    className="text-xs font-bold text-rose-600 hover:underline cursor-pointer ml-3 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Apagar Foto</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => handleDownload(selectedArtwork.title, selectedArtwork.dataUrl)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-5 py-2.5 rounded-2xl shadow-md cursor-pointer text-xs"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Desenho PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
