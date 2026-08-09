/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Sparkles, RefreshCw, Flame, Heart, Star, Crown } from 'lucide-react';
import { CakeConfig, ThemeDefinition } from '../../types';
import { getCakeThemeById } from '../../data/cakeThemes';
import { playBlowCandleSound, playConfettiSound } from '../../utils/audio';

interface BirthdayCakeSectionProps {
  cake: CakeConfig;
  receiverName: string;
  theme: ThemeDefinition;
}

export const BirthdayCakeSection: React.FC<BirthdayCakeSectionProps> = ({
  cake,
  receiverName,
  theme,
}) => {
  const [blownCandles, setBlownCandles] = useState<number[]>([]);

  if (!cake.enabled) return null;

  const currentCakeTheme = getCakeThemeById(cake.cakeThemeId || cake.cakeType);
  const totalCandles = Math.max(1, Math.min(cake.candlesCount || 3, 9));
  const allBlown = blownCandles.length >= totalCandles;

  const handleBlowCandle = (index: number) => {
    if (blownCandles.includes(index)) return;

    playBlowCandleSound();
    const updated = [...blownCandles, index];
    setBlownCandles(updated);

    if (updated.length >= totalCandles) {
      setTimeout(() => {
        playConfettiSound();
        confetti({
          particleCount: 160,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#ff70a6', '#ffd670', '#70d6ff', '#e9ff70', '#a855f7'],
        });
      }, 300);
    }
  };

  const handleBlowAll = () => {
    playBlowCandleSound();
    const all = Array.from({ length: totalCandles }, (_, i) => i);
    setBlownCandles(all);
    setTimeout(() => {
      playConfettiSound();
      confetti({
        particleCount: 200,
        spread: 95,
        origin: { y: 0.6 },
      });
    }, 300);
  };

  const handleRelight = () => {
    setBlownCandles([]);
  };

  // Candle stick stripe styling based on theme
  const getCandleBackground = () => {
    switch (currentCakeTheme.candleStyle) {
      case 'gold':
        return 'repeating-linear-gradient(45deg, #d97706, #d97706 3px, #fef08a 3px, #fef08a 6px)';
      case 'neon':
        return 'repeating-linear-gradient(45deg, #06b6d4, #06b6d4 3px, #a855f7 3px, #a855f7 6px)';
      case 'silver':
        return 'repeating-linear-gradient(45deg, #71717a, #71717a 3px, #f4f4f5 3px, #f4f4f5 6px)';
      case 'twilight':
        return 'repeating-linear-gradient(45deg, #9333ea, #9333ea 3px, #f472b6 3px, #f472b6 6px)';
      case 'rainbow':
        return 'linear-gradient(180deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6)';
      case 'rose':
      default:
        return 'repeating-linear-gradient(45deg, #f43f5e, #f43f5e 3px, #ffffff 3px, #ffffff 6px)';
    }
  };

  return (
    <motion.section
      id="birthday-cake-widget"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="max-w-2xl mx-auto px-4 py-8 relative z-20"
    >
      <div
        className="relative rounded-3xl p-6 sm:p-10 border backdrop-blur-xl shadow-2xl overflow-hidden text-center"
        style={{
          background: `linear-gradient(145deg, ${theme.cardBg}, rgba(15, 10, 20, 0.96))`,
          borderColor: theme.cardBorder,
        }}
      >
        {/* Top Badge */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 border shadow-sm"
          style={{
            background: theme.badgeBg,
            borderColor: theme.cardBorder,
            color: theme.badgeText,
          }}
        >
          <span className="text-sm">{currentCakeTheme.emoji}</span>
          <span>{currentCakeTheme.name}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 font-serif-display">
          Make A Wish, {receiverName || 'Birthday Star'}! 🎂
        </h2>

        <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto mb-6">
          {!allBlown
            ? cake.wishPrompt || 'Close your eyes, make a secret wish, and tap the candles to blow them out!'
            : cake.wishedMessage || 'Yay! All candles blown out! May your sweetest wish come true! 🥳✨'}
        </p>

        {/* The 3D Animated Cake Stage */}
        <div className="relative flex flex-col items-center justify-center my-6 py-2 select-none">
          {/* Ambient Glow behind cake */}
          <div
            className="absolute w-72 h-48 rounded-full blur-3xl opacity-40 pointer-events-none -z-10"
            style={{ background: currentCakeTheme.accentGlow }}
          />

          {/* Floating Topping Emojis / Decorative elements */}
          <div className="flex justify-center gap-4 sm:gap-6 mb-2 z-20">
            {currentCakeTheme.toppingIcons.map((icon, idx) => (
              <motion.span
                key={idx}
                animate={{
                  y: [0, -4, 0],
                  rotate: [0, idx % 2 === 0 ? 5 : -5, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.5 + idx * 0.4,
                  ease: 'easeInOut',
                }}
                className="text-lg sm:text-xl drop-shadow-md"
              >
                {icon}
              </motion.span>
            ))}
          </div>

          {/* Candles Container */}
          <div className="flex justify-center items-end gap-3 sm:gap-5 mb-[-6px] z-20">
            {Array.from({ length: totalCandles }).map((_, idx) => {
              const isLit = !blownCandles.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => handleBlowCandle(idx)}
                  className="flex flex-col items-center cursor-pointer group select-none transition-transform hover:scale-110 active:scale-95"
                  title={isLit ? 'Tap to blow out candle' : 'Candle blown out'}
                >
                  {/* Flame / Smoke */}
                  <div className="h-8 flex items-center justify-center">
                    {isLit ? (
                      <motion.div
                        animate={{
                          scale: [1, 1.15, 0.95, 1.1, 1],
                          rotate: [-2, 3, -3, 2, 0],
                        }}
                        transition={{ repeat: Infinity, duration: 1.1 + (idx % 3) * 0.2 }}
                        className="w-4 h-6 rounded-full bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-100 shadow-[0_0_15px_#f59e0b] relative"
                      >
                        <div className="absolute inset-0 bg-white/50 rounded-full blur-[1px]" />
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 0, y: -18, x: [-2, 2, -1] }}
                        transition={{ duration: 1.5 }}
                        className="text-stone-400 text-xs font-mono select-none"
                      >
                        💨
                      </motion.div>
                    )}
                  </div>

                  {/* Candle Stick */}
                  <div
                    className="w-2.5 sm:w-3.5 h-10 sm:h-12 rounded-t-sm shadow-md border border-white/20"
                    style={{
                      background: getCandleBackground(),
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* 3D Tier 1: Top Tier (Cylinder perspective) */}
          <div
            className="w-48 sm:w-56 h-14 sm:h-16 rounded-t-2xl border shadow-xl flex items-center justify-center relative overflow-hidden transition-all"
            style={{
              background: currentCakeTheme.topTierGradient,
              borderColor: 'rgba(255,255,255,0.3)',
              boxShadow: `inset 0 4px 8px rgba(255,255,255,0.2), 0 8px 16px rgba(0,0,0,0.4)`,
            }}
          >
            {/* Frosting drips on top edge */}
            <div
              className="absolute top-0 inset-x-0 h-4 rounded-b-xl opacity-90"
              style={{ background: currentCakeTheme.frostingColor }}
            />
            {/* Dripping drops */}
            <div className="absolute top-3 inset-x-0 flex justify-around px-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-3 rounded-b-full shadow-sm"
                  style={{ background: currentCakeTheme.dripColor }}
                />
              ))}
            </div>

            <span className="text-white text-[10px] sm:text-xs font-extrabold tracking-widest uppercase relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] px-3 py-0.5 rounded-full bg-black/25 backdrop-blur-xs">
              {currentCakeTheme.bannerText}
            </span>
          </div>

          {/* 3D Tier 2: Bottom Tier (Broader cylinder) */}
          <div
            className="w-64 sm:w-80 h-16 sm:h-20 rounded-b-2xl border-x border-b shadow-2xl flex items-center justify-between px-6 relative overflow-hidden transition-all"
            style={{
              background: currentCakeTheme.bottomTierGradient,
              borderColor: 'rgba(255,255,255,0.25)',
              boxShadow: `inset 0 4px 10px rgba(255,255,255,0.15), 0 12px 24px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Frosting separator strip */}
            <div
              className="absolute top-0 inset-x-0 h-3 opacity-80"
              style={{ background: currentCakeTheme.frostingColor }}
            />

            {/* Decorative pearls row */}
            <div className="flex justify-between w-full relative z-10">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full shadow-md border border-white/40"
                  style={{ background: currentCakeTheme.pearlColor }}
                />
              ))}
            </div>
          </div>

          {/* 3D Cake Stand / Plate */}
          <div
            className="w-72 sm:w-92 h-4 sm:h-5 rounded-full shadow-2xl border border-white/20 mt-0.5"
            style={{
              background: currentCakeTheme.plateGradient,
              boxShadow: '0 10px 25px -3px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.5)',
            }}
          />
          {/* Plate Foot Stand */}
          <div className="w-24 sm:w-32 h-3.5 bg-gradient-to-r from-stone-500 via-stone-300 to-stone-600 rounded-b-xl shadow-lg border-x border-b border-white/20" />
        </div>

        {/* Action button */}
        {!allBlown ? (
          <button
            type="button"
            onClick={handleBlowAll}
            className="mt-4 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white shadow-lg border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: theme.accent,
              boxShadow: `0 0 20px ${theme.glow}`,
            }}
          >
            💨 Blow Out All Candles Together!
          </button>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-3">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-2xl border bg-black/50 text-emerald-300 text-xs sm:text-sm font-medium max-w-md shadow-lg"
              style={{ borderColor: theme.cardBorder }}
            >
              🎉 <span className="font-bold">Wish registered in the stars!</span> May all your birthday dreams bloom into reality! ✨
            </motion.div>

            <button
              type="button"
              onClick={handleRelight}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-stone-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Relight Candles 🕯️</span>
            </button>
          </div>
        )}
      </div>
    </motion.section>
  );
};

