/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles, Wand2, CheckCircle2, Ticket } from 'lucide-react';
import { ScratchCardConfig, ThemeDefinition } from '../../types';
import { playConfettiSound } from '../../utils/audio';

interface ScratchCardSectionProps {
  scratchCard: ScratchCardConfig;
  theme: ThemeDefinition;
}

export const ScratchCardSection: React.FC<ScratchCardSectionProps> = ({
  scratchCard,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratched, setIsScratched] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const isDrawing = useRef(false);

  if (!scratchCard.enabled) return null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Fill with scratch surface texture
    const gradient = ctx.createLinearGradient(0, 0, width, height);

    if (scratchCard.cardStyle === 'gold') {
      gradient.addColorStop(0, '#ffd700');
      gradient.addColorStop(0.3, '#fff4b8');
      gradient.addColorStop(0.7, '#d4af37');
      gradient.addColorStop(1, '#aa771c');
    } else if (scratchCard.cardStyle === 'rose-gold') {
      gradient.addColorStop(0, '#f472b6');
      gradient.addColorStop(0.4, '#fda4af');
      gradient.addColorStop(0.8, '#e11d48');
      gradient.addColorStop(1, '#9f1239');
    } else if (scratchCard.cardStyle === 'holographic') {
      gradient.addColorStop(0, '#c084fc');
      gradient.addColorStop(0.3, '#38bdf8');
      gradient.addColorStop(0.6, '#f472b6');
      gradient.addColorStop(1, '#fbbf24');
    } else {
      // Silver default
      gradient.addColorStop(0, '#cbd5e1');
      gradient.addColorStop(0.3, '#f1f5f9');
      gradient.addColorStop(0.7, '#94a3b8');
      gradient.addColorStop(1, '#64748b');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative scratch pattern text & icon
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ SCRATCH HERE ✨', width / 2, height / 2 - 8);
    ctx.font = '12px sans-serif';
    ctx.fillText('Rub with your finger or mouse', width / 2, height / 2 + 16);
  }, [scratchCard.cardStyle]);

  const scratch = (clientX: number, clientY: number) => {
    if (isScratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Check scratch percentage periodically
    checkProgress(canvas, ctx);
  };

  const checkProgress = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let cleared = 0;
      const total = imgData.data.length / 4;
      for (let i = 3; i < imgData.data.length; i += 16) {
        if (imgData.data[i] === 0) cleared += 4;
      }
      const pct = Math.min(100, Math.round((cleared / total) * 100));
      setScratchPercent(pct);

      if (pct > 40 && !isScratched) {
        revealEntireCard();
      }
    } catch {
      // ignore
    }
  };

  const revealEntireCard = () => {
    setIsScratched(true);
    playConfettiSound();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#f43f5e', '#ec4899', '#fbbf24'],
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDrawing.current = true;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDrawing.current = true;
    if (e.touches.length > 0) {
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing.current || e.touches.length === 0) return;
    scratch(e.touches[0].clientX, e.touches[0].clientY);
  };

  return (
    <motion.section
      id="scratch-card-surprise"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="max-w-2xl mx-auto px-4 py-8 relative z-20"
    >
      <div
        className="relative rounded-2xl p-6 sm:p-8 border backdrop-blur-xl shadow-2xl overflow-hidden text-center"
        style={{
          background: `linear-gradient(145deg, ${theme.cardBg}, rgba(15, 10, 20, 0.95))`,
          borderColor: theme.cardBorder,
        }}
      >
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 border"
          style={{
            background: theme.badgeBg,
            borderColor: theme.cardBorder,
            color: theme.badgeText,
          }}
        >
          <Gift size={13} className="text-amber-300" />
          <span>Secret Scratch Surprise</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-serif-display">
          {scratchCard.title || 'Scratch to Reveal Your Love Gift 🎁'}
        </h2>

        <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto mb-6">
          {scratchCard.instructions || 'Rub your finger or cursor over the sparkling card to reveal the surprise!'}
        </p>

        {/* Scratch Card Frame */}
        <div className="relative w-full max-w-md mx-auto h-52 sm:h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 select-none">
          {/* UNDERNEATH: The Secret Message / Coupon */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-950 via-stone-900 to-purple-950 p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-rose-400/40 rounded-2xl">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-2">
              <Ticket size={11} />
              <span>{scratchCard.secretCategory || 'Redeemable Coupon'}</span>
            </div>

            <p className="text-sm sm:text-base font-bold text-white leading-relaxed px-2 font-body">
              {scratchCard.secretMessage || '🎟️ Unlimited Hugs & Sweet Ice Cream Treat!'}
            </p>

            <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
              <CheckCircle2 size={13} />
              <span>Surprise Unlocked & Active! ✨</span>
            </div>
          </div>

          {/* OVERLAY: HTML5 Canvas Scratchable Surface */}
          {!isScratched && (
            <canvas
              ref={canvasRef}
              width={400}
              height={220}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              className="absolute inset-0 w-full h-full cursor-pointer touch-none z-10"
            />
          )}
        </div>

        {/* Quick Reveal Button */}
        {!isScratched ? (
          <button
            type="button"
            onClick={revealEntireCard}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-stone-300 hover:text-white bg-white/10 hover:bg-white/15 transition-colors border border-white/10"
          >
            <Wand2 size={13} />
            <span>Instant Reveal ✨</span>
          </button>
        ) : (
          <p className="text-xs text-rose-300 mt-4 font-medium flex items-center justify-center gap-1">
            <Sparkles size={13} />
            <span>Take a screenshot to save and redeem your coupon anytime! 💖</span>
          </p>
        )}
      </div>
    </motion.section>
  );
};
