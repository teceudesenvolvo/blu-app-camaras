import { Ionicons } from '@expo/vector-icons';
import styled from 'styled-components/native';
import {
  PortalBackground,
  PortalIconBadge,
  PortalScreenHeader,
} from '../components/PortalScaffold';
import { portalTheme } from '../styles/portalTheme';
import { useMobileModules } from '../context/MobileModulesContext';

const Content = styled.ScrollView`
  flex: 1;
`;

const Inner = styled.View`
  padding: 18px 20px 120px;
`;

const ListLabel = styled.Text`
  font-size: 14px;
  color: ${({ theme }) => theme.portal.muted};
  margin-bottom: 12px;
  line-height: 20px;
`;

const ServiceItem = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }) => theme.portal.card};
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 12px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
`;

const ServiceInfo = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const ServiceText = styled.Text`
  font-size: 15px;
  font-weight: 900;
  color: ${({ theme }) => theme.portal.text};
`;

const ServiceDesc = styled.Text`
  margin-top: 3px;
  font-size: 12px;
  color: ${({ theme }) => theme.portal.muted};
`;

const SERVICES = [
  { module: 'ouvidoria', screen: 'OuvidoriaMunicipal', icon: 'chatbubbles-outline', title: 'Ouvidoria', description: 'Manifestações e acompanhamento.' },
  { module: 'balcao', screen: 'BalcaoCidadao', icon: 'people-outline', title: 'Balcão do Cidadão', description: 'Solicitações e agendamentos.' },
  { module: 'microempreendedor', screen: 'Microempreendedor', icon: 'briefcase-outline', title: 'Microempreendedor', description: 'Orientação para seu negócio.' },
  { module: 'procuradoria', screen: 'Procuradoria', icon: 'heart-outline', title: 'Procuradoria da Mulher', description: 'Acolhimento e solicitações.' },
  { module: 'esic', screen: 'Esic', icon: 'document-text-outline', title: 'e-SIC', description: 'Acesso à informação e recursos.' },
  { module: 'mensagens', screen: 'Mensagens', icon: 'chatbox-outline', title: 'Mensagens', description: 'Converse com as equipes da Câmara.' },
  { module: 'avaliacoes', screen: 'Avaliacoes', icon: 'star-outline', title: 'Avaliações', description: 'Avalie atendimentos concluídos.' },
  { module: 'piel', screen: 'Piel', icon: 'id-card-outline', title: 'PIEL', description: 'Programa de integração do Legislativo.' },
  { module: 'vereadores', screen: 'Vereadores', icon: 'person-outline', title: 'Vereadores', description: 'Conheça os parlamentares.' },
  { module: 'noticias', screen: 'Noticias', icon: 'newspaper-outline', title: 'Notícias', description: 'Publicações da Câmara.' },
  { module: 'tvCamara', screen: 'TvCamara', icon: 'tv-outline', title: 'TV Câmara', description: 'Vídeos e transmissões.' },
  { module: 'protocolo', screen: 'Protocolo', icon: 'folder-open-outline', title: 'Protocolo e Processos', description: 'Acompanhe processos e pendências.' },
  { module: 'agendaVereadores', screen: 'GabineteVereador', icon: 'calendar-outline', title: 'Gabinete Vereador', description: 'Demandas e agenda do gabinete.' },
  { module: 'juridico', screen: 'AtendimentoJuridico', icon: 'briefcase-outline', title: 'Atendimento Jurídico', description: 'Orientações e solicitações jurídicas.' },
  { module: 'escolaParlamento', screen: 'EscolaParlamento', icon: 'school-outline', title: 'Escola do Parlamento', description: 'Cursos e formação legislativa.' },
  { module: 'procon', screen: 'Procon', icon: 'shield-checkmark-outline', title: 'PROCON', description: 'Reclamações e agendamentos.' },
];

export default function AtendimentosScreen({ navigation }) {
  const { canUse } = useMobileModules();
  const available = SERVICES.filter(service => canUse(service.module));
  return (
    <PortalBackground>
      <PortalScreenHeader
        navigation={navigation}
        title="Serviços"
        eyebrow="Atendimento digital"
        subtitle="Acesse serviços públicos, solicitações e acompanhe seus atendimentos."
        canGoBack={false}
      />

      <Content showsVerticalScrollIndicator={false}>
        <Inner>
          <ListLabel>Serviços disponíveis</ListLabel>
          {available.length === 0 ? <ListLabel>Nenhum serviço está disponível no momento.</ListLabel> : available.map(service => (
            <ServiceItem key={service.module} onPress={() => navigation.navigate(service.screen)} activeOpacity={0.78} accessibilityRole="button">
              <PortalIconBadge>
                <Ionicons name={service.icon} size={22} color={portalTheme.primary} />
              </PortalIconBadge>
              <ServiceInfo>
                <ServiceText>{service.title}</ServiceText>
                <ServiceDesc>{service.description}</ServiceDesc>
              </ServiceInfo>
              <Ionicons name="chevron-forward" size={20} color={portalTheme.subtle} />
            </ServiceItem>
          ))}
        </Inner>
      </Content>
    </PortalBackground>
  );
}
