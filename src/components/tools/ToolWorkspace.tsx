'use client';

import type { MicroTool } from '@/config/tools';
import ImageMediaToolsA from '@/components/tools/engines/ImageMediaToolsA';
import ImageMediaToolsB from '@/components/tools/engines/ImageMediaToolsB';
import PdfToolsA from '@/components/tools/engines/PdfToolsA';
import PdfToolsB from '@/components/tools/engines/PdfToolsB';
import DevCodeToolsA from '@/components/tools/engines/DevCodeToolsA';
import DevCodeToolsB from '@/components/tools/engines/DevCodeToolsB';
import CryptoSecurityTools from '@/components/tools/engines/CryptoSecurityTools';
import FinancialTools from '@/components/tools/engines/FinancialTools';
import TextSeoTools from '@/components/tools/engines/TextSeoTools';

export default function ToolWorkspace({ tool }: { tool: MicroTool }) {
  switch (tool.category) {
    case 'Image, Media & Graphics':
      return tool.id <= 10 ? (
        <ImageMediaToolsA key={tool.slug} slug={tool.slug} />
      ) : (
        <ImageMediaToolsB key={tool.slug} slug={tool.slug} />
      );

    case 'PDF & Document Processing':
      return tool.id <= 28 ? (
        <PdfToolsA key={tool.slug} slug={tool.slug} />
      ) : (
        <PdfToolsB key={tool.slug} slug={tool.slug} />
      );

    case 'Developer, API & Code':
      return tool.id <= 48 ? (
        <DevCodeToolsA key={tool.slug} slug={tool.slug} />
      ) : (
        <DevCodeToolsB key={tool.slug} slug={tool.slug} />
      );

    case 'Cryptography & Security':
      return <CryptoSecurityTools key={tool.slug} slug={tool.slug} />;

    case 'Financial & Calculators':
      return <FinancialTools key={tool.slug} slug={tool.slug} />;

    case 'Text, Writing & SEO':
      return <TextSeoTools key={tool.slug} slug={tool.slug} />;
  }
}