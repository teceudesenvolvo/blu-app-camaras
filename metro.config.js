// The app uses React Navigation directly. Expo SDK 57 may install
// expo-router as an optional peer, so keep its compatibility check disabled
// before Metro resolves the application entrypoint.
process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
