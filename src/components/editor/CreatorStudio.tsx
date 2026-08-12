/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Heart,
  Sparkles,
  Smartphone,
  Monitor,
  Share2,
  Wand2,
  Palette,
  Mail,
  Clock,
  HelpCircle,
  Cake,
  Image,
  Gift,
  ListOrdered,
  Feather,
  MessageSquare,
  Plus,
  Trash2,
  Eye,
  Check,
  Music,
  RotateCcw,
  Camera,
  Search,
  Upload,
  Dice5,
  Image as ImageIcon,
  MessageCircle,
  Lock,
  Key,
  ShieldCheck,
  QrCode,
  PartyPopper,
  Crown,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import {
  HeartPageData,
  ThemeId,
  ParticleType,
  MusicTrackId,
  PhotoItem,
  ReasonItem,
} from '../../types';
import { THEMES } from '../../data/themes';
import { TEMPLATE_PRESETS } from '../../data/templates';
import { PRESET_PHOTOS } from '../../data/photoPresets';
import { PHOTO_THEMES } from '../../data/photoThemes';
import { CAKE_THEMES, getCakeThemeById } from '../../data/cakeThemes';
import { ReceiverExperience } from '../receiver/ReceiverExperience';
import { SecretChatView } from '../chat/SecretChatView';
import { AiLetterWriterModal } from './AiLetterWriterModal';
import { AiCardGeneratorModal } from './AiCardGeneratorModal';
import { ShareModal } from './ShareModal';
import { QRCodeModal } from '../common/QRCodeModal';
import { ExportImageModal } from '../common/ExportImageModal';
import { ResetConfirmModal } from './ResetConfirmModal';
import { PhotoGalleryModal } from './PhotoGalleryModal';
import { MusicStudioSection } from './MusicStudioSection';
import { LogoutConfirmModal } from '../auth/LogoutConfirmModal';
import { triggerCelebrationConfetti } from '../../utils/confetti';
import { encodePageDataToHash } from '../../utils/compression';
import { useAuth } from '../../context/AuthContext';
import { MishaLogo } from '../brand/MishaLogo';

interface CreatorStudioProps {
  data: HeartPageData;
  onChange: (newData: HeartPageData) => void;
  onSaveToServer: (dataToSave?: HeartPageData) => Promise<string | undefined>;
  onResetDraft?: () => void;
}

type TabKey =
  | 'templates'
  | 'music'
  | 'hero'
  | 'envelope'
  | 'counter'
  | 'question'
  | 'photos'
  | 'scratch'
  | 'cake'
  | 'reasons'
  | 'letter'
  | 'chat'
  | 'response';

export const CreatorStudio: React.FC<CreatorStudioProps> = ({
  data,
  onChange,
  onSaveToServer,
  onResetDraft,
}) => {
  const { user, isAuthenticated, isAdmin, openAuthModal, openAdminDashboard, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('templates');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [isAiLetterModalOpen, setIsAiLetterModalOpen] = useState(false);
  const [isAiCardModalOpen, setIsAiCardModalOpen] = useState(false);
  const [isExportImageModalOpen, setIsExportImageModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPhotoGalleryModalOpen, setIsPhotoGalleryModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isTestChatOpen, setIsTestChatOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | undefined>(undefined);
  const [themeSearchQuery, setThemeSearchQuery] = useState('');
  const [selectedThemeCategory, setSelectedThemeCategory] = useState('All');
  const [cakeCategoryFilter, setCakeCategoryFilter] = useState('All');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper updates
  const update = (partial: Partial<HeartPageData>) => {
    onChange({
      ...data,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    const found = TEMPLATE_PRESETS.find((t) => t.id === templateId);
    if (!found) return;

    // Preserve custom user-typed names & nicknames if creator has modified them
    const hasCustomSender = Boolean(data.hero.senderName && data.hero.senderName !== 'Your Admirer');
    const hasCustomReceiver = Boolean(data.hero.receiverName && data.hero.receiverName !== 'My Sunshine');
    const hasCustomNickname = Boolean(data.hero.receiverNickname && data.hero.receiverNickname !== 'My Love 💖');
    const hasUserPhotos = Boolean(data.photos && data.photos.photos && data.photos.photos.length > 0);

    onChange({
      ...found.data,
      id: data.id,
      chatKey: data.chatKey || found.data.chatKey,
      hero: {
        ...found.data.hero,
        senderName: hasCustomSender ? data.hero.senderName : (user?.name || ''),
        receiverName: hasCustomReceiver ? data.hero.receiverName : '',
        receiverNickname: hasCustomNickname ? data.hero.receiverNickname : '',
      },
      photos: {
        ...found.data.photos,
        photos: hasUserPhotos ? data.photos.photos : [],
      },
      createdAt: data.createdAt,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleResetToBlank = () => {
    const blank: HeartPageData = {
      ...data,
      hero: {
        ...data.hero,
        receiverName: '',
        receiverNickname: '',
        senderName: '',
        title: 'For You',
        subtitle: 'A sweet surprise crafted just for you',
        badgeText: 'Special',
      },
      question: {
        ...data.question,
        question: 'Will you be mine forever?',
        yesButtonText: 'YES! 💖',
        noButtonText: 'No 💔',
        yesSuccessMessage: 'You just made me the happiest person in the universe! 💖✨',
      },
      scratchCard: {
        ...data.scratchCard,
        giftTitle: 'Secret Surprise',
        secretMessage: 'I will love you today, tomorrow, and forever.',
      },
      photos: {
        ...data.photos,
        photos: [],
      },
      reasons: {
        ...data.reasons,
        reasons: [],
      },
      letter: {
        ...data.letter,
        paragraphs: ['I wanted to take a moment to tell you how much you truly mean to me.'],
        signOff: 'Forever Yours,',
        authorSignature: '',
      },
      updatedAt: new Date().toISOString(),
    };
    onChange(blank);
  };

  // Client-side image compression for fast display and reliable link sharing
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadMediaToServer = async (dataUrl: string, filename?: string): Promise<string> => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, filename }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.url) return json.url;
      }
    } catch (e) {
      console.warn('Direct upload to /api/upload failed, using local data URL:', e);
    }
    return dataUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressedUrl = await compressImage(file);
        const persistentUrl = await uploadMediaToServer(compressedUrl, file.name);
        addPhoto(persistentUrl, file.name.replace(/\.[^/.]+$/, ''));
      } catch (err) {
        console.error('Failed to process image:', err);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleShareClick = async () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setIsSaving(true);
    try {
      const savedUrl = await onSaveToServer(data);
      if (savedUrl) {
        setPublishedUrl(savedUrl);
      }
    } catch (e) {
      console.error('Save to server error', e);
    } finally {
      setIsSaving(false);
      setIsShareModalOpen(true);
    }
  };

  // Photo handlers
  const addPhoto = (url: string, caption = 'Our sweet memory') => {
    const newPhoto: PhotoItem = {
      id: 'photo-' + Date.now(),
      url,
      caption,
      dateLocation: 'Special day',
      flipNote: 'I love you so much!',
      rotationDeg: (Math.random() - 0.5) * 6,
    };
    update({
      photos: {
        ...data.photos,
        enabled: true,
        photos: [...data.photos.photos, newPhoto],
      },
    });
  };

  const removePhoto = (id: string) => {
    update({
      photos: {
        ...data.photos,
        photos: data.photos.photos.filter((p) => p.id !== id),
      },
    });
  };

  // Reason handlers
  const addReason = () => {
    const newReason: ReasonItem = {
      id: 'r-' + Date.now(),
      title: 'Your Caring Heart',
      description: 'You always know how to make me smile even on my hardest days.',
      iconEmoji: '💖',
    };
    update({
      reasons: {
        ...data.reasons,
        enabled: true,
        reasons: [...data.reasons.reasons, newReason],
      },
    });
  };

  const removeReason = (id: string) => {
    update({
      reasons: {
        ...data.reasons,
        reasons: data.reasons.reasons.filter((r) => r.id !== id),
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#0d0d11] text-stone-100 flex flex-col font-body">
      {/* Top Main Navigation Bar */}
      <header className="h-16 border-b border-white/10 bg-stone-900/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between z-30 shrink-0 gap-2">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <MishaLogo size="sm" />
        </div>

        {/* Center: Device View Switcher */}
        <div className="hidden lg:flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setPreviewDevice('mobile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              previewDevice === 'mobile'
                ? 'bg-stone-800 text-white shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Smartphone size={14} />
            <span>Mobile Frame</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewDevice('desktop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              previewDevice === 'desktop'
                ? 'bg-stone-800 text-white shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Monitor size={14} />
            <span>Full Width</span>
          </button>
        </div>

        {/* Right Actions: AI Tools, Auth, Admin & Share */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* AI 1-Click Complete Card Generator */}
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                openAuthModal('login');
                return;
              }
              setIsAiCardModalOpen(true);
            }}
            className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 via-purple-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 border border-rose-400/40 transition-all flex items-center gap-1.5 shadow-md shadow-rose-950 cursor-pointer"
            title="Generate a complete personalized card with AI in 1 click"
          >
            <Sparkles size={14} className="text-amber-300 animate-pulse" />
            <span className="hidden sm:inline">AI Card Generator</span>
            <span className="sm:hidden">AI Card</span>
          </button>

          {/* AI Letter writer */}
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                openAuthModal('login');
                return;
              }
              setIsAiLetterModalOpen(true);
            }}
            className="hidden xl:flex px-3 py-2 rounded-xl text-xs font-semibold text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all items-center gap-1.5 cursor-pointer"
            title="Generate custom emotional message with AI"
          >
            <Wand2 size={13} className="text-amber-300" />
            <span>AI Letter</span>
          </button>

          {/* QR Code Quick Action */}
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="hidden sm:flex p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 transition-all items-center gap-1.5 cursor-pointer"
            title="View & Download Mobile QR Code or Printable Gift Card"
          >
            <QrCode size={14} className="text-rose-400" />
            <span className="hidden md:inline">QR Code</span>
          </button>

          {/* Export to Image / Story */}
          <button
            type="button"
            onClick={() => setIsExportImageModalOpen(true)}
            className="hidden md:flex px-2.5 py-2 rounded-xl text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 transition-all items-center gap-1.5 cursor-pointer"
            title="Save as high quality photo card / Instagram story"
          >
            <Camera size={14} className="text-rose-400" />
            <span className="hidden xl:inline">Save Image</span>
          </button>

          {/* Authentication Profile / Sign-in Widget */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border ${
                  isAdmin
                    ? 'border-amber-400/40 bg-gradient-to-r from-stone-800 to-amber-950/30 text-amber-200 hover:border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    : 'border-white/10 bg-stone-800 text-stone-200 hover:bg-stone-700'
                } text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer`}
              >
                <div className="relative shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs overflow-hidden shrink-0 ${
                      isAdmin
                        ? 'bg-amber-950/70 border border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.35)] ring-1 ring-amber-400/50'
                        : 'bg-stone-700 border border-white/20'
                    }`}
                  >
                    {user.avatar &&
                    (user.avatar.startsWith('http://') ||
                      user.avatar.startsWith('https://') ||
                      user.avatar.startsWith('data:')) ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'User'}
                        className="w-full h-full object-cover rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{user.avatar || (isAdmin ? '👑' : '✨')}</span>
                    )}
                  </div>
                  {isAdmin && (
                    <div
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-stone-950 flex items-center justify-center shadow-md border border-stone-950 z-10"
                      title="Master Admin VIP"
                    >
                      <Crown size={8} className="fill-current text-stone-950 stroke-[2.5]" />
                    </div>
                  )}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {user.name || 'Creator'}
                </span>
                {isAdmin && (
                  <span className="hidden md:inline px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-400 text-black shadow-xs">
                    Admin
                  </span>
                )}
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-stone-900 border border-white/15 rounded-2xl p-2 shadow-2xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs overflow-hidden ${
                          isAdmin
                            ? 'bg-amber-950/80 border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)] ring-2 ring-amber-500/30'
                            : 'bg-stone-700 border border-white/20'
                        }`}
                      >
                        {user.avatar &&
                        (user.avatar.startsWith('http://') ||
                          user.avatar.startsWith('https://') ||
                          user.avatar.startsWith('data:')) ? (
                          <img
                            src={user.avatar}
                            alt={user.name || 'User'}
                            className="w-full h-full object-cover rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span>{user.avatar || (isAdmin ? '👑' : '✨')}</span>
                        )}
                      </div>
                      {isAdmin && (
                        <div
                          className="absolute -top-2 -right-1 w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-stone-950 flex items-center justify-center shadow-lg border border-stone-950 z-10"
                          title="Master Admin"
                        >
                          <Crown size={9} className="fill-current text-stone-950 stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-white truncate">{user.name}</p>
                        {isAdmin && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-extrabold uppercase bg-amber-400 text-black">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-400 font-mono truncate">{user.email}</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        openAdminDashboard();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-amber-300 hover:bg-amber-500/20 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Crown size={14} className="text-amber-400" />
                      <span>Admin Control Panel</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      openAuthModal('google');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-stone-300 hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <UserIcon size={14} />
                    <span>Switch Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/15 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              title="Sign in with Google or Email"
            >
              <UserIcon size={13} />
              <span>Sign In</span>
            </button>
          )}

          {/* Share Link Header Button */}
          <button
            type="button"
            onClick={handleShareClick}
            disabled={isSaving}
            className="hidden sm:flex px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 transition-all items-center gap-1.5 border border-rose-400/40 active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Share2 size={14} />
            <span>{isSaving ? 'Saving...' : 'Share Link 💌'}</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body (Split Layout: Controls on Left, Live Preview on Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT CONTROLS PANEL */}
        <aside className="w-full lg:w-[480px] xl:w-[520px] bg-stone-950 border-r border-white/10 flex flex-col shrink-0 overflow-hidden">
          {/* Section Navigation Tabs (Horizontal Scrollable) */}
          <div className="flex items-center gap-1 p-2 border-b border-white/10 overflow-x-auto bg-stone-900/50 no-scrollbar">
            {[
              { key: 'templates', label: 'Theme & Style', icon: Palette },
              { key: 'music', label: 'Music & Song 🎵', icon: Music },
              { key: 'hero', label: 'Names & Title', icon: Heart },
              { key: 'envelope', label: 'Envelope & Lock', icon: Mail },
              { key: 'counter', label: 'Love Counter', icon: Clock },
              { key: 'question', label: 'The Question', icon: HelpCircle },
              { key: 'photos', label: 'Photos (Polaroids)', icon: Image },
              { key: 'scratch', label: 'Scratch Card', icon: Gift },
              { key: 'cake', label: 'Cake & Candles', icon: Cake },
              { key: 'reasons', label: 'Reasons Deck', icon: ListOrdered },
              { key: 'letter', label: 'Handwritten Letter', icon: Feather },
              { key: 'chat', label: 'Secret Chat & Passkey', icon: MessageCircle },
              { key: 'response', label: 'Receiver Reply', icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Panels (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* 1. TEMPLATES & THEMES TAB */}
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-300" />
                    <span>1-Click Preset Templates</span>
                  </h3>
                  <p className="text-xs text-stone-400 mb-3">
                    Start with a pre-designed emotional experience for any relationship:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {TEMPLATE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyTemplate(preset.id)}
                        className="p-3 rounded-xl border text-left bg-stone-900/60 hover:bg-stone-800/80 border-white/10 hover:border-rose-400/50 transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-lg">{preset.icon}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {preset.badge}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white group-hover:text-rose-200">
                            {preset.name}
                          </h4>
                          <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                            {preset.tagline}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 100+ Visual Color Themes with Search & Categories */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Palette size={14} className="text-rose-400" />
                        <span>Visual Color Theme ({Object.keys(THEMES).length}+ Themes)</span>
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        Choose an atmosphere tailored for love, romance, birthdays, or celebrations
                      </p>
                    </div>
                  </div>

                  {/* Theme Search Bar */}
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="text"
                      value={themeSearchQuery}
                      onChange={(e) => setThemeSearchQuery(e.target.value)}
                      placeholder="Search 100+ themes (e.g. Sakura, Velvet, Midnight, Gold, Sunset)..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-rose-400"
                    />
                    {themeSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setThemeSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Category Chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {[
                      'All',
                      'Romantic & Love',
                      'Pastel & Cute',
                      'Dark Luxury',
                      'Aesthetic & Dreamy',
                      'Neon & Cyber',
                      'Vintage & Nature',
                      'Sunset & Warm',
                      'Minimal & Clean',
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedThemeCategory(cat)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                          selectedThemeCategory === cat
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-black/40 border border-white/10 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Themes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {Object.values(THEMES)
                      .filter((th) => {
                        const matchesCategory =
                          selectedThemeCategory === 'All' ||
                          (th.category &&
                            th.category
                              .toLowerCase()
                              .includes(
                                selectedThemeCategory.toLowerCase().split(' ')[0]
                              ));
                        const matchesSearch =
                          !themeSearchQuery.trim() ||
                          th.name
                            .toLowerCase()
                            .includes(themeSearchQuery.toLowerCase().trim()) ||
                          th.id
                            .toLowerCase()
                            .includes(themeSearchQuery.toLowerCase().trim()) ||
                          (th.category &&
                            th.category
                              .toLowerCase()
                              .includes(themeSearchQuery.toLowerCase().trim()));
                        return matchesCategory && matchesSearch;
                      })
                      .map((th) => {
                        const isSelected = data.theme === th.id;
                        return (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => update({ theme: th.id })}
                            className={`p-2.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all relative group ${
                              isSelected
                                ? 'border-rose-400 bg-rose-500/15 shadow-lg ring-1 ring-rose-400 scale-[1.02]'
                                : 'border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/60'
                            }`}
                          >
                            <div
                              className="w-full h-8 rounded-lg shadow-inner border border-white/15 relative overflow-hidden"
                              style={{
                                background: `linear-gradient(135deg, ${th.accent}, ${th.pageBg})`,
                              }}
                            >
                              <div
                                className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white/40 shadow-sm"
                                style={{ backgroundColor: th.accent }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white truncate">
                                {th.name}
                              </span>
                              {isSelected && (
                                <Check size={12} className="text-rose-400 shrink-0 ml-1" />
                              )}
                            </div>
                            {th.category && (
                              <span className="text-[9px] text-stone-500 truncate">
                                {th.category}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Floating Particle Effect */}
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                    Floating Atmosphere Particles
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'hearts', label: '💖 Floating Hearts' },
                      { id: 'sparkles', label: '✨ Golden Sparkles' },
                      { id: 'cherry-blossoms', label: '🌸 Sakura Petals' },
                      { id: 'confetti', label: '🎉 Confetti' },
                      { id: 'butterflies', label: '🦋 Butterflies' },
                      { id: 'snow', label: '❄️ Starlight Snow' },
                      { id: 'none', label: '🚫 No Particles' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => update({ particleEffect: p.id as ParticleType })}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                          data.particleEffect === p.id
                            ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                            : 'bg-black/40 border-white/10 text-stone-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Melody & Custom Song Studio */}
                <div className="pt-4 border-t border-white/10">
                  <MusicStudioSection
                    musicTrack={data.musicTrack}
                    customMusicUrl={data.customMusicUrl}
                    customMusicName={data.customMusicName}
                    onChange={(updated) => update(updated)}
                  />
                </div>
              </div>
            )}

            {/* DEDICATED MUSIC STUDIO TAB */}
            {activeTab === 'music' && (
              <div className="space-y-6">
                <MusicStudioSection
                  musicTrack={data.musicTrack}
                  customMusicUrl={data.customMusicUrl}
                  customMusicName={data.customMusicName}
                  onChange={(updated) => update(updated)}
                />
              </div>
            )}

            {/* 2. HERO & NAMES TAB */}
            {activeTab === 'hero' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                      Sender Name (You)
                    </label>
                    <input
                      type="text"
                      value={data.hero.senderName}
                      onChange={(e) =>
                        update({ hero: { ...data.hero, senderName: e.target.value } })
                      }
                      placeholder="e.g. Aarav"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                      Receiver Name
                    </label>
                    <input
                      type="text"
                      value={data.hero.receiverName}
                      onChange={(e) =>
                        update({ hero: { ...data.hero, receiverName: e.target.value } })
                      }
                      placeholder="e.g. Ananya"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                      Cute Nickname
                    </label>
                    <input
                      type="text"
                      value={data.hero.receiverNickname}
                      onChange={(e) =>
                        update({ hero: { ...data.hero, receiverNickname: e.target.value } })
                      }
                      placeholder="e.g. Chotu / Babu / Cutie 💖"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                      Hero Center Emoji
                    </label>
                    <input
                      type="text"
                      value={data.hero.heroEmoji}
                      onChange={(e) =>
                        update({ hero: { ...data.hero, heroEmoji: e.target.value } })
                      }
                      placeholder="e.g. 🌸 / 💖 / 🎂 / 🥂"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400 text-center text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                    Top Badge Text
                  </label>
                  <input
                    type="text"
                    value={data.hero.badgeText}
                    onChange={(e) =>
                      update({ hero: { ...data.hero, badgeText: e.target.value } })
                    }
                    placeholder="e.g. Created with all my heart ❤️"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                    Grand Main Heading
                  </label>
                  <input
                    type="text"
                    value={data.hero.mainTitle}
                    onChange={(e) =>
                      update({ hero: { ...data.hero, mainTitle: e.target.value } })
                    }
                    placeholder="e.g. To The One Who Makes Every Day Magical ✨"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                    Subtitle / Dedication
                  </label>
                  <textarea
                    value={data.hero.subtitle}
                    onChange={(e) =>
                      update({ hero: { ...data.hero, subtitle: e.target.value } })
                    }
                    rows={2}
                    placeholder="e.g. I made this tiny corner of the internet just for you..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400 resize-none"
                  />
                </div>
              </div>
            )}

            {/* 3. ENVELOPE & LOCK TAB */}
            {activeTab === 'envelope' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white">Enable Envelope Unboxing</h4>
                    <p className="text-[11px] text-stone-400">
                      Receiver must tap wax seal / unwrap gift box to reveal greeting
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.envelope.enabled}
                    onChange={(e) =>
                      update({ envelope: { ...data.envelope, enabled: e.target.checked } })
                    }
                    className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {data.envelope.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Envelope Style
                        </label>
                        <select
                          value={data.envelope.style}
                          onChange={(e) =>
                            update({ envelope: { ...data.envelope, style: e.target.value as any } })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-400"
                        >
                          <option value="wax-seal-envelope">💌 Wax Seal Envelope</option>
                          <option value="gift-box">🎁 3D Gift Box</option>
                          <option value="vintage-letter">📜 Airmail Letter</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Seal Emoji
                        </label>
                        <input
                          type="text"
                          value={data.envelope.sealEmoji}
                          onChange={(e) =>
                            update({ envelope: { ...data.envelope, sealEmoji: e.target.value } })
                          }
                          placeholder="💌 / 💖 / 🎁 / 💍"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400 text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Envelope Front Label
                      </label>
                      <input
                        type="text"
                        value={data.envelope.frontLabel}
                        onChange={(e) =>
                          update({ envelope: { ...data.envelope, frontLabel: e.target.value } })
                        }
                        placeholder="e.g. To My Favorite Person 💌"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    {/* Passcode Lock */}
                    <div className="pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-xs font-bold text-white">Password Lock (Optional)</h4>
                          <p className="text-[11px] text-stone-400">
                            Receiver must enter a secret date or nickname to unlock
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={data.envelope.requiresPasscode}
                          onChange={(e) =>
                            update({
                              envelope: {
                                ...data.envelope,
                                requiresPasscode: e.target.checked,
                              },
                            })
                          }
                          className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                        />
                      </div>

                      {data.envelope.requiresPasscode && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                              Secret Passcode
                            </label>
                            <input
                              type="text"
                              value={data.envelope.passcode}
                              onChange={(e) =>
                                update({
                                  envelope: { ...data.envelope, passcode: e.target.value },
                                })
                              }
                              placeholder="e.g. 1402 or chotu"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                              Passcode Hint
                            </label>
                            <input
                              type="text"
                              value={data.envelope.passcodeHint}
                              onChange={(e) =>
                                update({
                                  envelope: { ...data.envelope, passcodeHint: e.target.value },
                                })
                              }
                              placeholder="e.g. Hint: Our anniversary date (DDMM) or my nickname for you"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Celebration Confetti & Falling Hearts Particle Burst */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <PartyPopper size={14} className="text-rose-400" />
                        <span>Confetti & Falling Hearts Particle Burst 🎉</span>
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        Trigger celebratory fireworks and falling floating hearts when opened
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.envelope.confettiBurst !== false}
                      onChange={(e) =>
                        update({
                          envelope: {
                            ...data.envelope,
                            confettiBurst: e.target.checked,
                          },
                        })
                      }
                      className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>

                  {data.envelope.confettiBurst !== false && (
                    <div className="space-y-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Celebration Particle Style
                        </label>
                        <select
                          value={data.envelope.celebrationStyle || 'hearts-fireworks'}
                          onChange={(e) =>
                            update({
                              envelope: {
                                ...data.envelope,
                                celebrationStyle: e.target.value as any,
                              },
                            })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-400 cursor-pointer"
                        >
                          <option value="hearts-fireworks">💖 Romantic Heart Burst & Fireworks</option>
                          <option value="romantic-hearts">🌹 Rose Petals & Floating Hearts Shower</option>
                          <option value="gold-sparkles">✨ Golden Stardust & Luxury Shimmer</option>
                          <option value="rainbow-confetti">🌈 Vibrant Rainbow Carnival Confetti</option>
                        </select>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            triggerCelebrationConfetti(
                              data.envelope.celebrationStyle || 'hearts-fireworks',
                              true
                            );
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                        >
                          <Sparkles size={13} />
                          <span>Test Celebration Burst 🎆</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scheduled Date & Time Reveal (Timed Unlock) */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Clock size={14} className="text-rose-400" />
                        <span>Schedule Date & Time Reveal ⏳</span>
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        Lock greeting until an exact future date & time (e.g. Birthday midnight, Anniversary, Valentine's)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(data.timedUnlock?.enabled || data.envelope.timedUnlock?.enabled)}
                      onChange={(e) => {
                        const isEnabled = e.target.checked;
                        const currentUnlockAt =
                          data.timedUnlock?.unlockAt ||
                          data.envelope.timedUnlock?.unlockAt ||
                          (() => {
                            // Default to tonight midnight if empty
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            d.setHours(0, 0, 0, 0);
                            return d.toISOString().slice(0, 16);
                          })();

                        const newConfig = {
                          enabled: isEnabled,
                          unlockAt: currentUnlockAt,
                          lockedTitle: data.timedUnlock?.lockedTitle || 'A Special Surprise is Waiting For You! 🎁',
                          lockedMessage:
                            data.timedUnlock?.lockedMessage ||
                            'This personalized greeting has been scheduled to open at this exact moment. Hold your excitement! ✨',
                        };

                        update({
                          timedUnlock: newConfig,
                          envelope: {
                            ...data.envelope,
                            timedUnlock: newConfig,
                          },
                        });
                      }}
                      className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>

                  {(data.timedUnlock?.enabled || data.envelope.timedUnlock?.enabled) && (
                    <div className="space-y-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Target Unlock Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={
                            (data.timedUnlock?.unlockAt || data.envelope.timedUnlock?.unlockAt || '').slice(0, 16)
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            const newConfig = {
                              ...(data.timedUnlock || data.envelope.timedUnlock || { enabled: true }),
                              enabled: true,
                              unlockAt: val,
                            };
                            update({
                              timedUnlock: newConfig,
                              envelope: { ...data.envelope, timedUnlock: newConfig },
                            });
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      {/* Quick Date Presets */}
                      <div>
                        <span className="block text-[11px] font-semibold text-stone-400 mb-1.5">
                          Quick Presets:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            {
                              label: 'Tonight Midnight 🌙',
                              getDate: () => {
                                const d = new Date();
                                d.setDate(d.getDate() + 1);
                                d.setHours(0, 0, 0, 0);
                                return d.toISOString().slice(0, 16);
                              },
                            },
                            {
                              label: 'Tomorrow 9 AM ☀️',
                              getDate: () => {
                                const d = new Date();
                                d.setDate(d.getDate() + 1);
                                d.setHours(9, 0, 0, 0);
                                return d.toISOString().slice(0, 16);
                              },
                            },
                            {
                              label: '+1 Hour ⏳',
                              getDate: () => {
                                const d = new Date(Date.now() + 60 * 60 * 1000);
                                return d.toISOString().slice(0, 16);
                              },
                            },
                            {
                              label: '+24 Hours 📅',
                              getDate: () => {
                                const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
                                return d.toISOString().slice(0, 16);
                              },
                            },
                            {
                              label: 'Valentine’s Day 💖',
                              getDate: () => {
                                const year = new Date().getFullYear();
                                const d = new Date(year, 1, 14, 0, 0, 0);
                                if (d.getTime() < Date.now()) d.setFullYear(year + 1);
                                return d.toISOString().slice(0, 16);
                              },
                            },
                            {
                              label: 'New Year 🎆',
                              getDate: () => {
                                const year = new Date().getFullYear() + 1;
                                const d = new Date(year, 0, 1, 0, 0, 0);
                                return d.toISOString().slice(0, 16);
                              },
                            },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                const newDate = preset.getDate();
                                const newConfig = {
                                  ...(data.timedUnlock || data.envelope.timedUnlock || { enabled: true }),
                                  enabled: true,
                                  unlockAt: newDate,
                                };
                                update({
                                  timedUnlock: newConfig,
                                  envelope: { ...data.envelope, timedUnlock: newConfig },
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-stone-300 bg-white/10 hover:bg-white/20 border border-white/10 transition-colors cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Locked Title */}
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Countdown Screen Title
                        </label>
                        <input
                          type="text"
                          value={data.timedUnlock?.lockedTitle || ''}
                          onChange={(e) => {
                            const newConfig = {
                              ...(data.timedUnlock || data.envelope.timedUnlock || { enabled: true, unlockAt: '' }),
                              lockedTitle: e.target.value,
                            };
                            update({
                              timedUnlock: newConfig,
                              envelope: { ...data.envelope, timedUnlock: newConfig },
                            });
                          }}
                          placeholder="e.g. A Birthday Surprise is Waiting for You! 🎁"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      {/* Locked Message */}
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Countdown Teaser Message
                        </label>
                        <textarea
                          rows={2}
                          value={data.timedUnlock?.lockedMessage || ''}
                          onChange={(e) => {
                            const newConfig = {
                              ...(data.timedUnlock || data.envelope.timedUnlock || { enabled: true, unlockAt: '' }),
                              lockedMessage: e.target.value,
                            };
                            update({
                              timedUnlock: newConfig,
                              envelope: { ...data.envelope, timedUnlock: newConfig },
                            });
                          }}
                          placeholder="e.g. This special greeting will unlock automatically when the clock strikes midnight! Hold your excitement ✨"
                          className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      {/* Notice about Dashboard Preview */}
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-200 leading-relaxed">
                        💡 <strong>Dashboard Notice</strong>: You can freely preview and edit your card here in the studio without interruption. The live countdown lock screen will only appear on the generated share link for your recipient!
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. LOVE COUNTER TAB */}
            {activeTab === 'counter' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white">Enable Time Counter (Lovlio Style)</h4>
                    <p className="text-[11px] text-stone-400">
                      Live ticker for days/hours/minutes/seconds together or countdown
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.counter.enabled}
                    onChange={(e) =>
                      update({ counter: { ...data.counter, enabled: e.target.checked } })
                    }
                    className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {data.counter.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Mode
                        </label>
                        <select
                          value={data.counter.mode}
                          onChange={(e) =>
                            update({ counter: { ...data.counter, mode: e.target.value as any } })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-400"
                        >
                          <option value="since">Counting Time Since (Together)</option>
                          <option value="until">Countdown To Future Date</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Target Date
                        </label>
                        <input
                          type="date"
                          value={data.counter.date}
                          onChange={(e) =>
                            update({ counter: { ...data.counter, date: e.target.value } })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Counter Header Title
                      </label>
                      <input
                        type="text"
                        value={data.counter.title}
                        onChange={(e) =>
                          update({ counter: { ...data.counter, title: e.target.value } })
                        }
                        placeholder="e.g. Days of falling deeper in love with you:"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Special Milestone Note
                      </label>
                      <input
                        type="text"
                        value={data.counter.specialNote}
                        onChange={(e) =>
                          update({ counter: { ...data.counter, specialNote: e.target.value } })
                        }
                        placeholder="e.g. And every single second has been the best part of my life ✨"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 5. THE BIG QUESTION (beMYN) TAB */}
            {activeTab === 'question' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white">Enable Interactive Question (beMYN Style)</h4>
                    <p className="text-[11px] text-stone-400">
                      "Will you be my Valentine / Forgive me" with playful runaway No button
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.question.enabled}
                    onChange={(e) =>
                      update({ question: { ...data.question, enabled: e.target.checked } })
                    }
                    className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {data.question.enabled && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        The Question Text
                      </label>
                      <input
                        type="text"
                        value={data.question.question}
                        onChange={(e) =>
                          update({ question: { ...data.question, question: e.target.value } })
                        }
                        placeholder="e.g. Will You Be My Valentine & Go On A Date With Me? 🌹"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          YES Button Text
                        </label>
                        <input
                          type="text"
                          value={data.question.yesButtonText}
                          onChange={(e) =>
                            update({
                              question: { ...data.question, yesButtonText: e.target.value },
                            })
                          }
                          placeholder="e.g. YES! 1000x YES! 💖"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          NO Button Text
                        </label>
                        <input
                          type="text"
                          value={data.question.noButtonText}
                          onChange={(e) =>
                            update({
                              question: { ...data.question, noButtonText: e.target.value },
                            })
                          }
                          placeholder="e.g. No 💔"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <div>
                        <h5 className="text-xs font-bold text-white">Evasive Runaway "No" Button</h5>
                        <p className="text-[11px] text-stone-300">
                          Button hops away and shows funny excuses when they try to click No
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={data.question.evasiveNo}
                        onChange={(e) =>
                          update({
                            question: { ...data.question, evasiveNo: e.target.checked },
                          })
                        }
                        className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        YES Celebration Success Message
                      </label>
                      <input
                        type="text"
                        value={data.question.yesSuccessMessage}
                        onChange={(e) =>
                          update({
                            question: { ...data.question, yesSuccessMessage: e.target.value },
                          })
                        }
                        placeholder="e.g. You just made me the happiest person in the universe! 💖✨"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 6. PHOTOS POLAROIDS TAB */}
            {activeTab === 'photos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white">Enable Photo Memories (Polaroids)</h4>
                    <p className="text-[11px] text-stone-400">
                      Polaroid cards with tape and tap-to-flip secret notes on the back
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.photos.enabled}
                    onChange={(e) =>
                      update({ photos: { ...data.photos, enabled: e.target.checked } })
                    }
                    className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {/* 15-Day Ephemeral Privacy System Banner */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-stone-300 space-y-0.5">
                    <p className="font-bold text-emerald-300">
                      Private & 15-Day Auto-Destruct Protection Active 🔒
                    </p>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      Photos uploaded here are accessible only via this card's link and secret key. All media automatically deletes after 15 days for complete privacy. Supports 10+ high-res memories.
                    </p>
                  </div>
                </div>

                {data.photos.enabled && (
                  <>
                    {/* 10 PHOTO FRAME THEMES SELECTOR */}
                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <ImageIcon size={14} className="text-rose-400" />
                            <span>Photo Card Frame Theme (Choose from 10 Styles)</span>
                          </h4>
                          <p className="text-[11px] text-stone-400">
                            Select the styling, card texture, tape strips and aesthetic for your memories
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                        {PHOTO_THEMES.map((pt) => {
                          const isSelected =
                            (data.photos.frameTheme || 'vintage-polaroid') === pt.id;
                          return (
                            <button
                              key={pt.id}
                              type="button"
                              onClick={() => {
                                update({
                                  photos: {
                                    ...data.photos,
                                    frameTheme: pt.id as any,
                                  },
                                });
                              }}
                              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? 'bg-rose-500/20 border-rose-400 shadow-md ring-2 ring-rose-500/40 scale-[1.02]'
                                  : 'bg-stone-900/60 border-white/10 hover:border-white/25 hover:bg-stone-900'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-base">{pt.emoji}</span>
                                <div className="flex items-center gap-1">
                                  {pt.previewColors.map((col, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className="w-2.5 h-2.5 rounded-full border border-black/40"
                                      style={{ backgroundColor: col }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white truncate">{pt.name}</p>
                                <p className="text-[10px] text-stone-400 line-clamp-1">
                                  {pt.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                      <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                        Photos ({data.photos.photos.length})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center gap-1.5 shadow-md transition-colors"
                        >
                          <Upload size={13} className="text-rose-400" />
                          <span>Upload from Device</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsPhotoGalleryModalOpen(true)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 flex items-center gap-1.5 shadow-md transition-all"
                        >
                          <Plus size={13} />
                          <span>Curated Gallery</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {data.photos.photos.map((photo, idx) => (
                        <div
                          key={photo.id || idx}
                          className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex gap-3 items-start"
                        >
                          <img
                            src={photo.url}
                            alt=""
                            className="w-16 h-16 rounded-lg object-cover bg-stone-900 shrink-0 border border-white/20"
                            referrerPolicy="no-referrer"
                          />

                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={photo.caption}
                              onChange={(e) => {
                                const updated = [...data.photos.photos];
                                updated[idx].caption = e.target.value;
                                update({ photos: { ...data.photos, photos: updated } });
                              }}
                              placeholder="Polaroid caption..."
                              className="w-full px-2.5 py-1 text-xs rounded-lg bg-stone-900 border border-white/10 text-white"
                            />
                            <input
                              type="text"
                              value={photo.flipNote || ''}
                              onChange={(e) => {
                                const updated = [...data.photos.photos];
                                updated[idx].flipNote = e.target.value;
                                update({ photos: { ...data.photos, photos: updated } });
                              }}
                              placeholder="Secret note on back (when tapped)..."
                              className="w-full px-2.5 py-1 text-xs rounded-lg bg-stone-900 border border-white/10 text-rose-200 placeholder:text-stone-600"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 7. SCRATCH SURPRISE TAB */}
            {activeTab === 'scratch' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white">Enable Secret Scratch Surprise (Emocia Style)</h4>
                    <p className="text-[11px] text-stone-400">
                      Receiver rubs canvas card to scratch off silver overlay and reveal coupon
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.scratchCard.enabled}
                    onChange={(e) =>
                      update({
                        scratchCard: { ...data.scratchCard, enabled: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {data.scratchCard.enabled && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Card Scratch Surface Foil
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'rose-gold', label: '🌸 Rose Gold' },
                          { id: 'gold', label: '✨ Royal Gold' },
                          { id: 'silver', label: '🪙 Silver Shimmer' },
                          { id: 'holographic', label: '🌈 Holographic' },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              update({
                                scratchCard: { ...data.scratchCard, cardStyle: c.id as any },
                              })
                            }
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                              data.scratchCard.cardStyle === c.id
                                ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                                : 'bg-black/40 border-white/10 text-stone-400 hover:text-white'
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Coupon Category Badge
                      </label>
                      <input
                        type="text"
                        value={data.scratchCard.secretCategory}
                        onChange={(e) =>
                          update({
                            scratchCard: {
                              ...data.scratchCard,
                              secretCategory: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g. VIP Love Coupon / Peace Offering / Birthday Gift"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Secret Hidden Message / Surprise Promise
                      </label>
                      <textarea
                        value={data.scratchCard.secretMessage}
                        onChange={(e) =>
                          update({
                            scratchCard: {
                              ...data.scratchCard,
                              secretMessage: e.target.value,
                            },
                          })
                        }
                        rows={3}
                        placeholder="e.g. 🎟️ 1x Midnight Ice Cream Run + Unlimited Warm Hugs anytime you want!"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400 resize-none"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 8. BIRTHDAY CAKE TAB */}
            {activeTab === 'cake' && (
              <div className="space-y-4">
                {/* Enable / Disable Cake Switch */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white">Enable Virtual Birthday Cake</h4>
                    <p className="text-[11px] text-stone-400">
                      Interactive 3D cake where recipient makes a wish & taps candles to blow them out
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.cake.enabled}
                    onChange={(e) =>
                      update({ cake: { ...data.cake, enabled: e.target.checked } })
                    }
                    className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {data.cake.enabled && (
                  <>
                    {/* 20 3D CAKE THEMES SELECTOR */}
                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>🎂 3D Cake Theme (Choose from 20 Themes)</span>
                          </h4>
                          <p className="text-[11px] text-stone-400">
                            Select flavor, toppings, 3D frosting gradients, and candle glow styles
                          </p>
                        </div>
                      </div>

                      {/* Category Filter Chips */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {['All', 'Luxury', 'Chocolate', 'Fruity', 'Whimsical', 'Classic', 'Celebration'].map(
                          (cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setCakeCategoryFilter(cat)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                cakeCategoryFilter === cat
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'bg-black/40 border border-white/10 text-stone-400 hover:text-stone-200'
                              }`}
                            >
                              {cat}
                            </button>
                          )
                        )}
                      </div>

                      {/* 20 Cake Themes Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {CAKE_THEMES.filter(
                          (ct) =>
                            cakeCategoryFilter === 'All' ||
                            ct.category.toLowerCase() === cakeCategoryFilter.toLowerCase()
                        ).map((ct) => {
                          const isSelected = (data.cake.cakeThemeId || 'belgian-chocolate-truffle') === ct.id;
                          return (
                            <button
                              key={ct.id}
                              type="button"
                              onClick={() =>
                                update({
                                  cake: {
                                    ...data.cake,
                                    cakeThemeId: ct.id,
                                  },
                                })
                              }
                              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? 'bg-rose-500/20 border-rose-400 shadow-md ring-2 ring-rose-500/40 scale-[1.02]'
                                  : 'bg-stone-900/60 border-white/10 hover:border-white/25 hover:bg-stone-900'
                              }`}
                            >
                              {/* 3D Cake Cylinder Preview Mockup */}
                              <div
                                className="w-full h-14 rounded-lg flex flex-col items-center justify-center relative overflow-hidden shadow-inner border border-white/15"
                                style={{
                                  background: ct.topTierGradient,
                                }}
                              >
                                <span className="text-2xl drop-shadow-md z-10">{ct.emoji}</span>
                                {/* Mini icing decoration strip */}
                                <div
                                  className="absolute bottom-0 inset-x-0 h-2.5 opacity-80"
                                  style={{
                                    backgroundColor: ct.frostingColor,
                                  }}
                                />
                                {isSelected && (
                                  <div className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-500 text-white shadow">
                                    <Check size={10} />
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-white truncate">{ct.name}</p>
                                </div>
                                <p className="text-[10px] text-amber-300/90 font-medium truncate">
                                  {ct.flavorBadge}
                                </p>
                                <p className="text-[9px] text-stone-400 line-clamp-1 mt-0.5">
                                  {ct.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Candle Count Stepper */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Candles Count (1 to 9 Candles)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={1}
                          max={9}
                          value={data.cake.candlesCount || 3}
                          onChange={(e) =>
                            update({
                              cake: {
                                ...data.cake,
                                candlesCount: parseInt(e.target.value) || 3,
                              },
                            })
                          }
                          className="flex-1 accent-rose-500 cursor-pointer"
                        />
                        <span className="w-8 text-center text-xs font-bold px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-rose-300">
                          {data.cake.candlesCount || 3}
                        </span>
                      </div>
                    </div>

                    {/* Wish Prompt Instructions */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Wish Prompt Instructions
                      </label>
                      <input
                        type="text"
                        value={data.cake.wishPrompt}
                        onChange={(e) =>
                          update({ cake: { ...data.cake, wishPrompt: e.target.value } })
                        }
                        placeholder="e.g. Make a wish and tap the candles to blow them out! 🎂✨"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 9. REASONS DECK TAB */}
            {activeTab === 'reasons' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white">Enable "Reasons Why..." Cards</h4>
                    <p className="text-[11px] text-stone-400">
                      Cards listing why you love / appreciate them
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.reasons.enabled}
                    onChange={(e) =>
                      update({ reasons: { ...data.reasons, enabled: e.target.checked } })
                    }
                    className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {data.reasons.enabled && (
                  <>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                        Reasons ({data.reasons.reasons.length})
                      </span>
                      <button
                        type="button"
                        onClick={addReason}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center gap-1 shadow-md"
                      >
                        <Plus size={14} />
                        <span>Add Reason</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {data.reasons.reasons.map((reason, idx) => (
                        <div
                          key={reason.id || idx}
                          className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2 relative"
                        >
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={reason.iconEmoji}
                              onChange={(e) => {
                                const updated = [...data.reasons.reasons];
                                updated[idx].iconEmoji = e.target.value;
                                update({ reasons: { ...data.reasons, reasons: updated } });
                              }}
                              className="w-10 px-1 py-1 text-center text-base rounded-lg bg-stone-900 border border-white/10"
                            />
                            <input
                              type="text"
                              value={reason.title}
                              onChange={(e) => {
                                const updated = [...data.reasons.reasons];
                                updated[idx].title = e.target.value;
                                update({ reasons: { ...data.reasons, reasons: updated } });
                              }}
                              placeholder="Reason title..."
                              className="flex-1 px-3 py-1 text-xs font-bold rounded-lg bg-stone-900 border border-white/10 text-white"
                            />
                            <button
                              type="button"
                              onClick={() => removeReason(reason.id)}
                              className="p-1 text-stone-500 hover:text-rose-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <textarea
                            value={reason.description}
                            onChange={(e) => {
                              const updated = [...data.reasons.reasons];
                              updated[idx].description = e.target.value;
                              update({ reasons: { ...data.reasons, reasons: updated } });
                            }}
                            rows={2}
                            placeholder="Reason description..."
                            className="w-full px-3 py-1.5 text-xs rounded-lg bg-stone-900 border border-white/10 text-stone-300 resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 10. HANDWRITTEN LETTER TAB */}
            {activeTab === 'letter' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white">Enable Handwritten Letter (CreateGreeting Style)</h4>
                    <p className="text-[11px] text-stone-400">
                      Parchment paper letter with wax stamp sign-off
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.letter.enabled}
                    onChange={(e) =>
                      update({ letter: { ...data.letter, enabled: e.target.checked } })
                    }
                    className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {data.letter.enabled && (
                  <>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isAuthenticated) {
                            openAuthModal('login');
                            return;
                          }
                          setIsAiLetterModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 flex items-center gap-1.5 shadow-sm"
                      >
                        <Wand2 size={13} />
                        <span>Rewrite Letter with AI ✨</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Letter Body Paragraphs
                      </label>
                      <textarea
                        value={data.letter.paragraphs.join('\n\n')}
                        onChange={(e) =>
                          update({
                            letter: {
                              ...data.letter,
                              paragraphs: e.target.value.split('\n\n').filter((p) => p.trim()),
                            },
                          })
                        }
                        rows={6}
                        placeholder="Write your heartfelt paragraphs here (double enter for new paragraph)..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white font-body focus:outline-none focus:border-rose-400 leading-relaxed resize-y"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Sign-Off Phrase
                        </label>
                        <input
                          type="text"
                          value={data.letter.signOff}
                          onChange={(e) =>
                            update({
                              letter: { ...data.letter, signOff: e.target.value },
                            })
                          }
                          placeholder="e.g. With all my heart & soul,"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Signature Name
                        </label>
                        <input
                          type="text"
                          value={data.letter.authorSignature}
                          onChange={(e) =>
                            update({
                              letter: { ...data.letter, authorSignature: e.target.value },
                            })
                          }
                          placeholder="e.g. Forever Yours 🌹"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>

                    {/* Paper & Visual Customization */}
                    <div className="pt-3 border-t border-white/10 space-y-3">
                      <h5 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                        Letter Styling & Aesthetics
                      </h5>

                      <div>
                        <label className="block text-xs text-stone-400 mb-1.5">
                          Paper Texture / Background Style
                        </label>
                        <select
                          value={data.letter.paperStyle || 'vintage-parchment'}
                          onChange={(e) =>
                            update({
                              letter: { ...data.letter, paperStyle: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none"
                        >
                          <option value="vintage-parchment">📜 Vintage Parchment Paper</option>
                          <option value="rose-petals">🌸 Rose Petals Romance</option>
                          <option value="midnight-letter">🌌 Midnight Starlight Paper</option>
                          <option value="dark-velvet">🍷 Dark Velvet Luxury</option>
                          <option value="golden-glow">✨ Golden Candlelight Paper</option>
                          <option value="lavender-blush">💜 Lavender Blossom Paper</option>
                          <option value="clean-linen">📄 Clean Crisp Linen</option>
                          <option value="theme-match">🎨 Match Current Theme Style</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-stone-400 mb-1.5">
                            Typography Font
                          </label>
                          <select
                            value={data.letter.fontFamily || 'font-handwriting'}
                            onChange={(e) =>
                              update({
                                letter: { ...data.letter, fontFamily: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none"
                          >
                            <option value="font-handwriting">✍️ Romantic Cursive</option>
                            <option value="font-serif-display">📖 Classic Serif</option>
                            <option value="font-sans">🖋️ Modern Clean</option>
                            <option value="font-mono">📜 Vintage Typewriter</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-stone-400 mb-1.5">
                            Wax Seal Emoji & Seal
                          </label>
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="color"
                              value={data.letter.waxSealColor || '#e11d48'}
                              onChange={(e) =>
                                update({
                                  letter: { ...data.letter, waxSealColor: e.target.value },
                                })
                              }
                              className="w-8 h-8 rounded-lg bg-transparent border border-white/20 cursor-pointer"
                              title="Wax Seal Color"
                            />
                            <select
                              value={data.letter.waxSealEmoji || '🌹'}
                              onChange={(e) =>
                                update({
                                  letter: { ...data.letter, waxSealEmoji: e.target.value },
                                })
                              }
                              className="flex-1 px-2 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none"
                            >
                              <option value="🌹">🌹 Rose</option>
                              <option value="💖">💖 Sparkling Heart</option>
                              <option value="💍">💍 Ring</option>
                              <option value="💌">💌 Love Letter</option>
                              <option value="👑">👑 Crown</option>
                              <option value="✨">✨ Sparkles</option>
                              <option value="💋">💋 Kiss</option>
                              <option value="🕊️">🕊️ Dove</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Typewriter Animation Settings */}
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                        <div>
                          <h6 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>✍️ Real-Time Handwriting / Typewriter Animation</span>
                          </h6>
                          <p className="text-[11px] text-stone-400">
                            Text appears character-by-character as recipient reads the letter
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={data.letter.typewriterEffect !== false}
                          onChange={(e) =>
                            update({
                              letter: { ...data.letter, typewriterEffect: e.target.checked },
                            })
                          }
                          className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 11. SECRET CHAT & PASSKEY TAB */}
            {activeTab === 'chat' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Private 1-on-1 WhatsApp Chat 💬
                      </h4>
                      <p className="text-xs text-stone-400">
                        Full-screen real-time room with audio/video calls, reactions & photo sharing
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                      Secret Room Passkey
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={data.chatKey || 'LOVE-9999'}
                        onChange={(e) =>
                          update({
                            chatKey: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="e.g. LOVE-4892"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/50 border border-amber-500/40 text-sm font-mono font-bold text-amber-300 tracking-wider uppercase focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newKey = `LOVE-${Math.floor(1000 + Math.random() * 9000)}`;
                          update({ chatKey: newKey });
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all"
                        title="Generate New Passkey"
                      >
                        🎲 Randomize
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1.5">
                      Only people who enter this exact secret key can read or send messages in this private room.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                      <ShieldCheck size={14} />
                      <span>15-Day Auto-Destruct Privacy Enabled</span>
                    </div>
                  </div>
                </div>

                {/* Launch Creator Test Chat */}
                <button
                  type="button"
                  onClick={() => setIsTestChatOpen(true)}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                >
                  <MessageCircle size={16} />
                  <span>Launch Secret Chat (Test WhatsApp Room) 💬</span>
                </button>
              </div>
            )}

            {/* 11. RECEIVER RESPONSE TAB */}
            {activeTab === 'response' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white">Enable Receiver Response Bar</h4>
                    <p className="text-[11px] text-stone-400">
                      Allows receiver to send reactions & cute reply notes back
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={data.receiverResponse.enabled}
                    onChange={(e) =>
                      update({
                        receiverResponse: {
                          ...data.receiverResponse,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {data.receiverResponse.enabled && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                      Response Prompt Text
                    </label>
                    <input
                      type="text"
                      value={data.receiverResponse.promptText}
                      onChange={(e) =>
                        update({
                          receiverResponse: {
                            ...data.receiverResponse,
                            promptText: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. Send a quick reaction back to let them know: 💖"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                )}

                {/* Centered Share Link & QR Actions directly below Receiver Reply */}
                <div className="p-5 rounded-2xl bg-gradient-to-b from-rose-950/30 to-black/60 border border-rose-500/20 text-center flex flex-col items-center justify-center space-y-3.5 shadow-xl">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shadow-inner">
                    <Share2 size={20} />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">Share Your HeartPage</h4>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Generate your romantic link or downloadable QR code
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleShareClick}
                    disabled={isSaving}
                    className="w-full max-w-xs px-6 py-3.5 rounded-2xl text-sm font-bold text-white shadow-xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2 border border-rose-400/40 active:scale-95 disabled:opacity-50 cursor-pointer shadow-rose-950/60"
                  >
                    <Share2 size={16} />
                    <span>{isSaving ? 'Saving Card...' : 'Share Link 💌'}</span>
                  </button>

                  <div className="flex items-center justify-center gap-2 w-full pt-1">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(true)}
                      className="flex-1 max-w-[150px] py-2 px-3 rounded-xl text-xs font-semibold text-stone-200 bg-white/10 hover:bg-white/15 border border-white/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <QrCode size={13} className="text-rose-400" />
                      <span>QR Code 📱</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsExportImageModalOpen(true)}
                      className="flex-1 max-w-[150px] py-2 px-3 rounded-xl text-xs font-semibold text-stone-200 bg-white/10 hover:bg-white/15 border border-white/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera size={13} className="text-rose-400" />
                      <span>Save Image 📸</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Bar with Centered Share Link */}
          <div className="p-3 border-t border-white/10 bg-stone-950/95 backdrop-blur flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleShareClick}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2 border border-rose-400/40 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Share2 size={15} />
              <span>{isSaving ? 'Saving...' : 'Share Link 💌'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="p-2.5 rounded-xl text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 transition-all flex items-center justify-center cursor-pointer"
              title="Mobile QR Code"
            >
              <QrCode size={16} className="text-rose-400" />
            </button>
          </div>
        </aside>

        {/* RIGHT LIVE PREVIEW PANEL */}
        <main className="flex-1 bg-stone-900/60 p-4 sm:p-8 flex items-center justify-center overflow-y-auto relative">
          <div
            className={`transition-all duration-300 shadow-2xl relative overflow-hidden ${
              previewDevice === 'mobile'
                ? 'w-[390px] h-[780px] rounded-[44px] border-[10px] border-stone-800 ring-1 ring-white/20'
                : 'w-full max-w-5xl h-full rounded-2xl border border-white/15'
            }`}
          >
            {/* Live Standalone Receiver View */}
            <div className="w-full h-full overflow-y-auto no-scrollbar">
              <ReceiverExperience
                data={data}
                isCreatorPreview={true}
                onSendReaction={(reaction, note) => {
                  console.log('Preview reaction received:', reaction, note);
                }}
              />
            </div>
          </div>
        </main>
      </div>

      {/* 1-Click AI Dream Card Generator Modal */}
      {isAiCardModalOpen && (
        <AiCardGeneratorModal
          currentData={data}
          onApplyGeneratedCard={(updates) => {
            onChange({
              ...data,
              ...updates,
              updatedAt: new Date().toISOString(),
            });
          }}
          onClose={() => setIsAiCardModalOpen(false)}
        />
      )}

      {/* AI Letter Generator Modal */}
      <AiLetterWriterModal
        isOpen={isAiLetterModalOpen}
        onClose={() => setIsAiLetterModalOpen(false)}
        senderName={data.hero.senderName}
        receiverName={data.hero.receiverName}
        category={data.category}
        onApplyLetter={(paragraphs) => {
          update({
            letter: {
              ...data.letter,
              enabled: true,
              paragraphs,
            },
          });
        }}
      />

      {/* Share / Links Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        data={data}
        publishedUrl={publishedUrl}
        onOpenExportImage={() => setIsExportImageModalOpen(true)}
      />

      {/* Dedicated High-Res QR Code & Printable Gift Card Modal */}
      {isQrModalOpen && (
        <QRCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          url={
            publishedUrl
              ? (publishedUrl.includes('#') ? publishedUrl.split('#')[0] : publishedUrl)
              : `${typeof window !== 'undefined' ? window.location.origin : ''}/?p=${data.id}`
          }
          data={data}
        />
      )}

      {/* High-Res Photo & Story Snapshot Modal */}
      {isExportImageModalOpen && (
        <ExportImageModal
          data={data}
          shareUrl={
            publishedUrl
              ? (publishedUrl.includes('#') ? publishedUrl.split('#')[0] : publishedUrl)
              : (typeof window !== 'undefined'
                  ? `${window.location.origin}/?p=${data.id}`
                  : `/?p=${data.id}`)
          }
          onClose={() => setIsExportImageModalOpen(false)}
        />
      )}

      {/* Reset Slate & Template Selector Modal */}
      {isResetModalOpen && (
        <ResetConfirmModal
          onResetToBlank={handleResetToBlank}
          onApplyTemplate={(tpl) => {
            onChange(tpl);
          }}
          onClose={() => setIsResetModalOpen(false)}
        />
      )}

      {/* Curated Aesthetic Photo Gallery Modal */}
      {isPhotoGalleryModalOpen && (
        <PhotoGalleryModal
          onSelectPhoto={(photo) => {
            addPhoto(photo.url, photo.caption);
          }}
          onClose={() => setIsPhotoGalleryModalOpen(false)}
        />
      )}

      {/* Full-Screen Test Secret Chat (WhatsApp Mode) */}
      {isTestChatOpen && (
        <SecretChatView
          cardData={data}
          initialKey={data.chatKey || 'LOVE-9999'}
          userRole="creator"
          onBackToCard={() => setIsTestChatOpen(false)}
        />
      )}

      {/* Romantic Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirmLogout={async () => {
          await logout();
        }}
      />
    </div>
  );
};
