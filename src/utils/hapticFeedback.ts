/**
 * Haptic Feedback Utility
 * Provides vibration feedback on supported mobile devices using the Vibration API
 * Falls back to AudioContext on iOS to simulate haptic with low-frequency audio
 */

/**
 * Predefined vibration patterns (in milliseconds)
 */
export const HAPTIC_PATTERNS: Record<string, number | number[]> = {
  // Light tap - normal navigation
  light: 10,
  // Medium tap - important actions
  medium: 25,
  // Heavy tap - critical actions or alerts
  heavy: 50,
  // Double tap - confirmation or tabs with badges
  double: [15, 50, 15],
  // Error pattern
  error: [50, 30, 50],
  // Success pattern
  success: [10, 30, 10, 30, 10],
};

type HapticPattern = keyof typeof HAPTIC_PATTERNS;

// Cache for AudioContext (reuse for performance)
let audioContext: AudioContext | null = null;

/**
 * Detects if the device is running iOS
 */
const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Gets or creates AudioContext for iOS fallback
 */
const getAudioContext = (): AudioContext | null => {
  if (audioContext) return audioContext;
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  } catch (error) {
    console.warn('AudioContext not available:', error);
  }
  
  return audioContext;
};

/**
 * Plays a very short low-frequency sound to simulate haptic on iOS
 * Uses a quick burst of low frequency (around 150-200Hz) which creates
 * a subtle "thump" feeling through the device speakers
 */
const playHapticSound = (duration: number = 10, intensity: 'light' | 'medium' | 'heavy' = 'light'): boolean => {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    // Resume context if suspended (required for iOS)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Create oscillator for the haptic sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Low frequency for "thump" feeling (150-200Hz range)
    const frequencies: Record<string, number> = {
      light: 150,
      medium: 180,
      heavy: 200,
    };
    oscillator.frequency.value = frequencies[intensity];
    oscillator.type = 'sine';
    
    // Volume based on intensity (keep it subtle)
    const volumes: Record<string, number> = {
      light: 0.15,
      medium: 0.25,
      heavy: 0.35,
    };
    
    // Convert ms to seconds for AudioContext
    const durationSec = Math.min(duration / 1000, 0.05); // Max 50ms
    
    // Quick attack and release envelope for crisp haptic feel
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volumes[intensity], now + 0.002); // 2ms attack
    gainNode.gain.linearRampToValueAtTime(0, now + durationSec); // Fade to end
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Play the sound
    oscillator.start(now);
    oscillator.stop(now + durationSec);
    
    return true;
  } catch (error) {
    console.warn('Haptic sound failed:', error);
    return false;
  }
};

/**
 * Plays multiple haptic sounds for pattern simulation on iOS
 */
const playHapticPattern = (pattern: number[]): boolean => {
  let delay = 0;
  
  pattern.forEach((duration, index) => {
    // Only play on odd indices (duration, not gap)
    if (index % 2 === 0) {
      setTimeout(() => {
        playHapticSound(duration, duration > 30 ? 'medium' : 'light');
      }, delay);
    }
    delay += duration;
  });
  
  return true;
};

/**
 * Triggers haptic feedback if the device supports it
 * Falls back to AudioContext on iOS for simulated haptic
 * @param pattern - Predefined pattern name, duration in ms, or custom array pattern
 * @returns true if feedback was triggered, false if not supported
 */
export const triggerHaptic = (
  pattern: HapticPattern | number | number[] = 'light'
): boolean => {
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return false;
  }

  const vibrationPattern = typeof pattern === 'string' 
    ? HAPTIC_PATTERNS[pattern] 
    : pattern;

  // Try native Vibration API first (Android)
  if (navigator.vibrate) {
    try {
      navigator.vibrate(vibrationPattern);
      return true;
    } catch (error) {
      console.warn('Vibration API failed:', error);
    }
  }

  // Fallback to AudioContext for iOS
  if (isIOS()) {
    try {
      if (Array.isArray(vibrationPattern)) {
        return playHapticPattern(vibrationPattern);
      } else {
        const intensity = vibrationPattern <= 15 ? 'light' : 
                         vibrationPattern <= 35 ? 'medium' : 'heavy';
        return playHapticSound(vibrationPattern, intensity);
      }
    } catch (error) {
      console.warn('iOS haptic fallback failed:', error);
    }
  }

  return false;
};

/**
 * Checks if the device supports any form of haptic feedback
 */
export const supportsHaptic = (): boolean => {
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return false;
  }
  
  // Native vibration support
  if ('vibrate' in navigator) return true;
  
  // iOS with AudioContext fallback
  if (isIOS()) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    return !!AudioContextClass;
  }
  
  return false;
};

/**
 * Cancels any ongoing vibration (only works for Vibration API)
 */
export const cancelHaptic = (): void => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(0);
  }
};

/**
 * Initializes the haptic system (useful to call on first user interaction on iOS)
 * iOS requires user interaction to initialize AudioContext
 */
export const initHaptic = (): void => {
  if (isIOS()) {
    getAudioContext();
  }
};
