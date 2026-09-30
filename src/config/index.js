import Constants from 'expo-constants';

const config = Constants.expoConfig?.extra;
if (!config?.flavorId || !config?.firebase?.projectId) {
  throw new Error('Configuracao white-label ou Firebase ausente. Confira o arquivo .env e reinicie o Expo.');
}
export default config;
