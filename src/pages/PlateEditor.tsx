import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { getPlateById, updatePlate } from '../services/plateService';
import { getPlateModelById } from '../services/modelService';
import { downloadSinglePlatePNG } from '../services/exportService';
import { composePlateImage } from '../services/imageComposer';
import { Plate, PlateModel } from '../types';

export const PlateEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plate, setPlate] = useState<Plate | null>(null);
  const [model, setModel] = useState<PlateModel | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');

  const [composedPreviewUrl, setComposedPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const found = await getPlateById(id);
        if (!found) {
          setErrorMessage('Plaquinha não encontrada.');
          setLoading(false);
          return;
        }

        setPlate(found);
        setCustomerName(found.customerName || '');
        setTargetUrl(found.targetUrl || '');

        const modelData = await getPlateModelById(found.modelId);
        setModel(modelData);

        if (modelData) {
          const comp = await composePlateImage(
            modelData.imageUrl,
            found.qrPlacement,
            found.publicUrl,
            found.plateNumber
          );
          setComposedPreviewUrl(comp.dataUrl);
        }
      } catch (err: any) {
        setErrorMessage('Erro ao carregar dados: ' + (err?.message || err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let cleanUrl = targetUrl.trim();
      if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('WIFI:') && !cleanUrl.startsWith('tel:')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const updated = await updatePlate(plate.id, {
        customerName: customerName.trim(),
        targetUrl: cleanUrl,
        status: cleanUrl ? 'active' : 'pending',
      });

      setPlate(updated);
      setTargetUrl(updated.targetUrl);
      setSuccessMessage('Salvo com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!plate || !model) return;
    setDownloading(true);
    try {
      await downloadSinglePlatePNG(plate, model);
    } catch (err: any) {
      alert('Erro ao baixar: ' + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-zinc-500 text-xs">Carregando plaquinha...</div>;
  }

  if (!plate) {
    return (
      <div className="py-12 max-w-md mx-auto text-center space-y-3">
        <p className="text-sm text-zinc-400">Plaquinha não encontrada.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-zinc-800 rounded-xl text-xs font-semibold"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header with Back button */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white font-mono">{plate.plateNumber}</h1>
            <p className="text-xs text-zinc-400">Edição de destino e dados do cliente</p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="py-2 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-800 transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>BAIXAR PNG</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Plate exact preview & Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        {/* Exact preview */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <span className="text-[10px] uppercase font-bold text-zinc-500 block">Prévia da Plaquinha</span>
          <div className="aspect-square w-full bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
            {composedPreviewUrl ? (
              <img
                src={composedPreviewUrl}
                alt={plate.plateNumber}
                className="w-full h-full object-cover"
              />
            ) : model ? (
              <img
                src={model.imageUrl}
                alt={plate.plateNumber}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <span className="text-[10px] text-zinc-500 font-mono text-center block">
            {plate.publicUrl}
          </span>
        </div>

        {/* Clean Form */}
        <form onSubmit={handleSave} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: Restaurante Sabor"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Link de Destino
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="Ex: https://instagram.com/perfil"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Pode ser alterado a qualquer momento sem trocar a plaquinha física.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_12px_rgba(220,38,38,0.4)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'SALVANDO...' : 'SALVAR'}</span>
          </button>

          <a
            href={plate.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-red-500" />
            <span>Testar Redirecionamento</span>
          </a>
        </form>
      </div>
    </div>
  );
};
