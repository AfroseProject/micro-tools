import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import ToolWorkspace from '@/components/tools/ToolWorkspace';
import { TOOLS } from '@/config/tools';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) return { title: 'Tool Not Found | QuickTools' };

  return {
    title: `${tool.name} — Free Client-Side Online Tool | QuickTools`,
    description: `${tool.description}. 100% browser-based using ${tool.tech} with zero server uploads.`,
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name,
    description: tool.description,
    applicationCategory: tool.category,
    operatingSystem: 'Any (Browser-based)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/#tools"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to All 100 Tools
          </Link>
          <span className="text-xs font-mono text-slate-500">
            #{String(tool.id).padStart(3, '0')} • {tool.category}
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white">{tool.name}</h1>
          <p className="text-sm text-slate-400">{tool.description}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <ToolWorkspace tool={tool} />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Runs 100% locally in your browser via {tool.tech}. No data leaves your device.</span>
        </div>
      </main>
    </div>
  );
}