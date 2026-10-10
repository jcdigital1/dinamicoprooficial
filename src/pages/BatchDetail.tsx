import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileDown,
  Archive,
  ExternalLink,
  Edit3,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { getPlatesByBatchId, getPlateById } from '../services/plateService';
import { getPlateModelById } from '../services/modelService';
import { downloadSinglePlatePNG, exportBatchPDF, exportBatchZIP } from '../services/exportService';
import { composePlateImage, releaseComposeResult, ComposeResult } from '../services/imageComposer';
import { Plate, PlateModel } from '../types';

// Modal that on-demand composes and displays the full plate artwork with dynamic QR code
const PlateInspectModal: React.FC<{
  plate: Plate;
  model: PlateModel;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}> = ({ plate, model, onClose, onDownload, downloading }) => {
  const [composed, setComposed] = useState<ComposeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let localResult: ComposeResult | null = null;

    async function generatePreview() {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch fresh plate data if available
        const freshPlate = (await getPlateById(plate.id)) || plate;
        // 2 & 3 & 4. Load art, generate QR Code and composite in memory
        const res = await composePlateImage(
          model.imageUrl,
          freshPlate.qrPlacement,
          freshPlate.publicUrl,
          freshPlate.plateNumber,
          { forceFresh: true, targetWidth: 1000 }
        );
        localResult = res;
        if (isMounted) {
          setComposed(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setError('Falha ao compor visualização da plaquinha: ' + (err?.message || err));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    generatePreview();

    return () => {
      isMounted = false;
      // Free canvas memory when modal closes
      if (localResult) {
        releaseComposeResult(localResult);
      }
    };
  }, [plate, model]);

  const handleCopy = () => {
    navigator.clipboard.writeText(plate.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-600/50 flex items-center justify-center text-red-500 font-mono font-bold text-xs">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white font-mono">{plate.plateNumber}</h3>
                {plate.targetUrl ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-700/80 text-emerald-400 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    ATIVA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/90 border border-amber-700/80 text-amber-400 text-[10px] font-bold">
                    <Clock className="w-3 h-3" />
                    PENDENTE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">Composição real em memória · 10x10cm</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="aspect-square w-full rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-3">
              <span className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin text-red-500" />
              <p className="text-xs text-zinc-400 font-mono">Gerando composição sob demanda...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-400 text-xs bg-red-950/40 rounded-2xl border border-red-800/40">
              {error}
            </div>
          ) : composed ? (
            <div className="relative aspect-square w-full rounded-2xl bg-zinc-900 overflow-hidden border border-zinc-800/80 shadow-inner group">
              <img
                src={composed.dataUrl}
                alt={plate.plateNumber}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-zinc-800 text-[10px] font-mono text-zinc-300">
                Substituição calibrada 100% precisa
              </div>
            </div>
          ) : null}

          {/* Details */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-medium">Link Dinâmico (permanente):</span>
              <div className="flex items-center gap-1.5 font-mono text-zinc-300">
                <span className="truncate max-w-[200px] sm:max-w-[260px]">{plate.publicUrl}</span>
                <button
                  onClick={handleCopy}
                  className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                  title="Copiar URL"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800/60 pt-2">
              <span className="text-zinc-500 font-medium">Destino atual:</span>
              <span className="font-mono text-zinc-200 truncate max-w-[220px]">
                {plate.targetUrl ? (
                  <a href={plate.targetUrl} target="_blank" rel="noreferrer" className="text-red-400 hover:underline">
                    {plate.targetUrl}
                  </a>
                ) : (
                  <span className="italic text-zinc-500">Aguardando configuração</span>
                )}
              </span>
            </div>

            {plate.customerName && (
              <div className="flex items-center justify-between border-t border-zinc-800/60 pt-2">
                <span className="text-zinc-500 font-medium">Cliente:</span>
                <span className="text-white font-semibold">{plate.customerName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-end gap-2">
          <a
            href={plate.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="py-2.5 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-800 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            <span>Testar Redirecionamento</span>
          </a>

          <Link
            to={`/placas/${plate.id}/editar`}
            className="py-2.5 px-3.5 rounded-xl bg-red-950/40 hover:bg-red-950/70 text-red-300 border border-red-800/50 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar Destino</span>
          </Link>

          <button
            onClick={onDownload}
            disabled={downloading}
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_12px_rgba(220,38,38,0.4)] transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'BAIXANDO...' : 'BAIXAR PNG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Lightweight Card that displays model art and triggers on-demand composition on VER or BAIXAR
const PlateCard: React.FC<{
  plate: Plate;
  model: PlateModel;
  onView: () => void;
  onDownload: () => void;
  onCopy: () => void;
  copied: boolean;
  downloading: boolean;
}> = ({ plate, model, onView, onDownload, onCopy, copied, downloading }) => {
  const isConfigured = !!plate.targetUrl && plate.status === 'active';

  return (
    <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all shadow-md">
      {/* Base Artwork preview */}
      <div className="relative aspect-square w-full bg-zinc-900 overflow-hidden group cursor-pointer" onClick={onView}>
        <img
          src={model.imageUrl}
          alt={plate.plateNumber}
          crossOrigin="anonymous"
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
        />

        {/* Plate Number Badge */}
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-zinc-700/60 text-white font-mono font-bold text-xs shadow-md">
          {plate.plateNumber}
        </div>

        {/* Status Badge */}
        <div className="absolute top-2.5 right-2.5">
          {isConfigured ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-700/80 text-emerald-400 text-[10px] font-bold backdrop-blur-md">
              <CheckCircle2 className="w-3 h-3" />
              ATIVA
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/90 border border-amber-700/80 text-amber-400 text-[10px] font-bold backdrop-blur-md">
              <Clock className="w-3 h-3" />
              PENDENTE
            </span>
          )}
        </div>

        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-zinc-300">
          {plate.clicksCount || 0} scans
        </div>
      </div>

      {/* Metadata */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="text-xs text-zinc-400">
            <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Cliente</span>
            <span className="text-white font-semibold truncate block">
              {plate.customerName || <span className="italic text-zinc-500">Não informado</span>}
            </span>
          </div>

          <div className="text-xs text-zinc-400">
            <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Destino</span>
            {plate.targetUrl ? (
              <a
                href={plate.targetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-red-400 hover:underline truncate block font-mono text-[11px]"
              >
                {plate.targetUrl}
              </a>
            ) : (
              <span className="italic text-amber-500/90 text-[11px] block">Aguardando configuração</span>
            )}
          </div>

          {/* Public Link Box */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2 flex items-center justify-between gap-1 text-[11px]">
            <span className="font-mono text-zinc-400 truncate">{plate.publicUrl}</span>
            <button
              onClick={onCopy}
              className="p-1 rounded text-zinc-400 hover:text-white transition-colors shrink-0"
              title="Copiar URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Action Buttons: VER, EDITAR, BAIXAR */}
        <div className="pt-3 border-t border-zinc-900 grid grid-cols-3 gap-1.5">
          <button
            onClick={onView}
            className="py-2 px-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-[11px] flex items-center justify-center gap-1 border border-zinc-800 transition-colors"
          >
            <Eye className="w-3 h-3 text-red-500" />
            <span>VER</span>
          </button>

          <Link
            to={`/placas/${plate.id}/editar`}
            className="py-2 px-1 rounded-xl bg-red-950/40 hover:bg-red-950/70 text-red-300 border border-red-800/50 font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            <span>EDITAR</span>
          </Link>

          <button
            onClick={onDownload}
            disabled={downloading}
            className="py-2 px-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-[11px] flex items-center justify-center gap-1 border border-zinc-800 transition-colors disabled:opacity-50"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span>BAIXAR</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const BatchDetail: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const [plates, setPlates] = useState<Plate[]>([]);
  const [model, setModel] = useState<PlateModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inspectPlate, setInspectPlate] = useState<Plate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingZIP, setExportingZIP] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  useEffect(() => {
    async function load() {
      if (!batchId) return;
      try {
        const batchPlates = await getPlatesByBatchId(batchId);
        setPlates(batchPlates);

        if (batchPlates.length > 0) {
          const modelData = await getPlateModelById(batchPlates[0].modelId);
          setModel(modelData);
        }
      } catch (err: any) {
        setError('Erro ao carregar plaquinhas do lote.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [batchId]);

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadPlate = async (plate: Plate) => {
    if (!model) return;
    setDownloadingId(plate.id);
    try {
      await downloadSinglePlatePNG(plate, model);
    } catch (err: any) {
      alert('Erro ao baixar plaquinha: ' + (err?.message || err));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!model || plates.length === 0) return;
    setExportingPDF(true);
    setExportMessage('Gerando PDF A4 sob demanda (10x10cm)...');
    try {
      await exportBatchPDF(plates, model, (p) => setExportMessage(p.message));
    } catch (err: any) {
      alert('Erro ao exportar PDF: ' + (err?.message || err));
    } finally {
      setExportingPDF(false);
      setExportMessage('');
    }
  };

  const handleDownloadZIP = async () => {
    if (!model || plates.length === 0) return;
    setExportingZIP(true);
    setExportMessage('Gerando pacote ZIP sob demanda na memória...');
    try {
      await exportBatchZIP(plates, model, (p) => setExportMessage(p.message));
    } catch (err: any) {
      alert('Erro ao exportar ZIP: ' + (err?.message || err));
    } finally {
      setExportingZIP(false);
      setExportMessage('');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-zinc-500 text-xs">
        Carregando plaquinhas do lote...
      </div>
    );
  }

  if (error || plates.length === 0) {
    return (
      <div className="py-12 max-w-md mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-red-500">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-white">Lote não encontrado</h3>
        <Link
          to="/meus-lotes"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Meus Lotes
        </Link>
      </div>
    );
  }

  const first = plates[0];
  const last = plates[plates.length - 1];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/meus-lotes')}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-white text-xl">{batchId}</span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 text-[11px] font-mono">
                {plates.length} un ({first?.plateNumber} a {last?.plateNumber})
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Modelo: <span className="text-zinc-200">{model?.name}</span> · 10x10cm
            </p>
          </div>
        </div>

        {/* Global Batch Actions: Baixar PDF / Baixar ZIP */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={exportingPDF}
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_12px_rgba(220,38,38,0.35)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{exportingPDF ? 'GERANDO...' : 'BAIXAR PDF A4 (10x10cm)'}</span>
          </button>

          <button
            onClick={handleDownloadZIP}
            disabled={exportingZIP}
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Archive className="w-4 h-4 text-red-500" />
            <span>{exportingZIP ? 'COMPACTANDO...' : 'BAIXAR ZIP'}</span>
          </button>
        </div>
      </div>

      {exportMessage && (
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-center gap-2 shadow-lg">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Plates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {plates.map((plate) => (
          <PlateCard
            key={plate.id}
            plate={plate}
            model={model!}
            onView={() => setInspectPlate(plate)}
            onDownload={() => handleDownloadPlate(plate)}
            onCopy={() => handleCopyLink(plate.publicUrl, plate.id)}
            copied={copiedId === plate.id}
            downloading={downloadingId === plate.id}
          />
        ))}
      </div>

      {/* On-Demand Plate Inspect Modal */}
      {inspectPlate && model && (
        <PlateInspectModal
          plate={inspectPlate}
          model={model}
          onClose={() => setInspectPlate(null)}
          onDownload={() => handleDownloadPlate(inspectPlate)}
          downloading={downloadingId === inspectPlate.id}
        />
      )}
    </div>
  );
};
