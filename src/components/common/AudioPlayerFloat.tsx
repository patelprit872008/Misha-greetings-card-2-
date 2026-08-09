/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Disc,
  Youtube,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { MusicTrackId } from '../../types';
import {
  musicEngine,
  unlockAudio,
  extractYouTubeVideoId,
  isYouTubeUrl,
} from '../../utils/audio';

interface AudioPlayerFloatProps {
  track: MusicTrackId;
  customUrl?: string;
  customName?: string;
  autoPlay?: boolean;
}

export const AudioPlayerFloat: React.FC<AudioPlayerFloatProps> = ({
  track,
  customUrl,
  customName,
  autoPlay = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100); // 0 - 100
  const [showControls, setShowControls] = useState(false);
  const [isYoutubeReady, setIsYoutubeReady] = useState(false);

  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const youtubeVideoId = track === 'custom-url' ? extractYouTubeVideoId(customUrl) : null;
  const isYouTube = Boolean(youtubeVideoId);

  // Send message command to YouTube iframe
  const sendYouTubeCommand = (func: string, args: unknown[] = []) => {
    if (youtubeIframeRef.current && youtubeIframeRef.current.contentWindow) {
      try {
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: func,
            args: args,
          }),
          '*'
        );
      } catch (e) {
        // Cross-origin safe
      }
    }
  };

  useEffect(() => {
    if (track === 'none') {
      musicEngine.stop();
      setIsPlaying(false);
      return;
    }

    if (isYouTube) {
      // Stop WebAudio/HTML5 engine so they don't clash
      musicEngine.stop();
      if (autoPlay) {
        setIsPlaying(true);
        // Trigger play on youtube
        setTimeout(() => {
          sendYouTubeCommand('playVideo');
          sendYouTubeCommand('unMute');
          sendYouTubeCommand('setVolume', [volume]);
        }, 800);
      }
    } else {
      if (autoPlay) {
        musicEngine.start(track, customUrl);
        setIsPlaying(true);
      }
    }

    return () => {
      musicEngine.stop();
      if (isYouTube) {
        sendYouTubeCommand('pauseVideo');
      }
    };
  }, [track, customUrl, autoPlay, isYouTube, volume]);

  // Immediately stop/pause song when user navigates away, switches tabs, minimizes or leaves link
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isYouTube) {
          sendYouTubeCommand('pauseVideo');
        } else {
          musicEngine.stop();
        }
        setIsPlaying(false);
      }
    };

    const handlePageExit = () => {
      if (isYouTube) {
        sendYouTubeCommand('pauseVideo');
      }
      musicEngine.stop();
      setIsPlaying(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('unload', handlePageExit);
    window.addEventListener('blur', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('unload', handlePageExit);
      window.removeEventListener('blur', handleVisibilityChange);
    };
  }, [isYouTube]);

  const togglePlay = () => {
    unlockAudio();
    const targetState = !isPlaying;
    setIsPlaying(targetState);

    if (isYouTube) {
      if (targetState) {
        sendYouTubeCommand('playVideo');
        if (!isMuted) {
          sendYouTubeCommand('unMute');
          sendYouTubeCommand('setVolume', [volume]);
        }
      } else {
        sendYouTubeCommand('pauseVideo');
      }
    } else {
      if (targetState) {
        musicEngine.start(track, customUrl);
      } else {
        musicEngine.stop();
      }
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (isYouTube) {
      if (nextMuted) {
        sendYouTubeCommand('mute');
      } else {
        sendYouTubeCommand('unMute');
        sendYouTubeCommand('setVolume', [volume]);
      }
    } else {
      musicEngine.setMuted(nextMuted);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (isMuted && newVol > 0) {
      setIsMuted(false);
    }

    if (isYouTube) {
      sendYouTubeCommand('setVolume', [newVol]);
      if (newVol > 0) {
        sendYouTubeCommand('unMute');
      }
    } else {
      musicEngine.setVolume(newVol / 100);
      if (newVol > 0) {
        musicEngine.setMuted(false);
      }
    }
  };

  if (track === 'none') return null;

  const trackLabels: Record<MusicTrackId, string> = {
    'romantic-piano': 'Romantic Grand Piano',
    'lofi-chill': 'Cozy Lo-Fi Romance',
    'acoustic-guitar': 'Acoustic Love Song',
    'music-box': 'Enchanted Music Box',
    'celebration-ukulele': 'Happy Ukulele Chimes',
    'sunset-violin': 'Sunset Violin Strings',
    'bollywood-romance': 'Romantic Bollywood Melody',
    'custom-url': isYouTube ? (customName || 'YouTube Song 🎶') : (customName || 'Custom Audio Track 🎶'),
    none: 'No Music',
  };

  return (
    <div
      id="floating-audio-widget"
      className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2"
    >
      {/* Hidden YouTube background audio iframe */}
      {isYouTube && youtubeVideoId && (
        <div className="w-0 h-0 overflow-hidden opacity-0 pointer-events-none absolute -top-9999 -left-9999">
          <iframe
            ref={youtubeIframeRef}
            id="youtube-audio-stream"
            src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${youtubeVideoId}&controls=0&playsinline=1&origin=${encodeURIComponent(
              typeof window !== 'undefined' ? window.location.origin : ''
            )}`}
            title="YouTube Background Audio"
            allow="autoplay; encrypted-media"
            onLoad={() => {
              setIsYoutubeReady(true);
              if (isPlaying) {
                sendYouTubeCommand('playVideo');
                sendYouTubeCommand('unMute');
                sendYouTubeCommand('setVolume', [volume]);
              }
            }}
            className="w-1 h-1"
          />
        </div>
      )}

      {/* Expanded Floating Control Card */}
      {showControls && (
        <div className="bg-stone-900/95 backdrop-blur-xl border border-rose-500/30 p-3.5 rounded-2xl shadow-2xl text-xs text-stone-200 animate-in fade-in slide-in-from-bottom-3 duration-200 w-64 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              {isYouTube ? (
                <div className="w-6 h-6 rounded-lg bg-red-600/30 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
                  <Youtube size={14} />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-500/30 shrink-0">
                  <Music size={14} />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-white text-xs truncate">
                  {trackLabels[track]}
                </p>
                <p className="text-[10px] text-rose-300 flex items-center gap-1 font-medium">
                  {isYouTube ? 'YouTube Audio Stream' : 'High Quality Audio'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowControls(false)}
              className="text-stone-400 hover:text-white p-1 rounded-md text-xs hover:bg-white/10"
              title="Close controls"
            >
              ✕
            </button>
          </div>

          {/* Equalizer Wave / Playing state */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-stone-300 flex items-center gap-1.5">
              {isPlaying ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-400 font-bold">Playing Audio</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-stone-500" />
                  <span className="text-stone-400">Paused</span>
                </>
              )}
            </span>

            {/* Animated Equalizer Bars */}
            {isPlaying && (
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-rose-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite] h-2.5" />
                <span className="w-0.5 bg-rose-300 rounded-full animate-[bounce_1.1s_ease-in-out_infinite_0.2s] h-3.5" />
                <span className="w-0.5 bg-rose-500 rounded-full animate-[bounce_0.9s_ease-in-out_infinite_0.4s] h-2" />
                <span className="w-0.5 bg-rose-400 rounded-full animate-[bounce_1.2s_ease-in-out_infinite_0.1s] h-3" />
              </div>
            )}
          </div>

          {/* Volume Control Slider */}
          <div className="space-y-1 bg-black/40 p-2 rounded-xl border border-white/5">
            <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium">
              <span className="flex items-center gap-1">
                <Sliders size={10} /> Volume
              </span>
              <span className="text-white font-bold">{isMuted ? '0%' : `${volume}%`}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-stone-300 hover:text-white p-1 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={14} className="text-rose-400" />
                ) : (
                  <Volume2 size={14} className="text-stone-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Play / Pause Big Button */}
          <button
            onClick={togglePlay}
            className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause size={14} /> Pause Music
              </>
            ) : (
              <>
                <Play size={14} className="fill-current" /> Play Music
              </>
            )}
          </button>
        </div>
      )}

      {/* Main Floating Floating Disc Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            togglePlay();
            setShowControls(true);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowControls(!showControls);
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl border transition-all duration-300 relative group cursor-pointer ${
            isPlaying
              ? 'bg-gradient-to-tr from-rose-600 to-pink-500 border-rose-300 text-white shadow-rose-600/50 ring-4 ring-rose-500/20 scale-105'
              : 'bg-stone-900/90 border-white/20 text-stone-300 hover:text-white hover:border-rose-400'
          }`}
          aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
          title={isPlaying ? 'Music playing (Click to toggle / adjust volume)' : 'Play background music'}
        >
          {isPlaying ? (
            <Disc
              size={24}
              className="animate-spin text-white"
              style={{ animationDuration: '3.5s' }}
            />
          ) : isYouTube ? (
            <Youtube size={20} className="text-red-400" />
          ) : (
            <Music size={20} />
          )}

          {/* Play indicator dot */}
          {isPlaying && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-stone-900 rounded-full animate-pulse shadow-sm" />
          )}
        </button>

        {/* Mini expand / controls toggle button */}
        <button
          onClick={() => setShowControls(!showControls)}
          className="w-7 h-7 rounded-full bg-stone-900/90 border border-white/20 text-stone-300 hover:text-white hover:border-rose-400 flex items-center justify-center shadow-lg text-xs"
          title="Toggle music settings & volume"
        >
          {showControls ? '▼' : '▲'}
        </button>
      </div>
    </div>
  );
};
