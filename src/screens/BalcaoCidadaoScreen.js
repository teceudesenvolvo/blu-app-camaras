import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Text, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const backgroundColor = Constants.expoConfig?.extra?.theme?.background || '#f0f2f5';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${backgroundColor};
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 50px 20px 20px 20px;
  background-color: #fff;
`;

const BackButton = styled.TouchableOpacity`
  padding: 5px;
`;

const HeaderTitle = styled.Text`
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #111;
  margin-right: 30px;
`;

const ContentContainer = styled.View`
  padding: 20px;
`;

const IntroText = styled.Text`
  font-size: 15px;
  color: #555;
  margin-bottom: 20px;
  line-height: 22px;
`;

const ServiceCard = styled.TouchableOpacity`
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  flex-direction: row;
  align-items: center;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
  elevation: 2;
  border-left-width: 4px;
  border-left-color: ${primaryColor};
`;

const ServiceIconContainer = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${primaryColor}15;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
`;

const ServiceInfo = styled.View`
  flex: 1;
`;

const ServiceTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
`;

const ServiceDesc = styled.Text`
  font-size: 13px;
  color: #777;
`;

export default function BalcaoCidadaoScreen({ navigation }) {
  const services = [
    { id: '1', title: 'Emissão de Documentos', desc: 'Agende serviços de identidade, CPF, passe livre, etc.', icon: 'card-outline' },
    { id: '2', title: 'Informações Gerais', desc: 'Dúvidas sobre serviços públicos e locais de atendimento.', icon: 'information-circle-outline' },
  ];

  return (
    <Container showsVerticalScrollIndicator={false}>
      <HeaderContainer>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </BackButton>
        <HeaderTitle>Balcão do Cidadão</HeaderTitle>
      </HeaderContainer>

      <ContentContainer>
        <IntroText>
          O Balcão do Cidadão oferece suporte rápido para resolução de demandas e serviços essenciais.
          Selecione o serviço desejado:
        </IntroText>

        {services.map((service) => (
          <ServiceCard
            key={service.id}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('BalcaoSolicitacao', { serviceName: service.title })}
          >
            <ServiceIconContainer>
              <Ionicons name={service.icon} size={20} color={primaryColor} />
            </ServiceIconContainer>
            <ServiceInfo>
              <ServiceTitle>{service.title}</ServiceTitle>
              <ServiceDesc>{service.desc}</ServiceDesc>
            </ServiceInfo>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </ServiceCard>
        ))}

        <TouchableOpacity
          onPress={() => navigation.navigate('MeusAtendimentos', { source: 'balcao-cidadao' })}
          style={{ padding: 20, alignItems: 'center', marginTop: 10, backgroundColor: '#fff', borderRadius: 12 }}
        >
          <Text style={{ color: primaryColor, fontWeight: 'bold' }}>Ver Meus Atendimentos</Text>
        </TouchableOpacity>
      </ContentContainer>
    </Container>
  );
}
