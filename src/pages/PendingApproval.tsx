import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  ShieldCheck,
  RefreshCw,
  LogOut,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../firebase/authContext';

export const PendingApproval: React.FC = () => {
  const { user, profile, refreshProfile, logout, isApproved } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCheckNow = async () => {
    setChecking(true);
    setFeedback(null);
    try {
      const updated = await refreshProfile();
      if (updated?.status === 'approved' || updated?.role === 'admin') {
        navigate('/', { replace: true });
        return;
      }
      setFeedback('Seu acesso ainda não foi liberado pelo administrador. Aguarde ou entre em contato pelo WhatsApp.');
    } catch {
      setFeedback('Não foi possível verificar no momento. Tente novamente em instantes.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // If already approved, redirect home
  if (isApproved) {
    navigate('/', { replace: true });
    return null;
  }

  const supportMessage = encodeURIComponent(
    `Olá! Acabei de me cadastrar no DINÂMICO PRO (${user?.email}) e gostaria da liberação do meu acesso.`
  );

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-red-600 selection:text-white">
      {/* Background glow effects */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full bg-zinc-950 border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.8)] relative z-10 text-center">
        {/* Animated Status Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center mx-auto mb-5 shadow-[0_0_24px_rgba(245,158,11,0.25)] relative">
          <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-zinc-950" />
        </div>

        {/* Brand header */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-800/40 text-[11px] font-semibold text-amber-300 tracking-wider uppercase mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          Aguardando Aprovação do Administrador
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          Seu cadastro está aguardando aprovação
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
          Obrigado por se registrar no <strong className="text-white">DINÂMICO PRO</strong>.
          Como nosso sistema opera sob <strong className="text-zinc-200">licença comercial de pagamento único</strong>,
          o administrador verifica a confirmação do pagamento e libera seu acesso completo manualmente.
        </p>

        {/* User identification card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-left space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs border-b border-zinc-800/60 pb-2">
            <span className="text-zinc-400">Titular:</span>
            <span className="font-semibold text-white">{profile?.displayName || 'Comprador'}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-zinc-800/60 pb-2">
            <span className="text-zinc-400">E-mail:</span>
            <span className="font-mono text-zinc-300">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Status atual:</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/60">
              Pendente de Liberação
            </span>
          </div>
        </div>

        {feedback && (
          <div className="mb-5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-300 text-xs flex items-start gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleCheckNow}
            disabled={checking}
            className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_16px_rgba(220,38,38,0.4)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'VERIFICANDO LIBERAÇÃO...' : 'VERIFICAR APROVAÇÃO AGORA'}</span>
          </button>

          <a
            href={`https://wa.me/?text=${supportMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>SOLICITAR LIBERAÇÃO RÁPIDA VIA SUPORTE</span>
          </a>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair desta conta</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-900 text-[11px] text-zinc-400">
          Assim que o administrador aprovar seu acesso no painel, esta tela será liberada automaticamente em tempo real.
        </div>
      </div>
    </div>
  );
};
