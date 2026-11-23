'use client';

import { useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { marked } from 'marked';
import {
  Upload,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  Printer,
  Loader2,
} from 'lucide-react';
import {
  downloadBytes,
  downloadBlob,
  sanitizeWinAnsi,
  loadPdfJs,
} from '@/components/tools/engines/pdfHelpers';

interface RedactionBox {
  id: string;
  page: number;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

interface InvoiceItem {
  id: string;
  desc: string;
  qty: number;
  rate: number;
}

export default function PdfToolsB({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // #29 Metadata Editor
  const [metaFile, setMetaFile] = useState<File | null>(null);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaAuthor, setMetaAuthor] = useState('');
  const [metaSubject, setMetaSubject] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');

  // #30 Markdown to PDF/HTML
  const [mdText, setMdText] = useState(
    '# Project Proposal\n\nPrepared locally using **QuickTools**.\n\n## Key Deliverables\n\n- 100% client-side execution\n- Zero server storage\n- Instant print & PDF export\n'
  );

  // #31 TXT / CSV to PDF
  const [txtMode, setTxtMode] = useState<'txt' | 'csv'>('csv');
  const [txtBody, setTxtBody] = useState(
    'Item,Category,Status,Owner\nPDF Merger,Document,Live,Core\nJWT Decoder,Developer,Live,Core\nQR Generator,SEO,Live,Core'
  );

  // #32 PDF Redactor
  const [redactFile, setRedactFile] = useState<File | null>(null);
  const [redactPageCount, setRedactPageCount] = useState(1);
  const [boxes, setBoxes] = useState<RedactionBox[]>([
    { id: '1', page: 1, xPct: 10, yPct: 15, wPct: 45, hPct: 6 },
  ]);

  // #33 Extract Text from PDF
  const [extractedText, setExtractedText] = useState('');

  // #34 Invoice Generator
  const [invFrom, setInvFrom] = useState('Acme Digital Studio\n123 Market St, Suite 400');
  const [invTo, setInvTo] = useState('Client Corp LLC\n456 Business Ave');
  const [invNumber, setInvNumber] = useState('INV-2026-001');
  const [invDate, setInvDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [invCurrency, setInvCurrency] = useState('$');
  const [invTaxRate, setInvTaxRate] = useState(10);
  const [invItems, setInvItems] = useState<InvoiceItem[]>([
    { id: '1', desc: 'Frontend Architecture & UI Engineering', qty: 1, rate: 1500 },
    { id: '2', desc: 'SEO & Performance Optimization', qty: 2, rate: 350 },
  ]);

  // #35 Bulk Certificates Generator
  const [certTitle, setCertTitle] = useState('Certificate of Completion');
  const [certSubtitle, setCertSubtitle] = useState('This certifies that');
  const [certIssuer, setCertIssuer] = useState('QuickTools Academy');
  const [certCsv, setCertCsv] = useState(
    'Name,Course,Date\nAisha Rahman,Full-Stack Next.js Mastery,November 2026\nDavid Chen,Cloud Security Foundations,November 2026\nPriya Nair,Technical SEO Engineering,November 2026'
  );

  const copyText = async (val: string) => {
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // #29 PDF Metadata Editor
  if (slug === 'pdf-metadata-editor') {
    const loadMetaPdf = async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      setStatus(null);
      try {
        const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
        setMetaFile(file);
        setMetaTitle(doc.getTitle() || '');
        setMetaAuthor(doc.getAuthor() || '');
        setMetaSubject(doc.getSubject() || '');
        setMetaKeywords(doc.getKeywords() || '');
      } catch {
        setError('Could not load PDF metadata.');
      }
    };

    const saveMetadata = async () => {
      if (!metaFile) return;
      setBusy(true);
      try {
        const doc = await PDFDocument.load(await metaFile.arrayBuffer(), {
          ignoreEncryption: true,
        });
        doc.setTitle(sanitizeWinAnsi(metaTitle));
        doc.setAuthor(sanitizeWinAnsi(metaAuthor));
        doc.setSubject(sanitizeWinAnsi(metaSubject));
        doc.setKeywords(
          metaKeywords
            .split(',')
            .map((k) => sanitizeWinAnsi(k.trim()))
            .filter(Boolean)
        );
        downloadBytes(await doc.save(), `updated-${metaFile.name}`, 'application/pdf');
        setStatus('Updated PDF metadata and exported file.');
      } catch {
        setError('Failed to save PDF metadata.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-5">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-8 cursor-pointer bg-slate-950/60">
          <Upload className="w-6 h-6 text-indigo-400 mb-2" />
          <span className="text-sm font-semibold text-white">
            {metaFile ? metaFile.name : 'Upload PDF to Inspect & Edit Metadata'}
          </span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => loadMetaPdf(e.target.files?.[0])}
            className="hidden"
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Document Title</label>
            <input
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Author</label>
            <input
              value={metaAuthor}
              onChange={(e) => setMetaAuthor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Subject</label>
            <input
              value={metaSubject}
              onChange={(e) => setMetaSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Keywords (comma-separated)</label>
            <input
              value={metaKeywords}
              onChange={(e) => setMetaKeywords(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
            />
          </div>
        </div>

        <Feedback error={error} status={status} />

        <button
          onClick={saveMetadata}
          disabled={busy || !metaFile}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white"
        >
          <Download className="w-4 h-4" /> Save Metadata &amp; Download PDF
        </button>
      </div>
    );
  }

  // #30 Markdown to PDF / HTML Exporter
  if (slug === 'markdown-to-pdf-exporter') {
    const renderedHtml = (marked.parse(mdText, { async: false }) as string).replace(
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      ''
    );

    const buildStandaloneHtml = () => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Exported Document</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 780px; margin: 40px auto; padding: 0 24px; color: #0f172a; line-height: 1.65; }
  h1, h2, h3 { color: #0f172a; margin-top: 1.4em; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  pre { background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 8px; overflow-x: auto; }
  blockquote { border-left: 4px solid #6366f1; margin: 0; padding-left: 14px; color: #475569; }
</style>
</head>
<body>${renderedHtml}</body>
</html>`;

    const printToPdf = () => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(buildStandaloneHtml());
        doc.close();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }
      setTimeout(() => document.body.removeChild(iframe), 1500);
    };

    const downloadHtml = () => {
      const blob = new Blob([buildStandaloneHtml()], { type: 'text/html;charset=utf-8' });
      downloadBlob(blob, 'document.html');
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={printToPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
          <button
            onClick={downloadHtml}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white"
          >
            <Download className="w-4 h-4" /> Download Styled HTML
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            rows={12}
            value={mdText}
            onChange={(e) => setMdText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
          />
          <div
            className="bg-white text-slate-900 rounded-2xl p-6 text-sm space-y-3 overflow-auto max-h-[340px] [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      </div>
    );
  }

  // #31 TXT / CSV to PDF Generator
  if (slug === 'txt-csv-to-pdf-generator') {
    const generateTextPdf = async () => {
      if (!txtBody.trim()) return;
      setBusy(true);
      setError(null);
      try {
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const bold = await doc.embedFont(StandardFonts.HelveticaBold);

        let page = doc.addPage([595.28, 841.89]);
        let y = 795;
        const margin = 44;

        const nextPageIfNeeded = () => {
          if (y < 52) {
            page = doc.addPage([595.28, 841.89]);
            y = 795;
          }
        };

        if (txtMode === 'csv') {
          const parsed = Papa.parse<string[]>(txtBody.trim(), { skipEmptyLines: true });
          const rows = parsed.data;
          const colCount = Math.max(1, rows[0]?.length || 1);
          const colW = (595.28 - margin * 2) / colCount;

          rows.forEach((row, rIdx) => {
            nextPageIfNeeded();
            if (rIdx === 0) {
              page.drawRectangle({
                x: margin,
                y: y - 4,
                width: 595.28 - margin * 2,
                height: 20,
                color: rgb(0.92, 0.93, 0.97),
              });
            }
            row.forEach((cell, cIdx) => {
              const safe = sanitizeWinAnsi(String(cell || '')).slice(0, 28);
              page.drawText(safe, {
                x: margin + cIdx * colW + 4,
                y: y + 2,
                size: rIdx === 0 ? 10 : 9.5,
                font: rIdx === 0 ? bold : font,
                color: rgb(0.1, 0.12, 0.18),
              });
            });
            y -= 20;
          });
        } else {
          const lines = txtBody.split('\n');
          for (const rawLine of lines) {
            const safe = sanitizeWinAnsi(rawLine);
            const chunks = safe.match(/.{1,88}/g) || [''];
            for (const chunk of chunks) {
              nextPageIfNeeded();
              page.drawText(chunk, {
                x: margin,
                y,
                size: 10.5,
                font,
                color: rgb(0.1, 0.12, 0.18),
              });
              y -= 16;
            }
          }
        }

        downloadBytes(await doc.save(), `converted-${txtMode}.pdf`, 'application/pdf');
        setStatus(`Exported ${txtMode.toUpperCase()} content to PDF.`);
      } catch {
        setError('Could not generate PDF from input.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTxtMode('csv')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              txtMode === 'csv'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            CSV Table Mode
          </button>
          <button
            onClick={() => setTxtMode('txt')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              txtMode === 'txt'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Plain Text Mode
          </button>
        </div>

        <textarea
          rows={9}
          value={txtBody}
          onChange={(e) => setTxtBody(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
        />

        <Feedback error={error} status={status} />

        <button
          onClick={generateTextPdf}
          disabled={busy || !txtBody.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
        >
          <Download className="w-4 h-4" /> Generate &amp; Download PDF
        </button>
      </div>
    );
  }

  // #32 PDF Redactor (Blackout Regions)
  if (slug === 'pdf-redactor') {
    const loadRedactPdf = async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      try {
        const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
        setRedactFile(file);
        setRedactPageCount(doc.getPageCount());
      } catch {
        setError('Could not load PDF.');
      }
    };

    const applyRedactions = async () => {
      if (!redactFile) return;
      setBusy(true);
      setError(null);
      try {
        const doc = await PDFDocument.load(await redactFile.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const pages = doc.getPages();
        for (const box of boxes) {
          const page = pages[box.page - 1];
          if (!page) continue;
          const { width, height } = page.getSize();
          const x = (box.xPct / 100) * width;
          const w = (box.wPct / 100) * width;
          const h = (box.hPct / 100) * height;
          const y = height - (box.yPct / 100) * height - h;
          page.drawRectangle({ x, y, width: w, height: h, color: rgb(0, 0, 0) });
        }
        downloadBytes(await doc.save(), `redacted-${redactFile.name}`, 'application/pdf');
        setStatus(`Applied ${boxes.length} blackout redaction block(s).`);
      } catch {
        setError('Failed to apply redactions.');
      } finally {
        setBusy(false);
      }
    };

    const updateBox = (id: string, field: keyof RedactionBox, val: number) => {
      setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: val } : b)));
    };

    return (
      <div className="space-y-5">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-7 cursor-pointer bg-slate-950/60">
          <Upload className="w-6 h-6 text-indigo-400 mb-2" />
          <span className="text-sm font-semibold text-white">
            {redactFile
              ? `${redactFile.name} (${redactPageCount} pages)`
              : 'Upload PDF to Apply Blackout Redaction'}
          </span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => loadRedactPdf(e.target.files?.[0])}
            className="hidden"
          />
        </label>

        <div className="space-y-3">
          {boxes.map((b, idx) => (
            <div
              key={b.id}
              className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs items-end"
            >
              <NumInput
                label={`Box ${idx + 1} Page`}
                val={b.page}
                min={1}
                max={redactPageCount}
                onChange={(v) => updateBox(b.id, 'page', v)}
              />
              <NumInput
                label="Left (%)"
                val={b.xPct}
                min={0}
                max={95}
                onChange={(v) => updateBox(b.id, 'xPct', v)}
              />
              <NumInput
                label="Top (%)"
                val={b.yPct}
                min={0}
                max={95}
                onChange={(v) => updateBox(b.id, 'yPct', v)}
              />
              <NumInput
                label="Width (%)"
                val={b.wPct}
                min={2}
                max={100}
                onChange={(v) => updateBox(b.id, 'wPct', v)}
              />
              <NumInput
                label="Height (%)"
                val={b.hPct}
                min={2}
                max={100}
                onChange={(v) => updateBox(b.id, 'hPct', v)}
              />
              <button
                onClick={() => setBoxes(boxes.filter((x) => x.id !== b.id))}
                className="py-2 rounded-lg bg-slate-900 text-slate-400 hover:text-rose-400 flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() =>
              setBoxes([
                ...boxes,
                { id: crypto.randomUUID(), page: 1, xPct: 10, yPct: 30, wPct: 40, hPct: 6 },
              ])
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white"
          >
            <Plus className="w-3.5 h-3.5" /> Add Redaction Box
          </button>
          <button
            onClick={applyRedactions}
            disabled={busy || !redactFile || boxes.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white"
          >
            <Download className="w-4 h-4" /> Apply Blackout &amp; Download
          </button>
        </div>

        <Feedback error={error} status={status} />
      </div>
    );
  }

  // #33 Extract Text from PDF
  if (slug === 'extract-text-from-pdf') {
    const extractPdfText = async (file: File | undefined) => {
      if (!file) return;
      setBusy(true);
      setError(null);
      setExtractedText('');
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        try {
          const pdfjsLib = await loadPdfJs();
          const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
          const chunks: string[] = [];
          for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            const line = content.items.map((item) => item.str || '').join(' ');
            chunks.push(`--- Page ${p} ---\n${line}`);
          }
          setExtractedText(chunks.join('\n\n'));
          setStatus(`Extracted text from ${pdf.numPages} page(s).`);
        } catch {
          // Offline fallback: scan raw ASCII text literals inside PDF parentheses
          const rawStr = new TextDecoder('latin1').decode(bytes);
          const literalMatches = rawStr.match(/\(([^()\\]{3,})\)/g) || [];
          const fallback = literalMatches.map((m) => m.slice(1, -1)).join(' ');
          setExtractedText(
            fallback || 'No uncompressed text found. Connect online for compressed PDF stream decoding.'
          );
        }
      } catch {
        setError('Could not read PDF file.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-4">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-8 cursor-pointer bg-slate-950/60">
          {busy ? (
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
          ) : (
            <Upload className="w-6 h-6 text-indigo-400 mb-2" />
          )}
          <span className="text-sm font-semibold text-white">
            {busy ? 'Extracting text locally...' : 'Upload PDF to Extract Plain Text'}
          </span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => extractPdfText(e.target.files?.[0])}
            className="hidden"
          />
        </label>

        <Feedback error={error} status={status} />

        {extractedText && (
          <div className="space-y-2">
            <div className="flex justify-end gap-2">
              <button
                onClick={() => copyText(extractedText)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
              <button
                onClick={() =>
                  downloadBlob(
                    new Blob([extractedText], { type: 'text/plain;charset=utf-8' }),
                    'extracted-text.txt'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white"
              >
                <Download className="w-3.5 h-3.5" /> Download .txt
              </button>
            </div>
            <textarea
              readOnly
              rows={11}
              value={extractedText}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200"
            />
          </div>
        )}
      </div>
    );
  }

  // #34 Invoices / Receipt Generator
  if (slug === 'invoices-receipt-generator') {
    const subtotal = invItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
    const tax = subtotal * (invTaxRate / 100);
    const total = subtotal + tax;

    const exportInvoicePdf = async () => {
      setBusy(true);
      try {
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const bold = await doc.embedFont(StandardFonts.HelveticaBold);
        const page = doc.addPage([595.28, 841.89]);
        const cur = sanitizeWinAnsi(invCurrency);

        // Header banner
        page.drawRectangle({ x: 0, y: 745, width: 595.28, height: 97, color: rgb(0.11, 0.14, 0.28) });
        page.drawText('INVOICE', { x: 48, y: 790, size: 26, font: bold, color: rgb(1, 1, 1) });
        page.drawText(sanitizeWinAnsi(`#${invNumber}`), {
          x: 420,
          y: 798,
          size: 12,
          font: bold,
          color: rgb(0.82, 0.86, 1),
        });
        page.drawText(sanitizeWinAnsi(`Date: ${invDate}`), {
          x: 420,
          y: 778,
          size: 10,
          font,
          color: rgb(0.82, 0.86, 1),
        });

        // From / Bill To
        page.drawText('FROM', { x: 48, y: 710, size: 9, font: bold, color: rgb(0.4, 0.45, 0.55) });
        invFrom.split('\n').forEach((line, i) => {
          page.drawText(sanitizeWinAnsi(line), {
            x: 48,
            y: 694 - i * 15,
            size: 10.5,
            font: i === 0 ? bold : font,
            color: rgb(0.1, 0.12, 0.18),
          });
        });

        page.drawText('BILL TO', { x: 320, y: 710, size: 9, font: bold, color: rgb(0.4, 0.45, 0.55) });
        invTo.split('\n').forEach((line, i) => {
          page.drawText(sanitizeWinAnsi(line), {
            x: 320,
            y: 694 - i * 15,
            size: 10.5,
            font: i === 0 ? bold : font,
            color: rgb(0.1, 0.12, 0.18),
          });
        });

        // Table Header
        let y = 615;
        page.drawRectangle({ x: 48, y: y - 6, width: 499, height: 24, color: rgb(0.94, 0.95, 0.98) });
        page.drawText('Description', { x: 56, y: y + 2, size: 10, font: bold, color: rgb(0.15, 0.18, 0.28) });
        page.drawText('Qty', { x: 350, y: y + 2, size: 10, font: bold, color: rgb(0.15, 0.18, 0.28) });
        page.drawText('Rate', { x: 405, y: y + 2, size: 10, font: bold, color: rgb(0.15, 0.18, 0.28) });
        page.drawText('Amount', { x: 475, y: y + 2, size: 10, font: bold, color: rgb(0.15, 0.18, 0.28) });

        y -= 28;
        invItems.forEach((item) => {
          const lineAmt = item.qty * item.rate;
          page.drawText(sanitizeWinAnsi(item.desc).slice(0, 48), {
            x: 56,
            y,
            size: 10,
            font,
            color: rgb(0.12, 0.14, 0.2),
          });
          page.drawText(String(item.qty), { x: 350, y, size: 10, font, color: rgb(0.12, 0.14, 0.2) });
          page.drawText(`${cur}${item.rate.toFixed(2)}`, {
            x: 405,
            y,
            size: 10,
            font,
            color: rgb(0.12, 0.14, 0.2),
          });
          page.drawText(`${cur}${lineAmt.toFixed(2)}`, {
            x: 475,
            y,
            size: 10,
            font: bold,
            color: rgb(0.12, 0.14, 0.2),
          });
          y -= 22;
        });

        // Totals
        y -= 16;
        page.drawText(`Subtotal: ${cur}${subtotal.toFixed(2)}`, {
          x: 395,
          y,
          size: 10.5,
          font,
          color: rgb(0.25, 0.28, 0.35),
        });
        y -= 18;
        page.drawText(`Tax (${invTaxRate}%): ${cur}${tax.toFixed(2)}`, {
          x: 395,
          y,
          size: 10.5,
          font,
          color: rgb(0.25, 0.28, 0.35),
        });
        y -= 24;
        page.drawText(`TOTAL: ${cur}${total.toFixed(2)}`, {
          x: 395,
          y,
          size: 14,
          font: bold,
          color: rgb(0.18, 0.24, 0.65),
        });

        downloadBytes(await doc.save(), `${invNumber || 'invoice'}.pdf`, 'application/pdf');
        setStatus('Invoice PDF downloaded.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">From (Your Business)</label>
            <textarea
              rows={3}
              value={invFrom}
              onChange={(e) => setInvFrom(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Bill To (Client)</label>
            <textarea
              rows={3}
              value={invTo}
              onChange={(e) => setInvTo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Invoice #</label>
            <input
              value={invNumber}
              onChange={(e) => setInvNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={invDate}
              onChange={(e) => setInvDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Currency Symbol</label>
            <input
              value={invCurrency}
              onChange={(e) => setInvCurrency(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Tax (%)</label>
            <input
              type="number"
              value={invTaxRate}
              onChange={(e) => setInvTaxRate(Number(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          {invItems.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center text-xs">
              <input
                value={item.desc}
                onChange={(e) =>
                  setInvItems(
                    invItems.map((x) => (x.id === item.id ? { ...x, desc: e.target.value } : x))
                  )
                }
                placeholder="Line item description"
                className="col-span-6 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
              <input
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) =>
                  setInvItems(
                    invItems.map((x) =>
                      x.id === item.id ? { ...x, qty: Number(e.target.value) || 0 } : x
                    )
                  )
                }
                className="col-span-2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-mono"
              />
              <input
                type="number"
                min={0}
                value={item.rate}
                onChange={(e) =>
                  setInvItems(
                    invItems.map((x) =>
                      x.id === item.id ? { ...x, rate: Number(e.target.value) || 0 } : x
                    )
                  )
                }
                className="col-span-3 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-mono"
              />
              <button
                onClick={() => setInvItems(invItems.filter((x) => x.id !== item.id))}
                className="col-span-1 text-slate-400 hover:text-rose-400 flex justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
          <button
            onClick={() =>
              setInvItems([...invItems, { id: crypto.randomUUID(), desc: '', qty: 1, rate: 0 }])
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white"
          >
            <Plus className="w-3.5 h-3.5" /> Add Line Item
          </button>
          <div className="text-right text-sm font-mono">
            <span className="text-slate-400 mr-3">Total:</span>
            <span className="text-xl font-black text-emerald-400">
              {invCurrency}
              {total.toFixed(2)}
            </span>
          </div>
        </div>

        <button
          onClick={exportInvoicePdf}
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
        >
          <Download className="w-4 h-4" /> Download Invoice PDF
        </button>
        <Feedback error={error} status={status} />
      </div>
    );
  }

  // #35 Certificates Generator in Bulk
  const generateBulkCerts = async () => {
    setBusy(true);
    setError(null);
    try {
      const parsed = Papa.parse<Record<string, string>>(certCsv.trim(), {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.data.length === 0) {
        setError('Provide at least one recipient row in CSV format (Name,Course,Date).');
        return;
      }

      const zip = new JSZip();
      for (let idx = 0; idx < parsed.data.length; idx++) {
        const row = parsed.data[idx];
        const recipient = sanitizeWinAnsi(row.Name || row.name || `Recipient ${idx + 1}`);
        const course = sanitizeWinAnsi(row.Course || row.course || 'Program Completion');
        const dateVal = sanitizeWinAnsi(
          row.Date || row.date || new Date().toISOString().split('T')[0]
        );

        const doc = await PDFDocument.create();
        const page = doc.addPage([841.89, 595.28]); // Landscape A4
        const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
        const regular = await doc.embedFont(StandardFonts.Helvetica);
        const bold = await doc.embedFont(StandardFonts.HelveticaBold);

        // Decorative double border
        page.drawRectangle({
          x: 28,
          y: 28,
          width: 785.89,
          height: 539.28,
          borderColor: rgb(0.24, 0.28, 0.62),
          borderWidth: 4,
        });
        page.drawRectangle({
          x: 40,
          y: 40,
          width: 761.89,
          height: 515.28,
          borderColor: rgb(0.75, 0.62, 0.28),
          borderWidth: 1.5,
        });

        const drawCentered = (txt: string, yPos: number, size: number, f = regular, col = rgb(0.1, 0.12, 0.2)) => {
          const safe = sanitizeWinAnsi(txt);
          const w = f.widthOfTextAtSize(safe, size);
          page.drawText(safe, { x: (841.89 - w) / 2, y: yPos, size, font: f, color: col });
        };

        drawCentered(certTitle.toUpperCase(), 455, 30, serif, rgb(0.18, 0.22, 0.52));
        drawCentered(certSubtitle, 405, 14, regular, rgb(0.35, 0.38, 0.45));
        drawCentered(recipient, 330, 36, serif, rgb(0.08, 0.1, 0.16));
        drawCentered(`has successfully completed ${course}`, 265, 16, bold, rgb(0.2, 0.24, 0.32));
        drawCentered(`Issued by ${certIssuer} • ${dateVal}`, 140, 12, regular, rgb(0.4, 0.44, 0.5));

        const safeFile = recipient.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        zip.file(`certificate-${safeFile || idx + 1}.pdf`, await doc.save());
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, 'bulk-certificates.zip');
      setStatus(`Generated ${parsed.data.length} PDF certificates inside bulk-certificates.zip.`);
    } catch {
      setError('Failed to generate bulk certificates.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1">Certificate Title</label>
          <input
            value={certTitle}
            onChange={(e) => setCertTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Subtitle</label>
          <input
            value={certSubtitle}
            onChange={(e) => setCertSubtitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Issuer Organization</label>
          <input
            value={certIssuer}
            onChange={(e) => setCertIssuer(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">
          Recipients CSV (Columns: Name, Course, Date)
        </label>
        <textarea
          rows={6}
          value={certCsv}
          onChange={(e) => setCertCsv(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
        />
      </div>

      <Feedback error={error} status={status} />

      <button
        onClick={generateBulkCerts}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Generate Bulk Certificates (.zip)
      </button>
    </div>
  );
}

function NumInput({
  label,
  val,
  min,
  max,
  onChange,
}: {
  label: string;
  val: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] text-slate-400 mb-1">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={val}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
      />
    </div>
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