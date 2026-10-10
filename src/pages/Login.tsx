import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, User, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../firebase/authContext';

export const Login: React.FC = () => {
  const { loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRegister, setIsRegister] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (showForgot) {
        if (!email) {
          setError('Informe seu e-mail para receber as instruções de recuperação.');
          setLoading(false);
          return;
        }
        await resetPassword(email);
        setInfoMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        setLoading(false);
        return;
      }

      if (isRegister) {
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }

      // Prompt browser credential manager to save credentials
      if (typeof window !== 'undefined' && 'PasswordCredential' in window) {
        try {
          const cred = new (window as any).PasswordCredential({
            id: email,
            password: password,
            name: name || email,
          });
          if (navigator.credentials?.store) {
            await navigator.credentials.store(cred);
          }
        } catch {
          // Standard browser form submission handler will prompt automatically
        }
      }

      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err?.message || 'Falha na autenticação. Verifique os dados digitados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.8)] relative overflow-hidden">
        {/* Subtle red ambiance glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-8 relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-950 border border-red-500/40 mx-auto flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(239,68,68,0.35)]">
            <span className="text-white font-black text-xl">D</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            DINÂMICO <span className="text-red-500">PRO</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            {showForgot
              ? 'Recuperação de Acesso'
              : isRegister
              ? 'Cadastre sua conta comercial'
              : 'Painel de Gestão e Fabricação de Plaquinhas'}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMessage}</span>
          </div>
        )}

        <form
          method="post"
          action="#"
          autoComplete="on"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {isRegister && !showForgot && (
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Nome / Gráfica
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Seu nome ou gráfica"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="seu@email.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
              />
            </div>
          </div>

          {!showForgot && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-zinc-300">
                  Senha
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(true);
                      setError(null);
                    }}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_16px_rgba(220,38,38,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : showForgot ? (
              <>
                <span>ENVIAR LINK DE RECUPERAÇÃO</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : isRegister ? (
              <>
                <span>CRIAR CONTA PRO</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>ENTRAR NO SISTEMA</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {showForgot ? (
          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setShowForgot(false);
                setError(null);
                setInfoMessage(null);
              }}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Voltar para o login
            </button>
          </div>
        ) : (
          <div className="mt-6 text-center text-xs text-zinc-400">
            {isRegister ? (
              <span>
                Já possui uma conta?{' '}
                <button
                  onClick={() => {
                    setIsRegister(false);
                    setError(null);
                  }}
                  className="text-red-400 font-semibold hover:underline"
                >
                  Entrar
                </button>
              </span>
            ) : (
              <span>
                Não tem uma conta?{' '}
                <button
                  onClick={() => {
                    setIsRegister(true);
                    setError(null);
                  }}
                  className="text-red-400 font-semibold hover:underline"
                >
                  Criar conta
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
