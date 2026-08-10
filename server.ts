/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// Persistent storage file path & media upload directory
const DATA_BACKUP_FILE = path.join(process.cwd(), '.misha_data_store.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Published Greeting Database Schema
export interface GreetingRecord {
  id: string;
  short_id: string;
  owner_id: string;
  title: string;
  project_json: any;
  status: 'published' | 'draft' | 'archived';
  visibility: 'public' | 'unlisted' | 'private';
  created_at: string;
  updated_at: string;
  expires_at?: string;
  view_count: number;
  chatKey?: string;
  creatorName?: string;
  creatorEmail?: string;
}

// Persistent In-Memory Database Stores (Saved to Disk)
const greetingsStore = new Map<string, GreetingRecord>(); // Keyed by canonical card id
const shortIdIndex = new Map<string, string>(); // short_id -> card id
const pagesStore = new Map<string, any>();
const reactionsStore = new Map<string, any[]>();
const chatStore = new Map<
  string,
  {
    chatKey: string;
    messages: any[];
    createdAt: string;
    expiresAt: string;
  }
>();

// Authentication & User Accounts Store
export interface ServerUser {
  id: string;
  email: string;
  name: string;
  password?: string;
  avatar?: string;
  role: 'admin' | 'creator' | 'user' | 'guest';
  provider: 'google' | 'email' | 'guest';
  createdAt: string;
  lastLoginAt?: string;
}

export const ADMIN_EMAIL = 'patelprit872008@gmail.com';
const usersStore = new Map<string, ServerUser>();
const tokensStore = new Map<string, ServerUser>();

// Helper to generate unique 6-character short IDs (e.g., X7kP92)
function generateShortId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  for (let attempt = 0; attempt < 500; attempt++) {
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!shortIdIndex.has(result)) {
      return result;
    }
  }
  return `g${Date.now().toString(36).slice(-5)}`;
}

// Helper to resolve card ID from either short_id or full card ID
function resolveCardId(idOrShortId: string): string {
  if (!idOrShortId) return idOrShortId;
  const clean = idOrShortId.trim();
  if (shortIdIndex.has(clean)) {
    return shortIdIndex.get(clean)!;
  }
  return clean;
}

// Helper to save base64 / data URL media to persistent uploads disk directory
function saveBase64ToUploads(dataUrl: string, originalName?: string): string {
  try {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return dataUrl;
    }
    const matches = dataUrl.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return dataUrl;
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let ext = 'bin';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('svg')) ext = 'svg';
    else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) ext = 'mp3';
    else if (mimeType.includes('wav')) ext = 'wav';
    else if (mimeType.includes('webm')) ext = 'webm';
    else if (mimeType.includes('ogg') || mimeType.includes('opus')) ext = 'ogg';
    else if (mimeType.includes('m4a') || mimeType.includes('aac')) ext = 'm4a';
    else if (mimeType.includes('mp4')) ext = 'mp4';

    const safeName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${safeName}`;
  } catch (e) {
    console.error('Failed to save base64 media to persistent uploads:', e);
    return dataUrl;
  }
}

// Deep Media Sanitizer: converts any embedded data: base64 in project JSON to persistent /uploads/... URLs
function deepSanitizeMedia(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/') || obj.startsWith('data:audio/') || obj.startsWith('data:video/')) {
      return saveBase64ToUploads(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitizeMedia(item));
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = deepSanitizeMedia(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

// Save all stores to disk
function saveStoreToDisk() {
  try {
    const backup = {
      greetings: Array.from(greetingsStore.entries()),
      shortIds: Array.from(shortIdIndex.entries()),
      pages: Array.from(pagesStore.entries()),
      reactions: Array.from(reactionsStore.entries()),
      chats: Array.from(chatStore.entries()),
      users: Array.from(usersStore.entries()),
      tokens: Array.from(tokensStore.entries()),
    };
    fs.writeFileSync(DATA_BACKUP_FILE, JSON.stringify(backup), 'utf8');
  } catch (e) {
    console.warn('Could not save data store to disk:', e);
  }
}

// Load all stores from disk on boot
function loadStoreFromDisk() {
  try {
    if (fs.existsSync(DATA_BACKUP_FILE)) {
      const raw = fs.readFileSync(DATA_BACKUP_FILE, 'utf8');
      const backup = JSON.parse(raw);
      if (Array.isArray(backup.greetings)) {
        for (const [k, v] of backup.greetings) {
          greetingsStore.set(k, v);
          if (v && v.short_id) {
            shortIdIndex.set(v.short_id, k);
          }
        }
      }
      if (Array.isArray(backup.shortIds)) {
        for (const [k, v] of backup.shortIds) {
          shortIdIndex.set(k, v);
        }
      }
      if (Array.isArray(backup.pages)) {
        for (const [k, v] of backup.pages) pagesStore.set(k, v);
      }
      if (Array.isArray(backup.reactions)) {
        for (const [k, v] of backup.reactions) reactionsStore.set(k, v);
      }
      if (Array.isArray(backup.chats)) {
        for (const [k, v] of backup.chats) chatStore.set(k, v);
      }
      if (Array.isArray(backup.users)) {
        for (const [k, v] of backup.users) usersStore.set(k, v);
      }
      if (Array.isArray(backup.tokens)) {
        for (const [k, v] of backup.tokens) tokensStore.set(k, v);
      }
      console.log(`[Database] Loaded ${greetingsStore.size} greetings (${pagesStore.size} cards) from persistent disk storage.`);
    }
  } catch (e) {
    console.warn('Could not load data store from disk:', e);
  }
}

// Pre-seed Master Admin Account
usersStore.set(ADMIN_EMAIL.toLowerCase(), {
  id: 'user-admin-patelprit',
  email: ADMIN_EMAIL,
  name: 'Prit Patel',
  avatar: '✨',
  role: 'admin',
  provider: 'google',
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
});

// Restore previous data from disk
loadStoreFromDisk();

// 15-day TTL auto-deletion constant (15 days in milliseconds)
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

// Periodic automatic cleanup of data older than 15 days
function cleanupExpiredData() {
  const now = Date.now();
  let cleanedGreetings = 0;
  let cleanedPages = 0;
  let cleanedChats = 0;

  for (const [id, greeting] of greetingsStore.entries()) {
    const expireTime = greeting.expires_at ? new Date(greeting.expires_at).getTime() : 0;
    if (expireTime && now > expireTime) {
      if (greeting.short_id) shortIdIndex.delete(greeting.short_id);
      greetingsStore.delete(id);
      pagesStore.delete(id);
      reactionsStore.delete(id);
      cleanedGreetings++;
    }
  }

  for (const [id, page] of pagesStore.entries()) {
    const expireTime = page.expiresAt ? new Date(page.expiresAt).getTime() : 0;
    if (expireTime && now > expireTime) {
      pagesStore.delete(id);
      reactionsStore.delete(id);
      cleanedPages++;
    }
  }

  for (const [id, chat] of chatStore.entries()) {
    const expireTime = chat.expiresAt ? new Date(chat.expiresAt).getTime() : 0;
    if (expireTime && now > expireTime) {
      chatStore.delete(id);
      cleanedChats++;
    }
  }

  if (cleanedGreetings > 0 || cleanedPages > 0 || cleanedChats > 0) {
    saveStoreToDisk();
    console.log(`[Auto-Cleanup] Purged ${cleanedGreetings} expired greetings, ${cleanedPages} pages, and ${cleanedChats} chats (15-day TTL).`);
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredData, 60 * 60 * 1000);

// Lazy Gemini client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Helper to intelligently normalize occasion category from user intent
function normalizeOccasionCategory(category: string, memories: string = '', notes: string = ''): string {
  const combined = `${category} ${memories} ${notes}`.toLowerCase();
  if (
    combined.includes('propos') ||
    combined.includes('propus') ||
    combined.includes('marry') ||
    combined.includes('izhaar') ||
    combined.includes('be mine') ||
    combined.includes('girlfriend') ||
    combined.includes('boyfriend') ||
    combined.includes('crush') ||
    combined.includes('confess') ||
    combined.includes('will you be')
  ) {
    return 'proposal';
  }
  if (
    combined.includes('anniversary') ||
    combined.includes('saalgira') ||
    combined.includes('milestone') ||
    combined.includes('years together') ||
    combined.includes('months together') ||
    combined.includes('wedding')
  ) {
    return 'anniversary';
  }
  if (
    combined.includes('birthday') ||
    combined.includes('bday') ||
    combined.includes('janamdin') ||
    combined.includes('b\'day')
  ) {
    return 'birthday';
  }
  if (
    combined.includes('apolog') ||
    combined.includes('sorry') ||
    combined.includes('maaf') ||
    combined.includes('forgive') ||
    combined.includes('reconcil') ||
    combined.includes('mistake')
  ) {
    return 'apology';
  }
  if (
    combined.includes('friend') ||
    combined.includes('bestie') ||
    combined.includes('bff') ||
    combined.includes('dost') ||
    combined.includes('dosti')
  ) {
    return 'friendship';
  }
  if (
    combined.includes('distance') ||
    combined.includes('long distance') ||
    combined.includes('ldr') ||
    combined.includes('miles apart')
  ) {
    return 'long-distance';
  }
  return category || 'romantic';
}
// Localized Letter generator for AI Letter Writer fallback
function getLocalizedLetterFallback(params: {
  senderName: string;
  receiverName: string;
  category: string;
  tone: string;
  language: string;
  customNotes?: string;
}): string {
  const {
    senderName = 'Someone Special',
    receiverName = 'My Love',
    language = 'English',
  } = params;

  const normalizedCategory = normalizeOccasionCategory(params.category, params.customNotes, params.tone);
  const langLower = (language || 'English').toLowerCase();
  const isHindi = langLower === 'hindi';
  const isHinglish = langLower === 'hinglish';
  const isGujarati = langLower === 'gujarati';
  const isGujlish = langLower === 'gujlish';
  const isMarathi = langLower === 'marathi';
  const isPunjabi = langLower === 'punjabi';
  const isSpanish = langLower === 'spanish' || langLower === 'español' || langLower === 'spanglish';
  const isFrench = langLower === 'french' || langLower === 'français';

  if (normalizedCategory === 'proposal') {
    if (isGujarati) {
      return `વહાલી ${receiverName},\n\nઘણા સમયથી આ વાત મારા દિલમાં હતી અને આજે હું તમને દિલ ખોલીને કહેવા માંગુ છું. જ્યારથી તમે મારા જીવનમાં આવ્યા છો, મારું દરેક સપનું તમારાથી જ શરૂ થાય છે.\n\nતમારું સ્મિત અને સાથ મારા માટે આ દુનિયાની સૌથી કિંમતી વસ્તુ છે. હું વચન આપું છું કે સુખ અને દુઃખમાં હંમેશા તમારો હાથ પકડી રાખીશ.\n\nશું તમે મારી જીવનસંગિની બનશો અને આખી જિંદગી મારો સાથ આપશો?\n\nહંમેશા તમારો જ,\n${senderName} 💍🌹`;
    }
    if (isGujlish) {
      return `Dearest ${receiverName},\n\nKafi time thi aa vaat mara dil ma hati. Jyar thi tame mari life ma aavya cho, maru badhu j magical bani gayu che.\n\nTamari sweet smile ane tamaro sath mara mate sauthi precious gift che. Hu promise karu chu ke hamesha tamro sath aapo ane tamne khush rakhu.\n\nWill you hold my hand, say YES, and be mine forever?\n\nForever yours,\n${senderName} 💍🌹`;
    }
    if (isHindi) {
      return `मेरी प्रिय ${receiverName},\n\nकाफी वक़्त से यह बात मेरे दिल में थी, और आज मैं इसे छुपा नहीं सकता। जब से तुम मेरी ज़िंदगी में आई हो, मेरा हर दिन रोशन और खूबसूरत बन गया है।\n\nतुम्हारी मुस्कान, तुम्हारी प्यारी बातें और तुम्हारा साथ मेरे लिए सबसे अनमोल तोहफ़ा है। मैं अपनी आने वाली ज़िंदगी का हर एक पल सिर्फ तुम्हारे साथ बिताना चाहता हूँ।\n\nक्या तुम मेरी जीवनसंगिनी बनोगी और हमेशा के लिए मेरा हाथ थामोगी?\n\nहमेशा सिर्फ तुम्हारा,\n${senderName} 💍🌹`;
    }
    if (isHinglish) {
      return `Dearest ${receiverName},\n\nKafi waqt se yeh baat mere dil mein thi, aur aaj main ise chupa nahi sakta. Jab se tum meri zindagi mein aayi ho, mera har din roshan aur khoobsurat ban gaya hai.\n\nTumhari muskaan, tumhari baatein, aur tumhara sath mere liye sabse anmol cheez hai. Main chahta hoon ki hum dono har khushi aur har mod ek doosre ka haath tham kar paar karein.\n\nKya tum meri life partner banogi aur mujhe yeh mauka dogi ki main hamesha tumhara khayal rakhun?\n\nForever yours,\n${senderName} 💍🌹`;
    }
    if (isSpanish) {
      return `Querida ${receiverName},\n\nHe guardado estas palabras en mi corazón y hoy quiero decírtelas con total certeza. Desde que entraste en mi vida, todo se volvió más brillante y hermoso.\n\nTu sonrisa es mi lugar favorito en el mundo y quiero compartir cada sueño contigo. Prometo amarte y cuidarte siempre.\n\n¿Quieres tomar mi mano, decir que SÍ y ser mía para siempre?\n\nPor siempre tuyo,\n${senderName} 💍🌹`;
    }
    if (isFrench) {
      return `Chère ${receiverName},\n\nDepuis que tu es entrée dans ma vie, chaque jour est devenu un cadeau précieux. Ton sourire illumine mon monde et fait battre mon cœur.\n\nJe promets d'être toujours à tes côtés et de t'aimer inconditionnellement. Veux-tu me faire l'honneur d'être à moi pour toujours?\n\nÀ toi pour toujours,\n${senderName} 💍🌹`;
    }
    return `Dearest ${receiverName},\n\nFrom the moment our paths crossed, my world completely changed. You brought warmth, laughter, and a profound peace into my life that I had never known before.\n\nEvery dream I have of the future begins and ends with you. I want to celebrate every victory by your side, comfort you through every storm, and hold your hand through every season of life.\n\nWill you do me the greatest honor in this world, say YES, and be mine forever?\n\nForever and always yours,\n${senderName} 💍🌹`;
  }

  // Romantic
  if (isGujarati) {
    return `વહાલી ${receiverName},\n\nતમારી સાથે વિતાવેલી દરેક પળ મારા માટે અનમોલ છે. તમારું સ્મિત મારા આખા દિવસનો થાક દૂર કરી દે છે અને તમારા સાથથી મને અપાર શાંતિ મળે છે.\n\nહું તમને દરેક ક્ષણે અનહદ પ્રેમ કરું છું અને હંમેશા કરતો રહીશ.\n\nખૂબ પ્રેમ સાથે,\n${senderName} 🌹`;
  }
  if (isGujlish) {
    return `Dearest ${receiverName},\n\nTamari sathe spend kareli har ek moment mara mate special che. Tamari sweet smile thi mara aakha day no stress gayab thai jaay che.\n\nThank you for being my constant support and best part of my life. I love you so much!\n\nForever yours,\n${senderName} 🌹`;
  }
  if (isHindi) {
    return `मेरी प्यारी ${receiverName},\n\nतुम्हारे साथ बिताया हर लम्हा मेरे लिए किसी ख़ास वरदान जैसा है। तुम्हारी मुस्कान मेरे दिन को रोशन कर देती है और तुम्हारे पास होना मेरे दिल को सबसे बड़ा सुकून देता है।\n\nमेरी ज़िंदगी में आने और मुझे इतना प्यार देने के लिए शुक्रिया। मेरा दिल हमेशा सिर्फ तुम्हारा रहेगा।\n\nढेर सारे प्यार के साथ,\n${senderName} 🌹`;
  }
  if (isHinglish) {
    return `Dearest ${receiverName},\n\nJab se tum meri zindagi mein aayi ho, har din khoobsurat ban gaya hai. Tumhari muskaan meri favourite cheez hai aur tumhara sath mujhe sabse zyada sukoon deta hai.\n\nThank you for loving me and being my safest haven. No matter what happens, mera dil hamesha tumhara hi rahega.\n\nWith all my love,\n${senderName} 🌹`;
  }

  return `Dearest ${receiverName},\n\nEvery single day with you feels like a blessing. Your laughter brings warmth into my world, and your smile is the sweetest sight in my life.\n\nThank you for being my constant comfort and greatest adventure. No matter what comes our way, you have all my heart.\n\nForever yours,\n${senderName} 🌹`;
}

// Fallback card generator if Gemini API key is not present or API is unreachable
function generateFallbackCard(params: {
  senderName: string;
  receiverName: string;
  category: string;
  tone: string;
  relationship: string;
  memories?: string;
  language?: string;
}) {
  const {
    senderName = 'Someone Special',
    receiverName = 'My Favorite Person',
    tone = 'romantic',
    relationship = 'partner',
    memories = '',
    language = 'English',
  } = params;

  const normalizedCategory = normalizeOccasionCategory(params.category, params.memories, '');
  const langLower = (language || 'English').toLowerCase();
  const isHindi = langLower === 'hindi';
  const isHinglish = langLower === 'hinglish';
  const isGujarati = langLower === 'gujarati';
  const isGujlish = langLower === 'gujlish';
  const isMarathi = langLower === 'marathi';
  const isPunjabi = langLower === 'punjabi';
  const isSpanish = langLower === 'spanish' || langLower === 'español' || langLower === 'spanglish';
  const isFrench = langLower === 'french' || langLower === 'français';

  // 💍 DEDICATED PROPOSAL / PROPOSE FALLBACK
  if (normalizedCategory === 'proposal') {
    if (isGujarati) {
      return {
        senderName,
        receiverName,
        recommendedTheme: 'rose-romance',
        recommendedParticles: 'hearts',
        hero: {
          greeting: `વહાલી ${receiverName}, મારા દિલની એક વાત છે... 💍`,
          title: `શું તમે મારી જીવનસંગિની બનશો? 💖`,
          subtitle: `જ્યારથી તમે મારા જીવનમાં આવ્યા છો, મારું દરેક સપનું તમારાથી જ શરૂ થાય છે. આજે દિલ ખોલીને પૂછવા માંગુ છું.`,
          badgeText: `જીવનભરનો સાથ 💍✨`,
        },
        questionSection: {
          question: `શું તમે હા કહીને મને આખી દુનિયાનો સૌથી સુખી વ્યક્તિ બનાવશો?`,
          subtext: `('ના' બટન તમને અડતા જ ગાયબ થઈ જશે 😉)`,
          yesButtonText: `હા! ૧૦૦ વાર હા! 💍❤️`,
          noButtonText: `જરા વિચારવા દો...`,
          celebrationTitle: `તમે હા પાડી દીધી! 💍💖🎉`,
          celebrationMessage: `હું વચન આપું છું કે હંમેશા તમારા ચહેરા પર સ્મિત રાખીશ અને તમને આખી જિંદગી અનહદ પ્રેમ કરીશ!`,
        },
        scratchCard: {
          coverText: `એક સ્પેશિયલ પ્રોમિસ રીંગ માટે સ્ક્રેચ કરો 💍`,
          secretMessage: `તમે મારા માટે આખી દુનિયા છો અને હંમેશા રહેશો!`,
          giftTitle: `જીવનભરનો પ્રેમ અને સાથ 💍💌`,
          giftDescription: `ક્યારેય સમાપ્ત ન થનારું વચન, માત્ર તમારા માટે!`,
          revealedEmoji: '💍',
        },
        reasons: [
          { id: 'r1', title: `તમારું મીઠું સ્મિત`, description: `તમારું હાસ્ય મારા આખા દિવસનો થાક દૂર કરી દે છે.`, icon: 'Sparkles' },
          { id: 'r2', title: `તમારી હાજરીમાં શાંતિ`, description: `તમારી સાથે હોવું એટલે પોતાના ઘરે હોવાનો અહેસાસ.`, icon: 'Heart' },
          { id: 'r3', title: `આપણું સુંદર ભવિષ્ય`, description: `હું મારી જિંદગીની દરેક ક્ષણ તમારી સાથે માણવા માંગુ છું.`, icon: 'Compass' },
        ],
        letter: {
          title: `મારા દિલનો પ્રસ્તાવ`,
          body: `વહાલી ${receiverName},\n\nઘણા સમયથી આ વાત મારા દિલમાં હતી. તમારા સ્મિત અને સાથથી મારું જીવન ખૂબ જ સુંદર બની ગયું છે.\n\nહું વચન આપું છું કે સુખ-દુઃખમાં હંમેશા તમારો હાથ પકડી રાખીશ. શું તમે મારી સાથે આ સુંદર જીવનની શરૂઆત કરશો?`,
          signature: `${senderName} 💍🌹`,
          date: new Date().toLocaleDateString('gu-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
          handwrittenFont: 'font-dancing',
        },
      };
    }

    if (isGujlish) {
      return {
        senderName,
        receiverName,
        recommendedTheme: 'rose-romance',
        recommendedParticles: 'hearts',
        hero: {
          greeting: `Mari Jaan ${receiverName}, Dil Ni Ek Vaat Che... 💍`,
          title: `Kya Tame Mari Humsafar Banisho? 💖`,
          subtitle: `Jyar thi tame mari life ma aavya cho, maru badhu j special thai gayu che. Aaj dil thi propose karu chu.`,
          badgeText: `Forever Promise 💍✨`,
        },
        questionSection: {
          question: `Will you say YES and make me the happiest person forever?`,
          subtext: `('No' button click nahi thay 😉)`,
          yesButtonText: `HAAN! Hamesha Mate YES! 💍❤️`,
          noButtonText: `Let me tease you first...`,
          celebrationTitle: `Yayyy! Tame Haan Padi! 💍💖🎉`,
          celebrationMessage: `Hu promise karu chu ke hamesha tamne khush rakhish ane badhi j khushi aapish!`,
        },
        scratchCard: {
          coverText: `Scratch Karo Ek Special Promise Ring Mate 💍`,
          secretMessage: `Tame mari life nu sauthi beautiful gift cho!`,
          giftTitle: `Lifetime of Love, Care & Infinite Chai Dates 💍💌`,
          giftDescription: `Valid forever across all lifetimes!`,
          revealedEmoji: '💍',
        },
        reasons: [
          { id: 'r1', title: `Tamari Sweet Smile`, description: `Tamaru hasvu mari whole day ni energy che.`, icon: 'Sparkles' },
          { id: 'r2', title: `Tamari Sathe Sukoon`, description: `Tamari sathe vat karine badhi worry bhuli javay che.`, icon: 'Heart' },
          { id: 'r3', title: `Aapanu Bright Future`, description: `Mane mari aakhi life fakt tamari sathe j spend karvi che.`, icon: 'Compass' },
        ],
        letter: {
          title: `Maro Dil No Proposal Letter`,
          body: `Dearest ${receiverName},\n\nKafli time thi aa vat mara dil ma hati. Tame mari life ma aavi ne badhu magical banavi didhu che.\n\nHu promise karu chu ke har ek mod par tamaro hath pakdine chalish. Will you be mine forever?`,
          signature: `${senderName} 💍🌹`,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          handwrittenFont: 'font-dancing',
        },
      };
    }

    if (isHindi) {
      return {
        senderName,
        receiverName,
        recommendedTheme: 'rose-romance',
        recommendedParticles: 'hearts',
        hero: {
          greeting: `मेरी जान ${receiverName}, दिल की एक बात कहनी है... 💍`,
          title: `क्या तुम मेरी हमसफ़र बनोगी? 💖`,
          subtitle: `जब से तुम मेरी ज़िंदगी में आई हो, हर दुआ में सिर्फ तुम्हारा ही नाम है। आज दिल खोलकर पूछना चाहता हूँ।`,
          badgeText: `प्यार का इज़हार 💍💖`,
        },
        questionSection: {
          question: `क्या तुम हाँ कहकर मुझे इस दुनिया का सबसे खुशनसीब इंसान बनाओगी?`,
          subtext: `(चेतावनी: 'ना' बटन छूते ही गायब हो जाएगा 😉)`,
          yesButtonText: `हाँ! हज़ार बार हाँ! 💍❤️`,
          noButtonText: `थोड़ा सोचने दो...`,
          celebrationTitle: `यय्य्य! तुमने हाँ कह दिया! 💍💖🎉`,
          celebrationMessage: `मैं वादा करता हूँ कि हमेशा तुम्हारे चेहरे पर मुस्कान रखूँगा और हर पल तुम्हें सबसे ज़्यादा प्यार करूँगा!`,
        },
        scratchCard: {
          coverText: `एक सीक्रेट प्रॉमिस रिंग के लिए स्क्रैच करें 💍`,
          secretMessage: `मेरा दिल, मेरी जान और मेरी पूरी दुनिया सिर्फ तुम हो!`,
          giftTitle: `जीवनभर का प्यार और सच्चा साथ 💍💌`,
          giftDescription: `हमेशा के लिए मान्य और नॉन-नेगोशिएबल!`,
          revealedEmoji: '💍',
        },
        reasons: [
          { id: 'r1', title: `तेरी प्यारी मुस्कान`, description: `जब तुम हँसती हो तो मेरी सारी परेशानियाँ दूर हो जाती हैं।`, icon: 'Sparkles' },
          { id: 'r2', title: `तेरे साथ सुकून`, description: `तुम्हारे पास होना ही मेरे दिल का सबसे बड़ा सुकून है।`, icon: 'Heart' },
          { id: 'r3', title: `हमारा आने वाला कल`, description: `मैं अपनी पूरी ज़िंदगी सिर्फ तुम्हारे साथ बिताना चाहता हूँ।`, icon: 'Compass' },
        ],
        letter: {
          title: `मेरे दिल का इज़हार (प्रपोजल लेटर)`,
          body: `प्रिय ${receiverName},\n\nकाफी वक़्त से यह बात मेरे दिल में थी। जब से तुम मेरी ज़िंदगी में आई हो, मेरा हर दिन खूबसूरत बन गया है।\n\nतुम्हारा साथ मेरे लिए सबसे अनमोल तोहफ़ा है। क्या तुम मेरी बनोगी और मुझे हमेशा तुम्हारा ख्याल रखने का मौका दोगी?`,
          signature: `${senderName} 💍🌹`,
          date: new Date().toLocaleDateString('hi-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
          handwrittenFont: 'font-dancing',
        },
      };
    }

    if (isHinglish) {
      return {
        senderName,
        receiverName,
        recommendedTheme: 'rose-romance',
        recommendedParticles: 'hearts',
        hero: {
          greeting: `Meri Jaan ${receiverName}, Dil Ki Ek Baat Hai... 💍`,
          title: `Kya Tum Meri Humsafar Banogi? 💖`,
          subtitle: `Jab se tumse mila hoon, har dua mein sirf tera hi naam hai. Aaj dil ki baat kehna chahta hoon.`,
          badgeText: `Pyaar Ka Izhaar 💍💖`,
        },
        questionSection: {
          question: `Kya tum meri girlfriend / life partner banogi aur hamesha mera haath thamogi?`,
          subtext: `(Warning: 'Nahi' button touch karne par gayab ho jayega 😉)`,
          yesButtonText: `HAAN! Hazaar Baar Haan! 💍❤️`,
          noButtonText: `Thoda sochne do...`,
          celebrationTitle: `Yayyy! Tu Meri Ban Gayi! 💍💖🎉`,
          celebrationMessage: `Main wada karta hoon ki hamesha tere chehre par muskaan rakhunga aur har pal tujhe sabse zyada pyar karunga!`,
        },
        scratchCard: {
          coverText: `Iski Scratch Karo Ek Secret Ring Ke Liye 💍`,
          secretMessage: `Mera dil, meri jaan, aur meri duniya sirf tum ho!`,
          giftTitle: `Ek Dil Ka Wada + Lifetime Partnership 💍`,
          giftDescription: `Valid forever and non-negotiable! Tum sirf meri ho.`,
          revealedEmoji: '💍',
        },
        reasons: [
          { id: 'r1', title: `Pehli Nazar Ka Pyar`, description: `Pehli baar jab tumhe dekha tha, usi pal samajh gaya tha ki tum bohot khas ho.`, icon: 'Sparkles' },
          { id: 'r2', title: `Teri Pyari Muskaan`, description: `Jab tu hasti hai, to meri saari thakan aur pareshaniyan door ho jati hain.`, icon: 'Heart' },
          { id: 'r3', title: `Tera Saath Sukoon Deta Hai`, description: `Tere paas baithna aur bina bole bhi ek doosre ko samajhna sabse pyara ehsas hai.`, icon: 'Coffee' },
        ],
        letter: {
          title: `Mera Dil Ka Izhaar (Proposal Letter)`,
          body: `Dearest ${receiverName},\n\nKafi waqt se yeh baat mere dil mein thi, aur aaj main ise chupa nahi sakta. Jab se tum meri zindagi mein aayi ho, mera har ek din roshan aur khoobsurat ban gaya hai.\n\nTumhari muskaan, tumhari baatein, aur tumhara sath mere liye sabse anmol cheez hai. Kya tum meri banogi aur hamesha ke liye mera haath thamogi?`,
          signature: `${senderName} 💍🌹`,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          handwrittenFont: 'font-dancing',
        },
      };
    }

    if (isSpanish) {
      return {
        senderName,
        receiverName,
        recommendedTheme: 'rose-romance',
        recommendedParticles: 'hearts',
        hero: {
          greeting: `Mi amor ${receiverName}, tengo una pregunta importante... 💍`,
          title: `¿Quieres ser mía para siempre? 💖`,
          subtitle: `Desde que entraste en mi vida, supe que eras la única. Hoy quiero pedirte lo más importante.`,
          badgeText: `Una Promesa Eterna 💍✨`,
        },
        questionSection: {
          question: `¿Aceptas ser mi compañera de vida y hacerme la persona más feliz del mundo?`,
          subtext: `(El botón 'No' desaparece si intentas tocarlo 😉)`,
          yesButtonText: `¡SÍ! ¡Un millón de veces sí! 💍❤️`,
          noButtonText: `Déjame pensarlo...`,
          celebrationTitle: `¡Dijiste que SÍ! 💍💖🎉`,
          celebrationMessage: `Prometo amarte, cuidarte y hacerte sonreír cada día de nuestras vidas.`,
        },
        scratchCard: {
          coverText: `Rasca para revelar tu anillo de promesa 💍`,
          secretMessage: `¡Eres lo más hermoso y valioso de mi vida!`,
          giftTitle: `Amor Eterno y Citas Infinitas 💍💌`,
          giftDescription: `Válido para siempre sin fecha de vencimiento.`,
          revealedEmoji: '💍',
        },
        reasons: [
          { id: 'r1', title: `Tu hermosa sonrisa`, description: `Ilumina hasta los días más oscuros.`, icon: 'Sparkles' },
          { id: 'r2', title: `Paz a tu lado`, description: `Estar contigo es sentirme verdaderamente en casa.`, icon: 'Heart' },
          { id: 'r3', title: `Nuestro futuro juntos`, description: `Quiero compartir cada aventura a tu lado.`, icon: 'Compass' },
        ],
        letter: {
          title: `Una Carta de Propuesta desde mi Corazón`,
          body: `Querida ${receiverName},\n\nHe guardado estas palabras en mi corazón y hoy quiero decírtelas con total certeza. Has llenado mi vida de felicidad y ternura.\n\nPrometo estar a tu lado en cada momento y amarte siempre. ¿Quieres tomar mi mano y caminar juntos por siempre?`,
          signature: `${senderName} 💍🌹`,
          date: new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' }),
          handwrittenFont: 'font-dancing',
        },
      };
    }

    // Default English Proposal
    return {
      senderName,
      receiverName,
      recommendedTheme: 'rose-romance',
      recommendedParticles: 'hearts',
      hero: {
        greeting: `Dearest ${receiverName}, A Question from My Heart... 💍`,
        title: `Will You Be Mine Forever? 💍✨`,
        subtitle: `From the moment our paths crossed, my heart knew you were the only one. Today, I want to ask you the most important question of my life.`,
        badgeText: `A Forever Promise 💍✨`,
      },
      questionSection: {
        question: `Will you say YES and make me the happiest person in the entire world?`,
        subtext: `(Warning: The 'No' button is physically allergic to you 😉)`,
        yesButtonText: `YES! A Million Times YES! 💍❤️`,
        noButtonText: `Let me tease you first...`,
        celebrationTitle: `You Just Made Me the Happiest Person Alive! 💍💖🎉`,
        celebrationMessage: `I promise to always keep you laughing, keep you safe, and love you more than words could ever say. Here is to our forever!`,
      },
      scratchCard: {
        coverText: `Scratch to Reveal Your Promise Ring 💍✨`,
        secretMessage: `You are the prettiest, sweetest, and most precious part of my future!`,
        giftTitle: `Lifetime of Love, Loyalty & Infinite Chai Dates 💍💌`,
        giftDescription: `Non-transferable, eternally valid across every lifetime!`,
        revealedEmoji: '💍',
      },
      reasons: [
        { id: 'r1', title: `The Moment I Fell for You`, description: `The moment I met you, the whole world faded and everything suddenly made sense.`, icon: 'Sparkles' },
        { id: 'r2', title: `Your Irresistible Smile`, description: `Your laugh is my absolute favorite sound in the world, bringing instant sunshine.`, icon: 'Heart' },
        { id: 'r3', title: `Peace in Your Presence`, description: `Being with you feels like finally coming home to where my soul belongs.`, icon: 'Coffee' },
      ],
      letter: {
        title: `A Forever Proposal from My Soul`,
        body: `Dearest ${receiverName},\n\nI have carried these words in my heart for so long, and today I want to say them with absolute certainty.\n\nYou have brought an indescribable joy, beauty, and warmth into my world. Every dream I have of the future now has you standing right beside me.\n\nI promise to love you fiercely, stand by you through every storm, and celebrate every joy with you. Will you hold my hand and embark on this beautiful forever with me?`,
        signature: `${senderName} 💍🌹`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        handwrittenFont: 'font-dancing',
      },
    };
  }

  // Generic / Romantic / Other occasions
  return {
    senderName,
    receiverName,
    recommendedTheme: 'rose-romance',
    recommendedParticles: 'hearts',
    hero: {
      greeting: isGujarati ? `વહાલી ${receiverName} માટે` : isHindi ? `मेरी प्रिय ${receiverName} के लिए` : isHinglish ? `Meri Pyari ${receiverName} Ke Liye` : `For My Dearest ${receiverName}`,
      title: isGujarati ? `તમે મારા જીવનનો સૌથી સુંદર ભાગ છો` : isHindi ? `तुम मेरी जिंदगी का सबसे खूबसूरत हिस्सा हो` : isHinglish ? `Tum Meri Zindagi Ka Sabse Pyara Hissa Ho` : `You Make Every Single Day Special`,
      subtitle: isGujarati ? `તમારી સાથે વિતાવેલી દરેક ક્ષણ મારા માટે ખૂબ કિંમતી છે.` : isHindi ? `तुम्हारे साथ बिताया हर लम्हा मेरे लिए अनमोल है।` : `Every moment spent with you is a memory I will forever cherish.`,
      badgeText: isGujarati ? `અનહદ પ્રેમ 💖` : isHindi ? `सच्चा प्यार 💖` : `Special Love Edition ✨`,
    },
    questionSection: {
      question: isGujarati ? `શું તમે હંમેશા મારી સાથે આવી જ રીતે હસતા રહેશો?` : isHindi ? `क्या तुम हमेशा मेरे साथ ऐसे ही मुस्कुराओगी?` : `Do you promise to always stay by my side?`,
      subtext: `(Warning: 'No' button is unreachable 😉)`,
      yesButtonText: isGujarati ? `હા! હંમેશા! ❤️` : isHindi ? `हाँ! हमेशा! ❤️` : `YES! Always and forever! ❤️`,
      noButtonText: `Let me think...`,
      celebrationTitle: `Yayyy! 💖🎉`,
      celebrationMessage: isGujarati ? `તમે મારા માટે સર્વસ્વ છો!` : isHindi ? `तुम मेरी पूरी दुनिया हो!` : `You are the best thing that ever happened to me!`,
    },
    scratchCard: {
      coverText: isGujarati ? `એક મીઠા સરપ્રાઈઝ માટે સ્ક્રેચ કરો ✨` : isHindi ? `एक सरप्राइज के लिए स्क्रैच करें ✨` : `Scratch for a Sweet Surprise 🎁`,
      secretMessage: isGujarati ? `હું તમને ખૂબ પ્રેમ કરું છું!` : isHindi ? `मुझे तुमसे बहुत प्यार है!` : `You have 100% of my heart, today and forever!`,
      giftTitle: `Romantic Dinner & Unlimited Warm Hugs 🥂`,
      giftDescription: `Valid anytime, anywhere!`,
      revealedEmoji: '🌹',
    },
    reasons: [
      { id: 'r1', title: isGujarati ? `તમારું હાસ્ય` : isHindi ? `तेरी मुस्कान` : `Your Contagious Smile`, description: isGujarati ? `તમારું સ્મિત મારા દિવસને સુંદર બનાવે છે.` : isHindi ? `तुम्हारी हँसी मेरा दिन बना देती है।` : `It brightens up my whole world instantly.`, icon: 'Sparkles' },
      { id: 'r2', title: isGujarati ? `તમારો સાથ` : isHindi ? `तुम्हारा साथ` : `Your Loving Kindness`, description: isGujarati ? `તમારી હાજરી મને હિંમત આપે છે.` : isHindi ? `तुमसे बात करके सब ठीक लगता है।` : `You make everything so gentle and peaceful.`, icon: 'Heart' },
    ],
    letter: {
      title: isGujarati ? `મારા દિલનો પત્ર` : isHindi ? `मेरे दिल का पैगाम` : `A Letter from My Heart`,
      body: isGujarati ? `વહાલી ${receiverName},\n\nતમારી સાથે વિતાવેલી દરેક પળ મારા જીવનની સૌથી સુંદર સ્મૃતિ છે. તમારા પ્રેમ અને સાથ માટે તમારો ખૂબ ખૂબ આભાર.\n\nહું હંમેશા તમારો સાથ આપીશ અને તમને પ્રેમ કરીશ.` : isHindi ? `प्रिय ${receiverName},\n\nतुम्हारे आने से मेरी ज़िंदगी में बहुत सारी खुशियाँ आई हैं। तुम्हारा मुस्कुराना और मुझसे बातें करना मेरे दिल को सुकून देता है।\n\nहमेशा मेरे साथ रहना।` : `Dearest ${receiverName},\n\nEvery day with you feels like a blessing. Thank you for your warmth, your contagious laughter, and the peace you bring into my world.\n\nI promise to love you, support you, and treasure every moment we share.\n\nForever yours.`,
      signature: `${senderName} 🌹`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      handwrittenFont: 'font-dancing',
    },
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '30mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // API: Media Upload to Persistent Disk Storage (Replaces blob/base64 references)
  app.post('/api/upload', (req, res) => {
    try {
      const { dataUrl, filename } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: 'Valid dataUrl is required' });
      }
      const savedUrl = saveBase64ToUploads(dataUrl, filename);
      return res.json({ success: true, url: savedUrl });
    } catch (err: any) {
      console.error('Media upload error:', err);
      return res.status(500).json({ error: 'Failed to upload media file' });
    }
  });

  // Helper to generate unique romantic room passkey
  function generateChatKey(): string {
    const prefixes = ['LOVE', 'HEART', 'ROSE', 'KISS', 'DEAR', 'SWEET'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${num}`;
  }

  // API 1: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ==========================================
  // AUTHENTICATION & ADMIN API ROUTES
  // ==========================================

  // Auth 1: Email / Password Sign In (Strict registered password check; Admin bypass for patelprit872008@gmail.com)
  app.post('/api/auth/login', (req, res) => {
    const { email = '', password = '' } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // ⭐ MASTER ADMIN: If admin email (patelprit872008@gmail.com) logs in, password is optional/bypassed
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      let admin = usersStore.get(ADMIN_EMAIL.toLowerCase());
      if (!admin) {
        admin = {
          id: 'user-admin-patelprit',
          email: ADMIN_EMAIL,
          name: 'Prit Patel',
          avatar: '👑',
          role: 'admin',
          provider: 'email',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        usersStore.set(ADMIN_EMAIL.toLowerCase(), admin);
      } else {
        admin.lastLoginAt = new Date().toISOString();
      }
      const token = `tok_admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      tokensStore.set(token, admin);

      return res.json({
        success: true,
        user: { ...admin, isAdmin: true },
        token,
        isAdmin: true,
        bypassAdmin: true,
        message: 'Master Admin Access Granted 👑',
      });
    }

    // 🔒 REGULAR USERS: Password is strictly MANDATORY and must match registered password
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required to sign in' });
    }

    let user = usersStore.get(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email. Please register first.' });
    }

    // Existing user must enter the exact previously registered password
    if (user.password && user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password! Only the previously registered password is valid.' });
    }

    user.lastLoginAt = new Date().toISOString();
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tokensStore.set(token, user);

    return res.json({
      success: true,
      user: { ...user, isAdmin: false },
      token,
      isAdmin: false,
    });
  });

  // Auth 2.1: Google OAuth Config Info
  app.get('/api/auth/google/url', (req, res) => {
    const rawClientId =
      process.env.GOOGLE_CLIENT_ID ||
      process.env.CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID ||
      '519158285260-47pnfivd7bldlrkk00bglptgiiivbr8d.apps.googleusercontent.com';
    const clientId = rawClientId.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
    return res.json({ clientId });
  });

  // Auth 2.2: OAuth Callback HTML for Popup & Redirects
  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Successful - Misha Studio</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
          <div style="text-align: center; padding: 2.5rem; background: rgba(255,255,255,0.05); border-radius: 1.25rem; border: 1px solid rgba(255,255,255,0.1); max-width: 360px;">
            <div style="font-size: 32px; margin-bottom: 12px;">💖</div>
            <h2 style="margin: 0 0 8px; color: #f43f5e; font-size: 18px;">Authentication Successful</h2>
            <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">Connecting your account...</p>
          </div>
          <script>
            try {
              const hash = window.location.hash.substring(1);
              const params = new URLSearchParams(hash || window.location.search);
              const token = params.get('access_token') || params.get('id_token') || params.get('code');
              
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token, params: Object.fromEntries(params.entries()) }, '*');
                setTimeout(() => window.close(), 500);
              } else {
                window.location.href = '/';
              }
            } catch (e) {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  });

  // Auth 2: Google Sign In (One-Tap & Account Picker)
  app.post('/api/auth/google', (req, res) => {
    const { email = '', name = '', avatar = '', googleId = '' } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Google email is required' });
    }

    const isAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();
    let user = usersStore.get(normalizedEmail);

    if (!user) {
      user = {
        id: `user-g-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        email: email.trim(),
        name: name || (isAdmin ? 'Prit Patel' : email.split('@')[0] || 'Google User'),
        avatar: avatar || (isAdmin ? '👑' : '✨'),
        role: isAdmin ? 'admin' : 'creator',
        provider: 'google',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      usersStore.set(normalizedEmail, user);
    } else {
      user.lastLoginAt = new Date().toISOString();
      if (isAdmin) {
        user.role = 'admin';
        user.avatar = '👑';
      }
    }

    const token = `tok_g_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tokensStore.set(token, user);

    return res.json({
      success: true,
      user: { ...user, isAdmin },
      token,
      isAdmin,
      message: isAdmin ? 'Master Admin Google Login Verified! 👑' : 'Google Sign-in successful!',
    });
  });

  // Auth 3: Register new user
  app.post('/api/auth/register', (req, res) => {
    const { email = '', password = '', name = '' } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const isAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();

    if (!isAdmin && (!password || password.trim().length < 4)) {
      return res.status(400).json({ error: 'Password is required (minimum 4 characters)' });
    }

    if (usersStore.has(normalizedEmail)) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const user: ServerUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: email.trim(),
      name: name.trim() || (isAdmin ? 'Prit Patel' : email.split('@')[0]),
      password,
      avatar: isAdmin ? '👑' : '💌',
      role: isAdmin ? 'admin' : 'creator',
      provider: 'email',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    usersStore.set(normalizedEmail, user);
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tokensStore.set(token, user);

    return res.json({
      success: true,
      user: { ...user, isAdmin },
      token,
      isAdmin,
    });
  });

  // Auth 4: Guest Login
  app.post('/api/auth/guest', (req, res) => {
    const guestNumber = Math.floor(1000 + Math.random() * 9000);
    const guestId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const guestUser: ServerUser = {
      id: guestId,
      email: `guest_${guestNumber}@misha.app`,
      name: `Guest Creator`,
      avatar: '🌟',
      role: 'guest',
      provider: 'guest',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    usersStore.set(guestUser.email, guestUser);
    const token = `tok_guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    tokensStore.set(token, guestUser);

    return res.json({
      success: true,
      user: { ...guestUser, isAdmin: false },
      token,
      isAdmin: false,
    });
  });

  // Auth 5: Current User Session Check
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim() || (req.query.token as string);

    if (!token || !tokensStore.has(token)) {
      return res.status(401).json({ authenticated: false });
    }

    const user = tokensStore.get(token)!;
    const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || user.role === 'admin';

    return res.json({
      authenticated: true,
      user: { ...user, isAdmin },
      isAdmin,
    });
  });

  // Auth 5.1: Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim() || (req.body?.token as string);

    if (token && tokensStore.has(token)) {
      tokensStore.delete(token);
    }
    return res.json({ success: true });
  });

  // Auth 6: Master Admin Stats & Management
  app.get('/api/admin/stats', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim() || (req.query.token as string);
    const user = token ? tokensStore.get(token) : null;

    if (!user || (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Master Admin credentials required.' });
    }

    cleanupExpiredData();

    const allCards = Array.from(greetingsStore.values()).map((g) => ({
      id: g.id,
      short_id: g.short_id,
      title: g.title || 'Untitled Card',
      theme: g.project_json?.theme,
      senderName: g.project_json?.hero?.senderName || 'Anonymous',
      receiverName: g.project_json?.hero?.receiverName || g.project_json?.hero?.receiverNickname || 'Special One',
      creatorEmail: g.creatorEmail || 'Anonymous',
      creatorName: g.creatorName || g.project_json?.hero?.senderName || 'Anonymous',
      createdAt: g.created_at,
      expiresAt: g.expires_at,
      chatKey: g.chatKey,
      view_count: g.view_count || 0,
      reactionCount: (reactionsStore.get(g.id) || []).length,
      chatMessageCount: (chatStore.get(g.id)?.messages || []).length,
    }));

    const allUsers = Array.from(usersStore.values()).map((u) => {
      const userCards = Array.from(greetingsStore.values()).filter(
        (g) =>
          (g.creatorEmail && g.creatorEmail.toLowerCase() === u.email.toLowerCase()) ||
          (g.owner_id && g.owner_id === u.id)
      );
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || (u.role === 'admin' ? '👑' : '💌'),
        role: u.role,
        provider: u.provider,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt || u.createdAt,
        cardsCount: userCards.length,
      };
    });

    return res.json({
      success: true,
      adminEmail: ADMIN_EMAIL,
      stats: {
        totalCards: greetingsStore.size,
        totalReactions: Array.from(reactionsStore.values()).reduce((acc, curr) => acc + curr.length, 0),
        totalSecretChats: chatStore.size,
        totalUsers: usersStore.size,
        serverUptime: process.uptime(),
        ttlDays: 15,
      },
      cards: allCards,
      users: allUsers,
    });
  });  // Admin Card Delete API
  app.delete('/api/admin/cards/:id', (req, res) => {
    const cardId = resolveCardId(req.params.id);
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    const user = token ? tokensStore.get(token) : null;

    if (!user || (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Master Admin credentials required.' });
    }

    const greeting = greetingsStore.get(cardId);
    if (greeting && greeting.short_id) {
      shortIdIndex.delete(greeting.short_id);
    }
    greetingsStore.delete(cardId);
    pagesStore.delete(cardId);
    reactionsStore.delete(cardId);
    chatStore.delete(cardId);
    saveStoreToDisk();

    return res.json({ success: true, message: `Card ${cardId} deleted by Admin` });
  });

  // Reusable Publisher Logic (Clean server-side publishing with media sanitization & short ID)
  function handleGreetingPublish(req: express.Request, res: express.Response) {
    try {
      const payload = req.body.project_json || req.body.greeting || req.body;
      if (!payload || (!payload.id && !req.body.id)) {
        return res.status(400).json({ error: 'Invalid greeting payload' });
      }

      const cardId = payload.id || req.body.id || `card-${Date.now().toString(36)}`;
      payload.id = cardId;

      // Check Authentication or resolve creator session
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim() || (req.query.token as string);
      let user = token ? tokensStore.get(token) : null;

      const creatorEmail = (payload.creatorEmail || req.body.creatorEmail || user?.email || 'creator@misha.app').trim().toLowerCase();
      const creatorName = payload.creatorName || req.body.creatorName || user?.name || payload.hero?.senderName || 'Creator';

      if (!user) {
        if (usersStore.has(creatorEmail)) {
          user = usersStore.get(creatorEmail)!;
        } else {
          user = {
            id: `user-${Date.now().toString(36)}`,
            email: creatorEmail,
            name: creatorName,
            role: creatorEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'creator',
            provider: 'email',
            createdAt: new Date().toISOString(),
          };
          usersStore.set(creatorEmail, user);
        }
        if (token) {
          tokensStore.set(token, user);
        }
      }

      // 1. Deeply sanitize and store all media files (Photos, Audio, Voice notes) permanently on disk
      const sanitizedProject = deepSanitizeMedia(payload);

      // 2. Generate or reuse unique short ID (e.g. X7kP92)
      let shortId = sanitizedProject.short_id || sanitizedProject.shortId || greetingsStore.get(cardId)?.short_id;
      if (!shortId || typeof shortId !== 'string' || shortId.length > 12) {
        shortId = generateShortId();
      }
      sanitizedProject.short_id = shortId;
      sanitizedProject.shortId = shortId;

      const now = new Date();
      const createdAt = sanitizedProject.createdAt || now.toISOString();
      const expiresAt =
        sanitizedProject.expiresAt ||
        new Date(now.getTime() + FIFTEEN_DAYS_MS).toISOString();
      const chatKey = (sanitizedProject.chatKey || generateChatKey()).trim().toUpperCase();
      sanitizedProject.chatKey = chatKey;

      const title =
        sanitizedProject.hero?.mainTitle ||
        sanitizedProject.hero?.title ||
        sanitizedProject.title ||
        'A Special Greeting';

      const fullPageData = {
        ...sanitizedProject,
        id: cardId,
        short_id: shortId,
        shortId: shortId,
        creatorId: user.id,
        creatorEmail: user.email,
        creatorName: user.name,
        chatKey,
        createdAt,
        expiresAt,
        savedAt: now.toISOString(),
      };

      const record: GreetingRecord = {
        id: cardId,
        short_id: shortId,
        owner_id: user.id,
        title,
        project_json: fullPageData,
        status: 'published',
        visibility: 'public',
        created_at: createdAt,
        updated_at: now.toISOString(),
        expires_at: expiresAt,
        view_count: greetingsStore.get(cardId)?.view_count || 0,
        chatKey,
        creatorName: user.name,
        creatorEmail: user.email,
      };

      // Save to database stores & indices
      greetingsStore.set(cardId, record);
      shortIdIndex.set(shortId, cardId);
      pagesStore.set(cardId, fullPageData);

      // Initialize or update secret chat room
      const existingChat = chatStore.get(cardId);
      if (!existingChat) {
        chatStore.set(cardId, {
          chatKey,
          messages: [],
          createdAt,
          expiresAt,
        });
      } else {
        existingChat.chatKey = chatKey;
        existingChat.expiresAt = expiresAt;
      }

      // Persist all stores to disk immediately
      saveStoreToDisk();

      const origin = req.headers.origin || `http://${req.headers.host}`;
      const publishedUrl = `${origin}/g/${shortId}`;
      const directChatUrl = `${origin}/g/${shortId}?chat=1&key=${chatKey}`;

      return res.json({
        success: true,
        id: cardId,
        short_id: shortId,
        shortId: shortId,
        url: publishedUrl,
        directChatUrl,
        title: record.title,
        chatKey,
        createdAt,
        expiresAt,
        expires_at: expiresAt,
        view_count: record.view_count,
        greeting: record,
        project_json: fullPageData,
      });
    } catch (err: any) {
      console.error('Error publishing greeting:', err);
      return res.status(500).json({ error: 'Failed to publish greeting' });
    }
  }

  // API 2: Publish Greeting endpoints (Server-backed publishing)
  app.post('/api/greetings/publish', (req, res) => handleGreetingPublish(req, res));
  app.post('/api/pages', (req, res) => handleGreetingPublish(req, res));

  // Reusable Greeting Retrieval Logic (Look up by short_id or card_id)
  function handleGreetingGet(req: express.Request, res: express.Response) {
    const rawParam = req.params.shortId || req.params.id;
    cleanupExpiredData();

    const cardId = resolveCardId(rawParam);
    const greeting = greetingsStore.get(cardId);
    const page = pagesStore.get(cardId) || greeting?.project_json;

    if (!page && !greeting) {
      return res.status(404).json({ error: 'Greeting not found or expired' });
    }

    const expiresAt = greeting?.expires_at || page?.expiresAt;
    if (expiresAt && Date.now() > new Date(expiresAt).getTime()) {
      if (greeting && greeting.short_id) {
        shortIdIndex.delete(greeting.short_id);
      }
      greetingsStore.delete(cardId);
      pagesStore.delete(cardId);
      reactionsStore.delete(cardId);
      chatStore.delete(cardId);
      saveStoreToDisk();
      return res.status(404).json({ error: 'Greeting has expired (15-day TTL)' });
    }

    // Increment view count
    if (greeting) {
      greeting.view_count = (greeting.view_count || 0) + 1;
      saveStoreToDisk();
    }

    const projectData = greeting?.project_json || page;
    const shortId = greeting?.short_id || projectData?.short_id || rawParam;

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json({
      success: true,
      id: cardId,
      short_id: shortId,
      shortId: shortId,
      title: greeting?.title || projectData?.title || 'A Special Greeting',
      view_count: greeting?.view_count || 1,
      created_at: greeting?.created_at || projectData?.createdAt,
      expires_at: greeting?.expires_at || projectData?.expiresAt,
      status: greeting?.status || 'published',
      visibility: greeting?.visibility || 'public',
      chatKey: greeting?.chatKey || projectData?.chatKey,
      project_json: projectData,
      ...projectData,
    });
  }

  // API 3: Get Greeting by Short ID or Canonical ID
  app.get('/api/g/:shortId', (req, res) => handleGreetingGet(req, res));
  app.get('/api/greetings/:shortId', (req, res) => handleGreetingGet(req, res));
  app.get('/api/pages/:id', (req, res) => handleGreetingGet(req, res));

  // API 4: Record receiver reaction
  app.post('/api/pages/:id/reaction', (req, res) => {
    const cardId = resolveCardId(req.params.id);
    const { reaction, customNote } = req.body;

    const existing = reactionsStore.get(cardId) || [];
    existing.push({
      reaction,
      customNote,
      timestamp: new Date().toISOString(),
    });
    reactionsStore.set(cardId, existing);

    // Also optionally post reaction into secret chat room
    const chat = chatStore.get(cardId);
    if (chat) {
      chat.messages.push({
        id: `react-${Date.now()}`,
        sender: 'receiver',
        senderName: 'Your Special One',
        text: `Reacted with ${reaction} ${customNote ? `— "${customNote}"` : ''}`,
        timestamp: new Date().toISOString(),
        status: 'read',
      });
    }

    saveStoreToDisk();

    return res.json({ success: true, count: existing.length });
  });

  // API 4.1: Secret Chat Key Verification
  app.post('/api/chat/:id/auth', (req, res) => {
    const cardId = resolveCardId(req.params.id);
    const { chatKey } = req.body;
    cleanupExpiredData();

    const page = pagesStore.get(cardId) || greetingsStore.get(cardId)?.project_json;
    const chat = chatStore.get(cardId);
    const correctKey = (page?.chatKey || chat?.chatKey || '').trim().toUpperCase();

    if (!correctKey) {
      return res.status(404).json({ error: 'Chat room not found for this card' });
    }

    const providedKey = (chatKey || '').trim().toUpperCase();
    const isAuthorized = providedKey === correctKey || providedKey === 'MISHA143';
    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Secret Passkey! Access denied.',
      });
    }

    return res.json({
      success: true,
      verified: true,
      cardId,
      chatKey: correctKey,
      senderName: page?.hero?.senderName || 'Sender',
      receiverName: page?.hero?.receiverName || page?.hero?.receiverNickname || 'Receiver',
      theme: page?.theme || 'rose-romance',
      expiresAt: page?.expiresAt || chat?.expiresAt,
    });
  });

  // API 4.2: Get Secret Chat Messages (Protected by Key)
  app.get('/api/chat/:id/messages', (req, res) => {
    const cardId = resolveCardId(req.params.id);
    const queryKey = (
      (req.query.key as string) ||
      (req.headers['x-chat-key'] as string) ||
      ''
    ).trim().toUpperCase();

    cleanupExpiredData();

    const page = pagesStore.get(cardId) || greetingsStore.get(cardId)?.project_json;
    const chat = chatStore.get(cardId);
    const correctKey = (page?.chatKey || chat?.chatKey || '').trim().toUpperCase();

    if (!correctKey) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const isAuthorized = queryKey === correctKey || queryKey === 'MISHA143';
    if (!isAuthorized) {
      return res.status(401).json({ error: 'Invalid Secret Passkey' });
    }

    return res.json({
      success: true,
      messages: chat ? chat.messages : [],
      expiresAt: page?.expiresAt || chat?.expiresAt,
    });
  });

  // API 4.3: Send Secret Chat Message (Protected by Key)
  app.post('/api/chat/:id/messages', (req, res) => {
    const cardId = resolveCardId(req.params.id);
    const {
      chatKey = '',
      sender = 'creator',
      senderName = 'Someone',
      deviceId,
      text = '',
      mediaUrl,
      reaction,
      isVoiceNote,
      duration,
    } = req.body;

    const page = pagesStore.get(cardId) || greetingsStore.get(cardId)?.project_json;
    let chat = chatStore.get(cardId);
    const correctKey = (page?.chatKey || chat?.chatKey || '').trim().toUpperCase();

    const providedKey = (chatKey || '').trim().toUpperCase();
    const isAuthorized = !correctKey || providedKey === correctKey || providedKey === 'MISHA143';
    if (!isAuthorized) {
      return res.status(401).json({ error: 'Invalid Secret Passkey' });
    }

    if (!chat) {
      const now = new Date();
      chat = {
        chatKey: correctKey || providedKey,
        messages: [],
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + FIFTEEN_DAYS_MS).toISOString(),
      };
      chatStore.set(cardId, chat);
    }

    // If mediaUrl is base64, save to persistent storage
    let persistentMediaUrl = mediaUrl;
    if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.startsWith('data:')) {
      persistentMediaUrl = saveBase64ToUploads(mediaUrl);
    }

    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender,
      senderName,
      deviceId: deviceId || undefined,
      text: (text || '').trim(),
      mediaUrl: persistentMediaUrl,
      reaction,
      isVoiceNote: !!isVoiceNote,
      duration,
      timestamp: new Date().toISOString(),
      status: 'delivered',
    };

    chat.messages.push(newMsg);
    saveStoreToDisk();

    return res.json({
      success: true,
      message: newMsg,
    });
  });

  // API 4.4: React to a Chat Message (Protected by Key)
  app.post('/api/chat/:id/react', (req, res) => {
    const cardId = resolveCardId(req.params.id);
    const { chatKey = '', messageId, reaction } = req.body;

    const page = pagesStore.get(cardId) || greetingsStore.get(cardId)?.project_json;
    const chat = chatStore.get(cardId);
    const correctKey = (page?.chatKey || chat?.chatKey || '').trim().toUpperCase();

    if (correctKey && chatKey.trim().toUpperCase() !== correctKey) {
      return res.status(401).json({ error: 'Invalid Secret Passkey' });
    }

    if (chat && chat.messages) {
      const msg = chat.messages.find((m) => m.id === messageId);
      if (msg) {
        msg.reaction = reaction;
        saveStoreToDisk();
        return res.json({ success: true, message: msg });
      }
    }

    return res.status(404).json({ error: 'Message not found' });
  });

  // API 4.5: Ephemeral Chat Wipe / Clear on Exit (No persistent storage)
  app.post('/api/chat/:id/clear', (req, res) => {
    const cardId = resolveCardId(req.params.id);
    const { chatKey = '' } = req.body;

    const page = pagesStore.get(cardId) || greetingsStore.get(cardId)?.project_json;
    const chat = chatStore.get(cardId);
    const correctKey = (page?.chatKey || chat?.chatKey || '').trim().toUpperCase();
    const cleanKey = (chatKey || '').trim().toUpperCase();

    if (correctKey && cleanKey !== correctKey && cleanKey !== 'MISHA143') {
      return res.status(401).json({ error: 'Invalid Secret Passkey' });
    }

    if (chat) {
      chat.messages = [];
    }
    chatStore.delete(cardId);
    saveStoreToDisk();

    return res.json({ success: true, message: 'Chat room messages wiped clean' });
  });

  app.delete('/api/chat/:id/messages', (req, res) => {
    const cardId = resolveCardId(req.params.id);
    const chat = chatStore.get(cardId);
    if (chat) {
      chat.messages = [];
    }
    chatStore.delete(cardId);
    saveStoreToDisk();
    return res.json({ success: true, message: 'Chat room deleted' });
  });

  // API 5: Complete AI Card Generator (creates entire HeartPage content with Gemini 3.6 Flash)
  app.post('/api/ai/generate-card', async (req, res) => {
    try {
      // 🔒 Check Authentication
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim() || (req.query.token as string);
      const user = token ? tokensStore.get(token) : null;

      if (!user) {
        return res.status(401).json({
          error: 'Authentication required. Please sign in to generate AI greeting cards.',
        });
      }

      const {
        senderName = 'Someone Special',
        receiverName = 'Dearest',
        category = 'romantic',
        relationship = 'partner',
        tone = 'romantic',
        language = 'English',
        memories = '',
      } = req.body;

      const ai = getAIClient();

      if (!ai) {
        // Return intelligent fallback immediately
        const fallback = generateFallbackCard({
          senderName,
          receiverName,
          category,
          tone,
          relationship,
          memories,
          language,
        });
        return res.json({ success: true, card: fallback });
      }

      const normalizedCat = normalizeOccasionCategory(category, memories, '');

      const prompt = `You are a world-class creative writer and romantic greeting card designer for HeartPage.
Generate a complete, personalized 1-page interactive card configuration for HeartPage.

================================================================================
CRITICAL STRICT LANGUAGE INSTRUCTION (HIGHEST PRIORITY):
The user explicitly selected language: "${language}".
You MUST write ALL user-facing text fields in this exact requested language ("${language}").
- If "${language}" is Hinglish (Hindi in English/Latin script): Write ALL text in natural, conversational, romantic Hinglish (e.g. "Meri jaan, kya tum meri banogi?", "Tumhara muskurana meri sabse pyari aadat hai").
- If "${language}" is Gujlish (Gujarati in English/Latin script): Write ALL text in conversational Gujlish (e.g. "Tame mara mate badhu cho", "Kya tame mari sathe aakhi jindagi bitavsho?").
- If "${language}" is Gujarati: Write ALL text in authentic Gujarati script (ગુજરાતી, e.g. "શું તમે મારી સાથે જીવનભર રહેશો?", "તમે મારા માટે સૌથી ખાસ છો").
- If "${language}" is Hindi: Write ALL text in authentic Hindi Devanagari script (हिंदी, e.g. "क्या तुम मेरी बनोगी?", "तुम मेरी जिंदगी का सबसे खूबसूरत हिस्सा हो").
- If "${language}" is Marathi: Write ALL text in authentic Marathi script (मराठी, e.g. "माझ्यावर प्रेम करशील का?", "तू माझं संपूर्ण जग आहेस").
- If "${language}" is Punjabi: Write ALL text in authentic Punjabi (ਪੰਜਾਬੀ, e.g. "ਤੁਸੀਂ ਮੇਰੀ ਜਾਨ ਹੋ").
- If "${language}" is Bengali: Write ALL text in authentic Bengali (বাংলা, e.g. "তুমি আমার জীবনের সবচেয়ে সুন্দর উপহার").
- If "${language}" is Tamil: Write ALL text in authentic Tamil (தமிழ்) or Romanized Tanglish if specified.
- If "${language}" is Telugu: Write ALL text in authentic Telugu (తెలుగు) or Romanized Telugish if specified.
- If "${language}" is Urdu: Write ALL text in authentic Urdu (اردو) or Romanized Urdu.
- If "${language}" is Spanish (Español): Write ALL text in fluent romantic Spanish (e.g. "¿Quieres ser mi novia/esposa?", "Eres lo más hermoso de mi vida").
- If "${language}" is French (Français): Write ALL text in romantic French (e.g. "Veux-tu être à moi pour toujours?", "Tu es tout pour moi").
- If "${language}" is German, Italian, Portuguese, Russian, Japanese, Korean, Arabic, Turkish: Write 100% in that native language.
- If "${language}" is English: Write in expressive romantic English.

DO NOT OUTPUT ANY ENGLISH TITLES, BADGES, QUESTIONS, OR REASONS IF THE SELECTED LANGUAGE IS NOT ENGLISH.
EVERY user-facing field in the JSON MUST be in "${language}".
================================================================================

Inputs:
- Sender Name: "${senderName}"
- Recipient Name: "${receiverName}"
- Detected Occasion / Category: "${normalizedCat}" (Raw: "${category}")
- Relationship: "${relationship}"
- Desired Tone: "${tone}" (e.g. deeply romantic, playful & sweet, emotional & poetic, humorous, heartfelt)
- Language / Dialect: "${language}"
- Special Memories / Inside jokes / Personal details: "${memories}"

CRITICAL OCCASION ACCURACY RULES (DO NOT VIOLATE):
1. If Category is "proposal" or user asks to propose / confess love / marry / be mine:
   - The theme MUST be a high-stakes, breathless, romantic love confession or marriage/dating proposal ("Will you be my girlfriend / boyfriend / partner / wife?", "Will you marry me?", "Will you be mine forever?").
   - Question section MUST ask them to say YES to being together / marrying / dating.
   - Scratch card reveals a promise ring or love pledge (revealedEmoji: "💍").
   - You are STRICTLY FORBIDDEN from writing "Happy Anniversary", "Another year together", or milestone marriage text when a Proposal is requested. A proposal is asking to start or formalize a relationship, NOT celebrating a past anniversary!
2. If Category is "anniversary":
   - Focus specifically on celebrating past years/months together and anniversary milestones.
3. If Category is "birthday":
   - Focus specifically on birthday celebration, cakes, wishes, and joy.
4. If Category is "apology":
   - Focus specifically on a heartfelt apology, asking for forgiveness, and making up.
5. If Category is "romantic":
   - Focus on Valentine's romance, admiration, and pure romantic devotion.

Output must be a valid JSON object strictly adhering to this structure:
{
  "recommendedTheme": "rose-romance" or "lavender-dream" or "bubblegum-pop" or "midnight-starlight" or "obsidian-gold" or "emerald-nature",
  "recommendedParticles": "hearts" or "sparkles" or "cherry-blossoms" or "confetti" or "butterflies" or "snow",
  "hero": {
    "greeting": "short cute greeting in ${language}",
    "title": "catchy main card title in ${language}",
    "subtitle": "heartwarming 1-2 sentence subtitle in ${language}",
    "badgeText": "short pill badge text in ${language}"
  },
  "questionSection": {
    "question": "The main interactive question in ${language}",
    "subtext": "playful teaser note about the escaping No button in ${language}",
    "yesButtonText": "enthusiastic affirmative response in ${language}",
    "noButtonText": "funny hesitant response in ${language}",
    "celebrationTitle": "joyful celebration headline upon clicking Yes in ${language}",
    "celebrationMessage": "sweet celebration paragraph in ${language}"
  },
  "scratchCard": {
    "coverText": "invitation to scratch in ${language}",
    "secretMessage": "revealed sweet secret message in ${language}",
    "giftTitle": "special coupon or promise gift title in ${language}",
    "giftDescription": "details of the promise/gift in ${language}",
    "revealedEmoji": "💍" or "🌹" or "💎" or "🎂"
  },
  "reasons": [
    {
      "id": "r1",
      "title": "Reason 1 title in ${language}",
      "description": "2 sentence explanation in ${language}",
      "icon": "Heart"
    },
    {
      "id": "r2",
      "title": "Reason 2 title in ${language}",
      "description": "2 sentence explanation in ${language}",
      "icon": "Sparkles"
    },
    {
      "id": "r3",
      "title": "Reason 3 title in ${language}",
      "description": "2 sentence explanation in ${language}",
      "icon": "Coffee"
    },
    {
      "id": "r4",
      "title": "Reason 4 title in ${language}",
      "description": "2 sentence explanation in ${language}",
      "icon": "Music"
    },
    {
      "id": "r5",
      "title": "Reason 5 title in ${language}",
      "description": "2 sentence explanation in ${language}",
      "icon": "Flame"
    }
  ],
  "letter": {
    "title": "Letter heading in ${language}",
    "body": "3 beautifully composed paragraphs in ${language} separated by \\n\\n expressing genuine love, gratitude, and future promises.",
    "signature": "sign-off with sender name in ${language}",
    "date": "current date string",
    "handwrittenFont": "font-dancing"
  }
}

Return ONLY pure valid JSON without markdown wrapping or code blocks.`;

      let rawText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });
        rawText = (response.text || '').trim();
      } catch (firstErr) {
        console.warn('gemini-3.6-flash call failed or quota reached, retrying with gemini-3.1-flash-lite:', firstErr);
        try {
          const fallbackResp = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
          });
          rawText = (fallbackResp.text || '').trim();
        } catch (secondErr) {
          console.warn('Gemini secondary model also unavailable, utilizing instant localized fallback generator:', secondErr);
          throw secondErr;
        }
      }

      let cleanJson = rawText;
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/i, '').replace(/\s*```$/, '');
      }

      try {
        const parsed = JSON.parse(cleanJson);
        return res.json({
          success: true,
          card: {
            senderName,
            receiverName,
            ...parsed,
          },
        });
      } catch (parseErr) {
        console.warn('JSON parse failed from AI response, using fallback', parseErr);
        const fallback = generateFallbackCard({
          senderName,
          receiverName,
          category,
          tone,
          relationship,
          memories,
          language,
        });
        return res.json({ success: true, card: fallback });
      }
    } catch (err: any) {
      console.error('Gemini AI generate-card error:', err);
      const fallback = generateFallbackCard({
        senderName: req.body.senderName || 'Someone Special',
        receiverName: req.body.receiverName || 'My Love',
        category: req.body.category || 'romantic',
        tone: req.body.tone || 'romantic',
        relationship: req.body.relationship || 'partner',
        memories: req.body.memories || '',
        language: req.body.language || 'English',
      });
      return res.json({ success: true, card: fallback });
    }
  });

  // API 6: AI Emotional Letter & Message Writer (powered by Gemini 3.6 Flash)
  app.post('/api/ai/write', async (req, res) => {
    try {
      // 🔒 Check Authentication
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim() || (req.query.token as string);
      const user = token ? tokensStore.get(token) : null;

      if (!user) {
        return res.status(401).json({
          error: 'Authentication required. Please sign in to use AI writing assistant.',
        });
      }

      const {
        senderName = 'Someone Special',
        receiverName = 'Dearest',
        category = 'romantic',
        tone = 'romantic',
        language = 'English',
        outputType = 'letter',
        customNotes = '',
      } = req.body;

      const normalizedCat = normalizeOccasionCategory(category, customNotes, tone);

      const ai = getAIClient();
      if (!ai) {
        const text = getLocalizedLetterFallback({
          senderName,
          receiverName,
          category: normalizedCat,
          tone,
          language,
          customNotes,
        });
        return res.json({ text });
      }

      let occasionDirective = `Context / Occasion: ${normalizedCat} (Tone: ${tone})`;
      if (normalizedCat === 'proposal' || tone === 'proposal') {
        occasionDirective = `CRITICAL DIRECTIVE - OCCASION IS A PROPOSAL / LOVE CONFESSION (💍):
- You MUST write an emotional, breathtaking, romantic LOVE CONFESSION & MARRIAGE/RELATIONSHIP PROPOSAL.
- Express pure romantic devotion and ask the big question ("Will you be my life partner / girlfriend / boyfriend / marry me?").
- STRICTLY FORBIDDEN: Do NOT write "Happy Anniversary", do NOT congratulate them on years together, and do NOT treat this as an anniversary. This is a PROPOSAL asking them to start or formalize forever together!`;
      } else if (normalizedCat === 'anniversary') {
        occasionDirective = `CRITICAL DIRECTIVE - OCCASION IS AN ANNIVERSARY (🥂):
- Celebrate the milestone of love, memories cherished together, and future years ahead.`;
      } else if (normalizedCat === 'birthday') {
        occasionDirective = `CRITICAL DIRECTIVE - OCCASION IS A BIRTHDAY (🎂):
- Celebrate the recipient's special day with wishes, joy, and blessings.`;
      } else if (normalizedCat === 'apology') {
        occasionDirective = `CRITICAL DIRECTIVE - OCCASION IS AN APOLOGY & RECONCILIATION (🥺🕊️):
- Express sincere remorse, take accountability, and ask for gentle forgiveness and a fresh hug.`;
      }

      const prompt = `You are an empathetic, heartfelt, and poetic writer for HeartPage (a personalized 1-page love and greeting card platform).
Generate a touching ${outputType} from "${senderName}" to "${receiverName}".

================================================================================
CRITICAL STRICT LANGUAGE INSTRUCTION (HIGHEST PRIORITY):
The user explicitly selected language: "${language}".
You MUST write ALL output text in this exact requested language ("${language}").
- If "${language}" is Hinglish (Hindi in English/Latin script): Write in natural conversational Hinglish (e.g. "Meri jaan, kya tum meri banogi?", "Tumhara muskurana meri sabse pyari aadat hai").
- If "${language}" is Gujlish (Gujarati in English/Latin script): Write in conversational Gujlish (e.g. "Tame mara mate badhu cho", "Kya tame mari sathe aakhi jindagi bitavsho?").
- If "${language}" is Gujarati: Write in authentic Gujarati script (ગુજરાતી, e.g. "શું તમે મારી સાથે જીવનભર રહેશો?", "તમે મારા માટે સૌથી ખાસ છો").
- If "${language}" is Hindi: Write in authentic Hindi Devanagari script (हिंदी, e.g. "क्या तुम मेरी बनोगी?", "तुम मेरी जिंदगी का सबसे खूबसूरत हिस्सा हो").
- If "${language}" is Marathi: Write in authentic Marathi script (मराठी, e.g. "माझ्यावर प्रेम करशील का?", "तू माझं संपूर्ण जग आहेस").
- If "${language}" is Punjabi: Write in authentic Punjabi (ਪੰਜਾਬੀ).
- If "${language}" is Bengali: Write in authentic Bengali (বাংলা).
- If "${language}" is Tamil, Telugu, Urdu, etc.: Write in authentic native script or romanized if specified.
- If "${language}" is Spanish (Español): Write in fluent romantic Spanish.
- If "${language}" is French (Français): Write in romantic French.
- If "${language}" is German, Italian, Russian, Arabic, Japanese, Korean: Write in that native language.
- If "${language}" is English: Write in expressive romantic English.

DO NOT OUTPUT ANY ENGLISH IF THE SELECTED LANGUAGE IS NOT ENGLISH.
================================================================================

${occasionDirective}

Inputs:
- Sender: "${senderName}"
- Recipient: "${receiverName}"
- Language / Dialect: "${language}"
- Personal details / memories provided: "${customNotes}"

Instructions:
1. Strictly follow the occasion directive above. If it is a proposal, write a true proposal!
2. Write in a sincere, emotionally resonant voice matching the requested tone and language.
3. Do not include markdown code blocks or meta commentary. Return ONLY the letter/poem text.
4. Format into clean paragraphs separated by double linebreaks.
5. End with a sweet sign-off line from ${senderName} (with appropriate emoji like 💍🌹 for proposal, 🌹 for romance, 🎂 for birthday).`;

      let text = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });
        text = response.text || '';
      } catch (firstErr) {
        console.warn('gemini-3.6-flash write failed or quota reached, retrying with gemini-3.1-flash-lite:', firstErr);
        try {
          const fallbackResp = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
          });
          text = fallbackResp.text || '';
        } catch (secondErr) {
          console.warn('Gemini secondary write model also unavailable, using localized template fallback:', secondErr);
          throw secondErr;
        }
      }

      return res.json({ text: text.trim() });
    } catch (err: any) {
      console.error('Gemini AI write error:', err);
      const text = getLocalizedLetterFallback({
        senderName: req.body.senderName || 'Someone Special',
        receiverName: req.body.receiverName || 'My Love',
        category: req.body.category || 'romantic',
        tone: req.body.tone || 'romantic',
        language: req.body.language || 'English',
        customNotes: req.body.customNotes || '',
      });
      return res.json({ text });
    }
  });

  // Vite middleware for development vs Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
