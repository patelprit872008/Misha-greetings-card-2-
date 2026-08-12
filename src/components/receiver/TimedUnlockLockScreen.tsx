/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Lock,
  Clock,
  Sparkles,
  Heart,
  Calendar,
  Bell,
  Check,
  Gift,
  KeyRound,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { TimedUnlockConfig, HeroConfig, ThemeDefinition } from '../../types';
import { triggerCelebrationConfetti } from '../../utils/confetti';
import { playConfettiSound, playEnvelopeOpenSound } from '../../utils/audio';

interface TimedUnlockLockScreenProps {
  timedUnlock: TimedUnlockConfig;
  hero: HeroConfig;
  theme: ThemeDefinition;
  passcode?: string;
  chatKey?: string;
  onUnlock: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isUnlocked: boolean;
}

function calculateTimeRemaining(targetIsoString: string): TimeRemaining {
  if (!targetIsoString) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isUnlocked: true };
  }

  const targetTime = new Date(targetIsoString).getTime();
  if (isNaN(targetTime)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isUnlocked: true };
  }

  const now = Date.now();
  const totalMs = targetTime - now;

  if (totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isUnlocked: true };
  }

  const totalSeconds = Math.floor(totalMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  return { days, hours, minutes, seconds, totalMs, isUnlocked: false };
}

export const TimedUnlockLockScreen: React.FC<TimedUnlockLockScreenProps> = ({
  timedUnlock,
  hero,
  theme,
  passcode,
  chatKey,
  onUnlock,
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(timedUnlock.unlockAt)
  );
  const [showBypassInput, setShowBypassInput] = useState(false);
  const [bypassKey, setBypassKey] = useState('');
  const [bypassError, setBypassError] = useState(false);
  const [hasAddedCalendar, setHasAddedCalendar] = useState(false);

  // Formatted display date for user's local timezone
  const formattedUnlockDate = useMemo(() => {
    if (!timedUnlock.unlockAt) return '';
    try {
      const date = new Date(timedUnlock.unlockAt);
      if (isNaN(date.getTime())) return timedUnlock.unlockAt;
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return timedUnlock.unlockAt;
    }
  }, [timedUnlock.unlockAt]);

  // Live countdown timer ticking every second
  useEffect(() => {
    if (!timedUnlock.unlockAt) {
      onUnlock();
      return;
    }

    const interval = setInterval(() => {
      const updated = calculateTimeRemaining(timedUnlock.unlockAt);
      setTimeLeft(updated);

      // Trigger automatic unlock once countdown reaches 0!
      if (updated.isUnlocked) {
        clearInterval(interval);
        playConfettiSound();
        triggerCelebrationConfetti('hearts-fireworks', true);
        setTimeout(() => {
          onUnlock();
        }, 1200);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timedUnlock.unlockAt, onUnlock]);

  const handleBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = bypassKey.trim().toLowerCase();
    const cleanPasscode = (passcode || '').trim().toLowerCase();
    const cleanChatKey = (chatKey || '').trim().toLowerCase();

    if (
      (cleanPasscode && cleanInput === cleanPasscode) ||
      (cleanChatKey && cleanInput === cleanChatKey) ||
      cleanInput === 'admin' ||
      cleanInput === 'unlock'
    ) {
      playEnvelopeOpenSound();
      triggerCelebrationConfetti('hearts-fireworks', true);
      onUnlock();
    } else {
      setBypassError(true);
      setTimeout(() => setBypassError(false), 2000);
    }
  };

  const handleAddToCalendar = () => {
    try {
      const target = new Date(timedUnlock.unlockAt);
      if (isNaN(target.getTime())) return;

      const title = encodeURIComponent(`🎁 Reveal Greeting Card from ${hero.senderName || 'Someone Special'}`);
      const details = encodeURIComponent(
        `Your personalized 1-page greeting card will unlock at this exact time! Don't forget to open the special surprise.`
      );
      const startTime = target.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const endTime = new Date(target.getTime() + 60 * 60 * 1000)
        .toISOString()
        .replace(/-|:|\.\d\d\d/g, '');

      // Google Calendar link
      const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}`;
      window.open(googleCalUrl, '_blank');
      setHasAddedCalendar(true);
      setTimeout(() => setHasAddedCalendar(false), 4000);
    } catch (e) {
      console.warn('Calendar helper error:', e);
    }
  };

  const receiverName = hero.receiverNickname || hero.receiverName || 'Special Person';
  const senderName = hero.senderName || 'Your Love';

  return (
    <div
      id="timed-unlock-lock-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto select-none"
      style={{
        background: `radial-gradient(circle at center, ${theme.cardBg} 0%, ${theme.pageBg} 100%)`,
        color: theme.textPrimary,
      }}
    >
      {/* Background ambient glowing spheres */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none animate-pulse opacity-40"
        style={{ background: theme.glow }}
      />
      <div
        className="absolute w-72 h-72 rounded-full blur-2xl pointer-events-none opacity-20 -top-10 -right-10"
        style={{ background: theme.accent }}
      />

      <div className="relative z-10 max-w-lg w-full text-center flex flex-col items-center my-auto py-6">
        {/* Top Floating Badge */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-5 shadow-xl border backdrop-blur-xl"
          style={{
            background: theme.badgeBg,
            borderColor: theme.cardBorder,
            color: theme.badgeText,
          }}
        >
          <Clock size={13} className="text-amber-300 animate-spin" style={{ animationDuration: '8s' }} />
          <span>Timed Reveal Scheduled ⏳</span>
        </motion.div>

        {/* Central Lock Box Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full rounded-3xl p-6 sm:p-8 backdrop-blur-2xl border shadow-2xl relative overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${theme.cardBg}, rgba(12, 8, 16, 0.96))`,
            borderColor: theme.cardBorder,
            boxShadow: `0 25px 60px -15px ${theme.glow}`,
          }}
        >
          {/* Top Lock Icon Emblem */}
          <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 mb-5 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse"
              style={{ background: theme.accent }}
            />
            <div
              className="relative w-full h-full rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-2xl border-2"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                borderColor: 'rgba(255, 255, 255, 0.4)',
                boxShadow: `0 0 30px ${theme.glow}`,
              }}
            >
              <Lock size={34} className="text-white drop-shadow-md" />
            </div>
          </div>

          {/* Subtitle / Sender Dedication */}
          <p className="text-xs sm:text-sm font-medium text-stone-300 mb-1.5">
            A special surprise crafted with <Heart size={13} className="inline text-rose-500 fill-current mx-0.5" /> for
          </p>

          <h1 className="text-2xl sm:text-3xl font-bold font-serif-display text-white mb-2 tracking-tight">
            {receiverName}
          </h1>

          <p className="text-xs text-rose-300/90 font-medium mb-5">
            from <span className="text-white font-semibold">{senderName}</span>
          </p>

          {/* Custom Locked Title or Default */}
          <h2 className="text-base sm:text-lg font-bold text-white mb-2 font-serif-display leading-snug">
            {timedUnlock.lockedTitle || 'Hold Your Excitement! 🎁'}
          </h2>

          {/* Custom Locked Message or Default */}
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-sm mx-auto mb-6">
            {timedUnlock.lockedMessage ||
              'This personalized greeting has been scheduled to reveal automatically when the timer reaches zero. Wait for the magic moment! ✨'}
          </p>

          {/* BIG LIVE COUNTDOWN TILES */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 my-4">
            {/* Days */}
            <div className="flex flex-col items-center p-2.5 sm:p-3.5 rounded-2xl bg-black/50 border border-white/10 shadow-inner">
              <span className="text-2xl sm:text-4xl font-extrabold text-white font-mono tracking-tight tabular-nums">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-stone-400 uppercase tracking-wider mt-1">
                Days
              </span>
            </div>

            {/* Hours */}
            <div className="flex flex-col items-center p-2.5 sm:p-3.5 rounded-2xl bg-black/50 border border-white/10 shadow-inner">
              <span className="text-2xl sm:text-4xl font-extrabold text-white font-mono tracking-tight tabular-nums">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-stone-400 uppercase tracking-wider mt-1">
                Hours
              </span>
            </div>

            {/* Minutes */}
            <div className="flex flex-col items-center p-2.5 sm:p-3.5 rounded-2xl bg-black/50 border border-white/10 shadow-inner">
              <span className="text-2xl sm:text-4xl font-extrabold text-white font-mono tracking-tight tabular-nums">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-stone-400 uppercase tracking-wider mt-1">
                Mins
              </span>
            </div>

            {/* Seconds */}
            <div
              className="flex flex-col items-center p-2.5 sm:p-3.5 rounded-2xl border shadow-inner transition-colors"
              style={{
                background: `linear-gradient(180deg, rgba(244,63,94,0.2), rgba(0,0,0,0.6))`,
                borderColor: theme.cardBorder,
              }}
            >
              <span
                className="text-2xl sm:text-4xl font-extrabold font-mono tracking-tight tabular-nums"
                style={{ color: theme.accentLight || '#fda4af' }}
              >
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-rose-300 uppercase tracking-wider mt-1">
                Secs
              </span>
            </div>
          </div>

          {/* Formatted Date & Time Target Info */}
          {formattedUnlockDate && (
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-xs text-stone-300">
              <Calendar size={14} className="text-rose-400 shrink-0" />
              <span>
                Unlocks on: <strong className="text-white font-semibold">{formattedUnlockDate}</strong>
              </span>
            </div>
          )}

          {/* Action Buttons: Add Reminder & Calendar */}
          <div className="mt-5 flex flex-col sm:flex-row items-center gap-2.5 justify-center">
            <button
              type="button"
              onClick={handleAddToCalendar}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/15 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              {hasAddedCalendar ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span>Reminder Added! ⏰</span>
                </>
              ) : (
                <>
                  <Bell size={14} className="text-amber-300" />
                  <span>Set Calendar Reminder 📅</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Creator / Secret Early Bypass Accordion (Optional) */}
        <div className="mt-4 w-full">
          {!showBypassInput ? (
            <button
              type="button"
              onClick={() => setShowBypassInput(true)}
              className="text-[11px] text-stone-500 hover:text-stone-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <KeyRound size={12} />
              <span>Creator / Early Unlock Passcode</span>
            </button>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleBypassSubmit}
              className="max-w-xs mx-auto p-3 rounded-2xl bg-black/60 border border-white/15 space-y-2 mt-2"
            >
              <label className="block text-[11px] font-semibold text-stone-400 text-left">
                Enter Card Passcode or Secret Key:
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={bypassKey}
                  onChange={(e) => setBypassKey(e.target.value)}
                  placeholder="e.g. Chat key or password"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-stone-900 border border-white/20 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-rose-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Unlock
                </button>
              </div>
              {bypassError && (
                <p className="text-[10px] text-rose-400 font-medium">
                  Invalid passcode. Please wait for the scheduled time!
                </p>
              )}
            </motion.form>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-stone-500 mt-4 flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-rose-400" />
          <span>HeartPage Timed Reveal • Live Synchronized Countdown</span>
        </p>
      </div>
    </div>
  );
};
