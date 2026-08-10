/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import LZString from 'lz-string';
import { HeartPageData } from '../types';
import { TEMPLATE_PRESETS } from '../data/templates';

const STORAGE_PREFIX = 'heartpage_draft_';
const RECENT_PAGES_KEY = 'heartpage_recent_ids';

/**
 * Encodes page data into a compact URL-safe hash string using LZ compression.
 */
export function encodePageDataToHash(data: HeartPageData): string {
  try {
    const jsonStr = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    return compressed || '';
  } catch (err) {
    console.error('Failed to encode page data', err);
    return '';
  }
}

/**
 * Decodes page data from hash, supporting LZ-compressed, raw base64, and URL-encoded formats.
 */
export function decodePageDataFromHash(encoded: string): HeartPageData | null {
  try {
    if (!encoded) return null;
    let clean = encoded.trim();
    if (clean.startsWith('#')) {
      clean = clean.substring(1).trim();
    }
    if (!clean) return null;

    // Handle hash query formats like #d=... or #data=... or #card=...
    if (clean.includes('d=')) {
      const match = clean.match(/(?:^|[&?])(?:d|data|card)=([^&]+)/);
      if (match && match[1]) {
        clean = match[1];
      }
    }

    // 1. Try LZString decompression first
    try {
      const lzDecompressed = LZString.decompressFromEncodedURIComponent(clean);
      if (lzDecompressed) {
        const parsed = JSON.parse(lzDecompressed) as HeartPageData;
        if (parsed && typeof parsed === 'object' && (parsed.hero || parsed.id)) {
          return parsed;
        }
      }
    } catch (e) {}

    // 2. Try legacy Base64 decoding
    try {
      let base64 = clean;
      try {
        base64 = decodeURIComponent(clean);
      } catch (e) {
        base64 = clean;
      }

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const jsonStr = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(jsonStr) as HeartPageData;
      if (parsed && typeof parsed === 'object' && (parsed.hero || parsed.id)) {
        return parsed;
      }
    } catch (e) {}

    return null;
  } catch (err) {
    console.warn('Failed to decode page data from hash:', err);
    return null;
  }
}

export function createDefaultPageData(): HeartPageData {
  const defaultTemplate = TEMPLATE_PRESETS[0];
  const now = new Date().toISOString();
  const randomId = 'hp-' + Math.random().toString(36).substring(2, 9);

  return {
    ...defaultTemplate.data,
    id: randomId,
    createdAt: now,
    updatedAt: now,
  };
}

export function saveLocalDraft(data: HeartPageData): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + data.id, JSON.stringify(data));
    const recentJson = localStorage.getItem(RECENT_PAGES_KEY);
    const recent: string[] = recentJson ? JSON.parse(recentJson) : [];
    if (!recent.includes(data.id)) {
      recent.unshift(data.id);
      localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(recent.slice(0, 10)));
    }
  } catch (e) {
    console.warn('LocalStorage save failed', e);
  }
}

export function getLocalDraft(id: string): HeartPageData | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
