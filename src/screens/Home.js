import chamberConfig from '../config';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, PanResponder, View } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { PortalBackground } from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';
import { useMobileModules } from '../context/MobileModulesContext';
import { routeForModule } from '../config/mobileModules';
import { portalGradients } from '../styles/portalTheme';
import { useSystemControl } from '../context/SystemControlContext';

const { width } = Dimensions.get('window');
// --- ESTILOS ---

const Container = styled.ScrollView`
  flex: 1;
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 70px 22px 18px;
`;

const HeaderIdentity = styled.View`
  flex: 1;
`;

const HeaderActions = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const NotificationButton = styled.TouchableOpacity`
  position: relative;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
`;

const ProfileAvatar = styled.TouchableOpacity`
  width: 42px;
  height: 42px;
  border-radius: 21px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: ${({ theme }) => theme.portal.pageAlt};
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.secondary};
`;

const ProfileAvatarImage = styled(Image)`
  width: 100%;
  height: 100%;
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
  font-size: 24px;
  line-height: 30px;
  color: ${({ theme }) => theme.portal.text};
  font-weight: 700;
`;

const InstitutionText = styled.Text`
  margin-top: 5px;
  font-size: 12px;
  color: ${({ theme }) => theme.portal.subtle};
  font-weight: 700;
`;

const QuickMenu = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 0 18px 20px;
  margin-bottom: 4px;
`;

const HOME_ACTIONS = {
  vereadores: { screen: 'Vereadores', icon: 'account-group', label: 'Vereadores', gradient: ['#025AA1', '#0077ed'] },
  procuradoria: { screen: 'Procuradoria', icon: 'gender-female', label: 'Mulher', gradient: portalGradients.woman },
  balcao: { screen: 'BalcaoCidadao', icon: 'book-open-variant', label: 'Balcão', gradient: ['#0f766e', '#22c55e'] },
  piel: { screen: 'Piel', icon: 'card-account-details', label: 'PIEL', gradient: ['#f59e0b', '#f9c204'] },
  tvCamara: { screen: 'TvCamara', icon: 'television-play', label: 'TV Câmara', gradient: ['#111827', '#334155'] },
  ouvidoria: { screen: 'OuvidoriaMunicipal', icon: 'chat-processing-outline', label: 'Ouvidoria', gradient: ['#2563eb', '#38bdf8'] },
  esic: { screen: 'Esic', icon: 'file-document-outline', label: 'e-SIC', gradient: ['#7c3aed', '#a78bfa'] },
  noticias: { screen: 'Noticias', icon: 'newspaper-variant-outline', label: 'Notícias', gradient: ['#be123c', '#fb7185'] },
  microempreendedor: { screen: 'Microempreendedor', icon: 'briefcase-outline', label: 'Negócios', gradient: ['#047857', '#34d399'] },
  mensagens: { screen: 'Mensagens', icon: 'message-text-outline', label: 'Mensagens', gradient: ['#0369a1', '#38bdf8'] },
  avaliacoes: { screen: 'Avaliacoes', icon: 'star-outline', label: 'Avaliações', gradient: ['#b45309', '#fbbf24'] },
  protocolo: { screen: 'Protocolo', icon: 'folder-text-outline', label: 'Protocolo', gradient: ['#0f766e', '#0d9488'] },
  procon: { screen: 'Procon', icon: 'shield-check-outline', label: 'PROCON', gradient: ['#9a3412', '#ea580c'] },
  escolaParlamento: { screen: 'EscolaParlamento', icon: 'school-outline', label: 'Escola', gradient: ['#1d4ed8', '#60a5fa'] },
};
const DEFAULT_HOME_MODULES = ['vereadores', 'procuradoria', 'balcao', 'piel', 'tvCamara'];
const MenuItem = styled.TouchableOpacity`
  width: 48%;
  min-height: 112px;
  padding: 14px;
  margin-bottom: 12px;
  border-radius: 18px;
  align-items: flex-start;
  justify-content: space-between;
  overflow: hidden;
`;

const ServiceCardGradient = styled(LinearGradient)`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
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
  shadow-color: ${({ theme }) => theme.portal.primary};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.12;
  shadow-radius: 8px;
  border: 1px solid ${({ theme }) => theme.portal.border};
`;

const GradientIconCircle = styled(LinearGradient)`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
  elevation: 8;
  shadow-color: #ec4899;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.22;
  shadow-radius: 7px;
`;

const NewsCarousel = styled.View`
  height: 260px;
  margin: 0 16px 12px;
  align-items: center;
`;

const NewsSlide = styled.TouchableOpacity`
  width: ${Math.min(width - 32, 380)}px;
  height: 230px;
  margin-right: 12px;
  border-radius: 18px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.portal.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
`;

const NewsSlideImage = styled.Image`
  width: 100%;
  height: 100%;
  background-color: ${({ theme }) => theme.portal.pageAlt};
`;

const NewsSlideOverlay = styled.View`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 14px 11px;
  background-color: ${({ theme }) => theme.portal.card};
  align-items: flex-start;
`;

const NewsSlideTitle = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 15px;
  line-height: 19px;
  font-weight: 900;
`;

const NewsSlideSubtitle = styled.Text`
  margin-top: 2px;
  color: ${({ theme }) => theme.portal.muted};
  font-size: 12px;
  line-height: 16px;
`;

const NewsSlideButton = styled.TouchableOpacity`
  margin-top: 3px;
  padding: 2px 0;
`;

const NewsSlideButtonText = styled.Text`
  color: ${({ theme }) => theme.portal.primary};
  font-size: 12px;
  font-weight: 900;
`;

const NewsDots = styled.View`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 7px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const NewsDot = styled.View`
  width: ${({ active }) => (active ? 8 : 6)}px;
  height: ${({ active }) => (active ? 8 : 6)}px;
  margin: 0 3px;
  border-radius: 5px;
  background-color: ${({ active, theme }) => (active ? theme.portal.primary : 'rgba(255,255,255,0.85)')};
`;

const MenuLabel = styled.Text`
  font-size: 14px;
  color: #fff;
  font-weight: 800;
  line-height: 18px;
`;

const SectionHeader = styled.View`
  padding: 0 22px 15px;
`;

const SectionTitle = styled.Text`
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.portal.text};
`;

// --- COMPONENTES AUXILIARES ---

const MenuAction = ({ icon, label, onPress, gradient }) => {
  const theme = useTheme();
  return (
  <MenuItem activeOpacity={0.7} onPress={onPress}>
    <ServiceCardGradient colors={gradient || [theme.portal.primary, theme.portal.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />
    {gradient ? (
      <GradientIconCircle colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }}>
        <MaterialCommunityIcons name={icon} size={32} color="#fff" />
      </GradientIconCircle>
    ) : (
      <IconCircle style={{ backgroundColor: theme.portal.primary }}>
        <MaterialCommunityIcons name={icon} size={32} color={theme.portal.page} />
      </IconCircle>
    )}
    <MenuLabel>{label}</MenuLabel>
  </MenuItem>
  );
};

const isPublishedNews = (item = {}) => {
  const status = String(item.status || item.situacao || '').trim().toLowerCase();

  if (item.publicado === true || item.published === true || item.isPublished === true) return true;
  if (['publicado', 'publicada', 'published'].includes(status)) return true;
  if (['rascunho', 'draft'].includes(status)) return false;

  return false;
};

const stripHtml = (value = '') => String(value)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const newsTitle = item => stripHtml(item.titulo || item.title?.rendered || 'Notícia');
const newsSubtitle = item => stripHtml(item.subtitulo || item.resumo || item.excerpt?.rendered || item.descricao || item.content?.rendered || 'Confira os detalhes desta notícia.');

// --- TELA PRINCIPAL ---

const HomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user, profileName, profilePhoto, unreadCount } = useContext(AuthContext);
  const firstName = String(profileName || user?.displayName || user?.email?.split('@')[0] || '').trim().split(/\s+/)[0];
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';
  const { canUse, settings: moduleSettings, role } = useMobileModules();
  const { settings: systemSettings } = useSystemControl();
  const settings = systemSettings || moduleSettings;
  const homeModules = Array.isArray(settings?.appHomeModules) ? settings.appHomeModules : DEFAULT_HOME_MODULES;
  const homeActions = [...new Set(homeModules)].filter(id => HOME_ACTIONS[id] && canUse(id)).slice(0, 6);
  const [news, setNews] = useState([]);
  const [activeNewsIndex, setActiveNewsIndex] = useState(0);
  const newsAnimation = useRef(new Animated.Value(1)).current;
  const newsCountRef = useRef(0);
  const [loading, setLoading] = useState(true);
  newsCountRef.current = news.length;

  const changeNews = delta => {
    const count = newsCountRef.current;
    if (count < 2) return;
    Animated.sequence([
      Animated.timing(newsAnimation, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(newsAnimation, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    setActiveNewsIndex(index => (index + delta + count) % count);
  };
  const newsPanResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 36) changeNews(gesture.dx < 0 ? 1 : -1);
    },
  })).current;

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

  useEffect(() => {
    if (news.length < 2) return undefined;
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(newsAnimation, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(newsAnimation, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
      setActiveNewsIndex(index => (index + 1) % news.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [news.length, newsAnimation]);

  return (
    <PortalBackground>
    <Container showsVerticalScrollIndicator={false}>
      <Header>
        <HeaderIdentity>
          <WelcomeContainer>
            <WelcomeText numberOfLines={1} adjustsFontSizeToFit>{greeting}{firstName ? `, ${firstName}` : ''}</WelcomeText>
            <InstitutionText numberOfLines={2}>{settings?.tenant?.name || chamberConfig.institutionName}</InstitutionText>
          </WelcomeContainer>
        </HeaderIdentity>
        <HeaderActions>
          <NotificationButton activeOpacity={0.6} onPress={() => navigation.navigate('Notificacoes')}>
            <View>
              <Ionicons name="notifications" size={26} color={theme.portal.secondary} />
              {unreadCount > 0 && <Badge><BadgeText>{unreadCount > 9 ? '9+' : unreadCount}</BadgeText></Badge>}
            </View>
          </NotificationButton>
          <ProfileAvatar activeOpacity={0.7} onPress={() => navigation.navigate('Perfil')} accessibilityRole="button" accessibilityLabel="Abrir perfil">
            {profilePhoto || user?.photoURL ? <ProfileAvatarImage source={{ uri: profilePhoto || user.photoURL }} contentFit="cover" /> : <MaterialCommunityIcons name="account" size={25} color={theme.portal.secondary} />}
          </ProfileAvatar>
        </HeaderActions>
      </Header>

      {canUse('noticias') && <>
        {loading ? <View style={{ height: 230, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={theme.portal.primary} /></View> : news.length > 0 && <NewsCarousel {...newsPanResponder.panHandlers}>
          <Animated.View style={{ flex: 1, opacity: newsAnimation, transform: [{ translateX: newsAnimation.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }}>
            {(() => {
              const item = news[activeNewsIndex];
              const imageUrl = item.capaUrl || item._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/400x220.png?text=Notícia';
              const openNews = () => navigation.navigate('NoticiaDetalhe', { news: item, id: item.id });
              return <NewsSlide activeOpacity={0.88} onPress={openNews}><NewsSlideImage resizeMode="cover" source={{ uri: imageUrl }} /><NewsSlideOverlay><NewsSlideTitle numberOfLines={1} ellipsizeMode="tail">{newsTitle(item)}</NewsSlideTitle><NewsSlideSubtitle numberOfLines={1} ellipsizeMode="tail">{newsSubtitle(item)}</NewsSlideSubtitle><NewsSlideButton onPress={openNews}><NewsSlideButtonText>Ver notícia completa</NewsSlideButtonText></NewsSlideButton></NewsSlideOverlay></NewsSlide>;
            })()}
          </Animated.View>
          <NewsDots>{news.map((item, index) => <NewsDot key={item.id} active={index === activeNewsIndex} />)}</NewsDots>
        </NewsCarousel>}
      </>}

      <SectionHeader><SectionTitle>Serviços</SectionTitle></SectionHeader>
      <QuickMenu>
        {homeActions.map(id => <MenuAction
          key={id}
          {...HOME_ACTIONS[id]}
          onPress={() => navigation.navigate(routeForModule(settings, role, id, HOME_ACTIONS[id].screen))}
        />)}
      </QuickMenu>

      {/* Espaçamento extra no final para não sumir atrás da BottomBar */}
      <View style={{ height: 100 }} />
    </Container>
    </PortalBackground>
  );
};

export default HomeScreen;
