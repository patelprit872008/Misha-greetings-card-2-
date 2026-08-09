/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Globe,
  Search,
  Check,
  ChevronDown,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AI_LANGUAGES,
  LANGUAGE_CATEGORIES,
  LanguageOption,
  getLanguageById,
  searchLanguages,
} from '../../data/languages';

interface LanguagePickerProps {
  selectedLanguage: string;
  onSelectLanguage: (languageName: string) => void;
  label?: string;
  compact?: boolean;
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({
  selectedLanguage,
  onSelectLanguage,
  label = 'AI Generation Language / Dialect',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Quick favorite pills to show directly
  const quickPills = useMemo(() => [
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
    'Urdu',
    'Spanish',
    'French',
    'Japanese',
    'Korean',
    'Arabic',
  ], []);

  const currentLangObj = useMemo(() => {
    return (
      getLanguageById(selectedLanguage) || {
        id: selectedLanguage,
        name: selectedLanguage,
        nativeName: selectedLanguage,
        category: 'popular',
        flag: '🌐',
        description: 'Selected Language',
      }
    );
  }, [selectedLanguage]);

  const filteredLanguages = useMemo(() => {
    return searchLanguages(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-2">
      {/* Label and open full browser trigger */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
          <Globe size={13} className="text-rose-400" />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer transition-colors"
        >
          <span>Browse All 55+ Languages</span>
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Quick Pills Selector */}
      <div className="flex flex-wrap gap-1.5">
        {quickPills.map((langId) => {
          const lang = getLanguageById(langId);
          const isSelected =
            selectedLanguage.toLowerCase() === langId.toLowerCase();
          return (
            <button
              key={langId}
              type="button"
              onClick={() => onSelectLanguage(langId)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-sm shadow-rose-950 font-bold scale-[1.02]'
                  : 'bg-black/40 hover:bg-white/10 border-white/10 text-stone-400 hover:text-white'
              }`}
            >
              <span>{lang?.flag || '🌐'}</span>
              <span>{lang?.name || langId}</span>
              {isSelected && <Check size={11} className="text-rose-400" />}
            </button>
          );
        })}

        {/* If selected language is not in quick pills, show it with badge */}
        {!quickPills.some(
          (p) => p.toLowerCase() === selectedLanguage.toLowerCase()
        ) && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="px-2.5 py-1.5 rounded-xl border text-xs font-bold bg-rose-500/25 border-rose-400 text-rose-200 shadow-sm flex items-center gap-1.5"
          >
            <span>{currentLangObj.flag}</span>
            <span>{currentLangObj.name} ({currentLangObj.nativeName})</span>
            <Check size={11} className="text-rose-400" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-3 py-1.5 rounded-xl border text-xs font-semibold bg-stone-800/80 hover:bg-stone-700/80 border-stone-700 text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-all cursor-pointer"
        >
          <Sparkles size={11} className="text-amber-400" />
          <span>+35 More</span>
        </button>
      </div>

      {/* Selected Language Active Confirmation Bar */}
      <div className="p-2.5 rounded-xl bg-stone-900/80 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-base">{currentLangObj.flag}</span>
          <div>
            <span className="font-bold text-white">{currentLangObj.name}</span>
            {currentLangObj.nativeName !== currentLangObj.name && (
              <span className="text-stone-400 ml-1.5 font-normal">
                ({currentLangObj.nativeName})
              </span>
            )}
            {currentLangObj.description && (
              <span className="hidden sm:inline text-stone-400 text-[11px] ml-2 italic">
                — {currentLangObj.description}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-[11px] text-stone-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
        >
          Change
        </button>
      </div>

      {/* Full 55+ Language Search & Selection Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div
            className="relative w-full max-w-2xl bg-stone-900 border border-white/20 rounded-2xl p-5 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 font-serif-display">
                    <span>Select Language for AI Card (55+ Languages)</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Gemini AI will write romantic poetry, greetings, and letters in this dialect
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Box */}
            <div className="pt-3 pb-2">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search languages (e.g. Gujarati, Hinglish, Tamil, French, Spanish, Japanese, Urdu)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {LANGUAGE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700 hover:text-white'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Language Grid */}
            <div className="overflow-y-auto flex-1 py-2 pr-1 space-y-1.5">
              {filteredLanguages.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs">
                  <p>No languages matched "{searchQuery}"</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="mt-2 text-rose-400 underline font-semibold"
                  >
                    Reset Search Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredLanguages.map((lang) => {
                    const isSelected =
                      selectedLanguage.toLowerCase() === lang.id.toLowerCase() ||
                      selectedLanguage.toLowerCase() === lang.name.toLowerCase();

                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => {
                          onSelectLanguage(lang.id);
                          setIsOpen(false);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500/20 border-rose-400 text-rose-100 shadow-md ring-1 ring-rose-400/50'
                            : 'bg-black/30 hover:bg-white/10 border-white/10 text-stone-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">{lang.flag}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {lang.name}
                              </span>
                              {lang.isPopular && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 font-semibold uppercase">
                                  Popular
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-400 truncate">
                              {lang.nativeName}
                            </div>
                            {lang.description && (
                              <div className="text-[10px] text-stone-500 truncate mt-0.5">
                                {lang.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                              <Check size={12} />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-white/20 group-hover:border-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] text-stone-400">✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-stone-400">
              <span>Showing {filteredLanguages.length} languages</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
