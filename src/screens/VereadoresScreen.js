import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import styled from 'styled-components/native';

import { collection, getDocs } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { firestore, storage } from '../../services/firebaseConfig';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Container = styled.View`
  flex: 1;
  background-color: ${props => props.theme.background || '#f8fafc'};
`;

const Header = styled.View`
  padding: 20px;
  padding-top: 60px;
  background-color: #fff;
  flex-direction: row;
  align-items: center;
  justify-content: center;
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

const TopScroller = styled.ScrollView`
  padding: 10px 0;
  background-color: #fff;
  border-bottom-width: 1px;
  border-bottom-color: #f0f0f0;
  max-height: 120px;
`;

const AvatarContainer = styled.TouchableOpacity`
  align-items: center;
  margin: 0 10px;
  width: 70px;
`;

const AvatarRing = styled.View`
  width: 68px;
  height: 68px;
  border-radius: 34px;
  border-width: 2px;
  border-color: ${props => props.selected ? primaryColor : 'transparent'};
  justify-content: center;
  align-items: center;
  margin-bottom: 5px;
`;

const AvatarPhoto = styled.Image`
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background-color: #eee;
`;

const AvatarName = styled.Text`
  font-size: 11px;
  color: #555;
  text-align: center;
  font-weight: ${props => props.selected ? 'bold' : 'normal'};
`;

const DetailsContainer = styled.ScrollView`
  flex: 1;
  padding: 20px;
`;

const GlassCard = styled(BlurView)`
  border-radius: 20px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.8);
  border-width: 1px;
  padding: 20px;
  flex-direction: row;
  margin-bottom: 25px;
  elevation: 3;
`;

const ProfileImage = styled.Image`
  width: 100px;
  height: 120px;
  border-radius: 15px;
  background-color: #ccc;
  margin-right: 15px;
`;

const ProfileInfo = styled.View`
  flex: 1;
  justify-content: center;
`;

const ProfileName = styled.Text`
  font-size: 18px;
  font-weight: 800;
  color: ${primaryColor};
  margin-bottom: 10px;
`;

const ProfileDetail = styled.Text`
  font-size: 14px;
  color: #555;
  margin-bottom: 4px;
`;

const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
`;

const BiographyText = styled.Text`
  font-size: 15px;
  color: #555;
  line-height: 24px;
  text-align: justify;
`;

const getAvatarSource = (source) => {
  if (!source) return require('../../assets/logo.png');
  if (typeof source === 'string') {
    return { uri: source };
  }
  return source;
};

const resolveAvatarUrl = async (avatarUrl) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image')) {
    return avatarUrl;
  }

  try {
    const avatarRef = storageRef(storage, avatarUrl);
    const downloadUrl = await getDownloadURL(avatarRef);
    return downloadUrl;
  } catch (error) {
    console.warn('Unable to resolve avatar URL from Storage:', avatarUrl, error);
    return avatarUrl;
  }
};

export default function VereadoresScreen({ navigation }) {
  const [vereadores, setVereadores] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVereadores = async () => {
      try {
        console.log('📱 Buscando vereadores do Firestore...');
        const vereadoresRef = collection(firestore, 'vereadores');

        // Busca todos os vereadores da collection
        const querySnapshot = await getDocs(vereadoresRef);
        console.log('📊 Total de documentos encontrados:', querySnapshot.size);

        if (!querySnapshot.empty) {
          const data = await Promise.all(querySnapshot.docs.map(async (doc) => {
            const docData = doc.data();
            const resolvedAvatarUrl = await resolveAvatarUrl(docData.avatarUrl || docData.avatarBase64);
            return {
              id: doc.id,
              ...docData,
              resolvedAvatarUrl,
            };
          }));

          const sortedData = data.sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Ordenação local

          setVereadores(sortedData);
          setSelectedId(sortedData[0]?.id);
        } else {
          throw new Error('No database data');
        }

      } catch (error) {
        if (error.message?.includes('requires an index')) {
          console.error("⚠️ Faltando índice no Firestore para Vereadores. Verifique o link no console do terminal.");
        } else {
          console.warn('Error fetching vereadores (fallback):', error);
          console.warn('💡 Dica: Verifique se há documentos na collection "vereadores" ou se o campo "flavorId" existe.');
        }

        const fallback = [
          { id: '1', name: 'FELIPE DE SOUSA RODRIGUES', cargo: 'PRESIDENTE', dataNascimento: '1994-10-20', partido: 'REPUBLICANOS', avatarBase64: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200', biografia: 'Biografia do vereador...' },
          { id: '2', name: 'DR. CLEBER', cargo: 'VEREADOR', dataNascimento: '1980-01-01', partido: 'PT', avatarBase64: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200', biografia: 'Biografia do vereador...' }
        ];

        setVereadores(fallback);
        setSelectedId(fallback[0].id);
      } finally {
        setLoading(false);
      }
    };

    fetchVereadores();
  }, []);

  const selectedVereador = vereadores.find(v => v.id === selectedId);

  return (
    <Container>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </BackButton>
        <HeaderTitle>Vereadores</HeaderTitle>
      </Header>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <>
          {/* Top Scroller for Avatars */}
          <TopScroller horizontal showsHorizontalScrollIndicator={false}>
            {vereadores.map((v) => (
              <AvatarContainer key={v.id} onPress={() => setSelectedId(v.id)}>
                <AvatarRing selected={selectedId === v.id}>
                  <AvatarPhoto source={getAvatarSource(v.resolvedAvatarUrl || v.avatarUrl || v.avatarBase64)} />
                </AvatarRing>
                <AvatarName selected={selectedId === v.id} numberOfLines={2}>
                  {v.name ? v.name.split(' ')[0] : 'Vereador'}
                </AvatarName>
              </AvatarContainer>
            ))}
          </TopScroller>

          {/* Content Area */}
          {selectedVereador && (
            <DetailsContainer showsVerticalScrollIndicator={false}>
              <GlassCard intensity={80} tint="default">
                <ProfileImage source={getAvatarSource(selectedVereador.resolvedAvatarUrl || selectedVereador.avatarUrl || selectedVereador.avatarBase64)} />
                <ProfileInfo>
                  <ProfileName>{selectedVereador.name}</ProfileName>
                  <ProfileDetail><Text style={{ fontWeight: 'bold' }}>Cargo:</Text> {selectedVereador.cargo || 'Vereador'}</ProfileDetail>
                  <ProfileDetail><Text style={{ fontWeight: 'bold' }}>Nascimento:</Text> {selectedVereador.dataNascimento ? selectedVereador.dataNascimento.split('-').reverse().join('/') : 'N/A'}</ProfileDetail>
                  <ProfileDetail><Text style={{ fontWeight: 'bold' }}>Partido:</Text> {selectedVereador.partido || 'N/A'}</ProfileDetail>
                </ProfileInfo>
              </GlassCard>

              <SectionTitle>Biografia</SectionTitle>
              <BiographyText>{selectedVereador.biografia || 'Informações biográficas não disponíveis no momento.'}</BiographyText>

              <View style={{ height: 100 }} />
            </DetailsContainer>
          )}
        </>
      )}
    </Container>
  );
}
