/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Heart, Sparkles } from 'lucide-react';
import { ReasonsConfig, ThemeDefinition } from '../../types';

interface ReasonsDeckSectionProps {
  reasonsConfig: ReasonsConfig;
  theme: ThemeDefinition;
}

export const ReasonsDeckSection: React.FC<ReasonsDeckSectionProps> = ({
  reasonsConfig,
  theme,
}) => {
  if (!reasonsConfig.enabled || reasonsConfig.reasons.length === 0) return null;

  return (
    <motion.section
      id="reasons-deck-section"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="max-w-3xl mx-auto px-4 py-8 relative z-20"
    >
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 border shadow-sm backdrop-blur-md"
          style={{
            background: theme.badgeBg,
            borderColor: theme.cardBorder,
            color: theme.badgeText,
          }}
        >
          <Heart size={13} className="text-rose-400 fill-current" />
          <span>Countless Reasons</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif-display mb-2">
          {reasonsConfig.title || 'Little Reasons Why You Are So Special 💕'}
        </h2>

        {reasonsConfig.subtitle && (
          <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto">
            {reasonsConfig.subtitle}
          </p>
        )}
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reasonsConfig.reasons.map((reason, index) => (
          <motion.div
            key={reason.id || index}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="rounded-2xl p-5 border backdrop-blur-xl transition-all duration-300 flex items-start gap-4 shadow-xl group"
            style={{
              background: `linear-gradient(145deg, ${theme.cardBg}, rgba(15, 10, 20, 0.85))`,
              borderColor: theme.cardBorder,
            }}
          >
            {/* Reason Emoji / Number Pill */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-lg border transition-transform group-hover:scale-110"
              style={{
                background: theme.accentLight,
                borderColor: theme.cardBorder,
              }}
            >
              <span>{reason.iconEmoji || '💖'}</span>
            </div>

            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                  #{index + 1}
                </span>
                <h3 className="text-base font-bold text-white group-hover:text-rose-200 transition-colors">
                  {reason.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-body">
                {reason.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};
