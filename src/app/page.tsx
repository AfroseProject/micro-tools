'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { TOOLS, CATEGORIES, type ToolCategory } from '@/config/tools';
import { Search, ArrowRight, Sparkles, Layers } from 'lucide-react';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'All'>('All');

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      const matchesCat = selectedCategory === 'All' || tool.category === selectedCategory;
      const matchesQuery =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        String(tool.id) === q;
      return matchesCat && matchesQuery;
    });
  }, [query, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 space-y-12">
        <section className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> 100 Free Browser-Based Utilities • Zero Server Uploads
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            All-in-One <span className="text-indigo-400">Client-Side</span> Micro-Tools
          </h1>
          <p className="text-slate-400 text-base">
            Every image, PDF, cryptographic hash, developer formatter, SEO utility, and financial calculator runs 100% locally in your browser.
          </p>

          <div className="relative max-w-xl mx-auto pt-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 mt-1" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 100 tools (e.g., PDF Merger, JWT, WEBP, Compound Interest, QR)..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none shadow-xl"
            />
          </div>
        </section>

        <section id="tools" className="space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedCategory === 'All'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Tools ({TOOLS.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = TOOLS.filter((t) => t.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-800/80 pb-3">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Showing <strong className="text-slate-300">{filteredTools.length}</strong> utilities
            </span>
            {query && (
              <button onClick={() => setQuery('')} className="text-indigo-400 hover:underline">
                Clear search
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.slug}`}
                className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col justify-between transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-indigo-400 font-medium">{tool.category}</span>
                    <span className="text-slate-600 font-mono">#{String(tool.id).padStart(3, '0')}</span>
                  </div>
                  <h2 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                    {tool.name}
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">{tool.description}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-slate-500">{tool.tech}</span>
                  <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        QuickTools • 100 Client-Side Micro-Tools • Private &amp; Fast
      </footer>
    </div>
  );
}