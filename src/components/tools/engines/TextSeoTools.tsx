'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import {
  Copy,
  Check,
  Download,
  Volume2,
  Square,
  Mic,
  MicOff,
  Upload,
} from 'lucide-react';

interface SpeechRecognitionResultItem {
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
}

const DUMMY_SENTENCES = [
  'Modern browser engines execute complex text and media workloads locally without remote round trips.',
  'Design systems stay consistent when typography, spacing, and color tokens share a predictable rhythm.',
  'Lightweight utilities reduce context switching by keeping everyday conversions one click away.',
  'Clear information hierarchy helps readers scan technical documentation and product pages quickly.',
  'Clean URLs, descriptive metadata, and structured sitemaps improve discoverability across search engines.',
  'Client-side processing protects private drafts, contact lists, and internal records from third-party logging.',
  'Modular interfaces adapt cleanly across desktop monitors, tablets, and compact mobile viewports.',
  'Fast feedback loops encourage experimentation and simplify routine publishing workflows.',
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default function TextSeoTools({ slug }: { slug: string }) {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  // #88 Placeholder Generator
  const [paraCount, setParaCount] = useState(3);
  const [sentencesPerPara, setSentencesPerPara] = useState(4);

  // #89 Meta Tag & OG Previewer
  const [metaTitle, setMetaTitle] = useState('QuickTools — 100 Free Client-Side Micro-Tools');
  const [metaDesc, setMetaDesc] = useState(
    'Convert images, merge PDFs, format JSON, generate QR codes, and run calculators 100% locally in your browser.'
  );
  const [metaUrl, setMetaUrl] = useState('https://quicktools.example.com');
  const [metaImg, setMetaImg] = useState('');

  // #90 Slug Generator
  const [separator, setSeparator] = useState<'-' | '_'>('-');

  // #92 Text to Speech
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [speaking, setSpeaking] = useState(false);

  // #93 Speech to Text
  const [listening, setListening] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // #96 Robots.txt Generator
  const [userAgent, setUserAgent] = useState('*');
  const [disallowPaths, setDisallowPaths] = useState('/admin/\n/private/\n/api/');
  const [allowPaths, setAllowPaths] = useState('/');
  const [sitemapUrl, setSitemapUrl] = useState('https://example.com/sitemap.xml');

  // #97 XML Sitemap Builder
  const [changeFreq, setChangeFreq] = useState('weekly');
  const [priority, setPriority] = useState('0.8');

  // #98 QR Code Generator
  const [qrInput, setQrInput] = useState('https://quicktools.example.com');
  const [qrFg, setQrFg] = useState('#0f172a');
  const [qrBg, setQrBg] = useState('#ffffff');
  const [qrSize, setQrSize] = useState(280);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrSvg, setQrSvg] = useState('');

  // #99 QR Code Reader
  const [qrScanResult, setQrScanResult] = useState('');
  const [qrScanError, setQrScanError] = useState<string | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);

  // #100 Barcode Generator
  const [barcodeVal, setBarcodeVal] = useState('QUICKTOOLS-2026');
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128');
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  const copyText = async (val: string) => {
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Cleanup browser audio / microphone sessions on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      recognitionRef.current?.stop();
    };
  }, []);

  // Generate QR code outputs (#98)
  useEffect(() => {
    if (slug !== 'qr-code-generator') return;
    if (!qrInput.trim()) {
      setQrDataUrl('');
      setQrSvg('');
      return;
    }

    let active = true;
    const clampedSize = Math.min(1024, Math.max(128, qrSize));

    QRCode.toDataURL(qrInput, {
      width: clampedSize,
      margin: 2,
      color: { dark: qrFg, light: qrBg },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    QRCode.toString(qrInput, {
      type: 'svg',
      width: clampedSize,
      margin: 2,
      color: { dark: qrFg, light: qrBg },
    })
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch(() => {
        if (active) setQrSvg('');
      });

    return () => {
      active = false;
    };
  }, [slug, qrInput, qrFg, qrBg, qrSize]);

  // Render Barcode SVG (#100)
  useEffect(() => {
    if (slug !== 'barcode-generator' || !barcodeSvgRef.current) return;
    if (!barcodeVal.trim()) {
      setBarcodeError('Enter a value to generate a barcode.');
      return;
    }
    try {
      JsBarcode(barcodeSvgRef.current, barcodeVal, {
        format: barcodeFormat,
        lineColor: '#0f172a',
        background: '#ffffff',
        width: 2,
        height: 90,
        displayValue: true,
        margin: 12,
      });
      setBarcodeError(null);
    } catch (err) {
      setBarcodeError(
        err instanceof Error ? err.message : 'Invalid value for the selected barcode format.'
      );
    }
  }, [slug, barcodeVal, barcodeFormat]);

  // #86 Word, Character & Sentence Counter
  if (slug === 'word-character-counter') {
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const sentences = text.trim()
      ? text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
      : 0;
    const paragraphs = text.trim()
      ? text.split(/\n+/).filter((p) => p.trim().length > 0).length
      : 0;
    const readMin = words.length > 0 ? Math.max(1, Math.ceil(words.length / 225)) : 0;

    const freq: Record<string, number> = {};
    words.forEach((w) => {
      const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.length > 2) freq[clean] = (freq[clean] || 0) + 1;
    });
    const topWords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return (
      <div className="space-y-6">
        <textarea
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type your article, essay, or copy here..."
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-sm text-white focus:outline-none"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Metric label="Words" value={words.length} />
          <Metric label="Characters" value={chars} />
          <Metric label="No Spaces" value={charsNoSpaces} />
          <Metric label="Sentences" value={sentences} />
          <Metric label="Paragraphs" value={paragraphs} />
          <Metric label="Read Time" value={`${readMin} min`} />
        </div>
        {topWords.length > 0 && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-400">Top Keyword Density</div>
            <div className="flex flex-wrap gap-2">
              {topWords.map(([word, count]) => (
                <span
                  key={word}
                  className="text-xs font-mono px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                >
                  {word}: {count} ({((count / words.length) * 100).toFixed(1)}%)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // #87 Case Converter
  if (slug === 'case-converter') {
    const words = text
      .trim()
      .split(/[\s_-]+/)
      .filter(Boolean);

    const transforms = [
      { label: 'UPPERCASE', fn: () => text.toUpperCase() },
      { label: 'lowercase', fn: () => text.toLowerCase() },
      {
        label: 'Title Case',
        fn: () => text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      },
      {
        label: 'Sentence case',
        fn: () =>
          text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase()),
      },
      {
        label: 'camelCase',
        fn: () =>
          words
            .map((w, i) =>
              i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
            )
            .join(''),
      },
      {
        label: 'PascalCase',
        fn: () => words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(''),
      },
      { label: 'snake_case', fn: () => words.map((w) => w.toLowerCase()).join('_') },
      { label: 'kebab-case', fn: () => words.map((w) => w.toLowerCase()).join('-') },
      { label: 'CONSTANT_CASE', fn: () => words.map((w) => w.toUpperCase()).join('_') },
    ];

    return (
      <div className="space-y-4">
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to transform..."
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {transforms.map((t) => (
            <button
              key={t.label}
              onClick={() => setText(t.fn())}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-indigo-600 border border-slate-800 text-xs font-semibold text-white transition"
            >
              {t.label}
            </button>
          ))}
          <CopyBtn copied={copied} onClick={() => copyText(text)} />
        </div>
      </div>
    );
  }

  // #88 Placeholder / Dummy Text Generator
  if (slug === 'lorem-ipsum-generator') {
    const generated = Array.from({ length: paraCount }, (_, pIdx) =>
      Array.from(
        { length: sentencesPerPara },
        (_, sIdx) => DUMMY_SENTENCES[(pIdx * sentencesPerPara + sIdx) % DUMMY_SENTENCES.length]
      ).join(' ')
    ).join('\n\n');

    return (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Paragraphs: {paraCount}</label>
            <input
              type="range"
              min={1}
              max={10}
              value={paraCount}
              onChange={(e) => setParaCount(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Sentences per Paragraph: {sentencesPerPara}
            </label>
            <input
              type="range"
              min={2}
              max={8}
              value={sentencesPerPara}
              onChange={(e) => setSentencesPerPara(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>
        <textarea
          readOnly
          rows={8}
          value={generated}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 leading-relaxed"
        />
        <CopyBtn copied={copied} onClick={() => copyText(generated)} />
      </div>
    );
  }

  // #89 Meta Tag & OpenGraph Live Previewer
  if (slug === 'meta-tag-opengraph-previewer') {
    const safeTitle = escapeXml(metaTitle);
    const safeDesc = escapeXml(metaDesc);
    const safeUrl = escapeXml(metaUrl);
    const safeImg = escapeXml(metaImg);

    const metaSnippet = [
      `<title>${safeTitle}</title>`,
      `<meta name="description" content="${safeDesc}" />`,
      `<meta property="og:title" content="${safeTitle}" />`,
      `<meta property="og:description" content="${safeDesc}" />`,
      `<meta property="og:url" content="${safeUrl}" />`,
      metaImg ? `<meta property="og:image" content="${safeImg}" />` : null,
      `<meta name="twitter:card" content="summary_large_image" />`,
    ]
      .filter(Boolean)
      .join('\n');

    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Meta Title ({metaTitle.length}/60)
            </label>
            <input
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Canonical URL</label>
            <input
              value={metaUrl}
              onChange={(e) => setMetaUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">
              Meta Description ({metaDesc.length}/160)
            </label>
            <textarea
              rows={2}
              value={metaDesc}
              onChange={(e) => setMetaDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">OG Image URL (optional)</label>
            <input
              value={metaImg}
              onChange={(e) => setMetaImg(e.target.value)}
              placeholder="https://example.com/og-cover.png"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white text-slate-900 rounded-2xl p-5 space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
              Google SERP Preview
            </div>
            <div className="text-xs text-emerald-700 truncate">{metaUrl}</div>
            <div className="text-lg font-medium text-blue-700 leading-snug line-clamp-1">
              {metaTitle || 'Page Title'}
            </div>
            <div className="text-xs text-slate-600 line-clamp-2">{metaDesc}</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            {metaImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={metaImg} alt="OG preview" className="w-full h-32 object-cover" />
            ) : (
              <div className="h-24 bg-indigo-950/50 flex items-center justify-center text-xs text-indigo-300">
                1200 × 630 Social Card Preview
              </div>
            )}
            <div className="p-4 space-y-1">
              <div className="text-[11px] text-slate-500 uppercase truncate">
                {metaUrl.replace(/^https?:\/\//, '')}
              </div>
              <div className="text-sm font-bold text-white line-clamp-1">{metaTitle}</div>
              <div className="text-xs text-slate-400 line-clamp-2">{metaDesc}</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-indigo-300 overflow-x-auto">
            {metaSnippet}
          </pre>
          <CopyBtn copied={copied} onClick={() => copyText(metaSnippet)} />
        </div>
      </div>
    );
  }

  // #90 Slug / Permalink Generator
  if (slug === 'slug-permalink-generator') {
    const cleanSlug = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .trim()
      .replace(/\s+/g, separator);

    return (
      <div className="space-y-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter blog headline (e.g., 10 Best Client-Side SEO Tools in 2026!)"
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setSeparator('-')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              separator === '-'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Hyphen (-)
          </button>
          <button
            onClick={() => setSeparator('_')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              separator === '_'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Underscore (_)
          </button>
        </div>
        <div className="flex items-center justify-between gap-4 bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <code className="text-sm font-mono text-emerald-400 break-all">
            {cleanSlug || 'your-clean-url-slug'}
          </code>
          <CopyBtn copied={copied} onClick={() => copyText(cleanSlug)} />
        </div>
      </div>
    );
  }

  // #91 Duplicate Line Remover & Text Sorter
  if (slug === 'duplicate-line-remover') {
    const lines = text.split('\n');
    const apply = (fn: (arr: string[]) => string[]) => setText(fn(lines).join('\n'));

    return (
      <div className="space-y-4">
        <textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste one item per line..."
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-sm font-mono text-white focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => apply((arr) => Array.from(new Set(arr)))}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
          >
            Remove Duplicates
          </button>
          <button
            onClick={() => apply((arr) => arr.map((l) => l.trim()).filter(Boolean))}
            className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition"
          >
            Trim &amp; Drop Empty
          </button>
          <button
            onClick={() => apply((arr) => [...arr].sort((a, b) => a.localeCompare(b)))}
            className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition"
          >
            Sort A → Z
          </button>
          <button
            onClick={() => apply((arr) => [...arr].sort((a, b) => b.localeCompare(a)))}
            className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition"
          >
            Sort Z → A
          </button>
          <button
            onClick={() =>
              apply((arr) =>
                [...arr].sort((a, b) => {
                  const na = parseFloat(a);
                  const nb = parseFloat(b);
                  if (!isNaN(na) && !isNaN(nb)) return na - nb;
                  return a.localeCompare(b);
                })
              )
            }
            className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition"
          >
            Sort Numeric
          </button>
          <button
            onClick={() => apply((arr) => [...arr].reverse())}
            className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition"
          >
            Reverse
          </button>
          <CopyBtn copied={copied} onClick={() => copyText(text)} />
        </div>
      </div>
    );
  }

  // #92 Text to Speech (TTS)
  if (slug === 'text-to-speech-reader') {
    const handleSpeak = () => {
      if (!text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = rate;
      utter.pitch = pitch;
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utter);
    };

    const handleStop = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(false);
    };

    return (
      <div className="space-y-5">
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type text to read aloud using your browser's speech engine..."
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-sm text-white focus:outline-none"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Speed: {rate.toFixed(1)}x</label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Pitch: {pitch.toFixed(1)}</label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSpeak}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
          >
            <Volume2 className="w-4 h-4" /> {speaking ? 'Restart Speech' : 'Read Aloud'}
          </button>
          <button
            onClick={handleStop}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition"
          >
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        </div>
      </div>
    );
  }

  // #93 Speech to Text Dictation
  if (slug === 'speech-to-text-dictation') {
    const toggleListening = () => {
      if (listening) {
        recognitionRef.current?.stop();
        setListening(false);
        return;
      }

      const w = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      };
      const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!SpeechRec) {
        setSttError(
          'Your browser does not support the Web Speech Recognition API. Try Chrome or Edge.'
        );
        return;
      }

      setSttError(null);
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) {
          transcript += `${e.results[i][0].transcript} `;
        }
        setText(transcript.trim());
      };
      rec.onerror = (e) => {
        setSttError(`Microphone error: ${e.error}`);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    };

    return (
      <div className="space-y-4">
        {sttError && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-3 rounded-xl">
            {sttError}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={toggleListening}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition ${
              listening ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {listening ? 'Stop Dictation' : 'Start Microphone Dictation'}
          </button>
          <CopyBtn copied={copied} onClick={() => copyText(text)} />
        </div>
        <textarea
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Spoken transcript will appear here..."
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-sm text-white focus:outline-none"
        />
      </div>
    );
  }

  // #94 Email Extractor
  if (slug === 'email-extractor') {
    const matches = Array.from(
      new Set(
        (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).map((e) =>
          e.toLowerCase()
        )
      )
    );
    const output = matches.join('\n');

    return (
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Raw Input Text</label>
          <textarea
            rows={9}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste unstructured text containing email addresses..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-xs font-mono text-white focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">Unique Emails ({matches.length})</label>
            <CopyBtn copied={copied} onClick={() => copyText(output)} />
          </div>
          <textarea
            readOnly
            rows={9}
            value={output}
            placeholder="Extracted emails appear here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-400"
          />
        </div>
      </div>
    );
  }

  // #95 URL / Domain Extractor
  if (slug === 'url-domain-extractor') {
    const urls = Array.from(new Set(text.match(/https?:\/\/[^\s"'<>()]+/gi) || []));
    const output = urls.join('\n');

    return (
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Raw Input Text</label>
          <textarea
            rows={9}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste HTML, logs, or articles with links..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-xs font-mono text-white focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">Unique URLs ({urls.length})</label>
            <CopyBtn copied={copied} onClick={() => copyText(output)} />
          </div>
          <textarea
            readOnly
            rows={9}
            value={output}
            placeholder="Extracted URLs appear here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-indigo-300"
          />
        </div>
      </div>
    );
  }

  // #96 Robots.txt Generator
  if (slug === 'robots-txt-generator') {
    const robots = [
      `User-agent: ${userAgent.trim() || '*'}`,
      ...allowPaths
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `Allow: ${p}`),
      ...disallowPaths
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `Disallow: ${p}`),
      sitemapUrl.trim() ? `\nSitemap: ${sitemapUrl.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">User-Agent</label>
            <input
              value={userAgent}
              onChange={(e) => setUserAgent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Sitemap URL</label>
            <input
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Allow Paths (one per line)</label>
            <textarea
              rows={3}
              value={allowPaths}
              onChange={(e) => setAllowPaths(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Disallow Paths (one per line)
            </label>
            <textarea
              rows={3}
              value={disallowPaths}
              onChange={(e) => setDisallowPaths(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white"
            />
          </div>
        </div>
        <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
          {robots}
        </pre>
        <div className="flex flex-wrap gap-2">
          <CopyBtn copied={copied} onClick={() => copyText(robots)} />
          <button
            onClick={() => downloadFile(robots, 'robots.txt', 'text/plain')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
          >
            <Download className="w-3.5 h-3.5" /> Download robots.txt
          </button>
        </div>
      </div>
    );
  }

  // #97 XML Sitemap Builder
  if (slug === 'xml-sitemap-builder') {
    const urls = text
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//i.test(u));
    const today = new Date().toISOString().split('T')[0];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changeFreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
      )
      .join('\n')}\n</urlset>`;

    return (
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <select
            value={changeFreq}
            onChange={(e) => setChangeFreq(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="daily">Change Frequency: Daily</option>
            <option value="weekly">Change Frequency: Weekly</option>
            <option value="monthly">Change Frequency: Monthly</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="1.0">Priority: 1.0</option>
            <option value="0.8">Priority: 0.8</option>
            <option value="0.5">Priority: 0.5</option>
          </select>
        </div>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'https://example.com/\nhttps://example.com/about\nhttps://example.com/contact'}
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-xs font-mono text-white focus:outline-none"
        />
        <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-indigo-300 max-h-60 overflow-auto">
          {xml}
        </pre>
        <div className="flex flex-wrap gap-2">
          <CopyBtn copied={copied} onClick={() => copyText(xml)} />
          <button
            onClick={() => downloadFile(xml, 'sitemap.xml', 'application/xml')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
          >
            <Download className="w-3.5 h-3.5" /> Download sitemap.xml
          </button>
        </div>
      </div>
    );
  }

  // #98 QR Code Generator
  if (slug === 'qr-code-generator') {
    return (
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">URL or Text Content</label>
            <textarea
              rows={3}
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-sm text-white focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Foreground</label>
              <input
                type="color"
                value={qrFg}
                onChange={(e) => setQrFg(e.target.value)}
                className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Background</label>
              <input
                type="color"
                value={qrBg}
                onChange={(e) => setQrBg(e.target.value)}
                className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Size ({qrSize}px)</label>
              <input
                type="number"
                min={128}
                max={1024}
                step={32}
                value={qrSize}
                onChange={(e) => setQrSize(Number(e.target.value) || 280)}
                className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs text-white"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download="qrcode.png"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
              >
                <Download className="w-3.5 h-3.5" /> Download PNG
              </a>
            )}
            {qrSvg && (
              <button
                onClick={() => downloadFile(qrSvg, 'qrcode.svg', 'image/svg+xml')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition"
              >
                <Download className="w-3.5 h-3.5" /> Download SVG
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-center min-h-[260px]">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Generated QR Code" className="rounded-xl max-w-full" />
          ) : (
            <span className="text-xs text-slate-500">Enter text to render QR code</span>
          )}
        </div>
      </div>
    );
  }

  // #99 QR Code Reader / Scanner
  if (slug === 'qr-code-reader') {
    const handleImageUpload = async (file: File | undefined) => {
      if (!file) return;
      setQrScanError(null);
      setQrScanResult('');
      setQrPreviewUrl(URL.createObjectURL(file));

      const w = window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
      };
      if (!w.BarcodeDetector) {
        setQrScanError(
          'Browser BarcodeDetector API is required for local QR decoding (supported in Chrome, Edge, and Android Chrome).'
        );
        return;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const detector = new w.BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(bitmap);
        if (codes.length > 0) {
          setQrScanResult(codes[0].rawValue);
        } else {
          setQrScanError('No QR code detected in the uploaded image.');
        }
      } catch {
        setQrScanError('Could not decode image. Ensure it is a clear PNG/JPG QR code.');
      }
    };

    return (
      <div className="space-y-5">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-10 cursor-pointer bg-slate-950/60 transition">
          <Upload className="w-7 h-7 text-indigo-400 mb-2" />
          <span className="text-sm font-semibold text-white">
            Upload QR Code Image (PNG / JPG / WEBP)
          </span>
          <span className="text-xs text-slate-500 mt-1">
            Decoded 100% locally via BarcodeDetector API
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e.target.files?.[0])}
            className="hidden"
          />
        </label>

        {qrPreviewUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrPreviewUrl}
              alt="Uploaded QR preview"
              className="max-h-44 rounded-xl border border-slate-800"
            />
          </div>
        )}

        {qrScanError && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-3.5 rounded-xl">
            {qrScanError}
          </div>
        )}

        {qrScanResult && (
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
            <div className="text-xs font-semibold text-emerald-400">Decoded QR Payload:</div>
            <div className="text-sm font-mono text-white break-all">{qrScanResult}</div>
            <CopyBtn copied={copied} onClick={() => copyText(qrScanResult)} />
          </div>
        )}
      </div>
    );
  }

  // #100 Barcode Generator
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Barcode Value</label>
          <input
            value={barcodeVal}
            onChange={(e) => setBarcodeVal(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Symbology Format</label>
          <select
            value={barcodeFormat}
            onChange={(e) => {
              const fmt = e.target.value;
              setBarcodeFormat(fmt);
              if (fmt === 'EAN13' && !/^\d{12,13}$/.test(barcodeVal)) setBarcodeVal('590123412345');
              if (fmt === 'UPC' && !/^\d{11,12}$/.test(barcodeVal)) setBarcodeVal('12345678901');
              if (fmt === 'ITF14' && !/^\d{14}$/.test(barcodeVal)) setBarcodeVal('10012345678902');
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
          >
            <option value="CODE128">CODE128 (Alphanumeric)</option>
            <option value="CODE39">CODE39</option>
            <option value="EAN13">EAN-13 (12–13 digits)</option>
            <option value="UPC">UPC-A (11–12 digits)</option>
            <option value="ITF14">ITF-14 (14 digits)</option>
          </select>
        </div>
      </div>

      {barcodeError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
          {barcodeError}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 flex items-center justify-center overflow-x-auto min-h-[140px]">
        <svg ref={barcodeSvgRef} />
      </div>

      <button
        onClick={() => {
          if (!barcodeSvgRef.current) return;
          downloadFile(
            barcodeSvgRef.current.outerHTML,
            `barcode-${barcodeFormat.toLowerCase()}.svg`,
            'image/svg+xml'
          );
        }}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
      >
        <Download className="w-3.5 h-3.5" /> Download Barcode SVG
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-center">
      <div className="text-lg font-black text-white">{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

function CopyBtn({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition"
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