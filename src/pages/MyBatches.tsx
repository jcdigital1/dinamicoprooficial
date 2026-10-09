import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  FileDown,
  Archive,
  ArrowRight,
  PlusCircle,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../firebase/authContext';
import { getUserBatches, getPlatesByBatchId } from '../services/plateService';
import { getPlateModelById } from '../services/modelService';
import { exportBatchPDF, exportBatchZIP } from '../services/exportService';
import { Batch } from '../types';

export const MyBatches: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string>('');

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const list = await getUserBatches(user.uid);
        setBatches(list);
      } catch (e) {
        console.error('Error fetching batches:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleDownloadPDF = async (batch: Batch) => {
    setExportingId(batch.id + '-pdf');
    setExportMessage(`Gerando PDF A4 de ${batch.batchCode}...`);
    try {
      const [plates, model] = await Promise.all([
        getPlatesByBatchId(batch.id),
        getPlateModelById(batch.modelId),
      ]);
      if (!model) throw new Error('Modelo associado ao lote não encontrado.');
      await exportBatchPDF(plates, model, (p) => setExportMessage(p.message));
    } catch (err: any) {
      alert('Erro ao exportar PDF: ' + (err?.message || err));
    } finally {
      setExportingId(null);
      setExportMessage('');
    }
  };

  const handleDownloadZIP = async (batch: Batch) => {
    setExportingId(batch.id + '-zip');
    setExportMessage(`Compactando ZIP de ${batch.batchCode}...`);
    try {
      const [plates, model] = await Promise.all([
        getPlatesByBatchId(batch.id),
        getPlateModelById(batch.modelId),
      ]);
      if (!model) throw new Error('Modelo associado ao lote não encontrado.');
      await exportBatchZIP(plates, model, (p) => setExportMessage(p.message));
    } catch (err: any) {
      alert('Erro ao exportar ZIP: ' + (err?.message || err));
    } finally {
      setExportingId(null);
      setExportMessage('');
    }
  };

  const filteredBatches = batches.filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.batchCode.toLowerCase().includes(term) ||
      b.modelName.toLowerCase().includes(term) ||
      b.startPlateNumber.toLowerCase().includes(term) ||
      b.endPlateNumber.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Meus Lotes de Plaquinhas
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Histórico completo de ordens de produção, downloads de PDF A4 para corte e pacotes ZIP.
          </p>
        </div>

        <Link
          to="/gerar-lote"
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_12px_rgba(220,38,38,0.35)] transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>NOVO LOTE</span>
        </Link>
      </div>

      {exportMessage && (
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-center gap-2 shadow-lg">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Search Filter */}
      {batches.length > 0 && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por código do lote, modelo ou numeração..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-zinc-500 text-sm">Carregando seus lotes...</div>
      ) : filteredBatches.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhum lote encontrado</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'Nenhum resultado corresponde à sua pesquisa.'
              : 'Você ainda não gerou lotes de plaquinhas. Comece agora para alimentar sua linha de produção.'}
          </p>
          {!searchTerm && (
            <Link
              to="/gerar-lote"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-[0_4px_12px_rgba(220,38,38,0.35)] transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              GERAR PRIMEIRO LOTE
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className="bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-white text-base tracking-tight">
                    {batch.batchCode}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px] font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    CONCLUÍDO
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-zinc-200 line-clamp-1">{batch.modelName}</h4>
                  <div className="text-xs font-mono text-zinc-400 mt-0.5">
                    {batch.startPlateNumber} <span className="text-zinc-600">→</span> {batch.endPlateNumber}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-900 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Quantidade</span>
                    <span className="font-bold text-white font-mono">{batch.quantity} un</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Data de Criação</span>
                    <span>{new Date(batch.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-zinc-900 space-y-2">
                <Link
                  to={`/lotes/${batch.id}`}
                  className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 border border-zinc-800 transition-colors"
                >
                  <span>VISUALIZAR PLAQUINHAS</span>
                  <ArrowRight className="w-3.5 h-3.5 text-red-500" />
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownloadPDF(batch)}
                    disabled={exportingId === batch.id + '-pdf'}
                    className="py-2 px-2.5 rounded-xl bg-red-950/40 hover:bg-red-950/70 border border-red-800/50 text-red-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>PDF A4 (10x10)</span>
                  </button>

                  <button
                    onClick={() => handleDownloadZIP(batch)}
                    disabled={exportingId === batch.id + '-zip'}
                    className="py-2 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>BAIXAR ZIP</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
