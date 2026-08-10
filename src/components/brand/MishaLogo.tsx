/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';

// Path to the high-resolution generated logo asset
import logoAsset from '../../assets/images/misha_card_logo_1786265266510.jpg';

interface MishaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  subtitleText?: string;
  variant?: 'full' | 'icon' | 'badge';
  className?: string;
  onClick?: () => void;
}

export const MishaLogo: React.FC<MishaLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  subtitleText = '1-Page Interactive Experience Creator',
  variant = 'full',
  className = '',
  onClick,
}) => {
  const [imageLoaded, setImageLoaded] = useState(true);

  // Dimension mapping
  const dimensions = {
    xs: { icon: 'w-6 h-6', title: 'text-xs', subtitle: 'text-[9px]' },
    sm: { icon: 'w-8 h-8', title: 'text-sm', subtitle: 'text-[10px]' },
    md: { icon: 'w-10 h-10', title: 'text-base', subtitle: 'text-[11px]' },
    lg: { icon: 'w-14 h-14', title: 'text-xl', subtitle: 'text-xs' },
    xl: { icon: 'w-20 h-20', title: 'text-2xl', subtitle: 'text-sm' },
  }[size];

  const logoIcon = (
    <div
      className={`relative shrink-0 rounded-2xl overflow-hidden shadow-lg shadow-rose-950/50 border border-rose-400/40 p-0.5 bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-400 ${dimensions.icon}`}
    >
      {imageLoaded ? (
        <img
          src={logoAsset}
          alt="Misha Greetings Card Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-[14px]"
          onError={() => setImageLoaded(false)}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-rose-600 via-pink-600 to-purple-800 flex items-center justify-center text-white rounded-[14px]">
          <span className="font-serif-display font-extrabold text-xs">M</span>
        </div>
      )}
      {/* Subtle sparkle overlay badge */}
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-black flex items-center justify-center">
        <Sparkles size={7} className="text-black fill-current" />
      </span>
    </div>
  );

  if (variant === 'icon') {
    return (
      <div
        className={`inline-flex items-center ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
        onClick={onClick}
      >
        {logoIcon}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 ${onClick ? 'cursor-pointer select-none' : ''} ${className}`}
      onClick={onClick}
    >
      {logoIcon}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`font-extrabold tracking-tight font-serif-display text-white ${dimensions.title}`}
          >
            Misha
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 ml-1.5">
              Greetings Card
            </span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap shrink-0">
            Studio
          </span>
        </div>
        {showSubtitle && (
          <p className={`text-stone-400 font-sans truncate ${dimensions.subtitle}`}>
            {subtitleText}
          </p>
        )}
      </div>
    </div>
  );
};
