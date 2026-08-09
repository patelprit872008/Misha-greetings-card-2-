/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FallingHeartsShowerProps {
  active: boolean;
  durationSeconds?: number;
}

interface HeartParticle {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotateStart: number;
  rotateEnd: number;
  drift: number;
}

const HEART_EMOJIS = ['💖', '💕', '💗', '❤️', '🌹', '✨', '💐', '💓', '🥰', '💝'];

export const FallingHeartsShower: React.FC<FallingHeartsShowerProps> = ({
  active,
  durationSeconds = 6,
}) => {
  const [visible, setVisible] = useState(active);
  const [particles, setParticles] = useState<HeartParticle[]>([]);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    // Generate falling heart particles with varied speeds, sizes and positions
    const items: HeartParticle[] = [];
    for (let i = 0; i < 45; i++) {
      items.push({
        id: i,
        emoji: HEART_EMOJIS[i % HEART_EMOJIS.length],
        left: Math.random() * 96 + 2, // 2% to 98%
        delay: Math.random() * 2.5,
        duration: 3.5 + Math.random() * 2.5,
        size: 18 + Math.random() * 24, // 18px to 42px
        rotateStart: Math.random() * 60 - 30,
        rotateEnd: Math.random() * 360 - 180,
        drift: (Math.random() - 0.5) * 80,
      });
    }

    setParticles(items);
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, durationSeconds * 1000);

    return () => clearTimeout(timer);
  }, [active, durationSeconds]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <div
        id="falling-hearts-celebration-layer"
        className="fixed inset-0 pointer-events-none z-40 overflow-hidden select-none"
        aria-hidden="true"
      >
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              opacity: 0,
              y: -50,
              x: 0,
              rotate: p.rotateStart,
              scale: 0.6,
            }}
            animate={{
              opacity: [0, 0.95, 0.95, 0],
              y: '108vh',
              x: p.drift,
              rotate: p.rotateEnd,
              scale: [0.6, 1.1, 1, 0.8],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: 'easeIn',
            }}
            className="absolute will-change-transform drop-shadow-[0_4px_10px_rgba(225,29,72,0.4)]"
            style={{
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
            }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
};
