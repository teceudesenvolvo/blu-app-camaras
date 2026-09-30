import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeProvider } from 'styled-components/native';

// Importamos apenas o Navegador Principal
import AppNavigator from './src/navigation/AppNavigator';
import { THEME_PREFERENCES, ThemePreferenceContext } from './src/context/ThemePreferenceContext';
import { applyPortalTheme, getAutomaticThemeMode, portalGradients } from './src/styles/portalTheme';
import { SystemControlProvider, useSystemControl } from './src/context/SystemControlContext';
import { chamberLogo } from './src/config/branding';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Pegamos os dados do Antigravity/Switch (Paraipaba)
const THEME_PREFERENCE_KEY = '@' + Constants.expoConfig.extra.slug + '/theme-preference';

const resolveThemeMode = preference => preference === 'automatic'
  ? getAutomaticThemeMode()
  : preference;

function ThemedApp() {
  const { settings, loading } = useSystemControl();
  const [themePreference, setThemePreferenceState] = useState('automatic');
  const [themeMode, setThemeMode] = useState(() => resolveThemeMode('automatic'));
  const portal = useMemo(() => applyPortalTheme(themeMode, settings.design), [themeMode, settings.design]);
  const appTheme = useMemo(() => ({
    primary: portal.primary,
    secondary: portal.secondary,
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

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (loading) {
    const primary = settings.design?.primaryColor || '#025AA1';
    const secondary = settings.design?.secondaryColor || '#0284C7';
    const logo = settings.branding?.logoUrl ? { uri: settings.branding.logoUrl } : chamberLogo;
    const name = settings.tenant?.shortName || settings.tenant?.name || 'Câmara Municipal';

    return (
      <View style={styles.splashRoot}>
        <LinearGradient colors={[primary, secondary]} style={StyleSheet.absoluteFill} />
        <View style={styles.splashGlow} />
        <View style={styles.splashBrand}>
          <Image source={logo} resizeMode="contain" style={styles.splashLogo} />
          <Text style={styles.splashName}>{name}</Text>
          <View style={styles.splashLoader} />
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <ThemeProvider theme={appTheme}>
        <ThemePreferenceContext.Provider value={themePreferenceValue}>
          <StatusBar
            key={themeMode}
            style={themeMode === 'dark' ? 'light' : 'dark'}
            backgroundColor={portal.page}
            translucent={false}
          />

          {/* O AppNavigator agora controla qual tela mostrar */}
          <AppNavigator />
        </ThemePreferenceContext.Provider>
      </ThemeProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return <SystemControlProvider><ThemedApp /></SystemControlProvider>;
}

const styles = StyleSheet.create({
  splashRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#025AA1' },
  splashGlow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.1)', top: '18%' },
  splashBrand: { alignItems: 'center', paddingHorizontal: 32 },
  splashLogo: { width: 116, height: 116, marginBottom: 24 },
  splashName: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  splashLoader: { width: 52, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.75)', marginTop: 28 },
});
