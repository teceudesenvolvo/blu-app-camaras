import { Ionicons } from '@expo/vector-icons';
import styled from 'styled-components/native';
import {
  PortalBackground,
  PortalCard,
  PortalIconBadge,
  PortalScreenHeader,
} from '../components/PortalScaffold';
import { portalTheme } from '../styles/portalTheme';

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

const OutlineButton = styled.TouchableOpacity`
  min-height: 50px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  background-color: rgba(255, 255, 255, 0.75);
  margin-top: 8px;
`;

const OutlineButtonText = styled.Text`
  color: ${({ theme }) => theme.portal.primary};
  font-weight: 900;
`;

export default function AtendimentosScreen({ navigation }) {
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
          <PortalCard>
            <ListLabel>Serviço disponível:</ListLabel>

            <ServiceItem onPress={() => navigation.navigate('OuvidoriaMunicipal')} activeOpacity={0.78}>
              <PortalIconBadge>
                <Ionicons name="chatbubbles-outline" size={22} color={portalTheme.primary} />
              </PortalIconBadge>
              <ServiceInfo>
                <ServiceText>Ouvidoria Municipal</ServiceText>
                <ServiceDesc>Envie manifestações, sugestões e acompanhe retornos.</ServiceDesc>
              </ServiceInfo>
              <Ionicons name="chevron-forward" size={20} color={portalTheme.subtle} />
            </ServiceItem>

            <OutlineButton onPress={() => navigation.navigate('MeusAtendimentos', { source: 'ouvidoria' })}>
              <OutlineButtonText>Ver Meus Atendimentos</OutlineButtonText>
            </OutlineButton>
          </PortalCard>
        </Inner>
      </Content>
    </PortalBackground>
  );
}
