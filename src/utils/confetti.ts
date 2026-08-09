/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import confetti from 'canvas-confetti';
import { playConfettiSound } from './audio';

// Custom SVG Heart Shape for canvas-confetti
let heartShape: confetti.Shape | null = null;
try {
  if (typeof window !== 'undefined' && confetti.shapeFromPath) {
    heartShape = confetti.shapeFromPath({
      path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    });
  }
} catch (e) {
  // fallback if shapeFromPath is not supported
}

export type CelebrationBurstStyle =
  | 'hearts-fireworks'
  | 'romantic-hearts'
  | 'gold-sparkles'
  | 'rainbow-confetti';

/**
 * Triggers a celebratory confetti & falling hearts fireworks explosion
 */
export function triggerCelebrationConfetti(
  style: CelebrationBurstStyle = 'hearts-fireworks',
  playSound = true
): void {
  if (typeof window === 'undefined') return;

  if (playSound) {
    try {
      playConfettiSound();
    } catch (e) {
      // Audio autoplay might be waiting for user gesture
    }
  }

  const shapes: confetti.Shape[] = heartShape
    ? [heartShape, 'circle', 'square']
    : ['circle', 'square'];

  // Color palettes based on chosen style
  let colors = ['#e11d48', '#ff4d6d', '#fb7185', '#ffd700', '#ffffff', '#c084fc'];
  if (style === 'romantic-hearts') {
    colors = ['#e11d48', '#f43f5e', '#fda4af', '#fff1f2', '#be123c', '#ff758f'];
  } else if (style === 'gold-sparkles') {
    colors = ['#f59e0b', '#fbbf24', '#fef08a', '#ffffff', '#d97706', '#fde047'];
  } else if (style === 'rainbow-confetti') {
    colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#a855f7', '#ec4899'];
  }

  // 1. Center burst
  confetti({
    particleCount: 90,
    spread: 100,
    origin: { y: 0.6, x: 0.5 },
    colors,
    shapes,
    scalar: 1.2,
    ticks: 250,
    gravity: 0.9,
    drift: 0,
  });

  // 2. Left side cannon blast (at 60 degrees)
  setTimeout(() => {
    confetti({
      particleCount: 65,
      angle: 60,
      spread: 70,
      origin: { x: 0.05, y: 0.75 },
      colors,
      shapes,
      scalar: 1.15,
      ticks: 280,
      gravity: 0.85,
    });
  }, 180);

  // 3. Right side cannon blast (at 120 degrees)
  setTimeout(() => {
    confetti({
      particleCount: 65,
      angle: 120,
      spread: 70,
      origin: { x: 0.95, y: 0.75 },
      colors,
      shapes,
      scalar: 1.15,
      ticks: 280,
      gravity: 0.85,
    });
  }, 360);

  // 4. Cascade raining hearts shower over 2.5 seconds
  const end = Date.now() + 2500;
  const interval: number = window.setInterval(() => {
    if (Date.now() > end) {
      clearInterval(interval);
      return;
    }

    confetti({
      particleCount: 7,
      angle: 90,
      spread: 120,
      origin: { x: Math.random(), y: -0.05 },
      colors,
      shapes,
      scalar: 1.1,
      gravity: 0.7,
      drift: (Math.random() - 0.5) * 1.5,
      ticks: 220,
    });
  }, 160);
}
