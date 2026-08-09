/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ParticleType } from '../../types';

interface FloatingParticlesProps {
  type: ParticleType;
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({ type }) => {
  if (type === 'none') return null;

  const particles = useMemo(() => {
    const items = [];
    const count = type === 'confetti' ? 35 : 24;

    const emojiMap: Record<ParticleType, string[]> = {
      hearts: ['💖', '💕', '💗', '💓', '❤️', '🌸', '✨'],
      sparkles: ['✨', '⭐', '💫', '🌟', '✦', '·'],
      'cherry-blossoms': ['🌸', '🌺', '🍃', '💮', '🌸'],
      confetti: ['🎉', '🎊', '✨', '🎈', '⭐', '🍬'],
      butterflies: ['🦋', '✨', '🌸', '🦋', '💫'],
      snow: ['❄️', '❅', '✻', '✨', '·'],
      none: [],
    };

    const emojis = emojiMap[type] || ['💖'];

    for (let i = 0; i < count; i++) {
      items.push({
        id: i,
        emoji: emojis[i % emojis.length],
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 8 + Math.random() * 10,
        size: 14 + Math.random() * 22,
        opacity: 0.25 + Math.random() * 0.55,
        drift: (Math.random() - 0.5) * 60,
      });
    }
    return items;
  }, [type]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute will-change-transform animate-float-drift select-none"
          style={{
            left: `${p.left}%`,
            bottom: '-40px',
            fontSize: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          }}
        >
          {p.emoji}
        </div>
      ))}
      <style>{`
        @keyframes floatDrift {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-110vh) translateX(35px) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-float-drift {
          animation-name: floatDrift;
        }
      `}</style>
    </div>
  );
};
