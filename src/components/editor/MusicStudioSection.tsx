/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  Upload,
  Mic,
  Square,
  Volume2,
  Trash2,
  Check,
  Disc,
  Link as LinkIcon,
  FileAudio,
  Radio,
  Sparkles,
  Youtube,
  ExternalLink,
} from 'lucide-react';
import { MusicTrackId } from '../../types';
import {
  musicEngine,
  unlockAudio,
  PRESET_AUDIO_STREAMS,
  extractYouTubeVideoId,
  isYouTubeUrl,
} from '../../utils/audio';

interface MusicStudioSectionProps {
  musicTrack: MusicTrackId;
  customMusicUrl?: string;
  customMusicName?: string;
  onChange: (updated: {
    musicTrack: MusicTrackId;
    customMusicUrl?: string;
    customMusicName?: string;
  }) => void;
}

interface PresetTrackItem {
  id: MusicTrackId;
  name: string;
  emoji: string;
  description: string;
  tag: string;
}

const PRESET_TRACKS: PresetTrackItem[] = [
  {
    id: 'romantic-piano',
    name: 'Romantic Grand Piano',
    emoji: '🎹',
    description: 'Tender classical piano chords with emotional warmth',
    tag: 'Popular',
  },
  {
    id: 'lofi-chill',
    name: 'Cozy Lo-Fi Romance',
    emoji: '☕',
    description: 'Soft chillhop beats with smooth vinyl warmth',
    tag: 'Cozy',
  },
  {
    id: 'acoustic-guitar',
    name: 'Acoustic Love Song',
    emoji: '🎸',
    description: 'Gentle fingerstyle acoustic guitar harmonies',
    tag: 'Sweet',
  },
  {
    id: 'music-box',
    name: 'Enchanted Music Box',
    emoji: '✨',
    description: 'Fairytale bell chimes evoking magical memories',
    tag: 'Magical',
  },
  {
    id: 'celebration-ukulele',
    name: 'Birthday & Joy Ukulele',
    emoji: '🎉',
    description: 'Uplifting joyful strumming for celebrations',
    tag: 'Upbeat',
  },
  {
    id: 'sunset-violin',
    name: 'Sunset Violin Strings',
    emoji: '🎻',
    description: 'Deep cinematic strings for soulful romance',
    tag: 'Emotional',
  },
  {
    id: 'bollywood-romance',
    name: 'Romantic Bollywood Melody',
    emoji: '🪕',
    description: 'Melodious love theme with Indian harmonic charm',
    tag: 'Romantic',
  },
  {
    id: 'none',
    name: 'Mute / No Music',
    emoji: '🔇',
    description: 'Silent presentation without background audio',
    tag: 'Silent',
  },
];

export const MusicStudioSection: React.FC<MusicStudioSectionProps> = ({
  musicTrack,
  customMusicUrl,
  customMusicName,
  onChange,
}) => {
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'youtube' | 'upload' | 'voice'>('youtube');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Check if current custom track is YouTube
  const currentYouTubeId = customMusicUrl ? extractYouTubeVideoId(customMusicUrl) : null;

  // Stop music when component unmounts
  useEffect(() => {
    return () => {
      if (playingPreviewId) {
        musicEngine.stop();
      }
    };
  }, [playingPreviewId]);

  // Handle Play/Pause preview for any track
  const togglePreview = (trackId: MusicTrackId, customUrl?: string) => {
    unlockAudio();

    if (trackId === 'none') {
      musicEngine.stop();
      setPlayingPreviewId(null);
      return;
    }

    if (playingPreviewId === trackId) {
      musicEngine.stop();
      setPlayingPreviewId(null);
    } else {
      musicEngine.start(trackId, customUrl);
      setPlayingPreviewId(trackId);
    }
  };

  // Handle preset selection
  const handleSelectTrack = (trackId: MusicTrackId) => {
    if (trackId === 'none') {
      musicEngine.stop();
      setPlayingPreviewId(null);
    } else {
      togglePreview(trackId);
    }
    onChange({
      musicTrack: trackId,
      customMusicUrl: trackId === 'custom-url' ? customMusicUrl : undefined,
      customMusicName: trackId === 'custom-url' ? customMusicName : undefined,
    });
  };

  // Handle YouTube song submission
  const handleApplyYouTube = (urlToUse?: string, nameToUse?: string) => {
    const raw = (urlToUse || youtubeInput).trim();
    if (!raw) return;

    setUploadError(null);
    const videoId = extractYouTubeVideoId(raw);
    if (!videoId) {
      setUploadError('Invalid YouTube URL. Please paste a valid YouTube video or shorts link.');
      return;
    }

    const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const friendlyName = nameToUse || (raw.includes('youtu') ? `YouTube Song (${videoId})` : `YouTube Song (${videoId})`);

    onChange({
      musicTrack: 'custom-url',
      customMusicUrl: fullUrl,
      customMusicName: friendlyName,
    });

    setYoutubeInput('');
    setPlayingPreviewId('custom-url');
    musicEngine.stop(); // YouTube plays directly in its own player
  };

  // Handle custom audio file upload (.mp3, .wav, .m4a, .aac, .ogg)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Max 15MB limit for smooth browser performance
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Audio file is too large. Please select a song under 15 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      onChange({
        musicTrack: 'custom-url',
        customMusicUrl: dataUrl,
        customMusicName: cleanName,
      });

      // Start playing preview
      togglePreview('custom-url', dataUrl);
    };
    reader.onerror = () => {
      setUploadError('Failed to read audio file. Please try a different format.');
    };
    reader.readAsDataURL(file);
  };

  // Handle direct audio URL submission
  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    const cleanUrl = urlInput.trim();

    // If it's a youtube url, redirect to YouTube handler
    if (isYouTubeUrl(cleanUrl)) {
      handleApplyYouTube(cleanUrl);
      setUrlInput('');
      return;
    }

    onChange({
      musicTrack: 'custom-url',
      customMusicUrl: cleanUrl,
      customMusicName: 'Custom Web Audio Stream',
    });
    togglePreview('custom-url', cleanUrl);
    setUrlInput('');
  };

  // Handle Voice Note recording via microphone
  const startVoiceRecording = async () => {
    try {
      setUploadError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          onChange({
            musicTrack: 'custom-url',
            customMusicUrl: base64Audio,
            customMusicName: 'My Romantic Voice Note 🎙️',
          });
          togglePreview('custom-url', base64Audio);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks in stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setUploadError('Microphone permission denied. Please allow microphone access in browser settings.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current !== null) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  const removeCustomTrack = () => {
    musicEngine.stop();
    setPlayingPreviewId(null);
    onChange({
      musicTrack: 'romantic-piano',
      customMusicUrl: undefined,
      customMusicName: undefined,
    });
  };

  return (
    <div id="music-studio-customizer" className="space-y-5">
      {/* Header & Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Music size={16} className="text-rose-400" />
            <span>Background Music & YouTube Songs</span>
          </h3>
          <p className="text-xs text-stone-400">
            Add any YouTube song, upload your favorite MP3, record a voice note, or choose a melody
          </p>
        </div>

        {/* Global Playing Status Badge */}
        {playingPreviewId && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-[11px] font-bold text-rose-300 animate-pulse">
            <Disc size={12} className="animate-spin" />
            <span>Audio Playing</span>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
          {uploadError}
        </div>
      )}

      {/* ACTIVE SONG PREVIEW CARD (If Custom or Selected) */}
      {musicTrack === 'custom-url' && customMusicUrl && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-stone-900 via-rose-950/30 to-stone-900 border border-rose-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <Sparkles size={12} /> Active Custom Song
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
              <Check size={11} />
              <span>Ready for Card</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {currentYouTubeId ? (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-white/20">
                  <img
                    src={`https://img.youtube.com/vi/${currentYouTubeId}/hqdefault.jpg`}
                    alt="YouTube Song Thumbnail"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Youtube size={16} className="text-red-500" />
                  </div>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-rose-600/30 text-rose-300 flex items-center justify-center border border-rose-500/30 shrink-0">
                  <FileAudio size={18} />
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {customMusicName || (currentYouTubeId ? `YouTube Video (${currentYouTubeId})` : 'Custom Audio File')}
                </p>
                <p className="text-[10px] text-rose-300 font-medium truncate">
                  {currentYouTubeId ? 'Plays automatically when receiver opens card 🎵' : 'Custom audio set as background music ✨'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Play preview for YouTube or audio */}
              {!currentYouTubeId && (
                <button
                  type="button"
                  onClick={() => togglePreview('custom-url', customMusicUrl)}
                  className={`p-2 rounded-lg text-xs font-bold transition-all ${
                    playingPreviewId === 'custom-url'
                      ? 'bg-rose-600 text-white shadow-lg'
                      : 'bg-stone-800 text-stone-200 hover:bg-stone-700 hover:text-white'
                  }`}
                  title={playingPreviewId === 'custom-url' ? 'Pause' : 'Play preview'}
                >
                  {playingPreviewId === 'custom-url' ? <Pause size={14} /> : <Play size={14} />}
                </button>
              )}

              <button
                type="button"
                onClick={removeCustomTrack}
                className="p-2 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Remove custom track and reset"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* If YouTube is active, show small live embedded player test */}
          {currentYouTubeId && (
            <div className="rounded-xl overflow-hidden border border-red-500/30 bg-black aspect-video max-h-44 mx-auto w-full">
              <iframe
                ref={previewIframeRef}
                src={`https://www.youtube-nocookie.com/embed/${currentYouTubeId}?controls=1&modestbranding=1&playsinline=1`}
                title="YouTube Video Preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      )}

      {/* INPUT METHODS TABS */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-900 border border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('youtube')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'youtube'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Youtube size={14} />
          <span>YouTube Song</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'upload'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Upload size={13} />
          <span>Upload Audio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('voice')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'voice'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Mic size={13} />
          <span>Voice Note</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'presets'
              ? 'bg-stone-800 text-white shadow-md'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Radio size={13} />
          <span>Melodies</span>
        </button>
      </div>

      {/* TAB 1: YOUTUBE SONG INPUT */}
      {activeTab === 'youtube' && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/30 via-stone-900 to-stone-900 border border-red-500/30 space-y-3.5 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600/30 text-red-400 flex items-center justify-center border border-red-500/40 shrink-0">
              <Youtube size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Add Any YouTube Video / Song URL</h4>
              <p className="text-[11px] text-stone-400">Paste any YouTube or YouTube Music song link to play in background</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="relative flex-1">
              <Youtube size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400" />
              <input
                type="text"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyYouTube();
                }}
                placeholder="Paste YouTube link (e.g. https://youtu.be/...)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-400"
              />
            </div>
            <button
              type="button"
              onClick={() => handleApplyYouTube()}
              disabled={!youtubeInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <Check size={14} />
              <span>Use YouTube Song</span>
            </button>
          </div>

          {/* Quick YouTube suggestions / shortcuts */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <p className="text-[11px] font-semibold text-stone-400">Popular Romantic YouTube Track Suggestions:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: '🎵 Perfect - Ed Sheeran', url: 'https://www.youtube.com/watch?v=2Vv-BfVoq4g' },
                { name: '🎹 River Flows in You - Yiruma', url: 'https://www.youtube.com/watch?v=7maJOI3QMu0' },
                { name: '✨ Kesariya Romance', url: 'https://www.youtube.com/watch?v=BddP6PYo2gs' },
                { name: '💖 Until I Found You', url: 'https://www.youtube.com/watch?v=GxldQ9GyXwo' },
              ].map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyYouTube(sug.url, sug.name)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-800/90 hover:bg-red-900/40 text-stone-300 hover:text-white border border-white/10 hover:border-red-500/40 transition-colors"
                >
                  {sug.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPLOAD AUDIO / MP3 */}
      {activeTab === 'upload' && (
        <div className="p-4 rounded-2xl bg-stone-900 border border-white/10 space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-500/30">
              <Upload size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Upload MP3 / Audio File</h4>
              <p className="text-[11px] text-stone-400">Select any audio track from your device (up to 15MB)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-6 rounded-2xl bg-black/40 hover:bg-stone-800/80 border-2 border-dashed border-white/15 hover:border-rose-400/60 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload size={22} />
            </div>
            <p className="text-xs font-bold text-white">Click to Browse & Upload Song</p>
            <p className="text-[10px] text-stone-400">Supports .MP3, .WAV, .M4A, .AAC, .OGG</p>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Or Paste Direct Web Audio URL */}
          <div className="pt-2 border-t border-white/10 flex items-center gap-2">
            <div className="relative flex-1">
              <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Or paste direct MP3 stream URL..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-rose-400"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyUrl}
              disabled={!urlInput.trim()}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-bold transition-all shrink-0"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: RECORD VOICE NOTE */}
      {activeTab === 'voice' && (
        <div className="p-4 rounded-2xl bg-stone-900 border border-white/10 space-y-3.5 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-500/30">
              <Mic size={16} />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-white">Record Romantic Voice Message</h4>
              <p className="text-[11px] text-stone-400">Speak from your heart; will play as background audio</p>
            </div>
          </div>

          <div className="py-4">
            {isRecording ? (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center mx-auto animate-ping shadow-2xl shadow-red-600/50">
                  <Mic size={24} />
                </div>
                <p className="text-sm font-bold text-red-400">Recording... {recordDuration}s</p>
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 mx-auto shadow-lg shadow-red-600/30"
                >
                  <Square size={14} className="fill-current" />
                  <span>Stop & Save Voice Note</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-rose-600/40 hover:scale-105 transition-transform cursor-pointer"
                >
                  <Mic size={26} />
                </button>
                <p className="text-xs text-stone-300 font-medium">Click microphone to start speaking</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4 / PRESETS LIST: PRESET MELODIES */}
      <div>
        <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Radio size={13} className="text-rose-400" />
          <span>Curated Melodies & Instrumental Themes ({PRESET_TRACKS.length})</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PRESET_TRACKS.map((track) => {
            const isSelected = musicTrack === track.id;
            const isPreviewing = playingPreviewId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => handleSelectTrack(track.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer text-left flex items-center justify-between gap-2.5 group ${
                  isSelected
                    ? 'bg-rose-500/20 border-rose-400 shadow-md shadow-rose-500/10'
                    : 'bg-stone-900/60 border-white/10 hover:bg-stone-800/80 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Play preview button for preset */}
                  {track.id !== 'none' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePreview(track.id);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isPreviewing
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/40 scale-105'
                          : 'bg-black/50 text-stone-300 hover:text-white hover:bg-stone-700'
                      }`}
                      title={isPreviewing ? 'Pause melody' : 'Preview melody'}
                    >
                      {isPreviewing ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
                    </button>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-black/50 text-stone-500 flex items-center justify-center shrink-0">
                      <span className="text-sm">🔇</span>
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h5 className="text-xs font-bold text-white truncate group-hover:text-rose-200">
                        {track.name}
                      </h5>
                      {track.tag && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-stone-300">
                          {track.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 truncate mt-0.5">
                      {track.description}
                    </p>
                  </div>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
