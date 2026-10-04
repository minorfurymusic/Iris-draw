import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  initAuth, 
  logoutGoogle, 
  locateDesenhoFolder, 
  listImagesInFolder, 
  getSubfolders,
  downloadDriveFileAsDataUrl, 
  mapDriveFolderNameToKey,
  DEFAULT_DRIVE_FOLDER_ID,
  DriveFolder, 
  DriveFileItem 
} from '../utils/googleDrive';
import { PeopleFolder, PortraitModelItem } from '../types';
import { FOLDER_CONFIGS } from '../data/portraitModels';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  FolderOpen, 
  X, 
  Sparkles, 
  RefreshCw, 
  LogOut, 
  CheckSquare,
  Square,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface GoogleDriveImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted: (importedModels: PortraitModelItem[]) => void;
}

interface FileClassificationItem {
  file: DriveFileItem;
  selected: boolean;
  targetFolder: PeopleFolder;
}

export const GoogleDriveImporterModal: React.FC<GoogleDriveImporterModalProps> = ({
  isOpen,
  onClose,
  onImportCompleted
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Folder URL / ID input - initialized with user's exact link
  const [folderInput, setFolderInput] = useState<string>('https://drive.google.com/drive/folders/1JKUU2xpo3rrhdPT-23ZhFW82eRxWzl03');
  const [isSearchingFolder, setIsSearchingFolder] = useState<boolean>(false);
  const [currentFolder, setCurrentFolder] = useState<DriveFolder | null>(null);

  // Files State
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [driveItems, setDriveItems] = useState<FileClassificationItem[]>([]);
  const [batchTargetFolder, setBatchTargetFolder] = useState<PeopleFolder>('meninas');

  // Import Progress
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; filename: string }>({
    current: 0,
    total: 0,
    filename: ''
  });

  // Track Auth
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setAuthError(null);
      },
      () => {
        setToken(null);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  // When token is available, search for folder
  useEffect(() => {
    if (token) {
      handleSearchFolder();
    }
  }, [token]);

  const handleLogin = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      soundManager.playSparkle();
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Falha no login com Google Drive.';
      setAuthError(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    soundManager.playPencilTap();
    await logoutGoogle();
    setUser(null);
    setToken(null);
    setDriveItems([]);
    setCurrentFolder(null);
  };

  const extractFolderId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed || DEFAULT_DRIVE_FOLDER_ID;
  };

  const handleSearchFolder = async () => {
    setIsSearchingFolder(true);
    setAuthError(null);
    try {
      const folderId = extractFolderId(folderInput);
      const { desenhoFolder } = await locateDesenhoFolder(folderId);
      setCurrentFolder(desenhoFolder || null);

      const targetId = desenhoFolder?.id || folderId;
      await loadImagesFromFolder(targetId);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Erro ao localizar pastas no Google Drive.';
      setAuthError(msg);
    } finally {
      setIsSearchingFolder(false);
    }
  };

  const loadImagesFromFolder = async (folderId: string) => {
    setIsLoadingFiles(true);
    try {
      // 1. Direct files in this folder
      const directFiles = await listImagesInFolder(folderId, 100);

      // 2. Subfolders inside this folder
      const subfolders = await getSubfolders(folderId);
      const allFilesWithFolder: { file: DriveFileItem; subfolderName?: string }[] = directFiles.map(f => ({ file: f }));

      for (const sub of subfolders) {
        const subFiles = await listImagesInFolder(sub.id, 50);
        subFiles.forEach(f => {
          allFilesWithFolder.push({ file: f, subfolderName: sub.name });
        });
      }

      const classified: FileClassificationItem[] = allFilesWithFolder.map(({ file, subfolderName }) => {
        const target: PeopleFolder = mapDriveFolderNameToKey(subfolderName || file.name);
        return {
          file,
          selected: true,
          targetFolder: target
        };
      });

      setDriveItems(classified);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Erro ao carregar imagens do Drive.';
      setAuthError(msg);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleToggleSelectAll = (select: boolean) => {
    setDriveItems(prev => prev.map(item => ({ ...item, selected: select })));
  };

  const handleApplyBatchFolder = () => {
    soundManager.playPencilTap();
    setDriveItems(prev => prev.map(item => item.selected ? { ...item, targetFolder: batchTargetFolder } : item));
  };

  const handleImportSelected = async () => {
    const selectedItems = driveItems.filter(i => i.selected);
    if (selectedItems.length === 0) return;

    setIsImporting(true);
    soundManager.playSparkle();

    const importedModels: PortraitModelItem[] = [];

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setImportProgress({
        current: i + 1,
        total: selectedItems.length,
        filename: item.file.name
      });

      try {
        // Download exact file from Drive - sem mudar nada, sem criar nada
        const exactDataUrl = await downloadDriveFileAsDataUrl(item.file.id);

        const folderConfig = FOLDER_CONFIGS.find(f => f.id === item.targetFolder);
        const cleanName = item.file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        const model: PortraitModelItem = {
          id: `drive-model-${item.file.id}`,
          name: cleanName,
          folder: item.targetFolder,
          folderLabel: folderConfig?.title || 'Google Drive',
          gender: item.targetFolder.includes('homens') || item.targetFolder === 'meninos' ? 'masculino' : 'feminino',
          ageGroup: item.targetFolder.includes('idos') ? '3ª Idade' : item.targetFolder.includes('adolescentes') ? 'Jovem' : item.targetFolder.includes('menin') ? 'Infantil' : 'Adulto',
          description: `Imagem trazida diretamente do seu Google Drive.`,
          originalPhotoUrl: exactDataUrl,
          sketchSvgPBUrl: exactDataUrl,
          difficulty: 'medio',
          paperTips: [
            'Observe atentamente as linhas de luz e sombra no papel.',
            'Trace as formas principais no caderno com lápis HB.',
            'Finalize os contornos com lápis 2B e as sombras com lápis 4B.'
          ],
          paperMaterials: ['Caderno de desenho', 'Lápis HB, 2B e 4B', 'Borracha macia'],
          tags: ['Google Drive', folderConfig?.title || 'Drive'],
          isCustom: true,
          dateAdded: 'Google Drive'
        };

        importedModels.push(model);
      } catch (err) {
        console.error(`Falha ao importar ${item.file.name}:`, err);
      }
    }

    setIsImporting(false);

    soundManager.playTrophyFanfare();
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
    });

    onImportCompleted(importedModels);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-8 flex flex-col gap-6 shadow-2xl relative my-auto border border-purple-200">
        
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isImporting}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-1">
            <span>Google Drive Conectado</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-['Fredoka',sans-serif] font-bold text-purple-950">
            Puxar Desenhos do Google Drive 📂
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Importando as imagens originais diretamente da pasta compartilhada, mantendo seus arquivos intactos!
          </p>
        </div>

        {/* Folder Link Bar */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Link da Pasta do Google Drive:
            </label>
            <input
              type="text"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              placeholder="Cole o link ou ID da pasta do Drive..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {user && (
            <button
              onClick={handleSearchFolder}
              disabled={isSearchingFolder || isLoadingFiles}
              className="w-full sm:w-auto bg-purple-700 hover:bg-purple-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSearchingFolder || isLoadingFiles ? 'animate-spin' : ''}`} />
              <span>Carregar Pasta</span>
            </button>
          )}
        </div>

        {/* Auth Error Banner */}
        {authError && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-3">
            <span>{authError}</span>
            <button
              onClick={() => setAuthError(null)}
              className="text-rose-900 font-bold hover:underline cursor-pointer"
            >
              OK
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 1: AUTHENTICATION IF NOT SIGNED IN */}
        {/* ========================================================= */}
        {!user || !token ? (
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border border-blue-200 flex flex-col items-center justify-center text-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-md flex items-center justify-center text-4xl">
              📁
            </div>
            
            <div className="max-w-md">
              <h3 className="font-['Fredoka',sans-serif] font-bold text-xl text-purple-950 mb-1">
                Conectar Conta Google
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Autorize o acesso para o Ateliê da Iris ler os arquivos da pasta vinculada do seu Google Drive.
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={isSigningIn}
              className="flex items-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3.5 rounded-2xl border border-slate-300 shadow-md transition hover:shadow-lg active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>{isSigningIn ? 'Conectando ao Google...' : 'Entrar com o Google'}</span>
            </button>
          </div>
        ) : (
          /* ========================================================= */
          /* STEP 2: LOGGED IN - FOLDER STATUS & IMAGE SELECTION */
          /* ========================================================= */
          <div className="flex flex-col gap-5">
            {/* Account Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-50/70 p-3.5 rounded-2xl border border-purple-100 text-xs">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-purple-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold">
                    {user.displayName?.[0] || 'U'}
                  </div>
                )}
                <div>
                  <span className="font-bold text-purple-950 block">{user.displayName || 'Usuário Google'}</span>
                  <span className="text-slate-500 text-[11px]">{user.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://drive.google.com/drive/folders/${extractFolderId(folderInput)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-purple-700 hover:underline font-bold px-2 py-1 text-xs"
                >
                  <span>Abrir no Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-xl hover:bg-white cursor-pointer font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>

            {/* Folder Found Banner */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl">
                  📁
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Fredoka',sans-serif] font-bold text-sm text-emerald-950">
                      Pasta Vinculada:
                    </span>
                    <span className="bg-emerald-200 text-emerald-900 font-black text-xs px-2.5 py-0.5 rounded-full">
                      {currentFolder?.name || 'Desenhos'} ✓
                    </span>
                  </div>
                  <span className="text-xs text-emerald-800">
                    {driveItems.length} {driveItems.length === 1 ? 'desenho/foto encontrada' : 'desenhos/fotos encontradas'} pronta(s) para trazer
                  </span>
                </div>
              </div>
            </div>

            {/* Batch Action Toolbar */}
            {driveItems.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleSelectAll(true)}
                    className="flex items-center gap-1 font-bold text-purple-800 hover:underline cursor-pointer"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Selecionar Todas ({driveItems.length})</span>
                  </button>
                  <button
                    onClick={() => handleToggleSelectAll(false)}
                    className="flex items-center gap-1 font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    <Square className="w-4 h-4" />
                    <span>Desmarcar Todas</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">Pasta de destino:</span>
                  <select
                    value={batchTargetFolder}
                    onChange={(e) => setBatchTargetFolder(e.target.value as PeopleFolder)}
                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-xs text-purple-900 focus:outline-none"
                  >
                    {FOLDER_CONFIGS.map(f => (
                      <option key={f.id} value={f.id}>{f.icon} {f.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleApplyBatchFolder}
                    className="bg-purple-700 text-white font-bold px-3 py-1.5 rounded-xl hover:bg-purple-800 cursor-pointer"
                  >
                    Aplicar a Todas
                  </button>
                </div>
              </div>
            )}

            {/* Images List */}
            {isLoadingFiles ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-purple-700">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="font-bold text-sm">Lendo arquivos da pasta do Google Drive...</span>
              </div>
            ) : driveItems.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                Nenhuma imagem encontrada na pasta especificada. Verifique se há arquivos de imagem (PNG, JPEG) nesta pasta do Google Drive.
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {driveItems.map((item, idx) => (
                  <div
                    key={item.file.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      item.selected ? 'bg-purple-50/50 border-purple-300' : 'bg-white border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setDriveItems(prev => prev.map((it, i) => i === idx ? { ...it, selected: checked } : it));
                        }}
                        className="w-4 h-4 accent-purple-600 cursor-pointer"
                      />

                      {item.file.thumbnailLink ? (
                        <img
                          src={item.file.thumbnailLink}
                          alt="thumb"
                          className="w-12 h-12 object-cover rounded-xl border border-purple-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-xl">
                          🖼️
                        </div>
                      )}

                      <div className="flex flex-col">
                        <span className="font-bold text-purple-950 text-xs sm:text-sm line-clamp-1">
                          {item.file.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.file.size ? `${(Number(item.file.size) / (1024 * 1024)).toFixed(2)} MB` : 'Imagem'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 hidden sm:inline">Pasta:</span>
                      <select
                        value={item.targetFolder}
                        disabled={!item.selected}
                        onChange={(e) => {
                          const val = e.target.value as PeopleFolder;
                          setDriveItems(prev => prev.map((it, i) => i === idx ? { ...it, targetFolder: val } : it));
                        }}
                        className="bg-white border border-purple-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-purple-900 focus:outline-none cursor-pointer"
                      >
                        {FOLDER_CONFIGS.map(f => (
                          <option key={f.id} value={f.id}>{f.icon} {f.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Progress Bar during Import */}
            {isImporting && (
              <div className="bg-purple-100/70 border border-purple-300 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                    <span>Baixando imagem do Drive: {importProgress.filename}</span>
                  </span>
                  <span>{importProgress.current} de {importProgress.total}</span>
                </div>
                <div className="w-full bg-white h-3 rounded-full overflow-hidden border border-purple-200">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-fuchsia-600 h-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-purple-100">
              <button
                onClick={onClose}
                disabled={isImporting}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handleImportSelected}
                disabled={isImporting || driveItems.filter(i => i.selected).length === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-800 hover:from-purple-800 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-purple-200 transition active:scale-98 cursor-pointer text-xs sm:text-sm disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  {isImporting
                    ? 'Trazendo do Drive...'
                    : `Trazer ${driveItems.filter(i => i.selected).length} Foto(s) para o Sistema`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
