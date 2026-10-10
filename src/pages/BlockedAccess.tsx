import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from '../firebase/authContext';

export const BlockedAccess: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const supportMessage = encodeURIComponent(
    `Olá, meu acesso no DINÂMICO PRO (${user?.email}) está bloqueado e gostaria de regularizar meu cadastro.`
  );

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-red-600 selection:text-white">
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-zinc-950 border border-red-900/50 rounded-2xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(220,38,38,0.2)] relative z-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-700/60 flex items-center justify-center mx-auto mb-5 shadow-[0_0_24px_rgba(239,68,68,0.4)]">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/60 text-[11px] font-semibold text-red-400 tracking-wider uppercase mb-3">
          Acesso Restrito
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          Acesso Bloqueado
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
          Seu acesso aos recursos de produção do <strong className="text-white">DINÂMICO PRO</strong> foi suspenso pelo administrador.
          Entre em contato com o suporte para verificar sua situação cadastral.
        </p>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-left space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs border-b border-zinc-800/60 pb-2">
            <span className="text-zinc-400">Conta:</span>
            <span className="font-semibold text-white">{profile?.displayName || 'Comprador'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">E-mail:</span>
            <span className="font-mono text-zinc-300">{user?.email}</span>
          </div>
        </div>

        <div className="space-y-3">
          <a
            href={`https://wa.me/?text=${supportMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>FALAR COM O ADMINISTRADOR</span>
          </a>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair do sistema</span>
          </button>
        </div>
      </div>
    </div>
  );
};
