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
} from 'lucide-react';
import { getPlatesByBatchId } from '../services/plateService';
import { getPlateModelById } from '../services/modelService';
import { downloadSinglePlatePNG, exportBatchPDF, exportBatchZIP } from '../services/exportService';
import { composePlateImage } from '../services/imageComposer';
import { Plate, PlateModel } from '../types';

// Component that renders the EXACT composed artwork with the replaced dynamic QR code
const PlatePreviewCard: React.FC<{
  plate: Plate;
  model: PlateModel;
  onDownload: () => void;
  onCopy: () => void;
  copied: boolean;
  downloading: boolean;
}> = ({ plate, model, onDownload, onCopy, copied, downloading }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    composePlateImage(model.imageUrl, plate.qrPlacement, plate.publicUrl, plate.plateNumber)
      .then((res) => {
        if (active) setPreviewUrl(res.dataUrl);
      })
      .catch(() => {
        if (active) setPreviewUrl(model.imageUrl);
      });
    return () => {
      active = false;
    };
  }, [model, plate]);

  const isConfigured = !!plate.targetUrl && plate.status === 'active';

  return (
    <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all shadow-md">
      {/* Artwork with the EXACT replaced QR Code (same as PDF and PNG!) */}
      <div className="relative aspect-square w-full bg-zinc-900 overflow-hidden">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={plate.plateNumber}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
            Renderizando QR dinâmico...
          </div>
        )}

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
          <a
            href={plate.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="py-2 px-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-[11px] flex items-center justify-center gap-1 border border-zinc-800 transition-colors"
          >
            <ExternalLink className="w-3 h-3 text-red-500" />
            <span>VER</span>
          </a>

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
    setExportMessage('Gerando PDF A4 de 10x10cm...');
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
    setExportMessage('Compactando arquivos ZIP...');
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
          <PlatePreviewCard
            key={plate.id}
            plate={plate}
            model={model!}
            onDownload={() => handleDownloadPlate(plate)}
            onCopy={() => handleCopyLink(plate.publicUrl, plate.id)}
            copied={copiedId === plate.id}
            downloading={downloadingId === plate.id}
          />
        ))}
      </div>
    </div>
  );
};
