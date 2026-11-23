'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import cronstrue from 'cronstrue';
import { Copy, Check, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

// --- Helpers ---

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function generateUlid(): string {
  let now = Date.now();
  let timePart = '';
  for (let i = 0; i < 10; i++) {
    timePart = CROCKFORD[now % 32] + timePart;
    now = Math.floor(now / 32);
  }
  const randBytes = new Uint8Array(16);
  crypto.getRandomValues(randBytes);
  let randPart = '';
  for (let i = 0; i < 16; i++) {
    randPart += CROCKFORD[randBytes[i] & 31];
  }
  return timePart + randPart;
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64.trim());
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function formatSqlQuery(raw: string): string {
  const normalized = raw.replace(/\s+/g, ' ').trim();
  const clauses = [
    'SELECT',
    'FROM',
    'WHERE',
    'INNER JOIN',
    'LEFT JOIN',
    'RIGHT JOIN',
    'FULL JOIN',
    'CROSS JOIN',
    'JOIN',
    'ON',
    'GROUP BY',
    'ORDER BY',
    'HAVING',
    'LIMIT',
    'OFFSET',
    'UNION ALL',
    'UNION',
    'INSERT INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE FROM',
  ];
  let out = normalized;
  clauses.forEach((kw) => {
    const re = new RegExp(`\\b${kw}\\b`, 'gi');
    out = out.replace(re, `\n${kw}`);
  });
  out = out.replace(/\b(AND|OR)\b/gi, '\n  $1');
  out = out.replace(/,\s*/g, ',\n  ');
  return out.trim();
}

function formatCodeSimple(code: string, lang: 'html' | 'css' | 'js', minify: boolean): string {
  if (minify) {
    if (lang === 'html') {
      return code
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{};:,])\s*/g, '$1')
      .trim();
  }

  if (lang === 'html') {
    const tokens = code.replace(/>\s*</g, '>\n<').split('\n');
    let indent = 0;
    return tokens
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (/^<\//.test(trimmed)) indent = Math.max(0, indent - 1);
        const pad = '  '.repeat(indent);
        if (
          /^<[^/!?][^>]*[^/]>$/.test(trimmed) &&
          !/^<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b/i.test(trimmed) &&
          !trimmed.includes('</')
        ) {
          indent += 1;
        }
        return pad + trimmed;
      })
      .filter(Boolean)
      .join('\n');
  }

  const expanded = code
    .replace(/\s+/g, ' ')
    .replace(/\{/g, ' {\n')
    .replace(/\}/g, '\n}\n')
    .replace(/;/g, ';\n');

  let level = 0;
  return expanded
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('}')) level = Math.max(0, level - 1);
      const pad = '  '.repeat(level);
      if (trimmed.endsWith('{')) level += 1;
      return pad + trimmed;
    })
    .filter(Boolean)
    .join('\n');
}

function parseCurlCommand(cmd: string, target: 'fetch' | 'axios' | 'python'): string {
  const cleaned = cmd.replace(/\\\r?\n/g, ' ').trim();
  const urlMatch = cleaned.match(/https?:\/\/[^\s'"]+/);
  const url = urlMatch ? urlMatch[0] : 'https://api.example.com/v1/resource';

  const methodMatch = cleaned.match(/(?:-X|--request)\s+['"]?([A-Z]+)['"]?/i);
  const dataMatch = cleaned.match(/(?:-d|--data|--data-raw|--data-binary)\s+(['"])([\s\S]*?)\1/);
  const method = methodMatch ? methodMatch[1].toUpperCase() : dataMatch ? 'POST' : 'GET';

  const headers: Record<string, string> = {};
  const headerRe = /(?:-H|--header)\s+(['"])([^'"]+)\1/g;
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(cleaned)) !== null) {
    const idx = m[2].indexOf(':');
    if (idx > 0) {
      headers[m[2].slice(0, idx).trim()] = m[2].slice(idx + 1).trim();
    }
  }

  const body = dataMatch ? dataMatch[2] : null;
  const headerEntries = Object.keys(headers).length > 0;

  if (target === 'fetch') {
    const opts: string[] = [`  method: '${method}',`];
    if (headerEntries) {
      opts.push(`  headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')},`);
    }
    if (body) {
      opts.push(`  body: ${JSON.stringify(body)},`);
    }
    return `const response = await fetch('${url}', {\n${opts.join('\n')}\n});\nconst data = await response.json();\nconsole.log(data);`;
  }

  if (target === 'axios') {
    const opts: string[] = [`  method: '${method}',`, `  url: '${url}',`];
    if (headerEntries) {
      opts.push(`  headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')},`);
    }
    if (body) {
      opts.push(`  data: ${body.trim().startsWith('{') ? body : JSON.stringify(body)},`);
    }
    return `import axios from 'axios';\n\nconst { data } = await axios({\n${opts.join('\n')}\n});\nconsole.log(data);`;
  }

  const pyLines = [`import requests`, ``, `url = "${url}"`];
  if (headerEntries) {
    pyLines.push(`headers = ${JSON.stringify(headers, null, 2)}`);
  }
  if (body) {
    pyLines.push(`payload = ${JSON.stringify(body)}`);
  }
  const args = [
    `url`,
    headerEntries ? `headers=headers` : null,
    body ? `data=payload` : null,
  ]
    .filter(Boolean)
    .join(', ');
  pyLines.push(`response = requests.${method.toLowerCase()}(${args})`);
  pyLines.push(`print(response.json())`);
  return pyLines.join('\n');
}

function jsonToTsInterfaces(value: unknown, rootName = 'Root'): string {
  const interfaces: string[] = [];

  const capitalize = (s: string) =>
    s
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
      .replace(/^[a-z]/, (c) => c.toUpperCase()) || 'Item';

  const inferType = (val: unknown, name: string): string => {
    if (val === null) return 'null';
    if (Array.isArray(val)) {
      if (val.length === 0) return 'unknown[]';
      const itemTypes = Array.from(new Set(val.map((v) => inferType(v, `${name}Item`))));
      return itemTypes.length === 1 ? `${itemTypes[0]}[]` : `(${itemTypes.join(' | ')})[]`;
    }
    if (typeof val === 'object') {
      const ifaceName = capitalize(name);
      const entries = Object.entries(val as Record<string, unknown>);
      const props = entries.map(([k, v]) => {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
        return `  ${safeKey}: ${inferType(v, k)};`;
      });
      interfaces.push(`export interface ${ifaceName} {\n${props.join('\n')}\n}`);
      return ifaceName;
    }
    return typeof val;
  };

  if (Array.isArray(value)) {
    const typeRef = inferType(value, rootName);
    interfaces.push(`export type ${rootName}List = ${typeRef};`);
  } else if (typeof value === 'object' && value !== null) {
    inferType(value, rootName);
  } else {
    return `export type ${rootName} = ${typeof value};`;
  }

  return interfaces.reverse().join('\n\n');
}

// --- Component ---

export default function DevCodeToolsA({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  // #36 JSON Formatter
  const [jsonInput, setJsonInput] = useState(
    '{"platform":"QuickTools","tools":100,"clientSide":true,"categories":["Dev","PDF","SEO"]}'
  );
  const [jsonIndent, setJsonIndent] = useState<2 | 4>(2);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // #37 JWT Decoder
  const [jwtToken, setJwtToken] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEwMSIsIm5hbWUiOiJRdWlja1Rvb2xzIERldiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczMjM3NzYwMCwiZXhwIjoxODkzNDU2MDAwfQ.signature_placeholder'
  );

  // #38 Regex Tester
  const [regexPattern, setRegexPattern] = useState('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b');
  const [regexFlags, setRegexFlags] = useState('g');
  const [regexSample, setRegexSample] = useState(
    'Contact support@quicktools.dev or sales@example.org for enterprise inquiries.'
  );

  // #39 Base64 & #40 URL
  const [codecInput, setCodecInput] = useState('Hello QuickTools! https://example.com/?q=micro tools&v=2');
  const [codecOutput, setCodecOutput] = useState('');
  const [codecError, setCodecError] = useState<string | null>(null);

  // #41 HTML/CSS/JS Beautifier
  const [codeLang, setCodeLang] = useState<'html' | 'css' | 'js'>('js');
  const [codeInput, setCodeInput] = useState(
    'function greet(name){const msg=`Hello, ${name}!`;return msg.toUpperCase();}'
  );
  const [codeOutput, setCodeOutput] = useState('');

  // #42 SQL Formatter
  const [sqlInput, setSqlInput] = useState(
    'select u.id, u.email, count(o.id) as total_orders from users u inner join orders o on u.id = o.user_id where u.active = 1 and o.amount > 50 group by u.id, u.email order by total_orders desc limit 20;'
  );

  // #43 cURL Converter
  const [curlInput, setCurlInput] = useState(
    `curl -X POST https://api.example.com/v1/users -H "Authorization: Bearer token123" -H "Content-Type: application/json" -d '{"name":"Ada","role":"engineer"}'`
  );
  const [curlTarget, setCurlTarget] = useState<'fetch' | 'axios' | 'python'>('fetch');

  // #44 UUID / ULID Generator
  const [idType, setIdType] = useState<'uuid' | 'ulid'>('uuid');
  const [idCount, setIdCount] = useState(10);
  const [generatedIds, setGeneratedIds] = useState<string[]>(() =>
    Array.from({ length: 10 }, () => crypto.randomUUID())
  );

  // #45 JSON <-> CSV
  const [csvMode, setCsvMode] = useState<'json-to-csv' | 'csv-to-json'>('json-to-csv');
  const [csvInput, setCsvInput] = useState(
    '[{"name":"Alice","role":"Frontend","country":"IN"},{"name":"Bob","role":"Backend","country":"UK"}]'
  );
  const [csvOutput, setCsvOutput] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);

  // #46 JSON to TypeScript
  const [tsRootName, setTsRootName] = useState('ApiResponse');
  const [tsJsonInput, setTsJsonInput] = useState(
    '{\n  "id": 42,\n  "title": "QuickTools",\n  "active": true,\n  "tags": ["nextjs", "tailwind"],\n  "author": { "name": "Dev", "verified": true }\n}'
  );

  // #47 Crontab Generator
  const [cronExpr, setCronExpr] = useState('*/15 * * * *');

  // #48 HTACCESS / NGINX Builder
  const [serverType, setServerType] = useState<'nginx' | 'htaccess'>('nginx');
  const [domain, setDomain] = useState('example.com');
  const [forceHttps, setForceHttps] = useState(true);
  const [removeWww, setRemoveWww] = useState(true);
  const [secHeaders, setSecHeaders] = useState(true);
  const [gzipEnable, setGzipEnable] = useState(true);

  const copyText = async (val: string) => {
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // #36 JSON Formatter, Validator & Minifier
  if (slug === 'json-formatter-validator') {
    const formatJson = (minify: boolean) => {
      try {
        const parsed = JSON.parse(jsonInput);
        setJsonInput(minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, jsonIndent));
        setJsonError(null);
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON syntax');
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => formatJson(false)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
          >
            Format / Validate
          </button>
          <button
            onClick={() => formatJson(true)}
            className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white transition"
          >
            Minify
          </button>
          <select
            value={jsonIndent}
            onChange={(e) => setJsonIndent(Number(e.target.value) as 2 | 4)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value={2}>2 Spaces</option>
            <option value={4}>4 Spaces</option>
          </select>
          <CopyBtn copied={copied} onClick={() => copyText(jsonInput)} />
        </div>

        {jsonError ? (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" /> {jsonError}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-2.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Ready to validate or transform JSON locally
          </div>
        )}

        <textarea
          rows={12}
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value);
            setJsonError(null);
          }}
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-xs font-mono text-emerald-300 focus:outline-none"
        />
      </div>
    );
  }

  // #37 JWT Decoder
  if (slug === 'jwt-decoder') {
    let headerObj: Record<string, unknown> | null = null;
    let payloadObj: Record<string, unknown> | null = null;
    let decodeErr: string | null = null;

    const parts = jwtToken.trim().split('.');
    if (parts.length !== 3) {
      decodeErr = 'A valid JWT must contain 3 dot-separated segments (header.payload.signature).';
    } else {
      try {
        headerObj = JSON.parse(decodeBase64Url(parts[0])) as Record<string, unknown>;
        payloadObj = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
      } catch {
        decodeErr = 'Unable to Base64URL-decode or parse the JWT header/payload.';
      }
    }

    const expVal = typeof payloadObj?.exp === 'number' ? payloadObj.exp : null;
    const isExpired = expVal !== null ? expVal * 1000 < Date.now() : null;

    return (
      <div className="space-y-5">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Encoded JWT</label>
          <textarea
            rows={4}
            value={jwtToken}
            onChange={(e) => setJwtToken(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-xs font-mono text-amber-300 break-all focus:outline-none"
          />
        </div>

        {decodeErr ? (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-xl">
            {decodeErr}
          </div>
        ) : (
          <>
            {expVal !== null && (
              <div
                className={`text-xs font-semibold px-3.5 py-2.5 rounded-xl border ${
                  isExpired
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}
              >
                {isExpired ? 'Token Expired' : 'Token Active'} • Expires:{' '}
                {new Date(expVal * 1000).toLocaleString()}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-semibold text-indigo-400">Header</div>
                <pre className="text-xs font-mono text-slate-200 overflow-x-auto">
                  {JSON.stringify(headerObj, null, 2)}
                </pre>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-semibold text-emerald-400">Payload</div>
                <pre className="text-xs font-mono text-slate-200 overflow-x-auto">
                  {JSON.stringify(payloadObj, null, 2)}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // #38 Regex Tester
  if (slug === 'regex-tester') {
    let matches: string[] = [];
    let regexErr: string | null = null;
    try {
      const safeFlags = regexFlags.includes('g') ? regexFlags : `${regexFlags}g`;
      const re = new RegExp(regexPattern, safeFlags);
      matches = Array.from(regexSample.matchAll(re), (m) => m[0]);
    } catch (err) {
      regexErr = err instanceof Error ? err.message : 'Invalid regular expression';
    }

    const toggleFlag = (f: string) => {
      setRegexFlags((prev) => (prev.includes(f) ? prev.replace(f, '') : prev + f));
    };

    return (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-4 gap-3">
          <input
            value={regexPattern}
            onChange={(e) => setRegexPattern(e.target.value)}
            placeholder="Regular expression pattern..."
            className="sm:col-span-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm font-mono text-indigo-300 focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            {['g', 'i', 'm', 's'].map((flag) => (
              <button
                key={flag}
                onClick={() => toggleFlag(flag)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold border transition ${
                  regexFlags.includes(flag)
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {flag}
              </button>
            ))}
          </div>
        </div>

        <textarea
          rows={5}
          value={regexSample}
          onChange={(e) => setRegexSample(e.target.value)}
          placeholder="Paste test string..."
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-mono text-white"
        />

        {regexErr ? (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
            {regexErr}
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-400">
              Matches Found: <span className="text-emerald-400">{matches.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {matches.length > 0 ? (
                matches.map((m, idx) => (
                  <span
                    key={`${m}-${idx}`}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono"
                  >
                    {m}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">No matches yet.</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // #39 Base64 Encoder / Decoder
  if (slug === 'base64-encoder-decoder') {
    const run = (mode: 'encode' | 'decode') => {
      try {
        setCodecOutput(mode === 'encode' ? utf8ToBase64(codecInput) : base64ToUtf8(codecInput));
        setCodecError(null);
      } catch {
        setCodecError('Invalid Base64 string. Ensure there are no malformed characters.');
      }
    };

    return (
      <div className="space-y-4">
        <textarea
          rows={5}
          value={codecInput}
          onChange={(e) => setCodecInput(e.target.value)}
          placeholder="Enter plaintext or Base64 string..."
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => run('encode')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
          >
            Encode to Base64
          </button>
          <button
            onClick={() => run('decode')}
            className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white"
          >
            Decode from Base64
          </button>
          <CopyBtn copied={copied} onClick={() => copyText(codecOutput)} />
        </div>
        {codecError && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
            {codecError}
          </div>
        )}
        <textarea
          readOnly
          rows={5}
          value={codecOutput}
          placeholder="Result..."
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-400"
        />
      </div>
    );
  }

  // #40 URL Encoder / Decoder
  if (slug === 'url-encoder-decoder') {
    const run = (mode: 'encode' | 'decode') => {
      try {
        setCodecOutput(
          mode === 'encode' ? encodeURIComponent(codecInput) : decodeURIComponent(codecInput)
        );
        setCodecError(null);
      } catch {
        setCodecError('Malformed percent-encoded URI sequence.');
      }
    };

    return (
      <div className="space-y-4">
        <textarea
          rows={4}
          value={codecInput}
          onChange={(e) => setCodecInput(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => run('encode')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
          >
            URL Encode
          </button>
          <button
            onClick={() => run('decode')}
            className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white"
          >
            URL Decode
          </button>
          <CopyBtn copied={copied} onClick={() => copyText(codecOutput)} />
        </div>
        {codecError && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
            {codecError}
          </div>
        )}
        <textarea
          readOnly
          rows={4}
          value={codecOutput}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-indigo-300"
        />
      </div>
    );
  }

  // #41 HTML/CSS/JS Beautifier & Minifier
  if (slug === 'html-css-js-beautifier') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['html', 'css', 'js'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setCodeLang(l)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold uppercase ${
                codeLang === l
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              {l}
            </button>
          ))}
          <button
            onClick={() => setCodeOutput(formatCodeSimple(codeInput, codeLang, false))}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
          >
            Beautify
          </button>
          <button
            onClick={() => setCodeOutput(formatCodeSimple(codeInput, codeLang, true))}
            className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white"
          >
            Minify
          </button>
          <CopyBtn copied={copied} onClick={() => copyText(codeOutput || codeInput)} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            rows={10}
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Paste source code..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
          />
          <textarea
            readOnly
            rows={10}
            value={codeOutput}
            placeholder="Formatted / minified output..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300"
          />
        </div>
      </div>
    );
  }

  // #42 SQL Query Formatter
  if (slug === 'sql-query-formatter') {
    const formatted = formatSqlQuery(sqlInput);
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Raw SQL Query</label>
          <textarea
            rows={10}
            value={sqlInput}
            onChange={(e) => setSqlInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">Formatted SQL</label>
            <CopyBtn copied={copied} onClick={() => copyText(formatted)} />
          </div>
          <textarea
            readOnly
            rows={10}
            value={formatted}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-indigo-300"
          />
        </div>
      </div>
    );
  }

  // #43 cURL to Fetch / Axios / Python
  if (slug === 'curl-converter') {
    const converted = parseCurlCommand(curlInput, curlTarget);
    return (
      <div className="space-y-4">
        <textarea
          rows={4}
          value={curlInput}
          onChange={(e) => setCurlInput(e.target.value)}
          placeholder="Paste a cURL command..."
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {(['fetch', 'axios', 'python'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setCurlTarget(t)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize ${
                  curlTarget === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                {t === 'python' ? 'Python (requests)' : t}
              </button>
            ))}
          </div>
          <CopyBtn copied={copied} onClick={() => copyText(converted)} />
        </div>
        <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto">
          {converted}
        </pre>
      </div>
    );
  }

  // #44 UUID / ULID Generator
  if (slug === 'uuid-ulid-generator') {
    const regen = (type = idType, count = idCount) => {
      const safeCount = Math.min(500, Math.max(1, count));
      setGeneratedIds(
        Array.from({ length: safeCount }, () =>
          type === 'uuid' ? crypto.randomUUID() : generateUlid()
        )
      );
    };

    const joined = generatedIds.join('\n');

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={idType}
            onChange={(e) => {
              const next = e.target.value as 'uuid' | 'ulid';
              setIdType(next);
              regen(next, idCount);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
          >
            <option value="uuid">UUID v4 (Random)</option>
            <option value="ulid">ULID (Timestamp Sortable)</option>
          </select>
          <input
            type="number"
            min={1}
            max={500}
            value={idCount}
            onChange={(e) => setIdCount(Number(e.target.value) || 1)}
            className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
          />
          <button
            onClick={() => regen()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Generate
          </button>
          <CopyBtn copied={copied} onClick={() => copyText(joined)} />
        </div>
        <textarea
          readOnly
          rows={10}
          value={joined}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-400"
        />
      </div>
    );
  }

  // #45 JSON <-> CSV Converter
  if (slug === 'json-csv-converter') {
    const convert = () => {
      setCsvError(null);
      try {
        if (csvMode === 'json-to-csv') {
          const parsed = JSON.parse(csvInput);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          setCsvOutput(Papa.unparse(arr));
        } else {
          const res = Papa.parse(csvInput.trim(), { header: true, skipEmptyLines: true });
          setCsvOutput(JSON.stringify(res.data, null, 2));
        }
      } catch (err) {
        setCsvError(err instanceof Error ? err.message : 'Conversion error');
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCsvMode('json-to-csv')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
              csvMode === 'json-to-csv'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            JSON → CSV
          </button>
          <button
            onClick={() => setCsvMode('csv-to-json')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
              csvMode === 'csv-to-json'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            CSV → JSON
          </button>
          <button
            onClick={convert}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
          >
            Convert
          </button>
          <CopyBtn copied={copied} onClick={() => copyText(csvOutput)} />
        </div>

        {csvError && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
            {csvError}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            rows={10}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
          />
          <textarea
            readOnly
            rows={10}
            value={csvOutput}
            placeholder="Converted output..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-indigo-300"
          />
        </div>
      </div>
    );
  }

  // #46 JSON to TypeScript Interface
  if (slug === 'json-to-typescript') {
    let tsOut = '';
    let tsErr: string | null = null;
    try {
      tsOut = jsonToTsInterfaces(JSON.parse(tsJsonInput), tsRootName.trim() || 'Root');
    } catch (err) {
      tsErr = err instanceof Error ? err.message : 'Invalid JSON payload';
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={tsRootName}
            onChange={(e) => setTsRootName(e.target.value)}
            placeholder="Root Interface Name"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white"
          />
          <CopyBtn copied={copied} onClick={() => copyText(tsOut)} />
        </div>
        {tsErr && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
            {tsErr}
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            rows={11}
            value={tsJsonInput}
            onChange={(e) => setTsJsonInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
          />
          <textarea
            readOnly
            rows={11}
            value={tsOut}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300"
          />
        </div>
      </div>
    );
  }

  // #47 Crontab Generator & Humanizer
  if (slug === 'crontab-generator') {
    let human = '';
    let cronErr: string | null = null;
    try {
      human = cronstrue.toString(cronExpr.trim());
    } catch (err) {
      cronErr = err instanceof Error ? err.message : 'Invalid cron expression';
    }

    const presets = [
      { label: 'Every 5 mins', expr: '*/5 * * * *' },
      { label: 'Hourly', expr: '0 * * * *' },
      { label: 'Daily at 2 AM', expr: '0 2 * * *' },
      { label: 'Weekdays 9 AM', expr: '0 9 * * 1-5' },
      { label: '1st of Month', expr: '0 0 1 * *' },
    ];

    return (
      <div className="space-y-5">
        <div className="flex gap-2">
          <input
            value={cronExpr}
            onChange={(e) => setCronExpr(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-base font-mono text-white focus:outline-none"
          />
          <CopyBtn copied={copied} onClick={() => copyText(cronExpr)} />
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => setCronExpr(p.expr)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-indigo-600 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
            >
              {p.label}
            </button>
          ))}
        </div>

        {cronErr ? (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-4 rounded-2xl">
            {cronErr}
          </div>
        ) : (
          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-5">
            <div className="text-xs text-indigo-400 font-semibold">Human-Readable Schedule</div>
            <div className="text-lg font-bold text-white mt-1">{human}</div>
          </div>
        )}
      </div>
    );
  }

  // #48 HTACCESS / NGINX Rule Builder
  const nginxConfig = [
    forceHttps
      ? `server {\n  listen 80;\n  server_name ${domain} www.${domain};\n  return 301 https://${domain}$request_uri;\n}\n`
      : '',
    `server {\n  listen 443 ssl http2;\n  server_name ${domain}${removeWww ? '' : ` www.${domain}`};`,
    secHeaders
      ? `  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n  add_header X-Content-Type-Options "nosniff" always;\n  add_header X-Frame-Options "SAMEORIGIN" always;\n  add_header Referrer-Policy "strict-origin-when-cross-origin" always;`
      : '',
    gzipEnable ? `  gzip on;\n  gzip_types text/plain text/css application/json application/javascript;` : '',
    `}`,
  ]
    .filter(Boolean)
    .join('\n');

  const htaccessConfig = [
    `RewriteEngine On`,
    forceHttps ? `RewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]` : '',
    removeWww
      ? `RewriteCond %{HTTP_HOST} ^www\\.${domain.replace(/\./g, '\\.')} [NC]\nRewriteRule ^(.*)$ https://${domain}/$1 [L,R=301]`
      : '',
    secHeaders
      ? `<IfModule mod_headers.c>\n  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"\n  Header always set X-Content-Type-Options "nosniff"\n  Header always set X-Frame-Options "SAMEORIGIN"\n</IfModule>`
      : '',
    gzipEnable
      ? `<IfModule mod_deflate.c>\n  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json\n</IfModule>`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const outputRule = serverType === 'nginx' ? nginxConfig : htaccessConfig;

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setServerType('nginx')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold ${
              serverType === 'nginx'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            NGINX
          </button>
          <button
            onClick={() => setServerType('htaccess')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold ${
              serverType === 'htaccess'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Apache .htaccess
          </button>
        </div>
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono text-white"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <Toggle label="Force HTTPS (301 Redirect)" checked={forceHttps} onChange={setForceHttps} />
        <Toggle label="Strip www Subdomain" checked={removeWww} onChange={setRemoveWww} />
        <Toggle label="Add Security Headers (HSTS, XFO)" checked={secHeaders} onChange={setSecHeaders} />
        <Toggle label="Enable Gzip Compression" checked={gzipEnable} onChange={setGzipEnable} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-end">
          <CopyBtn copied={copied} onClick={() => copyText(outputRule)} />
        </div>
        <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto">
          {outputRule}
        </pre>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 cursor-pointer">
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

function CopyBtn({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition"
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