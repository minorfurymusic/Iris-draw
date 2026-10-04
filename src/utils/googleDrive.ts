import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { PeopleFolder, PortraitModelItem } from '../types';
import { FOLDER_CONFIGS } from '../data/portraitModels';

export const DEFAULT_DRIVE_FOLDER_ID = '1JKUU2xpo3rrhdPT-23ZhFW82eRxWzl03';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Google Drive scope
export const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro de login com Google Drive:', error);
    if (error?.code === 'auth/unauthorized-domain') {
      throw new Error('Domínio não autorizado pelo Firebase. Você pode importar a pasta/arquivos baixados diretamente pelo botão "Selecionar Arquivos Baixados".');
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('O navegador bloqueou o popup do Google. Habilite popups para continuar ou use o botão de importação direta de arquivos.');
    }
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('A janela do Google foi fechada antes de autorizar.');
    }
    throw new Error(error?.message || 'Falha ao autenticar com o Google.');
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export interface DriveFolder {
  id: string;
  name: string;
  parents?: string[];
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  size?: string;
  createdTime?: string;
  dataUrl?: string;
}

/**
 * Fetch a folder directly by ID with supportsAllDrives
 */
export async function getFolderById(folderId: string): Promise<DriveFolder | null> {
  const token = await getAccessToken();
  if (!token) throw new Error('Usuário não autenticado.');

  const url = `https://www.googleapis.com/drive/v3/files/${folderId}?supportsAllDrives=true&fields=id,name,parents,mimeType`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    return null;
  }

  return await res.json();
}

/**
 * Search Google Drive for a folder by name
 */
export async function findDriveFolders(folderName: string, parentId?: string): Promise<DriveFolder[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Usuário não autenticado no Google Drive.');

  let q = `mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (folderName) {
    q += ` and name contains '${folderName.replace(/'/g, "\\'")}'`;
  }
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,parents)&pageSize=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erro ao buscar pastas no Drive: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * List all subfolders directly inside a parent folder
 */
export async function getSubfolders(parentFolderId: string): Promise<DriveFolder[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Usuário não autenticado.');

  const q = `mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,parents)&pageSize=50&orderBy=name`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erro ao buscar subpastas: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Find the specific folder by ID or name
 */
export async function locateDesenhoFolder(targetFolderId: string = DEFAULT_DRIVE_FOLDER_ID): Promise<{ pessoalFolder?: DriveFolder; desenhoFolder?: DriveFolder }> {
  if (targetFolderId) {
    try {
      const directFolder = await getFolderById(targetFolderId);
      if (directFolder) {
        return { desenhoFolder: directFolder };
      }
    } catch {
      // Continue
    }
  }

  const pessoalFolders = await findDriveFolders('pessoal');
  let targetPessoal: DriveFolder | undefined = pessoalFolders[0];

  if (targetPessoal) {
    const desenhoInside = await findDriveFolders('desenho', targetPessoal.id);
    if (desenhoInside.length > 0) {
      return { pessoalFolder: targetPessoal, desenhoFolder: desenhoInside[0] };
    }
  }

  const allDesenho = await findDriveFolders('desenho');
  if (allDesenho.length > 0) {
    return { pessoalFolder: targetPessoal, desenhoFolder: allDesenho[0] };
  }

  return { pessoalFolder: targetPessoal };
}

/**
 * List files inside a specific folder
 */
export async function listImagesInFolder(folderId?: string, limit = 200): Promise<DriveFileItem[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Usuário não autenticado.');

  let q = `mimeType != 'application/vnd.google-apps.folder' and trashed = false`;
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,size,createdTime)&pageSize=${limit}&orderBy=name`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erro ao listar imagens: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Download a file content as a Data URL (base64)
 */
export async function downloadDriveFileAsDataUrl(fileId: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Usuário não autenticado.');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Erro ao baixar imagem do Drive (ID: ${fileId})`);
  }

  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extracts the base model name and identifies whether it is the pencil/sketch or the original photo
 * Handles: "Original Face 0666", "Pencil Face 0666", "Face 0666 Original", etc.
 */
export function extractModelBaseKey(filename: string): { baseKey: string; cleanName: string; isSketch: boolean } {
  // 1. Remove extension
  const withoutExt = filename.replace(/\.[^/.]+$/, '').trim();

  // 2. Identify if it's the pencil sketch / drawing
  const lower = withoutExt.toLowerCase();
  const isSketch = 
    /\b(pencil|desenho|pb|sketch|lapis|preto[-_]e[-_]branco|bw|lineart)\b/i.test(lower) ||
    /^(pencil|desenho|pb|sketch|lapis)[-_\s]/i.test(withoutExt) ||
    /[-_\s](pencil|desenho|pb|sketch|lapis)$/i.test(withoutExt);

  // 3. Strip prefix identifiers
  let clean = withoutExt
    .replace(/^(original|pencil|sketch|desenho|pb|foto|colorida?|real|bw|lineart)[\s\-_]+/i, '')
    .trim();

  // 4. Strip suffix identifiers
  clean = clean
    .replace(/[\s\-_]+(original|pencil|sketch|desenho|pb|foto|colorida?|real|bw|lineart)$/i, '')
    .trim();

  const cleanName = clean || withoutExt;
  const baseKey = cleanName.toLowerCase().replace(/[\s\-_]+/g, '');

  return { baseKey, cleanName, isSketch };
}

/**
 * Merges separate "Original" and "Pencil" entries so they are ONE SINGLE ITEM!
 * "são 2 fotos, uma colorida e uma preto e branca. As duas são uma coisa só"
 */
export function mergeColorAndPencilModels(models: PortraitModelItem[]): PortraitModelItem[] {
  const groups: Record<string, {
    baseName: string;
    folder: PeopleFolder;
    folderLabel: string;
    gender: string;
    ageGroup: string;
    colorUrl?: string;
    pencilUrl?: string;
    item?: PortraitModelItem;
  }> = {};

  for (const m of models) {
    const { baseKey, cleanName, isSketch } = extractModelBaseKey(m.name);
    // Group by folder and unified baseKey (e.g. "meninos_face0666")
    const groupKey = `${m.folder}___${baseKey}`;

    if (!groups[groupKey]) {
      groups[groupKey] = {
        baseName: cleanName,
        folder: m.folder,
        folderLabel: m.folderLabel,
        gender: m.gender,
        ageGroup: m.ageGroup,
        item: m
      };
    }

    if (isSketch) {
      groups[groupKey].pencilUrl = m.sketchSvgPBUrl || m.originalPhotoUrl;
    } else {
      groups[groupKey].colorUrl = m.originalPhotoUrl || m.sketchSvgPBUrl;
    }
  }

  return Object.values(groups).map((grp, index) => {
    const colorUrl = grp.colorUrl || grp.pencilUrl || '';
    const pencilUrl = grp.pencilUrl || grp.colorUrl || '';
    const baseItem = grp.item!;

    return {
      ...baseItem,
      id: `model-${grp.folder}-${index}-${grp.baseName.replace(/\s+/g, '-').toLowerCase()}`,
      name: grp.baseName,
      originalPhotoUrl: colorUrl,
      sketchSvgPBUrl: pencilUrl,
      description: `Par completo: foto original colorida e desenho realista a lápis.`
    };
  });
}

/**
 * Maps a folder name or file name from Google Drive to our system folder key
 */
export function mapDriveFolderNameToKey(name: string): PeopleFolder {
  const lower = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (lower.includes('menino') || lower.includes('garoto') || lower.includes('boy') || lower.includes('infantil h')) return 'meninos';
  if (lower.includes('menina') || lower.includes('garota') || lower.includes('girl') || lower.includes('iris') || lower.includes('infantil m')) return 'meninas';
  if (lower.includes('adolescente') && (lower.includes('hom') || lower.includes('rapaz') || lower.includes('masc'))) return 'adolescentes_homens';
  if (lower.includes('adolescente') && (lower.includes('mul') || lower.includes('moca') || lower.includes('fem'))) return 'adolescentes_mulheres';
  if (lower.includes('rapaz') || lower.includes('jovem h')) return 'adolescentes_homens';
  if (lower.includes('moca') || lower.includes('jovem m')) return 'adolescentes_mulheres';
  if (lower.includes('idoso') && (lower.includes('hom') || lower.includes('vovo') || lower.includes('senhor'))) return 'idosos_homens';
  if (lower.includes('idos') && (lower.includes('mul') || lower.includes('vova') || lower.includes('senhora'))) return 'idosas_mulheres';
  if (lower.includes('vovo') || lower.includes('vovô')) return 'idosos_homens';
  if (lower.includes('vova') || lower.includes('vovó')) return 'idosas_mulheres';
  if (lower.includes('homem') || lower.includes('homens') || lower.includes('pai') || lower.includes('adulto h')) return 'homens';
  if (lower.includes('mulher') || lower.includes('mulheres') || lower.includes('mae') || lower.includes('mãe') || lower.includes('adulta m')) return 'mulheres';

  return 'meninas';
}

/**
 * Scan entire target folder in Google Drive and pull all real models and files!
 * Pairs up "Original Face XXX" and "Pencil Face XXX" into ONE single model item!
 */
export async function syncAllDriveDesenhos(
  targetFolderId: string = DEFAULT_DRIVE_FOLDER_ID,
  onProgress?: (msg: string, current: number, total: number) => void
): Promise<PortraitModelItem[]> {
  if (onProgress) onProgress('Acessando pasta do Google Drive...', 0, 1);
  const { desenhoFolder } = await locateDesenhoFolder(targetFolderId);

  const folderToUseId = desenhoFolder?.id || targetFolderId;
  const folderToUseName = desenhoFolder?.name || 'Desenhos';

  if (onProgress) onProgress(`Lendo pastas dentro de "${folderToUseName}"...`, 0, 1);
  const subfolders = await getSubfolders(folderToUseId).catch(() => []);

  // Collect all files across subfolders and root
  const allCollectedFiles: { file: DriveFileItem; folderKey: PeopleFolder; folderLabel: string }[] = [];

  if (subfolders.length > 0) {
    for (let fIdx = 0; fIdx < subfolders.length; fIdx++) {
      const folder = subfolders[fIdx];
      const folderKey = mapDriveFolderNameToKey(folder.name);
      if (onProgress) {
        onProgress(`Buscando imagens na pasta "${folder.name}" (${fIdx + 1}/${subfolders.length})...`, fIdx, subfolders.length);
      }
      const files = await listImagesInFolder(folder.id, 100).catch(() => []);
      files.forEach(f => allCollectedFiles.push({ file: f, folderKey, folderLabel: folder.name }));
    }
  }

  // Also root files
  const rootFiles = await listImagesInFolder(folderToUseId, 200).catch(() => []);
  rootFiles.forEach(f => {
    const folderKey = mapDriveFolderNameToKey(f.name);
    allCollectedFiles.push({ file: f, folderKey, folderLabel: 'Google Drive' });
  });

  if (allCollectedFiles.length === 0) {
    return [];
  }

  // GROUP files by (folderKey + baseKey) to pair Original and Pencil
  const fileGroups: Record<string, {
    cleanName: string;
    folderKey: PeopleFolder;
    folderLabel: string;
    colorFile?: DriveFileItem;
    pencilFile?: DriveFileItem;
  }> = {};

  for (const { file, folderKey, folderLabel } of allCollectedFiles) {
    const { baseKey, cleanName, isSketch } = extractModelBaseKey(file.name);
    const groupKey = `${folderKey}___${baseKey}`;

    if (!fileGroups[groupKey]) {
      fileGroups[groupKey] = {
        cleanName,
        folderKey,
        folderLabel
      };
    }

    if (isSketch) {
      fileGroups[groupKey].pencilFile = file;
    } else {
      fileGroups[groupKey].colorFile = file;
    }
  }

  const groupEntries = Object.entries(fileGroups);
  const resultModels: PortraitModelItem[] = [];

  for (let i = 0; i < groupEntries.length; i++) {
    const [groupKey, grp] = groupEntries[i];
    if (onProgress) {
      onProgress(`Baixando ${grp.cleanName} (${i + 1}/${groupEntries.length})...`, i + 1, groupEntries.length);
    }

    const colorTarget = grp.colorFile || grp.pencilFile;
    const pencilTarget = grp.pencilFile || grp.colorFile;

    if (!colorTarget) continue;

    const colorDataUrl = await downloadDriveFileAsDataUrl(colorTarget.id);
    let pencilDataUrl = colorDataUrl;

    if (pencilTarget && pencilTarget.id !== colorTarget.id) {
      pencilDataUrl = await downloadDriveFileAsDataUrl(pencilTarget.id);
    }

    const folderConfig = FOLDER_CONFIGS.find(f => f.id === grp.folderKey);

    resultModels.push({
      id: `drive-model-${colorTarget.id}`,
      name: grp.cleanName,
      folder: grp.folderKey,
      folderLabel: folderConfig?.title || grp.folderLabel,
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
      tags: ['Google Drive', folderConfig?.title || 'Drive'],
      isCustom: true,
      dateAdded: 'Google Drive'
    });
  }

  return resultModels;
}
