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
import { Sparkles, Edit3 } from 'lucide-react';
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
  const pathMatch = pathname.match(/^\/(?:c|p|card|r|view)\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch) {
    pathId = pathMatch[1];
  }

  const urlParams = new URLSearchParams(search);
  const pageId = pathId || urlParams.get('p') || urlParams.get('c') || urlParams.get('id') || urlParams.get('card');
  const forceView = urlParams.get('view') || urlParams.get('v');
  const chatParam = urlParams.get('chat');
  const keyParam = urlParams.get('key') || '';
  const hasHash = Boolean(hash && hash.length > 5);

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
    hash,
    isChat: chatParam === '1' || chatParam === 'true' || chatParam === 'chat',
    chatKey: keyParam,
  };
}

function MainApp() {
  const { user, isAuthenticated, token, openAuthModal, isLoading: isAuthContextLoading } = useAuth();

  // Instant synchronous detection of receiver visitor on initial load
  const initialUrlState = React.useMemo(() => getInitialUrlReceiverState(), []);

  const [pageData, setPageData] = useState<HeartPageData>(() => getCleanDefaultTemplate(user?.name));
  const [isReceiverMode, setIsReceiverMode] = useState<boolean>(() => initialUrlState.isReceiver);
  const [isLoadingShared, setIsLoadingShared] = useState<boolean>(() => initialUrlState.isReceiver);
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

        let loadedData: HeartPageData | null = null;

        // A. Decode from Hash first (instant, 100% resilient across any hosting / device / offline)
        if (urlState.hash && urlState.hash.length > 5) {
          const decoded = decodePageDataFromHash(urlState.hash);
          if (decoded && (decoded.hero || decoded.id)) {
            if (!decoded.chatKey) {
              decoded.chatKey = `LOVE-${Math.floor(1000 + Math.random() * 9000)}`;
            }
            loadedData = decoded;
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

        // B. Local Storage cache (for creator previews or same browser visits)
        if (urlState.pageId) {
          try {
            const cached =
              localStorage.getItem(`heartpage_card_${urlState.pageId}`) ||
              localStorage.getItem(`heartpage_draft_${urlState.pageId}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && (parsed.hero || parsed.id)) {
                if (!parsed.chatKey) {
                  parsed.chatKey = `LOVE-${Math.floor(1000 + Math.random() * 9000)}`;
                }
                loadedData = parsed;
                setPageData(parsed);
                setIsLoadingShared(false);
              }
            }
          } catch (e) {}

          // C. Fetch from live Server API
          try {
            const res = await fetch(`/api/pages/${urlState.pageId}`);
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('application/json')) {
              const serverData = await res.json();
              if (serverData && (serverData.hero || serverData.id)) {
                if (!serverData.chatKey) {
                  serverData.chatKey = `LOVE-${Math.floor(1000 + Math.random() * 9000)}`;
                }
                loadedData = serverData;
                setPageData(serverData);
                try {
                  localStorage.setItem(`heartpage_card_${urlState.pageId}`, JSON.stringify(serverData));
                } catch (e) {}
                setIsLoadingShared(false);
                return;
              }
            }
          } catch (e) {
            console.warn('Could not fetch from server, using local/fallback card:', e);
          }

          if (loadedData) {
            setIsLoadingShared(false);
            return;
          }

          // D. Fallback if card was shared with bare ID on static host without hash:
          // Provide a sweet, functioning greeting card rather than showing Auth page!
          const fallbackCard = getCleanDefaultTemplate();
          fallbackCard.id = urlState.pageId;
          fallbackCard.hero.mainTitle = 'A Special Surprise For You ❤️';
          fallbackCard.hero.subtitle = 'Created with infinite love and care.';
          setPageData(fallbackCard);
          setIsLoadingShared(false);
          return;
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
    const cleanShortUrl = `${origin}/?p=${payload.id}`;

    // Cache locally immediately so link works offline & instantly
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

    return cleanShortUrl;
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

    return (
      <div className="relative">
        <ReceiverExperience
          data={pageData}
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


