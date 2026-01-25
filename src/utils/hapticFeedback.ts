/**
 * Haptic Feedback Utility
 * Provides vibration feedback on supported mobile devices using the Vibration API
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

/**
 * Triggers haptic feedback if the device supports it
 * @param pattern - Predefined pattern name, duration in ms, or custom array pattern
 * @returns true if vibration was triggered, false if not supported
 */
export const triggerHaptic = (
  pattern: HapticPattern | number | number[] = 'light'
): boolean => {
  // Check API support
  if (typeof navigator === 'undefined' || !navigator.vibrate) {
    return false;
  }

  try {
    const vibrationPattern = typeof pattern === 'string' 
      ? HAPTIC_PATTERNS[pattern] 
      : pattern;
    
    navigator.vibrate(vibrationPattern);
    return true;
  } catch (error) {
    // Silently fail - haptic feedback is non-essential
    console.warn('Haptic feedback failed:', error);
    return false;
  }
};

/**
 * Checks if the device supports haptic feedback
 */
export const supportsHaptic = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Cancels any ongoing vibration
 */
export const cancelHaptic = (): void => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(0);
  }
};
