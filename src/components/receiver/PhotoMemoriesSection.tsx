/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, RotateCw, Sparkles, X, MapPin, Calendar, Heart } from 'lucide-react';
import { PhotosConfig, PhotoItem, ThemeDefinition } from '../../types';
import { PHOTO_THEMES } from '../../data/photoThemes';

interface PhotoMemoriesSectionProps {
  photosConfig: PhotosConfig;
  theme: ThemeDefinition;
}

export const PhotoMemoriesSection: React.FC<PhotoMemoriesSectionProps> = ({
  photosConfig,
  theme,
}) => {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [zoomedPhoto, setZoomedPhoto] = useState<PhotoItem | null>(null);

  if (!photosConfig.enabled || photosConfig.photos.length === 0) return null;

  const currentPhotoTheme =
    PHOTO_THEMES.find((pt) => pt.id === photosConfig.frameTheme) || PHOTO_THEMES[0];

  const isVintage = currentPhotoTheme.id === 'vintage-polaroid';

  const toggleFlip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <motion.section
      id="photo-memories-gallery"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="max-w-4xl mx-auto px-4 py-8 relative z-20"
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
          <Camera size={13} style={{ color: theme.accent }} />
          <span>{currentPhotoTheme.name} Moments</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif-display mb-2">
          {photosConfig.title || 'Our Sweetest Moments Together 📸'}
        </h2>

        {photosConfig.subtitle && (
          <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto">
            {photosConfig.subtitle}
          </p>
        )}
      </div>

      {/* Polaroids Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
        {photosConfig.photos.map((item, idx) => {
          const isFlipped = !!flippedCards[item.id];
          const rotDeg = item.rotationDeg ?? (idx % 2 === 0 ? -2 : 2.5);

          return (
            <motion.div
              key={item.id || idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.03, rotate: 0 }}
              style={{ rotate: `${rotDeg}deg` }}
              className="w-full max-w-[280px] cursor-pointer perspective-1000 select-none group"
            >
              {/* Tape Strip Aesthetic */}
              <div
                className={`w-24 h-6 mx-auto -mb-3 backdrop-blur-sm shadow-sm border transform -rotate-2 relative z-10 opacity-80 group-hover:opacity-100 transition-opacity rounded-xs ${currentPhotoTheme.tapeStyle}`}
              />

              {/* 3D Flip Card Container */}
              <div
                onClick={() => setZoomedPhoto(item)}
                className={`relative rounded-xl p-3 pb-5 transition-transform duration-500 transform-style-3d border shadow-2xl ${
                  isVintage ? 'bg-[#faf8f5] text-stone-900 border-stone-300' : ''
                }`}
                style={{
                  background: !isVintage ? currentPhotoTheme.cardBg : undefined,
                  borderColor: !isVintage ? currentPhotoTheme.cardBorder : undefined,
                  boxShadow: currentPhotoTheme.cardShadow,
                  color: currentPhotoTheme.textColor,
                }}
              >
                {!isFlipped ? (
                  /* FRONT: Polaroid Image & Caption */
                  <div>
                    <div className="w-full h-56 bg-stone-900 overflow-hidden relative rounded-lg shadow-inner border border-black/20">
                      <img
                        src={item.url}
                        alt={item.caption || 'Memory'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />

                      {/* Tap to Flip Button Badge */}
                      {item.flipNote && (
                        <button
                          type="button"
                          onClick={(e) => toggleFlip(item.id, e)}
                          className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/75 text-white backdrop-blur-md flex items-center gap-1 border border-white/20 hover:bg-black transition-colors"
                          title="Read secret memory note on back"
                        >
                          <RotateCw size={10} />
                          <span>Flip Note</span>
                        </button>
                      )}
                    </div>

                    {/* Polaroid Bottom Margin Note */}
                    <div className="pt-3 px-1 text-center">
                      <p
                        className="font-handwriting text-xl font-bold leading-tight line-clamp-2"
                        style={{ color: currentPhotoTheme.textColor }}
                      >
                        {item.caption || 'A special moment ✨'}
                      </p>
                      {item.dateLocation && (
                        <p
                          className="text-[11px] font-body mt-0.5 flex items-center justify-center gap-1 opacity-80"
                          style={{ color: currentPhotoTheme.subtextColor }}
                        >
                          <Calendar size={10} />
                          <span>{item.dateLocation}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* BACK: Handwritten Secret Note */
                  <div
                    className={`h-72 p-4 flex flex-col justify-between text-left rounded-lg border-2 ${
                      isVintage
                        ? 'bg-[#fcfaf2] border-stone-300 text-stone-900'
                        : 'bg-black/60 border-white/20 text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b pb-2 border-white/15 text-xs opacity-75">
                        <span className="font-serif italic">Secret Memory Note</span>
                        <Heart
                          size={13}
                          style={{ color: currentPhotoTheme.accentColor }}
                          className="fill-current"
                        />
                      </div>

                      <p
                        className="font-handwriting text-xl sm:text-2xl leading-snug mt-4"
                        style={{ color: currentPhotoTheme.textColor }}
                      >
                        "{item.flipNote || 'Thinking of you and smiling at this memory!'}"
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleFlip(item.id, e)}
                      className="self-center px-3 py-1 text-xs font-semibold rounded-full bg-stone-800 text-white flex items-center gap-1 hover:bg-stone-950 transition-colors cursor-pointer border border-white/10"
                    >
                      <RotateCw size={12} />
                      <span>Flip to Photo</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Lightbox Zoom Modal */}
      <AnimatePresence>
        {zoomedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedPhoto(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full bg-stone-900 border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                aria-label="Close zoomed photo"
              >
                <X size={18} />
              </button>

              <img
                src={zoomedPhoto.url}
                alt={zoomedPhoto.caption}
                className="w-full max-h-[65vh] object-contain bg-black"
                referrerPolicy="no-referrer"
              />

              <div className="p-4 bg-stone-900 text-stone-200">
                <p className="font-handwriting text-2xl text-white font-bold mb-1">
                  {zoomedPhoto.caption}
                </p>
                {zoomedPhoto.dateLocation && (
                  <p className="text-xs text-stone-400 mb-2">
                    📍 {zoomedPhoto.dateLocation}
                  </p>
                )}
                {zoomedPhoto.flipNote && (
                  <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-rose-200 italic">
                    💌 "{zoomedPhoto.flipNote}"
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};
