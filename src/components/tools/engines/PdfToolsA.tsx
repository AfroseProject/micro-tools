'use client';

import { useState } from 'react';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import {
  Upload,
  Download,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Lock,
  Unlock,
  Loader2,
} from 'lucide-react';
import {
  downloadBytes,
  downloadBlob,
  parsePageRange,
  sanitizeWinAnsi,
  loadPdfJs,
} from '@/components/tools/engines/pdfHelpers';

interface PageOrderItem {
  originalIndex: number;
  rotation: number;
}

interface RenderedPageImage {
  page: number;
  dataUrl: string;
}

export default function PdfToolsA({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // #21 Merger & #27 Images to PDF
  const [files, setFiles] = useState<File[]>([]);
  const [imgPageMode, setImgPageMode] = useState<'fit' | 'a4'>('a4');

  // Single PDF tools (#22, #23, #24, #25, #26, #28)
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);

  // #22 Splitter
  const [rangeStr, setRangeStr] = useState('1-2');

  // #23 Reorder & Rotate
  const [pageItems, setPageItems] = useState<PageOrderItem[]>([]);

  // #24 Watermark
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [wmSize, setWmSize] = useState(48);
  const [wmOpacity, setWmOpacity] = useState(0.28);
  const [wmAngle, setWmAngle] = useState(45);

  // #25 Page Numberer
  const [numPosition, setNumPosition] = useState<'bottom-center' | 'bottom-right' | 'top-right'>(
    'bottom-center'
  );
  const [numTemplate, setNumTemplate] = useState('Page {n} of {total}');
  const [numStart, setNumStart] = useState(1);

  // #26 PDF to Images
  const [imgFormat, setImgFormat] = useState<'png' | 'jpeg'>('png');
  const [imgScale, setImgScale] = useState<number>(1.5);
  const [renderedImages, setRenderedImages] = useState<RenderedPageImage[]>([]);

  // #28 PDF Password Protector / AES-GCM Vault Wrapper
  const [lockMode, setLockMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [lockPass, setLockPass] = useState('');
  const [ownerNotice, setOwnerNotice] = useState('Protected — Authorized Viewing Only');

  const inspectSinglePdf = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setStatus(null);
    setRenderedImages([]);
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const count = doc.getPageCount();
      setSingleFile(file);
      setPageCount(count);
      setRangeStr(count > 1 ? `1-${Math.min(2, count)}` : '1');
      setPageItems(
        Array.from({ length: count }, (_, idx) => ({ originalIndex: idx, rotation: 0 }))
      );
    } catch {
      setError('Could not read PDF file. Ensure it is a valid, uncorrupted PDF.');
    }
  };

  // #21 PDF Merger
  if (slug === 'pdf-merger') {
    const moveFile = (idx: number, dir: -1 | 1) => {
      const next = [...files];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return;
      [next[idx], next[target]] = [next[target], next[idx]];
      setFiles(next);
    };

    const mergeAll = async () => {
      if (files.length < 2) {
        setError('Add at least 2 PDF files to merge.');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const merged = await PDFDocument.create();
        for (const f of files) {
          const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
          const copied = await merged.copyPages(src, src.getPageIndices());
          copied.forEach((p) => merged.addPage(p));
        }
        const out = await merged.save();
        downloadBytes(out, 'merged-document.pdf', 'application/pdf');
        setStatus(`Merged ${files.length} PDFs (${merged.getPageCount()} total pages).`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to merge PDFs.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label="Select Multiple PDF Files to Merge"
          accept="application/pdf"
          multiple
          onFiles={(list) => {
            setError(null);
            setFiles((prev) => [...prev, ...Array.from(list)]);
          }}
        />

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, idx) => (
              <div
                key={`${f.name}-${idx}`}
                className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs"
              >
                <span className="font-mono text-slate-200 truncate">
                  {idx + 1}. {f.name} ({(f.size / 1024).toFixed(1)} KB)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => moveFile(idx, -1)}
                    className="p-1.5 text-slate-400 hover:text-white"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveFile(idx, 1)}
                    className="p-1.5 text-slate-400 hover:text-white"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                    className="p-1.5 text-slate-400 hover:text-rose-400"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Feedback error={error} status={status} />

        <button
          onClick={mergeAll}
          disabled={busy || files.length < 2}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white transition"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Merge {files.length} PDFs
        </button>
      </div>
    );
  }

  // #22 PDF Splitter & Page Extractor
  if (slug === 'pdf-splitter-page-extractor') {
    const extractRange = async () => {
      if (!singleFile) return;
      setBusy(true);
      setError(null);
      try {
        const src = await PDFDocument.load(await singleFile.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const indices = parsePageRange(rangeStr, src.getPageCount());
        if (indices.length === 0) {
          setError(`Enter valid page numbers between 1 and ${src.getPageCount()}.`);
          return;
        }
        const outDoc = await PDFDocument.create();
        const pages = await outDoc.copyPages(src, indices);
        pages.forEach((p) => outDoc.addPage(p));
        downloadBytes(await outDoc.save(), `extracted-pages.pdf`, 'application/pdf');
        setStatus(`Extracted ${indices.length} page(s) into extracted-pages.pdf.`);
      } catch {
        setError('Failed to extract pages.');
      } finally {
        setBusy(false);
      }
    };

    const splitAllZip = async () => {
      if (!singleFile) return;
      setBusy(true);
      setError(null);
      try {
        const src = await PDFDocument.load(await singleFile.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const zip = new JSZip();
        const total = src.getPageCount();
        for (let i = 0; i < total; i++) {
          const single = await PDFDocument.create();
          const [p] = await single.copyPages(src, [i]);
          single.addPage(p);
          zip.file(`page-${String(i + 1).padStart(3, '0')}.pdf`, await single.save());
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, 'split-pages.zip');
        setStatus(`Split ${total} pages into split-pages.zip.`);
      } catch {
        setError('Failed to split PDF.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label={singleFile ? `${singleFile.name} (${pageCount} pages)` : 'Upload PDF to Split'}
          accept="application/pdf"
          onFiles={(list) => inspectSinglePdf(list[0])}
        />

        {singleFile && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Page Range to Extract (e.g., 1-3, 5 — max {pageCount})
              </label>
              <input
                value={rangeStr}
                onChange={(e) => setRangeStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={extractRange}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                <Download className="w-4 h-4" /> Extract Selected Pages
              </button>
              <button
                onClick={splitAllZip}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white"
              >
                <Download className="w-4 h-4" /> Split Every Page into ZIP
              </button>
            </div>
          </div>
        )}
        <Feedback error={error} status={status} />
      </div>
    );
  }

  // #23 PDF Page Reorder & Rotator
  if (slug === 'pdf-page-reorder-rotator') {
    const movePage = (idx: number, dir: -1 | 1) => {
      const next = [...pageItems];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return;
      [next[idx], next[target]] = [next[target], next[idx]];
      setPageItems(next);
    };

    const rotatePage = (idx: number) => {
      setPageItems((prev) =>
        prev.map((item, i) =>
          i === idx ? { ...item, rotation: (item.rotation + 90) % 360 } : item
        )
      );
    };

    const exportReordered = async () => {
      if (!singleFile || pageItems.length === 0) return;
      setBusy(true);
      setError(null);
      try {
        const src = await PDFDocument.load(await singleFile.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const out = await PDFDocument.create();
        for (const item of pageItems) {
          const [copied] = await out.copyPages(src, [item.originalIndex]);
          const currentRot = copied.getRotation().angle;
          copied.setRotation(degrees((currentRot + item.rotation) % 360));
          out.addPage(copied);
        }
        downloadBytes(await out.save(), 'reordered-rotated.pdf', 'application/pdf');
        setStatus(`Exported ${pageItems.length} pages with new order and rotations.`);
      } catch {
        setError('Could not save modified PDF.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label={
            singleFile ? `${singleFile.name} (${pageCount} pages)` : 'Upload PDF to Reorder/Rotate'
          }
          accept="application/pdf"
          onFiles={(list) => inspectSinglePdf(list[0])}
        />

        {pageItems.length > 0 && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {pageItems.map((item, idx) => (
                <div
                  key={`${item.originalIndex}-${idx}`}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">Page {item.originalIndex + 1}</div>
                    <div className="text-[11px] text-slate-400">Rotate: {item.rotation}°</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => rotatePage(idx)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-slate-200"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => movePage(idx, -1)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => movePage(idx, 1)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPageItems(pageItems.filter((_, i) => i !== idx))}
                      className="p-1.5 rounded-lg bg-slate-900 hover:text-rose-400 text-slate-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={exportReordered}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
            >
              <Download className="w-4 h-4" /> Export Updated PDF
            </button>
          </>
        )}
        <Feedback error={error} status={status} />
      </div>
    );
  }

  // #24 PDF Watermark / Stamp Adder
  if (slug === 'pdf-watermark-stamp-adder') {
    const applyWatermark = async () => {
      if (!singleFile || !wmText.trim()) return;
      setBusy(true);
      setError(null);
      try {
        const doc = await PDFDocument.load(await singleFile.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const safeText = sanitizeWinAnsi(wmText.trim());
        const textWidth = font.widthOfTextAtSize(safeText, wmSize);

        for (const page of doc.getPages()) {
          const { width, height } = page.getSize();
          page.drawText(safeText, {
            x: Math.max(24, (width - textWidth * 0.7) / 2),
            y: height / 2,
            size: wmSize,
            font,
            color: rgb(0.45, 0.45, 0.55),
            opacity: wmOpacity,
            rotate: degrees(wmAngle),
          });
        }
        downloadBytes(await doc.save(), 'watermarked.pdf', 'application/pdf');
        setStatus(`Stamped "${safeText}" across ${doc.getPageCount()} pages.`);
      } catch {
        setError('Failed to watermark PDF.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label={
            singleFile ? `${singleFile.name} (${pageCount} pages)` : 'Upload PDF to Watermark'
          }
          accept="application/pdf"
          onFiles={(list) => inspectSinglePdf(list[0])}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label className="block text-slate-400 mb-1">Stamp Text</label>
            <input
              value={wmText}
              onChange={(e) => setWmText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Font Size ({wmSize}pt)</label>
            <input
              type="range"
              min={16}
              max={96}
              value={wmSize}
              onChange={(e) => setWmSize(Number(e.target.value))}
              className="w-full accent-indigo-500 mt-2"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">
              Opacity ({Math.round(wmOpacity * 100)}%) • Angle ({wmAngle}°)
            </label>
            <div className="flex gap-2 mt-2">
              <input
                type="range"
                min={0.05}
                max={0.9}
                step={0.05}
                value={wmOpacity}
                onChange={(e) => setWmOpacity(Number(e.target.value))}
                className="w-1/2 accent-indigo-500"
              />
              <input
                type="range"
                min={-90}
                max={90}
                step={5}
                value={wmAngle}
                onChange={(e) => setWmAngle(Number(e.target.value))}
                className="w-1/2 accent-indigo-500"
              />
            </div>
          </div>
        </div>

        <Feedback error={error} status={status} />

        <button
          onClick={applyWatermark}
          disabled={busy || !singleFile}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white"
        >
          <Download className="w-4 h-4" /> Apply Watermark &amp; Download
        </button>
      </div>
    );
  }

  // #25 PDF Page Numberer
  if (slug === 'pdf-page-numberer') {
    const addNumbers = async () => {
      if (!singleFile) return;
      setBusy(true);
      setError(null);
      try {
        const doc = await PDFDocument.load(await singleFile.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const pages = doc.getPages();
        const total = pages.length;

        pages.forEach((page, i) => {
          const { width, height } = page.getSize();
          const label = sanitizeWinAnsi(
            numTemplate
              .replace('{n}', String(i + numStart))
              .replace('{total}', String(total + numStart - 1))
          );
          const textW = font.widthOfTextAtSize(label, 11);
          const x =
            numPosition === 'bottom-center'
              ? (width - textW) / 2
              : Math.max(24, width - textW - 36);
          const y = numPosition === 'top-right' ? height - 32 : 24;

          page.drawText(label, { x, y, size: 11, font, color: rgb(0.25, 0.25, 0.3) });
        });

        downloadBytes(await doc.save(), 'numbered.pdf', 'application/pdf');
        setStatus(`Added page numbers to ${total} pages.`);
      } catch {
        setError('Failed to number PDF pages.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label={
            singleFile ? `${singleFile.name} (${pageCount} pages)` : 'Upload PDF to Add Page Numbers'
          }
          accept="application/pdf"
          onFiles={(list) => inspectSinglePdf(list[0])}
        />

        <div className="grid sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Position</label>
            <select
              value={numPosition}
              onChange={(e) =>
                setNumPosition(
                  e.target.value as 'bottom-center' | 'bottom-right' | 'top-right'
                )
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
            >
              <option value="bottom-center">Bottom Center</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="top-right">Top Right</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Format ({'{n}'} / {'{total}'})</label>
            <input
              value={numTemplate}
              onChange={(e) => setNumTemplate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Start Number</label>
            <input
              type="number"
              min={1}
              value={numStart}
              onChange={(e) => setNumStart(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
        </div>

        <Feedback error={error} status={status} />

        <button
          onClick={addNumbers}
          disabled={busy || !singleFile}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white"
        >
          <Download className="w-4 h-4" /> Number Pages &amp; Download
        </button>
      </div>
    );
  }

  // #26 PDF to Images (JPG/PNG)
  if (slug === 'pdf-to-images') {
    const renderAllPages = async () => {
      if (!singleFile) return;
      setBusy(true);
      setError(null);
      setRenderedImages([]);
      try {
        const pdfjsLib = await loadPdfJs();
        const bytes = new Uint8Array(await singleFile.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const results: RenderedPageImage[] = [];

        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: imgScale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          if (imgFormat === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          await page.render({ canvasContext: ctx, viewport }).promise;
          results.push({
            page: p,
            dataUrl: canvas.toDataURL(`image/${imgFormat}`, 0.92),
          });
        }
        setRenderedImages(results);
        setStatus(`Rendered ${results.length} page(s) to ${imgFormat.toUpperCase()}.`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to render PDF pages into images.'
        );
      } finally {
        setBusy(false);
      }
    };

    const downloadAllZip = async () => {
      const zip = new JSZip();
      renderedImages.forEach((img) => {
        const b64 = img.dataUrl.split(',')[1];
        zip.file(`page-${String(img.page).padStart(3, '0')}.${imgFormat}`, b64, {
          base64: true,
        });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `pdf-images-${imgFormat}.zip`);
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label={
            singleFile ? `${singleFile.name} (${pageCount} pages)` : 'Upload PDF to Render Images'
          }
          accept="application/pdf"
          onFiles={(list) => inspectSinglePdf(list[0])}
        />

        <div className="flex flex-wrap gap-3 items-center text-xs">
          <select
            value={imgFormat}
            onChange={(e) => setImgFormat(e.target.value as 'png' | 'jpeg')}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white"
          >
            <option value="png">PNG (Lossless)</option>
            <option value="jpeg">JPG (Smaller Size)</option>
          </select>
          <select
            value={imgScale}
            onChange={(e) => setImgScale(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white"
          >
            <option value={1}>Scale: 1x (Fast)</option>
            <option value={1.5}>Scale: 1.5x (Balanced)</option>
            <option value={2}>Scale: 2x (High DPI)</option>
          </select>
          <button
            onClick={renderAllPages}
            disabled={busy || !singleFile}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-semibold text-white"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Render Pages
          </button>
          {renderedImages.length > 0 && (
            <button
              onClick={downloadAllZip}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
            >
              <Download className="w-4 h-4" /> Download All as ZIP
            </button>
          )}
        </div>

        <Feedback error={error} status={status} />

        {renderedImages.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderedImages.map((img) => (
              <div
                key={img.page}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt={`Page ${img.page}`}
                  className="w-full rounded-lg border border-slate-800"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Page {img.page}</span>
                  <a
                    href={img.dataUrl}
                    download={`page-${img.page}.${imgFormat}`}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // #27 Images to PDF Creator
  if (slug === 'images-to-pdf-creator') {
    const fileToPngBytes = (file: File): Promise<Uint8Array> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error('Canvas unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error('PNG conversion failed'));
            blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)));
          }, 'image/png');
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error(`Failed to decode ${file.name}`));
        };
        img.src = url;
      });

    const createPdfFromImages = async () => {
      if (files.length === 0) return;
      setBusy(true);
      setError(null);
      try {
        const doc = await PDFDocument.create();
        for (const f of files) {
          let embedded;
          if (f.type === 'image/jpeg') {
            embedded = await doc.embedJpg(await f.arrayBuffer());
          } else if (f.type === 'image/png') {
            embedded = await doc.embedPng(await f.arrayBuffer());
          } else {
            embedded = await doc.embedPng(await fileToPngBytes(f));
          }

          if (imgPageMode === 'fit') {
            const page = doc.addPage([embedded.width, embedded.height]);
            page.drawImage(embedded, {
              x: 0,
              y: 0,
              width: embedded.width,
              height: embedded.height,
            });
          } else {
            const a4W = 595.28;
            const a4H = 841.89;
            const margin = 36;
            const scale = Math.min(
              (a4W - margin * 2) / embedded.width,
              (a4H - margin * 2) / embedded.height
            );
            const drawW = embedded.width * scale;
            const drawH = embedded.height * scale;
            const page = doc.addPage([a4W, a4H]);
            page.drawImage(embedded, {
              x: (a4W - drawW) / 2,
              y: (a4H - drawH) / 2,
              width: drawW,
              height: drawH,
            });
          }
        }
        downloadBytes(await doc.save(), 'images-bundle.pdf', 'application/pdf');
        setStatus(`Created ${files.length}-page PDF from uploaded images.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to build PDF.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-5">
        <UploadBox
          label="Upload JPG, PNG, or WEBP Images"
          accept="image/*"
          multiple
          onFiles={(list) => setFiles((prev) => [...prev, ...Array.from(list)])}
        />

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={imgPageMode}
            onChange={(e) => setImgPageMode(e.target.value as 'fit' | 'a4')}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
          >
            <option value="a4">A4 Page Size (Centered with Margins)</option>
            <option value="fit">Exact Image Dimensions</option>
          </select>
          <button
            onClick={createPdfFromImages}
            disabled={busy || files.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white"
          >
            <Download className="w-4 h-4" /> Create PDF ({files.length} images)
          </button>
          {files.length > 0 && (
            <button
              onClick={() => setFiles([])}
              className="text-xs text-slate-400 hover:text-rose-400"
            >
              Clear List
            </button>
          )}
        </div>

        {files.length > 0 && (
          <div className="text-xs text-slate-400 font-mono">
            Queue: {files.map((f) => f.name).join(' → ')}
          </div>
        )}
        <Feedback error={error} status={status} />
      </div>
    );
  }

  // #28 PDF Permission Metadata & AES-256-GCM Password Locker
  const deriveKey = async (password: string, salt: Uint8Array) => {
    const enc = new TextEncoder().encode(password);
    const keyBuf = new Uint8Array(enc.byteLength);
    keyBuf.set(enc);
    const saltCopy = new Uint8Array(salt.byteLength);
    saltCopy.set(salt);

    const baseKey = await crypto.subtle.importKey('raw', keyBuf.buffer, 'PBKDF2', false, [
      'deriveKey',
    ]);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltCopy.buffer, iterations: 120000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  const runPdfVault = async () => {
    if (!singleFile || !lockPass) {
      setError('Upload a file and enter a password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (lockMode === 'encrypt') {
        // Stamp restriction notice into PDF metadata first, then encrypt with AES-256-GCM
        const doc = await PDFDocument.load(await singleFile.arrayBuffer(), {
          ignoreEncryption: true,
        });
        doc.setSubject(sanitizeWinAnsi(ownerNotice));
        doc.setProducer('QuickTools AES-256-GCM Vault');
        const cleanPdf = await doc.save();

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(lockPass, salt);

        const pdfCopy = new Uint8Array(cleanPdf.byteLength);
        pdfCopy.set(cleanPdf);
        const ivCopy = new Uint8Array(iv.byteLength);
        ivCopy.set(iv);

        const cipher = new Uint8Array(
          await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivCopy.buffer }, key, pdfCopy.buffer)
        );
        const packed = new Uint8Array(28 + cipher.byteLength);
        packed.set(salt, 0);
        packed.set(iv, 16);
        packed.set(cipher, 28);
        downloadBytes(packed, `${singleFile.name}.locked`, 'application/octet-stream');
        setStatus('Encrypted PDF with AES-256-GCM. Use Decrypt tab with the same password to restore.');
      } else {
        const raw = new Uint8Array(await singleFile.arrayBuffer());
        if (raw.byteLength <= 28) throw new Error('Invalid locked file.');
        const salt = raw.slice(0, 16);
        const iv = raw.slice(16, 28);
        const cipher = raw.slice(28);
        const key = await deriveKey(lockPass, salt);

        const ivCopy = new Uint8Array(iv.byteLength);
        ivCopy.set(iv);
        const cipherCopy = new Uint8Array(cipher.byteLength);
        cipherCopy.set(cipher);

        const plain = new Uint8Array(
          await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivCopy.buffer },
            key,
            cipherCopy.buffer
          )
        );
        const restoredName = singleFile.name.replace(/\.locked$/, '') || 'unlocked.pdf';
        downloadBytes(plain, restoredName, 'application/pdf');
        setStatus('Decrypted and restored original PDF.');
      }
    } catch {
      setError(
        lockMode === 'decrypt'
          ? 'Decryption failed — check your password or ensure you uploaded a .locked file.'
          : 'Encryption failed.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button
          onClick={() => {
            setLockMode('encrypt');
            setSingleFile(null);
            setError(null);
            setStatus(null);
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold ${
            lockMode === 'encrypt'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-950 text-slate-400 border border-slate-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5" /> Lock PDF (AES-256-GCM)
        </button>
        <button
          onClick={() => {
            setLockMode('decrypt');
            setSingleFile(null);
            setError(null);
            setStatus(null);
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold ${
            lockMode === 'decrypt'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-950 text-slate-400 border border-slate-800'
          }`}
        >
          <Unlock className="w-3.5 h-3.5" /> Unlock .locked PDF
        </button>
      </div>

      <UploadBox
        label={
          singleFile
            ? singleFile.name
            : lockMode === 'encrypt'
            ? 'Upload PDF to Encrypt & Lock'
            : 'Upload .locked File to Decrypt'
        }
        accept={lockMode === 'encrypt' ? 'application/pdf' : '*/*'}
        onFiles={(list) => setSingleFile(list[0] || null)}
      />

      <div className="grid sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1">Password</label>
          <input
            type="password"
            value={lockPass}
            onChange={(e) => setLockPass(e.target.value)}
            placeholder="Strong encryption passphrase"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
          />
        </div>
        {lockMode === 'encrypt' && (
          <div>
            <label className="block text-slate-400 mb-1">Permission Metadata Notice</label>
            <input
              value={ownerNotice}
              onChange={(e) => setOwnerNotice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
            />
          </div>
        )}
      </div>

      <Feedback error={error} status={status} />

      <button
        onClick={runPdfVault}
        disabled={busy || !singleFile || !lockPass}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white"
      >
        {lockMode === 'encrypt' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        {lockMode === 'encrypt' ? 'Encrypt & Download' : 'Decrypt & Restore PDF'}
      </button>
    </div>
  );
}

function UploadBox({
  label,
  accept,
  multiple,
  onFiles,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: FileList) => void;
}) {
  return (
    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-8 cursor-pointer bg-slate-950/60 transition text-center">
      <Upload className="w-6 h-6 text-indigo-400 mb-2" />
      <span className="text-sm font-semibold text-white">{label}</span>
      <span className="text-[11px] text-slate-500 mt-1">
        Processed 100% locally in browser memory
      </span>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFiles(e.target.files);
          }
        }}
        className="hidden"
      />
    </label>
  );
}

function Feedback({ error, status }: { error: string | null; status: string | null }) {
  return (
    <>
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-xl">
          {error}
        </div>
      )}
      {status && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3.5 rounded-xl">
          {status}
        </div>
      )}
    </>
  );
}