/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Sparkles, Heart, Gift, Mail, KeyRound, AlertCircle } from 'lucide-react';
import { EnvelopeConfig, ThemeDefinition } from '../../types';
import { playEnvelopeOpenSound, playConfettiSound } from '../../utils/audio';
import { triggerCelebrationConfetti } from '../../utils/confetti';

interface EnvelopeCoverProps {
  envelope: EnvelopeConfig;
  receiverName: string;
  senderName: string;
  theme: ThemeDefinition;
  onOpen: () => void;
}

export const EnvelopeCover: React.FC<EnvelopeCoverProps> = ({
  envelope,
  receiverName,
  senderName,
  theme,
  onOpen,
}) => {
  const [passcodeAttempt, setPasscodeAttempt] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [isUnfolding, setIsUnfolding] = useState(false);

  const handleOpenClick = () => {
    if (envelope.requiresPasscode && envelope.passcode.trim()) {
      if (passcodeAttempt.trim().toLowerCase() !== envelope.passcode.trim().toLowerCase()) {
        setPasscodeError(true);
        setTimeout(() => setPasscodeError(false), 2000);
        return;
      }
    }

    playEnvelopeOpenSound();

    // Trigger confetti & falling hearts fireworks explosion if enabled
    if (envelope.confettiBurst !== false) {
      triggerCelebrationConfetti(envelope.celebrationStyle || 'hearts-fireworks', true);
    } else {
      playConfettiSound();
    }

    setIsUnfolding(true);
    setTimeout(() => {
      onOpen();
    }, 900);
  };

  return (
    <motion.div
      id="envelope-unboxing-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
      style={{
        background: `radial-gradient(circle at center, ${theme.cardBg} 0%, ${theme.pageBg} 100%)`,
      }}
    >
      {/* Background ambient glowing rings */}
      <div
        className="absolute w-[450px] h-[450px] rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ background: theme.glow }}
      />

      <div className="relative z-10 max-w-md w-full text-center flex flex-col items-center">
        {/* Top Tag */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 backdrop-blur-md shadow-lg"
          style={{ background: theme.badgeBg, color: theme.badgeText }}
        >
          <Sparkles size={13} className="text-amber-300" />
          <span>A Personalized Surprise For {receiverName || 'You'}</span>
        </motion.div>

        {/* The Envelope / Box Card */}
        <motion.div
          animate={isUnfolding ? { scale: 1.08, rotateY: 15, y: -20 } : { y: [0, -6, 0] }}
          transition={isUnfolding ? { duration: 0.8 } : { repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="w-full relative cursor-pointer group"
          onClick={!envelope.requiresPasscode ? handleOpenClick : undefined}
        >
          {envelope.style === 'gift-box' ? (
            /* 3D Gift Box Style */
            <div
              className="relative p-8 sm:p-10 rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(244,63,94,0.35)]"
              style={{
                background: `linear-gradient(135deg, ${theme.cardBg}, rgba(15, 10, 20, 0.95))`,
                borderColor: theme.cardBorder,
              }}
            >
              {/* Ribbon Graphic */}
              <div
                className="absolute top-0 bottom-0 w-8 opacity-70"
                style={{ background: theme.accent }}
              />
              <div
                className="absolute left-0 right-0 h-8 opacity-70"
                style={{ background: theme.accent }}
              />

              <div
                className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-xl mb-4 border"
                style={{
                  background: theme.accent,
                  borderColor: 'rgba(255,255,255,0.3)',
                }}
              >
                {envelope.sealEmoji || '🎁'}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
                {envelope.frontLabel || 'Tap to Unwrap Your Gift 🎁'}
              </h2>
              <p className="text-xs text-stone-300">
                From <span className="font-semibold text-rose-300">{senderName || 'Someone Special'}</span>
              </p>
            </div>
          ) : (
            /* Wax Seal Envelope / Vintage Letter Style */
            <div
              className="relative p-8 sm:p-10 rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-rose-400/50"
              style={{
                background: `linear-gradient(145deg, ${theme.cardBg}, rgba(10, 6, 12, 0.95))`,
                borderColor: theme.cardBorder,
              }}
            >
              {/* Envelope Flap Triangular Overlay */}
              <div
                className="absolute top-0 left-0 right-0 h-24 opacity-25 pointer-events-none"
                style={{
                  background: `linear-gradient(to bottom, ${theme.accent}, transparent)`,
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                }}
              />

              {/* Wax Seal Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.12, rotate: 5 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleOpenClick}
                className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-2xl mb-4 border-2 transition-transform"
                style={{
                  background: `radial-gradient(circle at 35% 35%, #ff4d6d, ${theme.accent})`,
                  borderColor: '#ffd166',
                  boxShadow: `0 0 25px ${theme.glow}`,
                }}
                aria-label="Open envelope"
              >
                <span>{envelope.sealEmoji || '💌'}</span>
              </motion.button>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5 font-serif-display">
                {envelope.frontLabel || 'To My Special One 💌'}
              </h2>

              <p className="text-xs text-stone-300">
                Handcrafted with love by <span className="font-semibold text-rose-300">{senderName || 'Your Love'}</span>
              </p>
            </div>
          )}
        </motion.div>

        {/* Passcode Unlock Form if enabled */}
        {envelope.requiresPasscode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mt-5 p-4 rounded-xl border backdrop-blur-md"
            style={{
              background: 'rgba(20, 15, 25, 0.8)',
              borderColor: passcodeError ? '#ef4444' : theme.cardBorder,
            }}
          >
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium mb-2 justify-center">
              <Lock size={13} />
              <span>Password Protected Letter</span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="text"
                  value={passcodeAttempt}
                  onChange={(e) => {
                    setPasscodeAttempt(e.target.value);
                    setPasscodeError(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenClick()}
                  placeholder="Enter secret passcode..."
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-black/40 border border-white/15 text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenClick}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white shadow-lg transition-transform active:scale-95 flex items-center gap-1.5"
                style={{ background: theme.accent }}
              >
                <span>Unlock</span>
              </button>
            </div>

            {passcodeError && (
              <p className="text-xs text-rose-400 mt-2 flex items-center justify-center gap-1">
                <AlertCircle size={13} />
                <span>Incorrect passcode! Check the hint below.</span>
              </p>
            )}

            {envelope.passcodeHint && (
              <p className="text-xs text-stone-400 mt-2 text-center">
                💡 <span className="italic">{envelope.passcodeHint}</span>
              </p>
            )}
          </motion.div>
        )}

        {/* Tap to Open CTA Button */}
        {!envelope.requiresPasscode && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={handleOpenClick}
            className="mt-6 px-6 py-3 rounded-full font-semibold text-sm text-white shadow-xl flex items-center gap-2 border border-white/20 transition-all hover:scale-105 active:scale-95 group"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
              boxShadow: `0 4px 20px ${theme.glow}`,
            }}
          >
            <Heart size={16} className="text-rose-200 fill-current group-hover:animate-ping" />
            <span>Tap to Open Letter 💌</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
