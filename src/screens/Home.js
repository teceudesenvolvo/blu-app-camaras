import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const primaryColor = Constants.expoConfig.extra?.theme?.primary || '#004a99';
const backgroundColor = Constants.expoConfig.extra?.theme?.background || '#f8fafc';
// --- ESTILOS ---

const Container = styled.ScrollView`
  flex: 1;
  background-color: #FDFDFD;
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 60px 25px 20px;
  background-color: #FFF;
`;

const Badge = styled.View`
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #dc2626;
  width: 18px;
  height: 18px;
  border-radius: 9px;
  justify-content: center;
  align-items: center;
  z-index: 10;
  border: 1px solid #FFF;
`;

const BadgeText = styled.Text`
  color: #fff;
  font-size: 10px;
  font-weight: bold;
`;

const WelcomeContainer = styled.View`
  padding: 0px 25px;
`;

const WelcomeText = styled.Text`
  font-size: 16px;
  color: #888;
  font-weight: 400;
`;

const BoldText = styled.Text`
  font-size: 28px;
  font-weight: 800;
  color: #1A1A40; 
`;

const QuickMenu = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 10px 25px;
  margin-bottom: 20px;
`;

const MenuItem = styled.TouchableOpacity`
  align-items: center;
  width: ${width * 0.2}px;
`;

const IconCircle = styled.View`
  width: 65px;
  height: 65px;
  border-radius: 32.5px;
  background-color: #FFF;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  
  /* Sombra para dar o efeito de botão flutuante */
  elevation: 8;
  shadow-color: ${primaryColor};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.15;
  shadow-radius: 6px;
  border: 1px solid #F0F0F0;
`;

const MenuLabel = styled.Text`
  font-size: 13px;
  color: #555;
  font-weight: 600;
  text-align: center;
`;

const SectionHeader = styled.View`
  padding: 0 25px 15px;
`;

const SectionTitle = styled.Text`
  font-size: 22px;
  font-weight: 700;
  color: #333;
`;

const NewsGrid = styled.View`
  padding: 0 20px;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const NewsCard = styled.TouchableOpacity`
  width: 47%;
  background-color: #FFF;
  border-radius: 18px;
  margin-bottom: 20px;
  overflow: hidden;
  border: 1px solid #EEE;
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
`;

const NewsImage = styled.Image`
  width: 100%;
  height: 115px;
  background-color: #F0F0F0;
`;

const NewsContent = styled.View`
  padding: 12px;
`;

const NewsTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #444;
  line-height: 18px;
`;

const NewsSummary = styled.Text`
  margin-top: 7px;
  font-size: 12px;
  color: #6b7280;
  line-height: 16px;
`;

const ReadMoreRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 10px;
`;

const ReadMoreText = styled.Text`
  font-size: 12px;
  color: ${primaryColor};
  font-weight: 800;
  margin-right: 4px;
`;

// --- COMPONENTES AUXILIARES ---

const MenuAction = ({ icon, label, onPress }) => (
  <MenuItem activeOpacity={0.7} onPress={onPress}>
    <IconCircle style={{ backgroundColor: primaryColor }}>
      <MaterialCommunityIcons name={icon} size={32} color={backgroundColor} />
    </IconCircle>
    <MenuLabel>{label}</MenuLabel>
  </MenuItem>
);

const stripHtml = (value = '') => String(value)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const getNewsSummary = (item) => {
  const rawSummary =
    item.resumo ||
    item.subtitulo ||
    item.excerpt?.rendered ||
    item.descricao ||
    item.content?.rendered ||
    '';

  return stripHtml(rawSummary);
};

// --- TELA PRINCIPAL ---

const HomeScreen = ({ navigation }) => {
  const { unreadCount } = useContext(AuthContext);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const newsRef = collection(firestore, 'noticias');
        const newsQuery = query(newsRef, orderBy('createdAt', 'desc'), limit(6));
        const snapshot = await getDocs(newsQuery);
        const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setNews(data);
      } catch (error) {
        console.error("Falha ao buscar notícias:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <Container showsVerticalScrollIndicator={false}>
      {/* HEADER COM LOGO DINÂMICA */}
      <Header>
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 150, height: 95, resizeMode: 'contain', marginLeft: -30 }}
        />
        <TouchableOpacity activeOpacity={0.6} onPress={() => navigation.navigate('Notificacoes')}>
          <View>
            <Ionicons name="notifications" size={26} color={primaryColor} />
            {unreadCount > 0 && (
              <Badge>
                <BadgeText>{unreadCount > 9 ? '9+' : unreadCount}</BadgeText>
              </Badge>
            )}
          </View>
        </TouchableOpacity>
      </Header>

      <WelcomeContainer>
        <WelcomeText>Olá, seja</WelcomeText>
        <BoldText>Bem-vindo</BoldText>
      </WelcomeContainer>

      {/* MENU DE ACESSO RÁPIDO - BACKGROUND CIRCULAR BRANCO COM ÍCONE COLORIDO */}
      <QuickMenu>
        <MenuAction icon="account-group" label="Vereadores" onPress={() => navigation.navigate('Vereadores')} />
        <MenuAction icon="card-account-details" label="PIEL" onPress={() => navigation.navigate('Piel')} />
        <MenuAction icon="book-open-variant" label="Balcão" onPress={() => navigation.navigate('BalcaoCidadao')} />
        <MenuAction icon="gavel" label="Licitações" onPress={() => navigation.navigate('Licitacoes')} />
      </QuickMenu>

      <SectionHeader>
        <SectionTitle>Notícias</SectionTitle>
      </SectionHeader>

      {loading ? (
        <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <NewsGrid>
          {news.map((item) => {
            const imageUrl = item.capaUrl || item._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/400x200.png?text=Sem+Imagem';
            const titleText = item.titulo || item.title?.rendered || 'Notícia';
            const summaryText = getNewsSummary(item);
            
            return (
              <NewsCard key={item.id} activeOpacity={0.9} onPress={() => navigation.navigate('NoticiaDetalhe', { news: item, id: item.id })}>
                <NewsImage source={{ uri: imageUrl }} />
                <NewsContent>
                  <NewsTitle numberOfLines={3}>{titleText}</NewsTitle>
                  {summaryText ? <NewsSummary numberOfLines={3}>{summaryText}</NewsSummary> : null}
                  <ReadMoreRow>
                    <ReadMoreText>Leia mais</ReadMoreText>
                    <MaterialCommunityIcons name="arrow-right" size={14} color={primaryColor} />
                  </ReadMoreRow>
                </NewsContent>
              </NewsCard>
            );
          })}
        </NewsGrid>
      )}

      {/* Espaçamento extra no final para não sumir atrás da BottomBar */}
      <View style={{ height: 100 }} />
    </Container>
  );
};

export default HomeScreen;
