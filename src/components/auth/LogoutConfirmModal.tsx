/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Heart, Sparkles, X, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoutBgImage from '../../assets/images/logout_romantic_bg_1786267834119.jpg';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => Promise<void>;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmLogout,
}) => {
  const { user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onConfirmLogout();
    } finally {
      setIsLoggingOut(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop with Romantic Background Image & Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 overflow-hidden"
          onClick={!isLoggingOut ? onClose : undefined}
        >
          {/* Generated Romantic Background Art */}
          <div
            className="absolute inset-0 bg-cover bg-center scale-105 filter blur-xs"
            style={{ backgroundImage: `url(${logoutBgImage})` }}
          />
          {/* Dark luxury overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-stone-950/85 backdrop-blur-md" />
        </motion.div>

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg rounded-3xl border border-rose-500/30 bg-stone-950/90 p-6 sm:p-8 text-center shadow-2xl shadow-rose-950/50 backdrop-blur-2xl overflow-hidden"
          style={{
            boxShadow: '0 25px 60px -15px rgba(225, 29, 72, 0.25), 0 0 40px rgba(244, 63, 94, 0.15)',
          }}
        >
          {/* Close button */}
          {!isLoggingOut && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          )}

          {/* Icon Header */}
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
            {/* Glowing rings */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 opacity-30 blur-lg animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-400/40 bg-gradient-to-br from-rose-600/30 via-stone-900 to-stone-950 shadow-inner">
              <Heart className="h-8 w-8 text-rose-400 fill-rose-500/40 animate-bounce" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
          </div>

          {/* User Info Chip */}
          {user && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
              <span className="text-sm">{user.avatar || '✨'}</span>
              <span className="text-xs font-semibold text-stone-200">{user.name || user.email}</span>
            </div>
          )}

          {/* Heartfelt Farewell Title & Message */}
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif-display mb-2.5">
            Thank You For Spreading Love! ✨
          </h3>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-md mx-auto mb-6">
            Your customized greeting cards, heartfelt love letters, and photo memories are safely preserved in the Misha Cloud. Take your time, and return whenever you want to craft more memories.
          </p>

          {/* Cloud Security Indicator */}
          <div className="mb-7 p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center gap-2 text-xs text-stone-400">
            <Shield size={14} className="text-emerald-400" />
            <span>All your created links and secret keys remain 100% active.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoggingOut}
              className="w-full sm:w-1/2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-200 bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-pointer order-2 sm:order-1"
            >
              Stay in Studio
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full sm:w-1/2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-900/50 border border-rose-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2 disabled:opacity-50"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing Out...</span>
                </>
              ) : (
                <>
                  <LogOut size={16} />
                  <span>Yes, Sign Out</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
