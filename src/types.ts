/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RelationshipCategory =
  | 'romantic'
  | 'anniversary'
  | 'friendship'
  | 'apology'
  | 'birthday'
  | 'family'
  | 'long_distance'
  | 'support'
  | 'custom';

export type ThemeId = string;

export type ParticleType =
  | 'hearts'
  | 'sparkles'
  | 'cherry-blossoms'
  | 'confetti'
  | 'butterflies'
  | 'snow'
  | 'none';

export type MusicTrackId =
  | 'romantic-piano'
  | 'lofi-chill'
  | 'acoustic-guitar'
  | 'music-box'
  | 'celebration-ukulele'
  | 'sunset-violin'
  | 'bollywood-romance'
  | 'custom-url'
  | 'none';

export interface EnvelopeConfig {
  enabled: boolean;
  style: 'wax-seal-envelope' | 'vintage-letter' | 'gift-box' | 'instant-fade';
  frontLabel: string;
  sealEmoji: string;
  requiresPasscode: boolean;
  passcode: string;
  passcodeHint: string;
  confettiBurst?: boolean;
  celebrationStyle?: 'hearts-fireworks' | 'romantic-hearts' | 'gold-sparkles' | 'rainbow-confetti';
}

export interface HeroConfig {
  senderName: string;
  receiverName: string;
  receiverNickname: string;
  badgeText: string;
  mainTitle: string;
  subtitle: string;
  heroEmoji: string;
}

export interface CounterConfig {
  enabled: boolean;
  mode: 'since' | 'until';
  date: string; // ISO date string (YYYY-MM-DD)
  title: string;
  specialNote: string;
  showDays: boolean;
  showHours: boolean;
  showMinutes: boolean;
  showSeconds: boolean;
}

export interface QuestionConfig {
  enabled: boolean;
  question: string;
  yesButtonText: string;
  noButtonText: string;
  evasiveNo: boolean;
  yesSuccessTitle: string;
  yesSuccessMessage: string;
  yesSuccessImage?: string;
  showCertificate: boolean;
}

export interface CakeConfig {
  enabled: boolean;
  cakeType: 'chocolate' | 'strawberry' | 'rainbow' | 'cupcake' | string;
  cakeThemeId?: string;
  candlesCount: number;
  wishPrompt: string;
  wishedMessage: string;
}

export interface PhotoItem {
  id: string;
  url: string;
  caption: string;
  dateLocation?: string;
  flipNote?: string;
  rotationDeg?: number;
}

export interface PhotosConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  photos: PhotoItem[];
  frameTheme?:
    | 'vintage-polaroid'
    | 'rose-velvet'
    | 'midnight-starlight'
    | 'lavender-dream'
    | 'obsidian-gold'
    | 'emerald-forest'
    | 'sunset-serenade'
    | 'bordeaux-wine'
    | 'neon-cyber-glow'
    | 'frozen-diamond';
}

export interface ScratchCardConfig {
  enabled: boolean;
  title: string;
  instructions: string;
  secretMessage: string;
  secretCategory: string;
  cardStyle: 'silver' | 'gold' | 'rose-gold' | 'holographic';
}

export interface ReasonItem {
  id: string;
  title: string;
  description: string;
  iconEmoji: string;
}

export interface ReasonsConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  reasons: ReasonItem[];
}

export interface LetterConfig {
  enabled: boolean;
  title: string;
  paperStyle:
    | 'vintage-parchment'
    | 'rose-petals'
    | 'clean-linen'
    | 'midnight-letter'
    | 'dark-velvet'
    | 'golden-glow'
    | 'lavender-blush'
    | 'theme-match';
  fontFamily?: 'font-handwriting' | 'font-serif-display' | 'font-sans' | 'font-vintage' | 'font-sacramento';
  textColor?: string;
  customPaperBg?: string;
  customBorderColor?: string;
  waxSealColor?: string;
  waxSealEmoji?: string;
  paragraphs: string[];
  signOff: string;
  authorSignature: string;
  typewriterEffect?: boolean;
  typewriterSpeed?: 'slow' | 'normal' | 'fast';
}

export interface ReceiverReaction {
  id: string;
  reaction: string;
  customNote?: string;
  timestamp: string;
}

export interface ReceiverResponseConfig {
  enabled: boolean;
  promptText: string;
  presetReactions: string[];
  allowCustomReply: boolean;
  reactionsReceived: ReceiverReaction[];
}

export interface ChatMessage {
  id: string;
  sender: 'creator' | 'receiver';
  senderName: string;
  deviceId?: string;
  text: string;
  timestamp: string;
  mediaUrl?: string;
  reaction?: string;
  isVoiceNote?: boolean;
  duration?: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface HeartPageData {
  id: string;
  title: string;
  category: RelationshipCategory;
  theme: ThemeId;
  particleEffect: ParticleType;
  musicTrack: MusicTrackId;
  customMusicUrl?: string;
  customMusicName?: string;
  chatKey?: string;
  envelope: EnvelopeConfig;
  hero: HeroConfig;
  counter: CounterConfig;
  question: QuestionConfig;
  cake: CakeConfig;
  photos: PhotosConfig;
  scratchCard: ScratchCardConfig;
  reasons: ReasonsConfig;
  letter: LetterConfig;
  receiverResponse: ReceiverResponseConfig;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'creator' | 'user' | 'guest';
  provider: 'google' | 'email' | 'guest';
  createdAt: string;
  lastLoginAt?: string;
  cardsCount?: number;
  isAdmin?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  token: string | null;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  category?: string;
  categoryEmoji?: string;
  description: string;
  bgGradient: string;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
  previewColors?: [string, string, string];
}
