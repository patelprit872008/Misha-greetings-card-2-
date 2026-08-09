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
  Trash2,
} from 'lucide-react';
import { useAuth, ADMIN_MASTER_EMAIL } from '../../context/AuthContext';
import mishaLogoImage from '../../assets/images/misha_card_logo_1786265266510.jpg';

interface SavedGoogleAccount {
  email: string;
  name: string;
  avatar: string;
}

const SAVED_GOOGLE_KEY = 'misha_saved_google_ids';

export const AuthScreen: React.FC = () => {
  const { loginWithEmail, loginWithGoogle, loginWithGoogleCredential, loginAsGuest, registerWithEmail, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'google-picker'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [savedGoogleAccounts, setSavedGoogleAccounts] = useState<SavedGoogleAccount[]>([]);

  // Load saved Google accounts on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_GOOGLE_KEY);
      let list: SavedGoogleAccount[] = stored ? JSON.parse(stored) : [];
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
  }, []);

  // Initialize Google Identity Services when in google-picker mode
  useEffect(() => {
    if (mode === 'google-picker') {
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

          const btnEl = document.getElementById('google-official-screen-btn');
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
  }, [mode]);

  const triggerGoogleOAuthFlow = async () => {
    setError(null);
    try {
      const google = (window as any).google;
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

      if (google?.accounts?.id) {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setMode('google-picker');
          }
        });
        setMode('google-picker');
        return;
      }

      setMode('google-picker');
    } catch (e: any) {
      setMode('google-picker');
    }
  };

  const isBypassEmail = email.trim().toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase();

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
      const user = await loginWithGoogle(emailToUse, nameToUse, chosenAvatar);
      setSuccessMsg(`Welcome, ${user.name}!`);
    } catch (err: any) {
      setError(err.message || 'Google sign-in encountered an issue.');
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
        {mode !== 'google-picker' && (
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
        )}

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

        {mode === 'google-picker' ? (
          /* Google Account Picker View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Google Sign In
              </h3>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-rose-400 hover:underline cursor-pointer"
              >
                Back to email
              </button>
            </div>

            {/* Official Google Identity Services Container */}
            <div className="p-3.5 rounded-2xl bg-stone-800/80 border border-white/10 space-y-3">
              <div id="google-official-screen-btn" className="flex justify-center min-h-[40px] w-full" />

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

            {/* Saved Google Accounts */}
            {savedGoogleAccounts.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs text-stone-300 font-medium">
                  Quick 1-Tap Google Accounts:
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {savedGoogleAccounts.map((acc) => {
                    const isAdmin = acc.email.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase();
                    return (
                      <div
                        key={acc.email}
                        onClick={() => handleGoogleSignIn(acc.email, acc.name, acc.avatar)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between group transition-all cursor-pointer ${
                          isAdmin
                            ? 'bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-amber-950/40 border-rose-400/40 hover:border-rose-400'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-rose-400/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500/30 to-pink-500/30 border border-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {acc.avatar ? acc.avatar : acc.name ? acc.name.charAt(0).toUpperCase() : 'G'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-white truncate">{acc.name || 'Google User'}</p>
                              {isAdmin && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-400 font-mono truncate">{acc.email}</p>
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
                          <ArrowRight size={14} className="text-stone-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Google Email Input */}
            <div className="space-y-2">
              <label className="block text-xs text-stone-300 font-medium">
                {savedGoogleAccounts.length > 0 ? 'Or enter any other Google ID:' : 'Enter your Google Account email:'}
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    placeholder="your.email@gmail.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && googleEmailInput.trim()) {
                        e.preventDefault();
                        handleGoogleSignIn(googleEmailInput.trim());
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (googleEmailInput.trim()) {
                        handleGoogleSignIn(googleEmailInput.trim());
                      }
                    }}
                    disabled={!googleEmailInput.trim() || isLoading}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    Continue
                  </button>
                </div>

                {/* Domain helper */}
                {googleEmailInput && !googleEmailInput.includes('@') && (
                  <button
                    type="button"
                    onClick={() => setGoogleEmailInput(`${googleEmailInput.trim()}@gmail.com`)}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] text-stone-300 border border-white/10 cursor-pointer"
                  >
                    + @gmail.com
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Standard Email / Password Form */
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {/* Google 1-Click Button */}
            <button
              type="button"
              onClick={triggerGoogleOAuthFlow}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-900 font-semibold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer"
            >
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
              <span>Continue with Google</span>
            </button>

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
              {isLoading ? (
                <span>Authenticating...</span>
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
        )}

        {/* Security Footer Note */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-stone-400">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Sessions securely maintained in local browser token</span>
        </div>
      </motion.div>
    </div>
  );
};

