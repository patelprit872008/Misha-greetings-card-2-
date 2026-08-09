/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  Square,
  Award,
  Camera,
  Image as ImageIcon,
  Loader2,
  QrCode,
  Heart,
  Palette,
} from 'lucide-react';
import { toPng, toJpeg, toBlob } from 'html-to-image';
import { HeartPageData } from '../../types';
import { THEMES } from '../../data/themes';

interface ExportImageModalProps {
  data: HeartPageData;
  shareUrl: string;
  onClose: () => void;
}

type CardLayoutFormat = 'story' | 'square' | 'certificate' | 'polaroid';

export const ExportImageModal: React.FC<ExportImageModalProps> = ({
  data,
  shareUrl,
  onClose,
}) => {
  const [layoutFormat, setLayoutFormat] = useState<CardLayoutFormat>('story');
  const [fileFormat, setFileFormat] = useState<'png' | 'jpeg'>('png');
  const [qualityScale, setQualityScale] = useState<number>(2); // 2x Retina default
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const previewCardRef = useRef<HTMLDivElement>(null);

  // Safe property extraction
  const themeId = (data as any).theme || (data as any).themeId || 'rose-romance';
  const theme = THEMES[themeId] || THEMES['rose-romance'] || Object.values(THEMES)[0];
  
  const receiverName =
    data.hero?.receiverNickname ||
    data.hero?.receiverName ||
    (data as any).receiverName ||
    'My Favorite Person';
  
  const senderName =
    data.hero?.senderName || (data as any).senderName || 'Yours Truly';
  
  const title = data.hero?.title || 'For You, With Love';
  const subtitle =
    data.hero?.subtitle || 'Because you mean the entire universe to me ✨';
  const badgeText = data.hero?.badgeText || 'Special Surprise 💖';

  const letterText = Array.isArray(data.letter?.paragraphs)
    ? data.letter.paragraphs.join(' ')
    : (data.letter as any)?.body ||
      'You make every ordinary moment feel extraordinary.';

  const photosList = data.photos?.photos || (data.photos as any)?.items || [];
  const firstPhoto = photosList[0] || null;

  const questionText =
    data.question?.question ||
    (data as any).questionSection?.question ||
    'Will you be mine forever?';

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    shareUrl
  )}&bgcolor=ffffff&color=1c1917`;

  const handleDownload = async () => {
    if (!previewCardRef.current || isGenerating) return;
    setIsGenerating(true);
    try {
      const node = previewCardRef.current;
      const pixelRatio = qualityScale;
      let dataUrl = '';

      if (fileFormat === 'png') {
        dataUrl = await toPng(node, {
          quality: 0.98,
          pixelRatio,
          cacheBust: true,
        });
      } else {
        dataUrl = await toJpeg(node, {
          quality: 0.95,
          pixelRatio,
          cacheBust: true,
        });
      }

      const link = document.createElement('a');
      const safeName = receiverName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      link.download = `heartpage-${safeName}-${layoutFormat}.${fileFormat}`;
      link.href = dataUrl;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyImage = async () => {
    if (!previewCardRef.current || isGenerating) return;
    setIsGenerating(true);
    try {
      const node = previewCardRef.current;
      const blob = await toBlob(node, {
        quality: 0.98,
        pixelRatio: 2,
        cacheBust: true,
      });

      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2500);
      } else {
        handleDownload();
      }
    } catch (err) {
      console.error('Copy image failed:', err);
      handleDownload();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNativeShare = async () => {
    if (!previewCardRef.current || isGenerating) return;
    setIsGenerating(true);
    try {
      const node = previewCardRef.current;
      const blob = await toBlob(node, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });

      if (blob && navigator.canShare) {
        const file = new File(
          [blob],
          `heartpage-${receiverName}.png`,
          { type: 'image/png' }
        );
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: title,
            text: `A special interactive card for ${receiverName}!`,
            files: [file],
          });
        } else {
          handleDownload();
        }
      } else {
        handleDownload();
      }
    } catch (err) {
      console.error('Native share failed:', err);
      handleDownload();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      id="export-image-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden text-stone-100 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Capture & Save as Photo Card
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  HD Social Ready
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Generate high-resolution image snapshots with QR code for Instagram, WhatsApp, or Print
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split Controls & Live Render Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[80vh] overflow-y-auto">
          {/* Controls Column */}
          <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-stone-800 space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2.5">
                Layout / Aspect Ratio
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setLayoutFormat('story')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    layoutFormat === 'story'
                      ? 'bg-rose-500/15 border-rose-500 text-white shadow-sm'
                      : 'bg-stone-800/60 border-stone-700/60 text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Smartphone className="w-4 h-4 text-rose-400" />
                    <span>Story (9:16)</span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Perfect for Insta Stories & Status
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutFormat('square')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    layoutFormat === 'square'
                      ? 'bg-rose-500/15 border-rose-500 text-white shadow-sm'
                      : 'bg-stone-800/60 border-stone-700/60 text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Square className="w-4 h-4 text-pink-400" />
                    <span>Square (1:1)</span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Instagram Feed & Profile Post
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutFormat('certificate')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    layoutFormat === 'certificate'
                      ? 'bg-rose-500/15 border-rose-500 text-white shadow-sm'
                      : 'bg-stone-800/60 border-stone-700/60 text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Love Certificate</span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Official Romantic Diploma
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutFormat('polaroid')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    layoutFormat === 'polaroid'
                      ? 'bg-rose-500/15 border-rose-500 text-white shadow-sm'
                      : 'bg-stone-800/60 border-stone-700/60 text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Polaroid Print</span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Vintage Photo & Tape Frame
                  </p>
                </button>
              </div>
            </div>

            {/* Quality & Format */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                  Image Format
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-800/80 rounded-xl border border-stone-700">
                  <button
                    type="button"
                    onClick={() => setFileFormat('png')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      fileFormat === 'png'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    PNG (Crisp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileFormat('jpeg')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      fileFormat === 'jpeg'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    JPEG (Small)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                  Resolution Scale
                </label>
                <select
                  value={qualityScale}
                  onChange={(e) => setQualityScale(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs font-semibold text-white focus:outline-none focus:border-rose-500"
                >
                  <option value={1}>1x (Standard Web)</option>
                  <option value={2}>2x (Retina HD - Recommended)</option>
                  <option value={3}>3x (Ultra HD 4K Print)</option>
                </select>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-sm shadow-xl shadow-rose-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering High-Res Image...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Saved to Device! 🎉</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download {fileFormat.toUpperCase()} Snapshot</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={isGenerating}
                  className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 border border-stone-700 transition-colors active:scale-95"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-stone-400" />
                      Copy Image
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNativeShare}
                  disabled={isGenerating}
                  className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 border border-stone-700 transition-colors active:scale-95"
                >
                  <Share2 className="w-4 h-4 text-rose-400" />
                  Share to Apps
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-900/40 text-xs text-rose-200/90 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Tip:</strong> The QR code embedded in the card will directly open your live interactive page when scanned from Instagram stories or printed cards!
              </span>
            </div>
          </div>

          {/* Preview Container Column */}
          <div className="lg:col-span-7 p-6 flex flex-col items-center justify-center bg-stone-950/60 overflow-hidden">
            <div className="text-xs font-semibold text-stone-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              Live Image Snapshot Preview
            </div>

            {/* Scaled Preview Wrapper */}
            <div className="w-full flex justify-center items-center overflow-auto max-h-[580px] p-2">
              {/* THE EXPORTABLE NODE */}
              <div
                ref={previewCardRef}
                style={{
                  backgroundColor: theme.pageBg,
                  color: theme.textPrimary,
                }}
                className={`relative shadow-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                  layoutFormat === 'story'
                    ? 'w-[360px] h-[640px] rounded-3xl p-6'
                    : layoutFormat === 'square'
                    ? 'w-[440px] h-[440px] rounded-3xl p-6'
                    : layoutFormat === 'certificate'
                    ? 'w-[480px] h-[340px] rounded-2xl p-6 border-4 border-amber-400/40'
                    : 'w-[380px] h-[520px] rounded-2xl p-5 bg-stone-100 text-stone-900 shadow-xl'
                }`}
              >
                {/* 1. STORY FORMAT (9:16) */}
                {layoutFormat === 'story' && (
                  <>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-rose-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-pink-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />

                    {/* Story Header */}
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            backgroundColor: theme.badgeBg,
                            borderColor: theme.cardBorder,
                            color: theme.badgeText,
                          }}
                          className="px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md flex items-center gap-1.5"
                        >
                          <span>💖</span>
                          <span>{badgeText}</span>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono opacity-60">
                        HeartPage ✨
                      </div>
                    </div>

                    {/* Story Main Content */}
                    <div className="relative z-10 my-auto text-center space-y-4">
                      {firstPhoto ? (
                        <div className="relative inline-block mx-auto">
                          <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-white/40 shadow-xl mx-auto rotate-[-2deg]">
                            <img
                              src={firstPhoto.url}
                              alt="Memory"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          {firstPhoto.caption && (
                            <div className="absolute -bottom-2 -right-2 bg-stone-900/90 text-[10px] text-white px-2.5 py-1 rounded-xl border border-white/20 shadow-md">
                              {firstPhoto.caption}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            backgroundColor: theme.accentLight,
                            borderColor: theme.cardBorder,
                          }}
                          className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center border shadow-lg text-3xl"
                        >
                          🌹
                        </div>
                      )}

                      <div>
                        <div
                          style={{ color: theme.textSecondary }}
                          className="text-xs uppercase tracking-widest font-semibold mb-1"
                        >
                          For {receiverName}
                        </div>
                        <h1 className="text-2xl font-black tracking-tight leading-snug">
                          {title}
                        </h1>
                        <p
                          style={{ color: theme.textSecondary }}
                          className="text-xs mt-1.5 line-clamp-2 px-4 leading-relaxed"
                        >
                          {subtitle}
                        </p>
                      </div>

                      {/* Sweet Excerpt Card */}
                      <div
                        style={{
                          backgroundColor: theme.cardBg,
                          borderColor: theme.cardBorder,
                        }}
                        className="p-3.5 rounded-2xl border backdrop-blur-md text-left shadow-lg"
                      >
                        <div className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1 flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                          Heartfelt Message
                        </div>
                        <p className="text-xs italic leading-relaxed line-clamp-3">
                          "{letterText.slice(0, 140)}..."
                        </p>
                        <div className="text-right text-[11px] font-bold mt-1 text-rose-400">
                          — {senderName} 💌
                        </div>
                      </div>
                    </div>

                    {/* Story Footer with QR */}
                    <div
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        borderColor: theme.cardBorder,
                      }}
                      className="relative z-10 flex items-center justify-between p-3 rounded-2xl border backdrop-blur-md"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={qrCodeUrl}
                          alt="QR Code"
                          className="w-12 h-12 rounded-xl bg-white p-0.5 shrink-0 shadow"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-left">
                          <div className="text-[11px] font-bold">
                            Scan to Open Card 📲
                          </div>
                          <div className="text-[9px] opacity-70">
                            Interactive music, quiz & surprises
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-rose-300">
                          ❤️ Forever
                        </div>
                        <div className="text-[8px] opacity-50 font-mono">
                          heartpage.app
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 2. SQUARE FORMAT (1:1) */}
                {layoutFormat === 'square' && (
                  <>
                    <div className="flex items-center justify-between border-b pb-3 border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">💌</span>
                        <div>
                          <div className="text-xs font-bold">
                            For {receiverName}
                          </div>
                          <div className="text-[10px] opacity-70">
                            From {senderName}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: theme.badgeBg,
                          color: theme.badgeText,
                        }}
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/20"
                      >
                        {badgeText}
                      </div>
                    </div>

                    <div className="my-auto text-center space-y-3 px-2">
                      <h2 className="text-2xl font-black leading-tight">
                        {title}
                      </h2>
                      <p
                        style={{ color: theme.textSecondary }}
                        className="text-xs leading-relaxed"
                      >
                        {subtitle}
                      </p>

                      <div
                        style={{
                          backgroundColor: theme.cardBg,
                          borderColor: theme.cardBorder,
                        }}
                        className="p-3 rounded-2xl border text-xs italic line-clamp-3 text-center"
                      >
                        "{questionText}"
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                      <div className="flex items-center gap-2">
                        <img
                          src={qrCodeUrl}
                          alt="QR"
                          className="w-10 h-10 rounded-lg bg-white p-0.5 shadow"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-[10px] text-left leading-tight">
                          <div className="font-bold">Scan for Magic ✨</div>
                          <div className="opacity-60">Interactive Page</div>
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-bold">
                        Created with HeartPage 💖
                      </div>
                    </div>
                  </>
                )}

                {/* 3. LOVE CERTIFICATE */}
                {layoutFormat === 'certificate' && (
                  <div className="h-full flex flex-col justify-between text-center relative">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-mono tracking-widest text-amber-300 uppercase">
                        ★ OFFICIAL LOVE PASSPORT ★
                      </div>
                      <div className="text-[10px] font-bold text-amber-300">
                        NO. {data.id.slice(0, 8).toUpperCase()}
                      </div>
                    </div>

                    <div className="space-y-1 my-auto">
                      <div className="text-2xl font-black text-amber-200 uppercase tracking-wider font-serif">
                        Certificate of Eternal Affection
                      </div>
                      <div className="text-xs text-stone-300 italic">
                        This certifies that the heart of
                      </div>
                      <div className="text-xl font-black text-white underline decoration-amber-400 decoration-2 underline-offset-4">
                        {receiverName}
                      </div>
                      <div className="text-xs text-stone-300 italic pt-1">
                        is unconditionally cherished and adored by
                      </div>
                      <div className="text-base font-bold text-amber-300">
                        {senderName}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-amber-400/30 pt-2 text-[10px]">
                      <div className="text-left font-mono">
                        <div>DATE: {new Date().toLocaleDateString()}</div>
                        <div className="text-amber-400 font-bold">
                          STATUS: 100% VALID FOREVER
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-300 text-lg shadow-inner">
                        🌹
                      </div>
                      <div className="text-right font-mono">
                        <div>SEAL OF DEVOTION</div>
                        <div className="text-stone-400">HEARTPAGE VERIFIED</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. POLAROID FRAME */}
                {layoutFormat === 'polaroid' && (
                  <div className="h-full flex flex-col justify-between bg-stone-50 p-4 rounded-xl text-stone-900 shadow-2xl">
                    <div className="w-full h-64 bg-stone-900 rounded-lg overflow-hidden relative shadow-inner">
                      {firstPhoto ? (
                        <img
                          src={firstPhoto.url}
                          alt="Polaroid Memory"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-rose-300 bg-gradient-to-br from-rose-950 to-stone-900">
                          <Heart className="w-16 h-16 fill-rose-500 text-rose-500 mb-2 animate-pulse" />
                          <div className="text-xs font-semibold text-white">
                            {title}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="py-3 px-2 text-center space-y-1 font-caveat">
                      <div className="text-2xl font-bold tracking-wide text-stone-900">
                        {receiverName ? `With ${receiverName} ❤️` : 'Our Sweet Memory'}
                      </div>
                      <div className="text-sm text-stone-600 font-normal">
                        "{subtitle.slice(0, 80)}"
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-[10px] text-stone-500 font-mono">
                      <span>{new Date().toLocaleDateString()}</span>
                      <span className="font-bold text-rose-600">
                        HeartPage Snapshot 📷
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
