/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LanguageOption {
  id: string;
  name: string;
  nativeName: string;
  category:
    | 'popular'
    | 'indian'
    | 'european'
    | 'asian'
    | 'middle-eastern-african';
  flag: string;
  description?: string;
  isPopular?: boolean;
}

export const LANGUAGE_CATEGORIES: {
  id: LanguageOption['category'] | 'all';
  label: string;
  emoji: string;
}[] = [
  { id: 'all', label: 'All Languages (55+)', emoji: '🌐' },
  { id: 'popular', label: 'Popular & Modern Blends', emoji: '✨' },
  { id: 'indian', label: 'Indian Regional', emoji: '🇮🇳' },
  { id: 'european', label: 'European & Western', emoji: '🏰' },
  { id: 'asian', label: 'East & Southeast Asian', emoji: '🌸' },
  { id: 'middle-eastern-african', label: 'Middle Eastern & African', emoji: '🌍' },
];

export const AI_LANGUAGES: LanguageOption[] = [
  // --- Popular & Modern Blends ---
  {
    id: 'English',
    name: 'English',
    nativeName: 'English',
    category: 'popular',
    flag: '🇺🇸',
    description: 'Universal & expressive',
    isPopular: true,
  },
  {
    id: 'Hinglish',
    name: 'Hinglish',
    nativeName: 'Hindi in English Script',
    category: 'popular',
    flag: '💖',
    description: 'Natural casual romance (e.g. "Meri jaan, I love you")',
    isPopular: true,
  },
  {
    id: 'Hindi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Devanagari script poetry and warmth',
    isPopular: true,
  },
  {
    id: 'Gujarati',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Sweet, emotional & cultural',
    isPopular: true,
  },
  {
    id: 'Gujlish',
    name: 'Gujlish',
    nativeName: 'Gujarati in English Script',
    category: 'popular',
    flag: '💖',
    description: 'Modern Gujarati (e.g. "Tame mara mate badhu cho")',
  },
  {
    id: 'Spanish',
    name: 'Spanish',
    nativeName: 'Español',
    category: 'european',
    flag: '🇪🇸',
    description: 'Passionate and deeply romantic',
    isPopular: true,
  },
  {
    id: 'French',
    name: 'French',
    nativeName: 'Français',
    category: 'european',
    flag: '🇫🇷',
    description: 'Language of love and elegance',
    isPopular: true,
  },
  {
    id: 'Spanglish',
    name: 'Spanglish',
    nativeName: 'Spanish + English',
    category: 'popular',
    flag: '🌎',
    description: 'Latin-American bilingual love',
  },
  {
    id: 'Tanglish',
    name: 'Tanglish',
    nativeName: 'Tamil in English Script',
    category: 'popular',
    flag: '💖',
    description: 'Modern Tamil (e.g. "En uyire, love you so much")',
  },
  {
    id: 'Telugish',
    name: 'Telugish',
    nativeName: 'Telugu in English Script',
    category: 'popular',
    flag: '💖',
    description: 'Modern Telugu (e.g. "Nuvvante naaku chala ishtam")',
  },
  {
    id: 'Marathish',
    name: 'Marathish',
    nativeName: 'Marathi in English Script',
    category: 'popular',
    flag: '💖',
    description: 'Modern Marathi (e.g. "Majha prem fakt tujhyavar")',
  },
  {
    id: 'Banglish',
    name: 'Banglish',
    nativeName: 'Bengali in English Script',
    category: 'popular',
    flag: '💖',
    description: 'Modern Bengali (e.g. "Tumi amar shob kisu")',
  },
  {
    id: 'Manglish',
    name: 'Manglish',
    nativeName: 'Malayalam in English Script',
    category: 'popular',
    flag: '💖',
    description: 'Modern Malayalam (e.g. "Njan ninne orupad snehikkunnu")',
  },
  {
    id: 'Taglish',
    name: 'Taglish',
    nativeName: 'Tagalog + English',
    category: 'popular',
    flag: '🇵🇭',
    description: 'Filipino modern blend',
  },

  // --- Indian Regional Languages ---
  {
    id: 'Marathi',
    name: 'Marathi',
    nativeName: 'मराठी',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Heartfelt Maharashtra culture',
    isPopular: true,
  },
  {
    id: 'Punjabi',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ / پنجابی',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Vibrant, soulful & poetic',
    isPopular: true,
  },
  {
    id: 'Bengali',
    name: 'Bengali',
    nativeName: 'বাংলা',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Rabindranath Tagore poetic depth',
    isPopular: true,
  },
  {
    id: 'Tamil',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Classical, deep & profound',
    isPopular: true,
  },
  {
    id: 'Telugu',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Melodious "Italian of the East"',
    isPopular: true,
  },
  {
    id: 'Kannada',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Sweet, lyrical & expressive',
    isPopular: true,
  },
  {
    id: 'Malayalam',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Gentle, romantic & serene',
    isPopular: true,
  },
  {
    id: 'Urdu',
    name: 'Urdu',
    nativeName: 'اردو',
    category: 'indian',
    flag: '🇵🇰',
    description: 'Ghazal poetry, Ishq & Tehzeeb',
    isPopular: true,
  },
  {
    id: 'Odia',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Pure, classical sentiment',
  },
  {
    id: 'Assamese',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Gentle Northeast warmth',
  },
  {
    id: 'Sanskrit',
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    category: 'indian',
    flag: '🕉️',
    description: 'Ancient verses & divine devotion',
  },
  {
    id: 'Sindhi',
    name: 'Sindhi',
    nativeName: 'سنڌي / सिन्धी',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Sufi love & warmth',
  },
  {
    id: 'Nepali',
    name: 'Nepali',
    nativeName: 'नेपाली',
    category: 'indian',
    flag: '🇳🇵',
    description: 'Himalayan sweet romance',
  },
  {
    id: 'Bhojpuri',
    name: 'Bhojpuri',
    nativeName: 'भोजपुरी',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Affectionate folk sweetness',
  },
  {
    id: 'Marwari',
    name: 'Marwari',
    nativeName: 'मारवाड़ी / राजस्थानी',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Royal Rajasthani affection',
  },
  {
    id: 'Maithili',
    name: 'Maithili',
    nativeName: 'मैथिली',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Sweet Mithila poetry',
  },
  {
    id: 'Konkani',
    name: 'Konkani',
    nativeName: 'कोंकणी',
    category: 'indian',
    flag: '🇮🇳',
    description: 'Coastal Goa & Mangalore romance',
  },
  {
    id: 'Kashmiri',
    name: 'Kashmiri',
    nativeName: 'کٲشُر / कश्मीरी',
    category: 'indian',
    flag: '🏔️',
    description: 'Valley of flowers poetry',
  },
  {
    id: 'Sinhala',
    name: 'Sinhala',
    nativeName: 'සිංහල',
    category: 'indian',
    flag: '🇱🇰',
    description: 'Sri Lankan heartfelt expressions',
  },

  // --- European & Western Languages ---
  {
    id: 'German',
    name: 'German',
    nativeName: 'Deutsch',
    category: 'european',
    flag: '🇩🇪',
    description: 'Sincere and heartfelt',
    isPopular: true,
  },
  {
    id: 'Italian',
    name: 'Italian',
    nativeName: 'Italiano',
    category: 'european',
    flag: '🇮🇹',
    description: 'Dolce vita & amore',
    isPopular: true,
  },
  {
    id: 'Portuguese',
    name: 'Portuguese',
    nativeName: 'Português',
    category: 'european',
    flag: '🇵🇹',
    description: 'Saudade & warm devotion',
    isPopular: true,
  },
  {
    id: 'Russian',
    name: 'Russian',
    nativeName: 'Русский',
    category: 'european',
    flag: '🇷🇺',
    description: 'Deep soul & literary beauty',
    isPopular: true,
  },
  {
    id: 'Dutch',
    name: 'Dutch',
    nativeName: 'Nederlands',
    category: 'european',
    flag: '🇳🇱',
    description: 'Gezellig & loving',
  },
  {
    id: 'Polish',
    name: 'Polish',
    nativeName: 'Polski',
    category: 'european',
    flag: '🇵🇱',
    description: 'Romantic Slavic warmth',
  },
  {
    id: 'Swedish',
    name: 'Swedish',
    nativeName: 'Svenska',
    category: 'european',
    flag: '🇸🇪',
    description: 'Nordic warmth & sincerity',
  },
  {
    id: 'Norwegian',
    name: 'Norwegian',
    nativeName: 'Norsk',
    category: 'european',
    flag: '🇳🇴',
    description: 'Scandinavian romance',
  },
  {
    id: 'Danish',
    name: 'Danish',
    nativeName: 'Dansk',
    category: 'european',
    flag: '🇩🇰',
    description: 'Hygge & coziness',
  },
  {
    id: 'Finnish',
    name: 'Finnish',
    nativeName: 'Suomi',
    category: 'european',
    flag: '🇫🇮',
    description: 'Deep northern sincerity',
  },
  {
    id: 'Greek',
    name: 'Greek',
    nativeName: 'Ελληνικά',
    category: 'european',
    flag: '🇬🇷',
    description: 'Ancient romance & Eros/Agape',
  },
  {
    id: 'Czech',
    name: 'Czech',
    nativeName: 'Čeština',
    category: 'european',
    flag: '🇨🇿',
    description: 'Prague fairytale romance',
  },
  {
    id: 'Hungarian',
    name: 'Hungarian',
    nativeName: 'Magyar',
    category: 'european',
    flag: '🇭🇺',
    description: 'Intense and lyrical',
  },
  {
    id: 'Romanian',
    name: 'Romanian',
    nativeName: 'Română',
    category: 'european',
    flag: '🇷🇴',
    description: 'Latin soul of Eastern Europe',
  },
  {
    id: 'Ukrainian',
    name: 'Ukrainian',
    nativeName: 'Українська',
    category: 'european',
    flag: '🇺🇦',
    description: 'Melodic Slavic tenderness',
  },
  {
    id: 'Turkish',
    name: 'Turkish',
    nativeName: 'Türkçe',
    category: 'european',
    flag: '🇹🇷',
    description: 'Aşkım, canım, deep passion',
    isPopular: true,
  },
  {
    id: 'Irish',
    name: 'Irish / Gaelic',
    nativeName: 'Gaeilge',
    category: 'european',
    flag: '🇮🇪',
    description: 'Mo chroí (My heart) Celtic love',
  },

  // --- East & Southeast Asian Languages ---
  {
    id: 'Japanese',
    name: 'Japanese',
    nativeName: '日本語',
    category: 'asian',
    flag: '🇯🇵',
    description: 'Subtle, gentle & kawaii romance',
    isPopular: true,
  },
  {
    id: 'Korean',
    name: 'Korean',
    nativeName: '한국어',
    category: 'asian',
    flag: '🇰🇷',
    description: 'K-Drama heartfelt romance & aegyo',
    isPopular: true,
  },
  {
    id: 'Chinese-Simplified',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    category: 'asian',
    flag: '🇨🇳',
    description: 'Classic & modern sweet sentiment',
    isPopular: true,
  },
  {
    id: 'Chinese-Traditional',
    name: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    category: 'asian',
    flag: '🇹🇼',
    description: 'Elegant poetic Chinese romance',
  },
  {
    id: 'Vietnamese',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    category: 'asian',
    flag: '🇻🇳',
    description: 'Lyrical and tender love',
  },
  {
    id: 'Thai',
    name: 'Thai',
    nativeName: 'ไทย',
    category: 'asian',
    flag: '🇹🇭',
    description: 'Sweet, gentle & respectful',
  },
  {
    id: 'Indonesian',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    category: 'asian',
    flag: '🇮🇩',
    description: 'Aku cinta kamu warmth',
  },
  {
    id: 'Malay',
    name: 'Malay',
    nativeName: 'Bahasa Melayu',
    category: 'asian',
    flag: '🇲🇾',
    description: 'Heartwarming Nusantara romance',
  },
  {
    id: 'Tagalog',
    name: 'Tagalog / Filipino',
    nativeName: 'Filipino',
    category: 'asian',
    flag: '🇵🇭',
    description: 'Mahal kita heartfelt expressions',
  },

  // --- Middle Eastern & African Languages ---
  {
    id: 'Arabic',
    name: 'Arabic',
    nativeName: 'العربية',
    category: 'middle-eastern-african',
    flag: '🇸🇦',
    description: 'Habibi, deeply poetic & majestic',
    isPopular: true,
  },
  {
    id: 'Persian',
    name: 'Persian / Farsi',
    nativeName: 'فارسی',
    category: 'middle-eastern-african',
    flag: '🇮🇷',
    description: 'Rumi & Hafez timeless poetry',
  },
  {
    id: 'Hebrew',
    name: 'Hebrew',
    nativeName: 'עברית',
    category: 'middle-eastern-african',
    flag: '🇮🇱',
    description: 'Song of Songs classic romance',
  },
  {
    id: 'Swahili',
    name: 'Swahili',
    nativeName: 'Kiswahili',
    category: 'middle-eastern-african',
    flag: '🇰🇪',
    description: 'Nakupenda warmth & harmony',
  },
  {
    id: 'Amharic',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    category: 'middle-eastern-african',
    flag: '🇪🇹',
    description: 'Ethiopian ancient lyrical devotion',
  },
  {
    id: 'Yoruba',
    name: 'Yoruba',
    nativeName: 'Yorùbá',
    category: 'middle-eastern-african',
    flag: '🇳🇬',
    description: 'Ifẹ mi rich expressions',
  },
  {
    id: 'Zulu',
    name: 'Zulu',
    nativeName: 'isiZulu',
    category: 'middle-eastern-african',
    flag: '🇿🇦',
    description: 'Ngiyakuthanda heartfelt love',
  },
  {
    id: 'Afrikaans',
    name: 'Afrikaans',
    nativeName: 'Afrikaans',
    category: 'middle-eastern-african',
    flag: '🇿🇦',
    description: 'Ek het jou lief warmth',
  },
];

export const POPULAR_LANGUAGE_IDS = [
  'English',
  'Hinglish',
  'Hindi',
  'Gujarati',
  'Gujlish',
  'Marathi',
  'Punjabi',
  'Bengali',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Urdu',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Japanese',
  'Korean',
  'Arabic',
  'Turkish',
  'Chinese-Simplified',
];

export function getLanguageById(id: string): LanguageOption | undefined {
  return AI_LANGUAGES.find(
    (lang) => lang.id.toLowerCase() === id.toLowerCase() || lang.name.toLowerCase() === id.toLowerCase()
  );
}

export function searchLanguages(query: string, category: string = 'all'): LanguageOption[] {
  const q = query.trim().toLowerCase();
  return AI_LANGUAGES.filter((lang) => {
    const matchesCat = category === 'all' || lang.category === category;
    if (!matchesCat) return false;
    if (!q) return true;
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.id.toLowerCase().includes(q) ||
      (lang.description && lang.description.toLowerCase().includes(q))
    );
  });
}
