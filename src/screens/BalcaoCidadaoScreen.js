import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
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
  padding: 18px 20px 34px;
`;

const IntroText = styled.Text`
  font-size: 14px;
  color: ${portalTheme.muted};
  margin-bottom: 18px;
  line-height: 21px;
`;

const ServiceCard = styled.TouchableOpacity`
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 13px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${portalTheme.border};
`;

const ServiceInfo = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const ServiceTitle = styled.Text`
  font-size: 15px;
  font-weight: 900;
  color: ${portalTheme.text};
  margin-bottom: 4px;
`;

const ServiceDesc = styled.Text`
  font-size: 12px;
  color: ${portalTheme.muted};
  line-height: 17px;
`;

const OutlineButton = styled.TouchableOpacity`
  min-height: 50px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${portalTheme.border};
  background-color: rgba(255, 255, 255, 0.75);
  margin-top: 4px;
`;

export default function BalcaoCidadaoScreen({ navigation }) {
  const services = [
    { id: '1', title: 'Emissão de Documentos', desc: 'Agende serviços de identidade, CPF, passe livre e outros documentos.', icon: 'card-outline' },
    { id: '2', title: 'Informações Gerais', desc: 'Tire dúvidas sobre serviços públicos e locais de atendimento.', icon: 'information-circle-outline' },
  ];

  return (
    <PortalBackground>
      <PortalScreenHeader
        navigation={navigation}
        title="Balcão do Cidadão"
        subtitle="Solicite documentos e agende atendimentos de forma rápida."
      />

      <Content showsVerticalScrollIndicator={false}>
        <Inner>
          <PortalCard>
            <IntroText>Selecione o serviço desejado para iniciar seu atendimento.</IntroText>

            {services.map((service) => (
              <ServiceCard
                key={service.id}
                activeOpacity={0.78}
                onPress={() => navigation.navigate('BalcaoSolicitacao', { serviceName: service.title })}
              >
                <PortalIconBadge>
                  <Ionicons name={service.icon} size={22} color={portalTheme.primary} />
                </PortalIconBadge>
                <ServiceInfo>
                  <ServiceTitle>{service.title}</ServiceTitle>
                  <ServiceDesc>{service.desc}</ServiceDesc>
                </ServiceInfo>
                <Ionicons name="chevron-forward" size={20} color={portalTheme.subtle} />
              </ServiceCard>
            ))}

            <OutlineButton onPress={() => navigation.navigate('MeusAtendimentos', { source: 'balcao-cidadao' })}>
              <Text style={{ color: portalTheme.primary, fontWeight: '900' }}>Ver Meus Atendimentos</Text>
            </OutlineButton>
          </PortalCard>
        </Inner>
      </Content>
    </PortalBackground>
  );
}
