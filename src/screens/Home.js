import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, View } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { PortalBackground } from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';
import { portalGradients } from '../styles/portalTheme';

const { width } = Dimensions.get('window');
const primaryColor = Constants.expoConfig.extra?.theme?.primary || '#004a99';
const backgroundColor = Constants.expoConfig.extra?.theme?.background || '#f8fafc';
// --- ESTILOS ---

const Container = styled.ScrollView`
  flex: 1;
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  padding: 62px 22px 18px;
`;

const NotificationButton = styled.TouchableOpacity`
  position: relative;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
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
  flex: 1;
  padding-right: 16px;
`;

const WelcomeText = styled.Text`
  font-size: 16px;
  color: ${({ theme }) => theme.portal.muted};
  font-weight: 700;
`;

const BoldText = styled.Text`
  font-size: 28px;
  font-weight: 800;
  color: ${({ theme }) => theme.portal.text};
`;

const InstitutionText = styled.Text`
  margin-top: 5px;
  font-size: 12px;
  color: ${({ theme }) => theme.portal.subtle};
  font-weight: 700;
`;

const QuickMenu = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 16px 14px 20px;
  margin-bottom: 4px;
`;

const MenuItem = styled.TouchableOpacity`
  align-items: center;
  width: ${(width - 36) / 5}px;
`;

const IconCircle = styled.View`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: ${({ theme }) => theme.portal.card};
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  
  /* Sombra para dar o efeito de botão flutuante */
  elevation: 5;
  shadow-color: ${primaryColor};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.12;
  shadow-radius: 8px;
  border: 1px solid ${({ theme }) => theme.portal.border};
`;

const GradientIconCircle = styled(LinearGradient)`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  elevation: 8;
  shadow-color: #ec4899;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.22;
  shadow-radius: 7px;
`;

const MenuLabel = styled.Text`
  font-size: 11px;
  color: ${({ theme }) => theme.portal.text};
  font-weight: 800;
  text-align: center;
  line-height: 14px;
`;

const SectionHeader = styled.View`
  padding: 0 22px 15px;
`;

const SectionTitle = styled.Text`
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.portal.text};
`;

const NewsGrid = styled.View`
  padding: 0 20px;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const NewsCard = styled.TouchableOpacity`
  width: 47%;
  background-color: ${({ theme }) => theme.portal.card};
  border-radius: 12px;
  margin-bottom: 20px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.portal.border};
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.08;
`;

const NewsImage = styled.Image`
  width: 100%;
  height: 115px;
  background-color: ${({ theme }) => theme.portal.pageAlt};
`;

const NewsContent = styled.View`
  padding: 12px;
`;

const NewsTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.portal.text};
  line-height: 18px;
`;

const NewsSummary = styled.Text`
  margin-top: 7px;
  font-size: 12px;
  color: ${({ theme }) => theme.portal.muted};
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

const MenuAction = ({ icon, label, onPress, gradient }) => (
  <MenuItem activeOpacity={0.7} onPress={onPress}>
    {gradient ? (
      <GradientIconCircle colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }}>
        <MaterialCommunityIcons name={icon} size={32} color="#fff" />
      </GradientIconCircle>
    ) : (
      <IconCircle style={{ backgroundColor: primaryColor }}>
        <MaterialCommunityIcons name={icon} size={32} color={backgroundColor} />
      </IconCircle>
    )}
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

const isPublishedNews = (item = {}) => {
  const status = String(item.status || item.situacao || '').trim().toLowerCase();

  if (item.publicado === true || item.published === true || item.isPublished === true) return true;
  if (['publicado', 'publicada', 'published'].includes(status)) return true;
  if (['rascunho', 'draft'].includes(status)) return false;

  return false;
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
        const newsQuery = query(newsRef, orderBy('createdAt', 'desc'), limit(12));
        const snapshot = await getDocs(newsQuery);
        const data = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
          .filter(isPublishedNews)
          .slice(0, 6);
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
    <PortalBackground>
    <Container showsVerticalScrollIndicator={false}>
      <Header>
        <WelcomeContainer>
          <WelcomeText>Olá, seja</WelcomeText>
          <BoldText>Bem-vindo</BoldText>
          <InstitutionText>Câmara Municipal de Paraipaba</InstitutionText>
        </WelcomeContainer>
        <NotificationButton activeOpacity={0.6} onPress={() => navigation.navigate('Notificacoes')}>
          <View>
            <Ionicons name="notifications" size={26} color={primaryColor} />
            {unreadCount > 0 && (
              <Badge>
                <BadgeText>{unreadCount > 9 ? '9+' : unreadCount}</BadgeText>
              </Badge>
            )}
          </View>
        </NotificationButton>
      </Header>

      {/* MENU DE ACESSO RÁPIDO - BACKGROUND CIRCULAR BRANCO COM ÍCONE COLORIDO */}
      <QuickMenu>
        <MenuAction
          icon="account-group"
          label="Vereadores"
          gradient={['#025AA1', '#0077ed']}
          onPress={() => navigation.navigate('Vereadores')}
        />
        <MenuAction
          icon="gender-female"
          label="Mulher"
          gradient={portalGradients.woman}
          onPress={() => navigation.navigate('Procuradoria')}
        />
        <MenuAction
          icon="book-open-variant"
          label="Balcão"
          gradient={['#0f766e', '#22c55e']}
          onPress={() => navigation.navigate('BalcaoCidadao')}
        />
        <MenuAction
          icon="card-account-details"
          label="PIEL"
          gradient={['#f59e0b', '#f9c204']}
          onPress={() => navigation.navigate('Piel')}
        />
        <MenuAction
          icon="television-play"
          label="TV Câmara"
          gradient={['#111827', '#334155']}
          onPress={() => navigation.navigate('TvCamara')}
        />
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
    </PortalBackground>
  );
};

export default HomeScreen;
