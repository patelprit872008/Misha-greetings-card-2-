/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart } from 'lucide-react';
import { HeroConfig, ThemeDefinition } from '../../types';

interface HeroSectionProps {
  hero: HeroConfig;
  theme: ThemeDefinition;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ hero, theme }) => {
  return (
    <motion.section
      id="hero-greeting-section"
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="text-center pt-8 pb-10 px-4 max-w-3xl mx-auto relative z-20 flex flex-col items-center"
    >
      {/* Top Floating Badge */}
      {hero.badgeText && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 border shadow-sm backdrop-blur-md"
          style={{
            background: theme.badgeBg,
            borderColor: theme.cardBorder,
            color: theme.badgeText,
          }}
        >
          <Sparkles size={13} className="text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
          <span>{hero.badgeText}</span>
        </motion.div>
      )}

      {/* Hero Emoji Avatar */}
      {hero.heroEmoji && (
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 4, -4, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl shadow-2xl mb-6 border-2 relative"
          style={{
            background: `radial-gradient(circle, ${theme.accentLight}, ${theme.cardBg})`,
            borderColor: theme.accent,
            boxShadow: `0 0 30px ${theme.glow}`,
          }}
        >
          <span>{hero.heroEmoji}</span>
          <span className="absolute -bottom-1 -right-1 text-lg">✨</span>
        </motion.div>
      )}

      {/* For [Receiver Nickname] from [Sender Name] */}
      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium tracking-wide uppercase text-stone-300 mb-3">
        <span>From <strong className="text-white font-bold">{hero.senderName || 'Your Love'}</strong></span>
        <span>•</span>
        <span className="flex items-center gap-1">
          To <strong className="text-rose-300 font-bold underline decoration-rose-400/40 underline-offset-4">{hero.receiverNickname || hero.receiverName || 'You'}</strong>
          <Heart size={13} className="text-rose-400 fill-current inline ml-0.5" />
        </span>
      </div>

      {/* Main Grand Title */}
      <h1
        className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight font-serif-display leading-tight sm:leading-tight mb-4"
        style={{ color: theme.textPrimary }}
      >
        {hero.mainTitle || 'To The One Who Makes Every Day Magical ✨'}
      </h1>

      {/* Subtitle / Personal Dedication */}
      {hero.subtitle && (
        <p className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed text-stone-300 font-body">
          {hero.subtitle}
        </p>
      )}
    </motion.section>
  );
};
