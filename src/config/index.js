import Constants from 'expo-constants';

const config = Constants.expoConfig?.extra;
if (!config?.flavorId || !config?.firebase?.projectId) {
  throw new Error('Configuracao da Camara ausente. Reinicie o Expo com CAMARA definida.');
}
export default config;
