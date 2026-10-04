import { Lesson } from '../types';

// Banco de dados de aulas limpo conforme solicitado pelo usuário.
export const LESSONS: Lesson[] = [];

export const CATEGORIES = [
  { id: 'all', label: 'Todas as Aulas', icon: '🎨' },
  { id: 'iniciante', label: 'Primeiros Traços (Luz & Sombra)', icon: '✨' },
  { id: 'natureza', label: 'Natureza & Flores (Íris)', icon: '🌸' },
  { id: 'animais', label: 'Mundo Animal', icon: '🐾' }
];

export const INITIAL_BADGES = [
  {
    id: 'primeiro_passo',
    title: 'Primeiro Desenho no Papel',
    description: 'Completou a primeira lição no caderno de desenho!',
    icon: '📖',
    unlocked: true,
    unlockedAt: 'Hoje'
  },
  {
    id: 'mestre_da_sombra',
    title: 'Mestre da Luz e Sombra',
    description: 'Aprendeu a fazer o degradê realista 3D na folha.',
    icon: '☀️',
    unlocked: false
  },
  {
    id: 'amiga_dos_animais',
    title: 'Amiga dos Bichinhos',
    description: 'Desenhou um cachorrinho com pelos macios.',
    icon: '🐾',
    unlocked: false
  },
  {
    id: 'flor_iris_ouro',
    title: 'Flor Íris Dourada',
    description: 'Desenhou a flor do seu nome com pétalas aveludadas.',
    icon: '🌸',
    unlocked: false
  },
  {
    id: 'artista_da_familia',
    title: 'Artista da Família',
    description: 'Transformou uma foto da família em desenho a lápis.',
    icon: '💜',
    unlocked: false
  },
  {
    id: 'mural_de_ouro',
    title: 'Mural de Ouro',
    description: 'Guardou 3 ou mais desenhos feitos no papel no álbum.',
    icon: '🏆',
    unlocked: false
  }
];
