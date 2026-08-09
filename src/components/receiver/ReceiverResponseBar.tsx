/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Send, Heart, MessageCircle, Check, Sparkles, Share2, QrCode, Copy } from 'lucide-react';
import { ReceiverResponseConfig, ThemeDefinition } from '../../types';
import { playConfettiSound } from '../../utils/audio';

interface ReceiverResponseBarProps {
  config: ReceiverResponseConfig;
  receiverName: string;
  senderName: string;
  theme: ThemeDefinition;
  shareUrl?: string;
  onOpenQrModal?: () => void;
  onSendReaction: (reaction: string, customNote?: string) => void;
}

export const ReceiverResponseBar: React.FC<ReceiverResponseBarProps> = ({
  config,
  receiverName,
  senderName,
  theme,
  shareUrl,
  onOpenQrModal,
  onSendReaction,
}) => {
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [customReply, setCustomReply] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!config.enabled) return null;

  const handleSelectPreset = (reaction: string) => {
    setSelectedReaction(reaction);
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReaction = selectedReaction || '💖 I loved this so much!';
    onSendReaction(finalReaction, customReply.trim() || undefined);
    setHasSubmitted(true);
    playConfettiSound();

    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.8 },
      colors: ['#f43f5e', '#ec4899', '#38bdf8', '#fbbf24'],
    });
  };

  return (
    <motion.section
      id="receiver-response-section"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="max-w-2xl mx-auto px-4 pt-6 pb-12 relative z-20"
    >
      <div
        className="relative rounded-3xl p-6 sm:p-8 border backdrop-blur-xl shadow-2xl text-center overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${theme.cardBg}, rgba(15, 10, 20, 0.95))`,
          borderColor: theme.cardBorder,
        }}
      >
        <AnimatePresence mode="wait">
          {!hasSubmitted ? (
            <motion.form
              key="reply-form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 border"
                style={{
                  background: theme.badgeBg,
                  borderColor: theme.cardBorder,
                  color: theme.badgeText,
                }}
              >
                <MessageCircle size={13} style={{ color: theme.accent }} />
                <span>Send Love Back</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 font-serif-display">
                {config.promptText || `Send a quick reaction to ${senderName || 'them'} 💖`}
              </h2>

              <p className="text-xs text-stone-300 mb-6">
                Tap your favorite response or write a personal message:
              </p>

              {/* Preset Reaction Chips */}
              <div className="flex flex-wrap justify-center gap-2 mb-4 w-full">
                {config.presetReactions.map((reaction, idx) => {
                  const isSelected = selectedReaction === reaction;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(reaction)}
                      className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 border text-left flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-rose-500 text-white border-rose-400 shadow-lg scale-105'
                          : 'bg-black/40 text-stone-200 border-white/10 hover:border-rose-400/50 hover:bg-black/60'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                      <span>{reaction}</span>
                    </button>
                  );
                })}
              </div>

              {/* Optional Custom Note Input */}
              {config.allowCustomReply && (
                <div className="w-full mb-5">
                  <textarea
                    value={customReply}
                    onChange={(e) => setCustomReply(e.target.value)}
                    placeholder={`Write a personal reply to ${senderName || 'them'}...`}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400 transition-colors resize-none"
                  />
                </div>
              )}

              {/* Action Buttons Row: Send Response + Share Link / QR Code side-by-side */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                {/* Submit Response Button */}
                <button
                  type="submit"
                  className="w-full sm:w-auto px-7 py-3 rounded-full font-bold text-sm text-white shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 border border-white/20 cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                    boxShadow: `0 0 20px ${theme.glow}`,
                  }}
                >
                  <Send size={15} />
                  <span>Send Response 💌</span>
                </button>

                {/* Share Link & QR Code Action Buttons next to reply */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {shareUrl && (
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex-1 sm:flex-initial px-4 py-3 rounded-full font-semibold text-xs text-stone-200 bg-white/10 hover:bg-white/20 border border-white/15 shadow flex items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
                      title="Copy Card Link"
                    >
                      {copiedLink ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} className="text-rose-400" />
                      )}
                      <span>{copiedLink ? 'Link Copied! ✨' : 'Copy Link 🔗'}</span>
                    </button>
                  )}

                  {onOpenQrModal && (
                    <button
                      type="button"
                      onClick={onOpenQrModal}
                      className="flex-1 sm:flex-initial px-4 py-3 rounded-full font-semibold text-xs text-stone-200 bg-white/10 hover:bg-white/20 border border-white/15 shadow flex items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
                      title="View QR Code to Scan or Print"
                    >
                      <QrCode size={14} className="text-rose-400" />
                      <span>QR Code 📱</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="success-receipt"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center py-4"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-xl mb-3 border border-emerald-400 bg-emerald-500/20 text-emerald-300 animate-bounce"
              >
                💌
              </div>

              <h3 className="text-xl font-bold text-white mb-1 font-serif-display">
                Response Sent to {senderName || 'Your Love'}! ✨
              </h3>

              <p className="text-xs text-stone-300 max-w-sm mb-4">
                Your reaction and message have been sealed with love. Thank you for making their day! 💖
              </p>

              {/* Memory Receipt Card */}
              <div className="w-full max-w-md p-4 rounded-xl bg-black/50 border border-white/15 text-left text-xs text-stone-300 mb-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/10 text-stone-400">
                  <span>💌 Reaction:</span>
                  <span className="font-semibold text-rose-300">{selectedReaction || '💖 I loved this!'}</span>
                </div>
                {customReply && (
                  <p className="mt-2 text-stone-200 italic font-body">
                    "{customReply}"
                  </p>
                )}
                <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-stone-500 text-right">
                  Recorded just now • HeartPage Experience
                </div>
              </div>

              {/* Share link & QR code after sending reaction */}
              <div className="flex items-center gap-2 pt-2">
                {shareUrl && (
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-stone-200 bg-white/10 hover:bg-white/20 border border-white/15 flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
                  >
                    {copiedLink ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} className="text-rose-400" />
                    )}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link 🔗'}</span>
                  </button>
                )}

                {onOpenQrModal && (
                  <button
                    type="button"
                    onClick={onOpenQrModal}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-stone-200 bg-white/10 hover:bg-white/20 border border-white/15 flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
                  >
                    <QrCode size={13} className="text-rose-400" />
                    <span>View QR Code 📱</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
};
