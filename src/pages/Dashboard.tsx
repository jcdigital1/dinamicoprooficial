import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  PlusCircle,
  FolderKanban,
  Settings,
  CheckCircle2,
  Clock,
  QrCode,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '../firebase/authContext';
import { getUserBatches, getAllUserPlates } from '../services/plateService';
import { Batch, Plate } from '../types';

export const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [userBatches, userPlates] = await Promise.all([
          getUserBatches(user.uid),
          getAllUserPlates(user.uid),
        ]);
        setBatches(userBatches);
        setPlates(userPlates);
      } catch (e) {
        console.error('Error loading dashboard stats:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const totalPlates = plates.length;
  const totalBatches = batches.length;
  const pendingPlates = plates.filter((p) => p.status === 'pending' || !p.targetUrl).length;
  const configuredPlates = plates.filter((p) => p.status === 'active' && p.targetUrl).length;
  const recentBatches = batches.slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome & Primary Action */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-zinc-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-[11px] font-semibold text-red-400 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              SISTEMA COMERCIAL PRO
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Painel de Plaquinhas NFC & QR Code
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Gere lotes para produção física com substituição exata do QR Code fictício e exporte folhas A4 10x10cm calibradas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            {isAdmin && (
              <Link
                to="/admin"
                className="px-4 py-3 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-red-400" />
                <span>PAINEL ADMIN</span>
              </Link>
            )}
            <Link
              to="/gerar-lote"
              className="px-5 py-3 rounded-xl bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-[0_4px_16px_rgba(220,38,38,0.4)] active:translate-y-0.5 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>GERAR NOVO LOTE</span>
            </Link>
            <Link
              to="/meus-lotes"
              className="px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs transition-all flex items-center gap-2"
            >
              <FolderKanban className="w-4 h-4 text-red-500" />
              <span>MEUS LOTES</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase text-zinc-400">Total de Placas</span>
            <QrCode className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            {loading ? '-' : totalPlates}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Unidades numeradas</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase text-zinc-400">Lotes Gerados</span>
            <FolderKanban className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            {loading ? '-' : totalBatches}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Ordens de produção</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase text-zinc-400">Configuradas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums">
            {loading ? '-' : configuredPlates}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Com destino ativo</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase text-zinc-400">Pendentes</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">
            {loading ? '-' : pendingPlates}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Aguardando ativação</div>
        </div>
      </div>

      {/* Recent Batches Section */}
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white">Últimos Lotes Gerados</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Histórico recente de produção</p>
          </div>
          <Link
            to="/meus-lotes"
            className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 text-xs">Carregando dados...</div>
        ) : recentBatches.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
              <FolderKanban className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-zinc-300">Nenhum lote gerado ainda</p>
            <Link
              to="/gerar-lote"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-[0_4px_12px_rgba(220,38,38,0.35)] transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              GERAR PRIMEIRO LOTE
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-1">Lote</th>
                  <th className="pb-3">Modelo</th>
                  <th className="pb-3">Numeração</th>
                  <th className="pb-3">Qtd</th>
                  <th className="pb-3">Data</th>
                  <th className="pb-3 text-right pr-1">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {recentBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3.5 pl-1 font-mono font-bold text-white">
                      {batch.batchCode}
                    </td>
                    <td className="py-3.5 text-zinc-300 font-medium">{batch.modelName}</td>
                    <td className="py-3.5 font-mono text-zinc-400">
                      {batch.startPlateNumber} <span className="text-zinc-600">→</span> {batch.endPlateNumber}
                    </td>
                    <td className="py-3.5 font-mono text-white font-semibold tabular-nums">
                      {batch.quantity} un
                    </td>
                    <td className="py-3.5 text-zinc-400">
                      {new Date(batch.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <Link
                        to={`/lotes/${batch.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold transition-all"
                      >
                        <span>Visualizar</span>
                        <ArrowRight className="w-3 h-3 text-red-500" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
