import React, { useState } from 'react';
import { Logo } from './Logo';
import { 
  BookOpen, 
  FolderOpen, 
  Images, 
  Award, 
  Camera, 
  Volume2, 
  VolumeX, 
  Star, 
  Menu, 
  X 
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export type ActiveTab = 'aulas' | 'pastas' | 'album' | 'camera_upload' | 'conquistas';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  starsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  starsCount
}) => {
  const [soundOn, setSoundOn] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundManager.enabled = next;
    if (next) soundManager.playSparkle();
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'aulas', label: 'Aulas no Papel', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'pastas', label: 'Pastas de Modelos', icon: <FolderOpen className="w-5 h-5 text-amber-500" />, badge: '8 Pastas' },
    { id: 'album', label: 'Meu Álbum & Fotos', icon: <Images className="w-5 h-5" /> },
    { id: 'camera_upload', label: 'Guardar Meu Desenho', icon: <Camera className="w-5 h-5 text-emerald-500" /> },
    { id: 'conquistas', label: 'Conquistas', icon: <Award className="w-5 h-5" /> },
  ];

  const handleSelect = (tab: ActiveTab) => {
    soundManager.playPencilTap();
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-purple-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div 
            className="cursor-pointer transition-transform active:scale-95"
            onClick={() => handleSelect('aulas')}
          >
            <Logo size="md" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-800 text-white shadow-md shadow-purple-200 scale-102'
                      : 'text-purple-900 hover:bg-purple-50 hover:text-purple-700'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isActive ? 'bg-amber-400 text-amber-950' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Side: Stars & Audio Control */}
          <div className="flex items-center gap-3">
            {/* Stars Counter */}
            <div 
              title="Estrelas de Ouro da Iris"
              className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full shadow-xs cursor-pointer hover:scale-105 transition"
              onClick={() => handleSelect('conquistas')}
            >
              <Star className="w-5 h-5 text-amber-500 fill-amber-400 animate-bounce" />
              <span className="font-['Fredoka',sans-serif] font-bold text-amber-800 text-base">
                {starsCount}
              </span>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              title={soundOn ? 'Desativar som' : 'Ativar som'}
              className="p-2.5 rounded-2xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-2xl text-purple-700 hover:bg-purple-50 transition cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-b border-purple-100 px-4 pt-2 pb-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-base transition ${
                  isActive
                    ? 'bg-purple-700 text-white shadow-md shadow-purple-200'
                    : 'text-purple-900 hover:bg-purple-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-xs bg-amber-400 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
