/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Calendar, Heart, Sparkles } from 'lucide-react';
import { CounterConfig, ThemeDefinition } from '../../types';

interface TimeCounterSectionProps {
  counter: CounterConfig;
  theme: ThemeDefinition;
}

interface TimeBreakdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
}

export const TimeCounterSection: React.FC<TimeCounterSectionProps> = ({
  counter,
  theme,
}) => {
  const [time, setTime] = useState<TimeBreakdown>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalDays: 0,
  });

  useEffect(() => {
    if (!counter.enabled || !counter.date) return;

    const updateTimer = () => {
      const targetDate = new Date(counter.date).getTime();
      const now = new Date().getTime();

      let diff = counter.mode === 'since' ? now - targetDate : targetDate - now;

      if (diff < 0) diff = 0;

      const totalSeconds = Math.floor(diff / 1000);
      const totalDays = Math.floor(totalSeconds / (3600 * 24));
      const days = totalDays;
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTime({ days, hours, minutes, seconds, totalDays });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [counter.enabled, counter.date, counter.mode]);

  if (!counter.enabled) return null;

  const formattedStartDate = counter.date
    ? new Date(counter.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <motion.section
      id="time-counter-widget"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="max-w-2xl mx-auto px-4 py-8 relative z-20"
    >
      <div
        className="relative rounded-2xl p-6 sm:p-8 border backdrop-blur-xl shadow-2xl overflow-hidden text-center"
        style={{
          background: `linear-gradient(145deg, ${theme.cardBg}, rgba(15, 10, 20, 0.9))`,
          borderColor: theme.cardBorder,
        }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Clock size={16} style={{ color: theme.accent }} />
          <span
            className="text-xs sm:text-sm font-semibold uppercase tracking-widest"
            style={{ color: theme.textSecondary }}
          >
            {counter.mode === 'since' ? 'Love & Journey Tracker' : 'Countdown to Special Moment'}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 font-serif-display">
          {counter.title || (counter.mode === 'since' ? 'We have been together for:' : 'Time until our special date:')}
        </h2>

        {formattedStartDate && (
          <p className="text-xs text-stone-400 mb-6 flex items-center justify-center gap-1.5">
            <Calendar size={13} />
            <span>{counter.mode === 'since' ? 'Since' : 'Target Date'}: {formattedStartDate}</span>
          </p>
        )}

        {/* Counter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 my-6">
          {counter.showDays && (
            <div
              className="rounded-xl p-3 sm:p-4 border flex flex-col items-center justify-center relative overflow-hidden group shadow-lg"
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                borderColor: theme.cardBorder,
              }}
            >
              <span
                className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif-display"
                style={{ color: theme.accent }}
              >
                {time.days}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-stone-300 mt-1">
                Days
              </span>
            </div>
          )}

          {counter.showHours && (
            <div
              className="rounded-xl p-3 sm:p-4 border flex flex-col items-center justify-center relative overflow-hidden group shadow-lg"
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                borderColor: theme.cardBorder,
              }}
            >
              <span
                className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif-display text-white"
              >
                {time.hours.toString().padStart(2, '0')}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-stone-300 mt-1">
                Hours
              </span>
            </div>
          )}

          {counter.showMinutes && (
            <div
              className="rounded-xl p-3 sm:p-4 border flex flex-col items-center justify-center relative overflow-hidden group shadow-lg"
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                borderColor: theme.cardBorder,
              }}
            >
              <span
                className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif-display text-white"
              >
                {time.minutes.toString().padStart(2, '0')}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-stone-300 mt-1">
                Minutes
              </span>
            </div>
          )}

          {counter.showSeconds && (
            <div
              className="rounded-xl p-3 sm:p-4 border flex flex-col items-center justify-center relative overflow-hidden group shadow-lg"
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                borderColor: theme.cardBorder,
              }}
            >
              <span
                className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif-display animate-pulse"
                style={{ color: theme.accent }}
              >
                {time.seconds.toString().padStart(2, '0')}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-stone-300 mt-1">
                Seconds
              </span>
            </div>
          )}
        </div>

        {/* Milestone Note */}
        {counter.specialNote && (
          <div
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium border"
            style={{
              background: theme.accentLight,
              borderColor: theme.cardBorder,
              color: theme.textPrimary,
            }}
          >
            <Sparkles size={14} style={{ color: theme.accent }} />
            <span>{counter.specialNote}</span>
          </div>
        )}
      </div>
    </motion.section>
  );
};
