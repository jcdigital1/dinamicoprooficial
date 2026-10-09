import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sliders,
  Scan,
  Maximize2,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Move,
  RotateCcw,
} from 'lucide-react';
import { getPlateModelById, saveModelCalibration } from '../services/modelService';
import { detectQRCodeInImage } from '../services/qrDetector';
import { PlateModel, QRPlacement } from '../types';

export const QrCalibrator: React.FC = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();

  const [model, setModel] = useState<PlateModel | null>(null);
  const [placement, setPlacement] = useState<QRPlacement>({ x: 0.32, y: 0.50, size: 0.35 });
  const [loading, setLoading] = useState<boolean>(true);
  const [detecting, setDetecting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drag interaction state
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  useEffect(() => {
    async function load() {
      if (!modelId) return;
      try {
        const found = await getPlateModelById(modelId);
        if (found) {
          setModel(found);
          setPlacement(found.qrPlacement);
        } else {
          setErrorMessage('Modelo não encontrado.');
        }
      } catch (err: any) {
        setErrorMessage('Erro ao carregar modelo: ' + (err?.message || err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [modelId]);

  // Touch and mouse drag handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: placement.x,
      initialY: placement.y,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = (clientX - dragStartRef.current.startX) / rect.width;
    const deltaY = (clientY - dragStartRef.current.startY) / rect.height;

    let newX = dragStartRef.current.initialX + deltaX;
    let newY = dragStartRef.current.initialY + deltaY;

    // Bounds checking
    newX = Math.max(0, Math.min(1 - placement.size, newX));
    newY = Math.max(0, Math.min(1 - placement.size, newY));

    setPlacement((prev) => ({
      ...prev,
      x: Number(newX.toFixed(4)),
      y: Number(newY.toFixed(4)),
    }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Run automatic detection via jsQR
  const handleAutoDetect = async () => {
    if (!model) return;
    setDetecting(true);
    setInfoMessage('Analisando pixels da arte com scanner óptico...');
    setErrorMessage(null);

    try {
      const result = await detectQRCodeInImage(model.imageUrl);
      if (result.detected && result.placement) {
        setPlacement(result.placement);
        setInfoMessage('QR Code fictício detectado com precisão e ajustado automaticamente!');
      } else {
        setErrorMessage(
          result.message || 'QR Code não detectado automaticamente. Ajuste manualmente pelas alças e controles.'
        );
      }
    } catch (e: any) {
      setErrorMessage('Falha na detecção: ' + (e?.message || e));
    } finally {
      setDetecting(false);
    }
  };

  const handleCenterHorizontal = () => {
    const newX = (1 - placement.size) / 2;
    setPlacement((prev) => ({
      ...prev,
      x: Number(newX.toFixed(4)),
    }));
  };

  const handleSizeChange = (newSize: number) => {
    const size = Math.max(0.1, Math.min(0.8, Number(newSize.toFixed(4))));
    setPlacement((prev) => ({
      ...prev,
      size,
      x: Math.min(prev.x, 1 - size),
      y: Math.min(prev.y, 1 - size),
    }));
  };

  const handleSave = async () => {
    if (!model) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await saveModelCalibration(model.id, placement);
      setSuccessMessage('Calibração salva com sucesso no Firestore! Esta posição será reutilizada em todos os novos lotes.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      setErrorMessage('Erro ao salvar calibração: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-zinc-500 text-sm">
        Carregando arte e ambiente de calibração...
      </div>
    );
  }

  if (!model) {
    return (
      <div className="py-12 text-center text-zinc-400">
        <p>Modelo não encontrado.</p>
        <button
          onClick={() => navigate('/modelos')}
          className="mt-3 px-4 py-2 bg-zinc-800 rounded-xl text-xs font-semibold"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/modelos')}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Ajustar QR Code: <span className="text-red-500">{model.name}</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Posicionamento milimétrico individual. Arraste a caixa vermelha ou use os controles de precisão.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="py-2.5 px-5 rounded-xl bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-[0_4px_14px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto disabled:opacity-50"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>SALVAR CALIBRAÇÃO</span>
            </>
          )}
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 text-xs flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {infoMessage && (
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs flex items-center gap-3 shadow-lg">
          <Sparkles className="w-4 h-4 text-red-400 shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Interactive Canvas/Viewport (2 Cols on Desktop) */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-zinc-900">
            <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
              <Move className="w-4 h-4 text-red-500" />
              Área de Visualização e Ajuste Direto
            </span>
            <span className="text-[11px] font-mono text-zinc-500">Toque ou arraste com mouse</span>
          </div>

          {/* Interactive Artwork Box */}
          <div
            ref={containerRef}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseUp={handlePointerUp}
            onTouchMove={(e) => {
              if (e.touches.length > 0) {
                handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchEnd={handlePointerUp}
            className="relative aspect-square w-full max-w-lg mx-auto bg-black rounded-xl overflow-hidden border border-zinc-800 select-none touch-none shadow-inner"
          >
            {/* Base Artwork Image */}
            <img
              src={model.imageUrl}
              alt={model.name}
              crossOrigin="anonymous"
              draggable={false}
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Draggable Red QR Code Target Box */}
            <div
              style={{
                left: `${placement.x * 100}%`,
                top: `${placement.y * 100}%`,
                width: `${placement.size * 100}%`,
                height: `${placement.size * 100}%`,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handlePointerDown(e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                if (e.touches.length > 0) {
                  handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              className={`absolute cursor-move border-2 border-red-500 bg-red-600/20 backdrop-blur-[1px] flex flex-col items-center justify-center transition-shadow shadow-[0_0_15px_rgba(239,68,68,0.5)] ${
                isDragging ? 'ring-2 ring-white scale-102' : ''
              }`}
            >
              {/* Center Crosshair and Label */}
              <div className="w-full h-full flex flex-col items-center justify-center p-1 pointer-events-none text-center">
                <div className="w-4 h-4 border border-white/80 rounded-sm mb-1 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-sm" />
                </div>
                <span className="text-[10px] font-bold text-white font-mono bg-black/75 px-1.5 py-0.5 rounded">
                  QR NOVO
                </span>
                <span className="text-[9px] font-mono text-zinc-300">
                  {Math.round(placement.size * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Precision Controls & Tools (1 Col) */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-red-500" />
              Controles de Calibração
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Refinamento numérico e ferramentas automáticas
            </p>
          </div>

          {/* Quick AI/Scan Auto Detection */}
          <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Scan className="w-4 h-4 text-red-500" />
              Detecção Inteligente do Fictício
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Escaneia os padrões de busca do QR original e alinha automaticamente.
            </p>
            <button
              onClick={handleAutoDetect}
              disabled={detecting}
              className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {detecting ? (
                <span className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Scan className="w-3.5 h-3.5 text-red-400" />
                  <span>EXECUTAR DETECÇÃO AUTOMÁTICA</span>
                </>
              )}
            </button>
          </div>

          {/* Alignment Tools */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">Alinhamento Rápido</label>
            <button
              onClick={handleCenterHorizontal}
              className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-3.5 h-3.5 text-red-500" />
              Centralizar Horizontalmente
            </button>
          </div>

          {/* Size Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">Tamanho do QR Code</span>
              <span className="font-mono text-red-400 font-bold">{Math.round(placement.size * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.60"
              step="0.01"
              value={placement.size}
              onChange={(e) => handleSizeChange(parseFloat(e.target.value))}
              className="w-full accent-red-600 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>15%</span>
              <span>60%</span>
            </div>
          </div>

          {/* Fine Tuning Offsets */}
          <div className="space-y-3 pt-2 border-t border-zinc-900">
            <div className="text-xs font-semibold text-zinc-400">Ajuste Fino de Posição</div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[11px] text-zinc-500 block mb-1">Posição X (Horizontal)</span>
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                  <button
                    onClick={() =>
                      setPlacement((p) => ({ ...p, x: Math.max(0, Number((p.x - 0.005).toFixed(4))) }))
                    }
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 font-mono text-xs"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-mono text-white text-xs">{placement.x.toFixed(4)}</span>
                  <button
                    onClick={() =>
                      setPlacement((p) => ({
                        ...p,
                        x: Math.min(1 - p.size, Number((p.x + 0.005).toFixed(4))),
                      }))
                    }
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 font-mono text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-zinc-500 block mb-1">Posição Y (Vertical)</span>
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                  <button
                    onClick={() =>
                      setPlacement((p) => ({ ...p, y: Math.max(0, Number((p.y - 0.005).toFixed(4))) }))
                    }
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 font-mono text-xs"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-mono text-white text-xs">{placement.y.toFixed(4)}</span>
                  <button
                    onClick={() =>
                      setPlacement((p) => ({
                        ...p,
                        y: Math.min(1 - p.size, Number((p.y + 0.005).toFixed(4))),
                      }))
                    }
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 font-mono text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* JSON Structure Preview as requested */}
          <div className="pt-2">
            <span className="text-[10px] text-zinc-500 font-mono block mb-1">Estrutura Normalizada (Firestore):</span>
            <div className="p-2.5 rounded-lg bg-black border border-zinc-900 text-[10px] font-mono text-zinc-400 overflow-x-auto">
              {JSON.stringify(
                {
                  modelId: model.id,
                  qrPlacement: {
                    x: placement.x,
                    y: placement.y,
                    size: placement.size,
                  },
                },
                null,
                2
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
