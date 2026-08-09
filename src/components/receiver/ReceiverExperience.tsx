/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, Sparkles, Plus, MessageCircle, Lock, ShieldCheck, QrCode, Share2 } from 'lucide-react';
import { HeartPageData } from '../../types';
import { THEMES } from '../../data/themes';
import { FloatingParticles } from '../common/FloatingParticles';
import { AudioPlayerFloat } from '../common/AudioPlayerFloat';
import { unlockAudio } from '../../utils/audio';
import { triggerCelebrationConfetti } from '../../utils/confetti';
import { EnvelopeCover } from './EnvelopeCover';
import { FallingHeartsShower } from './FallingHeartsShower';
import { HeroSection } from './HeroSection';
import { TimeCounterSection } from './TimeCounterSection';
import { QuestionSection } from './QuestionSection';
import { BirthdayCakeSection } from './BirthdayCakeSection';
import { PhotoMemoriesSection } from './PhotoMemoriesSection';
import { ScratchCardSection } from './ScratchCardSection';
import { ReasonsDeckSection } from './ReasonsDeckSection';
import { LetterSection } from './LetterSection';
import { ReceiverResponseBar } from './ReceiverResponseBar';
import { SecretChatView } from '../chat/SecretChatView';
import { QRCodeModal } from '../common/QRCodeModal';
import { encodePageDataToHash } from '../../utils/compression';

interface ReceiverExperienceProps {
  data: HeartPageData;
  initialChatOpen?: boolean;
  initialChatKey?: string;
  onSendReaction?: (reaction: string, customNote?: string) => void;
  onCreateYourOwn?: () => void;
}

export const ReceiverExperience: React.FC<ReceiverExperienceProps> = ({
  data,
  initialChatOpen = false,
  initialChatKey = '',
  onSendReaction,
  onCreateYourOwn,
}) => {
  const [isOpen, setIsOpen] = useState(!data.envelope.enabled);
  const [isChatOpen, setIsChatOpen] = useState(initialChatOpen);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const theme = THEMES[data.theme] || THEMES['rose-romance'];

  // Trigger celebration confetti on initial direct load if envelope was disabled
  useEffect(() => {
    if (!data.envelope.enabled && data.envelope.confettiBurst !== false) {
      const timer = setTimeout(() => {
        triggerCelebrationConfetti(data.envelope.celebrationStyle || 'hearts-fireworks', false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [data.envelope.enabled, data.envelope.confettiBurst, data.envelope.celebrationStyle]);

  const handleReactionSubmit = (reaction: string, customNote?: string) => {
    if (onSendReaction) {
      onSendReaction(reaction, customNote);
    }
  };

  // Build current clean short shareable link
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareableUrl = `${origin}/?p=${data.id}`;

  // If full-page WhatsApp chat is open, render SecretChatView directly
  if (isChatOpen) {
    return (
      <SecretChatView
        cardData={data}
        initialKey={initialChatKey}
        userRole="receiver"
        onBackToCard={() => setIsChatOpen(false)}
      />
    );
  }

  return (
    <div
      id="heartpage-receiver-root"
      className="min-h-screen w-full relative overflow-x-hidden transition-colors duration-700 selection:bg-rose-500 selection:text-white"
      style={{
        background: `radial-gradient(ellipse at top, ${theme.cardBg} 0%, ${theme.pageBg} 100%)`,
        color: theme.textPrimary,
      }}
    >
      {/* Floating Particle Atmosphere */}
      <FloatingParticles type={data.particleEffect} />

      {/* Celebratory Falling Hearts Particle Shower when opened */}
      {isOpen && data.envelope.confettiBurst !== false && (
        <FallingHeartsShower active={isOpen} durationSeconds={6} />
      )}

      {/* Floating Audio Player */}
      <AudioPlayerFloat
        track={data.musicTrack}
        customUrl={data.customMusicUrl}
        customName={data.customMusicName}
        autoPlay={isOpen}
      />

      {/* Envelope Unboxing Overlay if enabled */}
      <AnimatePresence>
        {!isOpen && data.envelope.enabled && (
          <EnvelopeCover
            envelope={data.envelope}
            receiverName={data.hero.receiverNickname || data.hero.receiverName}
            senderName={data.hero.senderName}
            theme={theme}
            onOpen={() => {
              unlockAudio();
              setIsOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* The 1-Page Dedicated Website Content */}
      <main className="relative z-10 w-full max-w-4xl mx-auto py-6 sm:py-12">
        {/* 1. Hero Dedication */}
        <HeroSection hero={data.hero} theme={theme} />

        {/* 2. Lovlio Time Counter */}
        {data.counter.enabled && (
          <TimeCounterSection counter={data.counter} theme={theme} />
        )}

        {/* 3. beMYN Interactive Question with Evasive No */}
        {data.question.enabled && (
          <QuestionSection
            question={data.question}
            receiverName={data.hero.receiverNickname || data.hero.receiverName}
            senderName={data.hero.senderName}
            theme={theme}
          />
        )}

        {/* 4. Birthday Virtual Cake & Candles */}
        {data.cake.enabled && (
          <BirthdayCakeSection
            cake={data.cake}
            receiverName={data.hero.receiverNickname || data.hero.receiverName}
            theme={theme}
          />
        )}

        {/* 5. Photo Memories Polaroids */}
        {data.photos.enabled && (
          <PhotoMemoriesSection photosConfig={data.photos} theme={theme} />
        )}

        {/* 6. Emocia Scratch Card Surprise */}
        {data.scratchCard.enabled && (
          <ScratchCardSection scratchCard={data.scratchCard} theme={theme} />
        )}

        {/* 7. Reasons Why Card Deck */}
        {data.reasons.enabled && (
          <ReasonsDeckSection reasonsConfig={data.reasons} theme={theme} />
        )}

        {/* 8. CreateGreeting Handwritten Letter */}
        {data.letter.enabled && (
          <LetterSection
            letter={data.letter}
            receiverName={data.hero.receiverNickname || data.hero.receiverName}
            senderName={data.hero.senderName}
            theme={theme}
          />
        )}

        {/* 9. Receiver Reaction Bar with Share Link and QR Code */}
        {data.receiverResponse.enabled && (
          <ReceiverResponseBar
            config={data.receiverResponse}
            receiverName={data.hero.receiverNickname || data.hero.receiverName}
            senderName={data.hero.senderName}
            theme={theme}
            shareUrl={shareableUrl}
            onOpenQrModal={() => setIsQrModalOpen(true)}
            onSendReaction={handleReactionSubmit}
          />
        )}

        {/* 10. SECRET 1-ON-1 WHATSAPP CHAT INVITATION CARD (At the end) */}
        <motion.section
          id="secret-chat-invitation-section"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto px-4 py-8 relative z-20"
        >
          <div
            className="rounded-3xl p-6 sm:p-8 backdrop-blur-2xl border shadow-2xl text-center relative overflow-hidden"
            style={{
              background: theme.cardBg,
              borderColor: theme.cardBorder,
              boxShadow: `0 20px 50px -10px ${theme.glow}`,
            }}
          >
            {/* Top Glow Accent */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-24 rounded-full blur-2xl opacity-30 pointer-events-none"
              style={{ background: theme.accent }}
            />

            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-xl border"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                borderColor: theme.cardBorder,
              }}
            >
              <MessageCircle size={28} />
            </div>

            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border shadow-sm backdrop-blur-md"
              style={{
                background: theme.badgeBg,
                borderColor: theme.cardBorder,
                color: theme.badgeText,
              }}
            >
              <Lock size={12} style={{ color: theme.accent }} />
              <span>Private Room • Key Protected</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold font-serif-display text-white mb-2">
              Talk with {data.hero.senderName || 'Your Love'} Privately 💬
            </h3>

            <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto mb-6 leading-relaxed">
              Open our full-screen WhatsApp-style secret room to chat, exchange voice notes, share photos, and send heart showers with end-to-end passkey security.
            </p>

            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-sm sm:text-base text-white shadow-xl flex items-center justify-center gap-2.5 mx-auto transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                boxShadow: `0 10px 30px -5px ${theme.accentLight}`,
              }}
            >
              <MessageCircle size={18} />
              <span>Open WhatsApp Secret Chat 💬</span>
            </button>

            <p className="text-[11px] text-stone-400 mt-4 flex items-center justify-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Protected by Room Passkey • 15-Day Auto-Destruct Privacy</span>
            </p>
          </div>
        </motion.section>

        {/* Bottom Craft Branding & Create-Your-Own CTA */}
        <footer className="text-center pt-8 pb-16 px-4 border-t border-white/10 mt-12 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-stone-400 mb-1">
            <span>Crafted with</span>
            <Heart size={12} className="text-rose-500 fill-current" />
            <span>using</span>
            <strong className="text-stone-200">HeartPage</strong>
          </div>

          {onCreateYourOwn && (
            <button
              type="button"
              onClick={onCreateYourOwn}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all hover:scale-105 shadow-md cursor-pointer"
            >
              <Plus size={14} className="text-rose-400" />
              <span>Create Your Own Free 1-Page Website ✨</span>
            </button>
          )}
        </footer>
      </main>

      {/* FLOATING SECRET CHAT LAUNCHER BUTTON */}
      <button
        type="button"
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-5 left-5 z-40 px-4 py-2.5 rounded-full text-white font-bold text-xs shadow-2xl flex items-center gap-2 transition-all hover:scale-110 active:scale-95 border border-white/20 backdrop-blur-xl cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
          boxShadow: `0 8px 25px -4px ${theme.accentLight}`,
        }}
        title="Open Secret 1-on-1 Chat"
      >
        <MessageCircle size={16} />
        <span className="hidden sm:inline">Secret Chat</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      </button>

      {/* QR Code Sharing Modal */}
      {isQrModalOpen && (
        <QRCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          url={shareableUrl}
          data={data}
        />
      )}
    </div>
  );
};
