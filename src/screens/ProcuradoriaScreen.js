import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { getDatabase, push, ref, serverTimestamp } from 'firebase/database';
import { useContext, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import app from '../../services/firebaseConfig';
import { AuthContext } from '../context/AuthContext';

const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';
const db = getDatabase(app);

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const secondaryColor = Constants.expoConfig?.extra?.theme?.secondary || '#f9c204';
const { width } = Dimensions.get('window');

const Container = styled.View`
  flex: 1;
  background-color: #fcf4f8; /* Light pink background */
`;

const Header = styled.View`
  padding: 20px;
  padding-top: 60px;
  align-items: center;
  justify-content: center;
`;

const HeaderTitle = styled.Text`
  color: #333;
  font-size: 18px;
  font-weight: bold;
`;

const ContentContainer = styled.ScrollView`
  flex: 1;
  padding: 20px;
`;

const ButtonPanic = styled.TouchableOpacity`
  background-color: #dc2626;
  border-radius: 12px;
  padding: 15px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
`;

const ButtonPanicText = styled.Text`
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin-left: 10px;
`;

const ButtonPink = styled.TouchableOpacity`
  background-color: #f472b6;
  border-radius: 12px;
  padding: 15px;
  align-items: center;
  justify-content: center;
  margin-bottom: 25px;
`;

const CardInfo = styled.View`
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
  elevation: 2;
  shadow-color: '#000';
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
`;

const CardTitle = styled.Text`
  font-size: 16px;
  font-weight: 800;
  color: #9d174d; /* Dark Pink */
  margin-bottom: 10px;
`;

const CardText = styled.Text`
  font-size: 14px;
  color: #555;
  line-height: 20px;
`;

const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
`;

const EmptyCard = styled.View`
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 100px; /* Space for BottomBar */
  elevation: 1;
`;

const EmptyText = styled.Text`
  color: #666;
  font-size: 14px;
`;

const FAB = styled.TouchableOpacity`
  position: absolute;
  right: 20px;
  bottom: 120px;
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background-color: #a21caf; /* Purple */
  justify-content: center;
  align-items: center;
  elevation: 5;
  shadow-color: #a21caf;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 6px;
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
              // 1. Pedir permissão de localização
              let { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert("Erro", "Permissão de localização negada. O alerta não pôde ser enviado.");
                return;
              }

              // 2. Obter posição atual
              let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

              // 3. (Opcional) Reverse Geocode para endereço amigável
              let address = "Localização via GPS";
              try {
                let reverse = await Location.reverseGeocodeAsync({
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude
                });
                if (reverse && reverse.length > 0) {
                  const item = reverse[0];
                  address = `${item.street}, ${item.name} - ${item.subregion}`;
                }
              } catch (e) { console.log('Erro reverse geocode', e); }

              // 4. Salvar no Firebase para disparar a Cloud Function
              const panicRef = ref(db, `${flavorId}/panic-alerts/${user.uid}`);
              await push(panicRef, {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
                address: address,
                timestamp: serverTimestamp()
              });

              Alert.alert("ENVIADO", "Seu pedido de socorro foi enviado com sucesso para o seu contato de confiança.");
            } catch (error) {
              console.error(error);
              Alert.alert("Erro", "Houve um problema ao acionar o pânico. Tente novamente.");
            } finally {
              setPanicLoading(false);
            }
          }
        }
      ]
    );
  };
  return (
    <Container>
      <Header>
        <HeaderTitle>Procuradoria da Mulher</HeaderTitle>
      </Header>

      <ContentContainer showsVerticalScrollIndicator={false}>
        <ButtonPanic activeOpacity={0.8} onPress={handlePanic} disabled={panicLoading}>
          {panicLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="shield-alert-outline" size={24} color="#fff" />
              <ButtonPanicText>Botão do Pânico</ButtonPanicText>
            </>
          )}
        </ButtonPanic>

        <ButtonPink activeOpacity={0.8} onPress={() => navigation.navigate('ContatoConfianca')}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Gerenciar Contato de Confiança</Text>
        </ButtonPink>

        <CardInfo>
          <CardTitle>O que é a Procuradoria da Mulher?</CardTitle>
          <CardText>
            A Procuradoria da Mulher é um órgão do Poder Legislativo que atua na defesa dos direitos das mulheres, combatendo a violência e a discriminação de gênero. Ela oferece acolhimento, orientação e encaminhamento para os serviços da rede de proteção.
          </CardText>
        </CardInfo>

        <TouchableOpacity onPress={() => navigation.navigate('MeusAtendimentos', { source: 'procuradoria-mulher' })}>
          <SectionTitle>Meus Atendimentos</SectionTitle>
          <EmptyCard>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <EmptyText>Ver histórico de solicitações</EmptyText>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
            </View>
          </EmptyCard>
        </TouchableOpacity>
      </ContentContainer>

      <FAB activeOpacity={0.8} onPress={() => navigation.navigate('ProcuradoriaSolicitacao')}>
        <MaterialCommunityIcons name="plus" size={30} color="#fff" />
      </FAB>
    </Container>
  );
}
