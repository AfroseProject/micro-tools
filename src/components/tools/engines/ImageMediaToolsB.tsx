'use client';

import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import {
  Upload,
  Download,
  Copy,
  Check,
  Video,
  Square,
  RefreshCw,
  Undo2,
  Camera,
} from 'lucide-react';
import { downloadBlob, downloadBytes } from '@/components/tools/engines/pdfHelpers';

interface RectBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export default function ImageMediaToolsB({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // #11 GIF / Frame Sequence to Video
  const [frames, setFrames] = useState<File[]>([]);
  const [frameDurationMs, setFrameDurationMs] = useState(500);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordingFrames, setRecordingFrames] = useState(false);

  // #12 Screen Recorder
  const [isRec, setIsRec] = useState(false);
  const [recWithMic, setRecWithMic] = useState(false);
  const [recBlobUrl, setRecBlobUrl] = useState<string | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // #13 ASCII Art
  const [asciiWidth, setAsciiWidth] = useState(90);
  const [asciiInvert, setAsciiInvert] = useState(false);
  const [asciiOutput, setAsciiOutput] = useState('');
  const [asciiSrc, setAsciiSrc] = useState<string | null>(null);

  // #14 CSS Mesh Gradient
  const [meshColors, setMeshColors] = useState(['#4f46e5', '#ec4899', '#06b6d4', '#f59e0b']);
  const [meshBg, setMeshBg] = useState('#0f172a');

  // #15 Sprite Sheet
  const [spriteMode, setSpriteMode] = useState<'generate' | 'split'>('generate');
  const [spriteFiles, setSpriteFiles] = useState<File[]>([]);
  const [spriteCols, setSpriteCols] = useState(4);
  const [splitRows, setSplitRows] = useState(2);
  const [splitCols, setSplitCols] = useState(2);
  const [spriteSheetUrl, setSpriteSheetUrl] = useState<string | null>(null);
  const [splitSource, setSplitSource] = useState<string | null>(null);

  // #16 Meme Generator
  const [memeSrc, setMemeSrc] = useState<string | null>(null);
  const [topText, setTopText] = useState('WHEN IT RUNS');
  const [bottomText, setBottomText] = useState('100% CLIENT-SIDE');
  const [memeFontSize, setMemeFontSize] = useState(44);
  const memeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // #17 Blur / Censor Regions
  const [censorSrc, setCensorSrc] = useState<string | null>(null);
  const [censorStyle, setCensorStyle] = useState<'pixelate' | 'blackout'>('pixelate');
  const [censorBoxes, setCensorBoxes] = useState<RectBox[]>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const censorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // #18 WEBP to PNG/JPG
  const [webpSrc, setWebpSrc] = useState<string | null>(null);
  const [webpName, setWebpName] = useState('');
  const [webpOutFmt, setWebpOutFmt] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [webpOutUrl, setWebpOutUrl] = useState<string | null>(null);

  // #19 Base64 <-> Image
  const [b64Mode, setB64Mode] = useState<'img-to-b64' | 'b64-to-img'>('img-to-b64');
  const [b64DataUri, setB64DataUri] = useState('');

  // #20 SVG to PNG / PDF
  const [svgMarkup, setSvgMarkup] = useState(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">\n  <rect width="400" height="240" rx="24" fill="#1e1b4b"/>\n  <circle cx="90" cy="120" r="52" fill="#6366f1"/>\n  <text x="165" y="132" font-family="sans-serif" font-size="34" font-weight="bold" fill="#ffffff">QuickTools</text>\n</svg>`
  );
  const [svgScale, setSvgScale] = useState(2);

  const copyText = async (val: string) => {
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Stop screen capture on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // #13 Re-render ASCII Art
  useEffect(() => {
    if (slug !== 'ascii-art-generator' || !asciiSrc) return;
    let active = true;
    const ramp = asciiInvert ? ' .:-=+*#%@' : '@%#*+=-:. ';
    loadImg(asciiSrc).then((img) => {
      if (!active) return;
      const w = Math.max(20, Math.min(180, asciiWidth));
      const h = Math.max(10, Math.round((img.naturalHeight / img.naturalWidth) * w * 0.5));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const lines: string[] = [];
      for (let y = 0; y < h; y++) {
        let row = '';
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
          const idx = Math.min(ramp.length - 1, Math.floor(lum * ramp.length));
          row += ramp[idx];
        }
        lines.push(row);
      }
      setAsciiOutput(lines.join('\n'));
    });
    return () => {
      active = false;
    };
  }, [slug, asciiSrc, asciiWidth, asciiInvert]);

  // #16 Render Meme Canvas
  useEffect(() => {
    if (slug !== 'meme-generator-text-overlay' || !memeSrc || !memeCanvasRef.current) return;
    let active = true;
    loadImg(memeSrc).then((img) => {
      if (!active || !memeCanvasRef.current) return;
      const c = memeCanvasRef.current;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const scaleFactor = Math.max(0.6, c.width / 700);
      const px = Math.round(memeFontSize * scaleFactor);
      ctx.font = `900 ${px}px Impact, "Arial Black", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(3, Math.round(px / 10));
      ctx.textAlign = 'center';

      if (topText.trim()) {
        ctx.textBaseline = 'top';
        const t = topText.toUpperCase();
        ctx.strokeText(t, c.width / 2, 16, c.width - 32);
        ctx.fillText(t, c.width / 2, 16, c.width - 32);
      }
      if (bottomText.trim()) {
        ctx.textBaseline = 'bottom';
        const b = bottomText.toUpperCase();
        ctx.strokeText(b, c.width / 2, c.height - 16, c.width - 32);
        ctx.fillText(b, c.width / 2, c.height - 16, c.width - 32);
      }
    });
    return () => {
      active = false;
    };
  }, [slug, memeSrc, topText, bottomText, memeFontSize]);

  // #17 Render Redacted Image
  useEffect(() => {
    if (slug !== 'blur-censor-image-regions' || !censorSrc || !censorCanvasRef.current) return;
    let active = true;
    loadImg(censorSrc).then((img) => {
      if (!active || !censorCanvasRef.current) return;
      const c = censorCanvasRef.current;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      for (const box of censorBoxes) {
        const bx = Math.max(0, Math.floor(Math.min(box.x, box.x + box.w)));
        const by = Math.max(0, Math.floor(Math.min(box.y, box.y + box.h)));
        const bw = Math.max(2, Math.floor(Math.abs(box.w)));
        const bh = Math.max(2, Math.floor(Math.abs(box.h)));

        if (censorStyle === 'blackout') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(bx, by, bw, bh);
        } else {
          const block = Math.max(8, Math.round(Math.min(bw, bh) / 6));
          for (let y = by; y < by + bh; y += block) {
            for (let x = bx; x < bx + bw; x += block) {
              const px = ctx.getImageData(
                Math.min(c.width - 1, x),
                Math.min(c.height - 1, y),
                1,
                1
              ).data;
              ctx.fillStyle = `rgb(${px[0]},${px[1]},${px[2]})`;
              ctx.fillRect(x, y, Math.min(block, by + bh - y ? block : 1), Math.min(block, by + bh - y));
            }
          }
        }
      }
    });
    return () => {
      active = false;
    };
  }, [slug, censorSrc, censorBoxes, censorStyle]);

  // --- TOOL RENDERERS ---

  // #11 Animated GIF / Frame Sequence to Video Exporter
  if (slug === 'animated-gif-to-mp4-converter') {
    const exportVideo = async () => {
      if (frames.length === 0) return;
      if (typeof MediaRecorder === 'undefined') {
        setError('MediaRecorder API is not supported in this browser.');
        return;
      }
      setRecordingFrames(true);
      setError(null);
      setVideoUrl(null);
      try {
        const loadedImgs = await Promise.all(frames.map((f) => loadImg(URL.createObjectURL(f))));
        const c = document.createElement('canvas');
        c.width = loadedImgs[0].naturalWidth;
        c.height = loadedImgs[0].naturalHeight;
        const ctx = c.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');

        const mime = MediaRecorder.isTypeSupported('video/mp4')
          ? 'video/mp4'
          : 'video/webm;codecs=vp9';
        const stream = c.captureStream(30);
        const rec = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported(mime) ? mime : 'video/webm',
        });
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        const finished = new Promise<Blob>((resolve) => {
          rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || 'video/webm' }));
        });

        rec.start();
        for (const img of loadedImgs) {
          ctx.clearRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          await new Promise((r) => setTimeout(r, frameDurationMs));
        }
        rec.stop();
        const blob = await finished;
        setVideoUrl(URL.createObjectURL(blob));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to encode video clip.');
      } finally {
        setRecordingFrames(false);
      }
    };

    return (
      <div className="space-y-5">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-8 cursor-pointer bg-slate-950/60 text-center">
          <Upload className="w-6 h-6 text-indigo-400 mb-2" />
          <span className="text-sm font-semibold text-white">
            Upload GIF or Multiple Image Frames ({frames.length} selected)
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFrames(Array.from(e.target.files || []))}
            className="hidden"
          />
        </label>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2 text-slate-300">
            Frame Hold: {frameDurationMs} ms
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={frameDurationMs}
              onChange={(e) => setFrameDurationMs(Number(e.target.value))}
              className="accent-indigo-500"
            />
          </label>
          <button
            onClick={exportVideo}
            disabled={recordingFrames || frames.length === 0}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-semibold text-white"
          >
            {recordingFrames ? 'Encoding Video...' : 'Render Video Clip'}
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
            {error}
          </div>
        )}

        {videoUrl && (
          <div className="space-y-3">
            <video src={videoUrl} controls className="w-full max-h-72 rounded-2xl border border-slate-800" />
            <a
              href={videoUrl}
              download="animation-clip.webm"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
            >
              <Download className="w-4 h-4" /> Download Video Clip
            </a>
          </div>
        )}
      </div>
    );
  }

  // #12 Screen Recorder & Canvas Grabber
  if (slug === 'screen-recorder-canvas-grabber') {
    const startRecording = async () => {
      setError(null);
      setRecBlobUrl(null);
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const tracks = [...displayStream.getTracks()];
        if (recWithMic) {
          try {
            const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
            tracks.push(...mic.getAudioTracks());
          } catch {
            // Continue without mic if denied
          }
        }
        const combined = new MediaStream(tracks);
        streamRef.current = combined;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = combined;
          videoPreviewRef.current.play().catch(() => {});
        }

        const recorder = new MediaRecorder(combined, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          setRecBlobUrl(URL.createObjectURL(blob));
          combined.getTracks().forEach((t) => t.stop());
          setIsRec(false);
        };
        mediaRecRef.current = recorder;
        recorder.start();
        setIsRec(true);
      } catch {
        setError('Screen capture was cancelled or denied by browser permissions.');
      }
    };

    const stopRecording = () => {
      mediaRecRef.current?.stop();
    };

    const grabStillFrame = () => {
      const vid = videoPreviewRef.current;
      if (!vid || vid.videoWidth === 0) return;
      const c = document.createElement('canvas');
      c.width = vid.videoWidth;
      c.height = vid.videoHeight;
      c.getContext('2d')?.drawImage(vid, 0, 0);
      c.toBlob((b) => b && downloadBlob(b, 'screen-grab.png'), 'image/png');
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-300">
            <input
              type="checkbox"
              checked={recWithMic}
              onChange={(e) => setRecWithMic(e.target.checked)}
              disabled={isRec}
              className="accent-indigo-500"
            />
            Include Microphone Audio
          </label>
          {!isRec ? (
            <button
              onClick={startRecording}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
            >
              <Video className="w-4 h-4" /> Start Screen Recording
            </button>
          ) : (
            <>
              <button
                onClick={stopRecording}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold text-white"
              >
                <Square className="w-3.5 h-3.5" /> Stop Recording
              </button>
              <button
                onClick={grabStillFrame}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 font-semibold text-white"
              >
                <Camera className="w-4 h-4" /> Grab Screenshot PNG
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-3 rounded-xl">
            {error}
          </div>
        )}

        <video
          ref={videoPreviewRef}
          muted
          autoPlay
          playsInline
          className={`w-full max-h-72 rounded-2xl border border-slate-800 bg-slate-950 ${
            isRec ? 'block' : 'hidden'
          }`}
        />

        {recBlobUrl && (
          <div className="space-y-3">
            <video src={recBlobUrl} controls className="w-full max-h-80 rounded-2xl border border-slate-800" />
            <a
              href={recBlobUrl}
              download={`screen-recording-${Date.now()}.webm`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
            >
              <Download className="w-4 h-4" /> Download Recording (.webm)
            </a>
          </div>
        )}
      </div>
    );
  }

  // #13 ASCII Art Generator
  if (slug === 'ascii-art-generator') {
    return (
      <div className="space-y-4">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-7 cursor-pointer bg-slate-950/60">
          <Upload className="w-6 h-6 text-indigo-400 mb-2" />
          <span className="text-sm font-semibold text-white">Upload Image to Convert to ASCII Art</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setAsciiSrc(URL.createObjectURL(f));
            }}
            className="hidden"
          />
        </label>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2 text-slate-300">
            Columns: {asciiWidth}
            <input
              type="range"
              min={30}
              max={150}
              value={asciiWidth}
              onChange={(e) => setAsciiWidth(Number(e.target.value))}
              className="accent-indigo-500"
            />
          </label>
          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={asciiInvert}
              onChange={(e) => setAsciiInvert(e.target.checked)}
              className="accent-indigo-500"
            />
            Invert Brightness
          </label>
          {asciiOutput && <CopyBtn copied={copied} onClick={() => copyText(asciiOutput)} />}
        </div>

        {asciiOutput && (
          <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[7px] sm:text-[9px] leading-none font-mono text-emerald-400 overflow-auto max-h-96">
            {asciiOutput}
          </pre>
        )}
      </div>
    );
  }

  // #14 CSS Mesh Gradient Generator
  if (slug === 'css-mesh-gradient-generator') {
    const gradientValue = [
      `radial-gradient(at 15% 20%, ${meshColors[0]} 0px, transparent 55%)`,
      `radial-gradient(at 85% 15%, ${meshColors[1]} 0px, transparent 55%)`,
      `radial-gradient(at 80% 85%, ${meshColors[2]} 0px, transparent 55%)`,
      `radial-gradient(at 15% 80%, ${meshColors[3]} 0px, transparent 55%)`,
    ].join(',\n  ');

    const cssSnippet = `background-color: ${meshBg};\nbackground-image:\n  ${gradientValue};`;

    const randomizeMesh = () => {
      const randHex = () =>
        `#${Math.floor(Math.random() * 0xffffff)
          .toString(16)
          .padStart(6, '0')}`;
      setMeshColors([randHex(), randHex(), randHex(), randHex()]);
    };

    const exportPng = () => {
      const c = document.createElement('canvas');
      c.width = 1600;
      c.height = 900;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = meshBg;
      ctx.fillRect(0, 0, c.width, c.height);
      const pts: Array<[number, number]> = [
        [240, 180],
        [1360, 135],
        [1280, 765],
        [240, 720],
      ];
      pts.forEach(([x, y], i) => {
        const g = ctx.createRadialGradient(x, y, 10, x, y, 780);
        g.addColorStop(0, meshColors[i]);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, c.width, c.height);
      });
      c.toBlob((b) => b && downloadBlob(b, 'mesh-gradient-1600x900.png'), 'image/png');
    };

    return (
      <div className="space-y-5">
        <div
          className="h-56 rounded-2xl border border-slate-800 shadow-inner"
          style={{
            backgroundColor: meshBg,
            backgroundImage: gradientValue.replace(/\n\s+/g, ' '),
          }}
        />

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-slate-400">
            Base
            <input
              type="color"
              value={meshBg}
              onChange={(e) => setMeshBg(e.target.value)}
              className="h-8 w-10 rounded bg-slate-950 border border-slate-800"
            />
          </label>
          {meshColors.map((col, idx) => (
            <label key={idx} className="flex items-center gap-1.5 text-slate-400">
              C{idx + 1}
              <input
                type="color"
                value={col}
                onChange={(e) =>
                  setMeshColors(meshColors.map((c, i) => (i === idx ? e.target.value : c)))
                }
                className="h-8 w-10 rounded bg-slate-950 border border-slate-800"
              />
            </label>
          ))}
          <button
            onClick={randomizeMesh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Randomize
          </button>
          <button
            onClick={exportPng}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
          >
            <Download className="w-3.5 h-3.5" /> Download HD PNG
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-3">
          <pre className="text-xs font-mono text-indigo-300 overflow-x-auto">{cssSnippet}</pre>
          <CopyBtn copied={copied} onClick={() => copyText(cssSnippet)} />
        </div>
      </div>
    );
  }

  // #15 Sprite Sheet Splitter & Generator
  if (slug === 'sprite-sheet-splitter-generator') {
    const buildSheet = async () => {
      if (spriteFiles.length === 0) return;
      const imgs = await Promise.all(spriteFiles.map((f) => loadImg(URL.createObjectURL(f))));
      const cellW = Math.max(...imgs.map((i) => i.naturalWidth));
      const cellH = Math.max(...imgs.map((i) => i.naturalHeight));
      const cols = Math.max(1, Math.min(spriteCols, imgs.length));
      const rows = Math.ceil(imgs.length / cols);
      const c = document.createElement('canvas');
      c.width = cols * cellW;
      c.height = rows * cellH;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      imgs.forEach((img, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        ctx.drawImage(img, col * cellW, row * cellH);
      });
      c.toBlob((b) => {
        if (b) setSpriteSheetUrl(URL.createObjectURL(b));
      }, 'image/png');
    };

    const splitSheetZip = async () => {
      if (!splitSource) return;
      const img = await loadImg(splitSource);
      const tileW = Math.floor(img.naturalWidth / splitCols);
      const tileH = Math.floor(img.naturalHeight / splitRows);
      const zip = new JSZip();
      let idx = 1;
      for (let r = 0; r < splitRows; r++) {
        for (let col = 0; col < splitCols; col++) {
          const c = document.createElement('canvas');
          c.width = tileW;
          c.height = tileH;
          c.getContext('2d')?.drawImage(img, col * tileW, r * tileH, tileW, tileH, 0, 0, tileW, tileH);
          const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
          if (blob) zip.file(`sprite-${String(idx++).padStart(2, '0')}.png`, blob);
        }
      }
      downloadBlob(await zip.generateAsync({ type: 'blob' }), 'split-sprites.zip');
    };

    return (
      <div className="space-y-5">
        <div className="flex gap-2">
          <button
            onClick={() => setSpriteMode('generate')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              spriteMode === 'generate'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Generate Sprite Sheet
          </button>
          <button
            onClick={() => setSpriteMode('split')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              spriteMode === 'split'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Split Sprite Sheet
          </button>
        </div>

        {spriteMode === 'generate' ? (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-7 cursor-pointer bg-slate-950/60">
              <Upload className="w-6 h-6 text-indigo-400 mb-2" />
              <span className="text-sm font-semibold text-white">
                Upload Multiple Sprite Frames ({spriteFiles.length} selected)
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setSpriteFiles(Array.from(e.target.files || []))}
                className="hidden"
              />
            </label>
            <div className="flex items-center gap-3 text-xs">
              <label className="text-slate-400">Columns:</label>
              <input
                type="number"
                min={1}
                max={16}
                value={spriteCols}
                onChange={(e) => setSpriteCols(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
              <button
                onClick={buildSheet}
                disabled={spriteFiles.length === 0}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-semibold text-white"
              >
                Build Sheet
              </button>
            </div>
            {spriteSheetUrl && (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={spriteSheetUrl} alt="Sprite sheet" className="max-h-72 rounded-xl border border-slate-800" />
                <a
                  href={spriteSheetUrl}
                  download="sprite-sheet.png"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
                >
                  <Download className="w-4 h-4" /> Download Sprite Sheet PNG
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-7 cursor-pointer bg-slate-950/60">
              <Upload className="w-6 h-6 text-indigo-400 mb-2" />
              <span className="text-sm font-semibold text-white">Upload Sprite Sheet Image to Split</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setSplitSource(URL.createObjectURL(f));
                }}
                className="hidden"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="text-slate-400">Rows:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={splitRows}
                onChange={(e) => setSplitRows(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
              <label className="text-slate-400">Cols:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={splitCols}
                onChange={(e) => setSplitCols(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
              <button
                onClick={splitSheetZip}
                disabled={!splitSource}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-semibold text-white"
              >
                <Download className="w-4 h-4" /> Split &amp; Download ZIP
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // #16 Meme Generator & Text Overlay
  if (slug === 'meme-generator-text-overlay') {
    return (
      <div className="space-y-5">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-7 cursor-pointer bg-slate-950/60">
          <Upload className="w-6 h-6 text-indigo-400 mb-2" />
          <span className="text-sm font-semibold text-white">Upload Base Meme Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setMemeSrc(URL.createObjectURL(f));
            }}
            className="hidden"
          />
        </label>

        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <input
            value={topText}
            onChange={(e) => setTopText(e.target.value)}
            placeholder="TOP TEXT"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white"
          />
          <input
            value={bottomText}
            onChange={(e) => setBottomText(e.target.value)}
            placeholder="BOTTOM TEXT"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white"
          />
          <label className="flex items-center gap-2 text-slate-300">
            Font: {memeFontSize}px
            <input
              type="range"
              min={20}
              max={90}
              value={memeFontSize}
              onChange={(e) => setMemeFontSize(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
          </label>
        </div>

        {memeSrc && (
          <div className="space-y-3">
            <canvas
              ref={memeCanvasRef}
              className="max-h-96 max-w-full rounded-2xl border border-slate-800 mx-auto"
            />
            <button
              onClick={() =>
                memeCanvasRef.current?.toBlob(
                  (b) => b && downloadBlob(b, 'meme.png'),
                  'image/png'
                )
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
            >
              <Download className="w-4 h-4" /> Download Meme PNG
            </button>
          </div>
        )}
      </div>
    );
  }

  // #17 Blur / Censor Sensitive Image Regions
  if (slug === 'blur-censor-image-regions') {
    const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const c = censorCanvasRef.current!;
      const rect = c.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * c.width,
        y: ((e.clientY - rect.top) / rect.height) * c.height,
      };
    };

    return (
      <div className="space-y-5">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-7 cursor-pointer bg-slate-950/60">
          <Upload className="w-6 h-6 text-indigo-400 mb-2" />
          <span className="text-sm font-semibold text-white">Upload Screenshot to Redact</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setCensorSrc(URL.createObjectURL(f));
                setCensorBoxes([]);
              }
            }}
            className="hidden"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setCensorStyle('pixelate')}
            className={`px-3.5 py-2 rounded-xl font-semibold ${
              censorStyle === 'pixelate'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Pixelate Mosaic
          </button>
          <button
            onClick={() => setCensorStyle('blackout')}
            className={`px-3.5 py-2 rounded-xl font-semibold ${
              censorStyle === 'blackout'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Solid Blackout
          </button>
          <button
            onClick={() => setCensorBoxes((prev) => prev.slice(0, -1))}
            disabled={censorBoxes.length === 0}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white disabled:opacity-40"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          {censorSrc && (
            <button
              onClick={() =>
                censorCanvasRef.current?.toBlob(
                  (b) => b && downloadBlob(b, 'redacted-screenshot.png'),
                  'image/png'
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 font-semibold text-white"
            >
              <Download className="w-3.5 h-3.5" /> Download Redacted PNG
            </button>
          )}
        </div>

        {censorSrc && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400">
              Click and drag across any sensitive region on the image to permanently censor it.
            </p>
            <canvas
              ref={censorCanvasRef}
              onMouseDown={(e) => setDragStart(getCanvasCoords(e))}
              onMouseUp={(e) => {
                if (!dragStart) return;
                const end = getCanvasCoords(e);
                setCensorBoxes((prev) => [
                  ...prev,
                  {
                    x: dragStart.x,
                    y: dragStart.y,
                    w: end.x - dragStart.x,
                    h: end.y - dragStart.y,
                  },
                ]);
                setDragStart(null);
              }}
              className="max-h-96 max-w-full rounded-2xl border border-slate-800 mx-auto cursor-crosshair select-none"
            />
          </div>
        )}
      </div>
    );
  }

  // #18 WEBP to PNG / JPG Converter
  if (slug === 'webp-to-png-jpg-converter') {
    const convertWebp = async () => {
      if (!webpSrc) return;
      const img = await loadImg(webpSrc);
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      if (webpOutFmt === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
      }
      ctx.drawImage(img, 0, 0);
      c.toBlob(
        (b) => {
          if (b) setWebpOutUrl(URL.createObjectURL(b));
        },
        webpOutFmt,
        0.92
      );
    };

    return (
      <div className="space-y-5">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-8 cursor-pointer bg-slate-950/60">
          <Upload className="w-6 h-6 text-indigo-400 mb-2" />
          <span className="text-sm font-semibold text-white">
            {webpName || 'Upload WEBP Image'}
          </span>
          <input
            type="file"
            accept="image/webp,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setWebpName(f.name);
                setWebpSrc(URL.createObjectURL(f));
                setWebpOutUrl(null);
              }
            }}
            className="hidden"
          />
        </label>

        <div className="flex flex-wrap gap-3 text-xs">
          <select
            value={webpOutFmt}
            onChange={(e) => setWebpOutFmt(e.target.value as 'image/png' | 'image/jpeg')}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white"
          >
            <option value="image/png">Export as PNG (Lossless)</option>
            <option value="image/jpeg">Export as JPG</option>
          </select>
          <button
            onClick={convertWebp}
            disabled={!webpSrc}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-semibold text-white"
          >
            Convert Image
          </button>
        </div>

        {webpOutUrl && (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={webpOutUrl} alt="Converted preview" className="max-h-64 rounded-xl border border-slate-800" />
            <a
              href={webpOutUrl}
              download={`${webpName.replace(/\.[^.]+$/, '') || 'converted'}.${
                webpOutFmt === 'image/png' ? 'png' : 'jpg'
              }`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
            >
              <Download className="w-4 h-4" /> Download {webpOutFmt === 'image/png' ? 'PNG' : 'JPG'}
            </a>
          </div>
        )}
      </div>
    );
  }

  // #19 Base64 to Image & Image to Base64
  if (slug === 'base64-image-converter') {
    const readAsDataUri = (file: File | undefined) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setB64DataUri(String(reader.result || ''));
      reader.readAsDataURL(file);
    };

    const previewSrc = b64DataUri.trim().startsWith('data:image')
      ? b64DataUri.trim()
      : b64DataUri.trim().length > 20
      ? `data:image/png;base64,${b64DataUri.trim()}`
      : '';

    return (
      <div className="space-y-5">
        <div className="flex gap-2">
          <button
            onClick={() => setB64Mode('img-to-b64')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              b64Mode === 'img-to-b64'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Image → Base64
          </button>
          <button
            onClick={() => setB64Mode('b64-to-img')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              b64Mode === 'b64-to-img'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Base64 → Image
          </button>
        </div>

        {b64Mode === 'img-to-b64' && (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-7 cursor-pointer bg-slate-950/60">
            <Upload className="w-6 h-6 text-indigo-400 mb-2" />
            <span className="text-sm font-semibold text-white">Upload Image to Encode as Base64 Data URI</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => readAsDataUri(e.target.files?.[0])}
              className="hidden"
            />
          </label>
        )}

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs text-slate-400">Base64 / Data URI String</label>
            <CopyBtn copied={copied} onClick={() => copyText(b64DataUri)} />
          </div>
          <textarea
            rows={5}
            value={b64DataUri}
            onChange={(e) => setB64DataUri(e.target.value)}
            placeholder="data:image/png;base64,iVBORw0KGgo..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300"
          />
        </div>

        {previewSrc && (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewSrc} alt="Decoded preview" className="max-h-64 rounded-xl border border-slate-800" />
            <a
              href={previewSrc}
              download="decoded-image.png"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
            >
              <Download className="w-4 h-4" /> Download Image
            </a>
          </div>
        )}
      </div>
    );
  }

  // #20 SVG to PNG / PDF Exporter
  const rasterizeSvg = async (): Promise<HTMLCanvasElement> => {
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = await loadImg(url);
      const w = Math.max(100, (img.naturalWidth || 400) * svgScale);
      const h = Math.max(100, (img.naturalHeight || 240) * svgScale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(img, 0, 0, w, h);
      return c;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const exportSvgPng = async () => {
    setError(null);
    try {
      const c = await rasterizeSvg();
      c.toBlob((b) => b && downloadBlob(b, `vector-${svgScale}x.png`), 'image/png');
    } catch {
      setError('Invalid SVG markup. Make sure the root <svg> has xmlns="http://www.w3.org/2000/svg".');
    }
  };

  const exportSvgPdf = async () => {
    setError(null);
    try {
      const c = await rasterizeSvg();
      const pngBlob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
      if (!pngBlob) throw new Error('Rasterize failed');
      const doc = await PDFDocument.create();
      const embedded = await doc.embedPng(await pngBlob.arrayBuffer());
      const page = doc.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
      downloadBytes(await doc.save(), 'vector-export.pdf', 'application/pdf');
    } catch {
      setError('Could not export SVG to PDF. Verify valid SVG XML syntax.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white cursor-pointer">
          <Upload className="w-3.5 h-3.5 text-indigo-400" /> Load .svg File
          <input
            type="file"
            accept=".svg,image/svg+xml"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) f.text().then(setSvgMarkup);
            }}
            className="hidden"
          />
        </label>
        <select
          value={svgScale}
          onChange={(e) => setSvgScale(Number(e.target.value))}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
        >
          <option value={1}>Scale: 1x</option>
          <option value={2}>Scale: 2x (Retina)</option>
          <option value={4}>Scale: 4x (Print HD)</option>
        </select>
        <button
          onClick={exportSvgPng}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
        >
          <Download className="w-3.5 h-3.5" /> Export PNG
        </button>
        <button
          onClick={exportSvgPdf}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
        >
          <Download className="w-3.5 h-3.5" /> Export PDF
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
          {error}
        </div>
      )}

      <textarea
        rows={9}
        value={svgMarkup}
        onChange={(e) => setSvgMarkup(e.target.value)}
        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
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