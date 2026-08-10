/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth, ADMIN_MASTER_EMAIL } from '../../context/AuthContext';
import { MishaLogo } from '../brand/MishaLogo';
import {
  getGoogleClientId,
  isGoogleAuthAvailable,
  initGoogleIdServices,
  renderGoogleSignInButton,
  triggerGoogleOAuthFlow,
} from '../../utils/googleAuth';

export const AuthModal: React.FC = () => {
  const {
    isAuthenticated,
    isAuthModalOpen,
    closeAuthModal,
    authModalInitialMode,
    loginWithEmail,
    loginWithGoogle,
    loginWithGoogleCredential,
    loginAsGuest,
    registerWithEmail,
    isLoading: isAuthLoading,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const googleConfigured = isGoogleAuthAvailable();

  // Initialize Google Identity Services when modal is opened
  useEffect(() => {
    if (isAuthModalOpen) {
      setError(null);
      setSuccessMsg(null);

      if (authModalInitialMode === 'register') {
        setMode('register');
      } else {
        if (isAuthenticated) {
          closeAuthModal();
          return;
        }
        setMode('login');
      }

      // Initialize GIS for Credential / Button handling
      if (googleConfigured) {
        initGoogleIdServices({
          onSuccess: async (credential: string) => {
            try {
              setError(null);
              setIsGoogleSubmitting(true);
              const loggedUser = await loginWithGoogleCredential(credential);
              setSuccessMsg(`Signed in with Google as ${loggedUser.name}!`);
            } catch (err: any) {
              setError(err?.message || 'Google sign in failed');
            } finally {
              setIsGoogleSubmitting(false);
            }
          },
          onError: (err: any) => {
            console.warn('Google GIS Error:', err);
          },
        });
      }
    }
  }, [isAuthModalOpen, authModalInitialMode, isAuthenticated, googleConfigured]);

  // Render official Google button if container is mounted
  useEffect(() => {
    if (isAuthModalOpen && googleConfigured) {
      const timer = setTimeout(() => {
        renderGoogleSignInButton('google-modal-official-btn', {
          theme: 'filled_blue',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthModalOpen, googleConfigured, mode]);

  if (!isAuthModalOpen) return null;

  const isBypassEmail = email.trim().toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase();
  const isLoading = isAuthLoading || isGoogleSubmitting;

  // Real Google Sign-In Flow using Google Identity Services (Popup Token Client)
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsGoogleSubmitting(true);

    await triggerGoogleOAuthFlow({
      onSuccess: async (profile) => {
        try {
          const loggedUser = await loginWithGoogle(
            profile.email,
            profile.name,
            profile.picture
          );
          setSuccessMsg(`Signed in successfully as ${loggedUser.name}!`);
        } catch (err: any) {
          setError(err?.message || 'Failed to establish session after Google sign-in.');
        } finally {
          setIsGoogleSubmitting(false);
        }
      },
      onError: (errorMessage) => {
        setError(errorMessage);
        setIsGoogleSubmitting(false);
      },
    });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address');
      return;
    }

    const isBypass = cleanEmail.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase();

    if (!isBypass && !password.trim()) {
      setError('Please enter your password');
      return;
    }

    if (!isBypass && mode === 'register' && password.trim().length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    try {
      if (mode === 'register') {
        await registerWithEmail(name || cleanEmail.split('@')[0], cleanEmail, password);
        setSuccessMsg('Account created successfully! Welcome to Misha Studio.');
      } else {
        const user = await loginWithEmail(cleanEmail, password);
        setSuccessMsg(`Welcome back, ${user.name}!`);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleGuestSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const guestUser = await loginAsGuest();
      setSuccessMsg(`Welcome, ${guestUser.name}! You are logged in as a Guest.`);
    } catch (err: any) {
      setError(err.message || 'Failed to login as guest');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-stone-900 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden my-auto"
      >
        {/* Ambient background glows */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <MishaLogo size="lg" showSubtitle={false} className="mb-2" />
          <h2 className="text-xl font-bold font-serif-display text-white mt-1">
            {mode === 'register' ? 'Create Creator Account' : 'Sign in to Misha Studio'}
          </h2>
          <p className="text-xs text-stone-400 mt-1 max-w-xs">
            Save your cards, manage replies & unlock full creator tools
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* AUTH CONTROLS */}
        <div className="space-y-3.5">
          {/* Primary Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-stone-100 active:scale-[0.99] text-stone-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
          >
            {isGoogleSubmitting ? (
              <div className="w-4 h-4 rounded-full border-2 border-stone-800 border-t-transparent animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Hidden/Auxiliary container for Google Official GIS Button if initialized */}
          <div id="google-modal-official-btn" className="hidden" />

          {/* Divider */}
          <div className="relative flex py-0.5 items-center">
            <div className="flex-grow border-t border-white/10" />
            <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
              Or with email
            </span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Your Name / Nickname
                </label>
                <div className="relative">
                  <UserIcon
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="youremail@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Password {isBypassEmail && <span className="text-[11px] text-rose-300 font-normal lowercase">(optional)</span>}
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="password"
                  required={!isBypassEmail}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isBypassEmail ? "No password needed for your account" : "••••••••"}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-950 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-1"
            >
              {isAuthLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : mode === 'register' ? (
                <>
                  <Sparkles size={15} />
                  <span>Create Free Account</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={15} />
                  <span>Sign In to Studio</span>
                </>
              )}
            </button>
          </form>

          {/* Divider for Guest */}
          <div className="relative flex py-0.5 items-center">
            <div className="flex-grow border-t border-white/10" />
            <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
              Or continue without account
            </span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          {/* Guest Login Button */}
          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-800/90 hover:bg-stone-750 border border-white/15 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer hover:text-white hover:border-amber-400/40 group shadow-sm"
          >
            <Sparkles size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Login as a Guest</span>
          </button>

          {/* Toggle Mode */}
          <div className="text-center pt-1">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-xs text-stone-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                Don't have an account?{' '}
                <span className="text-rose-400 font-semibold underline">Sign up free</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-stone-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                Already have an account?{' '}
                <span className="text-rose-400 font-semibold underline">Sign in</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
