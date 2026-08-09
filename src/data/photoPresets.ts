/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PresetPhotoOption {
  id: string;
  url: string;
  category: 'romantic' | 'friendship' | 'celebration' | 'nature' | 'aesthetic';
  label: string;
}

export const PRESET_PHOTOS: PresetPhotoOption[] = [
  {
    id: 'rom-1',
    url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop&q=80',
    category: 'romantic',
    label: 'Holding Hands at Sunset',
  },
  {
    id: 'rom-2',
    url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&auto=format&fit=crop&q=80',
    category: 'romantic',
    label: 'Cozy Couple Laughing',
  },
  {
    id: 'rom-3',
    url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&auto=format&fit=crop&q=80',
    category: 'romantic',
    label: 'Warm Hug Silhouette',
  },
  {
    id: 'rom-4',
    url: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&auto=format&fit=crop&q=80',
    category: 'romantic',
    label: 'Golden Hour Smile',
  },
  {
    id: 'bday-1',
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
    category: 'celebration',
    label: 'Birthday Confetti & Streamers',
  },
  {
    id: 'bday-2',
    url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80',
    category: 'celebration',
    label: 'Balloons & Sparklers',
  },
  {
    id: 'bff-1',
    url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=80',
    category: 'friendship',
    label: 'Best Friends Squad Laughing',
  },
  {
    id: 'bff-2',
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&auto=format&fit=crop&q=80',
    category: 'friendship',
    label: 'Group Cheers & Fun',
  },
  {
    id: 'aes-1',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    category: 'aesthetic',
    label: 'Dreamy Beach Sunset',
  },
  {
    id: 'aes-2',
    url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80',
    category: 'aesthetic',
    label: 'Bouquet of Pink Tulips',
  },
  {
    id: 'aes-3',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
    category: 'aesthetic',
    label: 'Candid Joy & Sparkle',
  },
];
