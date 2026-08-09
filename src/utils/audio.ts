/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MusicTrackId } from '../types';

let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

// Safe AudioContext getter
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Global user-gesture unlocker for mobile browsers, Chrome & Safari
export function unlockAudio(): void {
  if (isAudioUnlocked) return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      isAudioUnlocked = true;
    }).catch(() => {});
  } else if (ctx && ctx.state === 'running') {
    isAudioUnlocked = true;
  }
}

// Attach automatic unlock listeners on first user interaction and stop on page leave
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockAudio();
    musicEngine.handleUserGesture();
    ['click', 'touchstart', 'pointerdown', 'keydown'].forEach((evt) => {
      window.removeEventListener(evt, handleFirstInteraction);
    });
  };

  ['click', 'touchstart', 'pointerdown', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, handleFirstInteraction, { passive: true, once: false });
  });

  // Global listener: When user navigates away, switches tab, closes browser or minimizes, stop audio immediately
  const handleGlobalExit = () => {
    musicEngine.stop();
  };

  window.addEventListener('pagehide', handleGlobalExit);
  window.addEventListener('beforeunload', handleGlobalExit);
  window.addEventListener('unload', handleGlobalExit);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      musicEngine.stop();
    }
  });
}

// YouTube URL parser & ID extractor helper
export function extractYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Match standard, youtu.be, shorts, embed, music.youtube URLs
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }
  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function isYouTubeUrl(url?: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

// Sound FX: Soft Quill Pen / Typewriter Stroke
let lastTypeSoundTime = 0;
export function playTypewriterSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (now - lastTypeSoundTime < 0.05) return; // throttle
  lastTypeSoundTime = now;

  unlockAudio();

  // Subtle ink scratch / soft mechanical tap
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  // Random variation in pitch for realism
  const randomFreq = 900 + Math.random() * 600;
  osc.frequency.setValueAtTime(randomFreq, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.035);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
}

// Sound FX: Confetti Pop & Sparkle (LOUD & CLEAR)
export function playConfettiSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  unlockAudio();

  const now = ctx.currentTime;

  // Pop oscillator
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.28);

  gain.gain.setValueAtTime(0.55, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.29);

  // Sparkle notes
  const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  freqs.forEach((f, i) => {
    const sOsc = ctx.createOscillator();
    const sGain = ctx.createGain();
    sOsc.type = 'sine';
    sOsc.frequency.setValueAtTime(f, now + 0.06 * i);
    sGain.gain.setValueAtTime(0.35, now + 0.06 * i);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06 * i + 0.35);

    sOsc.connect(sGain);
    sGain.connect(ctx.destination);

    sOsc.start(now + 0.06 * i);
    sOsc.stop(now + 0.06 * i + 0.36);
  });
}

// Sound FX: Envelope / Wax Seal Opening (LOUD & CLEAR)
export function playEnvelopeOpenSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  unlockAudio();

  const now = ctx.currentTime;

  // Paper slide rustle (filtered noise)
  const bufferSize = Math.floor(ctx.sampleRate * 0.4);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, now);
  filter.Q.setValueAtTime(2.2, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.02, now);
  gain.gain.linearRampToValueAtTime(0.42, now + 0.09);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);

  // Gentle harmonic chime
  const chimeNotes = [440, 554.37, 659.25, 880, 1108.73];
  chimeNotes.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + 0.08 + i * 0.05);
    g.gain.setValueAtTime(0.28, now + 0.08 + i * 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45 + i * 0.05);

    osc.connect(g);
    g.connect(ctx.destination);

    osc.start(now + 0.08 + i * 0.05);
    osc.stop(now + 0.5 + i * 0.05);
  });
}

// Sound FX: Candle Blow Out (LOUD & CLEAR)
export function playBlowCandleSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  unlockAudio();

  const now = ctx.currentTime;
  const bufferSize = Math.floor(ctx.sampleRate * 0.6);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(750, now);
  filter.frequency.exponentialRampToValueAtTime(220, now + 0.55);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.48, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
}

// Preset Stream URLs (High quality royalty-free romantic streams)
export const PRESET_AUDIO_STREAMS: Record<string, string> = {
  'romantic-piano': 'https://assets.mixkit.co/music/preview/mixkit-romantic-moment-114.mp3',
  'lofi-chill': 'https://assets.mixkit.co/music/preview/mixkit-chill-bro-494.mp3',
  'acoustic-guitar': 'https://assets.mixkit.co/music/preview/mixkit-sweet-love-117.mp3',
  'music-box': 'https://assets.mixkit.co/music/preview/mixkit-sweet-dreams-118.mp3',
  'celebration-ukulele': 'https://assets.mixkit.co/music/preview/mixkit-happy-times-158.mp3',
  'sunset-violin': 'https://assets.mixkit.co/music/preview/mixkit-love-is-in-the-air-119.mp3',
  'bollywood-romance': 'https://assets.mixkit.co/music/preview/mixkit-romantic-sunset-115.mp3',
};

// Ambient Background Music Engine (HTML5 Audio + WebAudio Polyphonic Synth Hybrid)
class AmbientMusicEngine {
  private isPlaying = false;
  private intervalId: number | null = null;
  private currentTrack: MusicTrackId = 'romantic-piano';
  private customUrl?: string;
  private step = 0;
  private audioElement: HTMLAudioElement | null = null;
  private volume = 1.0; // 100% full volume for clear audibility
  private isMuted = false;
  private synthActive = false;
  private pendingPlay = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.audioElement = new Audio();
        this.audioElement.loop = true;
        this.audioElement.crossOrigin = 'anonymous';
        this.audioElement.volume = this.volume;
      } catch (e) {
        // Audio element not supported
      }
    }
  }

  public handleUserGesture(): void {
    if (this.pendingPlay && this.isPlaying) {
      this.pendingPlay = false;
      this.executePlay();
    }
  }

  public start(track: MusicTrackId, customUrl?: string): void {
    this.currentTrack = track;
    this.customUrl = customUrl;

    if (track === 'none') {
      this.stop();
      return;
    }

    // If customUrl is a YouTube URL, AmbientMusicEngine steps aside so YouTube player takes over
    if (track === 'custom-url' && isYouTubeUrl(customUrl)) {
      this.stop();
      this.isPlaying = true;
      return;
    }

    this.isPlaying = true;
    this.executePlay();
  }

  private executePlay(): void {
    this.stopSynthesizer();

    if (!this.isPlaying || this.currentTrack === 'none') return;

    unlockAudio();

    // Determine stream URL
    let targetUrl: string | undefined = undefined;
    if (this.currentTrack === 'custom-url') {
      targetUrl = this.customUrl;
    } else {
      targetUrl = PRESET_AUDIO_STREAMS[this.currentTrack];
    }

    if (targetUrl && !isYouTubeUrl(targetUrl) && this.audioElement) {
      try {
        // Check if src changed
        if (this.audioElement.src !== targetUrl) {
          this.audioElement.src = targetUrl;
          this.audioElement.load();
        }
        this.audioElement.volume = this.isMuted ? 0 : this.volume;
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.pendingPlay = false;
            })
            .catch((err) => {
              console.log('HTML5 audio play waiting for user gesture or failed, activating synth fallback', err);
              this.pendingPlay = true;
              // Fallback to Web Audio Synth immediately so sound starts
              this.startSynthesizer();
            });
        }
        return;
      } catch (e) {
        console.warn('HTML5 Audio failed, falling back to Web Audio Synth', e);
      }
    }

    // Direct Web Audio Synth
    this.startSynthesizer();
  }

  private startSynthesizer(): void {
    if (this.synthActive) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    this.synthActive = true;
    this.step = 0;

    // Rich harmonic chord progressions
    const progressions: Record<string, number[][]> = {
      'romantic-piano': [
        [261.63, 329.63, 392.0, 523.25], // Cmaj7
        [220.0, 261.63, 329.63, 440.0],  // Am7
        [174.61, 220.0, 261.63, 349.23], // Fmaj7
        [196.0, 246.94, 293.66, 392.0],  // G7
      ],
      'lofi-chill': [
        [293.66, 349.23, 440.0, 523.25], // Dm7
        [196.0, 246.94, 293.66, 392.0],  // G7
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 440.0],  // Am7
      ],
      'acoustic-guitar': [
        [329.63, 392.0, 493.88, 659.25], // Em
        [261.63, 329.63, 392.0, 523.25], // C
        [196.0, 246.94, 293.66, 392.0],  // G
        [293.66, 369.99, 440.0, 587.33], // D
      ],
      'music-box': [
        [523.25, 659.25, 783.99, 1046.5],
        [440.0, 523.25, 659.25, 880.0],
        [349.23, 440.0, 523.25, 698.46],
        [392.0, 493.88, 587.33, 783.99],
      ],
      'celebration-ukulele': [
        [261.63, 329.63, 392.0],
        [220.0, 261.63, 329.63],
        [174.61, 220.0, 261.63],
        [196.0, 246.94, 293.66],
      ],
      'sunset-violin': [
        [220.0, 277.18, 329.63, 440.0],
        [174.61, 220.0, 261.63, 349.23],
        [196.0, 246.94, 293.66, 392.0],
        [261.63, 329.63, 392.0, 523.25],
      ],
      'bollywood-romance': [
        [293.66, 369.99, 440.0, 554.37], // D major with major 7th
        [246.94, 293.66, 369.99, 440.0], // Bm7
        [196.0, 246.94, 293.66, 369.99], // Gmaj7
        [220.0, 277.18, 329.63, 440.0],  // A7
      ],
    };

    const chords = progressions[this.currentTrack] || progressions['romantic-piano'];

    const playChord = () => {
      if (!this.isPlaying || !this.synthActive) return;
      const actx = getAudioContext();
      if (!actx || actx.state !== 'running') return;

      const chord = chords[this.step % chords.length];
      const now = actx.currentTime;

      // Bass drone root - BOOSTED GAIN
      const rootFreq = chord[0] / 2;
      const bassOsc = actx.createOscillator();
      const bassGain = actx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(rootFreq, now);
      const bassVol = (this.isMuted ? 0 : this.volume) * 0.18;
      bassGain.gain.setValueAtTime(0.001, now);
      bassGain.gain.linearRampToValueAtTime(bassVol, now + 0.15);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
      bassOsc.connect(bassGain);
      bassGain.connect(actx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 2.2);

      // Play soft arpeggio - BOOSTED GAIN
      chord.forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();

        if (this.currentTrack === 'music-box') {
          osc.type = 'sine';
        } else if (this.currentTrack === 'lofi-chill') {
          osc.type = 'triangle';
        } else if (this.currentTrack === 'sunset-violin' || this.currentTrack === 'bollywood-romance') {
          osc.type = 'sawtooth';
        } else {
          osc.type = 'sine';
        }

        osc.frequency.setValueAtTime(freq, now + idx * 0.18);

        const currentVol = this.isMuted ? 0 : this.volume;
        const noteGain =
          (this.currentTrack === 'music-box'
            ? 0.28
            : this.currentTrack === 'sunset-violin' || this.currentTrack === 'bollywood-romance'
            ? 0.16
            : 0.22) * currentVol;

        gain.gain.setValueAtTime(0.001, now + idx * 0.18);
        gain.gain.linearRampToValueAtTime(noteGain, now + idx * 0.18 + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 2.2);

        osc.connect(gain);
        gain.connect(actx.destination);

        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 2.3);
      });

      this.step++;
    };

    playChord();
    this.intervalId = window.setInterval(playChord, 2200);
  }

  private stopSynthesizer(): void {
    this.synthActive = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public stop(): void {
    this.isPlaying = false;
    this.pendingPlay = false;
    this.stopSynthesizer();

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {
        // ignore
      }
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.audioElement) {
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.audioElement) {
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getCurrentTrack(): MusicTrackId {
    return this.currentTrack;
  }
}

export const musicEngine = new AmbientMusicEngine();

