import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  FileDown,
  Archive,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../firebase/authContext';
import { getPlateModels } from '../services/modelService';
import { createBatchWithPlates } from '../services/plateService';
import { exportBatchPDF, exportBatchZIP } from '../services/exportService';
import { Batch, Plate, PlateModel } from '../types';

export const GenerateBatch: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [models, setModels] = useState<PlateModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<PlateModel | null>(null);
  const [quantity, setQuantity] = useState<number>(10);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);

  // Progress and results
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [completedResult, setCompletedResult] = useState<{ batch: Batch; plates: Plate[] } | null>(null);
  const [exportingPDF, setExportingPDF] = useState<boolean>(false);
  const [exportingZIP, setExportingZIP] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const list = await getPlateModels();
        setModels(list);
        if (list.length > 0) {
          setSelectedModel(list[0]);
        }
      } catch (err: any) {
        setError('Falha ao carregar catálogo de modelos.');
      } finally {
        setLoadingModels(false);
      }
    }
    load();
  }, []);

  const handleGenerate = async () => {
    if (!selectedModel || !user) return;
    if (quantity < 1 || quantity > 100) {
      setError('A quantidade deve ser entre 1 e 100 plaquinhas.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setCompletedResult(null);

    try {
      const result = await createBatchWithPlates({
        model: selectedModel,
        quantity,
        userId: user.uid,
        onProgress: (p) => setProgressMsg(p.message),
      });

      setCompletedResult(result);
    } catch (err: any) {
      console.error('Batch generation error:', err);
      setError(err?.message || 'Falha ao processar lote. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!completedResult || !selectedModel) return;
    setExportingPDF(true);
    setExportStatus('Montando PDF A4 de 10x10cm...');
    try {
      await exportBatchPDF(completedResult.plates, selectedModel, (p) => setExportStatus(p.message));
    } catch (err: any) {
      alert('Erro ao exportar PDF: ' + (err?.message || err));
    } finally {
      setExportingPDF(false);
      setExportStatus('');
    }
  };

  const handleDownloadZIP = async () => {
    if (!completedResult || !selectedModel) return;
    setExportingZIP(true);
    setExportStatus('Compactando imagens individuais em alta resolução...');
    try {
      await exportBatchZIP(completedResult.plates, selectedModel, (p) => setExportStatus(p.message));
    } catch (err: any) {
      alert('Erro ao exportar ZIP: ' + (err?.message || err));
    } finally {
      setExportingZIP(false);
      setExportStatus('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Simple Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-black text-white tracking-tight">Gerar Lote de Plaquinhas</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Escolha o modelo, defina a quantidade e o sistema gera o lote com QR Codes dinâmicos exclusivos.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Completed Success Result */}
      {completedResult ? (
        <div className="bg-zinc-950 border border-emerald-500/50 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-600/60 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{completedResult.batch.batchCode} Gerado!</h2>
              <p className="text-xs text-zinc-300 mt-0.5">
                {completedResult.plates.length} plaquinhas criadas ({completedResult.batch.startPlateNumber} a {completedResult.batch.endPlateNumber})
              </p>
            </div>
          </div>

          {exportStatus && (
            <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
              <span>{exportStatus}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={handleDownloadPDF}
              disabled={exportingPDF}
              className="py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_12px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>{exportingPDF ? 'GERANDO...' : 'BAIXAR PDF A4 (10x10cm)'}</span>
            </button>

            <button
              onClick={handleDownloadZIP}
              disabled={exportingZIP}
              className="py-3 px-4 rounded-xl text-xs font-bold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Archive className="w-4 h-4 text-red-500" />
              <span>{exportingZIP ? 'COMPACTANDO...' : 'BAIXAR PACOTE ZIP'}</span>
            </button>

            <button
              onClick={() => navigate(`/lotes/${completedResult.batch.id}`)}
              className="py-3 px-4 rounded-xl text-xs font-bold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all flex items-center justify-center gap-2"
            >
              <span>VER PLAQUINHAS</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          <div className="pt-3 border-t border-zinc-900 flex justify-end">
            <button
              onClick={() => setCompletedResult(null)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Gerar outro lote</span>
            </button>
          </div>
        </div>
      ) : isGenerating ? (
        /* Progress feedback */
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <span className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin inline-block text-red-500" />
          <h3 className="text-base font-bold text-white">Fabricando Lote...</h3>
          <p className="text-xs text-zinc-400 font-mono">{progressMsg || 'Processando...'}</p>
        </div>
      ) : (
        /* Simple 3-step interface requested by user */
        <div className="space-y-6">
          {/* 1. Escolher modelo */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              1. Escolha o Modelo
            </label>

            {loadingModels ? (
              <div className="py-12 text-center text-zinc-500 text-xs">Carregando modelos...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {models.map((model) => {
                  const isSelected = selectedModel?.id === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => setSelectedModel(model)}
                      className={`relative bg-zinc-950 rounded-xl border cursor-pointer overflow-hidden transition-all aspect-square ${
                        isSelected
                          ? 'border-red-600 ring-2 ring-red-600/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="w-full h-full bg-zinc-900 relative overflow-hidden">
                        <img
                          src={model.imageUrl}
                          alt={model.name}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Informar quantidade */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              2. Quantidade de Plaquinhas
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {[4, 10, 20, 50, 100].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuantity(num)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                    quantity === num
                      ? 'bg-red-600 text-white shadow-[0_2px_8px_rgba(220,38,38,0.4)]'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {num} un
                </button>
              ))}

              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-zinc-400">Outra:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white text-center focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">
              Total estimado: {Math.ceil(quantity / 4)} folha(s) A4 (4 plaquinhas 10x10cm por folha).
            </p>
          </div>

          {/* 3. Clicar em Gerar Lote */}
          <button
            onClick={handleGenerate}
            disabled={!selectedModel || isGenerating}
            className="w-full py-4 px-6 rounded-xl text-sm font-black text-white bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_16px_rgba(220,38,38,0.45)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>GERAR LOTE ({quantity} PLAQUINHAS)</span>
          </button>
        </div>
      )}
    </div>
  );
};
