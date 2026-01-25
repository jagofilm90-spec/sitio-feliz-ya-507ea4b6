import { useState, useEffect, useCallback } from 'react';

interface UserPreferences {
  hapticEnabled: boolean;
}

const PREFERENCES_KEY = 'user_preferences';

const defaultPreferences: UserPreferences = {
  hapticEnabled: true,
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
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
      return updated;
    });
  }, []);

  const toggleHaptic = useCallback(() => {
    updatePreference('hapticEnabled', !preferences.hapticEnabled);
  }, [preferences.hapticEnabled, updatePreference]);

  return {
    preferences,
    updatePreference,
    loaded,
    isHapticEnabled: preferences.hapticEnabled,
    toggleHaptic,
  };
}
