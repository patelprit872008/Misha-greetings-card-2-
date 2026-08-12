/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HeartPageData } from './types';
import { TEMPLATE_PRESETS } from './data/templates';
import { encodePageDataToHash, decodePageDataFromHash } from './utils/compression';
import { CreatorStudio } from './components/editor/CreatorStudio';
import { ReceiverExperience } from './components/receiver/ReceiverExperience';
import { Sparkles, Edit3, Clock, Heart, ArrowLeft, Plus } from 'lucide-react';
import { unlockAudio } from './utils/audio';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { AdminDashboardModal } from './components/admin/AdminDashboardModal';
import { MishaLoadingScreen } from './components/brand/MishaLoadingScreen';

const GUEST_DRAFT_KEY = 'misha_guest_draft_v1';

export const getCleanDefaultTemplate = (userName?: string): HeartPageData => {
  return {
    ...TEMPLATE_PRESETS[0].data,
    id: `card-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    chatKey: `LOVE-${Math.floor(1000 + Math.random() * 9000)}`,
    hero: {
      ...TEMPLATE_PRESETS[0].data.hero,
      senderName: userName || '',
      receiverName: '',
      receiverNickname: '',
    },
    counter: {
      ...TEMPLATE_PRESETS[0].data.counter,
      enabled: false,
      date: new Date().toISOString().split('T')[0],
    },
    photos: {
      enabled: true,
      title: 'Our Sweetest Moments Together 📸',
      subtitle: 'Tap any photo to read the secret memory written behind it!',
      photos: [], // Empty default so each user uploads and sees ONLY their own photos
    },
    timedUnlock: {
      enabled: false,
      unlockAt: '',
      lockedTitle: '',
      lockedMessage: '',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// Helper to check if current visitor is viewing a card/receiver link
export interface UrlReceiverState {
  isReceiver: boolean;
  pageId: string | null;
  hasHash: boolean;
  hash: string;
  isChat: boolean;
  chatKey: string;
}

export function getInitialUrlReceiverState(): UrlReceiverState {
  if (typeof window === 'undefined') {
    return { isReceiver: false, pageId: null, hasHash: false, hash: '', isChat: false, chatKey: '' };
  }
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  const pathname = window.location.pathname || '';

  let pathId: string | null = null;
  const pathMatch = pathname.match(/^\/(?:g|c|p|card|r|view)\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch) {
    pathId = pathMatch[1];
  }

  const urlParams = new URLSearchParams(search);
  const pageId = pathId || urlParams.get('g') || urlParams.get('p') || urlParams.get('c') || urlParams.get('id') || urlParams.get('card');
  const forceView = urlParams.get('view') || urlParams.get('v');
  const chatParam = urlParams.get('chat');
  const keyParam = urlParams.get('key') || '';
  
  // Extract data hash from hash or search query (?d=... or ?data=...) if any legacy links
  const queryData = urlParams.get('d') || urlParams.get('data');
  let effectiveHash = hash && hash.length > 2 ? hash : '';
  if (!effectiveHash && queryData) {
    effectiveHash = `#d=${queryData}`;
  }
  const hasHash = Boolean(effectiveHash && effectiveHash.length > 2);

  const isReceiver = Boolean(
    pageId ||
    hasHash ||
    chatParam === '1' ||
    chatParam === 'true' ||
    chatParam === 'chat' ||
    forceView === 'receiver' ||
    forceView === 'card' ||
    forceView === 'r'
  );

  return {
    isReceiver,
    pageId,
    hasHash,
    hash: effectiveHash,
    isChat: chatParam === '1' || chatParam === 'true' || chatParam === 'chat',
    chatKey: keyParam,
  };
}

// Helper to robustly extract and normalize HeartPageData from any server response
function extractAndNormalizeGreeting(serverResponse: any): HeartPageData | null {
  if (!serverResponse) return null;

  let rawData: any = null;
  if (serverResponse.project_json && typeof serverResponse.project_json === 'object') {
    rawData = serverResponse.project_json;
  } else if (serverResponse.greeting?.project_json && typeof serverResponse.greeting.project_json === 'object') {
    rawData = serverResponse.greeting.project_json;
  } else if (serverResponse.hero && typeof serverResponse.hero === 'object') {
    rawData = serverResponse;
  }

  if (!rawData || typeof rawData !== 'object') return null;

  const defaultTmpl = getCleanDefaultTemplate();
  const normalized: HeartPageData = {
    ...defaultTmpl,
    ...rawData,
    id: rawData.id || serverResponse.id || defaultTmpl.id,
    short_id: rawData.short_id || rawData.shortId || serverResponse.short_id || serverResponse.shortId,
    shortId: rawData.short_id || rawData.shortId || serverResponse.short_id || serverResponse.shortId,
    chatKey: (rawData.chatKey || serverResponse.chatKey || 'LOVE-1430').trim().toUpperCase(),
    theme: rawData.theme || defaultTmpl.theme,
    particleEffect: rawData.particleEffect || defaultTmpl.particleEffect,
    musicTrack: rawData.musicTrack || defaultTmpl.musicTrack,
    customMusicUrl: rawData.customMusicUrl,
    customMusicName: rawData.customMusicName,
    hero: {
      ...defaultTmpl.hero,
      ...(rawData.hero || {}),
    },
    envelope: {
      ...defaultTmpl.envelope,
      ...(rawData.envelope || {}),
    },
    counter: {
      ...defaultTmpl.counter,
      ...(rawData.counter || {}),
    },
    question: {
      ...defaultTmpl.question,
      ...(rawData.question || {}),
    },
    cake: {
      ...defaultTmpl.cake,
      ...(rawData.cake || {}),
    },
    photos: {
      ...defaultTmpl.photos,
      ...(rawData.photos || {}),
      photos: Array.isArray(rawData.photos?.photos)
        ? rawData.photos.photos
        : (Array.isArray(rawData.photos) ? rawData.photos : []),
    },
    scratchCard: {
      ...defaultTmpl.scratchCard,
      ...(rawData.scratchCard || {}),
    },
    reasons: {
      ...defaultTmpl.reasons,
      ...(rawData.reasons || {}),
      reasons: Array.isArray(rawData.reasons?.reasons)
        ? rawData.reasons.reasons
        : (Array.isArray(rawData.reasons) ? rawData.reasons : []),
    },
    letter: {
      ...defaultTmpl.letter,
      ...(rawData.letter || {}),
      paragraphs: Array.isArray(rawData.letter?.paragraphs)
        ? rawData.letter.paragraphs
        : (typeof rawData.letter?.body === 'string'
            ? rawData.letter.body.split('\n\n')
            : defaultTmpl.letter.paragraphs),
    },
    receiverResponse: {
      ...defaultTmpl.receiverResponse,
      ...(rawData.receiverResponse || {}),
    },
    timedUnlock: rawData.timedUnlock || rawData.envelope?.timedUnlock || {
      enabled: false,
      unlockAt: '',
      lockedTitle: '',
      lockedMessage: '',
    },
  };

  return normalized;
}

function MainApp() {
  const { user, isAuthenticated, token, openAuthModal, isLoading: isAuthContextLoading } = useAuth();

  // Instant synchronous detection of receiver visitor on initial load
  const initialUrlState = React.useMemo(() => getInitialUrlReceiverState(), []);

  // Synchronously decode card data from hash on first render if present
  const [pageData, setPageData] = useState<HeartPageData>(() => {
    if (initialUrlState.hasHash && initialUrlState.hash) {
      const decoded = decodePageDataFromHash(initialUrlState.hash);
      if (decoded && (decoded.hero || decoded.id)) {
        if (!decoded.chatKey) {
          decoded.chatKey = `LOVE-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        return decoded;
      }
    }
    return getCleanDefaultTemplate(user?.name);
  });

  const [isReceiverMode, setIsReceiverMode] = useState<boolean>(() => initialUrlState.isReceiver);
  const [isCardExpired, setIsCardExpired] = useState<boolean>(false);
  const [isLoadingShared, setIsLoadingShared] = useState<boolean>(() => {
    // If hash was decoded synchronously, no loading spinner needed!
    if (initialUrlState.hasHash && initialUrlState.hash) {
      const decoded = decodePageDataFromHash(initialUrlState.hash);
      if (decoded && (decoded.hero || decoded.id)) {
        return false;
      }
    }
    return initialUrlState.isReceiver;
  });
  const [isBrandIntroLoading, setIsBrandIntroLoading] = useState<boolean>(() => !initialUrlState.isReceiver);
  const [initialChatOpen, setInitialChatOpen] = useState<boolean>(() => initialUrlState.isChat);
  const [initialChatKey, setInitialChatKey] = useState<string>(() => initialUrlState.chatKey);

  // Helper to get storage key per account
  const getUserDraftKey = (userId?: string) => (userId ? `misha_user_draft_${userId}` : GUEST_DRAFT_KEY);

  // When user logs in, switches accounts, or logs out -> isolate draft per user (Only in Creator Mode)
  useEffect(() => {
    if (isReceiverMode || initialUrlState.isReceiver) return;

    // Check if viewing a specific card from URL (hash or ?p=)
    const urlState = getInitialUrlReceiverState();
    if (urlState.isReceiver) return;

    if (user?.id) {
      // Load this specific user's draft if it exists
      try {
        const userDraftKey = getUserDraftKey(user.id);
        const savedDraft = localStorage.getItem(userDraftKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (!parsed.chatKey) {
            parsed.chatKey = `LOVE-${Math.floor(1000 + Math.random() * 9000)}`;
          }
          setPageData(parsed);
          return;
        }
      } catch (e) {}

      // Fresh pristine card for new account
      setPageData(getCleanDefaultTemplate(user.name));
    } else {
      // Logged out / guest
      setPageData(getCleanDefaultTemplate());
    }
  }, [user?.id, user?.name, isReceiverMode, initialUrlState.isReceiver]);

  // Parse URL on mount: Check for clean short links (?p=ID, /c/ID, /p/ID) or encoded hash
  useEffect(() => {
    // Clean legacy storage
    try {
      localStorage.removeItem('heartpage_draft_v1');
      localStorage.removeItem('heartpage_draft');
      localStorage.removeItem('heartpage_session_draft_v2');
      sessionStorage.removeItem('heartpage_session_draft_v2');
    } catch (e) {}

    const initPage = async () => {
      const urlState = getInitialUrlReceiverState();

      // 💌 1. RECEIVER MODE: If link has any card ID, hash, or receiver query
      if (urlState.isReceiver) {
        setIsReceiverMode(true);
        setIsBrandIntroLoading(false);

        if (urlState.isChat) {
          setInitialChatOpen(true);
        }
        if (urlState.chatKey) {
          setInitialChatKey(urlState.chatKey);
        }

        // A. Decode from Hash first (instant, 100% resilient across any hosting / device / offline)
        if (urlState.hash && urlState.hash.length > 5) {
          const decoded = decodePageDataFromHash(urlState.hash);
          if (decoded && (decoded.hero || decoded.id)) {
            if (!decoded.chatKey) {
              decoded.chatKey = `LOVE-${Math.floor(1000 + Math.random() * 9000)}`;
            }
            setPageData(decoded);
            try {
              if (decoded.id) {
                localStorage.setItem(`heartpage_card_${decoded.id}`, JSON.stringify(decoded));
              }
            } catch (e) {}
            setIsLoadingShared(false);
            return;
          }
        }

        // B. Fetch from live Server API (/api/g/:shortId or /api/pages/:id)
        if (urlState.pageId) {
          setIsLoadingShared(true);

          try {
            const cleanId = encodeURIComponent(urlState.pageId.trim());
            const fetchEndpoints = [
              `/api/g/${cleanId}`,
              `/api/greetings/${cleanId}`,
              `/api/pages/${cleanId}`,
            ];

            let cardExpired = false;
            let foundCard = false;

            for (const endpoint of fetchEndpoints) {
              try {
                const res = await fetch(endpoint);
                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                  const serverResponse = await res.json();

                  // Only if explicitly expired after 30-day retention
                  if (res.status === 410 || serverResponse?.expired === true) {
                    cardExpired = true;
                    break;
                  }

                  if (res.ok && serverResponse && !serverResponse.expired) {
                    const normalized = extractAndNormalizeGreeting(serverResponse);
                    if (normalized && (normalized.hero || normalized.id)) {
                      setPageData(normalized);
                      try {
                        localStorage.setItem(`heartpage_card_${urlState.pageId}`, JSON.stringify(normalized));
                        if (normalized.id) {
                          localStorage.setItem(`heartpage_card_${normalized.id}`, JSON.stringify(normalized));
                        }
                      } catch (e) {}
                      setIsLoadingShared(false);
                      foundCard = true;
                      return;
                    }
                  }
                }
              } catch (e) {
                // Try next endpoint
              }
            }

            if (cardExpired) {
              setIsCardExpired(true);
              setIsLoadingShared(false);
              return;
            }

            if (!foundCard) {
              // Check if offline cache exists
              try {
                const cached =
                  localStorage.getItem(`heartpage_card_${urlState.pageId}`) ||
                  localStorage.getItem(`heartpage_draft_${urlState.pageId}`);
                if (cached) {
                  const parsed = JSON.parse(cached);
                  const normalized = extractAndNormalizeGreeting(parsed);
                  if (normalized && (normalized.hero || normalized.id)) {
                    setPageData(normalized);
                    setIsLoadingShared(false);
                    return;
                  }
                }
              } catch (e) {}

              // Card not found
              setIsCardExpired(true);
              setIsLoadingShared(false);
              return;
            }
          } catch (e) {
            console.warn('Could not fetch from server:', e);
            setIsCardExpired(true);
            setIsLoadingShared(false);
            return;
          }
        }

        setIsLoadingShared(false);
        return;
      }

      // 🛠️ 2. CREATOR FLOW: Default homepage for card creation
      try {
        const activeKey = getUserDraftKey(user?.id);
        const savedDraft = localStorage.getItem(activeKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (!parsed.chatKey) {
            parsed.chatKey = `LOVE-${Math.floor(1000 + Math.random() * 9000)}`;
          }
          setPageData(parsed);
        } else {
          setPageData(getCleanDefaultTemplate(user?.name));
        }
      } catch (e) {
        setPageData(getCleanDefaultTemplate(user?.name));
      }

      setIsLoadingShared(false);

      const timer = setTimeout(() => {
        setIsBrandIntroLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    };

    initPage();
  }, []);

  // Save changes isolated per user account
  const handleDataChange = (newData: HeartPageData) => {
    setPageData(newData);
    try {
      const activeKey = getUserDraftKey(user?.id);
      localStorage.setItem(activeKey, JSON.stringify(newData));
      if (newData.id) {
        localStorage.setItem(`heartpage_card_${newData.id}`, JSON.stringify(newData));
      }
    } catch (e) {}
  };

  // Reset to fresh draft for current user
  const handleResetDraft = () => {
    try {
      const activeKey = getUserDraftKey(user?.id);
      localStorage.removeItem(activeKey);
    } catch (e) {}
    const fresh = getCleanDefaultTemplate(user?.name);
    setPageData(fresh);
  };

  // Save to Server endpoint (Permanent server link with disk persistence & clean short URL)
  const handleSaveToServer = async (dataToSave?: HeartPageData): Promise<string | undefined> => {
    const payload = dataToSave || pageData;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let fallbackShortUrl = `${origin}/g/${payload.short_id || payload.id}`;

    // Cache locally immediately
    try {
      if (payload && payload.id) {
        localStorage.setItem(`heartpage_card_${payload.id}`, JSON.stringify(payload));
        // Add to cards index
        const indexKey = 'misha_saved_cards_db';
        const existingIndex: any[] = JSON.parse(localStorage.getItem(indexKey) || '[]');
        const filtered = existingIndex.filter((c: any) => c.id !== payload.id);
        filtered.unshift({
          id: payload.id,
          title: payload.hero.title || 'Untitled Card',
          senderName: payload.hero.senderName,
          receiverName: payload.hero.receiverName,
          category: payload.category || 'romantic',
          createdAt: new Date().toISOString(),
          creatorEmail: user?.email || 'creator@misha.app',
          creatorName: user?.name || 'Creator',
        });
        localStorage.setItem(indexKey, JSON.stringify(filtered.slice(0, 100)));
      }
    } catch (e) {}

    const activeToken = token || localStorage.getItem('misha_auth_token') || 'tok_creator_session';

    // 1. Try primary server publish endpoint (/api/greetings/publish)
    try {
      const res = await fetch('/api/greetings/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          project_json: payload,
          title: payload.hero.title || 'Romantic Greeting',
          recipient_name: payload.hero.receiverName || payload.hero.receiverNickname,
          sender_name: payload.hero.senderName,
        }),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const result = await res.json();
          if (result && result.success && result.url) {
            if (result.short_id) {
              setPageData((prev) => ({
                ...prev,
                short_id: result.short_id,
              }));
              try {
                localStorage.setItem(`heartpage_card_${result.short_id}`, JSON.stringify({ ...payload, short_id: result.short_id }));
              } catch (e) {}
            }
            return result.url;
          }
        }
      }
    } catch (err) {
      console.warn('Publish to /api/greetings/publish failed, falling back to /api/pages:', err);
    }

    // 2. Fallback to /api/pages
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          ...payload,
          creatorEmail: user?.email,
          creatorName: user?.name,
        }),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const result = await res.json();
          if (result && result.url) {
            return result.url;
          }
        }
      }
    } catch (err) {
      console.warn('Save to server API call failed, using local short URL fallback:', err);
    }

    return fallbackShortUrl;
  };

  // Handle reaction from receiver
  const handleSendReaction = async (reaction: string, customNote?: string) => {
    try {
      // Save locally first
      const reactionsKey = `heartpage_reactions_${pageData.id}`;
      const existing = JSON.parse(localStorage.getItem(reactionsKey) || '[]');
      existing.unshift({
        reaction,
        note: customNote,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(reactionsKey, JSON.stringify(existing.slice(0, 20)));

      await fetch(`/api/pages/${pageData.id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction, note: customNote }),
      });
    } catch (e) {
      console.warn('Reaction saved locally', e);
    }
  };

  // 1. RECEIVER VIEW: 100% Dedicated 1-Page Website with zero creator clutter
  if (isReceiverMode) {
    if (isLoadingShared) {
      return (
        <div className="min-h-screen bg-[#0d0d11] text-stone-300 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-300">
              Unwrapping your card... ✨
            </p>
          </div>
        </div>
      );
    }

    if (isCardExpired) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f0c15] via-[#161220] to-[#0c0a12] text-stone-200 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Subtle Ambient Background */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative max-w-md w-full bg-stone-900/90 border border-white/10 rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-5">
            {/* Expired Badge / Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg">
              <Clock size={32} />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                ⏳ 30-Day Retention Expired
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-serif-display mt-2">
                This Greeting Link Has Expired
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-sm mx-auto">
                In accordance with our privacy and data retention policy, personalized greeting links remain active for exactly <strong>30 days</strong> and are automatically removed once expired.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  window.location.href = window.location.origin;
                }}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus size={18} />
                <span>Create a New Greeting Card ❤️</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = window.location.origin;
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-stone-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <ReceiverExperience
          data={pageData}
          isCreatorPreview={false}
          initialChatOpen={initialChatOpen}
          initialChatKey={initialChatKey}
          onSendReaction={handleSendReaction}
          onCreateYourOwn={() => {
            // Clear URL query/hash to open clean creator
            window.location.href = window.location.origin;
          }}
        />
      </div>
    );
  }

  // 2. CREATOR FLOW: Branded Loading Screen with Misha Greetings Card Logo
  if (isBrandIntroLoading || isAuthContextLoading) {
    return <MishaLoadingScreen message="Loading Misha Greetings Studio..." />;
  }

  // 3. AUTH GATE: If user has logged out or is not logged in, show Auth Page
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // 4. CREATOR STUDIO DASHBOARD: When user is authenticated, directly show the Studio
  return (
    <CreatorStudio
      data={pageData}
      onChange={handleDataChange}
      onSaveToServer={handleSaveToServer}
      onResetDraft={handleResetDraft}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
      <AuthModal />
      <AdminDashboardModal />
    </AuthProvider>
  );
}


