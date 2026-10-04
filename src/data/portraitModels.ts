import { PortraitModelItem, FolderConfig } from '../types';

export const FOLDER_CONFIGS: FolderConfig[] = [
  {
    id: 'meninos',
    title: 'Meninos',
    subtitle: 'Garotinhos',
    icon: '👦',
    color: 'from-blue-600 to-indigo-700',
    badge: 'Garotinhos',
    description: 'Pasta de meninos trazida diretamente do seu Google Drive.'
  },
  {
    id: 'meninas',
    title: 'Meninas',
    subtitle: 'Garotinhas',
    icon: '👧',
    color: 'from-pink-500 to-rose-600',
    badge: 'Garotinhas',
    description: 'Pasta de meninas trazida diretamente do seu Google Drive.'
  },
  {
    id: 'adolescentes_homens',
    title: 'Adolescentes Homens',
    subtitle: 'Rapazes',
    icon: '🧑‍🦱',
    color: 'from-sky-600 to-blue-800',
    badge: 'Rapazes',
    description: 'Pasta de rapazes jovens trazida diretamente do seu Google Drive.'
  },
  {
    id: 'adolescentes_mulheres',
    title: 'Adolescentes Mulheres',
    subtitle: 'Moças',
    icon: '👱‍♀️',
    color: 'from-purple-600 to-fuchsia-700',
    badge: 'Moças',
    description: 'Pasta de moças jovens trazida diretamente do seu Google Drive.'
  },
  {
    id: 'homens',
    title: 'Homens',
    subtitle: 'Adultos',
    icon: '👨',
    color: 'from-amber-600 to-amber-900',
    badge: 'Adultos',
    description: 'Pasta de homens adultos trazida diretamente do seu Google Drive.'
  },
  {
    id: 'mulheres',
    title: 'Mulheres',
    subtitle: 'Adultas',
    icon: '👩',
    color: 'from-rose-600 to-purple-800',
    badge: 'Adultas',
    description: 'Pasta de mulheres adultas trazida diretamente do seu Google Drive.'
  },
  {
    id: 'idosos_homens',
    title: 'Idosos Homens',
    subtitle: 'Vovôs',
    icon: '👴',
    color: 'from-emerald-700 to-teal-900',
    badge: 'Vovôs',
    description: 'Pasta de vovôs e senhores da 3ª idade trazida diretamente do seu Google Drive.'
  },
  {
    id: 'idosas_mulheres',
    title: 'Idosas Mulheres',
    subtitle: 'Vovós',
    icon: '👵',
    color: 'from-violet-700 to-indigo-950',
    badge: 'Vovós',
    description: 'Pasta de vovós e senhoras da 3ª idade trazida diretamente do seu Google Drive.'
  }
];

// ZERO artificial / mock models. Everything comes 100% directly from the user's Google Drive!
export const PORTRAIT_MODELS: PortraitModelItem[] = [];
