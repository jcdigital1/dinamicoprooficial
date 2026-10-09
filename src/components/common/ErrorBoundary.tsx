import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900/90 border border-red-900/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm text-center">
            <div className="w-14 h-14 bg-red-950/60 border border-red-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Ops! Algo deu errado</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Ocorreu uma falha inesperada ao carregar esta visualização. Seus dados estão seguros no Firebase.
            </p>
            {this.state.error && (
              <div className="p-3 bg-black/60 rounded-xl border border-zinc-800 text-left mb-6 text-xs text-red-400 font-mono overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-all shadow-[0_4px_12px_rgba(220,38,38,0.35)]"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </button>
              <a
                href="/"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm transition-all border border-zinc-700"
              >
                <Home className="w-4 h-4" />
                Ir para o Início
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
