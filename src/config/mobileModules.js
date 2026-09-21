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
  'contratos', 'almoxarifado', 'patrimonio', 'manutencao', 'frotas', 'recepcao',
]);

export function canUseModule(settings, role, moduleId) {
  if (!moduleId) return true;
  if (settings?.modules?.[moduleId]?.app === false) return false;
  const configured = settings?.security?.rolePermissions?.[role || 'Cidadão']?.[moduleId]?.app;
  return configured !== false;
}

export function canUseAdminAppModule(settings, role, moduleId) {
  if (!moduleId) return true;
  if (settings?.modules?.[moduleId]?.adminApp === false) return false;
  if (!role || role === 'Cidadão') return false;
  const configured = settings?.security?.rolePermissions?.[role || 'Cidadão']?.[moduleId]?.adminApp;
  return configured !== false;
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
export function routeForModule(settings, role, moduleId, citizenRoute) {
  const configured = settings?.security?.roleRoutes?.[role || 'Cidadão']?.[moduleId];
  if (typeof configured === 'string' && configured.trim() && canUseAdminAppModule(settings, role, moduleId)) return configured.trim();
  const defaultAdminRoutes = {
  protocolo: 'AdminProtocolo', contratos: 'AdminContratos', almoxarifado: 'AdminAlmoxarifado', patrimonio: 'AdminPatrimonio', manutencao: 'AdminManutencao', frotas: 'AdminFrotas', recepcao: 'AdminRecepcao', balcao: 'AdminBalcao', ouvidoria: 'AdminOuvidoria', procuradoria: 'AdminProcuradoria',
    mensagens: 'AdminMensagens', noticias: 'AdminNoticias', tvCamara: 'AdminTvCamara', avaliacoes: 'AdminAvaliacoes',
    vereadores: 'AdminVereadores', agendaVereadores: 'AdminGabinete', legislativo: 'AdminLegislativo', esic: 'AdminEsic',
    microempreendedor: 'AdminMicroempreendedor', juridico: 'AdminJuridico', piel: 'AdminPiel', escolaParlamento: 'AdminEscolaParlamento', procon: 'AdminProcon',
  };
  const defaultAdminRoute = defaultAdminRoutes[moduleId];
  if (defaultAdminRoute && canUseAdminAppModule(settings, role, moduleId)) return defaultAdminRoute;
  return citizenRoute;
}
