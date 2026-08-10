/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cloud Media Storage Engine for Misha Greetings
 * Powered by Cloudinary & Persistent Local Disk Fallback
 */

import fs from 'fs';
import path from 'path';

// Clean invalid or empty CLOUDINARY_URL from process.env immediately
if (typeof process.env.CLOUDINARY_URL === 'string') {
  const rawUrl = process.env.CLOUDINARY_URL.trim();
  if (!rawUrl || !rawUrl.startsWith('cloudinary://') || rawUrl.includes('your-')) {
    delete process.env.CLOUDINARY_URL;
  }
}

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let cloudinaryInstance: any = null;
let isCloudinaryInitialized = false;

// Initialize Cloudinary Client from Environment Variables safely
export async function getCloudinaryClient(): Promise<any | null> {
  if (isCloudinaryInitialized) {
    return cloudinaryInstance;
  }

  try {
    const rawCloudinaryUrl = (process.env.CLOUDINARY_URL || '').trim();
    const cloudName = (
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUD_NAME ||
      process.env.CLOUDINARY_NAME ||
      ''
    ).trim();
    const apiKey = (process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY || '').trim();
    const apiSecret = (
      process.env.CLOUDINARY_API_SECRET ||
      process.env.CLOUDINARY_SECRET ||
      ''
    ).trim();

    const hasValidUrl =
      rawCloudinaryUrl.startsWith('cloudinary://') &&
      !rawCloudinaryUrl.includes('your-') &&
      rawCloudinaryUrl.length > 15;

    const hasValidKeys =
      Boolean(cloudName && apiKey && apiSecret) &&
      !cloudName.includes('your-') &&
      !apiKey.includes('your-') &&
      !apiSecret.includes('your-');

    if (!hasValidUrl && !hasValidKeys) {
      delete process.env.CLOUDINARY_URL;
      isCloudinaryInitialized = true;
      cloudinaryInstance = null;
      return null;
    }

    if (!hasValidUrl) {
      delete process.env.CLOUDINARY_URL;
    }

    // Dynamically load Cloudinary to prevent top-level module load exceptions
    const cloudinaryModule = await import('cloudinary');
    const cloudinary = cloudinaryModule.v2 || (cloudinaryModule as any).default?.v2 || cloudinaryModule;

    if (hasValidUrl) {
      cloudinary.config({
        cloudinary_url: rawCloudinaryUrl,
        secure: true,
      });
      console.log('☁️ [Cloudinary Storage] Connected via CLOUDINARY_URL.');
      cloudinaryInstance = cloudinary;
      isCloudinaryInitialized = true;
      return cloudinary;
    }

    if (hasValidKeys) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      console.log(`☁️ [Cloudinary Storage] Connected for cloud: "${cloudName}".`);
      cloudinaryInstance = cloudinary;
      isCloudinaryInitialized = true;
      return cloudinary;
    }
  } catch (err) {
    console.warn('[Cloudinary Storage] Initialization skipped:', err);
  }

  isCloudinaryInitialized = true;
  cloudinaryInstance = null;
  return null;
}

export function isCloudinaryActive(): boolean {
  const url = (process.env.CLOUDINARY_URL || '').trim();
  const name = (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME || '').trim();
  const key = (process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY || '').trim();
  const secret = (process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET || '').trim();

  return (
    (url.startsWith('cloudinary://') && !url.includes('your-') && url.length > 15) ||
    (Boolean(name && key && secret) && !name.includes('your-'))
  );
}

// Get proper extension from MIME type
export function getExtensionFromMime(mimeType: string): string {
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('mp3') || mime.includes('mpeg')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg') || mime.includes('opus')) return 'ogg';
  if (mime.includes('m4a') || mime.includes('aac')) return 'm4a';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('quicktime') || mime.includes('mov')) return 'mov';
  return 'bin';
}

// Upload base64 / data URL to Cloudinary (or disk fallback)
export async function uploadBase64ToCloud(
  dataUrl: string,
  originalFilename?: string
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  const cld = await getCloudinaryClient();

  // A. Upload directly to Cloudinary (Photos, Audio, Video, GIFs, Voice notes)
  if (cld) {
    try {
      const uploadOptions: Record<string, any> = {
        folder: 'misha_greetings',
        resource_type: 'auto',
        overwrite: true,
      };

      if (originalFilename) {
        const cleanName = originalFilename
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_');
        uploadOptions.public_id = `${cleanName}_${Date.now().toString(36)}`;
      }

      const result = await cld.uploader.upload(dataUrl, uploadOptions);
      if (result && result.secure_url) {
        return result.secure_url;
      }
    } catch (cldErr) {
      console.error('[Cloudinary Storage] Upload failed, using disk fallback:', cldErr);
    }
  }

  // B. Fallback: Save to Container Disk & Serve Statically at /uploads/*
  try {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return dataUrl;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = getExtensionFromMime(mimeType);
    const randomKey = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now();
    const safeFilename = `media_${timestamp}_${randomKey}.${ext}`;

    const filePath = path.join(UPLOADS_DIR, safeFilename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${safeFilename}`;
  } catch (diskErr) {
    console.error('[Storage] Disk write fallback failed:', diskErr);
    throw new Error('Failed to save media to storage');
  }
}

// Upload a raw binary buffer to Cloud Storage
export async function uploadBufferToCloud(
  buffer: Buffer,
  mimeType: string,
  originalFilename?: string
): Promise<string> {
  const base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;
  return uploadBase64ToCloud(base64Data, originalFilename);
}

// Deep Media Sanitizer: Scans entire project JSON, finds any data: base64
// or temporary media strings, uploads them to Cloudinary in parallel, and returns permanent URLs.
export async function deepSanitizeAndUploadMedia(obj: any): Promise<any> {
  if (!obj) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('data:') && obj.includes(';base64,')) {
      try {
        const cloudUrl = await uploadBase64ToCloud(obj);
        return cloudUrl;
      } catch (e) {
        console.warn('[Cloud Storage] Failed to upload inline media string:', e);
        return obj;
      }
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return Promise.all(obj.map((item) => deepSanitizeAndUploadMedia(item)));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    const keys = Object.keys(obj);
    for (const key of keys) {
      sanitized[key] = await deepSanitizeAndUploadMedia(obj[key]);
    }
    return sanitized;
  }

  return obj;
}

// Clean up associated cloud media files when a card or chat is deleted
export async function deleteCloudMedia(mediaUrl: string): Promise<boolean> {
  if (!mediaUrl || typeof mediaUrl !== 'string') return false;

  // If local /uploads/
  if (mediaUrl.startsWith('/uploads/')) {
    try {
      const cleanUrl = mediaUrl.split('?')[0];
      const filename = path.basename(cleanUrl);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (e) {
      console.warn('[Storage] Error deleting local file:', e);
    }
  }

  // If Cloudinary
  const cld = await getCloudinaryClient();
  if (cld && mediaUrl.includes('cloudinary.com')) {
    try {
      const urlWithoutParams = mediaUrl.split('?')[0];
      const match = urlWithoutParams.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      if (match && match[1]) {
        const publicId = match[1];
        await Promise.allSettled([
          cld.uploader.destroy(publicId, { resource_type: 'image' }),
          cld.uploader.destroy(publicId, { resource_type: 'video' }),
          cld.uploader.destroy(publicId, { resource_type: 'raw' }),
        ]);
        return true;
      }
    } catch (e) {
      console.warn('[Cloudinary Storage] Error deleting asset:', e);
    }
  }

  return false;
}
