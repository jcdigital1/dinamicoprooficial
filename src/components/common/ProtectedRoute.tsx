import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../firebase/authContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { user, profile, loading, isAdmin, isApproved, isPending, isBlocked } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono text-zinc-500 tracking-wider">CARREGANDO DINÂMICO PRO...</span>
      </div>
    );
  }

  // Not logged in -> send to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Route specifically requires Administrator privileges
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // If user is blocked by administrator -> send to blocked access page
  if (isBlocked && location.pathname !== '/acesso-bloqueado') {
    return <Navigate to="/acesso-bloqueado" replace />;
  }

  // If user is pending approval and is NOT admin -> send to pending approval page
  if (isPending && location.pathname !== '/aguardando-aprovacao') {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  return <>{children}</>;
};
