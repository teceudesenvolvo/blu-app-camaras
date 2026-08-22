import Constants from 'expo-constants';

const configTheme = Constants.expoConfig?.extra?.theme || {};

const lightTheme = {
  primary: configTheme.primary || '#025AA1',
  primaryDark: '#014377',
  secondary: configTheme.secondary || '#f9c204',
  page: '#f8fbff',
  pageAlt: '#eef5fb',
  text: '#1f2937',
  muted: '#64748b',
  subtle: '#94a3b8',
  border: '#dbe3ee',
  card: '#ffffff',
  success: '#0f766e',
  danger: '#ef4444',
  shadow: 'rgba(15, 23, 42, 0.10)',
};

const darkTheme = {
  primary: '#38a7f0',
  primaryDark: '#7cc4f2',
  secondary: '#facc15',
  page: '#07131f',
  pageAlt: '#0d2030',
  text: '#f1f5f9',
  muted: '#b7c5d3',
  subtle: '#8294a6',
  border: '#294154',
  card: '#102536',
  success: '#5eead4',
  danger: '#fb7185',
  shadow: 'rgba(0, 0, 0, 0.34)',
};

const lightGradients = {
  page: ['#f8fbff', '#eef5fb', '#f7fbf6'],
  primary: ['#025AA1', '#0077ed'],
  softPrimary: ['rgba(2, 90, 161, 0.16)', 'rgba(255, 192, 9, 0.10)', 'rgba(255, 255, 255, 0.92)'],
  woman: ['#f472b6', '#db2777', '#be185d'],
};

const darkGradients = {
  page: ['#07131f', '#0b1d2b', '#102536'],
  primary: ['#087fc0', '#38a7f0'],
  softPrimary: ['rgba(56, 167, 240, 0.18)', 'rgba(250, 204, 21, 0.08)', 'rgba(16, 37, 54, 0.96)'],
  woman: ['#be185d', '#db2777', '#9d174d'],
};

export const portalTheme = { ...lightTheme };
export const portalGradients = { ...lightGradients };

export const getAutomaticThemeMode = (date = new Date()) => {
  const hour = date.getHours();
  return hour >= 18 || hour < 6 ? 'dark' : 'light';
};

export const applyPortalTheme = (mode) => {
  Object.assign(portalTheme, mode === 'dark' ? darkTheme : lightTheme);
  Object.assign(portalGradients, mode === 'dark' ? darkGradients : lightGradients);
  return { ...portalTheme };
};
