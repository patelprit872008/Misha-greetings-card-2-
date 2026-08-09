/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';

export const ADMIN_MASTER_EMAIL = 'patelprit872008@gmail.com';
const AUTH_STORAGE_KEY = 'misha_auth_session_v1';
const USERS_DB_KEY = 'misha_registered_users_db';

interface StoredUserRecord {
  id: string;
  email: string;
  name: string;
  password?: string;
  role: 'admin' | 'creator' | 'user' | 'guest';
  avatar?: string;
  provider: 'email' | 'google' | 'guest';
  createdAt: string;
  lastLoginAt: string;
}

function getLocalUsersDB(): StoredUserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  // Prepopulate master admin user
  const initialAdmin: StoredUserRecord = {
    id: 'usr_admin_master',
    email: ADMIN_MASTER_EMAIL,
    name: 'Prit Patel',
    role: 'admin',
    avatar: '👑',
    provider: 'email',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
  const list = [initialAdmin];
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(list));
  } catch (e) {}
  return list;
}

function saveLocalUsersDB(users: StoredUserRecord[]) {
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch (e) {}
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

interface AuthContextType extends AuthState {
  loginWithEmail: (email: string, password?: string) => Promise<User>;
  loginWithGoogle: (customEmail?: string, customName?: string, avatar?: string) => Promise<User>;
  loginWithGoogleCredential: (credential: string) => Promise<User>;
  loginAsGuest: () => Promise<User>;
  quickAdminLogin: () => Promise<User>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'login' | 'register' | 'google') => void;
  closeAuthModal: () => void;
  authModalInitialMode: 'login' | 'register' | 'google';
  isAdminDashboardOpen: boolean;
  openAdminDashboard: () => void;
  closeAdminDashboard: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'register' | 'google'>('login');
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);

  // Load saved session and listen to OAuth callback tokens
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Check if returning from Google OAuth redirect in URL hash or search
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : search);
        const idToken = params.get('id_token');
        const accessToken = params.get('access_token');
        const credential = params.get('credential');

        if (idToken || credential) {
          const payload = parseJwt(idToken || credential || '');
          if (payload && payload.email) {
            await loginWithGoogle(payload.email, payload.name || payload.email.split('@')[0], payload.picture);
            window.history.replaceState({}, document.title, window.location.pathname);
            setIsLoading(false);
            return;
          }
        } else if (accessToken) {
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userInfoRes.ok) {
              const userInfo = await userInfoRes.json();
              if (userInfo.email) {
                await loginWithGoogle(userInfo.email, userInfo.name, userInfo.picture);
                window.history.replaceState({}, document.title, window.location.pathname);
                setIsLoading(false);
                return;
              }
            }
          } catch (e) {}
        }

        // 2. Standard saved session restore
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.token && parsed.user) {
            const isAdmin =
              parsed.user.email?.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase() ||
              parsed.user.role === 'admin';
            const restoredUser = { ...parsed.user, isAdmin };
            setUser(restoredUser);
            setToken(parsed.token);

            // Verify with backend if available, but DO NOT log out if backend is offline/Vercel static
            try {
              const res = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${parsed.token}` },
              });
              if (res.ok) {
                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                  const data = await res.json();
                  if (data.authenticated && data.user) {
                    const isServerAdmin =
                      data.user.email?.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase() ||
                      data.user.role === 'admin';
                    setUser({ ...data.user, isAdmin: isServerAdmin });
                  }
                }
              }
            } catch (netErr) {
              // Server offline / Vercel static: keep restored user
            }
          }
        }
      } catch (err) {
        console.warn('Failed to restore auth session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Handle postMessage from OAuth popup window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OAUTH_AUTH_SUCCESS') {
        const { token: oauthToken, params } = event.data;
        if (oauthToken || params) {
          const jwt = oauthToken || params?.id_token || params?.credential;
          if (jwt) {
            const payload = parseJwt(jwt);
            if (payload && payload.email) {
              loginWithGoogle(payload.email, payload.name, payload.picture);
            }
          }
        }
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const saveSession = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    try {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user: userData, token: authToken, savedAt: Date.now() })
      );
    } catch (e) {
      // ignore
    }
  };

  const loginWithEmail = async (email: string, password: string = ''): Promise<User> => {
    setIsLoading(true);
    const cleanEmail = email.trim();
    const normalized = cleanEmail.toLowerCase();
    const isMasterAdmin = normalized === ADMIN_MASTER_EMAIL.toLowerCase();

    try {
      // 1. Try server endpoint
      let serverSuccess = false;
      let serverData: any = null;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          serverData = await res.json();
          serverSuccess = true;
        } else if (res.status === 400 || res.status === 401) {
          try {
            const errData = await res.json();
            if (errData && errData.error && !isMasterAdmin) {
              throw new Error(errData.error);
            }
          } catch (e: any) {
            if (e?.message && e.message !== 'Failed to sign in') {
              throw e;
            }
          }
        }
      } catch (netErr: any) {
        if (netErr?.message && !netErr.message.includes('fetch') && !netErr.message.includes('JSON')) {
          // If explicit invalid password error thrown above
          throw netErr;
        }
      }

      if (serverSuccess && serverData && serverData.user) {
        const isAdmin =
          serverData.user.email.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase() ||
          serverData.user.role === 'admin';
        const fullUser: User = { ...serverData.user, isAdmin };

        saveSession(fullUser, serverData.token);
        setIsAuthModalOpen(false);
        return fullUser;
      }

      // 2. Resilient Client-Side Fallback for Vercel / Static Deployment
      const db = getLocalUsersDB();
      let matchedUser = db.find((u) => u.email.toLowerCase() === normalized);

      if (isMasterAdmin) {
        // Master Admin bypass: always authenticate
        const adminUser: User = {
          id: matchedUser ? matchedUser.id : 'usr_admin_master',
          email: ADMIN_MASTER_EMAIL,
          name: 'Prit Patel (Admin)',
          avatar: '👑',
          role: 'admin',
          isAdmin: true,
          provider: 'email',
          createdAt: matchedUser ? matchedUser.createdAt : new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        // Update local DB
        if (!matchedUser) {
          db.push({
            id: adminUser.id,
            email: ADMIN_MASTER_EMAIL,
            name: adminUser.name,
            role: 'admin',
            avatar: '👑',
            provider: 'email',
            createdAt: adminUser.createdAt,
            lastLoginAt: adminUser.lastLoginAt,
          });
        } else {
          matchedUser.lastLoginAt = new Date().toISOString();
        }
        saveLocalUsersDB(db);

        const adminToken = `tok_admin_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        saveSession(adminUser, adminToken);
        setIsAuthModalOpen(false);
        return adminUser;
      }

      if (matchedUser) {
        if (matchedUser.password && password && matchedUser.password !== password) {
          throw new Error('Incorrect password! Only your previously registered password is valid.');
        }

        matchedUser.lastLoginAt = new Date().toISOString();
        saveLocalUsersDB(db);

        const localUser: User = {
          id: matchedUser.id,
          email: matchedUser.email,
          name: matchedUser.name,
          avatar: matchedUser.avatar || '✨',
          role: matchedUser.role,
          isAdmin: matchedUser.role === 'admin' || matchedUser.email.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase(),
          provider: matchedUser.provider,
          createdAt: matchedUser.createdAt,
          lastLoginAt: matchedUser.lastLoginAt,
        };

        const localToken = `tok_usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        saveSession(localUser, localToken);
        setIsAuthModalOpen(false);
        return localUser;
      }

      // If user does not exist in login mode, prompt them to register
      throw new Error('No account found with this email. Please click "Create an Account" to register first.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (
    customEmail: string = '',
    customName: string = '',
    customAvatar: string = ''
  ): Promise<User> => {
    setIsLoading(true);
    const emailToUse = customEmail.trim() || 'user@gmail.com';
    const normalized = emailToUse.toLowerCase();
    const isAdmin = normalized === ADMIN_MASTER_EMAIL.toLowerCase();
    const displayName = customName || (isAdmin ? 'Prit Patel (Admin)' : emailToUse.split('@')[0] || 'Google User');
    const avatarToUse = customAvatar || (isAdmin ? '👑' : '✨');

    try {
      // 1. Try server API
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailToUse,
            name: displayName,
            avatar: avatarToUse,
            googleId: `gid-${Date.now()}`,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.user) {
            const fullUser: User = { ...data.user, isAdmin: data.isAdmin || isAdmin };

            // Save to saved Google accounts
            try {
              const key = 'misha_saved_google_ids';
              const existing = JSON.parse(localStorage.getItem(key) || '[]');
              const filtered = existing.filter((acc: { email: string }) => acc.email.toLowerCase() !== fullUser.email.toLowerCase());
              filtered.unshift({
                email: fullUser.email,
                name: fullUser.name,
                avatar: fullUser.avatar || avatarToUse,
              });
              localStorage.setItem(key, JSON.stringify(filtered.slice(0, 5)));
            } catch (e) {}

            saveSession(fullUser, data.token);
            setIsAuthModalOpen(false);
            return fullUser;
          }
        }
      } catch (netErr) {
        // Fallback for Vercel static
      }

      // 2. Client-Side Resilient Google Auth for Vercel
      const db = getLocalUsersDB();
      let matched = db.find((u) => u.email.toLowerCase() === normalized);

      const googleUser: User = {
        id: matched ? matched.id : `usr_g_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        email: emailToUse,
        name: displayName,
        avatar: avatarToUse,
        role: isAdmin ? 'admin' : 'creator',
        isAdmin: isAdmin,
        provider: 'google',
        createdAt: matched ? matched.createdAt : new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      if (!matched) {
        db.push({
          id: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          role: googleUser.role,
          avatar: googleUser.avatar,
          provider: 'google',
          createdAt: googleUser.createdAt,
          lastLoginAt: googleUser.lastLoginAt,
        });
      } else {
        matched.lastLoginAt = new Date().toISOString();
        if (customAvatar) matched.avatar = customAvatar;
      }
      saveLocalUsersDB(db);

      // Save to saved Google accounts on this browser
      try {
        const key = 'misha_saved_google_ids';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const filtered = existing.filter((acc: { email: string }) => acc.email.toLowerCase() !== googleUser.email.toLowerCase());
        filtered.unshift({
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.avatar || avatarToUse,
        });
        localStorage.setItem(key, JSON.stringify(filtered.slice(0, 5)));
      } catch (e) {}

      const googleToken = `tok_google_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      saveSession(googleUser, googleToken);
      setIsAuthModalOpen(false);
      return googleUser;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogleCredential = async (credential: string): Promise<User> => {
    const payload = parseJwt(credential);
    if (!payload || !payload.email) {
      throw new Error('Invalid Google credential received');
    }
    return loginWithGoogle(payload.email, payload.name, payload.picture);
  };

  const loginAsGuest = async (): Promise<User> => {
    setIsLoading(true);
    try {
      try {
        const res = await fetch('/api/auth/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.user) {
            const guestUser: User = { ...data.user, isAdmin: false };
            saveSession(guestUser, data.token);
            setIsAuthModalOpen(false);
            return guestUser;
          }
        }
      } catch (e) {
        // Fallback for Vercel
      }

      const guestNum = Math.floor(1000 + Math.random() * 9000);
      const fallbackGuest: User = {
        id: `guest-${Date.now()}`,
        email: `guest_${guestNum}@misha.app`,
        name: `Guest Creator #${guestNum}`,
        avatar: '🌟',
        role: 'guest',
        isAdmin: false,
        provider: 'guest',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      saveSession(fallbackGuest, `tok_guest_${Date.now()}`);
      setIsAuthModalOpen(false);
      return fallbackGuest;
    } finally {
      setIsLoading(false);
    }
  };

  const quickAdminLogin = async (): Promise<User> => {
    return loginWithEmail(ADMIN_MASTER_EMAIL, '');
  };

  const registerWithEmail = async (name: string, email: string, password: string): Promise<User> => {
    setIsLoading(true);
    const cleanEmail = email.trim();
    const normalized = cleanEmail.toLowerCase();
    const isMasterAdmin = normalized === ADMIN_MASTER_EMAIL.toLowerCase();

    try {
      // 1. Try server API
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: cleanEmail, password }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.user) {
            const isAdmin =
              data.user.email.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase() || data.user.role === 'admin';
            const fullUser: User = { ...data.user, isAdmin };

            saveSession(fullUser, data.token);
            setIsAuthModalOpen(false);
            return fullUser;
          }
        } else if (res.status === 400) {
          const errData = await res.json();
          if (errData && errData.error) {
            throw new Error(errData.error);
          }
        }
      } catch (netErr: any) {
        if (netErr?.message && !netErr.message.includes('fetch') && !netErr.message.includes('JSON')) {
          throw netErr;
        }
      }

      // 2. Client-Side Resilient Registration for Vercel
      const db = getLocalUsersDB();
      const existing = db.find((u) => u.email.toLowerCase() === normalized);

      const registeredUserRecord: StoredUserRecord = {
        id: existing ? existing.id : `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        email: cleanEmail,
        name: name.trim() || cleanEmail.split('@')[0],
        password: password,
        role: isMasterAdmin ? 'admin' : 'creator',
        avatar: isMasterAdmin ? '👑' : '✨',
        provider: 'email',
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      if (!existing) {
        db.push(registeredUserRecord);
      } else {
        existing.name = registeredUserRecord.name;
        existing.password = password;
        existing.lastLoginAt = registeredUserRecord.lastLoginAt;
      }
      saveLocalUsersDB(db);

      const fullUser: User = {
        id: registeredUserRecord.id,
        email: registeredUserRecord.email,
        name: registeredUserRecord.name,
        avatar: registeredUserRecord.avatar || '✨',
        role: registeredUserRecord.role,
        isAdmin: isMasterAdmin || registeredUserRecord.role === 'admin',
        provider: 'email',
        createdAt: registeredUserRecord.createdAt,
        lastLoginAt: registeredUserRecord.lastLoginAt,
      };

      const tokenStr = `tok_reg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      saveSession(fullUser, tokenStr);
      setIsAuthModalOpen(false);
      return fullUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ token }),
        });
      }
    } catch (e) {
      // ignore
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.clear();
      setIsAdminDashboardOpen(false);
    }
  };

  const openAuthModal = (mode: 'login' | 'register' | 'google' = 'login') => {
    if (user && mode !== 'google') {
      return;
    }
    setAuthModalInitialMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openAdminDashboard = () => {
    setIsAdminDashboardOpen(true);
  };

  const closeAdminDashboard = () => {
    setIsAdminDashboardOpen(false);
  };

  const isAuthenticated = !!user;
  const isAdmin = !!user && (user.email.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase() || user.role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isLoading,
        loginWithEmail,
        loginWithGoogle,
        loginAsGuest,
        quickAdminLogin,
        registerWithEmail,
        logout,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalInitialMode,
        isAdminDashboardOpen,
        openAdminDashboard,
        closeAdminDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
