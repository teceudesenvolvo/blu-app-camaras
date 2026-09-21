const fs = require('node:fs');
const path = require('node:path');

module.exports = ({ config }) => {
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
  for (const value of [tenant.name, tenant.slug, tenant.institutionName, tenant.firebase?.projectId,
    tenant.firebase?.apiKey, tenant.firebase?.appId, tenant.firebase?.storageBucket,
    tenant.easProjectId, tenant.ios?.bundleIdentifier, tenant.android?.package]) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Configuracao incompleta: ' + chamber);
  }
  if (tenant.flavorId !== chamber) throw new Error('flavorId deve corresponder a CAMARA');
  for (const asset of Object.values(tenant.assets)) {
    if (!fs.existsSync(path.resolve(__dirname, asset))) throw new Error('Asset ausente: ' + asset);
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
      bundleIdentifier: tenant.ios.bundleIdentifier,
      eas: { projectId: tenant.easProjectId },
      videosEndpoint: 'https://' + tenant.youtubeRegion + '-' + tenant.firebase.projectId + '.cloudfunctions.net/listarVideosTvCamara',
    },
  };
};
