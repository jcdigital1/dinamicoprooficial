import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sliders,
  CheckCircle2,
  PlusCircle,
  QrCode,
  ArrowRight,
  Filter,
  Sparkles,
} from 'lucide-react';
import { getPlateModels } from '../services/modelService';
import { PlateModel } from '../types';

export const ModelsCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<PlateModel[]>([]);
  const [category, setCategory] = useState<string>('todos');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await getPlateModels();
        setModels(list);
      } catch (e) {
        console.error('Error loading models:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'wifi', label: 'Wi-Fi' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'google', label: 'Google Avaliação' },
    { id: 'pix', label: 'Pix' },
    { id: 'whatsapp', label: 'WhatsApp' },
  ];

  const filtered = models.filter((m) => {
    if (category === 'todos') return true;
    return m.category === category;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Catálogo de Modelos & Calibração
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            As 8 artes oficiais prontas para corte 10x10cm com coordenadas milimétricas para substituição do QR Code fictício.
          </p>
        </div>

        <Link
          to="/gerar-lote"
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_12px_rgba(220,38,38,0.35)] transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>GERAR LOTE</span>
        </Link>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              category === c.id
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-900'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-sm">Carregando artes oficiais...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((model) => (
            <div
              key={model.id}
              className="bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 rounded-2xl overflow-hidden flex flex-col justify-between transition-all shadow-lg group"
            >
              {/* Image Preview with Aspect Ratio preserved */}
              <div className="relative aspect-square w-full bg-zinc-900 overflow-hidden">
                <img
                  src={model.imageUrl}
                  alt={model.name}
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />

                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                  {model.category}
                </div>

                <div className="absolute top-2.5 right-2.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-700/80 text-emerald-400 text-[10px] font-bold backdrop-blur-md">
                    <CheckCircle2 className="w-3 h-3" />
                    CALIBRADO
                  </span>
                </div>
              </div>

              {/* Model details */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">{model.name}</h3>
                  <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                    Posição QR: X {Math.round(model.qrPlacement.x * 100)}% · Y {Math.round(model.qrPlacement.y * 100)}% · Tam {Math.round(model.qrPlacement.size * 100)}%
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-900 space-y-2">
                  <Link
                    to={`/calibrar/${model.id}`}
                    className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Sliders className="w-3.5 h-3.5 text-red-500" />
                    <span>AJUSTAR QR CODE</span>
                  </Link>

                  <Link
                    to="/gerar-lote"
                    className="w-full py-2 px-3 rounded-xl bg-red-950/30 hover:bg-red-950/60 text-red-300 border border-red-800/40 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>SELECIONAR</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
