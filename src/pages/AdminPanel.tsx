import React, { useEffect, useState } from 'react';
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  Clock,
  Layers,
  QrCode,
  MousePointerClick,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Radio,
} from 'lucide-react';
import { useAuth } from '../firebase/authContext';
import {
  getAllUsers,
  subscribeToUsers,
  updateUserStatus,
  deleteUser,
  getPlatformMetrics,
  getUserStats,
} from '../services/adminService';
import { UserProfile, UserStatus, AdminSystemStats } from '../types';

export const AdminPanel: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [metrics, setMetrics] = useState<AdminSystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userProductionStats, setUserProductionStats] = useState<{ batchesCount: number; platesCount: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Requirement 4: Real-time listener for users collection via subscribeToUsers
  useEffect(() => {
    setLoading(true);
    setFetchError(null);

    // Initial load of platform metrics (batches/plates)
    getPlatformMetrics()
      .then((stats) => setMetrics(stats))
      .catch((err) => console.warn('Metrics fetch warning:', err));

    // Real-time Firestore snapshot listener
    const unsubscribe = subscribeToUsers(
      (updatedUsers) => {
        setUsers(updatedUsers);
        setLoading(false);
        setRefreshing(false);
        setFetchError(null);

        // Dynamically compute user count breakdown from live snapshot
        let pending = 0;
        let approved = 0;
        let blocked = 0;
        updatedUsers.forEach((u) => {
          if (u.status === 'pending') pending++;
          else if (u.status === 'approved') approved++;
          else if (u.status === 'blocked') blocked++;
        });

        setMetrics((prev) => ({
          totalUsers: updatedUsers.length,
          pendingUsers: pending,
          approvedUsers: approved,
          blockedUsers: blocked,
          totalBatches: prev?.totalBatches || 0,
          totalPlates: prev?.totalPlates || 0,
          totalClicks: prev?.totalClicks || 0,
        }));
      },
      (error) => {
        console.error('Real-time users error in AdminPanel:', error);
        setLoading(false);
        setRefreshing(false);
        const msg = error.message.includes('permission-denied')
          ? 'Permissão negada ao consultar a coleção de usuários no Firestore. Verifique se sua conta (jeannmkt2@gmail.com) está autenticada com privilégios administrativos.'
          : `Erro ao consultar a lista de cadastros no Firestore: ${error.message}`;
        setFetchError(msg);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setFetchError(null);
    try {
      const [allUsers, stats] = await Promise.all([
        getAllUsers(),
        getPlatformMetrics(),
      ]);
      setUsers(allUsers);
      setMetrics(stats);
      showToast('Dados atualizados com sucesso.');
    } catch (e: any) {
      console.error('Error refreshing admin data:', e);
      const msg = e?.message?.includes('permission-denied')
        ? 'Permissão negada ao listar usuários no Firestore. Verifique as credenciais da conta administradora jeannmkt2@gmail.com.'
        : `Falha ao atualizar dados: ${e?.message || 'Erro desconhecido'}`;
      setFetchError(msg);
    } finally {
      setRefreshing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Requirement 5 & 6: Functional status update buttons (Aprovar, Bloquear, Reativar)
  const handleUpdateStatus = async (targetUser: UserProfile, newStatus: UserStatus) => {
    try {
      setActionLoadingId(targetUser.id);
      setFetchError(null);
      await updateUserStatus(targetUser.id, newStatus, currentAdmin?.uid);

      // Local optimistic update
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? { ...u, status: newStatus, updatedAt: new Date().toISOString() }
            : u
        )
      );

      const label =
        newStatus === 'approved'
          ? 'aprovado com sucesso'
          : newStatus === 'blocked'
          ? 'bloqueado'
          : 'reativado';
      showToast(`Acesso do usuário ${targetUser.email} ${label}.`);
    } catch (error: any) {
      console.error('Failed to update status:', error);
      const msg = error?.message?.includes('permission-denied')
        ? 'Erro de permissão: somente a conta administrativa autorizada pode aprovar ou bloquear compradores.'
        : `Erro ao atualizar status do comprador: ${error?.message || 'Falha na conexão com o Firestore'}`;
      setFetchError(msg);
      showToast('Falha ao atualizar status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    const confirm = window.confirm(
      `Tem certeza que deseja excluir o cadastro de ${targetUser.email}? Esta ação não pode ser desfeita.`
    );
    if (!confirm) return;

    try {
      setActionLoadingId(targetUser.id);
      await deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      if (selectedUser?.id === targetUser.id) setSelectedUser(null);
      showToast(`Usuário ${targetUser.email} excluído.`);
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      const msg = error?.message?.includes('permission-denied')
        ? 'Permissão negada para excluir usuário.'
        : `Erro ao excluir usuário: ${error?.message || 'Falha na conexão'}`;
      setFetchError(msg);
      showToast('Erro ao excluir usuário.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInspectUser = async (u: UserProfile) => {
    setSelectedUser(u);
    setUserProductionStats(null);
    const stats = await getUserStats(u.id);
    setUserProductionStats(stats);
  };

  // Filter and search
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return u.status === statusFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-red-500/80 text-white px-4 py-3 rounded-xl shadow-[0_4px_24px_rgba(239,68,68,0.4)] flex items-center gap-3 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-red-900/40 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-700/60 text-[11px] font-bold text-red-300 tracking-wider">
              <Shield className="w-3.5 h-3.5 text-red-400" />
              PAINEL ADMINISTRATIVO EXCLUSIVO • JEANNMKT2@GMAIL.COM
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Gestão de Compradores & Plataforma
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Aprovação manual de compradores, liberação de licenças e atualização automática em tempo real via Firestore.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Listener Tempo Real Ativo</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold text-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-red-500 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'ATUALIZANDO...' : 'SINCRONIZAR'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Requirement 13: Prominent Error Banner when reading/saving fails */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-red-950/90 border border-red-700/80 text-red-200 text-xs flex items-start gap-3 shadow-[0_4px_20px_rgba(239,68,68,0.25)]">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-red-100 text-sm mb-1">Aviso do Sistema de Cadastros</div>
            <p className="leading-relaxed">{fetchError}</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="px-3 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 text-white font-semibold transition-colors flex items-center gap-1.5 text-xs border border-red-600/50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar Novamente
              </button>
              <button
                onClick={() => setFetchError(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold transition-colors text-xs border border-zinc-700"
              >
                Dispensar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Metrics KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compradores Pendentes - Priority High */}
        <div className="bg-zinc-950 border border-amber-900/50 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-amber-400">Aguardando Aprovação</span>
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono tabular-nums">
            {loading ? '-' : metrics?.pendingUsers || 0}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Cadastros pendentes de liberação</div>
        </div>

        {/* Total Compradores */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-zinc-400">Compradores Cadastrados</span>
            <Users className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-3xl font-black text-white font-mono tabular-nums">
            {loading ? '-' : metrics?.totalUsers || 0}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            <span className="text-emerald-400 font-semibold">{metrics?.approvedUsers || 0} ativos</span> • <span className="text-red-400">{metrics?.blockedUsers || 0} bloqueados</span>
          </div>
        </div>

        {/* Total Lotes */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-zinc-400">Lotes no Sistema</span>
            <Layers className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-3xl font-black text-white font-mono tabular-nums">
            {loading ? '-' : metrics?.totalBatches || 0}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Produções geradas na plataforma</div>
        </div>

        {/* Total Placas & Cliques */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-zinc-400">Plaquinhas / Cliques</span>
            <MousePointerClick className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono tabular-nums">
            {loading ? '-' : metrics?.totalPlates || 0}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-mono">
            {metrics?.totalClicks || 0} acessos dinâmicos
          </div>
        </div>
      </div>

      {/* Main Table & Filters */}
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-6 space-y-6">
        {/* Controls: Search and Status Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-400" />
              Pendentes ({metrics?.pendingUsers || 0})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'approved'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  : 'text-zinc-400 hover:text-emerald-300'
              }`}
            >
              <UserCheck className="w-3 h-3 text-emerald-400" />
              Aprovados ({metrics?.approvedUsers || 0})
            </button>
            <button
              onClick={() => setStatusFilter('blocked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'blocked'
                  ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                  : 'text-zinc-400 hover:text-red-300'
              }`}
            >
              <UserX className="w-3 h-3 text-red-400" />
              Bloqueados ({metrics?.blockedUsers || 0})
            </button>
          </div>
        </div>

        {/* Buyers Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-500" />
            Carregando lista de compradores em tempo real...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            {users.length === 0 ? (
              <div className="space-y-2">
                <Users className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="font-semibold text-zinc-400">Nenhum comprador cadastrado no banco de dados.</p>
                <p className="text-[11px] text-zinc-500">
                  Assim que um comprador criar uma conta na tela de cadastro, o registro aparecerá automaticamente aqui nesta tabela.
                </p>
              </div>
            ) : (
              'Nenhum comprador encontrado com os filtros atuais.'
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Comprador</th>
                  <th className="pb-3">E-mail</th>
                  <th className="pb-3">Cadastro</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredUsers.map((u) => {
                  const isActionLoading = actionLoadingId === u.id;
                  const isAdminUser = u.role === 'admin';

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-zinc-900/40 transition-colors group"
                    >
                      {/* Name / Display */}
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-white shrink-0">
                            {(u.displayName || u.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {u.displayName || 'Sem nome'}
                              {isAdminUser && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-red-950 text-red-400 border border-red-800/60">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            {u.phone && (
                              <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {u.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 font-mono text-zinc-300">
                        {u.email}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 text-zinc-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5">
                        {u.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Aprovado
                          </span>
                        ) : u.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800/80 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            Pendente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-950/70 text-red-400 border border-red-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Bloqueado
                          </span>
                        )}
                      </td>

                      {/* Requirement 5: Functional buttons (Aprovar, Bloquear, Reativar) */}
                      <td className="py-3.5 text-right pr-2">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Inspect button */}
                          <button
                            onClick={() => handleInspectUser(u)}
                            title="Ver detalhes de produção do comprador"
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão APROVAR (para usuários pendentes) */}
                          {u.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(u, 'approved')}
                              disabled={isActionLoading}
                              title="Aprovar e Liberar Acesso do Comprador"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-600/70 text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aprovar</span>
                            </button>
                          )}

                          {/* Botão REATIVAR (para usuários bloqueados) */}
                          {u.status === 'blocked' && !isAdminUser && (
                            <button
                              onClick={() => handleUpdateStatus(u, 'approved')}
                              disabled={isActionLoading}
                              title="Reativar Acesso do Comprador"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200 border border-emerald-600/60 text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Reativar</span>
                            </button>
                          )}

                          {/* Botão BLOQUEAR (para usuários ativos ou pendentes quando se deseja suspender) */}
                          {u.status === 'approved' && !isAdminUser && (
                            <button
                              onClick={() => handleUpdateStatus(u, 'blocked')}
                              disabled={isActionLoading}
                              title="Bloquear Acesso do Comprador"
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/80 text-zinc-300 hover:text-red-300 border border-zinc-800 hover:border-red-800/60 text-[11px] font-semibold transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Bloquear</span>
                            </button>
                          )}

                          {/* Delete (only non-admins) */}
                          {!isAdminUser && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isActionLoading}
                              title="Excluir Usuário"
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950 text-zinc-500 hover:text-red-400 border border-zinc-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal / Details Drawer for inspected buyer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-white">Detalhes do Comprador</h3>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-zinc-500 hover:text-white text-xs font-semibold"
              >
                FECHAR
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Nome:</span>
                  <span className="text-xs font-bold text-white">{selectedUser.displayName || 'Não informado'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">E-mail:</span>
                  <span className="text-xs font-mono text-zinc-200">{selectedUser.email}</span>
                </div>
                {selectedUser.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">WhatsApp / Tel:</span>
                    <span className="text-xs font-mono text-zinc-200">{selectedUser.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">ID (UID):</span>
                  <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[200px]">{selectedUser.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Status Atual:</span>
                  <span className="text-xs font-bold capitalize text-white">{selectedUser.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Data de Cadastro:</span>
                  <span className="text-xs text-zinc-300">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString('pt-BR') : '-'}
                  </span>
                </div>
              </div>

              {/* Stats for this buyer */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                  <div className="text-[11px] text-zinc-400">Lotes Gerados</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {userProductionStats ? userProductionStats.batchesCount : '...'}
                  </div>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                  <div className="text-[11px] text-zinc-400">Plaquinhas Ativas</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {userProductionStats ? userProductionStats.platesCount : '...'}
                  </div>
                </div>
              </div>

              {/* Status Change Buttons in Modal */}
              <div className="pt-2 flex items-center justify-end gap-2">
                {selectedUser.status !== 'approved' && (
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedUser, 'approved');
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprovar Acesso</span>
                  </button>
                )}
                {selectedUser.status === 'approved' && selectedUser.role !== 'admin' && (
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedUser, 'blocked');
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-950 hover:bg-red-900 border border-red-800/80 text-red-200 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Bloquear Acesso</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
