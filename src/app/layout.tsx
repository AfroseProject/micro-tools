import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QuickTools — Privacy-First Micro Web Utilities',
  description: 'Fast, secure, and client-side web tools for developers, creators, and writers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}