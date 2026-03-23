import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import styled from 'styled-components/native';

import { getDatabase, ref, onValue, off } from 'firebase/database';
import app from '../../services/firebaseConfig';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Container = styled.View`
  flex: 1;
  background-color: ${props => props.theme.background || '#f4f4f5'};
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

  useEffect(() => {
    const db = getDatabase(app);
    const informativosRef = ref(db, `${flavorId}/piel`);

    onValue(informativosRef, (snapshot) => {
      const data = snapshot.val();

      const fetchedInformativos = data
        ? Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        : [];

      setInformativos(fetchedInformativos);
      setLoading(false);
    });

    // cleanup (IMPORTANTE)
    return () => off(informativosRef);
  }, []);

  const renderItem = ({ item }) => (
    <Card>
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
      </CardHeader>
      <CardBody>{item.content}</CardBody>
      {/* Exibe a data se houver */}
      {item.createdAt && (
        <DateText>
          Publicado em: {new Date(item.createdAt).toLocaleDateString('pt-BR')}
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
            <HeroSection>
              <HeroTitle>Ponto de Inclusão Eleitoral</HeroTitle>
              <HeroSubtitle>Consulte informativos sobre seu título de eleitor, local de votação e mais.</HeroSubtitle>
            </HeroSection>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ color: '#888' }}>Nenhum informativo disponível no momento.</Text>
            </View>
          }
        />
      )}
    </Container>
  );
}
