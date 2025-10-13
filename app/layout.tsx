import type { Metadata } from 'next';
import './globals.css';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'LinkedIn Ads Form',
  description: 'Collect LinkedIn ad campaign inputs and send them to an n8n webhook.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-950 antialiased">{children}</body>
    </html>
  );
}
