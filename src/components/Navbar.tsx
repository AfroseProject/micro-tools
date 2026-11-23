import Link from 'next/link';
import { Terminal, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link className="flex items-center gap-2.5 text-white font-extrabold tracking-tight text-lg" href="/">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Terminal className="w-4 h-4 text-white"/>
          </div>
          <span>QuickTools</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link className="text-xs font-medium text-slate-400 hover:text-white transition" href="/#tools">
            All 100 Tools
          </Link>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5"/> 100% Client-Side
          </span>
        </div>
      </div>
    </header>
  );
}