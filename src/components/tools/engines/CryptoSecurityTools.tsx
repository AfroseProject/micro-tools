'use client';

import { useState, useEffect, useCallback } from 'react';
import bcrypt from 'bcryptjs';
import {
  Copy,
  Check,
  RefreshCw,
  Download,
  Upload,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
} from 'lucide-react';

// --- Cryptographic Helpers ---

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64.trim());
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function formatPem(b64: string, label: string): string {
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

function randomInt(max: number): number {
  const arr = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let val = 0;
  do {
    crypto.getRandomValues(arr);
    val = arr[0];
  } while (val >= limit);
  return val % max;
}

async function digestBuffer(
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512',
  bytes: Uint8Array
): Promise<Uint8Array> {
  const hashBuf = await crypto.subtle.digest(algorithm, toArrayBuffer(bytes));
  return new Uint8Array(hashBuf);
}

// Pure RFC 1321 MD5 for UTF-8 strings and binary files
const MD5_SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const MD5_K = Array.from(
  { length: 64 },
  (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0
);

function md5Bytes(data: Uint8Array): string {
  const origLen = data.length;
  const paddedLen = (((origLen + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[origLen] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, (origLen << 3) >>> 0, true);
  view.setUint32(paddedLen - 4, Math.floor(origLen / 0x20000000) >>> 0, true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const M = new Uint32Array(16);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(offset + j * 4, true);
    }

    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }

      F = (F + A + MD5_K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      const rot = ((F << MD5_SHIFTS[i]) | (F >>> (32 - MD5_SHIFTS[i]))) >>> 0;
      B = (B + rot) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return bytesToHex(out);
}

const DICEWARE_WORDS = [
  'amber', 'anchor', 'apple', 'arctic', 'arrow', 'aspen', 'atlas', 'autumn',
  'badge', 'bamboo', 'beacon', 'bison', 'blaze', 'blossom', 'boulder', 'breeze',
  'bridge', 'bronze', 'brook', 'cabin', 'cactus', 'canyon', 'carbon', 'cascade',
  'cedar', 'cinder', 'cipher', 'citadel', 'clover', 'cobalt', 'comet', 'compass',
  'copper', 'coral', 'crater', 'crimson', 'crystal', 'cypress', 'dagger', 'dawn',
  'delta', 'desert', 'diamond', 'dolphin', 'dragon', 'drift', 'dune', 'eagle',
  'echo', 'eclipse', 'elder', 'ember', 'emerald', 'engine', 'equinox', 'falcon',
  'feather', 'fern', 'fjord', 'flame', 'flint', 'forest', 'forge', 'fossil',
  'frost', 'galaxy', 'garnet', 'geyser', 'glacier', 'granite', 'griffin', 'grove',
  'harbor', 'harvest', 'hawk', 'hazel', 'helium', 'horizon', 'hunter', 'indigo',
  'island', 'ivory', 'jade', 'jaguar', 'jasper', 'juniper', 'kayak', 'kernel',
  'kestrel', 'kinetic', 'lagoon', 'lantern', 'laurel', 'legend', 'lemon', 'leopard',
  'lichen', 'lightning', 'linden', 'lotus', 'lunar', 'lynx', 'magnet', 'mango',
  'maple', 'marble', 'meadow', 'mercury', 'meteor', 'mineral', 'mirage', 'monarch',
  'monsoon', 'mosaic', 'mountain', 'nebula', 'nectar', 'nickel', 'nimbus', 'nomad',
  'north', 'nova', 'oasis', 'obsidian', 'ocean', 'olive', 'onyx', 'opal',
  'orbit', 'orchid', 'osprey', 'otter', 'paladin', 'panther', 'papaya', 'pebble',
  'pelican', 'pepper', 'phantom', 'phoenix', 'pine', 'pioneer', 'planet', 'plasma',
  'pluto', 'polar', 'poplar', 'prairie', 'prism', 'pulse', 'puma', 'python',
  'quartz', 'quasar', 'quiver', 'radar', 'rain', 'ranger', 'raven', 'redwood',
  'reef', 'relic', 'ridge', 'river', 'rocket', 'ruby', 'saffron', 'salmon',
  'sapphire', 'saturn', 'scarlet', 'sequoia', 'shadow', 'shield', 'sierra', 'signal',
  'silver', 'skylark', 'slate', 'solar', 'solstice', 'sonar', 'spark', 'sparrow',
  'spruce', 'starlight', 'steel', 'stone', 'storm', 'summit', 'sunrise', 'swift',
  'tango', 'tempest', 'thistle', 'thunder', 'tiger', 'timber', 'titanium', 'topaz',
  'torch', 'torrent', 'trail', 'trident', 'tundra', 'turbine', 'twilight', 'umber',
  'valley', 'vanguard', 'vector', 'velvet', 'vertex', 'viper', 'vivid', 'volcano',
  'vortex', 'voyager', 'walnut', 'warden', 'wave', 'whisper', 'wildfire', 'willow',
  'wind', 'winter', 'wolf', 'zenith', 'zephyr', 'zircon',
];

function formatCrackTime(seconds: number): string {
  if (seconds < 1) return 'Instant (< 1 second)';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const mins = seconds / 60;
  if (mins < 60) return `${Math.round(mins)} minutes`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = hours / 24;
  if (days < 365) return `${Math.round(days)} days`;
  const years = days / 365.25;
  if (years < 1000) return `${Math.round(years)} years`;
  if (years < 1e6) return `${(years / 1e3).toFixed(1)} thousand years`;
  if (years < 1e9) return `${(years / 1e6).toFixed(1)} million years`;
  if (years < 1e12) return `${(years / 1e9).toFixed(1)} billion years`;
  return 'Centuries+ (> 1 trillion years)';
}

export default function CryptoSecurityTools({ slug }: { slug: string }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // #61 Password Generator
  const [pwLength, setPwLength] = useState(20);
  const [pwUpper, setPwUpper] = useState(true);
  const [pwLower, setPwLower] = useState(true);
  const [pwNumbers, setPwNumbers] = useState(true);
  const [pwSymbols, setPwSymbols] = useState(true);
  const [pwExcludeAmbiguous, setPwExcludeAmbiguous] = useState(true);
  const [generatedPw, setGeneratedPw] = useState('');

  // #62 & #63 Hashes
  const [hashInput, setHashInput] = useState('Hello QuickTools');
  const [hashFileName, setHashFileName] = useState<string | null>(null);
  const [shaHashes, setShaHashes] = useState({ sha256: '', sha384: '', sha512: '' });
  const [legacyHashes, setLegacyHashes] = useState({ md5: '', sha1: '' });

  // #64 Bcrypt
  const [bcryptPlain, setBcryptPlain] = useState('MySuperSecret!2026');
  const [bcryptRounds, setBcryptRounds] = useState(10);
  const [bcryptHash, setBcryptHash] = useState('');
  const [bcryptVerifyInput, setBcryptVerifyInput] = useState('');
  const [bcryptVerifyHash, setBcryptVerifyHash] = useState('');
  const [bcryptMatch, setBcryptMatch] = useState<boolean | null>(null);
  const [bcryptBusy, setBcryptBusy] = useState(false);

  // #65 AES-GCM
  const [aesMode, setAesMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [aesText, setAesText] = useState('');
  const [aesPassphrase, setAesPassphrase] = useState('');
  const [aesOutput, setAesOutput] = useState('');
  const [aesError, setAesError] = useState<string | null>(null);

  // #66 RSA Key Pair
  const [rsaBits, setRsaBits] = useState<2048 | 4096>(2048);
  const [rsaPublicPem, setRsaPublicPem] = useState('');
  const [rsaPrivatePem, setRsaPrivatePem] = useState('');
  const [rsaBusy, setRsaBusy] = useState(false);

  // #67 HMAC
  const [hmacMessage, setHmacMessage] = useState('{"event":"order.paid","amount":999}');
  const [hmacSecret, setHmacSecret] = useState('whsec_local_secret_key');
  const [hmacAlgo, setHmacAlgo] = useState<'SHA-256' | 'SHA-384' | 'SHA-512'>('SHA-256');
  const [hmacHex, setHmacHex] = useState('');
  const [hmacB64, setHmacB64] = useState('');

  // #68 Diceware Passphrase
  const [diceWordsCount, setDiceWordsCount] = useState(5);
  const [diceSep, setDiceSep] = useState('-');
  const [diceCap, setDiceCap] = useState(true);
  const [diceNum, setDiceNum] = useState(true);
  const [passphrase, setPassphrase] = useState('');

  // #69 Password Strength Meter
  const [auditPw, setAuditPw] = useState('');

  // #70 HTPASSWD
  const [htUser, setHtUser] = useState('admin');
  const [htPass, setHtPass] = useState('');
  const [htAlgo, setHtAlgo] = useState<'bcrypt' | 'sha1'>('bcrypt');
  const [htLine, setHtLine] = useState('');
  const [htBusy, setHtBusy] = useState(false);

  const copyValue = async (val: string, key = 'main') => {
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // #61 Generate Password
  const regeneratePassword = useCallback(() => {
    let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lower = 'abcdefghijklmnopqrstuvwxyz';
    let nums = '0123456789';
    const syms = '!@#$%^&*()-_=+[]{}|;:,.<>?';

    if (pwExcludeAmbiguous) {
      upper = upper.replace(/[IO]/g, '');
      lower = lower.replace(/[lo]/g, '');
      nums = nums.replace(/[01]/g, '');
    }

    const pools: string[] = [];
    if (pwUpper) pools.push(upper);
    if (pwLower) pools.push(lower);
    if (pwNumbers) pools.push(nums);
    if (pwSymbols) pools.push(syms);
    if (pools.length === 0) {
      setGeneratedPw('');
      return;
    }

    const combined = pools.join('');
    const chars: string[] = [];
    // Guarantee at least one char from each selected pool
    pools.forEach((pool) => {
      if (chars.length < pwLength) {
        chars.push(pool[randomInt(pool.length)]);
      }
    });
    while (chars.length < pwLength) {
      chars.push(combined[randomInt(combined.length)]);
    }
    // Fisher-Yates shuffle with Web Crypto
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    setGeneratedPw(chars.join(''));
  }, [pwLength, pwUpper, pwLower, pwNumbers, pwSymbols, pwExcludeAmbiguous]);

  useEffect(() => {
    if (slug === 'password-generator') regeneratePassword();
  }, [slug, regeneratePassword]);

  // #62 SHA-256 / SHA-384 / SHA-512
  useEffect(() => {
    if (slug !== 'sha-hash-generator' || hashFileName) return;
    let active = true;
    const bytes = new TextEncoder().encode(hashInput);
    Promise.all([
      digestBuffer('SHA-256', bytes),
      digestBuffer('SHA-384', bytes),
      digestBuffer('SHA-512', bytes),
    ]).then(([s256, s384, s512]) => {
      if (active) {
        setShaHashes({
          sha256: bytesToHex(s256),
          sha384: bytesToHex(s384),
          sha512: bytesToHex(s512),
        });
      }
    });
    return () => {
      active = false;
    };
  }, [slug, hashInput, hashFileName]);

  // #63 MD5 / SHA-1
  useEffect(() => {
    if (slug !== 'md5-sha1-generator' || hashFileName) return;
    let active = true;
    const bytes = new TextEncoder().encode(hashInput);
    const md5 = md5Bytes(bytes);
    digestBuffer('SHA-1', bytes).then((s1) => {
      if (active) {
        setLegacyHashes({ md5, sha1: bytesToHex(s1) });
      }
    });
    return () => {
      active = false;
    };
  }, [slug, hashInput, hashFileName]);

  // #67 HMAC
  useEffect(() => {
    if (slug !== 'hmac-signature-generator') return;
    if (!hmacSecret) {
      setHmacHex('');
      setHmacB64('');
      return;
    }
    let active = true;
    const enc = new TextEncoder();
    crypto.subtle
      .importKey(
        'raw',
        toArrayBuffer(enc.encode(hmacSecret)),
        { name: 'HMAC', hash: { name: hmacAlgo } },
        false,
        ['sign']
      )
      .then((key) => crypto.subtle.sign('HMAC', key, toArrayBuffer(enc.encode(hmacMessage))))
      .then((sig) => {
        if (!active) return;
        const bytes = new Uint8Array(sig);
        setHmacHex(bytesToHex(bytes));
        setHmacB64(bytesToBase64(bytes));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [slug, hmacMessage, hmacSecret, hmacAlgo]);

  // #68 Diceware Passphrase
  const regeneratePassphrase = useCallback(() => {
    const picked = Array.from({ length: diceWordsCount }, () => {
      const w = DICEWARE_WORDS[randomInt(DICEWARE_WORDS.length)];
      return diceCap ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    });
    if (diceNum) {
      const idx = randomInt(picked.length);
      picked[idx] = `${picked[idx]}${randomInt(90) + 10}`;
    }
    setPassphrase(picked.join(diceSep));
  }, [diceWordsCount, diceSep, diceCap, diceNum]);

  useEffect(() => {
    if (slug === 'diceware-passphrase-generator') regeneratePassphrase();
  }, [slug, regeneratePassphrase]);

  // --- TOOL RENDERERS ---

  // #61 Client-Side Password Generator
  if (slug === 'password-generator') {
    const poolSize =
      (pwUpper ? (pwExcludeAmbiguous ? 24 : 26) : 0) +
      (pwLower ? (pwExcludeAmbiguous ? 24 : 26) : 0) +
      (pwNumbers ? (pwExcludeAmbiguous ? 8 : 10) : 0) +
      (pwSymbols ? 26 : 0);
    const entropy = poolSize > 0 ? Math.round(pwLength * Math.log2(poolSize)) : 0;

    return (
      <div className="space-y-6">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <code className="text-lg sm:text-xl font-mono text-emerald-400 break-all">
            {generatedPw || 'Select at least one character set'}
          </code>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={regeneratePassword}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </button>
            <CopyBtn copied={copiedKey === 'pw'} onClick={() => copyValue(generatedPw, 'pw')} />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Password Length: {pwLength} characters</span>
              <span className="font-mono text-indigo-300">~{entropy} bits entropy</span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={pwLength}
              onChange={(e) => setPwLength(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <ToggleCheck label="Uppercase (A–Z)" checked={pwUpper} onChange={setPwUpper} />
            <ToggleCheck label="Lowercase (a–z)" checked={pwLower} onChange={setPwLower} />
            <ToggleCheck label="Numbers (0–9)" checked={pwNumbers} onChange={setPwNumbers} />
            <ToggleCheck label="Symbols (!@#$%)" checked={pwSymbols} onChange={setPwSymbols} />
            <ToggleCheck
              label="Exclude Ambiguous (I, l, 1, O, 0)"
              checked={pwExcludeAmbiguous}
              onChange={setPwExcludeAmbiguous}
            />
          </div>
        </div>
      </div>
    );
  }

  // #62 SHA-256 / SHA-384 / SHA-512 Hash Generator
  if (slug === 'sha-hash-generator') {
    const handleFile = async (file: File | undefined) => {
      if (!file) return;
      setHashFileName(file.name);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const [s256, s384, s512] = await Promise.all([
        digestBuffer('SHA-256', bytes),
        digestBuffer('SHA-384', bytes),
        digestBuffer('SHA-512', bytes),
      ]);
      setShaHashes({
        sha256: bytesToHex(s256),
        sha384: bytesToHex(s384),
        sha512: bytesToHex(s512),
      });
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            {hashFileName ? `Hashing file: ${hashFileName}` : 'Type text below or upload any file'}
          </span>
          <div className="flex gap-2">
            {hashFileName && (
              <button
                onClick={() => setHashFileName(null)}
                className="text-xs text-indigo-400 hover:underline"
              >
                Switch back to text
              </button>
            )}
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-indigo-400" /> Hash File
              <input
                type="file"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {!hashFileName && (
          <textarea
            rows={4}
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            placeholder="Enter text to compute SHA digests..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-sm font-mono text-white focus:outline-none"
          />
        )}

        <div className="space-y-3">
          <HashRow
            label="SHA-256"
            value={shaHashes.sha256}
            copied={copiedKey === 'sha256'}
            onCopy={() => copyValue(shaHashes.sha256, 'sha256')}
          />
          <HashRow
            label="SHA-384"
            value={shaHashes.sha384}
            copied={copiedKey === 'sha384'}
            onCopy={() => copyValue(shaHashes.sha384, 'sha384')}
          />
          <HashRow
            label="SHA-512"
            value={shaHashes.sha512}
            copied={copiedKey === 'sha512'}
            onCopy={() => copyValue(shaHashes.sha512, 'sha512')}
          />
        </div>
      </div>
    );
  }

  // #63 MD5 / SHA-1 Generator
  if (slug === 'md5-sha1-generator') {
    const handleFile = async (file: File | undefined) => {
      if (!file) return;
      setHashFileName(file.name);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const md5 = md5Bytes(bytes);
      const sha1 = bytesToHex(await digestBuffer('SHA-1', bytes));
      setLegacyHashes({ md5, sha1 });
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            {hashFileName
              ? `Hashing file: ${hashFileName}`
              : 'For checksums and legacy compatibility (not for password storage)'}
          </span>
          <div className="flex gap-2">
            {hashFileName && (
              <button
                onClick={() => setHashFileName(null)}
                className="text-xs text-indigo-400 hover:underline"
              >
                Switch back to text
              </button>
            )}
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-indigo-400" /> Hash File
              <input
                type="file"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {!hashFileName && (
          <textarea
            rows={4}
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            placeholder="Enter string to hash..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-sm font-mono text-white focus:outline-none"
          />
        )}

        <div className="space-y-3">
          <HashRow
            label="MD5 (128-bit)"
            value={legacyHashes.md5}
            copied={copiedKey === 'md5'}
            onCopy={() => copyValue(legacyHashes.md5, 'md5')}
          />
          <HashRow
            label="SHA-1 (160-bit)"
            value={legacyHashes.sha1}
            copied={copiedKey === 'sha1'}
            onCopy={() => copyValue(legacyHashes.sha1, 'sha1')}
          />
        </div>
      </div>
    );
  }

  // #64 Bcrypt Hash Generator & Verifier
  if (slug === 'bcrypt-generator-verifier') {
    const handleGenerate = async () => {
      if (!bcryptPlain) return;
      setBcryptBusy(true);
      try {
        const hashed = await bcrypt.hash(bcryptPlain, bcryptRounds);
        setBcryptHash(hashed);
        setBcryptVerifyHash(hashed);
        setBcryptVerifyInput(bcryptPlain);
        setBcryptMatch(null);
      } finally {
        setBcryptBusy(false);
      }
    };

    const handleVerify = async () => {
      if (!bcryptVerifyInput || !bcryptVerifyHash) return;
      setBcryptBusy(true);
      try {
        const ok = await bcrypt.compare(bcryptVerifyInput, bcryptVerifyHash.trim());
        setBcryptMatch(ok);
      } catch {
        setBcryptMatch(false);
      } finally {
        setBcryptBusy(false);
      }
    };

    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">1. Generate Salted Bcrypt Hash</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              value={bcryptPlain}
              onChange={(e) => setBcryptPlain(e.target.value)}
              placeholder="Plaintext password"
              className="sm:col-span-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
            />
            <select
              value={bcryptRounds}
              onChange={(e) => setBcryptRounds(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
            >
              <option value={8}>Cost Factor: 8 (Fast)</option>
              <option value={10}>Cost Factor: 10 (Standard)</option>
              <option value={12}>Cost Factor: 12 (Strong)</option>
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={bcryptBusy}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition"
          >
            {bcryptBusy ? 'Hashing...' : 'Generate Bcrypt Hash'}
          </button>

          {bcryptHash && (
            <HashRow
              label="Bcrypt Output"
              value={bcryptHash}
              copied={copiedKey === 'bcrypt'}
              onCopy={() => copyValue(bcryptHash, 'bcrypt')}
            />
          )}
        </div>

        <div className="border-t border-slate-800 pt-6 space-y-4">
          <h3 className="text-sm font-bold text-white">2. Verify Password Against Hash</h3>
          <input
            value={bcryptVerifyInput}
            onChange={(e) => {
              setBcryptVerifyInput(e.target.value);
              setBcryptMatch(null);
            }}
            placeholder="Candidate plaintext password"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
          />
          <input
            value={bcryptVerifyHash}
            onChange={(e) => {
              setBcryptVerifyHash(e.target.value);
              setBcryptMatch(null);
            }}
            placeholder="$2a$10$..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
          />
          <button
            onClick={handleVerify}
            disabled={bcryptBusy}
            className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white transition"
          >
            Verify Match
          </button>

          {bcryptMatch !== null && (
            <div
              className={`flex items-center gap-2 p-3.5 rounded-xl text-xs font-semibold border ${
                bcryptMatch
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {bcryptMatch ? (
                <>
                  <ShieldCheck className="w-4 h-4" /> Verified: Password matches this bcrypt hash.
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" /> Mismatch: Password does not match the hash.
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // #65 AES-256-GCM Text Encryptor & Decryptor
  if (slug === 'aes-encryptor-decryptor') {
    const deriveAesKey = async (pass: string, salt: Uint8Array) => {
      const baseKey = await crypto.subtle.importKey(
        'raw',
        toArrayBuffer(new TextEncoder().encode(pass)),
        'PBKDF2',
        false,
        ['deriveKey']
      );
      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: toArrayBuffer(salt),
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    };

    const runAes = async () => {
      setAesError(null);
      setAesOutput('');
      if (!aesText.trim() || !aesPassphrase) {
        setAesError('Enter both text and a secret passphrase.');
        return;
      }

      try {
        if (aesMode === 'encrypt') {
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const key = await deriveAesKey(aesPassphrase, salt);
          const cipherBuf = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: toArrayBuffer(iv) },
            key,
            toArrayBuffer(new TextEncoder().encode(aesText))
          );
          const cipherBytes = new Uint8Array(cipherBuf);
          const packed = new Uint8Array(salt.length + iv.length + cipherBytes.length);
          packed.set(salt, 0);
          packed.set(iv, 16);
          packed.set(cipherBytes, 28);
          setAesOutput(bytesToBase64(packed));
        } else {
          const packed = base64ToBytes(aesText);
          if (packed.length <= 28) throw new Error('Invalid encrypted payload.');
          const salt = packed.slice(0, 16);
          const iv = packed.slice(16, 28);
          const ciphertext = packed.slice(28);
          const key = await deriveAesKey(aesPassphrase, salt);
          const plainBuf = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: toArrayBuffer(iv) },
            key,
            toArrayBuffer(ciphertext)
          );
          setAesOutput(new TextDecoder().decode(plainBuf));
        }
      } catch {
        setAesError(
          aesMode === 'decrypt'
            ? 'Decryption failed. Verify your passphrase and Base64 ciphertext.'
            : 'Encryption failed in this browser context.'
        );
      }
    };

    return (
      <div className="space-y-5">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setAesMode('encrypt');
              setAesOutput('');
              setAesError(null);
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold ${
              aesMode === 'encrypt'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Encrypt (AES-256-GCM)
          </button>
          <button
            onClick={() => {
              setAesMode('decrypt');
              setAesOutput('');
              setAesError(null);
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold ${
              aesMode === 'decrypt'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" /> Decrypt
          </button>
        </div>

        <input
          type="password"
          value={aesPassphrase}
          onChange={(e) => setAesPassphrase(e.target.value)}
          placeholder="Secret Passphrase (PBKDF2 100k rounds)"
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
        />

        <textarea
          rows={5}
          value={aesText}
          onChange={(e) => setAesText(e.target.value)}
          placeholder={
            aesMode === 'encrypt'
              ? 'Enter plaintext message to encrypt...'
              : 'Paste Base64 AES-GCM ciphertext to decrypt...'
          }
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-xs font-mono text-white focus:outline-none"
        />

        <button
          onClick={runAes}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
        >
          {aesMode === 'encrypt' ? 'Encrypt Message' : 'Decrypt Message'}
        </button>

        {aesError && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
            {aesError}
          </div>
        )}

        {aesOutput && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {aesMode === 'encrypt' ? 'Encrypted Base64 Payload' : 'Decrypted Plaintext'}
              </span>
              <CopyBtn copied={copiedKey === 'aes'} onClick={() => copyValue(aesOutput, 'aes')} />
            </div>
            <textarea
              readOnly
              rows={4}
              value={aesOutput}
              className="w-full bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 text-xs font-mono text-emerald-400"
            />
          </div>
        )}
      </div>
    );
  }

  // #66 RSA Key Pair Generator
  if (slug === 'rsa-keypair-generator') {
    const generateRsa = async () => {
      setRsaBusy(true);
      try {
        const kp = await crypto.subtle.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: rsaBits,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
          },
          true,
          ['encrypt', 'decrypt']
        );
        const spki = await crypto.subtle.exportKey('spki', kp.publicKey);
        const pkcs8 = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
        setRsaPublicPem(formatPem(bytesToBase64(new Uint8Array(spki)), 'PUBLIC KEY'));
        setRsaPrivatePem(formatPem(bytesToBase64(new Uint8Array(pkcs8)), 'PRIVATE KEY'));
      } finally {
        setRsaBusy(false);
      }
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={rsaBits}
            onChange={(e) => setRsaBits(Number(e.target.value) as 2048 | 4096)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
          >
            <option value={2048}>RSA 2048-bit (Recommended)</option>
            <option value={4096}>RSA 4096-bit (Maximum Strength)</option>
          </select>
          <button
            onClick={generateRsa}
            disabled={rsaBusy}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rsaBusy ? 'animate-spin' : ''}`} />
            {rsaBusy ? 'Generating Key Pair...' : 'Generate RSA Key Pair'}
          </button>
        </div>

        {(rsaPublicPem || rsaPrivatePem) && (
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400">Public Key (SPKI PEM)</span>
                <div className="flex gap-1.5">
                  <CopyBtn
                    copied={copiedKey === 'pub'}
                    onClick={() => copyValue(rsaPublicPem, 'pub')}
                  />
                  <button
                    onClick={() => downloadText(rsaPublicPem, `public_${rsaBits}.pem`)}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-white"
                    title="Download Public PEM"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                rows={10}
                value={rsaPublicPem}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-[11px] font-mono text-emerald-300"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400">Private Key (PKCS#8 PEM)</span>
                <div className="flex gap-1.5">
                  <CopyBtn
                    copied={copiedKey === 'priv'}
                    onClick={() => copyValue(rsaPrivatePem, 'priv')}
                  />
                  <button
                    onClick={() => downloadText(rsaPrivatePem, `private_${rsaBits}.pem`)}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-white"
                    title="Download Private PEM"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                rows={10}
                value={rsaPrivatePem}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-[11px] font-mono text-amber-300"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // #67 HMAC Signature Generator
  if (slug === 'hmac-signature-generator') {
    return (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400 mb-1.5">Secret Key</label>
            <input
              value={hmacSecret}
              onChange={(e) => setHmacSecret(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Algorithm</label>
            <select
              value={hmacAlgo}
              onChange={(e) =>
                setHmacAlgo(e.target.value as 'SHA-256' | 'SHA-384' | 'SHA-512')
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
            >
              <option value="SHA-256">HMAC-SHA256</option>
              <option value="SHA-384">HMAC-SHA384</option>
              <option value="SHA-512">HMAC-SHA512</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Message / Webhook Payload</label>
          <textarea
            rows={4}
            value={hmacMessage}
            onChange={(e) => setHmacMessage(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
          />
        </div>

        <div className="space-y-3">
          <HashRow
            label={`HMAC-${hmacAlgo} (Hex)`}
            value={hmacHex}
            copied={copiedKey === 'hmacHex'}
            onCopy={() => copyValue(hmacHex, 'hmacHex')}
          />
          <HashRow
            label={`HMAC-${hmacAlgo} (Base64)`}
            value={hmacB64}
            copied={copiedKey === 'hmacB64'}
            onCopy={() => copyValue(hmacB64, 'hmacB64')}
          />
        </div>
      </div>
    );
  }

  // #68 Diceware Passphrase Generator
  if (slug === 'diceware-passphrase-generator') {
    const entropyBits = Math.round(
      diceWordsCount * Math.log2(DICEWARE_WORDS.length) + (diceNum ? Math.log2(90) : 0)
    );

    return (
      <div className="space-y-6">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <code className="text-lg font-mono text-indigo-300 break-all">{passphrase}</code>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={regeneratePassphrase}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> New Phrase
            </button>
            <CopyBtn copied={copiedKey === 'dice'} onClick={() => copyValue(passphrase, 'dice')} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Word Count: {diceWordsCount}</span>
              <span className="font-mono text-emerald-400">~{entropyBits} bits entropy</span>
            </div>
            <input
              type="range"
              min={3}
              max={10}
              value={diceWordsCount}
              onChange={(e) => setDiceWordsCount(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Separator</label>
            <select
              value={diceSep}
              onChange={(e) => setDiceSep(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="-">Hyphen (-)</option>
              <option value=" ">Space ( )</option>
              <option value=".">Period (.)</option>
              <option value="_">Underscore (_)</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <ToggleCheck label="Capitalize Words" checked={diceCap} onChange={setDiceCap} />
          <ToggleCheck label="Include Random 2-Digit Number" checked={diceNum} onChange={setDiceNum} />
        </div>
      </div>
    );
  }

  // #69 Password Strength Meter & Audit
  if (slug === 'password-strength-meter') {
    const hasLower = /[a-z]/.test(auditPw);
    const hasUpper = /[A-Z]/.test(auditPw);
    const hasDigit = /\d/.test(auditPw);
    const hasSymbol = /[^A-Za-z0-9]/.test(auditPw);

    let charset = 0;
    if (hasLower) charset += 26;
    if (hasUpper) charset += 26;
    if (hasDigit) charset += 10;
    if (hasSymbol) charset += 33;

    const rawEntropy = auditPw.length > 0 && charset > 0 ? auditPw.length * Math.log2(charset) : 0;
    const warnings: string[] = [];
    if (auditPw.length > 0 && auditPw.length < 12) warnings.push('Shorter than 12 characters');
    if (/(.)\1{2,}/.test(auditPw)) warnings.push('Contains 3+ repeated characters in a row');
    if (/1234|abcd|qwerty|password|admin/i.test(auditPw)) {
      warnings.push('Contains a common keyboard or dictionary pattern');
    }

    const effectiveEntropy = Math.max(0, rawEntropy - warnings.length * 14);
    const combinations = Math.pow(2, effectiveEntropy);
    const score =
      auditPw.length === 0
        ? 0
        : effectiveEntropy < 35
        ? 1
        : effectiveEntropy < 55
        ? 2
        : effectiveEntropy < 75
        ? 3
        : 4;
    const labels = ['Enter a password', 'Very Weak', 'Fair', 'Strong', 'Very Strong'];
    const barColors = [
      'bg-slate-800',
      'bg-rose-500',
      'bg-amber-500',
      'bg-emerald-500',
      'bg-indigo-500',
    ];

    return (
      <div className="space-y-6">
        <input
          type="text"
          value={auditPw}
          onChange={(e) => setAuditPw(e.target.value)}
          placeholder="Type any password to audit strength locally (never sent over network)..."
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none"
        />

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-bold text-white">{labels[score]}</span>
            <span className="font-mono text-slate-400">
              {effectiveEntropy.toFixed(1)} effective bits
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 h-2">
            {[1, 2, 3, 4].map((lvl) => (
              <div
                key={lvl}
                className={`rounded-full transition ${
                  score >= lvl ? barColors[score] : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400">Online Rate-Limited (100/sec)</div>
            <div className="text-sm font-bold text-white mt-1">
              {auditPw ? formatCrackTime(combinations / 100) : '—'}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400">Offline Bcrypt (10k/sec)</div>
            <div className="text-sm font-bold text-white mt-1">
              {auditPw ? formatCrackTime(combinations / 1e4) : '—'}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400">Offline Fast GPU (10B/sec)</div>
            <div className="text-sm font-bold text-indigo-300 mt-1">
              {auditPw ? formatCrackTime(combinations / 1e10) : '—'}
            </div>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-1 text-xs text-amber-300">
            {warnings.map((w) => (
              <div key={w}>• {w}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // #70 HTPASSWD Password Generator
  const generateHtpasswd = async () => {
    if (!htUser.trim() || !htPass) return;
    setHtBusy(true);
    try {
      if (htAlgo === 'bcrypt') {
        const hashed = await bcrypt.hash(htPass, 10);
        setHtLine(`${htUser.trim()}:${hashed.replace(/^\$2a\$/, '$2y$')}`);
      } else {
        const shaBytes = await digestBuffer('SHA-1', new TextEncoder().encode(htPass));
        setHtLine(`${htUser.trim()}:{SHA}${bytesToBase64(shaBytes)}`);
      }
    } finally {
      setHtBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Username</label>
          <input
            value={htUser}
            onChange={(e) => setHtUser(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Password</label>
          <input
            type="password"
            value={htPass}
            onChange={(e) => setHtPass(e.target.value)}
            placeholder="Enter password"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Format</label>
          <select
            value={htAlgo}
            onChange={(e) => setHtAlgo(e.target.value as 'bcrypt' | 'sha1')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
          >
            <option value="bcrypt">Bcrypt ($2y$ — Apache 2.4+ / Nginx)</option>
            <option value="sha1">SHA-1 ({'{SHA}'} — Legacy)</option>
          </select>
        </div>
      </div>

      <button
        onClick={generateHtpasswd}
        disabled={htBusy || !htUser.trim() || !htPass}
        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition"
      >
        {htBusy ? 'Generating...' : 'Generate .htpasswd Entry'}
      </button>

      {htLine && (
        <HashRow
          label=".htpasswd Line"
          value={htLine}
          copied={copiedKey === 'ht'}
          onCopy={() => copyValue(htLine, 'ht')}
        />
      )}
    </div>
  );
}

function ToggleCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-indigo-500"
      />
      <span className="text-slate-200">{label}</span>
    </label>
  );
}

function HashRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <CopyBtn copied={copied} onClick={onCopy} />
      </div>
      <code className="block text-xs font-mono text-emerald-400 break-all">{value || '—'}</code>
    </div>
  );
}

function CopyBtn({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition"
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