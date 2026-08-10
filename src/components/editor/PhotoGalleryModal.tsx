/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  Search,
  Heart,
  Plus,
} from 'lucide-react';
import { PhotoItem } from '../../types';

interface PhotoGalleryModalProps {
  onSelectPhoto: (photo: PhotoItem) => void;
  onClose: () => void;
}

const CURATED_PRESETS: {
  id: string;
  category: string;
  title: string;
  url: string;
  caption: string;
}[] = [
  // Romantic & Couple
  {
    id: 'p1',
    category: 'Romantic',
    title: 'Sunset Beach Walk',
    url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=900&auto=format&fit=crop&q=80',
    caption: 'Walking together into the sunset 🌅',
  },
  {
    id: 'p2',
    category: 'Romantic',
    title: 'Holding Hands',
    url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=900&auto=format&fit=crop&q=80',
    caption: 'Always holding your hand ❤️',
  },
  {
    id: 'p3',
    category: 'Romantic',
    title: 'Sparklers & Twilight',
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=900&auto=format&fit=crop&q=80',
    caption: 'You bring the magic into my life ✨',
  },
  {
    id: 'p4',
    category: 'Romantic',
    title: 'Cozy Coffee Date',
    url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&auto=format&fit=crop&q=80',
    caption: 'Warm coffee & endless conversations ☕',
  },
  {
    id: 'p5',
    category: 'Romantic',
    title: 'Red Roses Bouquet',
    url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=900&auto=format&fit=crop&q=80',
    caption: 'A thousand roses for you 🌹',
  },
  {
    id: 'p6',
    category: 'Romantic',
    title: 'Candlelight Dinner',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80',
    caption: 'Candlelight & sweet memories 🍷',
  },

  // Aesthetic & Cozy
  {
    id: 'p7',
    category: 'Aesthetic',
    title: 'Vintage Love Letters',
    url: 'https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?w=900&auto=format&fit=crop&q=80',
    caption: 'Letters written with all my heart 💌',
  },
  {
    id: 'p8',
    category: 'Aesthetic',
    title: 'Cherry Blossoms Sakura',
    url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=900&auto=format&fit=crop&q=80',
    caption: 'Spring blooms and fresh beginnings 🌸',
  },
  {
    id: 'p9',
    category: 'Aesthetic',
    title: 'Starry Night Sky',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=900&auto=format&fit=crop&q=80',
    caption: 'Written in the stars 🌌',
  },
  {
    id: 'p10',
    category: 'Aesthetic',
    title: 'Pink Sunset Clouds',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900&auto=format&fit=crop&q=80',
    caption: 'Cotton candy skies with you ☁️',
  },

  // Celebrations & Cake
  {
    id: 'p11',
    category: 'Celebration',
    title: 'Birthday Celebration Cake',
    url: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=900&auto=format&fit=crop&q=80',
    caption: 'Happy Birthday celebration! 🎂',
  },
  {
    id: 'p12',
    category: 'Celebration',
    title: 'Champagne Toast',
    url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=900&auto=format&fit=crop&q=80',
    caption: 'Cheers to our beautiful journey 🥂',
  },
  {
    id: 'p13',
    category: 'Celebration',
    title: 'Golden Confetti',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=80',
    caption: 'Every moment with you is a party 🎉',
  },
];

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({
  onSelectPhoto,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customUrl, setCustomUrl] = useState('');
  const [customCaption, setCustomCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const categories = ['All', 'Romantic', 'Aesthetic', 'Celebration'];

  const filtered =
    selectedCategory === 'All'
      ? CURATED_PRESETS
      : CURATED_PRESETS.filter((p) => p.category === selectedCategory);

  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Image must be under 20MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataUrl = event.target?.result as string;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, filename: file.name }),
        });

        if (res.ok) {
          const json = await res.json();
          const savedUrl = json.url || dataUrl;
          onSelectPhoto({
            id: 'photo-' + Date.now(),
            url: savedUrl,
            caption: customCaption.trim() || file.name.replace(/\.[^/.]+$/, '') || 'Our Memory ❤️',
            rotation: Math.floor(Math.random() * 6) - 3,
          });
          onClose();
        } else {
          // Fallback to dataUrl
          onSelectPhoto({
            id: 'photo-' + Date.now(),
            url: dataUrl,
            caption: customCaption.trim() || 'Our Memory ❤️',
            rotation: Math.floor(Math.random() * 6) - 3,
          });
          onClose();
        }
      } catch (err) {
        console.error('Photo upload error:', err);
        setUploadError('Failed to upload image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    onSelectPhoto({
      id: 'photo-' + Date.now(),
      url: customUrl.trim(),
      caption: customCaption.trim() || 'Our Memory ❤️',
      rotation: Math.floor(Math.random() * 6) - 3,
    });
    onClose();
  };

  return (
    <div
      id="photo-gallery-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden text-stone-100 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Curated Aesthetic Photo Gallery
              </h2>
              <p className="text-xs text-stone-400">
                Choose a romantic preset photo or enter an image URL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs">
              {uploadError}
            </div>
          )}

          {/* Upload from Device + Custom URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Direct Device Upload */}
            <label className="flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-800/80 border border-dashed border-stone-600 hover:border-rose-500 hover:bg-stone-800 cursor-pointer transition-all group">
              <input
                type="file"
                accept="image/*"
                onChange={handleDeviceUpload}
                disabled={isUploading}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 flex items-center justify-center mb-2 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">
                {isUploading ? 'Uploading to Cloud...' : 'Upload from Phone / PC'}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5">
                PNG, JPG, WebP, GIF (up to 20MB)
              </span>
            </label>

            {/* Custom URL input */}
            <form
              onSubmit={handleAddCustom}
              className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700 space-y-2 flex flex-col justify-between"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-rose-400" />
                Add via Image Link
              </div>
              <div className="space-y-2">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://... image link"
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCaption}
                    onChange={(e) => setCustomCaption(e.target.value)}
                    placeholder="Caption (optional)"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={!customUrl.trim()}
                    className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 border-b border-stone-800 pb-3">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-stone-800/80 text-stone-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((preset) => (
              <div
                key={preset.id}
                onClick={() => {
                  onSelectPhoto({
                    id: 'photo-' + Date.now(),
                    url: preset.url,
                    caption: preset.caption,
                    rotation: Math.floor(Math.random() * 6) - 3,
                  });
                  onClose();
                }}
                className="group relative rounded-2xl overflow-hidden bg-stone-800 border border-stone-700/80 hover:border-rose-500 cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-md"
              >
                <div className="aspect-square w-full overflow-hidden bg-stone-900">
                  <img
                    src={preset.url}
                    alt={preset.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-3 text-left">
                  <div className="text-xs font-bold text-white leading-tight">
                    {preset.title}
                  </div>
                  <div className="text-[10px] text-stone-300 line-clamp-1 opacity-80 mt-0.5">
                    {preset.caption}
                  </div>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-rose-500 text-white shadow-lg">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
