import React, { useRef, useState, useEffect } from 'react';
import { 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Download, 
  Save, 
  Grid, 
  Sliders, 
  Check, 
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

export type ToolType = 'hb' | '2b' | '4b' | 'smudge' | 'eraser_fine' | 'eraser_broad';

interface DrawingCanvasProps {
  guideSvg?: string;
  guideImageUrl?: string;
  onSaveArtwork?: (dataUrl: string) => void;
  initialBackground?: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  guideSvg,
  guideImageUrl,
  onSaveArtwork,
  initialBackground = '#fdfbf7' // Natural fine art paper tint
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>('2b');
  const [brushSize, setBrushSize] = useState<number>(4);
  const [selectedColor, setSelectedColor] = useState<string>('#262626');
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [guideOpacity, setGuideOpacity] = useState<number>(0.35);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Undo / Redo history
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const isDrawing = useRef<boolean>(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Tools configuration
  const toolsConfig = [
    { id: 'hb', name: 'Lápis HB', desc: 'Traço fino e claro', defaultSize: 2.5, color: '#525252' },
    { id: '2b', name: 'Lápis 2B', desc: 'Grafite clássico suave', defaultSize: 4.5, color: '#262626' },
    { id: '4b', name: 'Lápis 4B', desc: 'Grafite escuro e macio', defaultSize: 7, color: '#0a0a0a' },
    { id: 'smudge', name: 'Esfuminho', desc: 'Suaviza sombras como algodão', defaultSize: 14, color: 'smudge' },
    { id: 'eraser_fine', name: 'Borracha Fina', desc: 'Para brilhos e detalhes', defaultSize: 3, color: 'eraser' },
    { id: 'eraser_broad', name: 'Borracha Macia', desc: 'Para apagar áreas maiores', defaultSize: 18, color: 'eraser' },
  ];

  // Palette with artist graphite + Iris favorite purples & golds
  const colorPalette = [
    { label: 'Grafite 4B', color: '#0a0a0a' },
    { label: 'Grafite 2B', color: '#262626' },
    { label: 'Grafite HB', color: '#525252' },
    { label: 'Sombra Suave', color: '#737373' },
    { label: 'Roxo Iris', color: '#7c3aed' },
    { label: 'Lilás Mágico', color: '#a855f7' },
    { label: 'Rosa Doce', color: '#ec4899' },
    { label: 'Ouro Realista', color: '#d97706' },
    { label: 'Azul Celeste', color: '#0284c7' },
    { label: 'Branco Luz', color: '#ffffff' },
  ];

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height || 550);

      // Save current drawing if exists
      let currentData: ImageData | null = null;
      if (canvas.width > 0 && canvas.height > 0) {
        try {
          currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch {
          // ignore
        }
      }

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Fill paper background
      ctx.fillStyle = initialBackground;
      ctx.fillRect(0, 0, width, height);

      // Draw very subtle paper grain texture
      addPaperTexture(ctx, width, height);

      // Save initial state for undo
      saveState();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const addPaperTexture = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
    for (let i = 0; i < 400; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      ctx.fillRect(rx, ry, 1.5, 1.5);
    }
    ctx.restore();
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStack.current.push(imgData);
      if (undoStack.current.length > 25) {
        undoStack.current.shift();
      }
      redoStack.current = [];
    } catch {
      // Ignore
    }
  };

  const handleUndo = () => {
    if (undoStack.current.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const current = undoStack.current.pop()!;
    redoStack.current.push(current);

    const prev = undoStack.current[undoStack.current.length - 1];
    if (prev) {
      ctx.putImageData(prev, 0, 0);
      soundManager.playPencilTap();
    }
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const next = redoStack.current.pop()!;
    undoStack.current.push(next);
    ctx.putImageData(next, 0, 0);
    soundManager.playPencilTap();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = initialBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    addPaperTexture(ctx, canvas.width, canvas.height);
    ctx.restore();

    saveState();
    soundManager.playPencilTap();
  };

  // Coordinates helper
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const coords = getCanvasCoords(e);
    lastPoint.current = coords;
    drawStroke(coords.x, coords.y, false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const coords = getCanvasCoords(e);
    drawStroke(coords.x, coords.y, true);
  };

  const stopDrawing = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      lastPoint.current = null;
      saveState();
    }
  };

  const drawStroke = (x: number, y: number, isMove: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const p0 = lastPoint.current || { x, y };

    if (activeTool === 'eraser_fine' || activeTool === 'eraser_broad') {
      // Eraser Mode (restores paper tint)
      ctx.strokeStyle = initialBackground;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (activeTool === 'smudge') {
      // Esfuminho: blends adjacent pixels with soft radial blur
      applySmudge(ctx, x, y, brushSize);
    } else {
      // Realistic graphite pencil simulation
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;

      // Opacity depends on pencil hardness (HB is lighter, 4B is darker)
      let alpha = 0.85;
      if (activeTool === 'hb') alpha = 0.55;
      if (activeTool === '2b') alpha = 0.75;
      if (activeTool === '4b') alpha = 0.95;

      ctx.globalAlpha = alpha;

      // Realistic graphite jitter: slightly softer edges
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      // For 4B/2B, add very soft secondary pass for graphite powder feel
      if (activeTool === '4b' || activeTool === '2b') {
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = brushSize * 1.5;
        ctx.stroke();
      }
    }

    ctx.restore();
    lastPoint.current = { x, y };
  };

  // Smudge implementation (Esfuminho)
  const applySmudge = (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) => {
    const r = Math.max(8, radius * 1.5);
    const dpr = window.devicePixelRatio || 1;
    const sx = Math.floor((cx - r) * dpr);
    const sy = Math.floor((cy - r) * dpr);
    const size = Math.floor(r * 2 * dpr);

    if (sx < 0 || sy < 0 || sx + size > canvasRef.current!.width || sy + size > canvasRef.current!.height) {
      return;
    }

    try {
      const imgData = ctx.getImageData(sx, sy, size, size);
      const data = imgData.data;

      // Soft circular average blend
      const center = size / 2;
      for (let y = 1; y < size - 1; y += 2) {
        for (let x = 1; x < size - 1; x += 2) {
          const dist = Math.hypot(x - center, y - center);
          if (dist < center) {
            const idx = (y * size + x) * 4;
            // Average with right neighbor
            const rIdx = (y * size + (x + 1)) * 4;
            const bIdx = ((y + 1) * size + x) * 4;

            data[idx] = (data[idx] + data[rIdx] + data[bIdx]) / 3;
            data[idx + 1] = (data[idx + 1] + data[rIdx + 1] + data[bIdx + 1]) / 3;
            data[idx + 2] = (data[idx + 2] + data[rIdx + 2] + data[bIdx + 2]) / 3;
          }
        }
      }
      ctx.putImageData(imgData, sx, sy);
    } catch {
      // Ignore
    }
  };

  const handleSelectTool = (tool: ToolType) => {
    soundManager.playPencilTap();
    setActiveTool(tool);
    const cfg = toolsConfig.find(t => t.id === tool);
    if (cfg) {
      setBrushSize(cfg.defaultSize);
      if (cfg.color !== 'smudge' && cfg.color !== 'eraser') {
        setSelectedColor(cfg.color);
      }
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    soundManager.playSparkle();
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#a855f7', '#ec4899', '#f59e0b', '#38bdf8', '#c084fc']
    });

    const dataUrl = canvas.toDataURL('image/png');
    if (onSaveArtwork) {
      onSaveArtwork(dataUrl);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `desenho-iris-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    soundManager.playSparkle();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full h-full">
      
      {/* Canvas Work Area */}
      <div 
        ref={containerRef}
        className="relative flex-1 min-h-[480px] lg:min-h-[580px] bg-amber-50/40 rounded-3xl border-4 border-purple-200 shadow-xl overflow-hidden touch-none flex items-center justify-center"
      >
        {/* Background Guide / Light-Table (Mesa de Luz) */}
        {showGuide && (guideSvg || guideImageUrl) && (
          <div 
            className="absolute inset-0 pointer-events-none flex items-center justify-center p-8 transition-opacity duration-200 select-none z-10"
            style={{ opacity: guideOpacity }}
          >
            {guideSvg ? (
              <div 
                className="w-full h-full max-w-md max-h-md flex items-center justify-center drop-shadow-sm"
                dangerouslySetInnerHTML={{ __html: guideSvg }} 
              />
            ) : guideImageUrl ? (
              <img 
                src={guideImageUrl} 
                alt="Guia de Desenho" 
                className="max-w-full max-h-full object-contain filter grayscale" 
              />
            ) : null}
          </div>
        )}

        {/* Artist Proportions Grid (Grade de Desenho 3x3) */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-15 grid grid-cols-3 grid-rows-3 border border-purple-300/40">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx} className="border border-purple-300/30"></div>
            ))}
          </div>
        )}

        {/* Drawing Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="relative z-20 cursor-crosshair w-full h-full block"
        />

        {/* Quick Guide Indicator Tag */}
        {(guideSvg || guideImageUrl) && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-purple-200 text-xs font-bold text-purple-800 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Mesa de Luz Ativa</span>
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="text-purple-600 hover:text-purple-900 cursor-pointer ml-1"
              title={showGuide ? "Ocultar guia" : "Mostrar guia"}
            >
              {showGuide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Toast Save Feedback */}
        {saveSuccess && (
          <div className="absolute top-4 right-4 z-40 bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 animate-bounce">
            <Check className="w-5 h-5" />
            <span>Salvo no Álbum da Iris! ✨</span>
          </div>
        )}
      </div>

      {/* Artist Toolbox Panel (Estojo de Arte da Iris) */}
      <div className="w-full lg:w-72 bg-white/95 backdrop-blur-md rounded-3xl border-2 border-purple-200 p-4 shadow-lg flex flex-col gap-4">
        
        {/* Tool Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
              Estojo de Grafite & Borracha
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {toolsConfig.map((t) => {
              const isSelected = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTool(t.id as ToolType)}
                  className={`flex flex-col items-start p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-100/80 border-purple-500 shadow-xs'
                      : 'bg-purple-50/40 border-purple-100 hover:bg-purple-50 hover:border-purple-200'
                  }`}
                >
                  <span className="font-bold text-xs text-purple-950 flex items-center gap-1">
                    {t.id.includes('eraser') ? '🧹' : t.id === 'smudge' ? '🌫️' : '✏️'}
                    {t.name}
                  </span>
                  <span className="text-[10px] text-purple-700/80 line-clamp-1 mt-0.5">
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Brush Size Slider */}
        <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
          <div className="flex justify-between text-xs font-bold text-purple-900 mb-1.5">
            <span className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              Espessura do Traço
            </span>
            <span className="font-['Fredoka',sans-serif]">{brushSize}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full accent-purple-600 cursor-pointer"
          />
        </div>

        {/* Palette */}
        {activeTool !== 'eraser_fine' && activeTool !== 'eraser_broad' && activeTool !== 'smudge' && (
          <div>
            <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block mb-2">
              Cores & Tons
            </span>
            <div className="grid grid-cols-5 gap-2">
              {colorPalette.map((c) => (
                <button
                  key={c.color}
                  onClick={() => {
                    soundManager.playPencilTap();
                    setSelectedColor(c.color);
                  }}
                  title={c.label}
                  className={`w-9 h-9 rounded-full border-2 transition cursor-pointer relative flex items-center justify-center ${
                    selectedColor === c.color ? 'scale-115 border-purple-600 shadow-md ring-2 ring-purple-300' : 'border-slate-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.color }}
                >
                  {selectedColor === c.color && (
                    <span className={`text-xs ${c.color === '#ffffff' ? 'text-purple-900' : 'text-white'}`}>
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Light-Table Opacity & Grid Toggles */}
        {(guideSvg || guideImageUrl) && (
          <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-100 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-bold text-purple-900">
              <span>Opacidade da Guia</span>
              <span className="font-['Fredoka',sans-serif]">{Math.round(guideOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.8"
              step="0.05"
              value={guideOpacity}
              onChange={(e) => setGuideOpacity(Number(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer"
            />
          </div>
        )}

        {/* Auxiliary Controls (Grid, Undo, Redo, Clear) */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => {
              soundManager.playPencilTap();
              setShowGrid(!showGrid);
            }}
            title={showGrid ? "Ocultar Grade" : "Mostrar Grade de Proporções"}
            className={`p-2.5 rounded-xl border flex items-center justify-center cursor-pointer transition ${
              showGrid ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-purple-800 border-purple-100 hover:bg-purple-100'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={handleUndo}
            title="Desfazer traço"
            className="p-2.5 rounded-xl bg-slate-50 text-purple-800 border border-purple-100 hover:bg-purple-100 flex items-center justify-center cursor-pointer transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleRedo}
            title="Refazer traço"
            className="p-2.5 rounded-xl bg-slate-50 text-purple-800 border border-purple-100 hover:bg-purple-100 flex items-center justify-center cursor-pointer transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleClear}
            title="Limpar papel"
            className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 flex items-center justify-center cursor-pointer transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action Buttons: Save & Download */}
        <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-purple-100">
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 px-4 rounded-2xl shadow-md shadow-purple-200 transition active:scale-98 cursor-pointer"
          >
            <Save className="w-5 h-5 text-amber-300" />
            <span>Guardar no Álbum</span>
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          </button>

          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold py-2.5 px-4 rounded-2xl border border-purple-200 transition cursor-pointer text-xs"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Desenho PNG</span>
          </button>
        </div>

      </div>

    </div>
  );
};
