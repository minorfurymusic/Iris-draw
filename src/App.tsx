/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { LessonList } from './components/LessonList';
import { LessonViewer } from './components/LessonViewer';
import { GalleryView } from './components/GalleryView';
import { FoldersModelCatalog } from './components/FoldersModelCatalog';
import { GoogleDriveImporterModal } from './components/GoogleDriveImporterModal';
import { BadgesView } from './components/BadgesView';
import { UploadPaperDrawingModal } from './components/UploadPaperDrawingModal';
import { LESSONS, INITIAL_BADGES } from './data/lessons';
import { mergeColorAndPencilModels } from './utils/googleDrive';
import { 
  Lesson, 
  SavedArtwork, 
  AchievementBadge, 
  ColorMode, 
  PortraitModelItem, 
  PeopleFolder 
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('aulas');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeLessonMode, setActiveLessonMode] = useState<ColorMode>('pb');

  // Persistent States
  const [starsCount, setStarsCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('atelie_iris_stars');
      return stored ? Number(stored) : 10;
    } catch {
      return 10;
    }
  });

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('atelie_iris_completed_lessons');
      return stored ? JSON.parse(stored) : ['esfera-3d'];
    } catch {
      return ['esfera-3d'];
    }
  });

  const [customArtworks, setCustomArtworks] = useState<SavedArtwork[]>(() => {
    try {
      const stored = localStorage.getItem('atelie_iris_custom_artworks');
      if (stored) return JSON.parse(stored);
    } catch {
      // Ignore
    }
    return [];
  });

  const [customFolderModels, setCustomFolderModels] = useState<PortraitModelItem[]>(() => {
    try {
      const stored = localStorage.getItem('atelie_iris_custom_folder_models');
      if (stored) return mergeColorAndPencilModels(JSON.parse(stored));
    } catch {
      // Ignore
    }
    return [];
  });

  const [badges, setBadges] = useState<AchievementBadge[]>(() => {
    try {
      const stored = localStorage.getItem('atelie_iris_badges');
      return stored ? JSON.parse(stored) : INITIAL_BADGES;
    } catch {
      return INITIAL_BADGES;
    }
  });

  // Google Drive Modal State
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);

  // When importing from Google Drive
  const handleDriveImportCompleted = (importedModels: PortraitModelItem[]) => {
    if (importedModels.length === 0) return;

    // 1. Add to custom folder models and merge pairs into single models
    const merged = mergeColorAndPencilModels([...importedModels, ...customFolderModels]);
    setCustomFolderModels(merged);

    // 2. Add to album custom artworks
    const newArtworks: SavedArtwork[] = merged.map(m => ({
      id: `drive-art-${m.id}`,
      title: m.name,
      dataUrl: m.sketchSvgPBUrl || m.originalPhotoUrl || '',
      originalPhotoUrl: m.originalPhotoUrl,
      folder: m.folder,
      date: 'Google Drive',
      isFromPhotoAI: false,
      mode: 'pb',
      likes: 2
    }));

    setCustomArtworks(newArtworks);

    // 3. Award stars
    setStarsCount(prev => prev + (merged.length * 3));

    // 4. Switch to Pastas tab so the user immediately sees the organized photos!
    setActiveTab('pastas');
  };

  // LocalStorage sync
  useEffect(() => {
    try {
      localStorage.setItem('atelie_iris_stars', String(starsCount));
      localStorage.setItem('atelie_iris_completed_lessons', JSON.stringify(completedLessonIds));
      localStorage.setItem('atelie_iris_custom_artworks', JSON.stringify(customArtworks));
      localStorage.setItem('atelie_iris_custom_folder_models', JSON.stringify(customFolderModels));
      localStorage.setItem('atelie_iris_badges', JSON.stringify(badges));
    } catch {
      // Ignore
    }
  }, [starsCount, completedLessonIds, customArtworks, customFolderModels, badges]);

  // When completing a lesson on paper
  const handleCompleteLesson = (lessonId: string) => {
    if (!completedLessonIds.includes(lessonId)) {
      setCompletedLessonIds(prev => [...prev, lessonId]);
      setStarsCount(prev => prev + 5);

      setBadges(prev => prev.map(b => {
        if (b.id === 'mestre_da_sombra' && lessonId === 'esfera-3d') {
          return { ...b, unlocked: true, unlockedAt: 'Hoje' };
        }
        if (b.id === 'flor_iris_ouro' && lessonId === 'flor-iris') {
          return { ...b, unlocked: true, unlockedAt: 'Hoje' };
        }
        if (b.id === 'amiga_dos_animais' && lessonId === 'cachorrinho-fofinho') {
          return { ...b, unlocked: true, unlockedAt: 'Hoje' };
        }
        return b;
      }));
    }
  };

  // When photographing and saving real paper drawing
  const handleSavePaperDrawing = (dataUrl: string, title: string, mode: ColorMode, notes?: string) => {
    const newArt: SavedArtwork = {
      id: `paper-${Date.now()}`,
      title,
      dataUrl,
      date: 'Hoje',
      isPaperPhoto: true,
      mode,
      notes,
      likes: 1
    };

    setCustomArtworks(prev => [newArt, ...prev]);
    setStarsCount(prev => prev + 3);

    // Unlock badge
    setBadges(prev => prev.map(b => b.id === 'mural_de_ouro' ? { ...b, unlocked: true, unlockedAt: 'Hoje' } : b));
  };

  // When uploading and converting new photo via AI into the album
  const handleAddNewCustomPhoto = (sketchUrl: string, originalUrl?: string, title?: string, folder?: PeopleFolder) => {
    const newArt: SavedArtwork = {
      id: `ai-photo-${Date.now()}`,
      title: title || 'Foto Transformada em Desenho P&B',
      dataUrl: sketchUrl,
      originalPhotoUrl: originalUrl,
      date: 'Hoje',
      isFromPhotoAI: true,
      folder,
      mode: 'pb',
      likes: 3
    };

    setCustomArtworks(prev => [newArt, ...prev]);
    setStarsCount(prev => prev + 2);

    // If folder was selected, also add as model in that folder!
    if (folder && originalUrl) {
      const folderLabels: Record<PeopleFolder, string> = {
        meninos: 'Meninos',
        meninas: 'Meninas',
        adolescentes_homens: 'Adolescentes Homens',
        adolescentes_mulheres: 'Adolescentes Mulheres',
        homens: 'Homens',
        mulheres: 'Mulheres',
        idosos_homens: 'Idosos Homens',
        idosas_mulheres: 'Idosas Mulheres'
      };

      const newFolderModel: PortraitModelItem = {
        id: `folder-model-${Date.now()}`,
        name: title?.replace('Desenho Realista: ', '') || 'Novo Modelo',
        folder,
        folderLabel: folderLabels[folder],
        gender: folder.includes('homens') || folder === 'meninos' ? 'masculino' : 'feminino',
        ageGroup: folder.includes('idos') ? '3ª Idade' : folder.includes('adolescentes') ? 'Jovem' : folder.includes('menin') ? 'Infantil' : 'Adulto',
        description: `Adicionado através do álbum para a pasta ${folderLabels[folder]}.`,
        originalPhotoUrl: originalUrl,
        sketchSvgPBUrl: sketchUrl,
        difficulty: 'medio',
        paperTips: [
          'Esboce as proporções principais com o lápis HB bem suave.',
          'Marque os olhos, nariz e queixo com atenção à luz.',
          'Dê o acabamento a lápis 2B e sombreamento 4B.'
        ],
        paperMaterials: ['Lápis HB', 'Lápis 2B', 'Lápis 4B', 'Borracha'],
        tags: ['Álbum', folderLabels[folder]],
        isCustom: true,
        dateAdded: 'Hoje'
      };

      setCustomFolderModels(prev => [newFolderModel, ...prev]);
    }

    // Unlock family badge
    setBadges(prev => prev.map(b => b.id === 'artista_da_familia' ? { ...b, unlocked: true, unlockedAt: 'Hoje' } : b));
  };

  // Convert any model from the folders database into a guided physical paper lesson!
  const handleStartDrawingFromModel = (model: PortraitModelItem) => {
    const generatedLesson: Lesson = {
      id: `lesson-model-${model.id}`,
      title: `Desenhando no Papel: ${model.name}`,
      subtitle: `${model.folderLabel} • ${model.ageGroup}`,
      category: 'retratos',
      difficulty: model.difficulty,
      durationMinutes: 15,
      descriptionPB: `Aprenda passo a passo no seu caderno de desenho a criar este retrato a lápis grafite.`,
      descriptionColor: `Aprenda passo a passo no seu caderno de desenho a colorir este retrato.`,
      materialsPB: model.paperMaterials || ['Caderno de desenho', 'Lápis HB, 2B e 4B', 'Borracha macia'],
      materialsColor: ['Caderno de desenho', 'Lápis de cor', 'Lápis HB', 'Borracha'],
      coverSvgPB: model.sketchSvgPB || model.sketchSvgPBUrl || '',
      coverSvgColor: model.sketchSvgColor || model.originalPhotoUrl || '',
      steps: [
        {
          stepNumber: 1,
          title: 'Passo 1: Formato da Cabeça e Linhas Guias',
          instructionPB: 'No seu papel, trace com o lápis HB bem levinho a forma oval da cabeça e uma cruz no centro para marcar onde ficarão os olhos e o nariz.',
          instructionColor: 'No seu caderno, trace com lápis HB levinho o formato da cabeça e a cruz guia no meio do rosto.',
          artistTipPB: model.paperTips[0] || 'Linhas bem clarinhas facilitam apagar e ajustar.',
          artistTipColor: 'Mantenha o traço no papel bem suave.',
          materialsPB: ['Lápis HB'],
          materialsColor: ['Lápis HB'],
          speechTextPB: `Iris, vamos desenhar ${model.name} no seu papel! Comece desenhando o formato da cabeça bem de leve com o lápis HB.`,
          speechTextColor: `Iris, vamos desenhar ${model.name}! Comece pelo formato da cabeça no papel.`,
          svgPB: model.sketchSvgPB || '',
          svgColor: model.originalPhotoSvg || ''
        },
        {
          stepNumber: 2,
          title: 'Passo 2: Olhos, Nariz, Boca e Cabelo',
          instructionPB: 'Com o lápis 2B, desenhe os detalhes do rosto: os olhos com reflexos brancos, o contorno do nariz, o formato dos lábios e o corte de cabelo.',
          instructionColor: 'Com os lápis de cor correspondentes, defina os olhos, lábios e fios de cabelo.',
          artistTipPB: model.paperTips[1] || 'Lembre-se de deixar um pontinho branco no olho para o brilho da vida!',
          artistTipColor: 'Use cores suaves na pele e vivas no cabelo.',
          materialsPB: ['Lápis 2B'],
          materialsColor: ['Lápis de cor'],
          speechTextPB: 'Agora com o lápis 2B, desenhe os olhos, o sorriso e o cabelo.',
          speechTextColor: 'Agora pinte com carinho os olhos, a boca e o cabelo.',
          svgPB: model.sketchSvgPB || '',
          svgColor: model.originalPhotoSvg || ''
        },
        {
          stepNumber: 3,
          title: 'Passo 3: Sombras Realistas e Toques Finais',
          instructionPB: 'Use o lápis 4B para escurecer as sombras abaixo do queixo e no cabelo. Use o esfuminho para aveludar a pele e assine seu nome no papel!',
          instructionColor: 'Adicione sombras com tons mais escuros e dê os toques finais coloridos.',
          artistTipPB: model.paperTips[2] || 'O contraste entre as áreas escuras e a folha clara é o que dá o realismo!',
          artistTipColor: 'Assine seu nome e a data na folha do seu caderno!',
          materialsPB: ['Lápis 4B', 'Borracha', 'Esfuminho'],
          materialsColor: ['Lápis escuros', 'Lápis branco'],
          speechTextPB: 'Finalize com as sombras aveludadas e os brilhos! Ficou uma verdadeira obra de arte, Iris!',
          speechTextColor: 'Finalize sua pintura no papel com os brilhos e sombras! Parabéns, Iris!',
          svgPB: model.sketchSvgPB || '',
          svgColor: model.originalPhotoSvg || ''
        }
      ]
    };

    setActiveLesson(generatedLesson);
    setActiveLessonMode('pb');
    setActiveTab('aulas');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/60 via-slate-50 to-purple-50/40 flex flex-col font-['Nunito',sans-serif]">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'aulas') {
            setActiveLesson(null);
          }
        }}
        starsCount={starsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 py-4 sm:py-6">
        
        {/* TAB 1: AULAS NO PAPEL */}
        {activeTab === 'aulas' && (
          activeLesson ? (
            <LessonViewer
              lesson={activeLesson}
              initialMode={activeLessonMode}
              onBack={() => setActiveLesson(null)}
              onCompleteLesson={handleCompleteLesson}
              onSavePaperDrawing={(dataUrl, title, mode) => {
                handleSavePaperDrawing(dataUrl, title, mode);
              }}
            />
          ) : (
            <LessonList
              lessons={LESSONS}
              onSelectLesson={(lesson, mode) => {
                setActiveLesson(lesson);
                setActiveLessonMode(mode);
              }}
              onOpenAlbum={() => setActiveTab('album')}
              completedLessonIds={completedLessonIds}
            />
          )
        )}

        {/* TAB 2: PASTAS DE MODELOS (8 PASTAS DE PESSOAS COM FOTO COLORIDA E DESENHO P&B) */}
        {activeTab === 'pastas' && (
          <FoldersModelCatalog
            customModels={customFolderModels}
            onAddNewCustomModel={(model) => {
              setCustomFolderModels(prev => [model, ...prev]);
              setStarsCount(prev => prev + 2);
            }}
            onBulkAddModels={(models) => {
              const merged = mergeColorAndPencilModels(models);
              setCustomFolderModels(merged);
              const newArtworks: SavedArtwork[] = merged.map(m => ({
                id: `drive-art-${m.id}`,
                title: m.name,
                dataUrl: m.sketchSvgPBUrl || m.originalPhotoUrl || '',
                originalPhotoUrl: m.originalPhotoUrl,
                folder: m.folder,
                date: 'Google Drive',
                isFromPhotoAI: false,
                mode: 'pb',
                likes: 2
              }));
              setCustomArtworks(newArtworks);
              setStarsCount(prev => prev + 10);
            }}
            onDeleteCustomModel={(modelId) => {
              setCustomFolderModels(prev => prev.filter(m => m.id !== modelId));
            }}
            onStartDrawingLesson={handleStartDrawingFromModel}
            onOpenGoogleDriveImport={() => setShowDriveModal(true)}
          />
        )}

        {/* TAB 3: MEU ÁLBUM DE FOTOS & DESENHOS (COM IA E REMOÇÃO DE FUNDO) */}
        {activeTab === 'album' && (
          <GalleryView
            customArtworks={customArtworks}
            onAddNewCustomPhoto={handleAddNewCustomPhoto}
            onLikePhoto={(id) => {
              setCustomArtworks(prev => prev.map(a => a.id === id ? { ...a, likes: a.likes + 1 } : a));
            }}
            onDeleteArtwork={(id) => {
              setCustomArtworks(prev => prev.filter(a => a.id !== id));
            }}
            onClearAllArtworks={() => {
              setCustomArtworks([]);
              try {
                localStorage.removeItem('atelie_iris_custom_artworks');
              } catch {
                // ignore
              }
            }}
            onOpenFolderCatalog={(folderId) => {
              setActiveTab('pastas');
            }}
            onOpenGoogleDriveImport={() => setShowDriveModal(true)}
          />
        )}

        {/* TAB 4: GUARDAR DESENHO DO PAPEL (FOTOGRAFAR CADERNO) */}
        {activeTab === 'camera_upload' && (
          <UploadPaperDrawingModal
            onSaveDrawing={(dataUrl, title, mode, notes) => {
              handleSavePaperDrawing(dataUrl, title, mode, notes);
            }}
            onDone={() => setActiveTab('album')}
          />
        )}

        {/* TAB 5: CONQUISTAS (ESTRELAS & MEDALHAS) */}
        {activeTab === 'conquistas' && (
          <BadgesView
            badges={badges}
            starsCount={starsCount}
          />
        )}
      </main>

      {/* Google Drive Importer & Auto-Categorizer Modal */}
      <GoogleDriveImporterModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        onImportCompleted={handleDriveImportCompleted}
      />

      {/* Sweet Footer */}
      <footer className="bg-white/90 border-t border-purple-100 py-6 text-center text-xs text-purple-900/70">
        <p className="font-semibold">
          💜 Feito com todo o carinho para a pequena grande artista <span className="font-bold text-purple-700">Iris</span> aprender a desenhar no papel!
        </p>
      </footer>

    </div>
  );
}
