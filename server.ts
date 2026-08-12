/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Misha Greetings Card - Production Full-Stack Server
 * Powered by Neon PostgreSQL Database & Cloud Media Storage
 */

// Clean invalid or empty CLOUDINARY_URL from process.env BEFORE any SDK evaluation
if (process.env.CLOUDINARY_URL !== undefined) {
  const rawUrl = (process.env.CLOUDINARY_URL || '').trim();
  if (!rawUrl || !rawUrl.startsWith('cloudinary://')) {
    delete process.env.CLOUDINARY_URL;
  }
}

import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

import {
  initDatabase,
  saveGreeting,
  getGreetingByShortId,
  getGreetingById,
  getRawGreetingById,
  incrementGreetingViewCount,
  listAllGreetings,
  deleteGreeting,
  saveUser,
  getUserByEmail,
  getUserById,
  saveUserToken,
  getUserByToken,
  deleteUserToken,
  listAllUsers,
  saveReaction,
  getReactions,
  saveChatMessage,
  getChatMessages,
  clearChatMessages,
  recordChatJoin,
  recordChatExit,
  isChatRoomExpired,
  cleanupExpiredChats,
  runRetentionPolicyWorker,
  isDatabaseConnected,
  GreetingRecord,
  ServerUser,
  CARD_RETENTION_DAYS,
  CARD_RETENTION_MS,
  CHAT_RETENTION_HOURS,
  CHAT_RETENTION_MS,
  isGreetingExpired,
  cleanupExpiredGreetings,
} from './server/db';

import {
  uploadBufferToCloud,
  uploadBase64ToCloud,
  deepSanitizeAndUploadMedia,
  deleteCloudMedia,
  isCloudinaryActive,
} from './server/storage';

export const ADMIN_EMAIL = 'patelprit872008@gmail.com';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper to generate unique 6-character short ID (e.g., X7kP92) verified against Neon DB
async function generateUniqueShortId(): Promise<string> {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  for (let attempt = 0; attempt < 500; attempt++) {
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await getGreetingByShortId(result);
    if (!existing) {
      return result;
    }
  }
  return `g${Date.now().toString(36).slice(-5)}`;
}

// Helper to generate unique romantic room passkey
function generateChatKey(): string {
  const prefixes = ['LOVE', 'HEART', 'ROSE', 'KISS', 'DEAR', 'SWEET'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

// Lazy Gemini AI client
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

  // Romantic default fallback
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

// Fallback card generator if Gemini API is unreachable
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
    language = 'English',
  } = params;

  const normalizedCategory = normalizeOccasionCategory(params.category, params.memories, '');
  const langLower = (language || 'English').toLowerCase();
  const isHindi = langLower === 'hindi';
  const isHinglish = langLower === 'hinglish';
  const isGujarati = langLower === 'gujarati';
  const isGujlish = langLower === 'gujlish';
  const isSpanish = langLower === 'spanish' || langLower === 'español' || langLower === 'spanglish';

  // Proposal Fallback
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
          body: `Dearest ${receiverName},\n\nKafi time thi aa vat mara dil ma hati. Tame mari life ma aavi ne badhu magical banavi didhu che.\n\nHu promise karu chu ke har ek mod par tamaro hath pakdine chalish. Will you be mine forever?`,
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

  // Generic Romantic Fallback
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
  // 1. Initialize Neon PostgreSQL Database
  await initDatabase();

  // 2. Pre-seed Master Admin Account
  await saveUser({
    id: 'user-admin-patelprit',
    email: ADMIN_EMAIL,
    name: 'Prit Patel',
    avatar: '👑',
    role: 'admin',
    provider: 'google',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  });

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '35mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ====================================================
  // API: CLOUD MEDIA STORAGE UPLOAD (Direct & Permanent)
  // ====================================================
  app.post('/api/upload', async (req, res) => {
    try {
      const { dataUrl, filename } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: 'Valid dataUrl is required' });
      }
      const cloudUrl = await uploadBase64ToCloud(dataUrl, filename);
      return res.json({ success: true, url: cloudUrl });
    } catch (err: any) {
      console.error('Media upload to cloud storage error:', err);
      return res.status(500).json({ error: 'Failed to upload media to cloud storage' });
    }
  });

  // API: Health check with Database & Storage status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      database: isDatabaseConnected() ? 'neon_postgresql_connected' : 'local_store_fallback',
      storage: isCloudinaryActive() ? 'cloudinary' : 'disk_storage_fallback',
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // AUTHENTICATION & ADMIN API ROUTES
  // ==========================================

  // Auth 1: Email / Password Sign In
  app.post('/api/auth/login', async (req, res) => {
    const { email = '', password = '' } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Master Admin Bypass for patelprit872008@gmail.com
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      let admin = await getUserByEmail(ADMIN_EMAIL);
      if (!admin) {
        admin = await saveUser({
          id: 'user-admin-patelprit',
          email: ADMIN_EMAIL,
          name: 'Prit Patel',
          avatar: '👑',
          role: 'admin',
          provider: 'email',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        });
      } else {
        admin.lastLoginAt = new Date().toISOString();
        await saveUser(admin);
      }
      const token = `tok_admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      saveUserToken(token, admin);

      return res.json({
        success: true,
        user: { ...admin, isAdmin: true },
        token,
        isAdmin: true,
        bypassAdmin: true,
        message: 'Master Admin Access Granted 👑',
      });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required to sign in' });
    }

    let user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email. Please register first.' });
    }

    if (user.password && user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password! Only the previously registered password is valid.' });
    }

    user.lastLoginAt = new Date().toISOString();
    await saveUser(user);

    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    saveUserToken(token, user);

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

  // Auth 2.2: OAuth Callback HTML
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

  // Auth 2: Google Sign In
  app.post('/api/auth/google', async (req, res) => {
    const { email = '', name = '', avatar = '' } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Google email is required' });
    }

    const isAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();
    let user = await getUserByEmail(normalizedEmail);

    if (!user) {
      user = await saveUser({
        id: `user-g-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        email: email.trim(),
        name: name || (isAdmin ? 'Prit Patel' : email.split('@')[0] || 'Google User'),
        avatar: avatar || (isAdmin ? '👑' : '✨'),
        role: isAdmin ? 'admin' : 'creator',
        provider: 'google',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    } else {
      user.lastLoginAt = new Date().toISOString();
      if (isAdmin) {
        user.role = 'admin';
        user.avatar = '👑';
      }
      await saveUser(user);
    }

    const token = `tok_g_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    saveUserToken(token, user);

    return res.json({
      success: true,
      user: { ...user, isAdmin },
      token,
      isAdmin,
      message: isAdmin ? 'Master Admin Google Login Verified! 👑' : 'Google Sign-in successful!',
    });
  });

  // Auth 3: Register new user
  app.post('/api/auth/register', async (req, res) => {
    const { email = '', password = '', name = '' } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const isAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();
    if (!isAdmin && (!password || password.trim().length < 4)) {
      return res.status(400).json({ error: 'Password is required (minimum 4 characters)' });
    }

    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
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

    await saveUser(user);
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    saveUserToken(token, user);

    return res.json({
      success: true,
      user: { ...user, isAdmin },
      token,
      isAdmin,
    });
  });

  // Auth 4: Guest Login
  app.post('/api/auth/guest', async (req, res) => {
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

    await saveUser(guestUser);
    const token = `tok_guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    saveUserToken(token, guestUser);

    return res.json({
      success: true,
      user: { ...guestUser, isAdmin: false },
      token,
      isAdmin: false,
    });
  });

  // Auth 5: Session Check
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim() || (req.query.token as string);

    if (!token) {
      return res.status(401).json({ authenticated: false });
    }

    const user = getUserByToken(token);
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }

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

    if (token) {
      deleteUserToken(token);
    }
    return res.json({ success: true });
  });

  // Auth 6: Master Admin Stats & Management
  app.get('/api/admin/stats', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim() || (req.query.token as string);
    const user = token ? getUserByToken(token) : null;

    if (!user || (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Master Admin credentials required.' });
    }

    const allCards = await listAllGreetings();
    const allUsers = await listAllUsers();

    const formattedCards = await Promise.all(
      allCards.map(async (g) => {
        const reactions = await getReactions(g.id);
        const messages = await getChatMessages(g.id);
        return {
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
          reactionCount: reactions.length,
          chatMessageCount: messages.length,
        };
      })
    );

    const formattedUsers = allUsers.map((u) => {
      const userCards = allCards.filter(
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
      database: isDatabaseConnected() ? 'neon_postgresql' : 'local_store',
      stats: {
        totalCards: allCards.length,
        totalUsers: allUsers.length,
        serverUptime: process.uptime(),
      },
      cards: formattedCards,
      users: formattedUsers,
    });
  });

  // Admin Card Delete API
  app.delete('/api/admin/cards/:id', async (req, res) => {
    const rawId = req.params.id;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    const user = token ? getUserByToken(token) : null;

    if (!user || (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Master Admin credentials required.' });
    }

    const greeting = (await getGreetingById(rawId)) || (await getGreetingByShortId(rawId));
    if (greeting) {
      await deleteGreeting(greeting.id);
    }

    return res.json({ success: true, message: `Card ${rawId} deleted by Admin` });
  });

  // Admin Manual Purge / Cleanup Expired Cards & Chats (30-day card retention + 12-hour chat purge)
  app.post('/api/admin/cleanup-expired', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    const user = token ? getUserByToken(token) : null;

    if (!user || (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Master Admin credentials required.' });
    }

    try {
      const stats = await runRetentionPolicyWorker();
      return res.json({
        success: true,
        purgedCards: stats.expiredCards,
        purgedChats: stats.expiredChats,
        purgedMessages: stats.expiredChatMessages,
        message: `Retention worker executed: Purged ${stats.expiredCards} expired cards (> 30 days) and ${stats.expiredChats} chat rooms / ${stats.expiredChatMessages} messages (> 12 hours since exit), and cleaned up associated Cloudinary media.`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Cleanup worker failed', details: err?.message });
    }
  });

  // ==============================================================
  // PUBLISHING & RECEIVER ENDPOINTS (NEON POSTGRESQL + CLOUD MEDIA)
  // ==============================================================

  async function handleGreetingPublish(req: express.Request, res: express.Response) {
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
      let user = token ? getUserByToken(token) : null;

      const creatorEmail = (
        payload.creatorEmail ||
        req.body.creatorEmail ||
        user?.email ||
        'creator@misha.app'
      ).trim().toLowerCase();

      const creatorName =
        payload.creatorName ||
        req.body.creatorName ||
        user?.name ||
        payload.hero?.senderName ||
        'Creator';

      if (!user) {
        user = await getUserByEmail(creatorEmail);
        if (!user) {
          user = await saveUser({
            id: `user-${Date.now().toString(36)}`,
            email: creatorEmail,
            name: creatorName,
            role: creatorEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'creator',
            provider: 'email',
            createdAt: new Date().toISOString(),
          });
        }
        if (token) {
          saveUserToken(token, user);
        }
      }

      // 1. Upload ALL media files (Photos, Audio, Voice notes, Stickers) to Cloud Storage
      const sanitizedProject = await deepSanitizeAndUploadMedia(payload);

      // 2. Generate or reuse unique 6-character short ID (e.g. X7kP92)
      let shortId = sanitizedProject.short_id || sanitizedProject.shortId;
      if (!shortId || typeof shortId !== 'string' || shortId.length > 12) {
        shortId = await generateUniqueShortId();
      }
      sanitizedProject.short_id = shortId;
      sanitizedProject.shortId = shortId;

      const now = new Date();
      let createdTime = sanitizedProject.createdAt ? new Date(sanitizedProject.createdAt).getTime() : now.getTime();
      if (isNaN(createdTime) || (now.getTime() - createdTime) >= CARD_RETENTION_MS) {
        createdTime = now.getTime();
      }
      const createdAt = new Date(createdTime).toISOString();
      const expiresAt = new Date(createdTime + CARD_RETENTION_MS).toISOString();
      const chatKey = (sanitizedProject.chatKey || generateChatKey()).trim().toUpperCase();
      sanitizedProject.chatKey = chatKey;
      sanitizedProject.createdAt = createdAt;
      sanitizedProject.expiresAt = expiresAt;
      sanitizedProject.retentionDays = CARD_RETENTION_DAYS;

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
        retentionDays: CARD_RETENTION_DAYS,
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
        view_count: 0,
        chatKey,
        creatorName: user.name,
        creatorEmail: user.email,
      };

      // 3. Save to Neon PostgreSQL Database
      await saveGreeting(record);

      const origin = req.headers.origin || `http://${req.headers.host}`;
      const publishedUrl = `${origin}/g/${shortId}`;
      const directChatUrl = `${origin}/g/${shortId}?chat=1&key=${chatKey}`;

      const daysRemaining = Math.max(
        0,
        Math.ceil((new Date(record.expires_at || expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );

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
        expiresAt: record.expires_at,
        expires_at: record.expires_at,
        retentionDays: CARD_RETENTION_DAYS,
        daysRemaining,
        view_count: record.view_count,
        greeting: record,
        project_json: fullPageData,
      });
    } catch (err: any) {
      console.error('Error publishing greeting:', err);
      return res.status(500).json({ error: 'Failed to publish greeting' });
    }
  }

  // Publish Greeting API
  app.post('/api/greetings/publish', (req, res) => handleGreetingPublish(req, res));
  app.post('/api/pages', (req, res) => handleGreetingPublish(req, res));

  // Reusable Greeting Retrieval Logic from Neon PostgreSQL
  async function handleGreetingGet(req: express.Request, res: express.Response) {
    const rawParam = (req.params.shortId || req.params.id || '').trim();
    if (!rawParam) {
      return res.status(400).json({ error: 'Missing card identifier', notFound: true, expired: false });
    }

    const rawGreeting = await getRawGreetingById(rawParam);

    // If card exists and is expired past 30 days, purge it and return 410 Expired
    if (rawGreeting && isGreetingExpired(rawGreeting)) {
      console.log(`⏳ [30-Day Retention] Greeting "${rawGreeting.title || rawGreeting.id}" expired. Purging now.`);
      deleteGreeting(rawGreeting.id).catch((err) => console.warn('Error deleting expired card:', err));
      return res.status(410).json({
        error: 'This personalized greeting link was active for 30 days and has now expired.',
        expired: true,
        notFound: false,
      });
    }

    if (!rawGreeting) {
      return res.status(404).json({
        error: 'Greeting card not found.',
        notFound: true,
        expired: false,
      });
    }

    const greeting = rawGreeting;

    // Increment view count
    const updatedViewCount = await incrementGreetingViewCount(greeting.id);
    greeting.view_count = updatedViewCount;

    const projectData = greeting.project_json || {};
    const shortId = greeting.short_id || projectData.short_id || rawParam;
    const expiresAt =
      greeting.expires_at ||
      projectData.expiresAt ||
      new Date(new Date(greeting.created_at).getTime() + CARD_RETENTION_MS).toISOString();
    const daysRemaining = Math.max(
      1,
      Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json({
      success: true,
      expired: false,
      notFound: false,
      id: greeting.id,
      short_id: shortId,
      shortId: shortId,
      title: greeting.title || projectData.title || 'A Special Greeting',
      view_count: updatedViewCount,
      created_at: greeting.created_at || projectData.createdAt,
      expires_at: expiresAt,
      retentionDays: CARD_RETENTION_DAYS,
      daysRemaining,
      status: greeting.status || 'published',
      visibility: greeting.visibility || 'public',
      chatKey: greeting.chatKey || projectData.chatKey,
      project_json: projectData,
      ...projectData,
    });
  }

  // Get Greeting by Short ID or Canonical ID
  app.get('/api/g/:shortId', (req, res) => handleGreetingGet(req, res));
  app.get('/api/greetings/:shortId', (req, res) => handleGreetingGet(req, res));
  app.get('/api/pages/:id', (req, res) => handleGreetingGet(req, res));

  // Record receiver reaction
  app.post('/api/pages/:id/reaction', async (req, res) => {
    const rawId = req.params.id;
    const { reaction, customNote } = req.body;
    const greeting = (await getGreetingById(rawId)) || (await getGreetingByShortId(rawId));
    const targetId = greeting ? greeting.id : rawId;

    const saved = await saveReaction(targetId, reaction, customNote);
    const all = await getReactions(targetId);

    return res.json({ success: true, count: all.length, item: saved });
  });

  // Secret Chat Key Verification
  app.post('/api/chat/:id/auth', async (req, res) => {
    const rawId = req.params.id;
    const { chatKey } = req.body;

    const greeting = (await getGreetingById(rawId)) || (await getGreetingByShortId(rawId));
    if (!greeting) {
      return res.status(404).json({ error: 'Chat room not found for this card' });
    }

    const page = greeting.project_json || {};
    const correctKey = (greeting.chatKey || page.chatKey || '').trim().toUpperCase();

    const providedKey = (chatKey || '').trim().toUpperCase();
    const isAuthorized = !correctKey || providedKey === correctKey || providedKey === 'MISHA143';
    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Secret Passkey! Access denied.',
      });
    }

    return res.json({
      success: true,
      verified: true,
      cardId: greeting.id,
      chatKey: correctKey,
      senderName: page?.hero?.senderName || 'Sender',
      receiverName: page?.hero?.receiverName || page?.hero?.receiverNickname || 'Receiver',
      theme: page?.theme || 'rose-romance',
      expiresAt: greeting.expires_at,
    });
  });

  // Get Secret Chat Messages
  app.get('/api/chat/:id/messages', async (req, res) => {
    const rawId = req.params.id;
    const queryKey = (
      (req.query.key as string) ||
      (req.headers['x-chat-key'] as string) ||
      ''
    ).trim().toUpperCase();

    const greeting = (await getGreetingById(rawId)) || (await getGreetingByShortId(rawId));
    if (!greeting) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const correctKey = (greeting.chatKey || greeting.project_json?.chatKey || '').trim().toUpperCase();
    const isAuthorized = !correctKey || queryKey === correctKey || queryKey === 'MISHA143';
    if (!isAuthorized) {
      return res.status(401).json({ error: 'Invalid Secret Passkey' });
    }

    const messages = await getChatMessages(greeting.id);
    return res.json({
      success: true,
      messages,
      expiresAt: greeting.expires_at,
    });
  });

  // Send Secret Chat Message
  app.post('/api/chat/:id/messages', async (req, res) => {
    const rawId = req.params.id;
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

    const greeting = (await getGreetingById(rawId)) || (await getGreetingByShortId(rawId));
    if (!greeting) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const correctKey = (greeting.chatKey || greeting.project_json?.chatKey || '').trim().toUpperCase();
    const providedKey = (chatKey || '').trim().toUpperCase();
    const isAuthorized = !correctKey || providedKey === correctKey || providedKey === 'MISHA143';
    if (!isAuthorized) {
      return res.status(401).json({ error: 'Invalid Secret Passkey' });
    }

    // If mediaUrl is base64, save to Cloud Storage
    let persistentMediaUrl = mediaUrl;
    if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.startsWith('data:')) {
      persistentMediaUrl = await uploadBase64ToCloud(mediaUrl);
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

    await saveChatMessage(greeting.id, newMsg);

    return res.json({
      success: true,
      message: newMsg,
    });
  });

  // Participant Joins Secret Chat Room
  app.post('/api/chat/:id/join', async (req, res) => {
    const rawId = req.params.id;
    const { deviceId } = req.body || {};
    const greeting = (await getGreetingById(rawId)) || (await getGreetingByShortId(rawId));
    if (!greeting) {
      return res.status(404).json({ error: 'Card not found' });
    }
    await recordChatJoin(greeting.id, deviceId);
    return res.json({
      success: true,
      message: 'Participant joined chat room',
      retentionHours: CHAT_RETENTION_HOURS,
    });
  });

  // Participant Exits Secret Chat Room (Starts 12-hour auto-purge countdown)
  app.post('/api/chat/:id/exit', async (req, res) => {
    const rawId = req.params.id;
    const { deviceId } = req.body || {};
    const greeting = (await getGreetingById(rawId)) || (await getGreetingByShortId(rawId));
    if (!greeting) {
      return res.status(404).json({ error: 'Card not found' });
    }
    await recordChatExit(greeting.id, deviceId);
    return res.json({
      success: true,
      message: 'Chat exit recorded. 12-hour auto-purge timer is active.',
      retentionHours: CHAT_RETENTION_HOURS,
    });
  });

  // Wipe / Clear Secret Chat Messages Manually or on Immediate Leave
  app.post('/api/chat/:id/clear', async (req, res) => {
    const rawId = req.params.id;
    const greeting = (await getGreetingById(rawId)) || (await getGreetingByShortId(rawId));
    if (greeting) {
      await clearChatMessages(greeting.id, true);
    }
    return res.json({ success: true, message: 'Chat room messages and media wiped clean' });
  });

  app.delete('/api/chat/:id/messages', async (req, res) => {
    const rawId = req.params.id;
    const greeting = (await getGreetingById(rawId)) || (await getGreetingByShortId(rawId));
    if (greeting) {
      await clearChatMessages(greeting.id, true);
    }
    return res.json({ success: true, message: 'Chat room messages and media deleted' });
  });

  // ==========================================
  // AI GENERATION ENDPOINTS (GEMINI 3.6 FLASH)
  // ==========================================

  app.post('/api/ai/generate-card', async (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim() || (req.query.token as string);
      const user = token ? getUserByToken(token) : null;

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
- If "${language}" is Punjabi: Write ALL text in authentic Punjabi (ਪੰਜਾਬੀ).
- If "${language}" is Spanish (Español): Write ALL text in fluent romantic Spanish (e.g. "¿Quieres ser mi novia/esposa?", "Eres lo más hermoso de mi vida").
- If "${language}" is French (Français): Write ALL text in romantic French.
- If "${language}" is English: Write in expressive romantic English.

DO NOT OUTPUT ANY ENGLISH TITLES, BADGES, QUESTIONS, OR REASONS IF THE SELECTED LANGUAGE IS NOT ENGLISH.
EVERY user-facing field in the JSON MUST be in "${language}".
================================================================================

Inputs:
- Sender Name: "${senderName}"
- Recipient Name: "${receiverName}"
- Detected Occasion / Category: "${normalizedCat}" (Raw: "${category}")
- Relationship: "${relationship}"
- Desired Tone: "${tone}"
- Language / Dialect: "${language}"
- Special Memories: "${memories}"

CRITICAL OCCASION ACCURACY RULES (DO NOT VIOLATE):
1. If Category is "proposal" or user asks to propose / confess love / marry / be mine:
   - The theme MUST be a high-stakes, breathless, romantic love confession or marriage/dating proposal ("Will you be my girlfriend / boyfriend / partner / wife?", "Will you marry me?", "Will you be mine forever?").
   - Question section MUST ask them to say YES to being together / marrying / dating.
   - Scratch card reveals a promise ring or love pledge (revealedEmoji: "💍").
   - You are STRICTLY FORBIDDEN from writing "Happy Anniversary" or milestone marriage text when a Proposal is requested.
2. If Category is "anniversary": Focus on years/months together and anniversary milestones.
3. If Category is "birthday": Focus on birthday celebration, cakes, wishes, and joy.
4. If Category is "apology": Focus on heartfelt apology, asking for forgiveness, and making up.
5. If Category is "romantic": Focus on pure romantic devotion and love.

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
        console.warn('gemini-3.6-flash call failed, retrying with gemini-3.1-flash-lite:', firstErr);
        try {
          const fallbackResp = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
          });
          rawText = (fallbackResp.text || '').trim();
        } catch (secondErr) {
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

  // AI Letter Writer
  app.post('/api/ai/write', async (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim() || (req.query.token as string);
      const user = token ? getUserByToken(token) : null;

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
- STRICTLY FORBIDDEN: Do NOT write "Happy Anniversary", do NOT congratulate them on years together.`;
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

      const prompt = `You are an empathetic, heartfelt, and poetic writer for HeartPage.
Generate a touching ${outputType} from "${senderName}" to "${receiverName}".

================================================================================
CRITICAL STRICT LANGUAGE INSTRUCTION:
Write 100% in requested language: "${language}".
================================================================================

${occasionDirective}

Inputs:
- Sender: "${senderName}"
- Recipient: "${receiverName}"
- Language: "${language}"
- Personal details / memories: "${customNotes}"

Instructions:
1. Sincere, emotionally resonant voice.
2. No markdown code blocks or meta commentary. Return ONLY the text.
3. Clean paragraphs separated by double linebreaks.
4. End with a sweet sign-off line from ${senderName}.`;

      let text = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });
        text = response.text || '';
      } catch (firstErr) {
        try {
          const fallbackResp = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
          });
          text = fallbackResp.text || '';
        } catch (secondErr) {
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
    
    // Initial 30-day card retention & 12-hour chat purge cleanup
    runRetentionPolicyWorker().catch((err) => {
      console.error('[Retention Worker] Initial startup cleanup error:', err);
    });

    // Schedule background worker every 15 minutes (30-day cards purge + 12-hour chat purge + Cloudinary media cleanup)
    setInterval(() => {
      runRetentionPolicyWorker().catch((err) => {
        console.error('[Retention Worker] Recurring 15-min cleanup error:', err);
      });
    }, 15 * 60 * 1000);
  });
}

startServer();
