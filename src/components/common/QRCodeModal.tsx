/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Heart,
  Sparkles,
  X,
  Smartphone,
  Share2,
  MessageCircle,
} from 'lucide-react';
import { HeartPageData } from '../../types';
import { THEMES } from '../../data/themes';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  data: HeartPageData;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  data,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'scan' | 'giftcard'>('scan');
  const [isGenerating, setIsGenerating] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = THEMES[data.theme] || THEMES['rose-romance'];
  const receiverName = data.hero.receiverNickname || data.hero.receiverName || 'My Love';
  const senderName = data.hero.senderName || 'Someone Special';

  // Generate crisp QR code on canvas whenever url or modal opens
  useEffect(() => {
    if (!isOpen || !url) return;

    let isMounted = true;
    setIsGenerating(true);

    const generateQR = async () => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const cleanShortUrl = url ? (url.includes('#') ? url.split('#')[0] : url) : `${origin}/?p=${data.id}`;
      const effectiveQrUrl = cleanShortUrl;

      // 1. Try rendering directly to HTML5 Canvas
      if (canvasRef.current) {
        try {
          await QRCode.toCanvas(canvasRef.current, effectiveQrUrl, {
            width: 240,
            margin: 2,
            color: {
              dark: '#1c1917',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          });
        } catch (canvasErr) {
          console.warn('Canvas QR render fallback:', canvasErr);
        }
      }

      // 2. Generate PNG Data URL for download & printing
      try {
        const dataUri = await QRCode.toDataURL(effectiveQrUrl, {
          width: 480,
          margin: 2,
          color: {
            dark: '#1c1917',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
        if (isMounted) {
          setQrDataUrl(dataUri);
          setIsGenerating(false);
        }
      } catch (err) {
        console.warn('Long URL QR code fallback to canonical short link:', err);
        try {
          const fallbackDataUri = await QRCode.toDataURL(cleanShortUrl, {
            width: 480,
            margin: 2,
            color: {
              dark: '#1c1917',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'L',
          });
          if (isMounted) {
            setQrDataUrl(fallbackDataUri);
            setIsGenerating(false);
          }
        } catch (fallbackErr) {
          const apiFallbackUri = `https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encodeURIComponent(
            cleanShortUrl
          )}&bgcolor=ffffff&color=1c1917`;
          if (isMounted) {
            setQrDataUrl(apiFallbackUri);
            setIsGenerating(false);
          }
        }
      }
    };

    generateQR();

    return () => {
      isMounted = false;
    };
  }, [isOpen, url, data.id]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const cleanUrl = url ? (url.includes('#') ? url.split('#')[0] : url) : '';
    navigator.clipboard.writeText(cleanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const downloadLink = document.createElement('a');
    downloadLink.href = qrDataUrl;
    downloadLink.download = `HeartPage-QR-${receiverName.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div
        id="qr-code-modal-overlay"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          className="relative max-w-md w-full bg-stone-900 border border-white/20 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden my-auto"
        >
          {/* Top Decorative Glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 rounded-full blur-2xl opacity-40 pointer-events-none"
            style={{ background: theme.accent }}
          />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg"
                style={{ background: theme.accent }}
              >
                <QrCode size={18} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-serif-display">
                  Scan & Share via QR Code 📱
                </h3>
                <p className="text-xs text-stone-400">
                  Instant mobile scan for {receiverName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 p-1 rounded-xl bg-black/40 border border-white/10 my-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'scan'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Smartphone size={13} />
              <span>Mobile QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('giftcard')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'giftcard'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Printer size={13} />
              <span>Printable Gift Card</span>
            </button>
          </div>

          {activeTab === 'scan' ? (
            /* TAB 1: Standard QR Code View */
            <div className="flex flex-col items-center text-center space-y-4">
              {/* QR Code Container with Center Heart Stamp */}
              <div className="relative p-4 bg-white rounded-2xl shadow-2xl border-4 border-rose-500/30 flex items-center justify-center min-w-[250px] min-h-[250px]">
                {isGenerating && !qrDataUrl ? (
                  <div className="w-56 h-56 flex flex-col items-center justify-center text-stone-600 text-xs">
                    <Sparkles className="animate-spin text-rose-500 mb-2" size={24} />
                    <span className="font-semibold text-stone-800">Generating QR Code...</span>
                  </div>
                ) : (
                  <div className="relative">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="HeartPage QR Code"
                        className="w-56 h-56 rounded-lg select-none"
                      />
                    ) : (
                      <canvas ref={canvasRef} className="w-56 h-56 rounded-lg select-none" />
                    )}

                    {/* Center Heart Emblem */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-lg select-none pointer-events-none">
                      ❤️
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-1">
                <p className="text-xs text-stone-200 font-medium">
                  Point your phone's camera at the QR code to open
                </p>
                <p className="text-[11px] text-stone-400">
                  Works seamlessly on iOS & Android camera apps
                </p>
              </div>

              {/* URL preview */}
              <div className="w-full flex items-center gap-2 p-2 rounded-xl bg-black/50 border border-white/10">
                <input
                  type="text"
                  readOnly
                  value={url}
                  className="flex-1 bg-transparent px-2 text-xs text-stone-300 focus:outline-none truncate font-mono select-all"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-white/10 hover:bg-white/20 flex items-center gap-1 transition-all cursor-pointer shrink-0"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2 pt-1">
                {/* 1-Click Direct Chat Button */}
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    const chatKey = (data.chatKey || 'LOVE-9999').trim().toUpperCase();
                    const directChatLink = `${origin}/?p=${data.id}&chat=1&key=${chatKey}`;
                    window.open(directChatLink, '_blank');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-transform active:scale-95 border border-emerald-400/30 cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>Chat with {receiverName} 💬</span>
                </button>

                <div className="grid grid-cols-2 gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={handleDownloadPNG}
                    className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(url, '_blank')}
                    className="py-2.5 px-4 rounded-xl text-xs font-bold text-stone-200 bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>Open Card</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: Printable Physical Gift Card */
            <div className="flex flex-col items-center space-y-4">
              <div
                id="printable-qr-giftcard"
                className="w-full rounded-2xl p-5 border shadow-xl text-center relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #fff5f7 0%, #fee2e8 100%)',
                  borderColor: '#fda4af',
                  color: '#1c1917',
                }}
              >
                {/* Decorative border */}
                <div className="border border-rose-300/60 rounded-xl p-4 flex flex-col items-center">
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1 font-sans">
                    <span>💌 A SPECIAL SURPRISE FOR</span>
                  </div>

                  <h4 className="text-2xl font-bold font-serif-display text-rose-950 mb-3">
                    {receiverName}
                  </h4>

                  {/* QR code thumbnail */}
                  <div className="p-2 bg-white rounded-xl shadow-md border border-rose-200 mb-3 min-w-[170px] min-h-[170px] flex items-center justify-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className="w-40 h-40 rounded-lg select-none"
                      />
                    ) : (
                      <div className="w-40 h-40 flex flex-col items-center justify-center text-rose-400 text-xs">
                        <Sparkles className="animate-spin mb-1 text-rose-500" size={20} />
                        <span>Rendering QR...</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-rose-900 font-medium max-w-xs leading-relaxed mb-2 font-serif-display">
                    "Scan with your phone camera to unlock your interactive website & secret letter"
                  </p>

                  <div className="text-[11px] text-rose-700/80 font-sans mt-2 pt-2 border-t border-rose-200/60 w-full flex justify-between px-2">
                    <span>From: <strong>{senderName}</strong></span>
                    <span>Crafted with ❤️ HeartPage</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-stone-400 text-center">
                Print this card and attach it to chocolates, flowers, or a greeting card!
              </p>

              {/* Print and Download buttons */}
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print Gift Card 🖨️</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-stone-200 bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>Save QR PNG</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-400">
            <span className="flex items-center gap-1">
              <Sparkles size={11} className="text-amber-400" />
              <span>Offline-ready high density QR Code</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-300 hover:text-white font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
