import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Database,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Terminal,
  Server,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { getSystemSettings, saveSystemSettings } from '../services/plateService';
import { testConnection } from '../firebase/config';
import { SystemSettings } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    id: 'global',
    publicDomain: window.location.origin,
    installationName: 'DINÂMICO PRO',
    initialized: true,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Diagnostic states
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [checkingDb, setCheckingDb] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      try {
        const s = await getSystemSettings();
        setSettings(s);
        checkDatabase();
      } catch (e: any) {
        setErrorMessage('Erro ao carregar configurações.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const checkDatabase = async () => {
    setCheckingDb(true);
    setDbStatus('checking');
    try {
      const ok = await testConnection();
      setDbStatus(ok ? 'connected' : 'error');
    } catch {
      setDbStatus('error');
    } finally {
      setCheckingDb(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let domain = settings.publicDomain.trim();
      if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
        domain = 'https://' + domain;
      }
      domain = domain.replace(/\/+$/, ''); // remove trailing slash

      const saved = await saveSystemSettings({
        ...settings,
        publicDomain: domain,
      });

      setSettings(saved);
      setSuccessMessage('Configurações da instalação salvas com sucesso! Novos lotes utilizarão esta URL pública.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      setErrorMessage('Falha ao salvar configurações: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/50 border border-red-800/40 text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-2">
          Setup da Instalação & Revenda
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Configurações do Sistema
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Defina o domínio público das plaquinhas, a identificação da gráfica e gerencie os parâmetros independentes desta instalação.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 text-xs flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="border-b border-zinc-900 pb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-red-500" />
            Domínio Público Definitivo das Plaquinhas
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            CRÍTICO: Este endereço será codificado permanentemente nos QR Codes físicos impressos.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              URL Base / Domínio do Cliente (ex: https://placas.suagrafica.com.br)
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={settings.publicDomain}
                onChange={(e) => setSettings({ ...settings, publicDomain: e.target.value })}
                placeholder="https://suadominio.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span>Exemplo de QR Code que será gerado: </span>
              <span className="font-mono text-red-400 font-semibold">
                {settings.publicDomain.replace(/\/+$/, '')}/q/p_9a4b2c
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Nome da Gráfica / Licenciado
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={settings.installationName}
                onChange={(e) => setSettings({ ...settings, installationName: e.target.value })}
                placeholder="Ex: Gráfica Premium & Placas NFC"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="py-3 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_14px_rgba(220,38,38,0.4)] active:translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>SALVAR CONFIGURAÇÕES</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Cloud & Firebase Diagnostics */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-red-500" />
              Diagnóstico do Firebase Cloud Firestore
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Parâmetros de conexão e persistência de dados</p>
          </div>

          <button
            onClick={checkDatabase}
            disabled={checkingDb}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Testar Conexão"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingDb ? 'animate-spin text-red-500' : ''}`} />
            <span>Testar</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Status da Conexão</span>
            <div className="flex items-center gap-2">
              {dbStatus === 'connected' ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ONLINE / CONECTADO
                </span>
              ) : dbStatus === 'checking' ? (
                <span className="text-xs text-zinc-400 font-mono">Verificando...</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  VERIFICANDO PERMISSÃO
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Projeto Firebase ID</span>
            <span className="text-xs font-mono text-white truncate block">
              {firebaseConfig.projectId || 'useful-point-v53bd'}
            </span>
          </div>

          <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Database ID</span>
            <span className="text-xs font-mono text-zinc-300 truncate block">
              {firebaseConfig.firestoreDatabaseId || 'ai-studio-...'}
            </span>
          </div>
        </div>
      </div>

      {/* Resale Guide & Vercel Deployment Checklist */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-red-500" />
          Guia de Revenda e Implantação na Vercel
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Para comercializar este sistema para compradores distintos mantendo dados 100% isolados:
        </p>

        <div className="space-y-3 text-xs text-zinc-300">
          <div className="p-3 bg-zinc-900/70 rounded-xl border border-zinc-800/80 space-y-1">
            <strong className="text-white">1. Crie um Projeto Firebase para cada comprador:</strong>
            <p className="text-zinc-400">
              No console.firebase.google.com, crie um novo projeto, ative Authentication (Email e Google) e crie o banco Cloud Firestore.
            </p>
          </div>

          <div className="p-3 bg-zinc-900/70 rounded-xl border border-zinc-800/80 space-y-1">
            <strong className="text-white">2. Conecte o repositório na Vercel:</strong>
            <p className="text-zinc-400">
              Importe o projeto na Vercel. Framework preset: <code className="text-red-400">Vite</code>. Build command: <code className="text-red-400">npm run build</code>.
            </p>
          </div>

          <div className="p-3 bg-zinc-900/70 rounded-xl border border-zinc-800/80 space-y-1">
            <strong className="text-white">3. Configure o domínio próprio:</strong>
            <p className="text-zinc-400">
              Na aba Domains da Vercel, adicione o domínio do cliente (ex: <code className="text-white">placas.clientea.com</code>) e atualize o campo "URL Base" acima.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
