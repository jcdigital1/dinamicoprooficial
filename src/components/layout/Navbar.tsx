import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Layers,
  PlusCircle,
  FolderKanban,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../firebase/authContext';

export const Navbar: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Exact 4 navigation items requested by user
  const navItems = [
    { label: 'INÍCIO', path: '/', icon: Layers },
    { label: 'GERAR LOTE', path: '/gerar-lote', icon: PlusCircle },
    { label: 'MEUS LOTES', path: '/meus-lotes', icon: FolderKanban },
    { label: 'CONFIGURAÇÕES', path: '/configuracoes', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Brand Wordmark */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.4)] group-hover:shadow-[0_0_18px_rgba(239,68,68,0.6)] transition-all">
              <span className="text-white font-extrabold text-sm tracking-tighter">D</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                DINÂMICO <span className="text-red-500 font-black">PRO</span>
              </span>
            </div>
          </Link>

          {/* Zone 2: Navigation Links (Desktop - 4 items) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? 'bg-red-950/40 text-red-400 border border-red-800/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: User Action / Profile */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-medium text-zinc-300 truncate max-w-[140px]">
                    {profile?.displayName || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-zinc-500 flex items-center justify-end gap-1 font-mono">
                    <ShieldCheck className="w-3 h-3 text-red-500" />
                    CONECTADO
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sair do sistema"
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-[0_4px_12px_rgba(220,38,38,0.35)] transition-all"
              >
                ENTRAR
              </Link>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-zinc-950 border-b border-zinc-800 px-4 pt-2 pb-6 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold tracking-wide ${
                  active
                    ? 'bg-red-950/60 text-red-400 border border-red-800/60'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4 mt-2 border-t border-zinc-900 flex items-center justify-between">
            <div className="text-xs text-zinc-400">
              <span className="text-zinc-300 font-semibold">{user?.email || 'Visitante'}</span>
            </div>
            {user && (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-red-400 text-xs font-semibold border border-zinc-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
