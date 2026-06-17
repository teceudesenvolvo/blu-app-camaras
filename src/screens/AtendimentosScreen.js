import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
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

const StepText = styled.Text`
  font-size: 12px;
  color: ${portalTheme.primary};
  font-weight: 900;
  text-transform: uppercase;
  margin-bottom: 14px;
`;

const TabsRow = styled.View`
  flex-direction: row;
  gap: 10px;
`;

const TabButton = styled.TouchableOpacity`
  flex: 1;
  padding: 12px;
  border-radius: 999px;
  border-width: 1px;
  border-color: ${props => props.active ? portalTheme.primary : portalTheme.border};
  background-color: ${props => props.active ? 'rgba(2, 90, 161, 0.10)' : '#fff'};
  align-items: center;
`;

const TabText = styled.Text`
  color: ${props => props.active ? portalTheme.primary : portalTheme.muted};
  font-weight: 900;
  font-size: 13px;
`;

const ListLabel = styled.Text`
  font-size: 14px;
  color: ${portalTheme.muted};
  margin: 22px 0 12px;
  line-height: 20px;
`;

const ServiceItem = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 12px;
  border-width: 1px;
  border-color: ${portalTheme.border};
`;

const ServiceInfo = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const ServiceText = styled.Text`
  font-size: 15px;
  font-weight: 900;
  color: ${portalTheme.text};
`;

const ServiceDesc = styled.Text`
  margin-top: 3px;
  font-size: 12px;
  color: ${portalTheme.muted};
`;

const OutlineButton = styled.TouchableOpacity`
  min-height: 50px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${portalTheme.border};
  background-color: rgba(255, 255, 255, 0.75);
  margin-top: 8px;
`;

const OutlineButtonText = styled.Text`
  color: ${portalTheme.primary};
  font-weight: 900;
`;

export default function AtendimentosScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Serviço Público');

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
            <StepText>Escolha a opção</StepText>
            <TabsRow>
              <TabButton active={activeTab === 'Vereador'} onPress={() => setActiveTab('Vereador')}>
                <TabText active={activeTab === 'Vereador'}>Vereador</TabText>
              </TabButton>
              <TabButton active={activeTab === 'Serviço Público'} onPress={() => setActiveTab('Serviço Público')}>
                <TabText active={activeTab === 'Serviço Público'}>Serviço Público</TabText>
              </TabButton>
            </TabsRow>

            {activeTab === 'Serviço Público' && (
              <View>
                <ListLabel>Selecione o serviço desejado:</ListLabel>

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
              </View>
            )}

            {activeTab === 'Vereador' && (
              <View style={{ marginTop: 22, alignItems: 'center', padding: 18 }}>
                <Text style={{ color: portalTheme.muted }}>Funcionalidade em desenvolvimento.</Text>
              </View>
            )}
          </PortalCard>
        </Inner>
      </Content>
    </PortalBackground>
  );
}
