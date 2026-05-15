import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import styled from 'styled-components/native';

import { collection, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Container = styled.View`
  flex: 1;
  background-color: ${props => props.theme.background || '#f4f4f5'};
`;

const RetryButton = styled.TouchableOpacity`
  margin-top: 15px;
  padding: 10px 20px;
  background-color: ${primaryColor};
  border-radius: 8px;
`;

const Header = styled.View`
  padding: 20px;
  padding-top: 60px;
  background-color: #fff;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-bottom-width: 1px;
  border-bottom-color: #eee;
`;

const HeaderTitle = styled.Text`
  color: #333;
  font-size: 18px;
  font-weight: bold;
`;

const BackButton = styled.TouchableOpacity`
  position: absolute;
  left: 20px;
  top: 60px;
  z-index: 10;
`;

const HeroSection = styled.View`
  padding: 30px 20px;
  background-color: ${primaryColor};
  align-items: center;
  margin-bottom: 10px;
`;

const HeroTitle = styled.Text`
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  text-align: center;
  margin-bottom: 10px;
`;

const HeroSubtitle = styled.Text`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  line-height: 20px;
`;

const Card = styled.View`
  background-color: #fff;
  margin: 10px 20px;
  padding: 25px;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
  elevation: 2;
`;

const CardHeader = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: #eee;
  padding-bottom: 15px;
  margin-bottom: 15px;
`;

const CardTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #1d1d1f;
`;

const CardBody = styled.Text`
  font-size: 15px;
  color: #333;
  line-height: 24px;
`;

const DateText = styled.Text`
  font-size: 12px;
  color: #888;
  margin-top: 15px;
  text-align: right;
`;

export default function PielScreen({ navigation }) {
  const [informativos, setInformativos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    setLoading(true);
    const pielCollectionRef = collection(firestore, 'piel');

    // Busca todos os informativos da collection
    // Ordenação local conforme padrão Web
    const unsubscribe = onSnapshot(pielCollectionRef, (snapshot) => {
      setErrorState(null);
      const fetchedInformativos = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        
        // Normalização de data conforme a versão Web: 
        // Prioriza Timestamp do Firestore, depois strings de data, e por fim o campo 'migratedAt'.
        const timestamp = data.createdAt?.toMillis 
          ? data.createdAt.toMillis() 
          : (data.createdAt ? new Date(data.createdAt).getTime() : (data.migratedAt ? new Date(data.migratedAt).getTime() : 0));

        return {
          id: docSnap.id,
          ...data,
          timestamp
        };
      }).sort((a, b) => b.timestamp - a.timestamp); // Ordenação local por data descrescente

      setInformativos(fetchedInformativos);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching PIEL data from Firestore:", err);
      setErrorState("Não foi possível carregar os informativos. Verifique a configuração do banco de dados.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [retryTrigger]);

  const renderItem = ({ item }) => (
    <Card>
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
      </CardHeader>
      <CardBody>{item.content}</CardBody>
      {/* Exibe a data baseada no timestamp normalizado conforme padrão web */}
      {item.timestamp > 0 && (
        <DateText>
          Publicado em: {new Date(item.timestamp).toLocaleDateString('pt-BR')}
        </DateText>
      )}
    </Card>
  );

  return (
    <Container>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </BackButton>
        <HeaderTitle>PIEL</HeaderTitle>
      </Header>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={informativos}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            (!errorState || informativos.length > 0) && (
              <HeroSection>
                <HeroTitle>Ponto de Inclusão Eleitoral</HeroTitle>
                <HeroSubtitle>Consulte informativos sobre seu título de eleitor, local de votação e mais.</HeroSubtitle>
              </HeroSection>
            )
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ color: errorState ? '#dc2626' : '#888', textAlign: 'center' }}>
                {errorState || "Nenhum informativo disponível no momento."}
              </Text>
              {errorState && (
                <RetryButton onPress={() => setRetryTrigger(prev => prev + 1)}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tentar Novamente</Text>
                </RetryButton>
              )}
            </View>
          }
        />
      )}
    </Container>
  );
}
