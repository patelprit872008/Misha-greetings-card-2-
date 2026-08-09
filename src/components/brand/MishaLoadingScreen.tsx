/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart } from 'lucide-react';
import mishaLogoImage from '../../assets/images/misha_card_logo_1786265266510.jpg';

interface MishaLoadingScreenProps {
  message?: string;
}

export const MishaLoadingScreen: React.FC<MishaLoadingScreenProps> = ({
  message = 'Preparing your creative sanctuary...',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0d12] text-white select-none overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-tr from-rose-600/25 via-purple-600/20 to-amber-500/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-80 h-32 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-md"
      >
        {/* Animated Logo with Rings */}
        <div className="relative mb-6">
          {/* Animated Glowing Ring */}
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.06, 1],
            }}
            transition={{
              rotate: { repeat: Infinity, duration: 12, ease: 'linear' },
              scale: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
            }}
            className="absolute -inset-2.5 rounded-3xl bg-gradient-to-r from-rose-500 via-amber-400 to-purple-500 opacity-60 blur-md"
          />

          {/* Logo Frame */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-rose-400/60 shadow-2xl shadow-rose-950 bg-stone-900 flex items-center justify-center">
            <img
              src={mishaLogoImage}
              alt="Misha Greetings Cards Logo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Floating Accents */}
          <motion.div
            animate={{ y: [-2, 2, -2], rotate: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-rose-600 border border-white/40 shadow-lg"
          >
            <Heart size={14} className="text-white fill-white" />
          </motion.div>

          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-2 -left-2 p-1.5 rounded-full bg-amber-500 border border-white/40 shadow-lg"
          >
            <Sparkles size={14} className="text-white" />
          </motion.div>
        </div>

        {/* Brand Name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif-display mb-1.5"
        >
          Misha Greetings Card
        </motion.h1>

        {/* Brand Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="text-xs sm:text-sm font-medium text-rose-300/90 tracking-wide mb-6"
        >
          Crafting Digital Love Letters & Moments ✨
        </motion.p>

        {/* Loading Bar & Spinner */}
        <div className="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden relative mb-4">
          <motion.div
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.4,
              ease: 'easeInOut',
            }}
            className="w-1/2 h-full bg-gradient-to-r from-rose-500 via-amber-300 to-pink-500 rounded-full"
          />
        </div>

        {/* Loading Message */}
        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-[11px] font-medium text-stone-400 uppercase tracking-widest"
        >
          {message}
        </motion.span>
      </motion.div>
    </div>
  );
};
