import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import styled from 'styled-components/native';

import { collection, getDocs } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { firestore, storage } from '../../services/firebaseConfig';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';
const genericBiographies = [
  'Parlamentar da Câmara Municipal de Paraipaba, atuando na representação da população e no acompanhamento das demandas do município.',
  'Vereador com atuação voltada ao diálogo com a comunidade, fiscalização do poder público e defesa de melhorias para Paraipaba.',
  'Representante do legislativo municipal, dedicado à construção de políticas públicas e ao atendimento das necessidades dos cidadãos.',
];

const Container = styled.View`
  flex: 1;
  background-color: #f8fbff;
`;

const Header = styled(LinearGradient).attrs({
  colors: ['#f8fbff', '#eef5fb', '#ffffff'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
})`
  padding: 54px 20px 18px;
`;

const HeaderTitle = styled.Text`
  color: #0f172a;
  font-size: 28px;
  line-height: 34px;
  font-weight: 900;
`;

const HeaderSubtitle = styled.Text`
  color: #64748b;
  font-size: 14px;
  line-height: 20px;
  font-weight: 700;
  margin-top: 6px;
`;

const BackButton = styled.TouchableOpacity`
  width: 42px;
  height: 42px;
  border-radius: 21px;
  background-color: rgba(255, 255, 255, 0.82);
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
`;

const TopScroller = styled.ScrollView`
  padding: 14px 0 12px;
  background-color: transparent;
  max-height: 126px;
`;

const AvatarContainer = styled.TouchableOpacity`
  align-items: center;
  margin: 0 7px;
  width: 76px;
`;

const AvatarRing = styled(LinearGradient).attrs(props => ({
  colors: props.selected ? ['#025AA1', '#0077ed'] : ['#ffffff', '#eef5fb'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
}))`
  width: 72px;
  height: 72px;
  border-radius: 36px;
  border-width: 2px;
  border-color: ${props => props.selected ? 'rgba(2, 90, 161, 0.35)' : '#e2e8f0'};
  justify-content: center;
  align-items: center;
  margin-bottom: 6px;
`;

const AvatarPhoto = styled.Image`
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background-color: #eee;
`;

const AvatarName = styled.Text`
  font-size: 11px;
  color: ${props => props.selected ? primaryColor : '#64748b'};
  text-align: center;
  font-weight: 900;
`;

const DetailsContainer = styled.ScrollView`
  flex: 1;
  padding: 20px;
`;

const GlassCard = styled(BlurView)`
  border-radius: 22px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.78);
  border-color: #e2e8f0;
  border-width: 1px;
  padding: 16px;
  margin-bottom: 25px;
  elevation: 3;
`;

const ProfileRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ProfileImage = styled.Image`
  width: 104px;
  height: 126px;
  border-radius: 18px;
  background-color: #ccc;
  margin-right: 15px;
`;

const ProfileInfo = styled.View`
  flex: 1;
  justify-content: center;
`;

const ProfileName = styled.Text`
  font-size: 19px;
  line-height: 24px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 10px;
`;

const ProfileDetail = styled.Text`
  font-size: 14px;
  color: #64748b;
  margin-bottom: 4px;
  font-weight: 700;
`;

const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
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
  const { width } = useWindowDimensions();

  const tagsStyles = {
    p: { fontSize: 15, lineHeight: 24, color: '#555', textAlign: 'justify', marginBottom: 10 },
    strong: { fontWeight: 'bold', color: '#333' },
    a: { color: primaryColor, textDecorationLine: 'underline' }
  };

  // Função para retornar um texto genérico baseado no ID do vereador
  const getGenericBio = (id) => {
    const hash = (id || '0').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return genericBiographies[hash % genericBiographies.length];
  };

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

          const sortedData = data
            .filter((item) => item.flavorId === flavorId || !item.flavorId)
            .sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Ordenação local

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
          { id: '1', name: 'FELIPE DE SOUSA RODRIGUES', cargo: 'PRESIDENTE', dataNascimento: '1994-10-20', partido: 'REPUBLICANOS', avatarBase64: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200', biografia: '' },
          { id: '2', name: 'DR. CLEBER', cargo: 'VEREADOR', dataNascimento: '1980-01-01', partido: 'PT', avatarBase64: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200', biografia: '' }
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
          <MaterialCommunityIcons name="arrow-left" size={23} color={primaryColor} />
        </BackButton>
        <HeaderTitle>Vereadores</HeaderTitle>
        <HeaderSubtitle>Conheça os parlamentares da Câmara Municipal de Paraipaba.</HeaderSubtitle>
      </Header>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <>
          {/* Top Scroller for Avatars */}
          <TopScroller horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 13 }}>
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
                <ProfileRow>
                  <ProfileImage source={getAvatarSource(selectedVereador.resolvedAvatarUrl || selectedVereador.avatarUrl || selectedVereador.avatarBase64)} />
                  <ProfileInfo>
                    <ProfileName>{selectedVereador.name}</ProfileName>
                    <ProfileDetail>{selectedVereador.cargo || 'Vereador'}</ProfileDetail>
                    <ProfileDetail>Partido: {selectedVereador.partido || 'N/A'}</ProfileDetail>
                    <ProfileDetail>Nascimento: {selectedVereador.dataNascimento ? selectedVereador.dataNascimento.split('-').reverse().join('/') : 'N/A'}</ProfileDetail>
                  </ProfileInfo>
                </ProfileRow>
              </GlassCard>

              <SectionTitle>Biografia</SectionTitle>
              {selectedVereador.biografia && selectedVereador.biografia.trim() !== "" ? (
                <RenderHtml
                  contentWidth={width - 40}
                  source={{ html: selectedVereador.biografia }}
                  tagsStyles={tagsStyles}
                  baseStyle={{ color: '#555' }}
                />
              ) : (
                <BiographyText>{getGenericBio(selectedVereador.id)}</BiographyText>
              )}

              <View style={{ height: 100 }} />
            </DetailsContainer>
          )}
        </>
      )}
    </Container>
  );
}
