// IDs shared with BluPortalServicosCamaras/src/config/systemModules.js.
export const SCREEN_MODULES = {
  Vereadores: 'vereadores',
  Piel: 'piel',
  Procuradoria: 'procuradoria',
  ProcuradoriaSolicitacao: 'procuradoria',
  ProcuradoriaDetalhe: 'procuradoria',
  ContatoConfianca: 'procuradoria',
  PanicLocation: 'procuradoria',
  TvCamara: 'tvCamara',
  AtendimentoJuridico: 'juridico',
  OuvidoriaMunicipal: 'ouvidoria',
  OuvidoriaDetalhe: 'ouvidoria',
  BalcaoCidadao: 'balcao',
  BalcaoSolicitacao: 'balcao',
  BalcaoDetalhe: 'balcao',
  NoticiaDetalhe: 'noticias',
  Noticias: 'noticias',
  ChatMensagens: 'mensagens',
  ChatMensagensDetalhe: 'mensagens',
  AvaliarAtendimento: 'avaliacoes',
  Esic: 'esic',
  Microempreendedor: 'microempreendedor',
  Avaliacoes: 'avaliacoes',
  Protocolo: 'protocolo',
  GabineteVereador: 'agendaVereadores',
  EscolaParlamento: 'escolaParlamento',
  Procon: 'procon',
  Contratos: 'contratos',
  Almoxarifado: 'almoxarifado',
  Patrimonio: 'patrimonio',
  Manutencao: 'manutencao',
  Frotas: 'frotas',
  Recepcao: 'recepcao',
};

export const ADMIN_SERVICE_MODULES = new Set([
  'legislativo', 'contratos', 'almoxarifado', 'patrimonio', 'manutencao', 'frotas', 'recepcao',
]);

const MODULE_IDS = [
  'protocolo', 'contratos', 'ged', 'fornecedores', 'almoxarifado', 'patrimonio', 'manutencao', 'frotas',
  'relatorios', 'esic', 'agendaVereadores', 'legislativo', 'juridico', 'balcao', 'microempreendedor',
  'recepcao', 'mensagens', 'email', 'whatsapp', 'noticias', 'tvCamara', 'avaliacoes', 'ouvidoria',
  'procuradoria', 'vereadores', 'piel', 'escolaParlamento', 'procon', 'usuarios', 'notificacoes',
];

const ENABLED_IN_APP_BY_DEFAULT = new Set([
  'protocolo', 'esic', 'agendaVereadores', 'legislativo', 'juridico', 'balcao', 'microempreendedor',
  'recepcao', 'mensagens', 'noticias', 'tvCamara', 'avaliacoes', 'ouvidoria', 'procuradoria',
  'vereadores', 'piel', 'escolaParlamento', 'procon', 'notificacoes',
]);

export const DEFAULT_MODULE_SETTINGS = Object.fromEntries(
  MODULE_IDS.map(id => {
    const enabled = ENABLED_IN_APP_BY_DEFAULT.has(id);
    return [id, { app: enabled, adminApp: enabled }];
  }),
);

const STAFF_MODULES = {
  protocolo: ['Protocolo', 'Servidor', 'Gestor de Setor', 'Secretaria Legislativa', 'Vereador', 'Assessor'],
  contratos: ['Fiscal de Contrato', 'Gestor de Contrato', 'Gestor de Setor'],
  ged: ['Arquivista', 'Gestor de Arquivo', 'Servidor'],
  fornecedores: ['Empresa', 'Fornecedor'],
  almoxarifado: ['Almoxarifado', 'Gestor de Setor'],
  patrimonio: ['Patrimônio', 'Gestor de Setor'],
  manutencao: ['Manutenção', 'Gestor de Setor'],
  frotas: ['Frotas', 'Gestor de Setor'],
  agendaVereadores: ['Vereador', 'Assessor'],
  legislativo: ['Secretaria Legislativa', 'Vereador', 'Assessor', 'Juridico'],
  juridico: ['Juridico'],
  balcao: ['Balcão'],
  microempreendedor: ['Microempreendedor'],
  recepcao: ['Balcão', 'Recepção', 'Microempreendedor'],
  mensagens: ['Balcão', 'Ouvidoria', 'Procuradoria'],
  avaliacoes: ['Balcão'],
  esic: ['Ouvidoria'],
  ouvidoria: ['Ouvidoria'],
  procuradoria: ['Procuradoria'],
  vereadores: ['Vereador'],
  procon: ['Procon'],
  escolaParlamento: ['Escola do Parlamento'],
  whatsapp: ['Admin', 'Administrador'],
  email: ['Admin', 'Administrador'],
};

const defaultRolePermission = (role, moduleId) =>
  ['Admin', 'Administrador'].includes(role) || Boolean(STAFF_MODULES[moduleId]?.includes(role));

const isSystemRootEmail = (settings, email) => {
  const roots = (Array.isArray(settings?.security?.rootEmails) ? settings.security.rootEmails : [])
    .map(value => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  const effectiveRoots = roots.length ? roots : ['leo@gmail.com'];
  return effectiveRoots.includes(String(email || '').trim().toLowerCase());
};

const hasSurfacePermission = (settings, role, moduleId, surface, email) => {
  if (isSystemRootEmail(settings, email)) return true;
  const roleSettings = settings?.security?.rolePermissions?.[role || 'Cidadão']?.[moduleId];
  const configured = roleSettings?.[surface];
  if (typeof configured === 'boolean') return configured;
  if (surface === 'app' && (!role || role === 'Cidadão')) {
    const portalPermission = roleSettings?.portal;
    return typeof portalPermission === 'boolean' ? portalPermission : true;
  }
  return defaultRolePermission(role, moduleId);
};

const isModuleActiveInApp = (settings, moduleId) =>
  Boolean(moduleId) && settings?.modules?.[moduleId]?.app === true;

const ADMIN_ROUTE_MODULES = {
  AdminProtocolo: 'protocolo', AdminContratos: 'contratos', AdminAlmoxarifado: 'almoxarifado',
  AdminPatrimonio: 'patrimonio', AdminManutencao: 'manutencao', AdminFrotas: 'frotas',
  AdminRecepcao: 'recepcao', AdminBalcao: 'balcao', AdminOuvidoria: 'ouvidoria',
  AdminProcuradoria: 'procuradoria', AdminMensagens: 'mensagens', AdminNoticias: 'noticias',
  AdminTvCamara: 'tvCamara', AdminAvaliacoes: 'avaliacoes', AdminVereadores: 'vereadores',
  AdminGabinete: 'agendaVereadores', AdminLegislativo: 'legislativo', AdminEsic: 'esic',
  AdminMicroempreendedor: 'microempreendedor', AdminJuridico: 'juridico', AdminPiel: 'piel',
  AdminEscolaParlamento: 'escolaParlamento', AdminProcon: 'procon',
};

const CITIZEN_ROUTE_MODULES = {
  Vereadores: 'vereadores', Piel: 'piel', Procuradoria: 'procuradoria', TvCamara: 'tvCamara',
  AtendimentoJuridico: 'juridico', OuvidoriaMunicipal: 'ouvidoria', BalcaoCidadao: 'balcao',
  NoticiaDetalhe: 'noticias', Noticias: 'noticias', Mensagens: 'mensagens', Avaliacoes: 'avaliacoes',
  Esic: 'esic', Microempreendedor: 'microempreendedor', Protocolo: 'protocolo',
  GabineteVereador: 'agendaVereadores', EscolaParlamento: 'escolaParlamento', Procon: 'procon',
};

export function canUseAppModule(settings, role, moduleId, email) {
  return isModuleActiveInApp(settings, moduleId)
    && hasSurfacePermission(settings, role, moduleId, 'app', email);
}

export function canUseModule(settings, role, moduleId, email) {
  if (!moduleId) return true;
  return canUseAppModule(settings, role, moduleId, email) || canUseAdminAppModule(settings, role, moduleId, email);
}

export function canUseAdminAppModule(settings, role, moduleId, email) {
  if (!moduleId) return true;
  if (!isModuleActiveInApp(settings, moduleId) || settings?.modules?.[moduleId]?.adminApp !== true) return false;
  if ((!role || role === 'Cidadão') && !isSystemRootEmail(settings, email)) return false;
  return hasSurfacePermission(settings, role, moduleId, 'adminApp', email);
}

export function moduleForScreen(name, params) {
  if (name === 'MeusAtendimentos') {
    const source = params?.source;
    if (source === 'ouvidoria') return 'ouvidoria';
    if (source === 'procuradoria-mulher') return 'procuradoria';
    if (source === 'balcao-cidadao') return 'balcao';
    return null;
  }
  return SCREEN_MODULES[name] || null;
}

// The portal may publish a different destination for an authorized role while
// keeping the same module in Home and Services. Missing routes intentionally
// fall back to the citizen destination until the mobile admin screen exists.
export function routeForModule(settings, role, moduleId, citizenRoute, email) {
  const configured = settings?.security?.roleRoutes?.[role || 'Cidadão']?.[moduleId];
  if (typeof configured === 'string' && ADMIN_ROUTE_MODULES[configured.trim()] === moduleId
    && canUseAdminAppModule(settings, role, moduleId, email)) return configured.trim();
  const defaultAdminRoutes = {
  protocolo: 'AdminProtocolo', contratos: 'AdminContratos', almoxarifado: 'AdminAlmoxarifado', patrimonio: 'AdminPatrimonio', manutencao: 'AdminManutencao', frotas: 'AdminFrotas', recepcao: 'AdminRecepcao', balcao: 'AdminBalcao', ouvidoria: 'AdminOuvidoria', procuradoria: 'AdminProcuradoria',
    mensagens: 'AdminMensagens', noticias: 'AdminNoticias', tvCamara: 'AdminTvCamara', avaliacoes: 'AdminAvaliacoes',
    vereadores: 'AdminVereadores', agendaVereadores: 'AdminGabinete', legislativo: 'AdminLegislativo', esic: 'AdminEsic',
    microempreendedor: 'AdminMicroempreendedor', juridico: 'AdminJuridico', piel: 'AdminPiel', escolaParlamento: 'AdminEscolaParlamento', procon: 'AdminProcon',
  };
  const defaultAdminRoute = defaultAdminRoutes[moduleId];
  if (defaultAdminRoute && canUseAdminAppModule(settings, role, moduleId, email)) return defaultAdminRoute;
  if (ADMIN_SERVICE_MODULES.has(moduleId)) return null;
  if (CITIZEN_ROUTE_MODULES[citizenRoute] && CITIZEN_ROUTE_MODULES[citizenRoute] !== moduleId) return null;
  return citizenRoute;
}
