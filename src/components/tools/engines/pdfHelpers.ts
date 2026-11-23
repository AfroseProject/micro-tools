export interface PdfJsViewport {
  width: number;
  height: number;
}

export interface PdfJsPage {
  getViewport: (opts: { scale: number }) => PdfJsViewport;
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfJsViewport;
  }) => { promise: Promise<void> };
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
}

export interface PdfJsDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
}

export interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfJsDocument> };
}

export function sanitizeWinAnsi(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/₹/g, 'INR ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

export function downloadBytes(bytes: Uint8Array, filename: string, mime: string) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parsePageRange(input: string, maxPages: number): number[] {
  const indices = new Set<number>();
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [sRaw, eRaw] = part.split('-').map((n) => parseInt(n.trim(), 10));
      if (!isNaN(sRaw) && !isNaN(eRaw)) {
        const start = Math.max(1, Math.min(sRaw, eRaw));
        const end = Math.min(maxPages, Math.max(sRaw, eRaw));
        for (let p = start; p <= end; p++) indices.add(p - 1);
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) indices.add(p - 1);
    }
  }
  return Array.from(indices).sort((a, b) => a - b);
}

let pdfJsPromise: Promise<PdfJsLib> | null = null;

export function loadPdfJs(): Promise<PdfJsLib> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Browser environment required'));
  }
  const w = window as unknown as { pdfjsLib?: PdfJsLib };
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);

  if (!pdfJsPromise) {
    pdfJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        const lib = (window as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;
        if (!lib) {
          reject(new Error('PDF.js failed to initialize'));
          return;
        }
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(lib);
      };
      script.onerror = () => reject(new Error('Could not load PDF.js engine from CDN'));
      document.head.appendChild(script);
    });
  }
  return pdfJsPromise;
}