import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Share, Text, useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import styled, { useTheme } from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.portal.card};
`;

const Header = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 90px;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 20px 15px 20px;
  z-index: 10;
`;

const BackButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(16, 37, 54, 0.94)' : 'rgba(255, 255, 255, 0.9)'};
  justify-content: center;
  align-items: center;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 3;
`;

const ShareButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(16, 37, 54, 0.94)' : 'rgba(255, 255, 255, 0.9)'};
  justify-content: center;
  align-items: center;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 3;
`;

const FeaturedImage = styled.Image`
  width: 100%;
  height: 300px;
  background-color: ${({ theme }) => theme.portal.pageAlt};
`;

const ContentContainer = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }) => theme.portal.card};
  margin-top: -30px; 
  border-top-left-radius: 30px;
  border-top-right-radius: 30px;
  padding: 30px 20px;
`;

const DateText = styled.Text`
  font-size: 13px;
  color: ${({ theme }) => theme.portal.muted};
  margin-bottom: 8px;
  font-weight: 500;
`;

const Title = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => theme.portal.text};
  margin-bottom: 20px;
  line-height: 28px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${({ theme }) => theme.portal.border};
  margin: 10px 0 20px 0;
`;

const LinkButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.portal.primary};
  padding: 16px;
  border-radius: 12px;
  margin-top: 30px;
  margin-bottom: 50px;
`;

const LinkButtonText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  margin-right: 10px;
`;

export default function NoticiaDetalheScreen({ route, navigation }) {
    const theme = useTheme();
    const { news: initialNews, id } = route.params || {};
    const [news, setNews] = useState(initialNews || null);
    const [loading, setLoading] = useState(!initialNews);
    const { width } = useWindowDimensions();

    useEffect(() => {
        if (news || !id) return;

        const fetchNews = async () => {
            try {
                const docRef = doc(firestore, 'noticias', id);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setNews({ id: snap.id, ...snap.data() });
                }
            } catch (error) {
                console.error('Erro ao carregar notícia:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, [id, news]);

    const formatDate = (value) => {
        if (!value) return 'N/A';
        let date;
        if (value?.toDate) date = value.toDate();
        else if (value?.toMillis) date = new Date(value.toMillis());
        else if (typeof value === 'number') date = new Date(value);
        else date = new Date(value);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.portal.primary} />
            </Container>
        );
    }

    if (!news) {
        return null;
    }

    const imageUrl = news.capaUrl || news._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/600x400';
    const titleText = news.titulo || news.title?.rendered || 'Notícia';
    const subTitle = news.subtitulo || '';
    const contentHtml = news.conteudo || news.content?.rendered || '';
    const dateText = news.createdAt ? formatDate(news.createdAt) : (news.date ? formatDate(news.date) : 'N/A');
    const shareUrl = news.link || '';

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${titleText}${shareUrl ? `\n\nLeia mais em: ${shareUrl}` : ''}`,
                url: shareUrl,
                title: titleText
            });
        } catch (error) {
            console.error(error.message);
        }
    };

    const handleOpenLink = () => {
        if (shareUrl) {
            Linking.openURL(shareUrl);
        }
    };

    const tagsStyles = {
        p: { fontSize: 16, lineHeight: 26, color: theme.portal.text, marginBottom: 15 },
        strong: { fontWeight: 'bold', color: theme.portal.text },
        a: { color: theme.portal.primary, textDecorationLine: 'underline' },
        img: { borderRadius: 10, marginVertical: 10, maxWidth: width - 40 }
    };

    return (
        <Container>
            <FeaturedImage source={{ uri: imageUrl }} resizeMode="cover" />
            
            <Header>
                <BackButton onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.portal.text} />
                </BackButton>
                <ShareButton onPress={handleShare}>
                    <Ionicons name="share-social-outline" size={22} color={theme.portal.text} />
                </ShareButton>
            </Header>

            <ContentContainer showsVerticalScrollIndicator={false}>
                <DateText>{dateText}</DateText>
                <Title>{titleText}</Title>
                {subTitle ? <Text style={{ fontSize: 16, color: theme.portal.muted, marginBottom: 16 }}>{subTitle}</Text> : null}
                <Divider />

                <RenderHtml
                    contentWidth={width - 40}
                    source={{ html: contentHtml }}
                    tagsStyles={tagsStyles}
                    baseStyle={{ color: theme.portal.text }}
                />

                {shareUrl ? (
                    <LinkButton onPress={handleOpenLink} activeOpacity={0.8}>
                        <LinkButtonText>Ver no site oficial</LinkButtonText>
                        <Ionicons name="open-outline" size={20} color="#fff" />
                    </LinkButton>
                ) : null}
            </ContentContainer>
        </Container>
    );
}
