import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-red-600 selection:text-white">
      {/* Top red glow line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-red-600 to-transparent w-full opacity-80" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-900 bg-black/60 py-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-400">DINÂMICO PRO</span>
            <span>·</span>
            <span>Sistema Comercial de Plaquinhas NFC & QR Code</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-500">
            <span>A4 10x10cm Calibrado</span>
            <span>·</span>
            <span>Monotonia Transacional</span>
            <span>·</span>
            <span>Vercel & Firebase Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
