import React from 'react';
import { View, ScrollView, Text, Image, TouchableOpacity, Share, useWindowDimensions, Linking } from 'react-native';
import styled from 'styled-components/native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';

const Container = styled.View`
  flex: 1;
  background-color: #FFF;
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
  background-color: rgba(255, 255, 255, 0.9);
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
  background-color: rgba(255, 255, 255, 0.9);
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
  background-color: #eee;
`;

const ContentContainer = styled.ScrollView`
  flex: 1;
  background-color: #fff;
  margin-top: -30px; 
  border-top-left-radius: 30px;
  border-top-right-radius: 30px;
  padding: 30px 20px;
`;

const DateText = styled.Text`
  font-size: 13px;
  color: #888;
  margin-bottom: 8px;
  font-weight: 500;
`;

const Title = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 20px;
  line-height: 28px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: #eee;
  margin: 10px 0 20px 0;
`;

const LinkButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${primaryColor};
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
    const { news } = route.params;
    const { width } = useWindowDimensions();

    const imageUrl = news._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
    const date = new Date(news.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${news.title.rendered}\n\nLeia mais em: ${news.link}`,
                url: news.link,
                title: news.title.rendered
            });
        } catch (error) {
            console.error(error.message);
        }
    };

    const handleOpenLink = () => {
        if (news.link) {
            Linking.openURL(news.link);
        }
    };

    const tagsStyles = {
        p: { fontSize: 16, lineHeight: 26, color: '#444', marginBottom: 15 },
        strong: { fontWeight: 'bold', color: '#222' },
        a: { color: primaryColor, textDecorationLine: 'underline' },
        img: { borderRadius: 10, marginVertical: 10, maxWidth: width - 40 }
    };

    return (
        <Container>
            <FeaturedImage source={{ uri: imageUrl || 'https://via.placeholder.com/600x400' }} resizeMode="cover" />
            
            <Header>
                <BackButton onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </BackButton>
                <ShareButton onPress={handleShare}>
                    <Ionicons name="share-social-outline" size={22} color="#333" />
                </ShareButton>
            </Header>

            <ContentContainer showsVerticalScrollIndicator={false}>
                <DateText>{date}</DateText>
                <Title>{news.title.rendered}</Title>
                
                <Divider />

                <RenderHtml
                    contentWidth={width - 40}
                    source={{ html: news.content.rendered }}
                    tagsStyles={tagsStyles}
                    baseStyle={{ color: '#444' }}
                />

                <LinkButton onPress={handleOpenLink} activeOpacity={0.8}>
                    <LinkButtonText>Ver no site oficial</LinkButtonText>
                    <Ionicons name="open-outline" size={20} color="#fff" />
                </LinkButton>
            </ContentContainer>
        </Container>
    );
}
