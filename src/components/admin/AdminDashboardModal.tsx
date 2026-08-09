/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Crown,
  X,
  RefreshCw,
  Trash2,
  ExternalLink,
  MessageSquare,
  Heart,
  Calendar,
  Key,
  ShieldAlert,
  Download,
  Search,
  Sparkles,
  Users,
  Mail,
  Clock,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CardItem {
  id: string;
  title: string;
  theme: string;
  senderName: string;
  receiverName: string;
  creatorEmail?: string;
  creatorName?: string;
  createdAt: string;
  expiresAt: string;
  chatKey: string;
  reactionCount: number;
  chatMessageCount: number;
}

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'creator' | 'user';
  provider: 'google' | 'email';
  createdAt: string;
  lastLoginAt: string;
  cardsCount: number;
}

interface ServerStats {
  totalCards: number;
  totalReactions: number;
  totalSecretChats: number;
  totalUsers: number;
  serverUptime: number;
  ttlDays: number;
}

export const AdminDashboardModal: React.FC = () => {
  const { isAdminDashboardOpen, closeAdminDashboard, token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'cards'>('users');
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setActionFeedback(null);
    let serverLoaded = false;
    try {
      const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
      const res = await fetch(`/api/admin/stats${emailParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.stats) {
          setStats(data.stats);
          setCards(data.cards || []);
          setUsersList(data.users || []);
          serverLoaded = true;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch admin stats from server, fallback to local DB:', err);
    }

    if (!serverLoaded) {
      // Fallback for Vercel / offline
      try {
        const localUsersRaw = localStorage.getItem('misha_registered_users_db') || '[]';
        const localUsers = JSON.parse(localUsersRaw);
        const localCardsRaw = localStorage.getItem('misha_saved_cards_db') || '[]';
        const localCards = JSON.parse(localCardsRaw);

        setUsersList(
          localUsers.map((u: any) => ({
            id: u.id,
            name: u.name || 'User',
            email: u.email,
            provider: u.provider || 'email',
            role: u.role || 'creator',
            createdAt: u.createdAt || new Date().toISOString(),
            lastLoginAt: u.lastLoginAt || new Date().toISOString(),
          }))
        );

        setCards(
          localCards.map((c: any) => ({
            id: c.id,
            title: c.title || 'Untitled Card',
            senderName: c.senderName || 'Sender',
            receiverName: c.receiverName || 'Receiver',
            creatorEmail: c.creatorEmail || 'creator@misha.app',
            creatorName: c.creatorName || 'Creator',
            category: c.category || 'romantic',
            createdAt: c.createdAt || new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 86400000).toISOString(),
            views: 1,
            reactionsCount: 0,
            hasPasskey: true,
          }))
        );

        setStats({
          totalPages: localCards.length || 1,
          totalUsers: localUsers.length || 1,
          totalReactions: 0,
          totalChatMessages: 0,
          serverUptimeSeconds: 3600,
        });
      } catch (e) {}
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdminDashboardOpen) {
      fetchAdminData();
    }
  }, [isAdminDashboardOpen]);

  if (!isAdminDashboardOpen) return null;

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete card ID: ${cardId}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/cards/${cardId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
        setActionFeedback(`Card ${cardId} deleted successfully.`);
      }
    } catch (err) {
      setActionFeedback('Failed to delete card.');
    }
  };

  const filteredCards = cards.filter(
    (c) =>
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.creatorEmail && c.creatorEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.creatorName && c.creatorName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-stone-900 border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
              <Crown size={22} className="text-black fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-serif-display text-white">
                  Misha Studio Master Admin Panel
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-black uppercase">
                  VIP Master
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono">
                Logged in as: <span className="text-amber-300 font-bold">{user?.email || 'Master Administrator'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAdminData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Server Stats"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={closeAdminDashboard}
              className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action Feedback */}
        {actionFeedback && (
          <div className="my-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
            <span>{actionFeedback}</span>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-stone-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 shrink-0">
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-[11px] text-stone-400 uppercase tracking-wider block">
              Registered Users
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-serif-display text-amber-300">
                {stats?.totalUsers ?? usersList.length}
              </span>
              <span className="text-[10px] text-stone-400">Logged In</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-[11px] text-stone-400 uppercase tracking-wider block">
              Active Cards
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-serif-display text-white">
                {stats?.totalCards ?? cards.length}
              </span>
              <span className="text-[10px] text-rose-400">15-day TTL</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-[11px] text-stone-400 uppercase tracking-wider block">
              Secret 1-on-1 Chats
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-serif-display text-emerald-300">
                {stats?.totalSecretChats ?? 0}
              </span>
              <span className="text-[10px] text-stone-400">Encrypted</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-[11px] text-stone-400 uppercase tracking-wider block">
              Receiver Reactions
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-serif-display text-pink-300">
                {stats?.totalReactions ?? 0}
              </span>
              <span className="text-[10px] text-stone-400">Recorded</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-2 shrink-0 border-b border-white/10 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-black/50 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Users size={14} />
              <span>Logged In Users ({usersList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers size={14} />
              <span>Saved Cards ({cards.length})</span>
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'users' ? 'Search users by name or email...' : 'Search cards by ID, Sender...'}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-2 mt-3">
          {activeTab === 'users' ? (
            /* USERS LIST VIEW */
            filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-stone-500 text-xs">
                <Users size={28} className="mx-auto mb-2 opacity-40 text-stone-400" />
                <p>No registered users found matching your search.</p>
                <p className="mt-1 text-[11px] text-stone-600">
                  Users who sign in or create accounts will show up here with their full names and emails.
                </p>
              </div>
            ) : (
              filteredUsers.map((usr) => (
                <div
                  key={usr.id}
                  className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-amber-400/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-stone-800 border border-white/15 flex items-center justify-center text-lg shrink-0">
                      {usr.avatar || (usr.role === 'admin' ? '👑' : '💌')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-white font-serif-display">
                          {usr.name}
                        </span>
                        {usr.role === 'admin' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-400 text-black">
                            👑 Master Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-rose-500/20 text-rose-300">
                            💌 Creator
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-stone-400">
                          via {usr.provider === 'google' ? 'Google Auth' : 'Email/Password'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-stone-300 font-mono">
                          <Mail size={12} className="text-amber-400/70" />
                          {usr.email}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[10px] text-stone-500">
                          <Clock size={11} /> Last Active:{' '}
                          {new Date(usr.lastLoginAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          ({new Date(usr.lastLoginAt).toLocaleDateString()})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-stone-300">
                      Cards Created: <strong className="text-amber-300 font-bold">{usr.cardsCount}</strong>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            /* CARDS LIST VIEW */
            filteredCards.length === 0 ? (
              <div className="text-center py-12 text-stone-500 text-xs">
                <p>No greeting cards found on server.</p>
                <p className="mt-1 text-[11px] text-stone-600">
                  Cards created in Misha Studio will appear here with live chat passkeys.
                </p>
              </div>
            ) : (
              filteredCards.map((card) => (
                <div
                  key={card.id}
                  className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-amber-400/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-white font-serif-display truncate">
                        {card.title}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/10 text-stone-300">
                        ID: {card.id}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-500/20 text-rose-300">
                        {card.theme}
                      </span>
                      {card.creatorEmail && card.creatorEmail !== 'Anonymous' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/15 text-amber-300">
                          By: {card.creatorName || card.creatorEmail}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-stone-400 flex-wrap">
                      <span>
                        From: <strong className="text-stone-200">{card.senderName}</strong>
                      </span>
                      <span>→</span>
                      <span>
                        To: <strong className="text-stone-200">{card.receiverName}</strong>
                      </span>
                      <span className="text-amber-300/90 font-mono font-bold flex items-center gap-1">
                        <Key size={11} /> Passkey: {card.chatKey}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-stone-500">
                      <span>Created: {new Date(card.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="text-rose-400/80">Reactions: {card.reactionCount}</span>
                      <span>•</span>
                      <span className="text-emerald-400/80">Chat msgs: {card.chatMessageCount}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/?p=${card.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span>View Card</span>
                      <ExternalLink size={12} />
                    </a>

                    <a
                      href={`/?p=${card.id}&chat=1&key=${card.chatKey}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span>Open Chat</span>
                      <MessageSquare size={12} />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                      title="Delete Card"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-xs text-stone-400 shrink-0">
          <span className="flex items-center gap-1">
            <ShieldAlert size={13} className="text-amber-400" />
            Master Admin Security Active (Authenticated Session)
          </span>
          <button
            type="button"
            onClick={closeAdminDashboard}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </motion.div>
    </div>
  );
};
