import config from './index';

// Metro requires static imports for bundled images. Register each new chamber here.
const logos = {
  paraipaba: require('../../assets/logo-camara-paraipaba.png'),
};
if (!logos[config.flavorId]) throw new Error('Logomarca da Camara nao registrada');
export const chamberLogo = logos[config.flavorId];
