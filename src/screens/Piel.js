import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import styled from 'styled-components/native';

import { collection, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig';
import {
  PortalBackground,
  PortalCard,
  PortalIconBadge,
  PortalScreenHeader,
} from '../components/PortalScaffold';
import { portalTheme } from '../styles/portalTheme';

const RetryButton = styled.TouchableOpacity`
  margin-top: 15px;
  padding: 12px 18px;
  background-color: ${portalTheme.primary};
  border-radius: 12px;
`;

const HeroCard = styled(PortalCard)`
  margin: 18px 20px 8px;
  flex-direction: row;
  align-items: center;
`;

const HeroText = styled.View`
  flex: 1;
  margin-left: 13px;
`;

const HeroTitle = styled.Text`
  font-size: 18px;
  font-weight: 900;
  color: ${portalTheme.text};
`;

const HeroSubtitle = styled.Text`
  margin-top: 5px;
  font-size: 13px;
  color: ${portalTheme.muted};
  line-height: 18px;
`;

const InfoCard = styled(PortalCard)`
  margin: 10px 20px;
  padding: 20px;
`;

const CardTitle = styled.Text`
  font-size: 17px;
  font-weight: 900;
  color: ${portalTheme.text};
`;

const CardBody = styled.Text`
  margin-top: 12px;
  font-size: 14px;
  color: ${portalTheme.muted};
  line-height: 22px;
`;

const DateText = styled.Text`
  font-size: 12px;
  color: ${portalTheme.subtle};
  margin-top: 15px;
  text-align: right;
  font-weight: 700;
`;

export default function PielScreen({ navigation }) {
  const [informativos, setInformativos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    setLoading(true);
    const pielCollectionRef = collection(firestore, 'piel');

    const unsubscribe = onSnapshot(pielCollectionRef, (snapshot) => {
      setErrorState(null);
      const fetchedInformativos = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const timestamp = data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : (data.createdAt ? new Date(data.createdAt).getTime() : (data.migratedAt ? new Date(data.migratedAt).getTime() : 0));

        return {
          id: docSnap.id,
          ...data,
          timestamp,
        };
      }).sort((a, b) => b.timestamp - a.timestamp);

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
    <InfoCard>
      <CardTitle>{item.title}</CardTitle>
      <CardBody>{item.content}</CardBody>
      {item.timestamp > 0 && (
        <DateText>
          Publicado em: {new Date(item.timestamp).toLocaleDateString('pt-BR')}
        </DateText>
      )}
    </InfoCard>
  );

  return (
    <PortalBackground>
      <PortalScreenHeader
        navigation={navigation}
        title="PIEL"
        subtitle="Informativos sobre título eleitoral, votação e serviços relacionados."
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={portalTheme.primary} />
        </View>
      ) : (
        <FlatList
          data={informativos}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            (!errorState || informativos.length > 0) && (
              <HeroCard>
                <PortalIconBadge size="50px" radius="25px">
                  <MaterialCommunityIcons name="card-account-details-outline" size={25} color={portalTheme.primary} />
                </PortalIconBadge>
                <HeroText>
                  <HeroTitle>Ponto de Inclusão Eleitoral</HeroTitle>
                  <HeroSubtitle>Consulte os informativos publicados pela Câmara.</HeroSubtitle>
                </HeroText>
              </HeroCard>
            )
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ color: errorState ? portalTheme.danger : portalTheme.muted, textAlign: 'center' }}>
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
    </PortalBackground>
  );
}
