import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { PortalBackground, PortalCard, PortalScreenHeader } from '../components/PortalScaffold';
import { useMobileModules } from '../context/MobileModulesContext';

const Content = styled(ScrollView)`
  flex: 1;
  padding: 18px;
`;
const IntroCard = styled(PortalCard)` margin-bottom: 14px;`;
const Intro = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 15px;
  line-height: 22px;
`;
const PermissionCard = styled(PortalCard)` margin-bottom: 14px;`;
const PermissionTitle = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 15px;
  font-weight: 900;
  margin: 8px 0;
`;
const PermissionText = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 13px;
  line-height: 20px;
`;
const ActionGrid = styled.View`flex-direction: row; flex-wrap: wrap; justify-content: space-between;`;
const ActionCard = styled(TouchableOpacity)`width: 48%; min-height: 92px; padding: 14px; margin-bottom: 12px; border-radius: 14px; background-color: ${({ theme }) => theme.portal.card}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const ActionTitle = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 14px; font-weight: 900; margin-top: 9px;`;
const ActionDescription = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 11px; line-height: 15px; margin-top: 4px;`;

const MODULES = {
  protocolo: ['Protocolo e Processos', 'protocolos e tramitações'], balcao: ['Balcão do Cidadão', 'solicitações e atendimentos'],
  ouvidoria: ['Ouvidoria', 'manifestações e respostas'], procuradoria: ['Procuradoria da Mulher', 'acolhimentos e solicitações'],
  mensagens: ['Mensagens', 'conversas com cidadãos'], noticias: ['Notícias', 'publicações institucionais'],
  tvCamara: ['TV Câmara', 'vídeos e transmissões'], avaliacoes: ['Avaliações', 'avaliações de atendimento'],
  vereadores: ['Vereadores', 'parlamentares e gabinetes'], agendaVereadores: ['Gabinete Vereador', 'demandas e agenda'],
  legislativo: ['Gestão Legislativa', 'matérias, sessões e comissões'], esic: ['e-SIC', 'pedidos de acesso à informação'],
  microempreendedor: ['Microempreendedor', 'solicitações de empreendedores'], juridico: ['Atendimento Jurídico', 'orientações e solicitações'],
  piel: ['PIEL', 'participantes e atividades'], contratos: ['Fiscalização de Contratos', 'execução e acompanhamento contratual'], almoxarifado: ['Almoxarifado', 'materiais, depósitos e requisições'], patrimonio: ['Patrimônio', 'bens, movimentações e inventários'], manutencao: ['Manutenção Patrimonial', 'chamados, ordens e planos preventivos'], frotas: ['Gestão de Frotas', 'veículos, condutores e custos'], escolaParlamento: ['Escola do Parlamento', 'cursos e materiais'], procon: ['PROCON', 'atendimentos e consumidores'], recepcao: ['Recepção', 'confirmação de agendamentos'],
};

const MODULE_ACTIONS = {
  protocolo: [['clipboard-text-outline', 'Protocolos', 'Consultar e acompanhar tramitações.'], ['file-document-outline', 'Documentos', 'Consultar documentos vinculados.']],
  ouvidoria: [['message-alert-outline', 'Manifestações', 'Consultar manifestações recebidas.'], ['filter-variant', 'Pendências', 'Filtrar itens aguardando resposta.']],
  procuradoria: [['account-heart-outline', 'Solicitações', 'Consultar acolhimentos e solicitações.'], ['shield-check-outline', 'Atendimentos', 'Acompanhar status e encaminhamentos.']],
  mensagens: [['message-text-outline', 'Conversas', 'Consultar conversas com cidadãos.'], ['bell-outline', 'Pendências', 'Localizar mensagens não respondidas.']],
  noticias: [['newspaper-variant-outline', 'Publicações', 'Consultar notícias publicadas.'], ['file-edit-outline', 'Rascunhos', 'Revisar conteúdos em edição.']],
  vereadores: [['account-group-outline', 'Parlamentares', 'Consultar cadastro dos vereadores.'], ['calendar-account-outline', 'Gabinetes', 'Acompanhar demandas e agenda.']],
  legislativo: [['gavel', 'Matérias', 'Consultar matérias legislativas.'], ['calendar-outline', 'Sessões', 'Consultar sessões e eventos.']],
  esic: [['file-search-outline', 'Pedidos', 'Consultar pedidos de informação.'], ['reply-outline', 'Respostas', 'Acompanhar respostas e recursos.']],
};

const ROUTE_MODULES = {
  AdminProtocolo: 'protocolo', AdminBalcao: 'balcao', AdminOuvidoria: 'ouvidoria', AdminProcuradoria: 'procuradoria',
  AdminMensagens: 'mensagens', AdminNoticias: 'noticias', AdminTvCamara: 'tvCamara', AdminAvaliacoes: 'avaliacoes',
  AdminVereadores: 'vereadores', AdminGabinete: 'agendaVereadores', AdminLegislativo: 'legislativo', AdminEsic: 'esic',
  AdminMicroempreendedor: 'microempreendedor', AdminJuridico: 'juridico', AdminPiel: 'piel', AdminContratos: 'contratos', AdminAlmoxarifado: 'almoxarifado', AdminPatrimonio: 'patrimonio', AdminManutencao: 'manutencao', AdminFrotas: 'frotas', AdminEscolaParlamento: 'escolaParlamento', AdminProcon: 'procon', AdminRecepcao: 'recepcao',
};

export const ADMIN_ROUTE_MODULES = ROUTE_MODULES;

export default function AdminModuleScreen({ navigation, route }) {
  const { role, canUseAdminApp } = useMobileModules();
  const moduleId = ROUTE_MODULES[route.name] || route.params?.moduleId || 'protocolo';
  const [title, subject] = MODULES[moduleId] || ['Administração', 'recursos administrativos'];
  const actions = MODULE_ACTIONS[moduleId] || [['view-grid-outline', 'Registros', `Consultar ${subject}.`], ['filter-variant', 'Filtros', 'Filtrar registros por situação e período.']];
  if (!canUseAdminApp(moduleId)) return <PortalBackground><PortalScreenHeader navigation={navigation} title="Acesso indisponível" /><PermissionCard><PermissionText>Seu perfil não possui acesso administrativo a este módulo.</PermissionText></PermissionCard></PortalBackground>;
  return <PortalBackground>
    <PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title={title} subtitle={`Gerencie ${subject}.`} />
    <Content contentContainerStyle={{ paddingBottom: 36 }}>
      <IntroCard><Intro>Você está acessando esta área como {role || 'usuário autorizado'}. As ações exibidas devem respeitar as permissões publicadas pelo Controle do Sistema.</Intro></IntroCard>
      <PermissionCard><MaterialCommunityIcons name="shield-check-outline" size={28} color="#025AA1" /><PermissionTitle>Permissões do módulo</PermissionTitle><PermissionText>Esta área está preparada para receber consultas, filtros, encaminhamentos, alterações de status e as ações administrativas do módulo.</PermissionText></PermissionCard>
      <PermissionTitle>Operações disponíveis</PermissionTitle>
      <ActionGrid>{actions.map(([icon, label, description]) => <ActionCard key={label} activeOpacity={0.8}><MaterialCommunityIcons name={icon} size={24} color="#0284C7" /><ActionTitle>{label}</ActionTitle><ActionDescription>{description}</ActionDescription></ActionCard>)}</ActionGrid>
    </Content>
  </PortalBackground>;
}
