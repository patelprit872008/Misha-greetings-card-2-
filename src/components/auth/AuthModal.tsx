/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth, ADMIN_MASTER_EMAIL } from '../../context/AuthContext';
import { MishaLogo } from '../brand/MishaLogo';

interface SavedGoogleAccount {
  email: string;
  name: string;
  avatar: string;
}

const SAVED_GOOGLE_KEY = 'misha_saved_google_ids';

export const AuthModal: React.FC = () => {
  const {
    user,
    isAuthenticated,
    isAuthModalOpen,
    closeAuthModal,
    authModalInitialMode,
    loginWithEmail,
    loginWithGoogle,
    loginWithGoogleCredential,
    loginAsGuest,
    registerWithEmail,
    isLoading,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'google-picker'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [savedGoogleAccounts, setSavedGoogleAccounts] = useState<SavedGoogleAccount[]>([]);

  // Initialize Google Identity Services button container when in google-picker mode
  useEffect(() => {
    if (isAuthModalOpen && mode === 'google-picker') {
      try {
        const google = (window as any).google;
        if (google?.accounts?.id) {
          google.accounts.id.initialize({
            client_id: '1046187762691-misha-greetings.apps.googleusercontent.com',
            callback: async (response: any) => {
              if (response && response.credential) {
                try {
                  const loggedUser = await loginWithGoogleCredential(response.credential);
                  setSuccessMsg(`Signed in with Google as ${loggedUser.name}!`);
                } catch (err: any) {
                  setError(err.message || 'Google sign in failed');
                }
              }
            },
          });

          const btnEl = document.getElementById('google-official-btn');
          if (btnEl) {
            btnEl.innerHTML = '';
            google.accounts.id.renderButton(btnEl, {
              theme: 'filled_blue',
              size: 'large',
              width: '100%',
              text: 'continue_with',
              shape: 'pill',
            });
          }
        }
      } catch (e) {}
    }
  }, [isAuthModalOpen, mode]);

  // Load saved Google accounts on modal open
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_GOOGLE_KEY);
      let list: SavedGoogleAccount[] = stored ? JSON.parse(stored) : [];
      // Always ensure master admin email is in list for seamless 1-click
      const hasAdmin = list.some((a) => a.email.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase());
      if (!hasAdmin) {
        list.unshift({
          email: ADMIN_MASTER_EMAIL,
          name: 'Prit Patel (Master Admin)',
          avatar: '👑',
        });
      }
      setSavedGoogleAccounts(list);
    } catch (e) {
      setSavedGoogleAccounts([
        {
          email: ADMIN_MASTER_EMAIL,
          name: 'Prit Patel (Master Admin)',
          avatar: '👑',
        },
      ]);
    }
  }, [isAuthModalOpen]);

  useEffect(() => {
    if (isAuthModalOpen) {
      if (authModalInitialMode === 'register') {
        setMode('register');
      } else if (authModalInitialMode === 'google') {
        setMode('google-picker');
      } else {
        if (isAuthenticated) {
          closeAuthModal();
          return;
        }
        setMode('login');
      }
      setError(null);
      setSuccessMsg(null);
    }
  }, [isAuthModalOpen, authModalInitialMode, isAuthenticated]);

  const isBypassEmail = email.trim().toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase();

  if (!isAuthModalOpen) return null;

  // Trigger Google Identity Services or OAuth Flow
  const triggerGoogleOAuthFlow = async () => {
    setError(null);
    try {
      const google = (window as any).google;
      // 1. Try Google Identity Services OAuth 2.0 popup token client
      if (google?.accounts?.oauth2) {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: '1046187762691-misha-greetings.apps.googleusercontent.com',
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                if (res.ok) {
                  const profile = await res.json();
                  if (profile.email) {
                    const loggedUser = await loginWithGoogle(profile.email, profile.name, profile.picture);
                    setSuccessMsg(`Signed in with Google as ${loggedUser.name}!`);
                    return;
                  }
                }
              } catch (err: any) {
                setError('Failed to fetch Google profile: ' + (err.message || ''));
              }
            }
          },
        });
        client.requestAccessToken();
        return;
      }

      // 2. Try Google One-Tap Prompt
      if (google?.accounts?.id) {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setMode('google-picker');
          }
        });
        setMode('google-picker');
        return;
      }

      // 3. Fallback to Google Picker View with direct accounts
      setMode('google-picker');
    } catch (e: any) {
      setMode('google-picker');
    }
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
        // Login mode
        const user = await loginWithEmail(cleanEmail, password);
        setSuccessMsg(`Welcome back, ${user.name}!`);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleGoogleSignIn = async (chosenEmail?: string, chosenName?: string, chosenAvatar?: string) => {
    setError(null);
    const targetEmail = chosenEmail?.trim() || googleEmailInput.trim();
    if (!targetEmail) {
      setError('Please enter your Google email address');
      return;
    }

    try {
      const emailToUse = targetEmail.includes('@') ? targetEmail : `${targetEmail}@gmail.com`;
      const nameToUse = chosenName || emailToUse.split('@')[0];
      const loggedUser = await loginWithGoogle(emailToUse, nameToUse, chosenAvatar);
      setSuccessMsg(`Signed in successfully as ${loggedUser.name}!`);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
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

  const removeSavedGoogleAccount = (e: React.MouseEvent, accEmail: string) => {
    e.stopPropagation();
    try {
      const updated = savedGoogleAccounts.filter(
        (a) => a.email.toLowerCase() !== accEmail.toLowerCase()
      );
      setSavedGoogleAccounts(updated);
      localStorage.setItem(SAVED_GOOGLE_KEY, JSON.stringify(updated));
    } catch (err) {}
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
            {mode === 'google-picker'
              ? 'Sign in with Google'
              : mode === 'register'
              ? 'Create Creator Account'
              : 'Sign in to Misha Studio'}
          </h2>
          <p className="text-xs text-stone-400 mt-1 max-w-xs">
            {mode === 'google-picker'
              ? 'Select or enter your Google Account email to continue'
              : 'Save your cards, manage replies & unlock creator tools'}
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

        {/* GOOGLE ACCOUNT FLOW */}
        {mode === 'google-picker' ? (
          <div className="space-y-4">
            {/* Official Google Identity Services Container */}
            <div className="p-3.5 rounded-2xl bg-stone-800/80 border border-white/10 space-y-3">
              <div className="text-center">
                <span className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider">
                  Select your Google ID
                </span>
              </div>

              {/* Official Google GSI Render Container */}
              <div id="google-official-btn" className="flex justify-center min-h-[40px] w-full" />

              {/* Direct Google OAuth Gateway Button */}
              <button
                type="button"
                onClick={() => {
                  try {
                    const redirectUrl = window.location.origin.includes('vercel.app')
                      ? window.location.origin
                      : 'https://misha-greetings-card-25gnx8zbg-sentinelai-xdr.vercel.app/';
                    const clientId = '1046187762691-misha-greetings.apps.googleusercontent.com';
                    const scope = encodeURIComponent('openid email profile');
                    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
                      redirectUrl
                    )}&response_type=token%20id_token&scope=${scope}&nonce=${Date.now()}&prompt=select_account`;
                    
                    const popup = window.open(
                      authUrl,
                      'GoogleOAuth',
                      'width=500,height=600,menubar=no,toolbar=no,location=no,status=no'
                    );
                    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                      window.location.href = authUrl;
                    }
                  } catch (err: any) {
                    setError('Failed to open Google sign-in window: ' + (err.message || ''));
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-stone-100 text-stone-800 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google Account Direct Sign-In</span>
              </button>
            </div>

            {/* List of previously used Google IDs on this device */}
            {savedGoogleAccounts.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-300 block">
                  Quick 1-Tap Google Accounts:
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {savedGoogleAccounts.map((acc) => {
                    const isAdmin = acc.email.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase();
                    return (
                      <div
                        key={acc.email}
                        onClick={() => handleGoogleSignIn(acc.email, acc.name, acc.avatar)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all group cursor-pointer ${
                          isAdmin
                            ? 'bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-amber-950/40 border-rose-400/40 hover:border-rose-400'
                            : 'bg-stone-800/90 hover:bg-stone-750 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500/30 to-pink-500/30 border border-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {acc.avatar ? acc.avatar : acc.name ? acc.name.charAt(0).toUpperCase() : 'G'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-white truncate">{acc.name || 'Google User'}</span>
                              {isAdmin && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-400 font-mono block truncate">{acc.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => removeSavedGoogleAccount(e, acc.email)}
                              className="p-1 rounded text-stone-500 hover:text-rose-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Remove account from list"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          <div className="w-6 h-6 rounded-full bg-white/10 text-stone-300 flex items-center justify-center group-hover:scale-105 group-hover:bg-rose-500 group-hover:text-white transition-all">
                            <ArrowRight size={12} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Enter Google ID / Email */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-300 block">
                {savedGoogleAccounts.length > 0 ? 'Or enter any other Google ID:' : 'Enter your Google ID / Gmail:'}
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && googleEmailInput.trim()) {
                        e.preventDefault();
                        handleGoogleSignIn(googleEmailInput.trim());
                      }
                    }}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400 transition-colors"
                  />
                </div>

                {/* Quick domain helper */}
                {googleEmailInput && !googleEmailInput.includes('@') && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGoogleEmailInput(`${googleEmailInput.trim()}@gmail.com`)}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] text-stone-300 border border-white/10 cursor-pointer"
                    >
                      + @gmail.com
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleGoogleSignIn(googleEmailInput.trim())}
                  disabled={!googleEmailInput.trim() || isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#ffffff"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                  </svg>
                  <span>Continue with this Google ID</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center text-xs text-stone-400 hover:text-stone-200 pt-2 cursor-pointer transition-colors"
            >
              ← Back to standard Email login
            </button>
          </div>
        ) : (
          /* STANDARD LOGIN / REGISTER FORM */
          <div className="space-y-3.5">
            {/* Google Sign In Option */}
            <button
              type="button"
              onClick={triggerGoogleOAuthFlow}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
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
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex py-0.5 items-center">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                Or with email
              </span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            {/* Form */}
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
                {isLoading ? (
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
        )}
      </motion.div>
    </div>
  );
};

