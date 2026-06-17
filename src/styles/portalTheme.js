import Constants from 'expo-constants';

const configTheme = Constants.expoConfig?.extra?.theme || {};

export const portalTheme = {
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

export const portalGradients = {
  page: ['#f8fbff', '#eef5fb', '#f7fbf6'],
  primary: ['#025AA1', '#0077ed'],
  softPrimary: ['rgba(2, 90, 161, 0.16)', 'rgba(255, 192, 9, 0.10)', 'rgba(255, 255, 255, 0.92)'],
  woman: ['#f472b6', '#db2777', '#be185d'],
};
