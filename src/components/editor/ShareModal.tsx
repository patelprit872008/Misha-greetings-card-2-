/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import QRCode from 'qrcode';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  QrCode,
  Heart,
  X,
  Send,
  Sparkles,
  Lock,
  Key,
  ShieldCheck,
  Clock,
  Download,
  Printer,
} from 'lucide-react';
import { HeartPageData } from '../../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: HeartPageData;
  publishedUrl?: string;
  onOpenExportImage?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  data,
  publishedUrl,
  onOpenExportImage,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedChatLink, setCopiedChatLink] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Build clean server-backed receiver URL with short unique ID (e.g. /g/X7kP92)
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shortId = data.short_id || data.shortId || data.id;

  // Canonical clean short URL (https://domain.com/g/X7kP92)
  const finalLink = publishedUrl
    ? (publishedUrl.includes('#') ? publishedUrl.split('#')[0] : publishedUrl)
    : `${origin}/g/${shortId}`;

  const receiverDisplayName = (data.hero.receiverNickname || data.hero.receiverName || 'Your Partner').trim();
  const chatKey = (data.chatKey || 'LOVE-9999').trim().toUpperCase();
  const directChatLink = `${finalLink}${finalLink.includes('?') ? '&' : '?'}chat=1&key=${chatKey}`;

  useEffect(() => {
    if (isOpen && finalLink) {
      QRCode.toDataURL(finalLink, {
        width: 360,
        margin: 2,
        color: {
          dark: '#1c1917',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrDataUrl(url))
        .catch((e) => {
          console.warn('ShareModal QR fallback:', e);
          const apiFallbackUri = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(
            finalLink
          )}&bgcolor=ffffff&color=1c1917`;
          setQrDataUrl(apiFallbackUri);
        });
    }
  }, [isOpen, finalLink, data.id, origin]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(finalLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(chatKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyChatLink = () => {
    navigator.clipboard.writeText(directChatLink);
    setCopiedChatLink(true);
    setTimeout(() => setCopiedChatLink(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `HeartPage-QR-${(data.hero.receiverNickname || data.hero.receiverName || 'Love').replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const whatsappMessage = encodeURIComponent(
    `Hey ${data.hero.receiverNickname || data.hero.receiverName || 'there'}! ❤️ I created a special 1-page interactive surprise and secret 1-on-1 chat room for you on HeartPage.\n\n💌 Open Card: ${finalLink}\n💬 Secret Chat Key: ${chatKey}\n🔗 Direct Chat: ${directChatLink}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative max-w-lg w-full bg-stone-900 border border-white/20 rounded-2xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif-display">
                Share Your 1-Page Micro-Site & Secret Chat 💌
              </h3>
              <p className="text-xs text-stone-400">
                Send this short link and secret passkey to <strong className="text-rose-300">{data.hero.receiverNickname || data.hero.receiverName || 'them'}</strong>!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="py-5 space-y-4">
          {/* Primary Action: Chat with Receiver Button */}
          <button
            type="button"
            onClick={() => window.open(directChatLink, '_blank')}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/40 text-white shadow-lg shadow-emerald-950/60 flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                <MessageCircle size={20} className="text-white" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5 leading-tight truncate">
                  <span>Chat with {receiverDisplayName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-emerald-100 font-medium shrink-0">💬 1-on-1 Live</span>
                </div>
                <p className="text-[11px] text-emerald-100/90 font-normal truncate">
                  Open private WhatsApp room instantly with passkey
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg shrink-0">
              <span>Open Chat</span>
              <ExternalLink size={13} />
            </div>
          </button>

          {/* 1. Main Website Link Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>💌 Short Published Card Link</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] normal-case font-medium bg-emerald-500/20 text-emerald-300">
                  ✅ Server-Backed
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-black/60 border border-white/15">
              <input
                type="text"
                readOnly
                value={finalLink}
                className="flex-1 bg-transparent px-2 text-xs text-stone-200 focus:outline-none truncate font-mono select-all"
              />

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 rounded-lg font-bold text-xs text-white bg-rose-600 hover:bg-rose-500 flex items-center gap-1.5 transition-all active:scale-95 shadow-md shrink-0 cursor-pointer"
              >
                {copiedLink ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Short unique link saved permanently on the server with all photos, audio, and animations.
            </p>
          </div>

          {/* 2. Secret Room Passkey Box */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Key size={14} className="text-amber-400" />
                <span>Secret Chat Room Passkey</span>
              </div>
              <span className="text-[10px] text-amber-200/80 bg-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                Key Protected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/50 border border-amber-500/30 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-300 tracking-widest text-center">
                {chatKey}
              </div>

              <button
                type="button"
                onClick={handleCopyKey}
                className="px-3.5 py-2 rounded-xl font-bold text-xs text-amber-950 bg-amber-400 hover:bg-amber-300 flex items-center gap-1.5 transition-all active:scale-95 shadow-md shrink-0 cursor-pointer"
              >
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey ? 'Key Copied!' : 'Copy Key'}</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-300 mt-2">
              Give this key to your partner so they can unlock your private 1-on-1 WhatsApp chat.
            </p>
          </div>

          {/* 3. Direct Secret Chat Link */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Direct WhatsApp Secret Chat Link</span>
              <span className="text-[10px] text-emerald-400 font-normal">Auto-unlocks with key</span>
            </label>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-black/60 border border-white/15">
              <input
                type="text"
                readOnly
                value={directChatLink}
                className="flex-1 bg-transparent px-2 text-xs text-stone-200 focus:outline-none truncate font-mono select-all"
              />

              <button
                type="button"
                onClick={handleCopyChatLink}
                className="px-3.5 py-1.5 rounded-lg font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 transition-all active:scale-95 shadow-md shrink-0 cursor-pointer"
              >
                {copiedChatLink ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                <span>{copiedChatLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* 1-Click WhatsApp & Social Story Share */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={`https://api.whatsapp.com/send?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer"
            >
              <MessageCircle size={17} />
              <span>Send on WhatsApp 💬</span>
            </a>

            {onOpenExportImage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExportImage();
                }}
                className="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950 cursor-pointer"
              >
                <span>📸 Save as Photo / Story</span>
              </button>
            )}
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => window.open(finalLink, '_blank')}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold text-stone-200 bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink size={14} />
              <span>Open Receiver Preview</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold text-stone-200 bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <QrCode size={14} />
              <span>{showQr ? 'Hide QR Code' : 'View QR Code'}</span>
            </button>
          </div>

          {/* QR Code Display */}
          {showQr && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col items-center justify-center text-center space-y-3"
            >
              <div className="p-3 bg-white rounded-2xl border-2 border-rose-500/40 shadow-xl relative">
                {qrDataUrl ? (
                  <div className="relative">
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      className="w-44 h-44 rounded-lg"
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-rose-600 border-2 border-white shadow-md flex items-center justify-center text-white text-sm">
                      ❤️
                    </div>
                  </div>
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-stone-700 text-xs">
                    Generating...
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download QR PNG</span>
                </button>
              </div>

              <p className="text-[11px] text-stone-400">
                Scan with phone camera or print to attach to gifts!
              </p>
            </motion.div>
          )}

          {/* 30-Day Cloud Persistence & Privacy Highlight */}
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-stone-300 text-xs flex items-center gap-2">
            <Clock size={16} className="text-rose-400 shrink-0" />
            <span>
              <strong>30-Day Guaranteed Cloud Persistence:</strong> Your complete card, uploaded photos, voice notes, music, and secret messages stay live and accessible for 30 days without disappearing.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-stone-800 hover:bg-stone-700 cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
