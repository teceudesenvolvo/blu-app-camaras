import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions } from 'react-native';
import styled from 'styled-components/native';

const primaryColor = Constants.expoConfig.extra?.theme?.primary || '#004a99';
const secondaryColor = Constants.expoConfig.extra?.theme?.secondary || '#f9c204';
const playlistId = 'PLLWtKAX8X90qj4BPf4ceLgCJR1Lv5-26j';
const videosEndpoint = 'https://southamerica-east1-blu-app-camara.cloudfunctions.net/listarVideosTvCamara';
const { width } = Dimensions.get('window');
const playerWidth = width - 36;
const playerHeight = Math.round(playerWidth * 9 / 16);

const Container = styled.View`
  flex: 1;
  background-color: #080b12;
`;

const Header = styled.View`
  padding: 58px 22px 16px;
  background-color: #080b12;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const BrandGroup = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const BrandMark = styled.View`
  width: 5px;
  height: 34px;
  border-radius: 3px;
  background-color: ${secondaryColor};
  margin-right: 12px;
`;

const TitleGroup = styled.View`
  flex: 1;
`;

const Title = styled.Text`
  font-size: 25px;
  font-weight: 900;
  color: #ffffff;
`;

const Subtitle = styled.Text`
  margin-top: 3px;
  font-size: 12px;
  color: #a8b3c7;
  font-weight: 700;
  text-transform: uppercase;
`;

const LiveBadge = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 7px 10px;
  border-radius: 999px;
  background-color: rgba(255,255,255,0.1);
  border-width: 1px;
  border-color: rgba(255,255,255,0.14);
`;

const LiveDot = styled.View`
  width: 7px;
  height: 7px;
  border-radius: 4px;
  background-color: #22c55e;
  margin-right: 7px;
`;

const LiveText = styled.Text`
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
`;

const PlayerArea = styled.View`
  height: ${playerHeight}px;
  margin: 0 18px;
  border-radius: 16px;
  overflow: hidden;
  background-color: #030712;
  border-width: 1px;
  border-color: rgba(255,255,255,0.1);
  elevation: 8;
  shadow-color: #000;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.35;
  shadow-radius: 14px;
`;

const LoadingBox = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  align-items: center;
  justify-content: center;
  background-color: #030712;
  z-index: 2;
`;

const LoadingText = styled.Text`
  margin-top: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
`;

const ErrorBox = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background-color: #111827;
`;

const ErrorTitle = styled.Text`
  margin-top: 12px;
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  text-align: center;
`;

const ErrorText = styled.Text`
  margin-top: 8px;
  font-size: 14px;
  line-height: 21px;
  color: #a8b3c7;
  text-align: center;
`;

const Content = styled.ScrollView`
  flex: 1;
  background-color: #080b12;
`;

const Spotlight = styled.View`
  padding: 18px 22px 8px;
`;

const SpotlightEyebrow = styled.Text`
  color: ${secondaryColor};
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
`;

const SpotlightTitle = styled.Text`
  margin-top: 6px;
  color: #ffffff;
  font-size: 22px;
  font-weight: 900;
`;

const SpotlightText = styled.Text`
  margin-top: 8px;
  color: #cbd5e1;
  font-size: 14px;
  line-height: 21px;
`;

const ActionRow = styled.View`
  flex-direction: row;
  margin-top: 16px;
`;

const Pill = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 9px 12px;
  border-radius: 999px;
  background-color: rgba(255,255,255,0.1);
  margin-right: 10px;
`;

const PillText = styled.Text`
  margin-left: 7px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
`;

const Rail = styled.View`
  padding: 16px 22px 120px;
`;

const RailTitle = styled.Text`
  color: #ffffff;
  font-size: 17px;
  font-weight: 900;
  margin-bottom: 12px;
`;

const VideoCard = styled.TouchableOpacity`
  flex-direction: row;
  min-height: 96px;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  background-color: ${props => props.selected ? '#1f2937' : '#121826'};
  border-width: 1px;
  border-color: ${props => props.selected ? secondaryColor : 'rgba(255,255,255,0.08)'};
`;

const ThumbnailBox = styled.View`
  width: 142px;
  aspect-ratio: 1.7777777778;
  background-color: #030712;
`;

const ThumbnailImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const ThumbnailFallback = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: #111827;
`;

const VideoInfo = styled.View`
  flex: 1;
  padding: 11px 12px;
  justify-content: space-between;
`;

const VideoTitle = styled.Text`
  color: #ffffff;
  font-size: 14px;
  line-height: 18px;
  font-weight: 800;
`;

const VideoMeta = styled.Text`
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
`;

const EmptyBox = styled.View`
  align-items: center;
  justify-content: center;
  padding: 22px;
  border-radius: 12px;
  background-color: #121826;
  border-width: 1px;
  border-color: rgba(255,255,255,0.08);
`;

function buildPlayerUrl(videoId) {
  if (!videoId) {
    return null;
  }

  const params = new URLSearchParams({
    list: playlistId,
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    origin: 'https://www.youtube-nocookie.com',
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function getWebViewComponent() {
  try {
    return require('react-native-webview').default;
  } catch (error) {
    console.warn('react-native-webview ainda nao esta registrado no binario nativo.', error);
    return null;
  }
}

function formatVideoDate(value) {
  if (!value) {
    return 'TV Câmara';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'TV Câmara';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function TvCamaraScreen() {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const playerUrl = useMemo(() => buildPlayerUrl(selectedVideo?.videoId), [selectedVideo]);
  const WebView = useMemo(getWebViewComponent, []);
  const cannotLoadNativeWebView = !WebView;

  useEffect(() => {
    let mounted = true;

    const fetchVideos = async () => {
      try {
        setVideosLoading(true);
        setVideosError(false);

        const response = await fetch(videosEndpoint);

        if (!response.ok) {
          throw new Error(`Falha HTTP ${response.status}`);
        }

        const payload = await response.json();
        const playlistVideos = Array.isArray(payload?.videos) ? payload.videos : [];

        if (!mounted) return;

        setVideos(playlistVideos);
        setSelectedVideo(playlistVideos[0] ?? null);
        setHasError(false);
      } catch (error) {
        console.error('Falha ao carregar videos da TV Camara:', error);

        if (mounted) {
          setVideosError(true);
        }
      } finally {
        if (mounted) {
          setVideosLoading(false);
        }
      }
    };

    fetchVideos();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectVideo = (video) => {
    setLoading(true);
    setHasError(false);
    setSelectedVideo(video);
  };

  return (
    <Container>
      <Header>
        <HeaderRow>
          <BrandGroup>
            <BrandMark />
            <TitleGroup>
              <Title>TV Câmara</Title>
              <Subtitle>Playlist oficial atualizada automaticamente</Subtitle>
            </TitleGroup>
          </BrandGroup>

          <LiveBadge>
            <LiveDot />
            <LiveText>NO APP</LiveText>
          </LiveBadge>
        </HeaderRow>
      </Header>

      <PlayerArea>
        {hasError || cannotLoadNativeWebView || !selectedVideo ? (
          <ErrorBox>
            {videosLoading ? (
              <ActivityIndicator color={secondaryColor} size="large" />
            ) : (
              <MaterialCommunityIcons name="alert-circle-outline" size={42} color={primaryColor} />
            )}
            <ErrorTitle>{videosLoading ? 'Carregando TV Câmara' : 'Não foi possível carregar a TV Câmara'}</ErrorTitle>
            <ErrorText>
              {cannotLoadNativeWebView
                ? 'O player interno precisa que o app seja recompilado com o módulo nativo de vídeo.'
                : !selectedVideo && !videosLoading
                  ? 'Nenhum vídeo foi encontrado para iniciar o player.'
                : 'Verifique sua conexão e tente novamente em alguns instantes.'}
            </ErrorText>
          </ErrorBox>
        ) : (
          <>
            <WebView
              source={{ uri: playerUrl }}
              style={{ flex: 1, backgroundColor: '#0f172a' }}
              javaScriptEnabled
              domStorageEnabled
              allowsProtectedMedia
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              allowsPictureInPictureMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              mixedContentMode="compatibility"
              originWhitelist={['https://*', 'http://*']}
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              setSupportMultipleWindows={false}
              allowsLinkPreview={false}
              userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={(event) => {
                console.warn('Erro do WebView no player YouTube:', event.nativeEvent?.description, event.nativeEvent?.url);
                setLoading(false);
                setHasError(true);
              }}
              onHttpError={(event) => {
                console.warn('HTTP interno do player YouTube:', event.nativeEvent?.statusCode, event.nativeEvent?.url);
              }}
            />

            {loading && (
              <LoadingBox>
                <ActivityIndicator color={secondaryColor} size="large" />
                <LoadingText>Carregando TV Câmara...</LoadingText>
              </LoadingBox>
            )}
          </>
        )}
      </PlayerArea>

      <Content showsVerticalScrollIndicator={false}>
        <Spotlight>
          <SpotlightEyebrow>Agora na TV Câmara</SpotlightEyebrow>
          <SpotlightTitle>{selectedVideo?.title || 'Últimos vídeos do canal'}</SpotlightTitle>
          <SpotlightText>
            Acompanhe sessões, comunicados e conteúdos institucionais em uma experiência integrada ao aplicativo.
          </SpotlightText>

          <ActionRow>
            <Pill>
              <MaterialCommunityIcons name="play-circle" size={17} color="#fff" />
              <PillText>Player interno</PillText>
            </Pill>
            <Pill>
              <MaterialCommunityIcons name="picture-in-picture-bottom-right" size={17} color="#fff" />
              <PillText>PiP disponível</PillText>
            </Pill>
          </ActionRow>
        </Spotlight>

        <Rail>
          <RailTitle>Todos os vídeos</RailTitle>
          {videosLoading ? (
            <EmptyBox>
              <ActivityIndicator color={secondaryColor} />
              <LoadingText>Carregando vídeos...</LoadingText>
            </EmptyBox>
          ) : videosError ? (
            <EmptyBox>
              <MaterialCommunityIcons name="alert-circle-outline" size={34} color={secondaryColor} />
              <ErrorText>Não foi possível carregar a lista de vídeos agora.</ErrorText>
            </EmptyBox>
          ) : videos.length === 0 ? (
            <EmptyBox>
              <MaterialCommunityIcons name="playlist-remove" size={34} color={secondaryColor} />
              <ErrorText>Nenhum vídeo encontrado na playlist.</ErrorText>
            </EmptyBox>
          ) : (
            videos.map((video, index) => {
              const selected = selectedVideo?.videoId === video.videoId;

              return (
                <VideoCard
                  key={`${video.videoId}-${index}`}
                  selected={selected}
                  activeOpacity={0.76}
                  onPress={() => handleSelectVideo(video)}
                >
                  <ThumbnailBox>
                    {video.thumbnailUrl ? (
                      <ThumbnailImage source={{ uri: video.thumbnailUrl }} resizeMode="cover" />
                    ) : (
                      <ThumbnailFallback>
                        <MaterialCommunityIcons name="play-circle-outline" size={34} color="#94a3b8" />
                      </ThumbnailFallback>
                    )}
                  </ThumbnailBox>
                  <VideoInfo>
                    <VideoTitle numberOfLines={3}>{video.title}</VideoTitle>
                    <VideoMeta>
                      {selected ? 'Reproduzindo agora' : `${formatVideoDate(video.publishedAt)} • Toque para assistir`}
                    </VideoMeta>
                  </VideoInfo>
                </VideoCard>
              );
            })
          )}
        </Rail>
      </Content>
    </Container>
  );
}
