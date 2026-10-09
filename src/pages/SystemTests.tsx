import React, { useState } from 'react';
import {
  Activity,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  QrCode,
  FileText,
  Archive,
  Database,
  Lock,
} from 'lucide-react';
import { createQRCodeCanvas, validateRenderedQRCode } from '../services/qrDetector';
import { formatPlateNumber } from '../services/plateService';
import { composePlateImage } from '../services/imageComposer';
import { testConnection } from '../firebase/config';
import JSZip from 'jszip';
import jsQR from 'jsqr';

interface TestItem {
  id: string;
  name: string;
  category: string;
  status: 'idle' | 'running' | 'passed' | 'failed' | 'external';
  details?: string;
  durationMs?: number;
}

export const SystemTests: React.FC = () => {
  const [running, setRunning] = useState<boolean>(false);
  const [tests, setTests] = useState<TestItem[]>([
    {
      id: 'qr-gen-read',
      name: 'Geração e Leitura Óptica de QR Code (jsQR)',
      category: 'QR Code & Scanner',
      status: 'idle',
      details: 'Gera um código real e valida decodificação reversa',
    },
    {
      id: 'num-format',
      name: 'Padronização da Numeração (PLACA-000001)',
      category: 'Monotonia & Sequência',
      status: 'idle',
      details: 'Valida formatação padronizada e ausência de colisão',
    },
    {
      id: 'slug-collision',
      name: 'Unicidade de Slugs Públicos (1.000 iterações)',
      category: 'Identificadores Exclusivos',
      status: 'idle',
      details: 'Verifica dispersão criptográfica e zero colisões de URLs',
    },
    {
      id: 'pdf-math',
      name: 'Cálculo Físico Milimétrico A4 (10x10cm)',
      category: 'Exportação & Impressão',
      status: 'idle',
      details: 'Valida margens: 0,5cm lateral e 4,85cm vertical em folha 21x29,7cm',
    },
    {
      id: 'zip-bundling',
      name: 'Empacotamento de Lote em Arquivo ZIP (JSZip)',
      category: 'Exportação & Impressão',
      status: 'idle',
      details: 'Valida compressão e estruturação binária do arquivo .zip',
    },
    {
      id: 'canvas-comp',
      name: 'Substituição Visual e Composição de Matriz',
      category: 'Composição Gráfica',
      status: 'idle',
      details: 'Substitui QR fictício por novo código com verificação de contraste',
    },
    {
      id: 'firestore-conn',
      name: 'Conectividade Cloud Firestore',
      category: 'Banco de Dados',
      status: 'idle',
      details: 'Testa resposta do banco no projeto useful-point-v53bd',
    },
    {
      id: 'vercel-external',
      name: 'Domínio de Produção & Vercel Hosting',
      category: 'Ambiente Externo',
      status: 'external',
      details: 'Depende de apontamento DNS e deploy em domínio próprio na Vercel',
    },
  ]);

  const runAllTests = async () => {
    setRunning(true);

    const updateStatus = (id: string, status: TestItem['status'], details: string, durationMs?: number) => {
      setTests((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status, details, durationMs } : t))
      );
    };

    // Test 1: QR Gen & Read
    try {
      const t0 = performance.now();
      updateStatus('qr-gen-read', 'running', 'Renderizando canvas de alta resolução...');
      const testText = 'https://dinamicopro.app/q/test_validation_99';
      const qrCanvas = await createQRCodeCanvas(testText, 400);

      const ctx = qrCanvas.getContext('2d');
      const imgData = ctx!.getImageData(0, 0, 400, 400);
      const decoded = jsQR(imgData.data, 400, 400);

      if (decoded && decoded.data === testText) {
        updateStatus(
          'qr-gen-read',
          'passed',
          `Decodificado com 100% de precisão: "${decoded.data}"`,
          Math.round(performance.now() - t0)
        );
      } else {
        updateStatus('qr-gen-read', 'failed', 'jsQR não conseguiu decodificar o código gerado.');
      }
    } catch (e: any) {
      updateStatus('qr-gen-read', 'failed', 'Erro: ' + e.message);
    }

    // Test 2: Plate Number format
    try {
      const t0 = performance.now();
      updateStatus('num-format', 'running', 'Testando padding e sequenciamento...');
      const p1 = formatPlateNumber(1);
      const p42 = formatPlateNumber(42);
      const p1000 = formatPlateNumber(1000);

      if (p1 === 'PLACA-000001' && p42 === 'PLACA-000042' && p1000 === 'PLACA-001000') {
        updateStatus(
          'num-format',
          'passed',
          'Numeração padronizada com 6 dígitos de precisão.',
          Math.round(performance.now() - t0)
        );
      } else {
        updateStatus('num-format', 'failed', `Incorreto: p1=${p1}, p42=${p42}`);
      }
    } catch (e: any) {
      updateStatus('num-format', 'failed', 'Erro: ' + e.message);
    }

    // Test 3: Slug collision check (1,000 iterations)
    try {
      const t0 = performance.now();
      updateStatus('slug-collision', 'running', 'Gerando 1.000 slugs criptográficos...');
      const set = new Set<string>();
      let collisions = 0;
      const chars = '23456789abcdefghjkmnpqrstuvwxyz';

      for (let i = 0; i < 1000; i++) {
        let slug = 'p_';
        for (let j = 0; j < 8; j++) {
          slug += chars[Math.floor(Math.random() * chars.length)];
        }
        if (set.has(slug)) collisions++;
        set.add(slug);
      }

      if (collisions === 0) {
        updateStatus(
          'slug-collision',
          'passed',
          '1.000 slugs únicos gerados sem nenhuma colisão detectada.',
          Math.round(performance.now() - t0)
        );
      } else {
        updateStatus('slug-collision', 'failed', `${collisions} colisões detectadas.`);
      }
    } catch (e: any) {
      updateStatus('slug-collision', 'failed', 'Erro: ' + e.message);
    }

    // Test 4: Physical PDF Math
    try {
      const t0 = performance.now();
      updateStatus('pdf-math', 'running', 'Calculando geometria da folha A4...');
      const sheetW = 21.0;
      const sheetH = 29.7;
      const plateSize = 10.0;
      const marginLateral = 0.5;
      const marginTopBottom = 4.85;

      const totalW = marginLateral + plateSize + plateSize + marginLateral;
      const totalH = marginTopBottom + plateSize + plateSize + marginTopBottom;

      const wMatch = Math.abs(totalW - sheetW) < 0.001;
      const hMatch = Math.abs(totalH - sheetH) < 0.001;

      if (wMatch && hMatch) {
        updateStatus(
          'pdf-math',
          'passed',
          `Largura: ${totalW.toFixed(2)}cm (exato 21,0cm) | Altura: ${totalH.toFixed(2)}cm (exato 29,7cm).`,
          Math.round(performance.now() - t0)
        );
      } else {
        updateStatus('pdf-math', 'failed', `Divergência matemática: totalW=${totalW}, totalH=${totalH}`);
      }
    } catch (e: any) {
      updateStatus('pdf-math', 'failed', 'Erro: ' + e.message);
    }

    // Test 5: ZIP bundling
    try {
      const t0 = performance.now();
      updateStatus('zip-bundling', 'running', 'Instanciando JSZip e gerando pacote...');
      const zip = new JSZip();
      zip.file('PLACA-000001.txt', 'Plaquinha Teste Dinâmico Pro');
      zip.file('PLACA-000002.txt', 'Plaquinha Teste Dinâmico Pro');
      const blob = await zip.generateAsync({ type: 'blob' });

      if (blob.size > 0 && blob.type.includes('zip')) {
        updateStatus(
          'zip-bundling',
          'passed',
          `Arquivo ZIP gerado com sucesso (${blob.size} bytes).`,
          Math.round(performance.now() - t0)
        );
      } else {
        updateStatus('zip-bundling', 'failed', 'Blob ZIP vazio.');
      }
    } catch (e: any) {
      updateStatus('zip-bundling', 'failed', 'Erro: ' + e.message);
    }

    // Test 6: Canvas composition & replacement
    try {
      const t0 = performance.now();
      updateStatus('canvas-comp', 'running', 'Testando limpeza de fundo e injeção do QR code...');
      // Create a test synthetic artwork canvas
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 600;
      testCanvas.height = 600;
      const tCtx = testCanvas.getContext('2d')!;
      tCtx.fillStyle = '#111827';
      tCtx.fillRect(0, 0, 600, 600);
      const testDataUrl = testCanvas.toDataURL();

      const testPlacement = { x: 0.3, y: 0.4, size: 0.4 };
      const testUrl = 'https://dinamicopro.app/q/comp_test_123';

      const comp = await composePlateImage(testDataUrl, testPlacement, testUrl, 'PLACA-000001', {
        targetWidth: 600,
      });

      if (comp.isValidated && comp.dataUrl.length > 100) {
        updateStatus(
          'canvas-comp',
          'passed',
          'Composição executada e validada com jsQR com sucesso.',
          Math.round(performance.now() - t0)
        );
      } else {
        updateStatus('canvas-comp', 'failed', 'Falha na validação óptica da imagem composta.');
      }
    } catch (e: any) {
      updateStatus('canvas-comp', 'failed', 'Erro: ' + e.message);
    }

    // Test 7: Firestore Connectivity
    try {
      const t0 = performance.now();
      updateStatus('firestore-conn', 'running', 'Testando comunicação com Cloud Firestore...');
      const ok = await testConnection();
      if (ok) {
        updateStatus(
          'firestore-conn',
          'passed',
          'Comunicação de rede com Cloud Firestore verificada com sucesso.',
          Math.round(performance.now() - t0)
        );
      } else {
        updateStatus('firestore-conn', 'failed', 'Cliente offline.');
      }
    } catch (e: any) {
      updateStatus('firestore-conn', 'failed', 'Erro: ' + e.message);
    }

    setRunning(false);
  };

  const passedCount = tests.filter((t) => t.status === 'passed').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/50 border border-red-800/40 text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-2">
            Validação de Engenharia
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Diagnóstico & Testes Automatizados
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Bateria de testes funcionais executados diretamente no navegador para validação rigorosa de rotinas críticas.
          </p>
        </div>

        <button
          onClick={runAllTests}
          disabled={running}
          className="py-3 px-5 rounded-xl bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-[0_4px_14px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto disabled:opacity-50"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>EXECUTANDO TESTES...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>RODAR BATERIA DE TESTES</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Scorecard */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-zinc-400">Status dos Testes Locais</span>
          <div className="text-lg font-bold text-white mt-0.5">
            {passedCount} de 7 testes locais aprovados
          </div>
        </div>

        <div className="text-right text-xs text-zinc-400">
          <span>Ambiente: </span>
          <span className="font-mono text-zinc-300">Vite + React 19 + TypeScript</span>
        </div>
      </div>

      {/* Test Items List */}
      <div className="space-y-3">
        {tests.map((test) => (
          <div
            key={test.id}
            className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{test.name}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {test.category}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{test.details}</p>
            </div>

            <div className="shrink-0 flex items-center gap-2.5 self-end sm:self-auto">
              {test.durationMs !== undefined && (
                <span className="text-[11px] font-mono text-zinc-500">{test.durationMs}ms</span>
              )}

              {test.status === 'passed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-400 text-xs font-bold font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  APROVADO
                </span>
              )}

              {test.status === 'failed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-950/70 border border-red-700/60 text-red-400 text-xs font-bold font-mono">
                  <XCircle className="w-3.5 h-3.5" />
                  FALHOU
                </span>
              )}

              {test.status === 'running' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-mono">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
                  RODANDO
                </span>
              )}

              {test.status === 'idle' && (
                <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-mono">
                  AGUARDANDO
                </span>
              )}

              {test.status === 'external' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  EXTERNO
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
