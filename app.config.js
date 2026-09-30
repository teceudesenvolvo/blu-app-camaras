const fs = require('node:fs');
const path = require('node:path');

function loadStaticEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

module.exports = ({ config }) => {
  loadStaticEnv();
  const flavorsDir = path.join(__dirname, 'flavors');
  const configuredFlavors = fs.readdirSync(flavorsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(flavorsDir, entry.name, 'config.json')))
    .map((entry) => entry.name);
  const chamber = process.env.CAMARA || (configuredFlavors.length === 1 ? configuredFlavors[0] : undefined);
  if (!chamber) {
    throw new Error('Nenhum tenant unico configurado. Adicione um flavor ou use CAMARA=<id> para selecionar o tenant.');
  }
  if (!/^[a-z0-9-]+$/.test(chamber)) throw new Error('CAMARA invalida');
  const file = path.join(__dirname, 'flavors', chamber, 'config.json');
  if (!fs.existsSync(file)) throw new Error('Camara nao configurada: ' + chamber);
  const tenant = JSON.parse(fs.readFileSync(file, 'utf8'));
  const firebase = {
    ...tenant.firebase,
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || tenant.firebase?.apiKey,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || tenant.firebase?.authDomain,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || tenant.firebase?.databaseURL,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || tenant.firebase?.projectId,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || tenant.firebase?.storageBucket,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || tenant.firebase?.messagingSenderId,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || tenant.firebase?.appId,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || tenant.firebase?.measurementId,
  };
  for (const value of [tenant.name, tenant.slug, tenant.institutionName, firebase.projectId,
    firebase.apiKey, firebase.appId, firebase.storageBucket,
    tenant.easProjectId, tenant.ios?.bundleIdentifier, tenant.android?.package]) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Configuracao incompleta: ' + chamber);
  }
  if (tenant.flavorId !== chamber) throw new Error('flavorId deve corresponder a CAMARA');
  for (const asset of Object.values(tenant.assets)) {
    if (!fs.existsSync(path.resolve(__dirname, asset))) throw new Error('Asset ausente: ' + asset);
  }
  for (const serviceFile of [tenant.ios?.googleServicesFile, tenant.android?.googleServicesFile]) {
    if (!serviceFile || !fs.existsSync(path.resolve(__dirname, serviceFile))) {
      throw new Error('Arquivo nativo do Firebase ausente: ' + (serviceFile || chamber));
    }
  }
  return {
    ...config,
    name: tenant.name,
    slug: tenant.slug,
    icon: tenant.assets.icon,
    splash: { ...config.splash, image: tenant.assets.splash },
    ios: {
      ...config.ios,
      ...tenant.ios,
      infoPlist: { ...config.ios?.infoPlist, ...tenant.ios?.infoPlist },
    },
    android: { ...config.android, ...tenant.android },
    web: { ...config.web, favicon: tenant.assets.icon },
    plugins: [...(config.plugins || []), 'expo-asset'],
    updates: { ...config.updates, url: 'https://u.expo.dev/' + tenant.easProjectId },
    extra: {
      ...tenant,
      firebase,
      bundleIdentifier: tenant.ios.bundleIdentifier,
      eas: { projectId: tenant.easProjectId },
      videosEndpoint: 'https://' + tenant.youtubeRegion + '-' + firebase.projectId + '.cloudfunctions.net/listarVideosTvCamara',
    },
  };
};
