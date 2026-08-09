/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  RotateCcw,
  X,
  FilePlus,
  Sparkles,
  Heart,
  Calendar,
  Smile,
  AlertTriangle,
} from 'lucide-react';
import { TEMPLATE_PRESETS } from '../../data/templates';
import { HeartPageData } from '../../types';

interface ResetConfirmModalProps {
  onResetToBlank: () => void;
  onApplyTemplate: (templateData: HeartPageData) => void;
  onClose: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  onResetToBlank,
  onApplyTemplate,
  onClose,
}) => {
  return (
    <div
      id="reset-confirm-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden text-stone-100 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Reset Website & Start Fresh
              </h2>
              <p className="text-xs text-stone-400">
                Clear current edits or load a new ready-to-use template
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Direct Blank Reset Option */}
          <div className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700/80 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-rose-400" />
                Reset to Blank Slate
              </div>
              <p className="text-xs text-stone-400">
                Clears all titles, letters, and custom text so you can start completely from scratch.
              </p>
            </div>
            <button
              onClick={() => {
                onResetToBlank();
                onClose();
              }}
              className="py-2.5 px-4 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold shrink-0 transition-colors"
            >
              Reset to Blank
            </button>
          </div>

          {/* Template Grid */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Or Reset & Apply a Ready Template:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATE_PRESETS.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => {
                    onApplyTemplate({
                      ...tpl.data,
                      id: 'hp-' + Math.random().toString(36).substring(2, 9),
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-stone-800/40 hover:bg-stone-800 border border-stone-700/70 hover:border-rose-500/60 cursor-pointer transition-all duration-200 group text-left shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{tpl.icon}</span>
                    <span className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                      {tpl.name}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 line-clamp-2">
                    {tpl.tagline}
                  </p>
                  <div className="mt-2 text-[10px] text-rose-400 font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to load this template →
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
