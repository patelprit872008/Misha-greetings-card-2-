/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
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
import mishaLogoImage from '../../assets/images/misha_card_logo_1786265266510.jpg';
import {
  isGoogleAuthAvailable,
  initGoogleIdServices,
  renderGoogleSignInButton,
  triggerGoogleOAuthFlow,
} from '../../utils/googleAuth';

export const AuthScreen: React.FC = () => {
  const {
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

  // Initialize GIS on mount
  useEffect(() => {
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
          console.warn('GIS error:', err);
        },
      });

      const timer = setTimeout(() => {
        renderGoogleSignInButton('google-official-screen-btn', {
          theme: 'filled_blue',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [googleConfigured]);

  const isBypassEmail = email.trim().toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase();
  const isLoading = isAuthLoading || isGoogleSubmitting;

  // Real Google Sign-In Flow using Google Identity Services
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
          setSuccessMsg(`Welcome, ${loggedUser.name}!`);
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
      setSuccessMsg(`Welcome, ${guestUser.name}! Opening Studio as Guest.`);
    } catch (err: any) {
      setError(err.message || 'Guest sign-in failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] text-stone-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-rose-600/20 via-purple-600/15 to-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center mb-6 z-10"
      >
        <div className="relative mb-3.5">
          <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-400 to-purple-500 opacity-50 blur-sm animate-pulse" />
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-rose-400/50 shadow-xl bg-stone-900 flex items-center justify-center">
            <img
              src={mishaLogoImage}
              alt="Misha Greetings Logo"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif-display">
          Misha Greetings Card
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-sm">
          Sign in to access your Studio Dashboard, create personalized cards, and generate permanent links
        </p>
      </motion.div>

      {/* Main Auth Container Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-stone-900/90 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative z-10"
      >
        {/* Toggle Mode Tabs */}
        <div className="flex p-1 bg-black/40 rounded-2xl border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300"
            >
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300"
            >
              <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Content */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-stone-100 active:scale-[0.99] text-stone-900 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
          >
            {isGoogleSubmitting ? (
              <div className="w-4 h-4 rounded-full border-2 border-stone-800 border-t-transparent animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div id="google-official-screen-btn" className="hidden" />

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] text-stone-400 uppercase font-semibold">Or with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                Your Name
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
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
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
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
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
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-900/40 border border-rose-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isAuthLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : mode === 'register' ? (
              <>
                <Sparkles size={16} />
                <span>Create Account & Open Studio</span>
              </>
            ) : (
              <>
                <span>Sign In & Open Studio</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Guest Login Option */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-stone-500 uppercase font-semibold">Or continue without account</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700/90 border border-white/15 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer hover:text-white hover:border-amber-400/40 group shadow-sm"
          >
            <Sparkles size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Login as a Guest</span>
          </button>
        </form>

        {/* Security Footer Note */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-stone-400">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Sessions securely maintained in local browser token</span>
        </div>
      </motion.div>
    </div>
  );
};
