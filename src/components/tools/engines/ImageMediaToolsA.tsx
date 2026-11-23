'use client';

import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { Upload, Download, Copy, Check, RefreshCw } from 'lucide-react';
import { downloadBlob } from '@/components/tools/engines/pdfHelpers';

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image file.'));
    img.src = src;
  });
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 255;
  const g = parseInt(clean.slice(2, 4), 16) || 255;
  const b = parseInt(clean.slice(4, 6), 16) || 255;
  return [r, g, b];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extractJpegExifSummary(buffer: ArrayBuffer): Record<string, string> {
  const view = new DataView(buffer);
  const info: Record<string, string> = {};
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    info.Format = 'Non-JPEG image (no standard JPEG EXIF APP1 block)';
    return info;
  }

  let offset = 2;
  let foundApp1 = false;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    offset += 2;
    if (marker === 0xffda || marker === 0xffd9) break;
    const size = view.getUint16(offset);
    if (marker === 0xffe1 && offset + size <= view.byteLength) {
      foundApp1 = true;
      const bytes = new Uint8Array(buffer, offset + 2, Math.max(0, size - 2));
      const ascii = new TextDecoder('latin1').decode(bytes);
      info['EXIF APP1 Block'] = `Detected (${size} bytes)`;
      if (/GPS/i.test(ascii)) info['GPS Metadata'] = 'Potential GPS tags detected';
      const dateMatch = ascii.match(/\d{4}:\d{2}:\d{2}\s+\d{2}:\d{2}:\d{2}/);
      if (dateMatch) info['Timestamp'] = dateMatch[0];
      const strings = ascii
        .replace(/[^\x20-\x7E]+/g, '\n')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length >= 4 && s.length <= 42 && /[A-Za-z]{3}/.test(s));
      const uniqueStrings = Array.from(new Set(strings)).slice(0, 6);
      if (uniqueStrings.length > 0) {
        info['Detected Strings'] = uniqueStrings.join(' • ');
      }
      break;
    }
    offset += size;
  }

  if (!foundApp1) {
    info['EXIF APP1 Block'] = 'None detected (clean JPEG)';
  }
  return info;
}

export default function ImageMediaToolsA({ slug }: { slug: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Shared uploaded image state
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [srcFile, setSrcFile] = useState<File | null>(null);
  const [origDims, setOrigDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [outUrl, setOutUrl] = useState<string | null>(null);
  const [outSize, setOutSize] = useState<number>(0);

  // #1 WEBP Converter & #4 Compressor
  const [quality, setQuality] = useState(0.82);
  const [compFormat, setCompFormat] = useState<'image/jpeg' | 'image/webp'>('image/jpeg');
  const [maxWidth, setMaxWidth] = useState(1920);

  // #2 SVG Optimizer
  const [svgInput, setSvgInput] = useState(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">\n  <!-- Sample Icon -->\n  <metadata>Editor Info</metadata>\n  <rect x="10" y="10" width="100" height="100" rx="20" fill="#4f46e5" />\n  <circle cx="60" cy="60" r="28" fill="#ffffff" />\n</svg>`
  );
  const [svgOutput, setSvgOutput] = useState('');

  // #3 Background Remover (Chroma Key)
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgTolerance, setBgTolerance] = useState(42);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // #6 Glassmorphism / Neumorphism
  const [styleMode, setStyleMode] = useState<'glass' | 'neuro'>('glass');
  const [glassBlur, setGlassBlur] = useState(14);
  const [glassAlpha, setGlassAlpha] = useState(0.18);
  const [glassRadius, setGlassRadius] = useState(20);
  const [neuroDist, setNeuroDist] = useState(12);
  const [neuroBlur, setNeuroBlur] = useState(24);
  const [neuroBase, setNeuroBase] = useState('#1e293b');

  // #7 EXIF Viewer & Remover
  const [exifInfo, setExifInfo] = useState<Record<string, string>>({});

  // #8 Color Palette Generator
  const [palette, setPalette] = useState<string[]>([]);

  // #9 Watermark Adder
  const [wmText, setWmText] = useState('© QuickTools');
  const [wmColor, setWmColor] = useState('#ffffff');
  const [wmOpacity, setWmOpacity] = useState(0.65);
  const [wmSize, setWmSize] = useState(36);
  const [wmPos, setWmPos] = useState<'bottom-right' | 'center' | 'tiled'>('bottom-right');
  const wmCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // #10 Image Resizer & Crop Tool
  const [targetW, setTargetW] = useState(800);
  const [targetH, setTargetH] = useState(800);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const resizeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const copyText = async (val: string, key = 'main') => {
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setOutUrl(null);
    setOutSize(0);
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImageElement(url);
      setSrcFile(file);
      setSrcUrl(url);
      setOrigDims({ w: img.naturalWidth, h: img.naturalHeight });
      setTargetW(img.naturalWidth);
      setTargetH(img.naturalHeight);

      if (slug === 'exif-data-remover-viewer') {
        const summary = extractJpegExifSummary(await file.arrayBuffer());
        summary['File Name'] = file.name;
        summary['Original Size'] = formatBytes(file.size);
        summary['Dimensions'] = `${img.naturalWidth} × ${img.naturalHeight} px`;
        setExifInfo(summary);
      }

      if (slug === 'color-palette-generator') {
        const c = document.createElement('canvas');
        const scale = Math.min(1, 120 / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.max(1, Math.floor(img.naturalWidth * scale));
        c.height = Math.max(1, Math.floor(img.naturalHeight * scale));
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, c.width, c.height);
          const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
          const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
          for (let i = 0; i < pixels.length; i += 16) {
            if (pixels[i + 3] < 128) continue;
            const rq = Math.round(pixels[i] / 24) * 24;
            const gq = Math.round(pixels[i + 1] / 24) * 24;
            const bq = Math.round(pixels[i + 2] / 24) * 24;
            const key = `${rq},${gq},${bq}`;
            const cur = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
            cur.r += pixels[i];
            cur.g += pixels[i + 1];
            cur.b += pixels[i + 2];
            cur.count += 1;
            buckets.set(key, cur);
          }
          const top = Array.from(buckets.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
            .map((b) =>
              rgbToHex(
                Math.round(b.r / b.count),
                Math.round(b.g / b.count),
                Math.round(b.b / b.count)
              )
            );
          setPalette(top);
        }
      }
    } catch {
      setError('Unsupported or corrupted image file.');
    }
  };

  // #3 Live Background Removal Render
  useEffect(() => {
    if (slug !== 'image-background-remover' || !srcUrl || !bgCanvasRef.current) return;
    let active = true;
    loadImageElement(srcUrl).then((img) => {
      if (!active || !bgCanvasRef.current) return;
      const canvas = bgCanvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const [tr, tg, tb] = hexToRgb(bgColor);
      const maxDist = bgTolerance * 2.55;

      for (let i = 0; i < data.length; i += 4) {
        const dr = data[i] - tr;
        const dg = data[i + 1] - tg;
        const db = data[i + 2] - tb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist <= maxDist) {
          data[i + 3] = 0;
        } else if (dist <= maxDist + 24) {
          const factor = (dist - maxDist) / 24;
          data[i + 3] = Math.round(data[i + 3] * factor);
        }
      }
      ctx.putImageData(imageData, 0, 0);
    });
    return () => {
      active = false;
    };
  }, [slug, srcUrl, bgColor, bgTolerance]);

  // #9 Live Watermark Render
  useEffect(() => {
    if (slug !== 'image-watermark-adder' || !srcUrl || !wmCanvasRef.current) return;
    let active = true;
    loadImageElement(srcUrl).then((img) => {
      if (!active || !wmCanvasRef.current) return;
      const canvas = wmCanvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      ctx.save();
      ctx.globalAlpha = wmOpacity;
      ctx.fillStyle = wmColor;
      ctx.font = `bold ${wmSize}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 6;

      if (wmPos === 'bottom-right') {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(wmText, canvas.width - 24, canvas.height - 20);
      } else if (wmPos === 'center') {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(wmText, canvas.width / 2, canvas.height / 2);
      } else {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const stepX = Math.max(180, wmSize * 6);
        const stepY = Math.max(120, wmSize * 3.5);
        for (let y = 0; y < canvas.height + stepY; y += stepY) {
          for (let x = 0; x < canvas.width + stepX; x += stepX) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(wmText, 0, 0);
            ctx.restore();
          }
        }
      }
      ctx.restore();
    });
    return () => {
      active = false;
    };
  }, [slug, srcUrl, wmText, wmColor, wmOpacity, wmSize, wmPos]);

  // #10 Live Resizer & Cropper Render
  useEffect(() => {
    if (slug !== 'image-resizer-crop-tool' || !srcUrl || !resizeCanvasRef.current) return;
    let active = true;
    loadImageElement(srcUrl).then((img) => {
      if (!active || !resizeCanvasRef.current) return;
      const w = Math.max(16, Math.min(4096, targetW));
      const h = Math.max(16, Math.min(4096, targetH));
      const canvas = resizeCanvasRef.current;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      if (fitMode === 'cover') {
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;
        ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
      } else {
        const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;
        ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
      }
    });
    return () => {
      active = false;
    };
  }, [slug, srcUrl, targetW, targetH, fitMode]);

  // --- TOOL RENDERERS ---

  // #1 JPG/PNG to WEBP Converter
  if (slug === 'jpg-png-to-webp-converter') {
    const convertToWebp = async () => {
      if (!srcUrl) return;
      const img = await loadImageElement(srcUrl);
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      c.toBlob(
        (blob) => {
          if (!blob) return;
          setOutSize(blob.size);
          setOutUrl(URL.createObjectURL(blob));
        },
        'image/webp',
        quality
      );
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label={srcFile ? `${srcFile.name} (${formatBytes(srcFile.size)})` : 'Upload JPG or PNG Image'}
          onFile={handleUpload}
        />
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2 text-slate-300">
            WEBP Quality: {Math.round(quality * 100)}%
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="accent-indigo-500"
            />
          </label>
          <button
            onClick={convertToWebp}
            disabled={!srcUrl}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-semibold text-white"
          >
            Convert to WEBP
          </button>
        </div>
        {outUrl && srcFile && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-emerald-400 font-mono">
                {formatBytes(srcFile.size)} → {formatBytes(outSize)} (
                {Math.max(0, Math.round((1 - outSize / srcFile.size) * 100))}% smaller)
              </span>
              <a
                href={outUrl}
                download={`${srcFile.name.replace(/\.[^.]+$/, '')}.webp`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
              >
                <Download className="w-3.5 h-3.5" /> Download WEBP
              </a>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={outUrl} alt="WEBP preview" className="max-h-64 rounded-xl mx-auto" />
          </div>
        )}
      </div>
    );
  }

  // #2 SVG Optimizer & Cleaner
  if (slug === 'svg-optimizer-cleaner') {
    const optimizeSvg = () => {
      const cleaned = svgInput
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<\?xml[\s\S]*?\?>/gi, '')
        .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
        .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
        .replace(/<title[\s\S]*?<\/title>/gi, '')
        .replace(/<desc[\s\S]*?<\/desc>/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
      setSvgOutput(cleaned);
    };

    const origBytes = new Blob([svgInput]).size;
    const optBytes = new Blob([svgOutput]).size;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={optimizeSvg}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
          >
            Optimize &amp; Minify SVG
          </button>
          {svgOutput && (
            <>
              <CopyBtn copied={copied === 'svg'} onClick={() => copyText(svgOutput, 'svg')} />
              <button
                onClick={() =>
                  downloadBlob(new Blob([svgOutput], { type: 'image/svg+xml' }), 'optimized.svg')
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
              >
                <Download className="w-3.5 h-3.5" /> Download SVG
              </button>
              <span className="text-xs font-mono text-emerald-400">
                {origBytes} B → {optBytes} B ({Math.max(0, Math.round((1 - optBytes / origBytes) * 100))}% saved)
              </span>
            </>
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            rows={10}
            value={svgInput}
            onChange={(e) => setSvgInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
          />
          <textarea
            readOnly
            rows={10}
            value={svgOutput}
            placeholder="Optimized SVG markup..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300"
          />
        </div>
      </div>
    );
  }

  // #3 Image Background Remover (Chroma / Color Key)
  if (slug === 'image-background-remover') {
    const pickColorFromCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = bgCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const px = ctx.getImageData(x, y, 1, 1).data;
      if (px[3] > 0) setBgColor(rgbToHex(px[0], px[1], px[2]));
    };

    const downloadCutout = () => {
      if (!bgCanvasRef.current) return;
      bgCanvasRef.current.toBlob((blob) => {
        if (blob) downloadBlob(blob, 'background-removed.png');
      }, 'image/png');
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label={srcFile ? srcFile.name : 'Upload Logo or Product Photo (Solid Background)'}
          onFile={handleUpload}
        />

        <div className="grid sm:grid-cols-3 gap-4 items-center text-xs">
          <div className="flex items-center gap-3">
            <label className="text-slate-400">Target BG Color</label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="h-9 w-14 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
            />
            <span className="font-mono text-slate-300">{bgColor}</span>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Tolerance: {bgTolerance}%</label>
            <input
              type="range"
              min={5}
              max={90}
              value={bgTolerance}
              onChange={(e) => setBgTolerance(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <button
            onClick={downloadCutout}
            disabled={!srcUrl}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-semibold text-white"
          >
            <Download className="w-4 h-4" /> Download Transparent PNG
          </button>
        </div>

        {srcUrl && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400">
              Tip: Click any background pixel on the preview below to sample its exact color.
            </p>
            <div
              className="rounded-2xl p-4 border border-slate-800 flex justify-center overflow-auto"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              }}
            >
              <canvas
                ref={bgCanvasRef}
                onClick={pickColorFromCanvas}
                className="max-h-80 max-w-full cursor-crosshair rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // #4 Client-Side Image Compressor
  if (slug === 'client-side-image-compressor') {
    const compressNow = async () => {
      if (!srcUrl) return;
      const img = await loadImageElement(srcUrl);
      const scale = Math.min(1, maxWidth / Math.max(1, img.naturalWidth));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext('2d');
      if (!ctx) return;
      if (compFormat === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
      }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(
        (blob) => {
          if (!blob) return;
          setOutSize(blob.size);
          setOutUrl(URL.createObjectURL(blob));
        },
        compFormat,
        quality
      );
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label={srcFile ? `${srcFile.name} (${formatBytes(srcFile.size)})` : 'Upload Image to Compress'}
          onFile={handleUpload}
        />
        <div className="grid sm:grid-cols-3 gap-4 text-xs items-end">
          <div>
            <label className="block text-slate-400 mb-1">Output Format</label>
            <select
              value={compFormat}
              onChange={(e) => setCompFormat(e.target.value as 'image/jpeg' | 'image/webp')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            >
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WEBP (Best Compression)</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Quality ({Math.round(quality * 100)}%)</label>
            <input
              type="range"
              min={0.1}
              max={0.95}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Max Width (px)</label>
            <input
              type="number"
              min={200}
              max={4096}
              value={maxWidth}
              onChange={(e) => setMaxWidth(Number(e.target.value) || 1920)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
        </div>
        <button
          onClick={compressNow}
          disabled={!srcUrl}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white"
        >
          Compress Image
        </button>

        {outUrl && srcFile && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-mono text-emerald-400">
              Original: {formatBytes(srcFile.size)} → Compressed: {formatBytes(outSize)} (
              {Math.max(0, Math.round((1 - outSize / srcFile.size) * 100))}% reduction)
            </span>
            <a
              href={outUrl}
              download={`compressed.${compFormat === 'image/webp' ? 'webp' : 'jpg'}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Download Compressed
            </a>
          </div>
        )}
      </div>
    );
  }

  // #5 Favicon & App Icon Generator
  if (slug === 'favicon-app-icon-generator') {
    const sizes = [16, 32, 48, 180, 192, 512];

    const exportFaviconZip = async () => {
      if (!srcUrl) return;
      const img = await loadImageElement(srcUrl);
      const zip = new JSZip();

      for (const s of sizes) {
        const c = document.createElement('canvas');
        c.width = s;
        c.height = s;
        const ctx = c.getContext('2d');
        if (!ctx) continue;
        ctx.drawImage(img, 0, 0, s, s);
        const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
        if (blob) {
          const name =
            s === 180
              ? 'apple-touch-icon.png'
              : s >= 192
              ? `android-chrome-${s}x${s}.png`
              : `favicon-${s}x${s}.png`;
          zip.file(name, blob);
        }
      }

      const manifest = {
        name: 'QuickTools App',
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      };
      zip.file('site.webmanifest', JSON.stringify(manifest, null, 2));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'favicons-pack.zip');
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label={srcFile ? srcFile.name : 'Upload Square Logo (512×512 PNG/JPG Recommended)'}
          onFile={handleUpload}
        />
        {srcUrl && (
          <div className="flex flex-wrap items-end gap-4 bg-slate-950 border border-slate-800 rounded-2xl p-5">
            {sizes.slice(0, 5).map((s) => (
              <div key={s} className="text-center space-y-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={srcUrl}
                  alt={`${s}px icon`}
                  style={{ width: Math.min(64, s), height: Math.min(64, s) }}
                  className="rounded-lg border border-slate-700 mx-auto object-cover"
                />
                <div className="text-[10px] font-mono text-slate-400">
                  {s}×{s}
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={exportFaviconZip}
          disabled={!srcUrl}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white"
        >
          <Download className="w-4 h-4" /> Download Full Favicon Pack (.zip)
        </button>
      </div>
    );
  }

  // #6 CSS Glassmorphism & Neumorphism Builder
  if (slug === 'css-glassmorphism-neumorphism-builder') {
    const cssCode =
      styleMode === 'glass'
        ? `background: rgba(255, 255, 255, ${glassAlpha});\nbackdrop-filter: blur(${glassBlur}px);\n-webkit-backdrop-filter: blur(${glassBlur}px);\nborder-radius: ${glassRadius}px;\nborder: 1px solid rgba(255, 255, 255, 0.22);`
        : `background: ${neuroBase};\nborder-radius: ${glassRadius}px;\nbox-shadow: ${neuroDist}px ${neuroDist}px ${neuroBlur}px rgba(0,0,0,0.45), -${neuroDist}px -${neuroDist}px ${neuroBlur}px rgba(255,255,255,0.06);`;

    return (
      <div className="space-y-5">
        <div className="flex gap-2">
          <button
            onClick={() => setStyleMode('glass')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              styleMode === 'glass'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Glassmorphism
          </button>
          <button
            onClick={() => setStyleMode('neuro')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              styleMode === 'neuro'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Neumorphism
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-center">
          <div className="space-y-3 text-xs">
            {styleMode === 'glass' ? (
              <>
                <Slider label={`Blur (${glassBlur}px)`} val={glassBlur} min={0} max={32} onChange={setGlassBlur} />
                <Slider
                  label={`Opacity (${Math.round(glassAlpha * 100)}%)`}
                  val={glassAlpha}
                  min={0.05}
                  max={0.6}
                  step={0.01}
                  onChange={setGlassAlpha}
                />
              </>
            ) : (
              <>
                <Slider label={`Distance (${neuroDist}px)`} val={neuroDist} min={4} max={30} onChange={setNeuroDist} />
                <Slider label={`Shadow Blur (${neuroBlur}px)`} val={neuroBlur} min={8} max={60} onChange={setNeuroBlur} />
                <div>
                  <label className="block text-slate-400 mb-1">Surface Color</label>
                  <input
                    type="color"
                    value={neuroBase}
                    onChange={(e) => setNeuroBase(e.target.value)}
                    className="h-9 w-24 rounded-lg bg-slate-950 border border-slate-800"
                  />
                </div>
              </>
            )}
            <Slider
              label={`Border Radius (${glassRadius}px)`}
              val={glassRadius}
              min={0}
              max={48}
              onChange={setGlassRadius}
            />
          </div>

          <div
            className="rounded-2xl p-10 flex items-center justify-center min-h-[220px]"
            style={
              styleMode === 'glass'
                ? {
                    background:
                      'radial-gradient(circle at 20% 20%, #6366f1, #0f172a 60%, #ec4899)',
                  }
                : { background: neuroBase }
            }
          >
            <div
              className="w-56 h-36 flex items-center justify-center text-sm font-bold text-white"
              style={
                styleMode === 'glass'
                  ? {
                      background: `rgba(255,255,255,${glassAlpha})`,
                      backdropFilter: `blur(${glassBlur}px)`,
                      borderRadius: `${glassRadius}px`,
                      border: '1px solid rgba(255,255,255,0.22)',
                    }
                  : {
                      background: neuroBase,
                      borderRadius: `${glassRadius}px`,
                      boxShadow: `${neuroDist}px ${neuroDist}px ${neuroBlur}px rgba(0,0,0,0.45), -${neuroDist}px -${neuroDist}px ${neuroBlur}px rgba(255,255,255,0.06)`,
                    }
              }
            >
              Live CSS Card
            </div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-3">
          <pre className="text-xs font-mono text-indigo-300 overflow-x-auto">{cssCode}</pre>
          <CopyBtn copied={copied === 'css'} onClick={() => copyText(cssCode, 'css')} />
        </div>
      </div>
    );
  }

  // #7 EXIF Data Remover & Viewer
  if (slug === 'exif-data-remover-viewer') {
    const stripAndDownload = async () => {
      if (!srcUrl || !srcFile) return;
      const img = await loadImageElement(srcUrl);
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const mime = srcFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
      c.toBlob(
        (blob) => {
          if (blob) downloadBlob(blob, `clean-no-exif-${srcFile.name}`);
        },
        mime,
        0.95
      );
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label={srcFile ? srcFile.name : 'Upload Photo (JPG/PNG) to Inspect & Wipe EXIF'}
          onFile={handleUpload}
        />

        {Object.keys(exifInfo).length > 0 && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
            {Object.entries(exifInfo).map(([k, v]) => (
              <div key={k} className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-400 font-semibold">{k}</span>
                <span className="font-mono text-slate-200 break-all">{v}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={stripAndDownload}
          disabled={!srcUrl}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white"
        >
          <Download className="w-4 h-4" /> Strip All EXIF / GPS Data &amp; Download Clean Copy
        </button>
      </div>
    );
  }

  // #8 Color Palette Generator from Image
  if (slug === 'color-palette-generator') {
    const cssVars = palette.map((hex, i) => `  --color-${i + 1}: ${hex};`).join('\n');

    return (
      <div className="space-y-5">
        <UploadBox
          label={srcFile ? srcFile.name : 'Upload Any Image to Extract Dominant Colors'}
          onFile={handleUpload}
        />

        {palette.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {palette.map((hex) => (
                <button
                  key={hex}
                  onClick={() => copyText(hex, hex)}
                  className="bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-2xl overflow-hidden text-left transition"
                >
                  <div className="h-20 w-full" style={{ backgroundColor: hex }} />
                  <div className="p-3 flex items-center justify-between text-xs font-mono">
                    <span className="text-white">{hex.toUpperCase()}</span>
                    <span className="text-[10px] text-slate-400">
                      {copied === hex ? 'Copied!' : 'Copy'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-3">
              <pre className="text-xs font-mono text-indigo-300">{`:root {\n${cssVars}\n}`}</pre>
              <CopyBtn
                copied={copied === 'vars'}
                onClick={() => copyText(`:root {\n${cssVars}\n}`, 'vars')}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // #9 Image Watermark Adder
  if (slug === 'image-watermark-adder') {
    return (
      <div className="space-y-5">
        <UploadBox
          label={srcFile ? srcFile.name : 'Upload Image to Watermark'}
          onFile={handleUpload}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <input
            value={wmText}
            onChange={(e) => setWmText(e.target.value)}
            placeholder="Watermark text"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
          <select
            value={wmPos}
            onChange={(e) => setWmPos(e.target.value as 'bottom-right' | 'center' | 'tiled')}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
          >
            <option value="bottom-right">Bottom Right</option>
            <option value="center">Center</option>
            <option value="tiled">Diagonal Tiled</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={wmColor}
              onChange={(e) => setWmColor(e.target.value)}
              className="h-9 w-12 rounded-lg bg-slate-950 border border-slate-800"
            />
            <input
              type="range"
              min={14}
              max={96}
              value={wmSize}
              onChange={(e) => setWmSize(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
          </div>
          <Slider
            label={`Opacity ${Math.round(wmOpacity * 100)}%`}
            val={wmOpacity}
            min={0.1}
            max={1}
            step={0.05}
            onChange={setWmOpacity}
          />
        </div>

        {srcUrl && (
          <div className="space-y-3">
            <canvas
              ref={wmCanvasRef}
              className="max-h-80 max-w-full rounded-2xl border border-slate-800 mx-auto"
            />
            <button
              onClick={() =>
                wmCanvasRef.current?.toBlob(
                  (b) => b && downloadBlob(b, 'watermarked-image.png'),
                  'image/png'
                )
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
            >
              <Download className="w-4 h-4" /> Download Watermarked PNG
            </button>
          </div>
        )}
      </div>
    );
  }

  // #10 Image Resizer & Crop Tool
  const presets = [
    { label: 'Instagram Square (1080×1080)', w: 1080, h: 1080 },
    { label: 'YouTube / HD (1280×720)', w: 1280, h: 720 },
    { label: 'OG Social Card (1200×630)', w: 1200, h: 630 },
    { label: 'Story / Reel (1080×1920)', w: 1080, h: 1920 },
  ];

  return (
    <div className="space-y-5">
      <UploadBox
        label={
          srcFile ? `${srcFile.name} (${origDims.w}×${origDims.h})` : 'Upload Image to Resize / Crop'
        }
        onFile={handleUpload}
      />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setTargetW(p.w);
              setTargetH(p.h);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-indigo-600 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1">Width (px)</label>
          <input
            type="number"
            min={16}
            max={4096}
            value={targetW}
            onChange={(e) => setTargetW(Number(e.target.value) || 800)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Height (px)</label>
          <input
            type="number"
            min={16}
            max={4096}
            value={targetH}
            onChange={(e) => setTargetH(Number(e.target.value) || 800)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Fit Mode</label>
          <select
            value={fitMode}
            onChange={(e) => setFitMode(e.target.value as 'cover' | 'contain')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
          >
            <option value="cover">Center Crop (Fill Aspect Ratio)</option>
            <option value="contain">Fit Inside (No Cropping)</option>
          </select>
        </div>
      </div>

      {srcUrl && (
        <div className="space-y-3">
          <canvas
            ref={resizeCanvasRef}
            className="max-h-72 max-w-full rounded-2xl border border-slate-800 mx-auto"
          />
          <button
            onClick={() =>
              resizeCanvasRef.current?.toBlob(
                (b) => b && downloadBlob(b, `resized-${targetW}x${targetH}.png`),
                'image/png'
              )
            }
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
          >
            <Download className="w-4 h-4" /> Download Resized PNG
          </button>
        </div>
      )}
    </div>
  );
}

function UploadBox({
  label,
  onFile,
}: {
  label: string;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-8 cursor-pointer bg-slate-950/60 transition text-center">
      <Upload className="w-6 h-6 text-indigo-400 mb-2" />
      <span className="text-sm font-semibold text-white">{label}</span>
      <span className="text-[11px] text-slate-500 mt-1">Zero uploads — processed locally via Canvas API</span>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0])}
        className="hidden"
      />
    </label>
  );
}

function Slider({
  label,
  val,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  val: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="block text-slate-400 mb-1">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500"
      />
    </div>
  );
}

function CopyBtn({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition shrink-0"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}