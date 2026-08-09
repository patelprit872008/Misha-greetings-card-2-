/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Feather,
  Heart,
  FastForward,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { LetterConfig, ThemeDefinition } from '../../types';
import { playTypewriterSound, playEnvelopeOpenSound } from '../../utils/audio';

interface LetterSectionProps {
  letter: LetterConfig;
  receiverName: string;
  senderName: string;
  theme: ThemeDefinition;
}

export const LetterSection: React.FC<LetterSectionProps> = ({
  letter,
  receiverName,
  senderName,
  theme,
}) => {
  if (!letter.enabled || letter.paragraphs.length === 0) return null;

  // Typewriter Enabled by default unless explicitly set to false
  const isTypewriterEnabled = letter.typewriterEffect !== false;

  // States for Typewriter effect
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(!isTypewriterEnabled);
  const [currentParaIndex, setCurrentParaIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  // Total characters across all paragraphs
  const totalCharacters = letter.paragraphs.reduce((acc, p) => acc + p.length, 0);

  // Calculate total typed characters so far
  const getTypedCharCount = () => {
    if (isCompleted) return totalCharacters;
    let count = 0;
    for (let i = 0; i < currentParaIndex; i++) {
      count += letter.paragraphs[i]?.length || 0;
    }
    count += currentCharIndex;
    return count;
  };

  const progressPercent = totalCharacters > 0
    ? Math.min(100, Math.round((getTypedCharCount() / totalCharacters) * 100))
    : 100;

  // Trigger typewriter when section scrolls into view
  useEffect(() => {
    if (!isTypewriterEnabled) {
      setIsCompleted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [isTypewriterEnabled, hasStarted]);

  // Main Typewriter Loop
  useEffect(() => {
    if (!isTypewriterEnabled || !hasStarted || isCompleted || isPaused) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      return;
    }

    const paragraphs = letter.paragraphs;
    if (paragraphs.length === 0) {
      setIsCompleted(true);
      return;
    }

    const currentParagraph = paragraphs[currentParaIndex] || '';

    // If reached end of current paragraph
    if (currentCharIndex >= currentParagraph.length) {
      if (currentParaIndex < paragraphs.length - 1) {
        // Pause between paragraphs
        typingTimerRef.current = window.setTimeout(() => {
          setCurrentParaIndex((prev) => prev + 1);
          setCurrentCharIndex(0);
        }, 450 / speedMultiplier);
      } else {
        // Finished all paragraphs
        setIsCompleted(true);
        playEnvelopeOpenSound();
      }
      return;
    }

    // Determine cadence delay for current character
    const char = currentParagraph[currentCharIndex];
    let delay = 22; // default typing interval in ms

    if (char === '.' || char === '!' || char === '?') {
      delay = 240; // pause at end of sentence
    } else if (char === ',' || char === ';' || char === ':') {
      delay = 90; // brief pause on commas
    } else if (char === ' ') {
      delay = 35;
    }

    const adjustedDelay = delay / speedMultiplier;

    typingTimerRef.current = window.setTimeout(() => {
      setCurrentCharIndex((prev) => prev + 1);

      // Play subtle quill sound on characters occasionally
      if (soundEnabled && currentCharIndex % 2 === 0) {
        playTypewriterSound();
      }
    }, adjustedDelay);

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [
    isTypewriterEnabled,
    hasStarted,
    isCompleted,
    isPaused,
    currentParaIndex,
    currentCharIndex,
    speedMultiplier,
    soundEnabled,
    letter.paragraphs,
  ]);

  // Skip typing: instantly reveal all text
  const handleSkipTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setIsCompleted(true);
    setCurrentParaIndex(letter.paragraphs.length - 1);
    setCurrentCharIndex(letter.paragraphs[letter.paragraphs.length - 1]?.length || 0);
  };

  // Replay handwriting animation from start
  const handleReplay = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setIsCompleted(false);
    setCurrentParaIndex(0);
    setCurrentCharIndex(0);
    setHasStarted(true);
    setIsPaused(false);
  };

  // Paper Background
  const getPaperBg = () => {
    if (letter.customPaperBg) return letter.customPaperBg;
    switch (letter.paperStyle) {
      case 'vintage-parchment':
        return 'linear-gradient(180deg, #fdfaf3 0%, #f6edd9 100%)';
      case 'rose-petals':
        return 'linear-gradient(180deg, #fff5f7 0%, #fee2e8 100%)';
      case 'midnight-letter':
        return 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)';
      case 'dark-velvet':
        return 'linear-gradient(180deg, #200914 0%, #12050b 100%)';
      case 'golden-glow':
        return 'linear-gradient(180deg, #fefce8 0%, #fef08a 100%)';
      case 'lavender-blush':
        return 'linear-gradient(180deg, #faf5ff 0%, #f3e8ff 100%)';
      case 'theme-match':
        return theme.cardBg;
      case 'clean-linen':
      default:
        return 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)';
    }
  };

  // Text Color
  const getTextColor = () => {
    if (letter.textColor) return letter.textColor;
    if (
      letter.paperStyle === 'midnight-letter' ||
      letter.paperStyle === 'dark-velvet'
    ) {
      return '#f1f5f9';
    }
    if (letter.paperStyle === 'theme-match') {
      return theme.textPrimary;
    }
    return '#292524';
  };

  // Border Color
  const getBorderColor = () => {
    if (letter.customBorderColor) return letter.customBorderColor;
    if (letter.paperStyle === 'theme-match') return theme.cardBorder;
    if (letter.paperStyle === 'midnight-letter') return 'rgba(129, 140, 248, 0.4)';
    if (letter.paperStyle === 'dark-velvet') return 'rgba(244, 63, 94, 0.4)';
    return 'rgba(217, 180, 130, 0.5)';
  };

  // Font Class
  const fontClass = letter.fontFamily || 'font-handwriting';

  // Wax Seal Color & Emoji
  const sealColor = letter.waxSealColor || '#e11d48';
  const sealEmoji = letter.waxSealEmoji || '🌹';

  return (
    <motion.section
      ref={sectionRef}
      id="handwritten-letter-section"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="max-w-2xl mx-auto px-4 py-8 relative z-20"
    >
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border shadow-sm backdrop-blur-md"
          style={{
            background: theme.badgeBg,
            borderColor: theme.cardBorder,
            color: theme.badgeText,
          }}
        >
          <Feather size={14} style={{ color: theme.accent }} />
          <span>Handwritten Letter</span>
          {!isCompleted && isTypewriterEnabled && (
            <span className="flex items-center gap-1 text-[10px] text-rose-300 font-bold ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              Writing...
            </span>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif-display">
          {letter.title || 'A Letter From My Heart 📜'}
        </h2>
      </div>

      {/* Parchment Paper Container */}
      <div
        className={`relative rounded-3xl p-7 sm:p-10 shadow-2xl border overflow-hidden ${fontClass} transition-all duration-500`}
        style={{
          background: getPaperBg(),
          borderColor: getBorderColor(),
          color: getTextColor(),
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Decorative corner accent */}
        <div className="absolute top-4 right-4 w-3.5 h-3.5 rounded-full bg-amber-500/40 shadow-inner" />

        {/* Real-time Ink Writing Progress Bar */}
        {isTypewriterEnabled && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-stone-300/30 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Header Bar with Receiver & Interactive Handwriting Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-400/20">
          <div>
            <p className="text-2xl sm:text-3xl font-bold">
              Dearest {receiverName || 'My Love'},
            </p>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full border shadow-sm font-sans font-semibold tracking-wider uppercase opacity-85 mt-1 inline-block"
              style={{
                borderColor: getBorderColor(),
                background: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              To: {receiverName || 'My Special One'}
            </span>
          </div>

          {/* Typewriter Floating Quick Control Pills */}
          {isTypewriterEnabled && (
            <div className="flex items-center gap-1.5 font-sans text-xs">
              {!isCompleted ? (
                <>
                  {/* Speed toggle 1x / 2x */}
                  <button
                    type="button"
                    onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 2 : 1)}
                    className="px-2.5 py-1 rounded-lg bg-black/10 hover:bg-black/20 text-current border border-current/20 flex items-center gap-1 font-bold text-[11px] transition-all cursor-pointer"
                    title={`Current speed: ${speedMultiplier}x (Click to toggle)`}
                  >
                    <Zap size={11} className={speedMultiplier === 2 ? 'text-amber-500 fill-amber-500' : ''} />
                    <span>{speedMultiplier}x Speed</span>
                  </button>

                  {/* Sound toggle */}
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-current border border-current/20 transition-all cursor-pointer"
                    title={soundEnabled ? 'Mute writing sound' : 'Unmute writing sound'}
                  >
                    {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  </button>

                  {/* Skip to reveal entire letter */}
                  <button
                    type="button"
                    onClick={handleSkipTyping}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer text-[11px]"
                    title="Instantly reveal full letter"
                  >
                    <FastForward size={12} />
                    <span>Read All</span>
                  </button>
                </>
              ) : (
                /* Replay writing button when finished */
                <button
                  type="button"
                  onClick={handleReplay}
                  className="px-3 py-1 rounded-lg bg-black/10 hover:bg-black/20 text-current border border-current/20 font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer text-[11px]"
                  title="Replay handwritten letter animation"
                >
                  <RotateCcw size={12} />
                  <span>Replay Writing</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Letter Paragraphs with Typewriter Output */}
        <div className="space-y-4 text-xl sm:text-2xl leading-relaxed min-h-[120px]">
          {letter.paragraphs.map((p, pIdx) => {
            // Determine visible text for this paragraph
            let visibleText = '';
            let showCursor = false;

            if (isCompleted || !isTypewriterEnabled) {
              visibleText = p;
            } else if (pIdx < currentParaIndex) {
              visibleText = p;
            } else if (pIdx === currentParaIndex) {
              visibleText = p.substring(0, currentCharIndex);
              showCursor = true;
            } else {
              visibleText = '';
            }

            if (!visibleText && !showCursor) return null;

            return (
              <p key={pIdx} className="tracking-wide relative inline-block w-full">
                <span>{visibleText}</span>

                {/* Animated Quill / Pen Ink Cursor */}
                {showCursor && !isCompleted && (
                  <span className="inline-flex items-center ml-0.5 align-middle select-none">
                    <span className="w-0.5 h-6 bg-rose-600 inline-block animate-pulse rounded-full" />
                    <span className="text-xs text-rose-500 -ml-1 animate-bounce">✍️</span>
                  </span>
                )}
              </p>
            );
          })}
        </div>

        {/* Sign-Off, To/From & Wax Stamp Seal (Transitions in when typing completes) */}
        <AnimatePresence>
          {(isCompleted || !isTypewriterEnabled) && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="mt-8 pt-4 border-t border-stone-400/20 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <p className="text-xl italic opacity-85">
                  {letter.signOff || 'With all my love & care,'}
                </p>
                <p
                  className="text-2xl sm:text-3xl font-bold mt-1"
                  style={{ color: theme.accent || '#e11d48' }}
                >
                  {letter.authorSignature || senderName || 'Forever Yours'}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs font-sans opacity-75">
                  <span><strong>From:</strong> {senderName || 'Your Admirer'}</span>
                  <span>•</span>
                  <span><strong>To:</strong> {receiverName || 'My Love'}</span>
                </div>
              </div>

              {/* Wax Stamp Seal with interactive gentle glow */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-xl border border-amber-300 select-none cursor-pointer shrink-0"
                style={{
                  background: `radial-gradient(circle, ${sealColor}, #9f1239)`,
                  color: '#fff',
                  boxShadow: '0 8px 20px -4px rgba(225, 29, 72, 0.5)',
                }}
                title="Sealed with Eternal Love"
              >
                {sealEmoji}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
};
