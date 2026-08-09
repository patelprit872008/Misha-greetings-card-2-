/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Heart, Sparkles, Award, CheckCircle, RefreshCw } from 'lucide-react';
import { QuestionConfig, ThemeDefinition } from '../../types';
import { playConfettiSound } from '../../utils/audio';

interface QuestionSectionProps {
  question: QuestionConfig;
  receiverName: string;
  senderName: string;
  theme: ThemeDefinition;
}

const NO_BUTTON_EXCUSES = [
  'Are you sure? 🥺',
  'Think again! 😭',
  'Wrong button! 😂',
  'You can\'t escape my love! 💖',
  'Try the other one! 🌹',
  'Pretty please? 🥺✨',
  'Click the pink one! 💕',
  'Don\'t break my heart! 💔',
  'Nice try haha! 😜',
  'Error 404: No not found 🚫',
];

export const QuestionSection: React.FC<QuestionSectionProps> = ({
  question,
  receiverName,
  senderName,
  theme,
}) => {
  const [answeredYes, setAnsweredYes] = useState(false);
  const [noIndex, setNoIndex] = useState(0);
  const [noPosition, setNoPosition] = useState({ x: 0, y: 0 });
  const [yesScale, setYesScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!question.enabled) return null;

  const triggerHeartConfetti = () => {
    playConfettiSound();

    // Multistage confetti cannon
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#f43f5e', '#ec4899', '#ffd166'],
    });
    fire(0.2, {
      spread: 60,
      colors: ['#ff70a6', '#ff9770', '#ffd670'],
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      colors: ['#ffffff', '#f43f5e', '#a855f7'],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  const handleYesClick = () => {
    setAnsweredYes(true);
    triggerHeartConfetti();
  };

  const handleNoInteraction = () => {
    if (!question.evasiveNo) return;

    // Move button randomly within safe bounds
    const maxX = 120;
    const maxY = 60;
    const randomX = (Math.random() * 2 - 1) * maxX;
    const randomY = (Math.random() * 2 - 1) * maxY;

    setNoPosition({ x: randomX, y: randomY });
    setNoIndex((prev) => (prev + 1) % NO_BUTTON_EXCUSES.length);
    setYesScale((prev) => Math.min(prev + 0.1, 1.4));
  };

  return (
    <motion.section
      id="interactive-question-widget"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="max-w-2xl mx-auto px-4 py-8 relative z-20"
    >
      <div
        ref={containerRef}
        className="relative rounded-2xl p-6 sm:p-10 border backdrop-blur-xl shadow-2xl overflow-hidden text-center"
        style={{
          background: `linear-gradient(145deg, ${theme.cardBg}, rgba(20, 10, 25, 0.95))`,
          borderColor: theme.cardBorder,
        }}
      >
        <AnimatePresence mode="wait">
          {!answeredYes ? (
            /* Question State */
            <motion.div
              key="question-box"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              {/* Question Badge */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border"
                style={{
                  background: theme.badgeBg,
                  borderColor: theme.cardBorder,
                  color: theme.badgeText,
                }}
              >
                <Sparkles size={12} className="text-amber-300" />
                <span>The Big Question 💕</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-6 font-serif-display leading-snug">
                {question.question || 'Will You Be My Valentine? 🌹'}
              </h2>

              {/* Action Buttons: YES vs Evasive NO */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 relative min-h-[90px] w-full mt-2">
                {/* YES Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  animate={{ scale: yesScale }}
                  onClick={handleYesClick}
                  className="px-8 py-3.5 rounded-full font-bold text-white shadow-2xl flex items-center gap-2 text-base sm:text-lg transition-all border border-white/30"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                    boxShadow: `0 0 25px ${theme.glow}`,
                  }}
                  id="question-yes-btn"
                >
                  <Heart size={20} className="fill-current text-white animate-bounce" />
                  <span>{question.yesButtonText || 'YES! 💖'}</span>
                </motion.button>

                {/* NO Button (Evasive) */}
                <motion.button
                  type="button"
                  animate={{ x: noPosition.x, y: noPosition.y }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  onMouseEnter={handleNoInteraction}
                  onClick={handleNoInteraction}
                  onTouchStart={handleNoInteraction}
                  className="px-6 py-3 rounded-full font-medium text-stone-300 bg-stone-800/80 border border-stone-700 hover:bg-stone-700 text-sm shadow-md transition-colors select-none"
                  id="question-no-btn"
                >
                  <span>
                    {noIndex === 0
                      ? question.noButtonText || 'No 💔'
                      : NO_BUTTON_EXCUSES[noIndex]}
                  </span>
                </motion.button>
              </div>

              <p className="text-xs text-stone-400 mt-5 italic">
                (There is only one correct answer 😉)
              </p>
            </motion.div>
          ) : (
            /* Celebration / Success State */
            <motion.div
              key="celebration-box"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="flex flex-col items-center"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-xl mb-4 border-2 animate-bounce"
                style={{
                  background: theme.accent,
                  borderColor: '#fff',
                }}
              >
                🎉
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 font-serif-display">
                {question.yesSuccessTitle || 'YAYYY! Best Decision Ever! 💖🥳'}
              </h2>

              <p className="text-stone-200 text-sm sm:text-base max-w-md mx-auto mb-6 leading-relaxed">
                {question.yesSuccessMessage || 'You just made me the happiest person in the universe! ✨'}
              </p>

              {question.yesSuccessImage && (
                <div className="w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border mb-6" style={{ borderColor: theme.cardBorder }}>
                  <img
                    src={question.yesSuccessImage}
                    alt="Celebration"
                    className="w-full h-48 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Official Certificate */}
              {question.showCertificate && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="w-full max-w-md p-5 rounded-xl border-2 border-dashed relative bg-black/40 text-stone-200 text-left shadow-2xl my-2"
                  style={{ borderColor: theme.accent }}
                >
                  <div className="flex items-center justify-between border-b pb-2 mb-3 border-white/15">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">
                      <Award size={16} />
                      <span>Official Certificate of Happiness</span>
                    </div>
                    <CheckCircle size={16} className="text-emerald-400" />
                  </div>

                  <p className="text-xs text-stone-300 mb-2">
                    This certifies that <strong className="text-white">{receiverName || 'Recipient'}</strong> and <strong className="text-white">{senderName || 'Sender'}</strong> are officially locked into endless happiness, laughter, and special dates!
                  </p>

                  <div className="flex justify-between items-center text-[10px] text-stone-400 pt-2 border-t border-white/10">
                    <span>Issued with 100% Love</span>
                    <span className="font-mono">Status: ACCEPTED ✨</span>
                  </div>
                </motion.div>
              )}

              <button
                type="button"
                onClick={triggerHeartConfetti}
                className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-rose-300 border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
              >
                <RefreshCw size={12} />
                <span>Blast More Confetti! 🎊</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
};
