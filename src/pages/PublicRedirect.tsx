import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  QrCode,
  ExternalLink,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { getPlateBySlug, registerPlateScan } from '../services/plateService';
import { Plate } from '../types';

export const PublicRedirect: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [plate, setPlate] = useState<Plate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolve() {
      if (!slug) {
        setError('Código de plaquinha inválido.');
        setLoading(false);
        return;
      }

      try {
        const found = await getPlateBySlug(slug);
        if (!found) {
          setError('Esta plaquinha não foi encontrada no sistema.');
          setLoading(false);
          return;
        }

        setPlate(found);

        // If target URL is set and active, execute dynamic redirection
        if (found.targetUrl && found.targetUrl.trim().length > 0 && found.status !== 'disabled') {
          setRedirecting(true);
          // Register visitor scan
          registerPlateScan(found.id).catch(() => {});

          let destination = found.targetUrl.trim();
          if (
            !destination.startsWith('http://') &&
            !destination.startsWith('https://') &&
            !destination.startsWith('WIFI:') &&
            !destination.startsWith('tel:')
          ) {
            destination = 'https://' + destination;
          }

          // Small delay for smooth transition then redirect
          setTimeout(() => {
            window.location.replace(destination);
          }, 800);
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Redirect lookup error:', err);
        setError('Ocorreu uma falha ao consultar o destino desta plaquinha.');
        setLoading(false);
      }
    }

    resolve();
  }, [slug]);

  if (redirecting && plate) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(239,68,68,0.5)]">
            <span className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">Redirecionando...</h2>
            <p className="text-xs text-zinc-400 font-mono">{plate.plateNumber}</p>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Você está sendo direcionado para o destino configurado por{' '}
            <strong className="text-white">{plate.customerName || 'este estabelecimento'}</strong>.
          </p>

          <a
            href={plate.targetUrl}
            className="inline-flex items-center gap-2 text-xs font-semibold text-red-400 hover:text-red-300 underline"
          >
            <span>Clique aqui se não for redirecionado em instantes</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-mono text-zinc-400">Verificando plaquinha inteligente...</span>
      </div>
    );
  }

  if (error || !plate) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-zinc-950 border border-red-900/40 rounded-3xl p-8 space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center mx-auto text-red-500">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Plaquinha Não Encontrada</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {error || 'O código desta plaquinha não foi localizado ou ainda não foi registrado.'}
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
            >
              <span>Acessar Painel Dinâmico Pro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pending Configuration Page (Plate exists, but no target link assigned yet)
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 space-y-6 text-center shadow-[0_0_40px_rgba(0,0,0,0.8)] relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-950 border border-red-500/40 flex items-center justify-center mx-auto text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]">
          <Clock className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/40 text-[11px] font-bold text-amber-400 tracking-wider">
            <span>PLAQUINHA PENDENTE DE ATIVAÇÃO</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Plaquinha Inteligente NFC
          </h1>
          <p className="text-xs font-mono text-zinc-400">{plate.plateNumber}</p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl text-xs text-zinc-300 leading-relaxed text-left space-y-2">
          <p>
            Esta plaquinha física já foi fabricada e numerada com sucesso, mas o link de destino (Instagram, WhatsApp, Google Avaliação, Wi-Fi ou Pix) ainda não foi cadastrado pelo proprietário.
          </p>
          <p className="text-zinc-400 text-[11px]">
            Assim que configurada no sistema, qualquer leitura deste QR Code ou aproximação por NFC redirecionará instantaneamente os visitantes.
          </p>
        </div>

        <div className="pt-2 border-t border-zinc-900 flex flex-col sm:flex-row gap-3">
          <Link
            to={`/placas/${plate.id}/editar`}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_12px_rgba(220,38,38,0.35)] transition-all flex items-center justify-center gap-2"
          >
            <span>CONFIGURAR DESTINO</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
          <span>DINÂMICO PRO · Tecnologia de QR Code Dinâmico Permanente</span>
        </div>
      </div>
    </div>
  );
};
