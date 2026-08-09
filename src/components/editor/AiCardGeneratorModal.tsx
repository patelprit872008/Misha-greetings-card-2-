/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  X,
  Wand2,
  Heart,
  Calendar,
  Smile,
  Globe,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Gift,
  FileText,
  HelpCircle,
  Dice5,
} from 'lucide-react';
import { HeartPageData } from '../../types';
import { LanguagePicker } from './LanguagePicker';
import { useAuth } from '../../context/AuthContext';

interface AiCardGeneratorModalProps {
  currentData: HeartPageData;
  onApplyGeneratedCard: (updates: Partial<HeartPageData>) => void;
  onClose: () => void;
}

const OCCASIONS = [
  { id: 'proposal', label: '💍 Marriage / Grand Proposal (Will You Be Mine)' },
  { id: 'romantic', label: '🌹 Romantic Love & Valentine' },
  { id: 'anniversary', label: '🥂 Anniversary & Milestones' },
  { id: 'birthday', label: '🎂 Birthday Celebration' },
  { id: 'apology', label: '🥺 Apology & Make Up' },
  { id: 'long-distance', label: '✈️ Long-Distance Love' },
  { id: 'friendship', label: '🤝 Best Friends Forever' },
  { id: 'just-because', label: '☕ Thinking of You / Just Because' },
];

const RANDOM_PROMPTS = [
  {
    receiverName: 'Ananya',
    senderName: 'Rohit',
    category: 'proposal',
    tone: 'romantic',
    language: 'Hinglish',
    memories: 'Beach sunset walk, endless laughter, wanting to spend whole life together, promise ring',
  },
  {
    receiverName: 'Riya',
    senderName: 'Aryan',
    category: 'romantic',
    tone: 'romantic',
    language: 'Hinglish',
    memories: 'College library mein pehli mulaqat, sunset chai dates, always stealing my hoodies',
  },
  {
    receiverName: 'Jessica',
    senderName: 'Michael',
    category: 'anniversary',
    tone: 'romantic',
    language: 'English',
    memories: '3 years together, rainy day in Paris, making homemade pizza every Sunday',
  },
  {
    receiverName: 'Priya',
    senderName: 'Kabir',
    category: 'apology',
    tone: 'poetic',
    language: 'Hinglish',
    memories: 'I was grumpy during dinner, I miss your laugh and warm hugs',
  },
  {
    receiverName: 'Sam',
    senderName: 'Alex',
    category: 'birthday',
    tone: 'playful',
    language: 'English',
    memories: 'Legendary road trips, karaoke champion, late-night gaming sessions',
  },
];

export const AiCardGeneratorModal: React.FC<AiCardGeneratorModalProps> = ({
  currentData,
  onApplyGeneratedCard,
  onClose,
}) => {
  const { isAuthenticated, token, openAuthModal } = useAuth();
  const [receiverName, setReceiverName] = useState(
    currentData.hero.receiverName || ''
  );
  const [senderName, setSenderName] = useState(
    currentData.hero.senderName || ''
  );
  const [category, setCategory] = useState<string>(
    currentData.category || 'romantic'
  );
  const [tone, setTone] = useState<string>('romantic');
  const [language, setLanguage] = useState<string>('English');
  const [memories, setMemories] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<any | null>(null);
  const [applied, setApplied] = useState(false);

  const handleRandomize = () => {
    const random =
      RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setReceiverName(random.receiverName);
    setSenderName(random.senderName);
    setCategory(random.category);
    setTone(random.tone);
    setLanguage(random.language);
    setMemories(random.memories);
  };

  const handleGenerate = async () => {
    if (!isAuthenticated || !token) {
      openAuthModal('login');
      return;
    }

    setIsLoading(true);
    setGeneratedCard(null);

    try {
      const res = await fetch('/api/ai/generate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverName: receiverName.trim() || 'My Favorite Person',
          senderName: senderName.trim() || 'Yours Truly',
          category,
          tone,
          language,
          memories: memories.trim(),
        }),
      });

      if (res.status === 401) {
        openAuthModal('login');
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.card) {
          setGeneratedCard(data.card);
          return;
        }
      }
      throw new Error('Using fallback template generator');
    } catch (err) {
      console.warn('AI generator fallback applied:', err);
      const rName = receiverName.trim() || 'My Favorite Person';
      const sName = senderName.trim() || 'Yours Truly';
      const isProposal =
        category === 'proposal' ||
        memories.toLowerCase().includes('propos') ||
        memories.toLowerCase().includes('marry') ||
        memories.toLowerCase().includes('izhaar') ||
        memories.toLowerCase().includes('be mine');

      const langLower = (language || 'English').toLowerCase();
      const isHindi = langLower === 'hindi';
      const isHinglish = langLower === 'hinglish';
      const isGujarati = langLower === 'gujarati';
      const isGujlish = langLower === 'gujlish';
      const isSpanish = langLower === 'spanish' || langLower === 'español';

      let fallbackCard: any;

      if (isProposal) {
        if (isGujarati) {
          fallbackCard = {
            receiverName: rName,
            senderName: sName,
            recommendedTheme: 'rose-romance',
            recommendedParticles: 'hearts',
            hero: {
              greeting: `વહાલી ${rName}, મારા દિલની એક વાત છે... 💍`,
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
            letter: {
              title: `મારા દિલનો પ્રસ્તાવ`,
              body: `વહાલી ${rName},\n\nઘણા સમયથી આ વાત મારા દિલમાં હતી. તમારા સ્મિત અને સાથથી મારું જીવન ખૂબ જ સુંદર બની ગયું છે.\n\nહું વચન આપું છું કે સુખ-દુઃખમાં હંમેશા તમારો હાથ પકડી રાખીશ. શું તમે મારી સાથે આ સુંદર જીવનની શરૂઆત કરશો?`,
              signature: `${sName} 💍🌹`,
              date: new Date().toLocaleDateString('gu-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
              handwrittenFont: 'font-dancing',
            },
            reasons: [
              { id: 'r1', title: 'તમારું મીઠું સ્મિત', description: 'તમારું હાસ્ય મારા આખા દિવસનો થાક દૂર કરી દે છે.', icon: 'Sparkles' },
              { id: 'r2', title: 'તમારી હાજરીમાં શાંતિ', description: 'તમારી સાથે હોવું એટલે પોતાના ઘરે હોવાનો અહેસાસ.', icon: 'Heart' },
              { id: 'r3', title: 'આપણું સુંદર ભવિષ્ય', description: 'હું મારી જિંદગીની દરેક ક્ષણ તમારી સાથે માણવા માંગુ છું.', icon: 'Compass' },
            ],
          };
        } else if (isGujlish) {
          fallbackCard = {
            receiverName: rName,
            senderName: sName,
            recommendedTheme: 'rose-romance',
            recommendedParticles: 'hearts',
            hero: {
              greeting: `Mari Jaan ${rName}, Dil Ni Ek Vaat Che... 💍`,
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
            letter: {
              title: `Maro Dil No Proposal Letter`,
              body: `Dearest ${rName},\n\nKafli time thi aa vat mara dil ma hati. Tame mari life ma aavi ne badhu magical banavi didhu che.\n\nHu promise karu chu ke har ek mod par tamaro hath pakdine chalish. Will you be mine forever?`,
              signature: `${sName} 💍🌹`,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              handwrittenFont: 'font-dancing',
            },
            reasons: [
              { id: 'r1', title: 'Tamari Sweet Smile', description: 'Tamaru hasvu mari whole day ni energy che.', icon: 'Sparkles' },
              { id: 'r2', title: 'Tamari Sathe Sukoon', description: 'Tamari sathe vat karine badhi worry bhuli javay che.', icon: 'Heart' },
              { id: 'r3', title: 'Aapanu Bright Future', description: 'Mane mari aakhi life fakt tamari sathe j spend karvi che.', icon: 'Compass' },
            ],
          };
        } else if (isHindi) {
          fallbackCard = {
            receiverName: rName,
            senderName: sName,
            recommendedTheme: 'rose-romance',
            recommendedParticles: 'hearts',
            hero: {
              greeting: `मेरी जान ${rName}, दिल की एक बात कहनी है... 💍`,
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
            letter: {
              title: `मेरे दिल का इज़हार (प्रपोजल लेटर)`,
              body: `प्रिय ${rName},\n\nकाफी वक़्त से यह बात मेरे दिल में थी। जब से तुम मेरी ज़िंदगी में आई हो, मेरा हर दिन खूबसूरत बन गया है।\n\nतुम्हारा साथ मेरे लिए सबसे अनमोल तोहफ़ा है। क्या तुम मेरी बनोगी और मुझे हमेशा तुम्हारा ख्याल रखने का मौका दोगी?`,
              signature: `${sName} 💍🌹`,
              date: new Date().toLocaleDateString('hi-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
              handwrittenFont: 'font-dancing',
            },
            reasons: [
              { id: 'r1', title: 'तेरी प्यारी मुस्कान', description: 'जब तुम हँसती हो तो मेरी सारी परेशानियाँ दूर हो जाती हैं।', icon: 'Sparkles' },
              { id: 'r2', title: 'तेरे साथ सुकून', description: 'तुम्हारे पास होना ही मेरे दिल का सबसे बड़ा सुकून है।', icon: 'Heart' },
              { id: 'r3', title: 'हमारा आने वाला कल', description: 'मैं अपनी पूरी ज़िंदगी सिर्फ तुम्हारे साथ बिताना चाहता हूँ।', icon: 'Compass' },
            ],
          };
        } else if (isHinglish) {
          fallbackCard = {
            receiverName: rName,
            senderName: sName,
            recommendedTheme: 'rose-romance',
            recommendedParticles: 'hearts',
            hero: {
              greeting: `Meri Jaan ${rName}, Dil Ki Ek Baat Hai... 💍`,
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
            letter: {
              title: `Mera Dil Ka Izhaar (Proposal Letter)`,
              body: `Dearest ${rName},\n\nKafi waqt se yeh baat mere dil mein thi, aur aaj main ise chupa nahi sakta. Jab se tum meri zindagi mein aayi ho, mera har ek din roshan aur khoobsurat ban gaya hai.\n\nTumhari muskaan, tumhari baatein, aur tumhara sath mere liye sabse anmol cheez hai. Kya tum meri banogi aur hamesha ke liye mera haath thamogi?`,
              signature: `${sName} 💍🌹`,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              handwrittenFont: 'font-dancing',
            },
            reasons: [
              { id: 'r1', title: 'Pehli Nazar Ka Pyar', description: 'Pehli baar jab tumhe dekha tha, usi pal samajh gaya tha ki tum bohot khas ho.', icon: 'Sparkles' },
              { id: 'r2', title: 'Teri Pyari Muskaan', description: 'Jab tu hasti hai, to meri saari thakan door ho jati hai.', icon: 'Heart' },
              { id: 'r3', title: 'Tera Saath Sukoon Deta Hai', description: 'Tere paas hona hi mere dil ka sabse bada sukoon hai.', icon: 'Coffee' },
            ],
          };
        } else {
          fallbackCard = {
            receiverName: rName,
            senderName: sName,
            recommendedTheme: 'rose-romance',
            recommendedParticles: 'hearts',
            hero: {
              greeting: `Dearest ${rName}, A Question from My Heart... 💍`,
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
            letter: {
              title: `A Forever Proposal from My Soul`,
              body: `Dearest ${rName},\n\nI have carried these words in my heart for so long, and today I want to say them with absolute certainty.\n\nYou have brought an indescribable joy, beauty, and warmth into my world. Every dream I have of the future now has you standing right beside me.\n\nI promise to love you fiercely, stand by you through every storm, and celebrate every joy with you. Will you hold my hand and embark on this beautiful forever with me?`,
              signature: `${sName} 💍🌹`,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              handwrittenFont: 'font-dancing',
            },
            reasons: [
              { id: 'r1', title: 'The Moment I Fell for You', description: 'The whole world faded and everything suddenly made sense.', icon: 'Sparkles' },
              { id: 'r2', title: 'Your Irresistible Smile', description: 'Your laugh is my absolute favorite sound in the world.', icon: 'Heart' },
              { id: 'r3', title: 'Peace in Your Presence', description: 'Being with you feels like finally coming home.', icon: 'Coffee' },
              { id: 'r4', title: 'Our Future Together', description: 'I want to experience every adventure with you.', icon: 'Compass' },
              { id: 'r5', title: 'You Are My Everything', description: 'In a world full of billions, my heart will always choose only you.', icon: 'Flame' },
            ],
          };
        }
      } else {
        fallbackCard = {
          receiverName: rName,
          senderName: sName,
          hero: {
            title: isGujarati ? `વહાલી ${rName} માટે` : isHindi ? `मेरी प्रिय ${rName} के लिए` : `For My Dearest ${rName}`,
            subtitle: isGujarati ? `તમારા માટે ખાસ પ્રેમપૂર્વક બનાવેલું.` : isHindi ? `तुम्हारे लिए खास प्यार से बनाया गया।` : `A heartfelt tribute curated just for you with infinite love.`,
            badgeText: isGujarati ? `અનહદ પ્રેમ 💖` : `✨ Special Love Edition`,
          },
          letter: {
            title: isGujarati ? `મારા દિલનો પત્ર` : isHindi ? `मेरे दिल का पैगाम` : `A Letter From My Heart`,
            body: isGujarati ? `વહાલી ${rName},\n\nતમારી સાથે વિતાવેલી દરેક પળ મારા જીવનની સૌથી સુંદર સ્મૃતિ છે. તમારા પ્રેમ અને સાથ માટે તમારો ખૂબ ખૂબ આભાર.\n\nહંમેશા તમારો,\n${sName}` : isHindi ? `प्रिय ${rName},\n\nतुम्हारे आने से मेरी ज़िंदगी में बहुत सारी खुशियाँ आई हैं। तुम्हारा मुस्कुराना और मुझसे बातें करना मेरे दिल को सुकून देता है।\n\nहमेशा तुम्हारा,\n${sName}` : `Dearest ${rName},\n\nEvery day with you feels like a gift. Thank you for your warmth, your laughter, and the endless joy you bring into my life.\n\nAlways and forever,\n${sName}`,
          },
          reasons: [
            { id: 'r1', title: isGujarati ? `તમારું મીઠું સ્મિત` : `Your contagious smile`, description: isGujarati ? `મારો આખો દિવસ સુંદર બનાવી દે છે` : `Brightens up my whole day`, icon: 'Heart' },
            { id: 'r2', title: isGujarati ? `તમારો દયાળુ સ્વભાવ` : `The kindness and patience you show`, description: isGujarati ? `દુનિયામાં સૌથી સુંદર` : `Truly one of a kind`, icon: 'Sparkles' },
            { id: 'r3', title: isGujarati ? `દરેક ક્ષણ યાદગાર બનાવવી` : `Making every moment special`, description: isGujarati ? `મારા જીવનનો શ્રેષ્ઠ ભાગ` : `Being my favorite human in the world`, icon: 'Flame' },
          ],
          audio: {
            title: 'Until I Found You',
            artist: 'Stephen Sanchez',
          },
        };
      }
      setGeneratedCard(fallbackCard);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedCard) return;

    const rName =
      generatedCard.receiverName || receiverName.trim() || 'My Favorite Person';
    const sName =
      generatedCard.senderName || senderName.trim() || 'Yours Truly';

    const updates: Partial<HeartPageData> = {
      category: (category as any) || 'romantic',
    };

    if (generatedCard.hero) {
      updates.hero = {
        ...currentData.hero,
        receiverName: rName,
        senderName: sName,
        title: generatedCard.hero.title || currentData.hero.title,
        subtitle: generatedCard.hero.subtitle || currentData.hero.subtitle,
        badgeText: generatedCard.hero.badgeText || currentData.hero.badgeText,
      };
    } else {
      updates.hero = {
        ...currentData.hero,
        receiverName: rName,
        senderName: sName,
      };
    }

    if (generatedCard.questionSection) {
      updates.question = {
        ...currentData.question,
        enabled: true,
        question:
          generatedCard.questionSection.question ||
          currentData.question.question,
        subtitle:
          generatedCard.questionSection.subtext ||
          currentData.question.subtitle,
        yesButtonText:
          generatedCard.questionSection.yesButtonText ||
          currentData.question.yesButtonText,
        noButtonText:
          generatedCard.questionSection.noButtonText ||
          currentData.question.noButtonText,
        yesSuccessMessage:
          generatedCard.questionSection.celebrationMessage ||
          currentData.question.yesSuccessMessage,
      };
    }

    if (generatedCard.scratchCard) {
      updates.scratchCard = {
        ...currentData.scratchCard,
        enabled: true,
        giftTitle:
          generatedCard.scratchCard.giftTitle ||
          currentData.scratchCard.giftTitle,
        secretMessage:
          generatedCard.scratchCard.secretMessage ||
          currentData.scratchCard.secretMessage,
      };
    }

    if (
      generatedCard.reasons &&
      Array.isArray(generatedCard.reasons) &&
      generatedCard.reasons.length > 0
    ) {
      updates.reasons = {
        ...currentData.reasons,
        enabled: true,
        reasons: generatedCard.reasons.map((r: any, idx: number) => ({
          id: r.id || `r-${idx}`,
          title: r.title || 'Special Reason',
          description: r.description || '',
          iconEmoji:
            r.iconEmoji ||
            (r.icon === 'Music'
              ? '🎵'
              : r.icon === 'Coffee'
              ? '☕'
              : r.icon === 'Flame'
              ? '🔥'
              : '💖'),
        })),
      };
    }

    if (generatedCard.letter) {
      const paragraphs = Array.isArray(generatedCard.letter.paragraphs)
        ? generatedCard.letter.paragraphs
        : typeof generatedCard.letter.body === 'string'
        ? generatedCard.letter.body.split('\n\n').filter(Boolean)
        : currentData.letter.paragraphs;

      updates.letter = {
        ...currentData.letter,
        enabled: true,
        title: generatedCard.letter.title || currentData.letter.title,
        paragraphs,
        signOff: generatedCard.letter.signOff || 'With all my love,',
        authorSignature: sName,
      };
    }

    if (generatedCard.recommendedTheme) {
      updates.theme = generatedCard.recommendedTheme as any;
    }

    if (generatedCard.recommendedParticles) {
      updates.particleEffect = generatedCard.recommendedParticles as any;
    }

    onApplyGeneratedCard(updates);
    setApplied(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div
      id="ai-card-generator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden text-stone-100 my-auto"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-stone-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI 1-Click Dream Card Generator
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  Gemini 3.6 Flash
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Craft a deeply personalized card with custom questions, reasons, scratch gift & letter
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRandomize}
              type="button"
              className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 border border-stone-700 transition-colors"
              title="Fill with creative ideas"
            >
              <Dice5 className="w-3.5 h-3.5 text-amber-400" />
              <span>Surprise Me</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {!generatedCard ? (
            /* Input Form */
            <div className="space-y-5">
              {/* Names row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-rose-300 mb-1.5">
                    For (Recipient Name / Nickname) *
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Riya, My Sweetheart, Jessica..."
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-800/80 border border-stone-700 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                    From (Your Name / Signature) *
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Aryan, Michael, Your Secret Admirer..."
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-800/80 border border-stone-700 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Occasion & Tone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                    Occasion / Purpose
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800/80 border border-stone-700 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    {OCCASIONS.map((occ) => (
                      <option key={occ.id} value={occ.id}>
                        {occ.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                    Tone & Vibe
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800/80 border border-stone-700 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="romantic">💖 Deeply Romantic & Soulful</option>
                    <option value="playful">😜 Playful, Cute & Teasing</option>
                    <option value="poetic">📜 Poetic, Elegant & Emotional</option>
                    <option value="heartfelt">✨ Heartfelt, Warm & Sincere</option>
                    <option value="humorous">😂 Wholesome & Funny</option>
                  </select>
                </div>
              </div>

              {/* Language Picker (55+ Languages) */}
              <LanguagePicker
                selectedLanguage={language}
                onSelectLanguage={setLanguage}
                label="Card Language & Regional Dialect"
              />

              {/* Special details & inside memories */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center justify-between">
                  <span>Memories, Inside Jokes or Special Habits (Optional)</span>
                  <span className="text-[10px] text-stone-500 font-normal">
                    AI will weave these naturally into the card
                  </span>
                </label>
                <textarea
                  value={memories}
                  onChange={(e) => setMemories(e.target.value)}
                  rows={3}
                  placeholder="e.g. First met at Starbucks, loves sunset chai, hates spiders, our trip to Goa, always stealing my fries..."
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-800/80 border border-stone-700 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
                />
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:via-pink-600 hover:to-purple-700 text-white font-bold text-sm shadow-xl shadow-rose-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gemini AI is crafting your dream card...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Complete Interactive Card with AI</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Generated Preview & Confirmation */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-white">
                      AI Generated Your Complete Card!
                    </div>
                    <div className="text-xs text-emerald-300/80">
                      Review the customized sections below and click Apply
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setGeneratedCard(null)}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 flex items-center gap-1.5 border border-stone-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
              </div>

              {/* Preview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Hero preview */}
                <div className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700/60 space-y-1.5">
                  <div className="font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <Sparkles className="w-3.5 h-3.5" /> Hero Section
                  </div>
                  <div className="text-base font-bold text-white">
                    {generatedCard.hero?.title}
                  </div>
                  <div className="text-stone-300">
                    {generatedCard.hero?.subtitle}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Badge: {generatedCard.hero?.badgeText}
                  </div>
                </div>

                {/* Question preview */}
                <div className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700/60 space-y-1.5">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <HelpCircle className="w-3.5 h-3.5" /> Interactive Question
                  </div>
                  <div className="text-sm font-bold text-white">
                    {generatedCard.questionSection?.question}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
                      Yes: {generatedCard.questionSection?.yesButtonText}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-stone-700 text-stone-300 text-[10px]">
                      No: {generatedCard.questionSection?.noButtonText}
                    </span>
                  </div>
                </div>

                {/* Scratch Gift preview */}
                <div className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700/60 space-y-1.5">
                  <div className="font-bold text-pink-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <Gift className="w-3.5 h-3.5" /> Scratch Gift Card
                  </div>
                  <div className="text-sm font-bold text-white">
                    {generatedCard.scratchCard?.giftTitle}
                  </div>
                  <div className="text-stone-300">
                    "{generatedCard.scratchCard?.secretMessage}"
                  </div>
                </div>

                {/* Reasons preview */}
                <div className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700/60 space-y-1.5">
                  <div className="font-bold text-purple-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <Heart className="w-3.5 h-3.5" /> Reasons Why I Love You (
                    {generatedCard.reasons?.length || 0})
                  </div>
                  <ul className="space-y-1 text-stone-300">
                    {generatedCard.reasons?.slice(0, 3).map((r: any, idx: number) => (
                      <li key={idx} className="truncate">
                        • <strong>{r.title}</strong>: {r.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Letter Preview */}
              <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700 space-y-2">
                <div className="font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <FileText className="w-3.5 h-3.5" /> Handwritten Letter Excerpt
                </div>
                <div className="text-xs text-stone-300 whitespace-pre-line line-clamp-4 italic">
                  {generatedCard.letter?.body}
                </div>
                <div className="text-right text-xs font-bold text-rose-300">
                  — {generatedCard.letter?.signature}
                </div>
              </div>

              {/* Apply Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGeneratedCard(null)}
                  className="w-1/3 py-3 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs border border-stone-700 transition-colors"
                >
                  Edit Prompt
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applied}
                  className="w-2/3 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {applied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Card Applied Successfully! 🎉</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Apply AI Card to My Page (1-Click)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
