import { useState, useEffect, useCallback } from 'react';

export type FontSize = 'normal' | 'large';

interface UserPreferences {
  hapticEnabled: boolean;
  soundEnabled: boolean;
  fontSize: FontSize;
  highContrast: boolean;
}

const PREFERENCES_KEY = 'user_preferences';

const defaultPreferences: UserPreferences = {
  hapticEnabled: true,
  soundEnabled: true,
  fontSize: 'normal',
  highContrast: false,
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    setLoaded(true);
  }, []);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
        // Disparar evento para que App.tsx aplique los cambios inmediatamente
        window.dispatchEvent(new CustomEvent('user-preferences-changed'));
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
      return updated;
    });
  }, []);

  const toggleHaptic = useCallback(() => {
    updatePreference('hapticEnabled', !preferences.hapticEnabled);
  }, [preferences.hapticEnabled, updatePreference]);

  const toggleSound = useCallback(() => {
    updatePreference('soundEnabled', !preferences.soundEnabled);
  }, [preferences.soundEnabled, updatePreference]);

  const setFontSize = useCallback((size: FontSize) => {
    updatePreference('fontSize', size);
  }, [updatePreference]);

  const toggleHighContrast = useCallback(() => {
    updatePreference('highContrast', !preferences.highContrast);
  }, [preferences.highContrast, updatePreference]);

  return {
    preferences,
    updatePreference,
    loaded,
    // Haptic
    isHapticEnabled: preferences.hapticEnabled,
    toggleHaptic,
    // Sound
    isSoundEnabled: preferences.soundEnabled,
    toggleSound,
    // Font Size
    fontSize: preferences.fontSize,
    setFontSize,
    // High Contrast
    isHighContrast: preferences.highContrast,
    toggleHighContrast,
  };
}
