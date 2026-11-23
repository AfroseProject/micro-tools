'use client';

import { useState, useEffect } from 'react';
import { diffLines } from 'diff';
import * as yaml from 'js-yaml';
import { marked } from 'marked';
import { Copy, Check, Keyboard } from 'lucide-react';

// --- Helpers ---

function prettifyGraphql(raw: string): string {
  const spaced = raw
    .replace(/\s+/g, ' ')
    .replace(/\{/g, ' {\n')
    .replace(/\}/g, '\n}\n')
    .replace(/,\s*/g, ', ');

  let level = 0;
  return spaced
    .split('\n')
    .map((l) => {
      const t = l.trim();
      if (!t) return '';
      if (t.startsWith('}')) level = Math.max(0, level - 1);
      const pad = '  '.repeat(level);
      if (t.endsWith('{')) level += 1;
      return pad + t;
    })
    .filter(Boolean)
    .join('\n');
}

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    num = ((num << 8) | n) >>> 0;
  }
  return num;
}

function intToIp(num: number): string {
  return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
}

function xmlNodeToJson(node: Element): unknown {
  const obj: Record<string, unknown> = {};
  if (node.attributes.length > 0) {
    const attrs: Record<string, string> = {};
    for (let i = 0; i < node.attributes.length; i++) {
      const a = node.attributes[i];
      attrs[a.name] = a.value;
    }
    obj['@attributes'] = attrs;
  }

  const children = Array.from(node.children);
  if (children.length === 0) {
    const text = (node.textContent || '').trim();
    if (Object.keys(obj).length === 0) return text;
    if (text) obj['#text'] = text;
    return obj;
  }

  for (const child of children) {
    const key = child.nodeName;
    const val = xmlNodeToJson(child);
    if (key in obj) {
      const existing = obj[key];
      obj[key] = Array.isArray(existing) ? [...existing, val] : [existing, val];
    } else {
      obj[key] = val;
    }
  }
  return obj;
}

function sanitizePreviewHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

// --- Component ---

export default function DevCodeToolsB({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  // #49 GraphQL Prettifier
  const [gqlInput, setGqlInput] = useState(
    'query GetProject($id: ID!) { project(id: $id) { id name status owner { name email } } }'
  );

  // #50 Flexbox / Grid Playground
  const [layoutMode, setLayoutMode] = useState<'flex' | 'grid'>('flex');
  const [flexDir, setFlexDir] = useState<'row' | 'column'>('row');
  const [justify, setJustify] = useState('space-between');
  const [align, setAlign] = useState('center');
  const [gap, setGap] = useState(12);
  const [gridCols, setGridCols] = useState(3);

  // #51 JS Keycode Finder
  const [keyInfo, setKeyInfo] = useState<{
    key: string;
    code: string;
    keyCode: number;
    location: number;
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  } | null>(null);

  // #52 Diff Checker
  const [diffA, setDiffA] = useState('const version = "1.0.0";\nconst mode = "dev";\nconst port = 3000;');
  const [diffB, setDiffB] = useState('const version = "2.0.0";\nconst mode = "production";\nconst port = 3000;\nconst tls = true;');

  // #53 Git Command Generator
  const [gitTask, setGitTask] = useState('undo-last-commit');
  const [gitBranch, setGitBranch] = useState('feature/new-ui');
  const [gitHash, setGitHash] = useState('a1b2c3d');

  // #54 Chmod Calculator
  const [perms, setPerms] = useState({
    owner: [true, true, true],
    group: [true, false, true],
    public: [true, false, true],
  });

  // #55 IP Subnet / CIDR
  const [ipStr, setIpStr] = useState('192.168.1.10');
  const [cidr, setCidr] = useState(24);

  // #56 CSS Box-Shadow & Border-Radius
  const [shX, setShX] = useState(0);
  const [shY, setShY] = useState(14);
  const [shBlur, setShBlur] = useState(32);
  const [shSpread, setShSpread] = useState(-4);
  const [shColor, setShColor] = useState('#4f46e5');
  const [shOpacity, setShOpacity] = useState(0.45);
  const [radius, setRadius] = useState(20);

  // #57 XML to JSON
  const [xmlInput, setXmlInput] = useState(
    '<project id="100"><name>QuickTools</name><tool>JSON</tool><tool>PDF</tool></project>'
  );

  // #58 YAML <-> JSON
  const [yamlMode, setYamlMode] = useState<'yaml-to-json' | 'json-to-yaml'>('yaml-to-json');
  const [yamlInput, setYamlInput] = useState(
    'name: QuickTools\nversion: 1.0\nclientOnly: true\nfeatures:\n  - fast\n  - private\n'
  );
  const [yamlOutput, setYamlOutput] = useState('');
  const [yamlErr, setYamlErr] = useState<string | null>(null);

  // #59 JS Obfuscator / Deobfuscator
  const [jsCode, setJsCode] = useState('function add(a, b) {\n  return a + b;\n}\nconsole.log(add(2, 3));');
  const [jsOut, setJsOut] = useState('');

  // #60 Markdown Live Editor
  const [mdInput, setMdInput] = useState(
    '# QuickTools Markdown Editor\n\nWrite **bold**, *italic*, and `inline code` with instant preview.\n\n- Zero server latency\n- Clean HTML export\n\n```js\nconsole.log("100% client-side");\n```'
  );

  useEffect(() => {
    if (slug !== 'js-keycode-finder') return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      setKeyInfo({
        key: e.key === ' ' ? 'Space' : e.key,
        code: e.code,
        keyCode: e.keyCode,
        location: e.location,
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slug]);

  const copyText = async (val: string) => {
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // #49 GraphQL Prettifier
  if (slug === 'graphql-prettifier') {
    const formatted = prettifyGraphql(gqlInput);
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Raw GraphQL Query / Schema</label>
          <textarea
            rows={10}
            value={gqlInput}
            onChange={(e) => setGqlInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">Formatted GraphQL</label>
            <CopyBtn copied={copied} onClick={() => copyText(formatted)} />
          </div>
          <textarea
            readOnly
            rows={10}
            value={formatted}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300"
          />
        </div>
      </div>
    );
  }

  // #50 CSS Flexbox & Grid Playground
  if (slug === 'css-flexbox-grid-playground') {
    const cssCode =
      layoutMode === 'flex'
        ? `.container {\n  display: flex;\n  flex-direction: ${flexDir};\n  justify-content: ${justify};\n  align-items: ${align};\n  gap: ${gap}px;\n}`
        : `.container {\n  display: grid;\n  grid-template-columns: repeat(${gridCols}, minmax(0, 1fr));\n  gap: ${gap}px;\n}`;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => setLayoutMode('flex')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              layoutMode === 'flex'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Flexbox
          </button>
          <button
            onClick={() => setLayoutMode('grid')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              layoutMode === 'grid'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            CSS Grid
          </button>
          {layoutMode === 'flex' ? (
            <>
              <select
                value={flexDir}
                onChange={(e) => setFlexDir(e.target.value as 'row' | 'column')}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="row">row</option>
                <option value="column">column</option>
              </select>
              <select
                value={justify}
                onChange={(e) => setJustify(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="flex-start">justify: flex-start</option>
                <option value="center">justify: center</option>
                <option value="space-between">justify: space-between</option>
                <option value="space-around">justify: space-around</option>
              </select>
              <select
                value={align}
                onChange={(e) => setAlign(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="stretch">align: stretch</option>
                <option value="flex-start">align: flex-start</option>
                <option value="center">align: center</option>
                <option value="flex-end">align: flex-end</option>
              </select>
            </>
          ) : (
            <label className="flex items-center gap-2 text-xs text-slate-300">
              Columns: {gridCols}
              <input
                type="range"
                min={1}
                max={6}
                value={gridCols}
                onChange={(e) => setGridCols(Number(e.target.value))}
                className="accent-indigo-500"
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-xs text-slate-300">
            Gap: {gap}px
            <input
              type="range"
              min={0}
              max={32}
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
              className="accent-indigo-500"
            />
          </label>
        </div>

        <div
          className="bg-slate-950 border border-slate-800 rounded-2xl p-6 min-h-[180px]"
          style={
            layoutMode === 'flex'
              ? {
                  display: 'flex',
                  flexDirection: flexDir,
                  justifyContent: justify,
                  alignItems: align,
                  gap: `${gap}px`,
                }
              : {
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                  gap: `${gap}px`,
                }
          }
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-indigo-600/30 border border-indigo-400/50 rounded-xl px-4 py-3 text-center text-xs font-bold text-indigo-200"
            >
              Item {n}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-end">
            <CopyBtn copied={copied} onClick={() => copyText(cssCode)} />
          </div>
          <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300">
            {cssCode}
          </pre>
        </div>
      </div>
    );
  }

  // #51 JavaScript Event Keycode Finder
  if (slug === 'js-keycode-finder') {
    return (
      <div className="space-y-6 text-center">
        <div className="bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl p-10 space-y-3">
          <Keyboard className="w-8 h-8 text-indigo-400 mx-auto" />
          <div className="text-4xl font-black font-mono text-white">
            {keyInfo ? keyInfo.key : 'Press Any Key'}
          </div>
          <p className="text-xs text-slate-400">
            Press any key on your keyboard to inspect KeyboardEvent values live.
          </p>
        </div>

        {keyInfo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <StatCard label="event.key" value={keyInfo.key} />
            <StatCard label="event.code" value={keyInfo.code} />
            <StatCard label="event.keyCode" value={String(keyInfo.keyCode)} />
            <StatCard
              label="Modifiers"
              value={
                [
                  keyInfo.ctrl && 'Ctrl',
                  keyInfo.shift && 'Shift',
                  keyInfo.alt && 'Alt',
                  keyInfo.meta && 'Meta',
                ]
                  .filter(Boolean)
                  .join(' + ') || 'None'
              }
            />
          </div>
        )}
      </div>
    );
  }

  // #52 Diff Checker
  if (slug === 'diff-checker') {
    const changes = diffLines(diffA, diffB);
    return (
      <div className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Original Text / Code</label>
            <textarea
              rows={7}
              value={diffA}
              onChange={(e) => setDiffA(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs font-mono text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Modified Text / Code</label>
            <textarea
              rows={7}
              value={diffB}
              onChange={(e) => setDiffB(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs font-mono text-white"
            />
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-x-auto space-y-0.5">
          {changes.map((part, idx) => (
            <pre
              key={idx}
              className={`px-2 py-0.5 rounded whitespace-pre-wrap ${
                part.added
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : part.removed
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'text-slate-400'
              }`}
            >
              {part.added ? '+ ' : part.removed ? '- ' : '  '}
              {part.value.replace(/\n$/, '')}
            </pre>
          ))}
        </div>
      </div>
    );
  }

  // #53 Git Command Generator
  if (slug === 'git-command-generator') {
    const commands: Record<string, { label: string; cmd: string; note: string }> = {
      'undo-last-commit': {
        label: 'Undo last commit (keep changes staged)',
        cmd: 'git reset --soft HEAD~1',
        note: 'Safe for local commits not yet pushed.',
      },
      'cherry-pick': {
        label: 'Cherry-pick specific commit onto current branch',
        cmd: `git cherry-pick ${gitHash}`,
        note: 'Applies the diff from the specified commit hash.',
      },
      'interactive-rebase': {
        label: 'Squash / reorder last 3 commits',
        cmd: 'git rebase -i HEAD~3',
        note: 'Opens editor to pick, squash, or reword commits.',
      },
      'create-switch': {
        label: 'Create and switch to new branch',
        cmd: `git checkout -b ${gitBranch}`,
        note: 'Creates a new branch from current HEAD.',
      },
      'delete-branch': {
        label: 'Delete local and remote branch',
        cmd: `git branch -d ${gitBranch} && git push origin --delete ${gitBranch}`,
        note: 'Use -D to force delete unmerged local branches.',
      },
      'stash-apply': {
        label: 'Stash working changes with message',
        cmd: `git stash push -m "wip: ${gitBranch}"`,
        note: 'Restore later with git stash pop.',
      },
    };

    const current = commands[gitTask];

    return (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <select
            value={gitTask}
            onChange={(e) => setGitTask(e.target.value)}
            className="sm:col-span-3 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
          >
            {Object.entries(commands).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Branch Name</label>
            <input
              value={gitBranch}
              onChange={(e) => setGitBranch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Commit Hash</label>
            <input
              value={gitHash}
              onChange={(e) => setGitHash(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
            />
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
          <code className="text-sm font-mono text-emerald-400 break-all">{current.cmd}</code>
          <CopyBtn copied={copied} onClick={() => copyText(current.cmd)} />
        </div>
        <p className="text-xs text-slate-400">{current.note}</p>
      </div>
    );
  }

  // #54 Chmod Permissions Calculator
  if (slug === 'chmod-calculator') {
    const calcOctal = (arr: boolean[]) => (arr[0] ? 4 : 0) + (arr[1] ? 2 : 0) + (arr[2] ? 1 : 0);
    const calcSym = (arr: boolean[]) =>
      `${arr[0] ? 'r' : '-'}${arr[1] ? 'w' : '-'}${arr[2] ? 'x' : '-'}`;

    const octal = `${calcOctal(perms.owner)}${calcOctal(perms.group)}${calcOctal(perms.public)}`;
    const symbolic = `${calcSym(perms.owner)}${calcSym(perms.group)}${calcSym(perms.public)}`;
    const cmd = `chmod ${octal} filename`;

    const togglePerm = (role: 'owner' | 'group' | 'public', idx: number) => {
      setPerms((prev) => ({
        ...prev,
        [role]: prev[role].map((v, i) => (i === idx ? !v : v)),
      }));
    };

    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          {(['owner', 'group', 'public'] as const).map((role) => (
            <div key={role} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="text-xs font-bold uppercase text-indigo-400">{role}</div>
              {['Read (4)', 'Write (2)', 'Execute (1)'].map((label, idx) => (
                <label key={label} className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={perms[role][idx]}
                    onChange={() => togglePerm(role, idx)}
                    className="accent-indigo-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 items-center">
          <StatCard label="Octal Value" value={octal} />
          <StatCard label="Symbolic Notation" value={symbolic} />
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-2">
            <code className="text-xs font-mono text-emerald-400">{cmd}</code>
            <CopyBtn copied={copied} onClick={() => copyText(cmd)} />
          </div>
        </div>
      </div>
    );
  }

  // #55 IP Subnet & CIDR Calculator
  if (slug === 'ip-subnet-cidr-calculator') {
    const ipInt = ipToInt(ipStr);
    const mask = cidr === 0 ? 0 : cidr === 32 ? 0xffffffff >>> 0 : (~0 << (32 - cidr)) >>> 0;
    const wildcard = ~mask >>> 0;
    const network = ipInt !== null ? (ipInt & mask) >>> 0 : 0;
    const broadcast = ipInt !== null ? (network | wildcard) >>> 0 : 0;
    const totalAddresses = Math.pow(2, 32 - cidr);
    const usableHosts = cidr === 32 ? 1 : cidr === 31 ? 2 : Math.max(0, totalAddresses - 2);
    const firstHost = cidr >= 31 ? network : (network + 1) >>> 0;
    const lastHost = cidr >= 31 ? broadcast : (broadcast - 1) >>> 0;

    return (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">IPv4 Address</label>
            <input
              value={ipStr}
              onChange={(e) => setIpStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">CIDR Prefix (/{cidr})</label>
            <input
              type="range"
              min={0}
              max={32}
              value={cidr}
              onChange={(e) => setCidr(Number(e.target.value))}
              className="w-full accent-indigo-500 mt-3"
            />
          </div>
        </div>

        {ipInt === null ? (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
            Enter a valid IPv4 address (e.g., 192.168.1.10).
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Network Address" value={`${intToIp(network)}/${cidr}`} />
            <StatCard label="Subnet Mask" value={intToIp(mask)} />
            <StatCard label="Broadcast IP" value={intToIp(broadcast)} />
            <StatCard label="First Usable Host" value={intToIp(firstHost)} />
            <StatCard label="Last Usable Host" value={intToIp(lastHost)} />
            <StatCard label="Usable Hosts" value={usableHosts.toLocaleString()} />
          </div>
        )}
      </div>
    );
  }

  // #56 CSS Box-Shadow & Border-Radius Visualizer
  if (slug === 'css-box-shadow-visualizer') {
    const r = parseInt(shColor.slice(1, 3), 16) || 79;
    const g = parseInt(shColor.slice(3, 5), 16) || 70;
    const b = parseInt(shColor.slice(5, 7), 16) || 229;
    const shadowVal = `${shX}px ${shY}px ${shBlur}px ${shSpread}px rgba(${r}, ${g}, ${b}, ${shOpacity})`;
    const cssSnippet = `box-shadow: ${shadowVal};\nborder-radius: ${radius}px;`;

    return (
      <div className="grid lg:grid-cols-2 gap-6 items-center">
        <div className="space-y-3 text-xs">
          <RangeRow label="Offset X" val={shX} min={-60} max={60} unit="px" onChange={setShX} />
          <RangeRow label="Offset Y" val={shY} min={-60} max={60} unit="px" onChange={setShY} />
          <RangeRow label="Blur Radius" val={shBlur} min={0} max={100} unit="px" onChange={setShBlur} />
          <RangeRow label="Spread" val={shSpread} min={-40} max={40} unit="px" onChange={setShSpread} />
          <RangeRow label="Border Radius" val={radius} min={0} max={80} unit="px" onChange={setRadius} />
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-400 mb-1">Shadow Color</label>
              <input
                type="color"
                value={shColor}
                onChange={(e) => setShColor(e.target.value)}
                className="w-full h-9 rounded-lg bg-slate-950 border border-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Opacity ({shOpacity})</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={shOpacity}
                onChange={(e) => setShOpacity(Number(e.target.value))}
                className="w-full accent-indigo-500 mt-2"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 flex items-center justify-center">
            <div
              className="w-40 h-40 bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-semibold text-white"
              style={{ boxShadow: shadowVal, borderRadius: `${radius}px` }}
            >
              Preview Box
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <pre className="text-xs font-mono text-indigo-300 whitespace-pre-wrap">{cssSnippet}</pre>
            <CopyBtn copied={copied} onClick={() => copyText(cssSnippet)} />
          </div>
        </div>
      </div>
    );
  }

  // #57 XML to JSON Converter
  if (slug === 'xml-to-json-converter') {
    let jsonResult = '';
    let xmlErr: string | null = null;
    if (typeof window !== 'undefined' && xmlInput.trim()) {
      try {
        const doc = new DOMParser().parseFromString(xmlInput, 'application/xml');
        const parseErr = doc.querySelector('parsererror');
        if (parseErr) {
          xmlErr = 'Invalid XML syntax. Check for unclosed tags or mismatched elements.';
        } else {
          jsonResult = JSON.stringify({ [doc.documentElement.nodeName]: xmlNodeToJson(doc.documentElement) }, null, 2);
        }
      } catch {
        xmlErr = 'Unable to parse XML input.';
      }
    }

    return (
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-slate-400">XML Input</label>
          <textarea
            rows={10}
            value={xmlInput}
            onChange={(e) => setXmlInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">JSON Output</label>
            <CopyBtn copied={copied} onClick={() => copyText(jsonResult)} />
          </div>
          {xmlErr ? (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-4 rounded-2xl">
              {xmlErr}
            </div>
          ) : (
            <textarea
              readOnly
              rows={10}
              value={jsonResult}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300"
            />
          )}
        </div>
      </div>
    );
  }

  // #58 YAML <-> JSON Converter
  if (slug === 'yaml-json-converter') {
    const runYaml = () => {
      setYamlErr(null);
      try {
        if (yamlMode === 'yaml-to-json') {
          const obj = yaml.load(yamlInput);
          setYamlOutput(JSON.stringify(obj, null, 2));
        } else {
          const obj = JSON.parse(yamlInput);
          setYamlOutput(yaml.dump(obj, { indent: 2 }));
        }
      } catch (err) {
        setYamlErr(err instanceof Error ? err.message : 'Conversion failed');
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setYamlMode('yaml-to-json')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
              yamlMode === 'yaml-to-json'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            YAML → JSON
          </button>
          <button
            onClick={() => setYamlMode('json-to-yaml')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
              yamlMode === 'json-to-yaml'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            JSON → YAML
          </button>
          <button
            onClick={runYaml}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
          >
            Convert
          </button>
          <CopyBtn copied={copied} onClick={() => copyText(yamlOutput)} />
        </div>
        {yamlErr && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl">
            {yamlErr}
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            rows={10}
            value={yamlInput}
            onChange={(e) => setYamlInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
          />
          <textarea
            readOnly
            rows={10}
            value={yamlOutput}
            placeholder="Converted output..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-indigo-300"
          />
        </div>
      </div>
    );
  }

  // #59 JavaScript Obfuscator & Deobfuscator
  if (slug === 'js-obfuscator-deobfuscator') {
    const obfuscate = () => {
      const hexEscaped = Array.from(new TextEncoder().encode(jsCode))
        .map((b) => `\\x${b.toString(16).padStart(2, '0')}`)
        .join('');
      setJsOut(`(function(){const _0x="${hexEscaped}";(0,eval)(_0x);})();`);
    };

    const unpack = () => {
      const match = jsCode.match(/"((?:\\x[0-9a-fA-F]{2})+)"/);
      if (match) {
        const bytes = (match[1].match(/[0-9a-fA-F]{2}/g) || []).map((h) => parseInt(h, 16));
        setJsOut(new TextDecoder().decode(new Uint8Array(bytes)));
      } else {
        setJsOut(
          jsCode
            .replace(/;/g, ';\n')
            .replace(/\{/g, ' {\n  ')
            .replace(/\}/g, '\n}\n')
            .trim()
        );
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={obfuscate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
          >
            Obfuscate JS
          </button>
          <button
            onClick={unpack}
            className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white"
          >
            Unpack / Pretty-Print
          </button>
          <CopyBtn copied={copied} onClick={() => copyText(jsOut)} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            rows={9}
            value={jsCode}
            onChange={(e) => setJsCode(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
          />
          <textarea
            readOnly
            rows={9}
            value={jsOut}
            placeholder="Output..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-amber-300"
          />
        </div>
      </div>
    );
  }

  // #60 Markdown Editor with Live Preview
  const rawHtml = marked.parse(mdInput, { async: false }) as string;
  const safeHtml = sanitizePreviewHtml(rawHtml);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <CopyBtn copied={copied} onClick={() => copyText(safeHtml)} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <textarea
          rows={13}
          value={mdInput}
          onChange={(e) => setMdInput(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white"
        />
        <div
          className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm text-slate-200 space-y-3 overflow-auto max-h-[340px] [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_code]:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:rounded-xl [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-base font-bold font-mono text-indigo-300 mt-1 break-all">{value}</div>
    </div>
  );
}

function RangeRow({
  label,
  val,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  val: number;
  min: number;
  max: number;
  unit: string;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-mono text-white">
          {val}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
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