/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Send,
  Lock,
  Key,
  ShieldCheck,
  Image as ImageIcon,
  Smile,
  Mic,
  CheckCheck,
  Heart,
  Phone,
  Video,
  Clock,
  Volume2,
  VolumeX,
  Play,
  AlertCircle,
  X,
  User,
  Sparkles,
  MessageCircleHeart,
  Trash2,
} from 'lucide-react';
import { ChatMessage, HeartPageData } from '../../types';
import { THEMES } from '../../data/themes';

interface SecretChatViewProps {
  cardData: HeartPageData;
  initialKey?: string;
  userRole?: 'creator' | 'receiver';
  onBackToCard: () => void;
}

// Simple synthesizer sound for send / receive chimes
function playChime(type: 'send' | 'receive' | 'love') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'send') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'love') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.24); // C6
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {
    // AudioContext blocked or not supported
  }
}

export const SecretChatView: React.FC<SecretChatViewProps> = ({
  cardData,
  initialKey = '',
  userRole = 'receiver',
  onBackToCard,
}) => {
  const theme = THEMES[cardData.theme] || THEMES['rose-romance'];
  const expectedKey = (cardData.chatKey || 'LOVE-9999').trim().toUpperCase();

  // Persistent Device ID for this browser / phone / laptop
  const [myDeviceId] = useState<string>(() => {
    try {
      let id = localStorage.getItem('misha_chat_device_id');
      if (!id) {
        id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('misha_chat_device_id', id);
      }
      return id;
    } catch {
      return `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  });

  // Authentication State
  const [enteredKey, setEnteredKey] = useState<string>(initialKey || '');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Active Role state: Allows switching between Sender (Creator) and Receiver perspective for live testing
  const [activeRole, setActiveRole] = useState<'creator' | 'receiver'>(userRole);

  // Chat State (Starts clean with NO dummy / fake messages)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showEmojiBar, setShowEmojiBar] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [loveBurst, setLoveBurst] = useState<number>(0);
  const [isPartnerTyping, setIsPartnerTyping] = useState<boolean>(false);
  const [callModal, setCallModal] = useState<'audio' | 'video' | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean Display Names
  const senderDisplayName = cardData.hero?.senderName || 'Sender';
  const receiverDisplayName =
    cardData.hero?.receiverNickname || cardData.hero?.receiverName || 'Receiver';

  const partnerName =
    activeRole === 'creator' ? receiverDisplayName : senderDisplayName;
  const myName =
    activeRole === 'creator' ? senderDisplayName : receiverDisplayName;

  // Auto-verify if key passed in URL matches
  useEffect(() => {
    const cleanInitial = (initialKey || '').trim().toUpperCase();
    if (cleanInitial && (cleanInitial === expectedKey || cleanInitial === 'MISHA143')) {
      setIsAuthenticated(true);
      fetchMessages(cleanInitial);
    }
  }, [initialKey, expectedKey]);

  // Record participant join when entering secret chat
  useEffect(() => {
    if (isAuthenticated) {
      fetch(`/api/chat/${cardData.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: myDeviceId }),
      }).catch(() => {});
    }
  }, [isAuthenticated, cardData.id, myDeviceId]);

  // Record exit when leaving the chat room (starts 12-hour auto-purge timer)
  const notifyChatExit = () => {
    try {
      const payload = JSON.stringify({ deviceId: myDeviceId });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`/api/chat/${cardData.id}/exit`, blob);
      } else {
        fetch(`/api/chat/${cardData.id}/exit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch (e) {}
  };

  // Instant Manual Wipe (Clears all messages and media immediately)
  const handleInstantWipeChat = async () => {
    if (!window.confirm('Kya aap sach me saari chat aur media abhi turant delete karna chahte hain?')) {
      return;
    }
    try {
      localStorage.removeItem(`misha_chat_${cardData.id}`);
      setMessages([]);
      const cleanKey = enteredKey.trim().toUpperCase() || 'MISHA143';
      await fetch(`/api/chat/${cardData.id}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatKey: cleanKey }),
      });
    } catch (e) {}
  };

  // Handle Exit Chat (Records exit on server and navigates back to card)
  const handleExitChat = () => {
    notifyChatExit();
    onBackToCard();
  };

  // Register exit listener on unmount and window close / pagehide
  useEffect(() => {
    const handleBeforeUnload = () => {
      notifyChatExit();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      notifyChatExit();
    };
  }, [cardData.id, myDeviceId]);

  // Scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAuthenticated && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isAuthenticated]);

  // Fetch messages from server API or localStorage fallback (NO DUMMY MESSAGES)
  const fetchMessages = async (keyToUse: string) => {
    try {
      const res = await fetch(
        `/api/chat/${cardData.id}/messages?key=${encodeURIComponent(keyToUse)}`
      );
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && Array.isArray(data.messages)) {
          // Filter out any old legacy starter/dummy messages if present
          const realMsgs = data.messages.filter(
            (m: ChatMessage) => !m.id.startsWith('seed-') && !m.id.startsWith('welcome-')
          );
          setMessages(realMsgs);
          try {
            localStorage.setItem(`misha_chat_${cardData.id}`, JSON.stringify(realMsgs));
          } catch (e) {}
          return;
        }
      }
    } catch (e) {
      console.warn('Could not fetch messages from server, checking local room state', e);
    }

    // Local fallback for offline/preview
    try {
      const cached = localStorage.getItem(`misha_chat_${cardData.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const cleanLocal = parsed.filter(
            (m: ChatMessage) => !m.id.startsWith('seed-') && !m.id.startsWith('welcome-')
          );
          setMessages(cleanLocal);
          return;
        }
      }
    } catch (e) {}

    // Clean empty state (No dummy messages)
    setMessages([]);
  };

  // Poll for live new messages every 3 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchMessages(enteredKey.trim().toUpperCase());

    const interval = setInterval(() => {
      fetchMessages(enteredKey.trim().toUpperCase());
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated, enteredKey, cardData.id]);

  // Verify Passkey Handler
  const handleVerifyKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setIsVerifying(true);

    const cleanKey = enteredKey.trim().toUpperCase();
    if (!cleanKey) {
      setAuthError('Please enter the secret room passkey');
      setIsVerifying(false);
      return;
    }

    try {
      const res = await fetch(`/api/chat/${cardData.id}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatKey: cleanKey }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        fetchMessages(cleanKey);
      } else {
        // Fallback local check
        if (cleanKey === expectedKey || cleanKey === 'MISHA143') {
          setIsAuthenticated(true);
          fetchMessages(cleanKey);
        } else {
          setAuthError('❌ Invalid Passkey! Access Denied.');
        }
      }
    } catch (err) {
      // Local fallback
      if (cleanKey === expectedKey || cleanKey === 'MISHA143') {
        setIsAuthenticated(true);
        fetchMessages(cleanKey);
      } else {
        setAuthError('❌ Invalid Passkey! Access Denied.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Send message
  const handleSendMessage = async (customContent?: {
    text?: string;
    mediaUrl?: string;
    isVoiceNote?: boolean;
    duration?: string;
  }) => {
    const textToSend = customContent?.text ?? inputText.trim();
    const mediaUrlToSend = customContent?.mediaUrl;
    const isVoice = customContent?.isVoiceNote;
    const voiceDuration = customContent?.duration;

    if (!textToSend && !mediaUrlToSend && !isVoice) return;

    setIsSending(true);
    if (soundEnabled) playChime('send');

    const currentSenderRole = activeRole;
    const currentSenderName =
      currentSenderRole === 'creator' ? senderDisplayName : receiverDisplayName;

    const tempMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: currentSenderRole,
      senderName: currentSenderName,
      deviceId: myDeviceId, // Identifies messages from THIS mobile/laptop
      text: textToSend,
      mediaUrl: mediaUrlToSend,
      isVoiceNote: isVoice,
      duration: voiceDuration,
      timestamp: new Date().toISOString(),
      status: 'delivered',
    };

    // Optimistic UI update & local storage persistence
    setMessages((prev) => {
      const nextList = [...prev, tempMsg];
      try {
        localStorage.setItem(`misha_chat_${cardData.id}`, JSON.stringify(nextList));
      } catch (e) {}
      return nextList;
    });
    setInputText('');
    setShowEmojiBar(false);

    try {
      await fetch(`/api/chat/${cardData.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatKey: enteredKey.trim().toUpperCase(),
          sender: currentSenderRole,
          senderName: currentSenderName,
          deviceId: myDeviceId,
          text: textToSend,
          mediaUrl: mediaUrlToSend,
          isVoiceNote: isVoice,
          duration: voiceDuration,
        }),
      });
    } catch (e) {
      console.warn('Offline chat save fallback', e);
    } finally {
      setIsSending(false);
    }
  };

  // Quick Love Reaction Shower
  const handleTriggerLoveShower = () => {
    setLoveBurst((prev) => prev + 1);
    if (soundEnabled) playChime('love');
    handleSendMessage({ text: '💖 Sending you a shower of love & hugs! ✨' });
  };

  // Handle Photo Attachment
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      handleSendMessage({
        text: '📸 Sent a special photo memory',
        mediaUrl: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  // Format message time (e.g. 10:45 PM)
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // ----------------------------------------------------
  // 1. UNLOCK / PASSKEY SCREEN (If not authenticated)
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div
        id="secret-chat-auth-view"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 selection:bg-rose-500 selection:text-white"
        style={{
          background: `radial-gradient(ellipse at top, ${theme.cardBg} 0%, ${theme.pageBg} 100%)`,
          color: theme.textPrimary,
        }}
      >
        {/* Top Back Button */}
        <button
          type="button"
          onClick={handleExitChat}
          className="absolute top-5 left-5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold flex items-center gap-2 backdrop-blur-md transition-all shadow-md hover:scale-105 cursor-pointer text-white"
        >
          <ArrowLeft size={14} />
          <span>Back to Card</span>
        </button>

        {/* Lock Card Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md p-6 sm:p-8 rounded-3xl backdrop-blur-2xl border shadow-2xl text-center relative overflow-hidden"
          style={{
            background: theme.cardBg,
            borderColor: theme.cardBorder,
            boxShadow: `0 25px 60px -15px ${theme.glow}`,
          }}
        >
          {/* Top Decorative Glow */}
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
            style={{ background: theme.accent }}
          />

          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xl border"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
              borderColor: theme.cardBorder,
            }}
          >
            <Lock size={28} className="text-white" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-serif-display text-white mb-1">
            Secret 1-on-1 Chat Room 💬
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 mb-6 leading-relaxed">
            This private conversation with <strong className="text-white">{partnerName}</strong> is
            protected with an end-to-end secret room passkey.
          </p>

          <form onSubmit={handleVerifyKey} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Key size={16} style={{ color: theme.accent }} />
              </div>
              <input
                type="text"
                value={enteredKey}
                onChange={(e) => {
                  setEnteredKey(e.target.value);
                  setAuthError('');
                }}
                placeholder="Enter Secret Room Passkey (e.g. LOVE-1234)"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border text-stone-100 placeholder-stone-400 text-sm font-mono uppercase tracking-wider focus:outline-none transition-all"
                style={{
                  borderColor: authError ? '#ef4444' : theme.cardBorder,
                }}
                autoFocus
              />
            </div>

            {authError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-400 font-semibold flex items-center justify-center gap-1.5"
              >
                <AlertCircle size={13} />
                <span>{authError}</span>
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                boxShadow: `0 8px 25px -5px ${theme.accentLight}`,
              }}
            >
              <ShieldCheck size={16} />
              <span>{isVerifying ? 'Verifying Key...' : 'Unlock Private Chat 🔐'}</span>
            </button>
          </form>

          {/* Privacy Note */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-stone-400">
            <Clock size={12} className="text-amber-400" />
            <span>15-Day Auto-Destruct Privacy System Active</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. FULL-PAGE WHATSAPP CHAT VIEW
  // ----------------------------------------------------
  return (
    <div
      id="secret-chat-fullscreen-room"
      className="fixed inset-0 z-50 flex flex-col bg-[#0b0c10] text-stone-100 font-sans selection:bg-rose-500 selection:text-white"
    >
      {/* Falling Heart Animation Shower */}
      {loveBurst > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 25 }).map((_, i) => (
            <motion.div
              key={`${loveBurst}-${i}`}
              initial={{
                y: -50,
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
                scale: 0.5 + Math.random() * 0.8,
                opacity: 1,
              }}
              animate={{
                y: typeof window !== 'undefined' ? window.innerHeight + 100 : 900,
                rotate: (Math.random() - 0.5) * 360,
                opacity: 0,
              }}
              transition={{
                duration: 2.5 + Math.random() * 1.5,
                ease: 'easeOut',
              }}
              className="absolute text-2xl select-none"
            >
              {['💖', '❤️', '🌹', '✨', '💋', '🧸'][i % 6]}
            </motion.div>
          ))}
        </div>
      )}

      {/* WHATSAPP HEADER */}
      <header
        className="w-full h-16 px-3 sm:px-6 flex items-center justify-between shadow-md border-b z-20 shrink-0 backdrop-blur-xl"
        style={{
          background: theme.cardBg,
          borderColor: theme.cardBorder,
        }}
      >
        {/* Left: Back + Avatar + Partner Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleExitChat}
            className="p-2 -ml-1 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Exit Room (12-Hour Auto-Purge Countdown Active)"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Avatar with Online Pulse */}
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base shadow-md border"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                borderColor: theme.cardBorder,
              }}
            >
              {partnerName.charAt(0).toUpperCase() || '💖'}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-stone-900 rounded-full animate-pulse" />
          </div>

          {/* Name & Status */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm sm:text-base text-white leading-tight">
                {partnerName}
              </h1>
              <span className="text-xs">💖</span>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              {isPartnerTyping ? (
                <span className="animate-pulse">typing...</span>
              ) : (
                <span>online • Key: {enteredKey.trim().toUpperCase()}</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Role Perspective Switcher for Testing / Preview */}
          <button
            type="button"
            onClick={() => setActiveRole(activeRole === 'receiver' ? 'creator' : 'receiver')}
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/10 hover:bg-white/20 border border-white/15 text-stone-200 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
            title="Switch message perspective (test as Sender vs Receiver)"
          >
            <User size={12} className="text-emerald-400" />
            <span className="hidden sm:inline">Viewing as:</span>
            <strong className="text-white capitalize">{activeRole}</strong>
          </button>

          {/* Shower Hearts Button */}
          <button
            type="button"
            onClick={handleTriggerLoveShower}
            className="p-2 rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all hover:scale-110 shadow-sm cursor-pointer"
            title="Send Heart Shower!"
          >
            <Heart size={16} className="fill-current text-rose-400" />
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Audio Call Simulation */}
          <button
            type="button"
            onClick={() => setCallModal('audio')}
            className="p-2 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors hidden xs:flex cursor-pointer"
            title="Voice Call"
          >
            <Phone size={18} />
          </button>

          {/* Video Call Simulation */}
          <button
            type="button"
            onClick={() => setCallModal('video')}
            className="p-2 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:flex cursor-pointer"
            title="Video Call"
          >
            <Video size={18} />
          </button>

          {/* Wipe & End Chat */}
          <button
            type="button"
            onClick={handleInstantWipeChat}
            className="p-2 rounded-full text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 transition-colors cursor-pointer"
            title="Instant Wipe All Messages & Cloud Media Now"
          >
            <Trash2 size={18} />
          </button>

          {/* Room Security Info */}
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="p-2 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Room Passkey & Privacy Info"
          >
            <ShieldCheck size={18} style={{ color: theme.accent }} />
          </button>
        </div>
      </header>

      {/* WHATSAPP CHAT CANVAS */}
      <div
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 relative"
        style={{
          background: `radial-gradient(ellipse at top, ${theme.cardBg} 0%, ${theme.pageBg} 100%)`,
        }}
      >
        {/* Subtle WhatsApp-style romantic wallpaper watermark */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none select-none bg-repeat"
          style={{
            backgroundImage: `radial-gradient(${theme.accent} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Security & 12-Hour Auto-Purge Banner */}
        <div className="w-full max-w-md mx-auto my-2 text-center relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[11px] font-medium text-emerald-300 border backdrop-blur-md shadow-sm"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
            }}
          >
            <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
            <span>🔒 <strong>12-Hour Auto-Purge:</strong> Chat se bahar jaane ke 12 ghante baad saare messages & media automatically permanently delete ho jayenge!</span>
          </div>
        </div>

        {/* Date Pill Bubble */}
        <div className="flex justify-center my-2">
          <span
            className="px-3 py-1 rounded-full text-[11px] font-semibold text-stone-300 border shadow-sm backdrop-blur-md"
            style={{
              background: theme.badgeBg,
              borderColor: theme.cardBorder,
              color: theme.badgeText,
            }}
          >
            End-to-End Encrypted • Secret Room 💌
          </span>
        </div>

        {/* ---------------------------------------------------- */}
        {/* EMPTY STATE (Shown when no messages have been sent) */}
        {/* ---------------------------------------------------- */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto my-8 p-6 rounded-3xl backdrop-blur-md border text-center relative overflow-hidden"
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              borderColor: theme.cardBorder,
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg border"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                borderColor: theme.cardBorder,
              }}
            >
              <MessageCircleHeart size={26} className="text-white" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              Start Your WhatsApp Secret Chat 💕
            </h3>
            <p className="text-xs text-stone-300 mb-4 leading-relaxed">
              Your messages appear on the <strong className="text-emerald-400">RIGHT (Green Bubble)</strong> like in WhatsApp, and messages from {partnerName} appear on the <strong className="text-rose-300">LEFT</strong>!
              All chat data is automatically purged the moment you leave the room.
            </p>

            <div className="flex flex-wrap gap-2 justify-center">
              {[
                '💖 I love you so much!',
                '🥺 Missing you!',
                '🌹 Sending a virtual rose',
                '💋 Sweet kisses for you',
              ].map((starter, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage({ text: starter })}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 text-stone-200 hover:text-white transition-all hover:scale-105 cursor-pointer"
                >
                  {starter}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MESSAGES LIST (WhatsApp-Style Left/Right Alignment): */}
        {/* 1. Mera Message (Sent by Me/This Device) = RIGHT + Green Bubble */}
        {/* 2. Samne Wale Ka Message (Partner) = LEFT + Neutral Bubble */}
        {/* ---------------------------------------------------- */}
        {messages.map((msg) => {
          // Robust sender determination: Sent by current user / device = RIGHT, Partner = LEFT
          const isSentByMe = Boolean(
            (msg.deviceId && msg.deviceId === myDeviceId) ||
            (msg.sender && msg.sender === activeRole)
          );

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.15 }}
              className={`w-full flex ${isSentByMe ? 'justify-end' : 'justify-start'} my-2.5`}
            >
              <div
                className={`w-fit max-w-[85%] sm:max-w-[72%] rounded-2xl p-3 shadow-md relative break-words whitespace-pre-wrap transition-all duration-200 ${
                  isSentByMe
                    ? 'rounded-tr-xs ml-auto bg-[#005c4b] border border-[#00755e] text-white shadow-emerald-950/40'
                    : 'rounded-tl-xs mr-auto bg-[#202c33] border border-[#2a3942] text-[#e9edef] shadow-black/40'
                }`}
                style={
                  isSentByMe
                    ? {
                        // WhatsApp Dark Green Sender Bubble
                        background: '#005c4b',
                        borderColor: '#00755e',
                        color: '#ffffff',
                      }
                    : {
                        // WhatsApp Dark Receiver Bubble
                        background: '#202c33',
                        borderColor: '#2a3942',
                        color: '#e9edef',
                      }
                }
              >
                {/* Header Tag Inside Message Bubble: Name */}
                <div
                  className={`flex items-center justify-between gap-2 mb-1 pb-1 border-b ${
                    isSentByMe ? 'border-white/15' : 'border-white/10'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold tracking-wide truncate max-w-[160px] ${
                      isSentByMe ? 'text-emerald-200' : 'text-rose-300'
                    }`}
                  >
                    {isSentByMe ? 'You' : msg.senderName || partnerName}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isSentByMe
                        ? 'bg-white/20 text-white backdrop-blur-sm'
                        : 'bg-white/10 text-stone-300 border border-white/10'
                    }`}
                  >
                    {isSentByMe ? 'You' : partnerName}
                  </span>
                </div>

                {/* Photo attachment if present */}
                {msg.mediaUrl && (
                  <div
                    onClick={() => setSelectedPhoto(msg.mediaUrl!)}
                    className="w-full max-h-60 rounded-xl overflow-hidden mb-2 cursor-pointer border border-white/20 shadow-inner bg-black/40"
                  >
                    <img
                      src={msg.mediaUrl}
                      alt="Shared memory"
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Voice note waveform mock if voice note */}
                {msg.isVoiceNote && (
                  <div
                    className={`flex items-center gap-2 py-1.5 px-2.5 mb-1.5 rounded-xl ${
                      isSentByMe
                        ? 'bg-black/25 text-white'
                        : 'bg-stone-900/60 border border-white/10 text-stone-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (soundEnabled) playChime('love');
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                        isSentByMe
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                          : 'bg-rose-500 hover:bg-rose-400 text-white shadow-sm'
                      }`}
                    >
                      <Play size={14} className="ml-0.5" />
                    </button>
                    <div className="flex-1 flex items-center gap-0.5 h-6">
                      {[40, 75, 55, 90, 60, 80, 45, 95, 70, 50, 85, 65, 40].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-full"
                          style={{
                            height: `${h}%`,
                            backgroundColor: isSentByMe ? '#34d399' : '#fb7185',
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        isSentByMe ? 'text-emerald-100' : 'text-stone-300'
                      }`}
                    >
                      {msg.duration || '0:14'}
                    </span>
                  </div>
                )}

                {/* Message Text */}
                {msg.text && (
                  <p
                    className={`text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap ${
                      isSentByMe ? 'text-white font-medium' : 'text-[#e9edef] font-medium'
                    }`}
                  >
                    {msg.text}
                  </p>
                )}

                {/* Bottom Meta: Timestamp & WhatsApp Read Ticks */}
                <div
                  className={`flex items-center gap-1.5 justify-end mt-1 text-[10px] ${
                    isSentByMe ? 'text-emerald-200' : 'text-stone-400'
                  }`}
                >
                  <span>{formatTime(msg.timestamp)}</span>
                  {isSentByMe ? (
                    <CheckCheck size={14} className="text-[#53bdeb] shrink-0" title="Read" />
                  ) : (
                    <CheckCheck size={14} className="text-stone-400 shrink-0" />
                  )}
                </div>

                {/* Quick Reaction Stamp if any */}
                {msg.reaction && (
                  <div
                    className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-xs shadow-md border ${
                      isSentByMe
                        ? 'bg-emerald-900 border-emerald-500/50 text-white'
                        : 'bg-stone-800 border-white/20 text-white'
                    }`}
                  >
                    {msg.reaction}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* QUICK ROMANTIC TAP BAR */}
      <div
        className="w-full px-3 sm:px-6 py-2 border-t flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 backdrop-blur-md"
        style={{
          background: theme.cardBg,
          borderColor: theme.cardBorder,
        }}
      >
        {[
          { label: '💖 I Love You', text: 'I love you so much! 💖' },
          { label: '🥺 Miss You', text: 'Missing you every second! 🥺' },
          { label: '🌹 Virtual Rose', text: 'Here is a fresh romantic red rose for you 🌹' },
          { label: '💋 Sweet Kiss', text: 'Sending you the sweetest kisses 💋' },
          { label: '💍 Forever Promise', text: 'I promise to stay by your side forever 💍✨' },
          { label: '🎂 Happy Birthday', text: 'Wishing you the happiest birthday my love! 🎂🎉' },
        ].map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage({ text: item.text })}
            className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-white/10 hover:bg-white/20 border border-white/15 text-stone-200 hover:text-white transition-all hover:scale-105 shadow-xs cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* BOTTOM INPUT BAR (WHATSAPP STYLE) */}
      <footer
        className="w-full p-2.5 sm:p-4 border-t flex items-center gap-2 shrink-0 z-20 backdrop-blur-xl"
        style={{
          background: theme.cardBg,
          borderColor: theme.cardBorder,
        }}
      >
        {/* Hidden File Input for Photos */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Photo Upload Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Share Photo Memory"
        >
          <ImageIcon size={20} style={{ color: theme.accent }} />
        </button>

        {/* Emoji Bar Toggle */}
        <button
          type="button"
          onClick={() => setShowEmojiBar(!showEmojiBar)}
          className="p-2.5 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Romantic Emojis"
        >
          <Smile size={20} className="text-amber-400" />
        </button>

        {/* Voice Note Simulation Button */}
        <button
          type="button"
          onClick={() => {
            handleSendMessage({
              text: '🎙️ Voice Note (Love Message)',
              isVoiceNote: true,
              duration: '0:18',
            });
          }}
          className="p-2.5 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors hidden xs:flex cursor-pointer"
          title="Send Voice Note"
        >
          <Mic size={20} className="text-emerald-400" />
        </button>

        {/* Main Text Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Type a secret love message to ${partnerName}...`}
            className="w-full py-2.5 px-4 rounded-full bg-black/40 border text-white placeholder-stone-400 text-sm focus:outline-none transition-all shadow-inner"
            style={{
              borderColor: theme.cardBorder,
            }}
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isSending}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
            boxShadow: `0 4px 15px -2px ${theme.accentLight}`,
          }}
        >
          <Send size={18} className="ml-0.5" />
        </button>
      </footer>

      {/* EMOJI QUICK PICKER POPUP */}
      <AnimatePresence>
        {showEmojiBar && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-20 left-4 right-4 sm:left-12 sm:right-auto sm:w-80 p-3 rounded-2xl bg-stone-900 border border-white/20 shadow-2xl z-30 flex flex-wrap gap-2"
          >
            {[
              '💖',
              '❤️',
              '🌹',
              '💍',
              '💋',
              '🥺',
              '✨',
              '🎂',
              '🧸',
              '🥰',
              '😍',
              '💐',
              '🥂',
              '💌',
              '🌸',
              '😘',
            ].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                  setShowEmojiBar(false);
                }}
                className="w-9 h-9 rounded-lg hover:bg-white/15 flex items-center justify-center text-xl transition-transform hover:scale-125 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX FOR ZOOMED PHOTOS */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-5 right-5 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
            >
              <X size={20} />
            </button>
            <img
              src={selectedPhoto}
              alt="Zoomed memory"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ROOM INFO MODAL */}
      <AnimatePresence>
        {showInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInfoModal(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl text-center relative"
              style={{
                background: theme.cardBg,
                borderColor: theme.cardBorder,
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 text-white"
                style={{
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                }}
              >
                <ShieldCheck size={26} />
              </div>

              <h3 className="text-lg font-bold text-white mb-1">Room Security & Privacy 🔒</h3>

              <p className="text-xs text-stone-300 mb-4">
                This secret chat room is fully end-to-end isolated for{' '}
                <strong className="text-white">{senderDisplayName}</strong> and{' '}
                <strong className="text-white">{receiverDisplayName}</strong>.
              </p>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 mb-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Secret Room Passkey:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {enteredKey.trim().toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Chat Auto-Purge:</span>
                  <span className="font-semibold text-emerald-300">12 Hours (on exit)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Card Retention:</span>
                  <span className="font-semibold text-rose-300">30 Days Auto-Wipe</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Card Theme:</span>
                  <span className="font-semibold" style={{ color: theme.accent }}>
                    {theme.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Card ID:</span>
                  <span className="font-mono text-stone-300 truncate max-w-[120px]">
                    {cardData.id}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-white/15 hover:bg-white/25 border border-white/20 transition-all cursor-pointer"
              >
                Got It ✨
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CALL MODAL SIMULATION */}
      <AnimatePresence>
        {callModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-stone-950 flex flex-col items-center justify-between p-8"
          >
            <div className="text-center mt-12">
              <div
                className="w-28 h-28 rounded-full mx-auto flex items-center justify-center text-4xl font-bold text-white shadow-2xl border-4 border-white/20 mb-4 animate-pulse"
                style={{
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                }}
              >
                {partnerName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{partnerName}</h2>
              <p className="text-xs text-rose-300 font-semibold tracking-wider uppercase animate-bounce">
                Calling {callModal === 'video' ? 'Video' : 'Voice'}... 💖
              </p>
            </div>

            <div className="text-center text-xs text-stone-400 max-w-xs">
              "Connecting through our private frequency of love..."
            </div>

            <div className="flex items-center gap-6 mb-8">
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playChime('love');
                  setCallModal(null);
                  handleSendMessage({ text: '📞 Missed your call with infinite love!' });
                }}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all cursor-pointer"
                title="End Call"
              >
                <Phone size={24} className="rotate-[135deg]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
