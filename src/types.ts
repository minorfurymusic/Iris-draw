export type LessonCategory = 'iniciante' | 'animais' | 'natureza' | 'objetos' | 'retratos' | 'familia_iris';

export type DifficultyLevel = 'muito_facil' | 'facil' | 'medio' | 'avancado';

export type ColorMode = 'pb' | 'colorido';

export type PeopleFolder = 
  | 'meninos'
  | 'meninas'
  | 'adolescentes_homens'
  | 'adolescentes_mulheres'
  | 'homens'
  | 'mulheres'
  | 'idosos_homens'
  | 'idosas_mulheres';

export interface PortraitModelItem {
  id: string;
  name: string;
  folder: PeopleFolder;
  folderLabel: string;
  gender: 'masculino' | 'feminino';
  ageGroup: string;
  description: string;
  originalPhotoSvg?: string;
  originalPhotoUrl?: string;
  sketchSvgPB?: string;
  sketchSvgPBUrl?: string;
  sketchNoBgSvgPB?: string;
  sketchSvgColor?: string;
  sketchSvgColorUrl?: string;
  difficulty: DifficultyLevel;
  paperTips: string[];
  paperMaterials: string[];
  tags: string[];
  isCustom?: boolean;
  dateAdded?: string;
}

export interface FolderConfig {
  id: PeopleFolder;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  badge: string;
  description: string;
}

export interface LessonStep {
  stepNumber: number;
  title: string;
  instructionPB: string;
  instructionColor: string;
  artistTipPB: string;
  artistTipColor: string;
  materialsPB: string[];
  materialsColor: string[];
  speechTextPB: string;
  speechTextColor: string;
  svgPB: string;
  svgColor: string;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  category: LessonCategory;
  difficulty: DifficultyLevel;
  durationMinutes: number;
  featured?: boolean;
  coverSvgPB: string;
  coverSvgColor: string;
  descriptionPB: string;
  descriptionColor: string;
  materialsPB: string[];
  materialsColor: string[];
  steps: LessonStep[];
}

export interface FamilyPhotoItem {
  id: string;
  originalFileName: string;
  year: string;
  title: string;
  description: string;
  sketchSvgPB: string;
  sketchSvgColor: string;
  originalSvgPreview: string;
  tags: string[];
}

export interface SavedArtwork {
  id: string;
  title: string;
  dataUrl: string;
  date: string;
  isPaperPhoto?: boolean;
  isFromPhotoAI?: boolean;
  originalPhotoUrl?: string;
  folder?: PeopleFolder;
  likes: number;
  mode: ColorMode;
  notes?: string;
  removedBackground?: boolean;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}
