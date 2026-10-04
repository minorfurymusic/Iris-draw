import React, { useState, useRef } from 'react';
import { PortraitModelItem, PeopleFolder } from '../types';
import { FOLDER_CONFIGS, PORTRAIT_MODELS } from '../data/portraitModels';
import { 
  FolderOpen, 
  ArrowLeft, 
  Eye, 
  Download, 
  X, 
  Trash2, 
  BookOpen, 
  Image as ImageIcon,
  Columns,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';
import { 
  syncAllDriveDesenhos, 
  googleSignIn, 
  getAccessToken, 
  DEFAULT_DRIVE_FOLDER_ID,
  mapDriveFolderNameToKey,
  mergeColorAndPencilModels,
  extractModelBaseKey
} from '../utils/googleDrive';

interface FoldersModelCatalogProps {
  customModels: PortraitModelItem[];
  onAddNewCustomModel: (model: PortraitModelItem) => void;
  onDeleteCustomModel: (modelId: string) => void;
  onStartDrawingLesson: (model: PortraitModelItem) => void;
  onOpenGoogleDriveImport?: () => void;
  onBulkAddModels?: (models: PortraitModelItem[]) => void;
}

export const FoldersModelCatalog: React.FC<FoldersModelCatalogProps> = ({
  customModels,
  onDeleteCustomModel,
  onStartDrawingLesson,
  onOpenGoogleDriveImport,
  onBulkAddModels
}) => {
  // Navigation State
  const [selectedFolder, setSelectedFolder] = useState<PeopleFolder | null>(null);
  const [selectedModel, setSelectedModel] = useState<PortraitModelItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sync with Drive State
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Inspector View Mode: 'split' | 'single'
  const [viewMode, setViewMode] = useState<'split' | 'single'>('split');
  const [activeSingleView, setActiveSingleView] = useState<'color' | 'pb'>('pb');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // File Inputs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Delete modal
  const [modelToDelete, setModelToDelete] = useState<PortraitModelItem | null>(null);

  // All models (merged so that Original and Pencil photos become ONE single model!)
  const allModels = mergeColorAndPencilModels([...PORTRAIT_MODELS, ...customModels]);
  const [cardViews, setCardViews] = useState<Record<string, 'color' | 'pb'>>({});

  const currentFolderConfig = FOLDER_CONFIGS.find(f => f.id === selectedFolder);

  const folderModels = selectedFolder 
    ? allModels.filter(m => {
        const matchesFolder = m.folder === selectedFolder;
        const matchesSearch = !searchQuery || 
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFolder && matchesSearch;
      })
    : [];

  const handleSelectFolder = (folderId: PeopleFolder) => {
    soundManager.playPencilTap();
    setSelectedFolder(folderId);
    setSearchQuery('');
  };

  // Direct 1-click sync from Google Drive
  const handleQuickDriveSync = async () => {
    setIsSyncingDrive(true);
    setSyncError(null);
    setSyncStatusMsg('Verificando conexão com o Google Drive...');

    try {
      soundManager.playSparkle();
      const token = await getAccessToken();
      if (!token) {
        setSyncStatusMsg('Autorizando conta do Google...');
        const loginRes = await googleSignIn();
        if (!loginRes) {
          throw new Error('Login do Google não concluído.');
        }
      }

      setSyncStatusMsg('Lendo pasta e subpastas do link fornecido...');
      const models = await syncAllDriveDesenhos(DEFAULT_DRIVE_FOLDER_ID, (msg, cur, tot) => {
        setSyncStatusMsg(tot > 0 ? `${msg} (${cur}/${tot})` : msg);
      });

      if (models.length === 0) {
        setSyncStatusMsg('Nenhuma imagem encontrada na pasta vinculada.');
        setSyncError('Nenhum arquivo de imagem foi encontrado dentro da pasta do Google Drive ou o acesso precisa de permissão de visualização pública/compartilhada. Você também pode arrastar ou selecionar os arquivos diretamente abaixo.');
      } else {
        soundManager.playTrophyFanfare();
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#a855f7', '#3b82f6', '#10b981', '#f59e0b']
        });

        if (onBulkAddModels) {
          onBulkAddModels(models);
        }
        setSyncStatusMsg(`Sucesso! ${models.length} desenho(s) sincronizado(s) diretamente do Google Drive!`);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Falha ao sincronizar com Google Drive.';
      setSyncError(msg);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Local files processing (from drag & drop or direct folder selection)
  const processLocalFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(f.name));
    if (fileList.length === 0) return;

    soundManager.playSparkle();
    setSyncStatusMsg(`Lendo e agrupando ${fileList.length} arquivo(s)...`);

    // Group files by (folderKey + baseKey) to pair "Original Face XXX" and "Pencil Face XXX"
    const fileGroups: Record<string, {
      cleanName: string;
      folderKey: PeopleFolder;
      folderConfigTitle: string;
      colorFile?: File;
      pencilFile?: File;
    }> = {};

    for (const file of fileList) {
      const pathOrName = (file as any).webkitRelativePath || file.name;
      const folderKey = mapDriveFolderNameToKey(pathOrName);
      const folderConfig = FOLDER_CONFIGS.find(f => f.id === folderKey);
      const { baseKey, cleanName, isSketch } = extractModelBaseKey(file.name);
      const groupKey = `${folderKey}___${baseKey}`;

      if (!fileGroups[groupKey]) {
        fileGroups[groupKey] = {
          cleanName,
          folderKey,
          folderConfigTitle: folderConfig?.title || 'Desenho'
        };
      }

      if (isSketch) {
        fileGroups[groupKey].pencilFile = file;
      } else {
        fileGroups[groupKey].colorFile = file;
      }
    }

    const readFile = (file: File): Promise<string> => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    };

    const newModels: PortraitModelItem[] = [];
    const groupEntries = Object.entries(fileGroups);

    for (let i = 0; i < groupEntries.length; i++) {
      const [key, grp] = groupEntries[i];
      const colorTarget = grp.colorFile || grp.pencilFile;
      const pencilTarget = grp.pencilFile || grp.colorFile;

      if (!colorTarget) continue;

      const colorDataUrl = await readFile(colorTarget);
      let pencilDataUrl = colorDataUrl;

      if (pencilTarget && pencilTarget !== colorTarget) {
        pencilDataUrl = await readFile(pencilTarget);
      }

      newModels.push({
        id: `model-${grp.folderKey}-${Date.now()}-${i}-${grp.cleanName.toLowerCase().replace(/\s+/g, '-')}`,
        name: grp.cleanName,
        folder: grp.folderKey,
        folderLabel: grp.folderConfigTitle,
        gender: grp.folderKey.includes('homens') || grp.folderKey === 'meninos' ? 'masculino' : 'feminino',
        ageGroup: grp.folderKey.includes('idos') ? '3ª Idade' : grp.folderKey.includes('adolescentes') ? 'Jovem' : grp.folderKey.includes('menin') ? 'Infantil' : 'Adulto',
        description: `Par completo: foto original colorida e desenho realista a lápis.`,
        originalPhotoUrl: colorDataUrl,
        sketchSvgPBUrl: pencilDataUrl,
        difficulty: 'medio',
        paperTips: [
          'Observe as proporções na foto colorida e o traço na versão a lápis.',
          'Esboce no caderno com lápis HB bem leve.',
          'Aplique o lápis 2B para os traços e lápis 4B nas sombras profundas.'
        ],
        paperMaterials: ['Caderno de desenho', 'Lápis HB, 2B e 4B', 'Borracha macia'],
        tags: ['Google Drive', grp.folderConfigTitle],
        isCustom: true,
        dateAdded: 'Hoje'
      });
    }

    if (newModels.length > 0) {
      soundManager.playTrophyFanfare();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#ec4899', '#3b82f6', '#10b981']
      });

      if (onBulkAddModels) {
        onBulkAddModels(newModels);
      }
      setSyncStatusMsg(`Sucesso! ${newModels.length} modelo(s) completo(s) adicionados!`);
      setSyncError(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processLocalFiles(e.dataTransfer.files);
    }
  };

  const handleDownloadImage = (filename: string, url: string) => {
    soundManager.playSparkle();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const renderImagePreview = (model: PortraitModelItem, type: 'color' | 'pb') => {
    if (type === 'color') {
      const src = model.originalPhotoUrl || model.sketchSvgPBUrl;
      if (src) {
        return <img src={src} alt={model.name} className="max-h-full max-w-full object-contain rounded-xl" />;
      }
    } else {
      const src = model.sketchSvgPBUrl || model.originalPhotoUrl;
      if (src) {
        return <img src={src} alt={model.name} className="max-h-full max-w-full object-contain rounded-xl" />;
      }
    }
    return <div className="text-slate-400 text-xs">Sem imagem disponível</div>;
  };

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col gap-8 transition-colors ${
        isDragging ? 'bg-purple-50/80 ring-4 ring-purple-400 ring-dashed rounded-3xl' : ''
      }`}
    >
      {/* Hidden File Inputs for Direct Selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && processLocalFiles(e.target.files)}
        multiple
        accept="image/*,.heic"
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={(e) => e.target.files && processLocalFiles(e.target.files)}
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
      />

      {/* ========================================================= */}
      {/* 1. TOP HERO BANNER */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-fuchsia-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-purple-500/30 backdrop-blur-md px-3.5 py-1 rounded-full text-amber-300 font-bold text-xs uppercase tracking-wider mb-3">
            <Sparkles className="w-4 h-4" />
            <span>Google Drive • Pasta Vinculada</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-['Fredoka',sans-serif] font-bold leading-tight">
            Pastas de Desenhos do Drive 📂
          </h1>

          <p className="text-purple-100 text-sm sm:text-base leading-relaxed mt-2">
            Link vinculado: <a href="https://drive.google.com/drive/folders/1JKUU2xpo3rrhdPT-23ZhFW82eRxWzl03" target="_blank" rel="noreferrer" className="underline font-bold text-amber-300 hover:text-white inline-flex items-center gap-1">abrir no Google Drive <ExternalLink className="w-3.5 h-3.5" /></a>. Sem mudar nada e sem criar modelos artificiais — somente os seus desenhos e fotos reais!
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleQuickDriveSync}
              disabled={isSyncingDrive}
              className="flex items-center gap-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-500 text-amber-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-amber-400/25 transition active:scale-98 cursor-pointer text-sm sm:text-base disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncingDrive ? 'animate-spin' : ''}`} />
              <span>{isSyncingDrive ? 'Puxando do Drive...' : 'Puxar Desenhos Desta Pasta do Google Drive'}</span>
            </button>

            {/* Direct File / Folder Selector (100% Guaranteed Fallback) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 font-bold px-4 py-3.5 rounded-2xl transition cursor-pointer text-xs sm:text-sm backdrop-blur-md active:scale-98"
            >
              <Upload className="w-4 h-4 text-emerald-300" />
              <span>Selecionar Arquivos Baixados</span>
            </button>

            {onOpenGoogleDriveImport && (
              <button
                onClick={onOpenGoogleDriveImport}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white/90 border border-white/20 font-bold px-4 py-3.5 rounded-2xl transition cursor-pointer text-xs sm:text-sm backdrop-blur-md"
              >
                <FolderOpen className="w-4 h-4 text-amber-300" />
                <span>Opções Avançadas</span>
              </button>
            )}
          </div>

          {/* Sync Status Feedback */}
          {syncStatusMsg && (
            <div className="mt-3 text-xs bg-white/20 backdrop-blur-md text-amber-200 px-3.5 py-2 rounded-xl inline-flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`} />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {/* Sync Error Alert with Direct Help */}
          {syncError && (
            <div className="mt-4 bg-rose-500/90 text-white p-4 rounded-2xl text-xs space-y-2 border border-rose-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span className="font-semibold">{syncError}</span>
              </div>
              <div className="pt-2 border-t border-white/20 flex flex-wrap items-center gap-2">
                <a
                  href="https://drive.google.com/drive/folders/1JKUU2xpo3rrhdPT-23ZhFW82eRxWzl03"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white text-rose-900 font-bold px-3 py-1.5 rounded-xl hover:bg-amber-100 transition inline-flex items-center gap-1"
                >
                  <span>1. Abrir Pasta no Google Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-black px-3.5 py-1.5 rounded-xl transition cursor-pointer"
                >
                  2. Selecionar ou Arrastar as Fotos Aqui
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Counter */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl flex items-center gap-4 text-center">
          <div>
            <span className="block text-4xl sm:text-5xl font-['Fredoka',sans-serif] font-black text-amber-300">
              {allModels.length}
            </span>
            <span className="text-xs font-bold text-purple-200 uppercase tracking-wider block mt-1">
              Imagens Carregadas
            </span>
          </div>
          <div className="text-4xl animate-bounce">🎨</div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. BREADCRUMB / NAVIGATION */}
      {/* ========================================================= */}
      {selectedFolder && currentFolderConfig && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundManager.playPencilTap();
                setSelectedFolder(null);
              }}
              className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold px-4 py-2.5 rounded-xl transition cursor-pointer text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para todas as Pastas</span>
            </button>

            <span className="text-slate-300">|</span>

            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentFolderConfig.icon}</span>
              <div>
                <span className="font-['Fredoka',sans-serif] font-bold text-base text-purple-950 block">
                  Pasta: {currentFolderConfig.title}
                </span>
                <span className="text-xs text-slate-500">
                  {folderModels.length} {folderModels.length === 1 ? 'desenho' : 'desenhos'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nesta pasta..."
                className="pl-9 pr-3 py-2 text-xs rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 w-40 sm:w-56"
              />
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Adicionar Fotos</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. VIEW: THE 8 FOLDERS OVERVIEW */}
      {/* ========================================================= */}
      {!selectedFolder ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-['Fredoka',sans-serif] font-bold text-purple-950">
                Pastas de Desenhos (Google Drive) 📂
              </h2>
              <p className="text-sm text-slate-600">
                Imagens organizadas nas 8 categorias. Sem modelos artificiais!
              </p>
            </div>
          </div>

          {/* Empty State when no models have been pulled yet */}
          {allModels.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-purple-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-xs">
              <div className="w-20 h-20 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-4xl mb-4">
                📂
              </div>
              <h3 className="text-2xl font-['Fredoka',sans-serif] font-bold text-purple-950 mb-2">
                Traga os seus desenhos do Drive
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Clique no botão para conectar ao Google Drive ou selecione/arraste os arquivos baixados da pasta para a tela.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                <button
                  onClick={handleQuickDriveSync}
                  disabled={isSyncingDrive}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-purple-300 transition active:scale-98 cursor-pointer text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                  <span>{isSyncingDrive ? 'Puxando do Drive...' : '1. Puxar Direto do Google Drive'}</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md transition active:scale-98 cursor-pointer text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>2. Ou Selecionar Fotos/Arquivos</span>
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-400">
                <span>Dica: Você também pode arrastar e soltar as imagens diretamente nesta tela!</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {FOLDER_CONFIGS.map((folder) => {
                const count = allModels.filter(m => m.folder === folder.id).length;
                return (
                  <div
                    key={folder.id}
                    onClick={() => handleSelectFolder(folder.id)}
                    className="bg-white rounded-3xl border-2 border-purple-100 hover:border-purple-300 p-6 flex flex-col justify-between gap-4 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group relative overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${folder.color} opacity-10 rounded-bl-full group-hover:scale-110 transition-transform`} />

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                          {folder.icon}
                        </div>
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                          count > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {count} {count === 1 ? 'desenho' : 'desenhos'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-['Fredoka',sans-serif] font-bold text-xl text-purple-950 group-hover:text-purple-700 transition">
                          {folder.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                          {folder.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-purple-50 flex items-center justify-between text-xs font-bold text-purple-700">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="w-4 h-4 text-purple-500" />
                        <span>Abrir Pasta</span>
                      </span>
                      <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* 4. VIEW: IMAGES INSIDE THE SELECTED FOLDER */
        /* ========================================================= */
        <div className="flex flex-col gap-6">
          {folderModels.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-purple-200 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
              <span className="text-5xl mb-3">📁</span>
              <h3 className="font-['Fredoka',sans-serif] font-bold text-xl text-purple-950 mb-1">
                Nenhuma imagem nesta pasta ainda
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Puxe do Google Drive ou adicione imagens para a pasta {currentFolderConfig?.title}.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleQuickDriveSync}
                  disabled={isSyncingDrive}
                  className="flex items-center gap-2 bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                  <span>Sincronizar do Drive</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Adicionar Arquivo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {folderModels.map((model) => {
                const activeView = cardViews[model.id] || 'color';
                const hasBoth = Boolean(model.originalPhotoUrl && model.sketchSvgPBUrl && model.originalPhotoUrl !== model.sketchSvgPBUrl);

                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      soundManager.playSparkle();
                      setSelectedModel(model);
                    }}
                    className="bg-white rounded-3xl border-2 border-purple-100 hover:border-purple-300 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer hover:-translate-y-1"
                  >
                    <div className="relative aspect-4/3 bg-slate-50 flex items-center justify-center p-3 border-b border-purple-100 overflow-hidden">
                      {renderImagePreview(model, activeView)}

                      <div className="absolute top-3 left-3 bg-purple-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-amber-300" />
                        <span>{activeView === 'color' ? 'Foto Colorida' : 'Desenho a Lápis'}</span>
                      </div>

                      <div className="absolute inset-0 bg-purple-950/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="bg-white text-purple-950 font-bold text-xs px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2">
                          <Eye className="w-4 h-4 text-purple-600" />
                          <span>Ver Foto + Desenho Lado a Lado</span>
                        </span>
                      </div>
                    </div>

                    {/* Dual Toggle Bar right on the Card */}
                    {hasBoth && (
                      <div className="flex items-center justify-between px-3.5 py-2 bg-purple-50/70 border-b border-purple-100 text-[11px] font-bold">
                        <span className="text-purple-900 flex items-center gap-1 text-[11px]">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>1 Modelo (2 Versões)</span>
                        </span>
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-purple-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              soundManager.playPencilTap();
                              setCardViews(prev => ({ ...prev, [model.id]: 'color' }));
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              activeView === 'color' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-purple-700'
                            }`}
                          >
                            📸 Foto
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              soundManager.playPencilTap();
                              setCardViews(prev => ({ ...prev, [model.id]: 'pb' }));
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              activeView === 'pb' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:text-purple-700'
                            }`}
                          >
                            ✏️ P&B
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-['Fredoka',sans-serif] font-bold text-base text-purple-950 line-clamp-1">
                          {model.name}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-1">
                        {hasBoth ? 'Foto colorida + desenho realista preto e branco.' : model.description}
                      </p>

                      <div className="pt-2 border-t border-purple-50 flex items-center justify-between text-xs">
                        <span className="text-purple-700 font-bold flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Desenhar no Papel</span>
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundManager.playPencilTap();
                            setModelToDelete(model);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. INSPECTOR MODAL: SHOWS PHOTO AND DRAWING */}
      {/* ========================================================= */}
      {selectedModel && (
        <div 
          onClick={() => setSelectedModel(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-8 flex flex-col gap-6 shadow-2xl relative my-auto border border-purple-200"
          >
            <button
              onClick={() => setSelectedModel(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {selectedModel.folderLabel}
              </span>
              <h2 className="text-2xl sm:text-3xl font-['Fredoka',sans-serif] font-bold text-purple-950 mt-1">
                {selectedModel.name}
              </h2>
            </div>

            {/* View Mode Selector Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-50 p-2.5 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewMode('split')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    viewMode === 'split' ? 'bg-purple-700 text-white shadow-xs' : 'bg-white text-purple-900 border border-purple-200'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Lado a Lado</span>
                </button>
                <button
                  onClick={() => setViewMode('single')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    viewMode === 'single' ? 'bg-purple-700 text-white shadow-xs' : 'bg-white text-purple-900 border border-purple-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Alternar Foto / Desenho</span>
                </button>
              </div>
            </div>

            {/* Image Display */}
            {viewMode === 'split' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Foto / Imagem Original</span>
                  </span>
                  <div className="w-full aspect-4/3 bg-slate-50 rounded-2xl border-2 border-purple-100 flex items-center justify-center p-3 overflow-hidden shadow-inner">
                    {renderImagePreview(selectedModel, 'color')}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Versão em Desenho</span>
                  </span>
                  <div className="w-full aspect-4/3 bg-[#faf8f5] rounded-2xl border-2 border-purple-300 flex items-center justify-center p-3 overflow-hidden shadow-inner">
                    {renderImagePreview(selectedModel, 'pb')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setActiveSingleView('color')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeSingleView === 'color' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    📸 Foto Original
                  </button>
                  <button
                    onClick={() => setActiveSingleView('pb')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeSingleView === 'pb' ? 'bg-purple-700 text-white shadow-md' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    ✏️ Versão em Desenho
                  </button>
                </div>

                <div className="w-full aspect-4/3 max-h-[380px] bg-[#faf8f5] rounded-2xl border-2 border-purple-200 flex items-center justify-center p-3 overflow-hidden shadow-inner mx-auto">
                  {renderImagePreview(selectedModel, activeSingleView)}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-purple-100">
              <button
                onClick={() => setSelectedModel(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 p-2 cursor-pointer"
              >
                Fechar
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {selectedModel.originalPhotoUrl && (
                  <button
                    onClick={() => handleDownloadImage(`${selectedModel.name}`, selectedModel.originalPhotoUrl!)}
                    className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold px-4 py-2.5 rounded-xl border border-purple-200 text-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Imagem</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    soundManager.playTrophyFanfare();
                    onStartDrawingLesson(selectedModel);
                    setSelectedModel(null);
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-800 hover:from-purple-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition active:scale-98 cursor-pointer text-xs sm:text-sm"
                >
                  <BookOpen className="w-4 h-4 text-amber-300" />
                  <span>Desenhar no Meu Caderno! 📖</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. IN-APP CONFIRM DELETE MODAL */}
      {/* ========================================================= */}
      {modelToDelete && (
        <div 
          onClick={() => setModelToDelete(null)}
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
                Remover Desenho?
              </h3>
              <p className="text-xs text-slate-600 mt-2">
                Deseja remover <strong>"{modelToDelete.name}"</strong> da visualização?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setModelToDelete(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  soundManager.playSparkle();
                  onDeleteCustomModel(modelToDelete.id);
                  setModelToDelete(null);
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
