/**
 * Realistic Pencil Sketch & Drawing Filter Engine with Smart Background Removal
 * Transforms photos into graphite sketches and can isolate the subject from the background.
 */

export interface SketchFilterOptions {
  mode: 'pencil_realistic' | 'outline' | 'charcoal' | 'soft_shading';
  contrast: number; // 0 to 100
  pencilDarkness: number; // 0 to 100
  paperTexture?: boolean;
  removeBackground?: boolean;
  bgTolerance?: number; // 15 to 80
}

export function applySketchFilter(
  sourceCanvas: HTMLCanvasElement,
  options: SketchFilterOptions
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Working canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Optional: Background Removal Mask computation
  let bgMask: Uint8Array | null = null;
  if (options.removeBackground) {
    bgMask = computeBackgroundMask(data, width, height, options.bgTolerance || 35);
  }

  // Step 1: Grayscale & Invert buffer
  const gray = new Float32Array(width * height);
  const inverted = new Float32Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const idx = i / 4;
    gray[idx] = lum;
    inverted[idx] = 255 - lum;
  }

  // Step 2: Gaussian Blur approximation on the inverted layer
  const blurred = boxBlur(inverted, width, height, 5);

  // Step 3: Color Dodge blend (The classic mathematical sketch formula)
  const sketch = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const base = gray[i];
    const blend = blurred[i];
    if (blend >= 255) {
      sketch[i] = 255;
    } else {
      const val = (base * 255) / (255 - blend);
      sketch[i] = Math.min(255, Math.max(0, val));
    }
  }

  // Step 4: Mode adjustments (contrast, graphite tones, outlines)
  const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));
  const darknessScale = (100 - options.pencilDarkness * 0.4) / 100;

  for (let i = 0; i < sketch.length; i++) {
    const isBackground = bgMask ? bgMask[i] === 1 : false;

    if (isBackground) {
      // Clean pure white for isolated subject on paper
      const pixelIdx = i * 4;
      data[pixelIdx] = 255;
      data[pixelIdx + 1] = 255;
      data[pixelIdx + 2] = 255;
      data[pixelIdx + 3] = 255;
      continue;
    }

    let val = sketch[i];

    if (options.mode === 'outline') {
      val = val < 215 ? val * 0.65 : 255;
    } else if (options.mode === 'charcoal') {
      val = val * darknessScale;
      val = contrastFactor * (val - 128) + 128;
      const noise = (Math.random() - 0.5) * 8;
      val = Math.min(255, Math.max(0, val + noise));
    } else if (options.mode === 'pencil_realistic') {
      val = val * darknessScale;
      const midtone = gray[i];
      val = val * 0.68 + midtone * 0.32;
      val = contrastFactor * (val - 128) + 128;
    } else {
      const midtone = gray[i];
      val = val * 0.5 + midtone * 0.5;
    }

    val = Math.min(255, Math.max(0, val));

    const pixelIdx = i * 4;
    // Warm graphite pencil tint
    data[pixelIdx] = val * 0.98;
    data[pixelIdx + 1] = val * 0.97;
    data[pixelIdx + 2] = val * 0.99;
    data[pixelIdx + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);

  // Paper texture if requested and not transparent
  if (options.paperTexture !== false && !options.removeBackground) {
    ctx.save();
    ctx.fillStyle = 'rgba(250, 248, 245, 0.05)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  return canvas;
}

/**
 * Intelligent Edge-Aware Background Segmenter
 * Identifies background starting from corners and borders with floodfill & color distance
 */
function computeBackgroundMask(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  tolerance: number
): Uint8Array {
  const mask = new Uint8Array(w * h); // 1 = background, 0 = foreground (subject)
  const visited = new Uint8Array(w * h);

  // Sample corner colors for background model
  const cornerIndices = [
    0, // Top-left
    (w - 1) * 4, // Top-right
    (h - 1) * w * 4, // Bottom-left
    ((h - 1) * w + (w - 1)) * 4 // Bottom-right
  ];

  let sampleR = 0, sampleG = 0, sampleB = 0;
  for (const idx of cornerIndices) {
    sampleR += data[idx];
    sampleG += data[idx + 1];
    sampleB += data[idx + 2];
  }
  sampleR /= 4;
  sampleG /= 4;
  sampleB /= 4;

  const threshold = tolerance * 2.8;

  // BFS Queue starting from all 4 borders
  const queueX = new Int32Array(w * h);
  const queueY = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const pushSeed = (x: number, y: number) => {
    const idx = y * w + x;
    if (visited[idx] === 0) {
      visited[idx] = 1;
      queueX[tail] = x;
      queueY[tail] = y;
      tail++;
    }
  };

  // Seed top and bottom edges
  for (let x = 0; x < w; x++) {
    pushSeed(x, 0);
    pushSeed(x, h - 1);
  }
  // Seed left and right edges
  for (let y = 0; y < h; y++) {
    pushSeed(0, y);
    pushSeed(w - 1, y);
  }

  // Flood fill matching background
  const cx = w / 2;
  const cy = h / 2;
  const maxCenterDist = Math.hypot(cx, cy);

  while (head < tail) {
    const x = queueX[head];
    const y = queueY[head];
    head++;

    const pIdx = (y * w + x) * 4;
    const r = data[pIdx];
    const g = data[pIdx + 1];
    const b = data[pIdx + 2];

    const distFromSample = Math.hypot(r - sampleR, g - sampleG, b - sampleB);
    const distToCenter = Math.hypot(x - cx, y - cy) / maxCenterDist; // 0 (center) to 1 (corner)

    // Weighted threshold: more aggressive near outer edges, protects central subject
    const dynamicThreshold = threshold * (0.7 + distToCenter * 0.6);

    if (distFromSample < dynamicThreshold || distToCenter > 0.88) {
      mask[y * w + x] = 1; // Mark as background

      // Explore 4 neighbors
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1]
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nIdx = ny * w + nx;
          if (visited[nIdx] === 0) {
            visited[nIdx] = 1;
            queueX[tail] = nx;
            queueY[tail] = ny;
            tail++;
          }
        }
      }
    }
  }

  return mask;
}

// 2-pass fast box blur
function boxBlur(scl: Float32Array, w: number, h: number, r: number): Float32Array {
  const tcl = new Float32Array(w * h);
  for (let i = 0; i < scl.length; i++) tcl[i] = scl[i];

  boxBlurH(scl, tcl, w, h, r);
  boxBlurT(tcl, scl, w, h, r);
  return scl;
}

function boxBlurH(scl: Float32Array, tcl: Float32Array, w: number, h: number, r: number) {
  const iarr = 1 / (r + r + 1);
  for (let i = 0; i < h; i++) {
    let ti = i * w;
    let li = ti;
    let ri = ti + r;
    const fv = scl[ti];
    const lv = scl[ti + w - 1];
    let val = (r + 1) * fv;
    for (let j = 0; j < r; j++) val += scl[ti + j];
    for (let j = 0; j <= r; j++) {
      val += scl[ri++] - fv;
      tcl[ti++] = val * iarr;
    }
    for (let j = r + 1; j < w - r; j++) {
      val += scl[ri++] - scl[li++];
      tcl[ti++] = val * iarr;
    }
    for (let j = w - r; j < w; j++) {
      val += lv - scl[li++];
      tcl[ti++] = val * iarr;
    }
  }
}

function boxBlurT(scl: Float32Array, tcl: Float32Array, w: number, h: number, r: number) {
  const iarr = 1 / (r + r + 1);
  for (let i = 0; i < w; i++) {
    let ti = i;
    let li = ti;
    let ri = ti + r * w;
    const fv = scl[ti];
    const lv = scl[ti + w * (h - 1)];
    let val = (r + 1) * fv;
    for (let j = 0; j < r; j++) val += scl[ti + j * w];
    for (let j = 0; j <= r; j++) {
      val += scl[ri] - fv;
      tcl[ti] = val * iarr;
      ri += w;
      ti += w;
    }
    for (let j = r + 1; j < h - r; j++) {
      val += scl[ri] - scl[li];
      tcl[ti] = val * iarr;
      li += w;
      ri += w;
      ti += w;
    }
    for (let j = h - r; j < h; j++) {
      val += lv - scl[li];
      tcl[ti] = val * iarr;
      li += w;
      ri += w;
    }
  }
}
