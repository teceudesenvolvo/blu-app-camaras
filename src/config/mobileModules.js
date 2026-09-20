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
  AvaliarAtendimento: 'avaliacoes',
  Esic: 'esic',
  Microempreendedor: 'microempreendedor',
  Avaliacoes: 'avaliacoes',
  Protocolo: 'protocolo',
  GabineteVereador: 'agendaVereadores',
  EscolaParlamento: 'escolaParlamento',
  Procon: 'procon',
};

export function canUseModule(settings, role, moduleId) {
  if (!moduleId) return true;
  if (settings?.modules?.[moduleId]?.app === false) return false;
  const configured = settings?.security?.rolePermissions?.[role || 'Cidadão']?.[moduleId]?.app;
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
