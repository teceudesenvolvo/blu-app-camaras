import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { ThemeProvider } from 'styled-components/native';

// Importamos apenas o Navegador Principal
import AppNavigator from './src/navigation/AppNavigator';
import { THEME_PREFERENCES, ThemePreferenceContext } from './src/context/ThemePreferenceContext';
import { applyPortalTheme, getAutomaticThemeMode, portalGradients } from './src/styles/portalTheme';

// Pegamos os dados do Antigravity/Switch (Paraipaba)
const { theme: flavorTheme } = Constants.expoConfig.extra;
const THEME_PREFERENCE_KEY = '@cm-paraipaba/theme-preference';

const resolveThemeMode = preference => preference === 'automatic'
  ? getAutomaticThemeMode()
  : preference;

export default function App() {
  const [themePreference, setThemePreferenceState] = useState('automatic');
  const [themeMode, setThemeMode] = useState(() => resolveThemeMode('automatic'));
  const portal = useMemo(() => applyPortalTheme(themeMode), [themeMode]);
  const appTheme = useMemo(() => ({
    primary: flavorTheme?.primary || '#004a99',
    secondary: flavorTheme?.secondary || '#f9c204',
    background: portal.page,
    mode: themeMode,
    portal,
    gradients: { ...portalGradients },
  }), [portal, themeMode]);
  const navigationTheme = useMemo(() => {
    const base = themeMode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: portal.primary,
        background: portal.page,
        card: portal.card,
        text: portal.text,
        border: portal.border,
      },
    };
  }, [portal, themeMode]);
  const setThemePreference = useCallback(async preference => {
    if (!THEME_PREFERENCES.includes(preference)) return;
    setThemePreferenceState(preference);
    setThemeMode(resolveThemeMode(preference));
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
    } catch (error) {
      console.error('Erro ao salvar preferência de tema:', error);
    }
  }, []);
  const themePreferenceValue = useMemo(() => ({
    themePreference,
    themeMode,
    setThemePreference,
  }), [setThemePreference, themeMode, themePreference]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then(savedPreference => {
        if (!active || !THEME_PREFERENCES.includes(savedPreference)) return;
        setThemePreferenceState(savedPreference);
        setThemeMode(resolveThemeMode(savedPreference));
      })
      .catch(error => console.error('Erro ao carregar preferência de tema:', error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      if (themePreference === 'automatic') setThemeMode(getAutomaticThemeMode());
    };
    const interval = setInterval(updateTheme, 60 * 1000);
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') updateTheme();
    });
    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [themePreference]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <ThemeProvider theme={appTheme}>
        <ThemePreferenceContext.Provider value={themePreferenceValue}>
          <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />

          {/* O AppNavigator agora controla qual tela mostrar */}
          <AppNavigator />
        </ThemePreferenceContext.Provider>
      </ThemeProvider>
    </NavigationContainer>
  );
}
