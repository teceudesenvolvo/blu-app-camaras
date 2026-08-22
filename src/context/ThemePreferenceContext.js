import { createContext, useContext } from 'react';

export const THEME_PREFERENCES = ['automatic', 'light', 'dark'];

export const ThemePreferenceContext = createContext({
  themePreference: 'automatic',
  themeMode: 'light',
  setThemePreference: async () => {},
});

export const useThemePreference = () => useContext(ThemePreferenceContext);
