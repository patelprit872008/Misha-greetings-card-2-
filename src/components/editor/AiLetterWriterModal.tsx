/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Wand2, Copy, Check, Heart, Feather, Loader2 } from 'lucide-react';
import { RelationshipCategory } from '../../types';
import { LanguagePicker } from './LanguagePicker';
import { useAuth } from '../../context/AuthContext';

interface AiLetterWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderName: string;
  receiverName: string;
  category: RelationshipCategory;
  onApplyLetter: (paragraphs: string[], signOff?: string) => void;
  onApplyReasons?: (reasons: Array<{ title: string; description: string; iconEmoji: string }>) => void;
}

export const AiLetterWriterModal: React.FC<AiLetterWriterModalProps> = ({
  isOpen,
  onClose,
  senderName,
  receiverName,
  category,
  onApplyLetter,
}) => {
  const { isAuthenticated, token, openAuthModal } = useAuth();
  const [tone, setTone] = useState('romantic');
  const [language, setLanguage] = useState('English');
  const [promptNotes, setPromptNotes] = useState('');
  const [outputType, setOutputType] = useState<'letter' | 'poem' | 'reasons' | 'apology'>('letter');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!isAuthenticated || !token) {
      openAuthModal('login');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderName: senderName || 'Your Love',
          receiverName: receiverName || 'My Favorite Person',
          category,
          tone,
          language,
          outputType,
          customNotes: promptNotes,
        }),
      });

      if (res.status === 401) {
        openAuthModal('login');
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.text) {
          setGeneratedText(data.text);
          return;
        }
      }
      throw new Error(`Server returned ${res.status}`);
    } catch (err) {
      console.error('AI generation failed, providing instant creative template', err);
      // Fallback heartwarming generator if offline/no key
      const fallbackLetters: Record<string, string> = {
        proposal: `Dearest ${receiverName || 'My Soulmate'},\n\nFrom the moment our paths crossed, my world completely changed. You brought warmth, laughter, and a profound peace into my life that I had never known before.\n\nEvery dream I have of the future begins and ends with you. I want to celebrate every victory by your side, comfort you through every sorrow, and hold your hand through every season of life.\n\nWill you do me the greatest honor in this world, say YES, and be mine forever?\n\nForever and always yours,\n${senderName || 'Yours Truly'} 💍🌹`,
        romantic: `Dearest ${receiverName || 'Love'},\n\nFrom the moment you came into my life, everything became brighter and warmer. Your smile has a way of turning my worst days into pure comfort, and your laugh is my favorite sound in the whole world.\n\nThank you for loving me as I am, for every quiet glance, and for all the little moments we share. No matter what tomorrow holds, my heart is forever yours.\n\nWith all my love and devotion,\n${senderName || 'Forever Yours'} 🌹`,
        apology: `Hey ${receiverName || 'there'},\n\nI am writing this because a simple text could never explain how genuinely sorry I am. I value your feelings and our bond far too much to let any mistake or misunderstanding hurt what we have.\n\nI take full responsibility, and I promise to listen, understand, and do better every single day. I hope you can find it in your heart to forgive me.\n\nWith sincere regret and love,\n${senderName || 'Your Friend'} 💜`,
        friendship: `Yo ${receiverName || 'Bestie'},\n\nOut of all the people on this chaotic planet, I am so glad I found someone who matches my exact brand of crazy. From our 2 AM rants to laughing till our stomachs hurt, you make life 100x more fun.\n\nThanks for always having my back no matter what. You are stuck with me forever!\n\nYour partner in crime,\n${senderName || 'Your Bestie'} 🤝🔥`,
        birthday: `Happy Birthday to the most incredible human, ${receiverName || 'Rockstar'}!\n\nToday is all about celebrating the joy, kindness, and wild energy you bring into everyone's lives. May this year be packed with dream achievements, delicious food, unforgettable trips, and endless laughter.\n\nCheers to another epic chapter!\n${senderName || 'Your Buddy'} 🎂🎉`,
      };

      setGeneratedText(fallbackLetters[tone] || fallbackLetters.romantic);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedText) return;
    const lines = generatedText.split('\n\n').filter((p) => p.trim().length > 0);
    onApplyLetter(lines);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative max-w-xl w-full bg-stone-900 border border-white/20 rounded-2xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5 font-serif-display">
                <span>AI Emotional Letter & Message Writer</span>
              </h3>
              <p className="text-xs text-stone-400">
                Powered by Gemini to craft touching, romantic, or funny letters in any language
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="py-4 overflow-y-auto space-y-4 flex-1 pr-1">
          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Emotional Tone
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'proposal', label: '💍 Love Proposal / Will You Be Mine' },
                { id: 'romantic', label: '🌹 Romantic & Deep' },
                { id: 'cute', label: '🌸 Cute & Playful' },
                { id: 'emotional', label: '🥺 Tear-Jerker' },
                { id: 'funny', label: '😂 Funny & Teasing' },
                { id: 'apology', label: '🕊️ Sincere Apology' },
                { id: 'poetic', label: '📜 Rhyming Poem' },
                { id: 'short', label: '✨ Short & Sweet' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                    tone === t.id
                      ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                      : 'bg-black/40 border-white/10 text-stone-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Message Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'letter', label: '💌 Heartfelt Letter (3-4 paras)' },
                { id: 'poem', label: '📜 Emotional Poem / Rhyme' },
                { id: 'apology', label: '🕊️ Peace Offering Apology' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setOutputType(fmt.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                    outputType === fmt.id
                      ? 'bg-rose-500/20 border-rose-400 text-rose-200 font-bold'
                      : 'bg-black/40 border-white/10 text-stone-400 hover:text-white'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selector (55+ Languages) */}
          <LanguagePicker
            selectedLanguage={language}
            onSelectLanguage={setLanguage}
            label="Letter Language & Regional Dialect"
          />

          {/* Custom Notes / Memories */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Personal Memories or Details (Optional)
            </label>
            <textarea
              value={promptNotes}
              onChange={(e) => setPromptNotes(e.target.value)}
              placeholder="e.g. She loves late-night drives, we first met at a coffee shop in October, she always steals my hoodie..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-400 resize-none"
            />
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Crafting Your Message with AI...</span>
              </>
            ) : (
              <>
                <Wand2 size={16} />
                <span>Generate Heartfelt Letter ✨</span>
              </>
            )}
          </button>

          {/* Output Preview */}
          {generatedText && (
            <div className="mt-4 p-4 rounded-xl bg-black/50 border border-white/15 relative">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <span className="text-xs font-semibold text-rose-300">Generated Preview:</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-white"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-xs text-stone-200 whitespace-pre-line font-body leading-relaxed max-h-48 overflow-y-auto">
                {generatedText}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {generatedText && (
          <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-400 hover:text-white hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 shadow-lg"
            >
              <Check size={14} />
              <span>Apply to Letter Section</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
