import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useContext, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import {
  PortalBackground,
  PortalCard,
  PortalIconBadge,
  PortalScreenHeader,
} from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';
import { portalGradients, portalTheme } from '../styles/portalTheme';
import Constants from 'expo-constants';

const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const ContentContainer = styled.ScrollView`
  flex: 1;
  padding: 18px 20px;
`;

const PanicButton = styled.TouchableOpacity`
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 13px;
  shadow-color: #dc2626;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.22;
  shadow-radius: 14px;
  elevation: 4;
`;

const PanicGradient = styled(LinearGradient).attrs({
  colors: ['#ef4444', '#dc2626', '#991b1b'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
})`
  min-height: 54px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const WomanButton = styled.TouchableOpacity`
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
`;

const WomanGradient = styled(LinearGradient).attrs({
  colors: portalGradients.woman,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
})`
  min-height: 52px;
  align-items: center;
  justify-content: center;
`;

const ButtonText = styled.Text`
  color: #fff;
  font-size: 15px;
  font-weight: 900;
  margin-left: ${props => props.withIcon ? '9px' : '0px'};
`;

const InfoTitle = styled.Text`
  font-size: 17px;
  font-weight: 900;
  color: #9d174d;
  margin-bottom: 10px;
`;

const InfoText = styled.Text`
  font-size: 14px;
  color: ${portalTheme.muted};
  line-height: 21px;
`;

const HistoryCard = styled.TouchableOpacity`
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-top: 18px;
  margin-bottom: 130px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${portalTheme.border};
`;

const HistoryInfo = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const HistoryTitle = styled.Text`
  color: ${portalTheme.text};
  font-size: 15px;
  font-weight: 900;
`;

const HistorySubtitle = styled.Text`
  margin-top: 3px;
  color: ${portalTheme.muted};
  font-size: 12px;
`;

const FAB = styled.TouchableOpacity`
  position: absolute;
  right: 20px;
  bottom: 120px;
  width: 60px;
  height: 60px;
  border-radius: 30px;
  overflow: hidden;
  elevation: 5;
  shadow-color: #db2777;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.26;
  shadow-radius: 14px;
`;

const FabGradient = styled(LinearGradient).attrs({
  colors: portalGradients.woman,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
})`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export default function ProcuradoriaScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [panicLoading, setPanicLoading] = useState(false);

  const handlePanic = async () => {
    Alert.alert(
      "CONFIRMAR ALERTA",
      "Você tem certeza que deseja acionar o botão do pânico? Isso enviará sua localização para o seu contato de confiança.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "SIM, ENVIAR",
          onPress: async () => {
            setPanicLoading(true);
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert("Erro", "Permissão de localização negada. O alerta não pôde ser enviado.");
                return;
              }

              const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
              let address = "Localização via GPS";

              try {
                const reverse = await Location.reverseGeocodeAsync({
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                });
                if (reverse && reverse.length > 0) {
                  const item = reverse[0];
                  address = `${item.street}, ${item.name} - ${item.subregion}`;
                }
              } catch (e) {
                console.log('Erro reverse geocode', e);
              }

              await addDoc(collection(firestore, 'panic-alerts'), {
                flavorId,
                userId: user.uid,
                lat: location.coords.latitude,
                lng: location.coords.longitude,
                address,
                timestamp: serverTimestamp(),
              });

              Alert.alert("ENVIADO", "Seu pedido de socorro foi enviado com sucesso para o seu contato de confiança.");
            } catch (error) {
              console.error(error);
              Alert.alert("Erro", "Houve um problema ao acionar o pânico. Tente novamente.");
            } finally {
              setPanicLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <PortalBackground>
      <PortalScreenHeader
        navigation={navigation}
        title="Procuradoria da Mulher"
        subtitle="Canal de orientação, denúncia e defesa dos direitos das mulheres."
      />

      <ContentContainer showsVerticalScrollIndicator={false}>
        <PanicButton activeOpacity={0.86} onPress={handlePanic} disabled={panicLoading}>
          <PanicGradient>
            {panicLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="shield-alert-outline" size={24} color="#fff" />
                <ButtonText withIcon>Botão do Pânico</ButtonText>
              </>
            )}
          </PanicGradient>
        </PanicButton>

        <WomanButton activeOpacity={0.86} onPress={() => navigation.navigate('ContatoConfianca')}>
          <WomanGradient>
            <ButtonText>Gerenciar Contato de Confiança</ButtonText>
          </WomanGradient>
        </WomanButton>

        <PortalCard>
          <InfoTitle>O que é a Procuradoria da Mulher?</InfoTitle>
          <InfoText>
            A Procuradoria da Mulher é um órgão do Poder Legislativo que atua na defesa dos direitos das mulheres, combatendo a violência e a discriminação de gênero. Ela oferece acolhimento, orientação e encaminhamento para os serviços da rede de proteção.
          </InfoText>
        </PortalCard>

        <HistoryCard onPress={() => navigation.navigate('MeusAtendimentos', { source: 'procuradoria-mulher' })}>
          <PortalIconBadge>
            <MaterialCommunityIcons name="history" size={22} color={portalTheme.primary} />
          </PortalIconBadge>
          <HistoryInfo>
            <HistoryTitle>Meus Atendimentos</HistoryTitle>
            <HistorySubtitle>Ver histórico de solicitações</HistorySubtitle>
          </HistoryInfo>
          <MaterialCommunityIcons name="chevron-right" size={22} color={portalTheme.subtle} />
        </HistoryCard>
      </ContentContainer>

      <FAB activeOpacity={0.86} onPress={() => navigation.navigate('ProcuradoriaSolicitacao')}>
        <FabGradient>
          <MaterialCommunityIcons name="plus" size={30} color="#fff" />
        </FabGradient>
      </FAB>
    </PortalBackground>
  );
}
