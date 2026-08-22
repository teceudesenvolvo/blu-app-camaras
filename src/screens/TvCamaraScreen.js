import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions } from 'react-native';
import styled from 'styled-components/native';
import {
  PortalBackground,
  PortalCard,
  PortalScreenHeader,
} from '../components/PortalScaffold';
import { portalGradients, portalTheme } from '../styles/portalTheme';

const videosEndpoint = 'https://southamerica-east1-blu-app-camara.cloudfunctions.net/listarVideosTvCamara';
const { width } = Dimensions.get('window');
const playerWidth = width - 36;
const playerHeight = Math.round(playerWidth * 9 / 16);

const Content = styled.ScrollView`
  flex: 1;
`;

const Inner = styled.View`
  padding: 18px 18px 120px;
`;

const PlayerCard = styled(PortalCard)`
  padding: 0;
  overflow: hidden;
  border-radius: 16px;
`;

const PlayerArea = styled.View`
  height: ${playerHeight}px;
  background-color: #030712;
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
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
`;

const ErrorBox = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background-color: ${({ theme }) => theme.portal.page};
`;

const ErrorTitle = styled.Text`
  margin-top: 12px;
  font-size: 18px;
  font-weight: 900;
  color: ${({ theme }) => theme.portal.text};
  text-align: center;
`;

const ErrorText = styled.Text`
  margin-top: 8px;
  font-size: 14px;
  line-height: 21px;
  color: ${({ theme }) => theme.portal.muted};
  text-align: center;
`;

const NowCard = styled(PortalCard)`
  margin-top: 14px;
`;

const NowRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const NowIcon = styled(LinearGradient).attrs(({ theme }) => ({
  colors: theme.gradients?.primary || portalGradients.primary,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
}))`
  width: 46px;
  height: 46px;
  border-radius: 23px;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const NowTextGroup = styled.View`
  flex: 1;
`;

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.portal.primary};
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
`;

const NowTitle = styled.Text`
  margin-top: 4px;
  color: ${({ theme }) => theme.portal.text};
  font-size: 18px;
  line-height: 23px;
  font-weight: 900;
`;

const PillRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 14px;
`;

const Pill = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 8px 10px;
  border-radius: 999px;
  background-color: rgba(2, 90, 161, 0.08);
  margin-right: 8px;
  margin-bottom: 8px;
`;

const PillText = styled.Text`
  margin-left: 6px;
  color: ${({ theme }) => theme.portal.primary};
  font-size: 12px;
  font-weight: 800;
`;

const SectionTitle = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 19px;
  font-weight: 900;
  margin: 22px 0 12px;
`;

const VideoCard = styled.TouchableOpacity`
  flex-direction: row;
  min-height: 94px;
  border-radius: 14px;
  margin-bottom: 12px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.portal.card};
  border-width: 1px;
  border-color: ${props => props.selected ? portalTheme.primary : portalTheme.border};
  shadow-color: #0f172a;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.06;
  shadow-radius: 16px;
  elevation: 2;
`;

const ThumbnailBox = styled.View`
  width: 142px;
  aspect-ratio: 1.7777777778;
  background-color: #e2e8f0;
`;

const ThumbnailImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const ThumbnailFallback = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: #e2e8f0;
`;

const VideoInfo = styled.View`
  flex: 1;
  padding: 11px 12px;
  justify-content: space-between;
`;

const VideoTitle = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 14px;
  line-height: 18px;
  font-weight: 800;
`;

const VideoMeta = styled.Text`
  color: ${props => props.selected ? portalTheme.primary : portalTheme.muted};
  font-size: 12px;
  font-weight: 800;
`;

const EmptyBox = styled(PortalCard)`
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

function buildPlayerUrl(videoId) {
  if (!videoId) return null;

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    origin: 'https://www.youtube-nocookie.com',
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function getVideoTimestamp(video) {
  const timestamp = new Date(video?.publishedAt ?? '').getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
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
  if (!value) return 'TV Câmara';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TV Câmara';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function TvCamaraScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const playerUrl = useMemo(() => buildPlayerUrl(selectedVideo?.videoId), [selectedVideo]);
  const WebView = useMemo(getWebViewComponent, []);
  const cannotLoadNativeWebView = !WebView;
  const requestedVideoId = route?.params?.videoId;

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
        const orderedVideos = [...playlistVideos].sort(
          (firstVideo, secondVideo) => getVideoTimestamp(secondVideo) - getVideoTimestamp(firstVideo),
        );

        if (!mounted) return;

        const initialVideo =
          orderedVideos.find((video) => video.videoId === requestedVideoId) ||
          orderedVideos[0] ||
          null;

        setVideos(orderedVideos);
        setSelectedVideo(initialVideo);
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
  }, [requestedVideoId]);

  const handleSelectVideo = (video) => {
    setLoading(true);
    setHasError(false);
    setSelectedVideo(video);
  };

  return (
    <PortalBackground>
      <PortalScreenHeader
        navigation={navigation}
        title="TV Câmara"
        subtitle="Assista aos vídeos oficiais sem sair do aplicativo."
      />

      <Content showsVerticalScrollIndicator={false}>
        <Inner>
          <PlayerCard>
            <PlayerArea>
              {hasError || cannotLoadNativeWebView || !selectedVideo ? (
                <ErrorBox>
                  {videosLoading ? (
                    <ActivityIndicator color={portalTheme.primary} size="large" />
                  ) : (
                    <MaterialCommunityIcons name="alert-circle-outline" size={42} color={portalTheme.primary} />
                  )}
                  <ErrorTitle>{videosLoading ? 'Carregando TV Câmara' : 'Não foi possível carregar o player'}</ErrorTitle>
                  <ErrorText>
                    {cannotLoadNativeWebView
                      ? 'O player interno precisa que o app seja recompilado com o módulo nativo de vídeo.'
                      : !selectedVideo && !videosLoading
                        ? 'Nenhum vídeo foi encontrado para iniciar a reprodução.'
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
                      <ActivityIndicator color={portalTheme.secondary} size="large" />
                      <LoadingText>Carregando TV Câmara...</LoadingText>
                    </LoadingBox>
                  )}
                </>
              )}
            </PlayerArea>
          </PlayerCard>

          <NowCard>
            <NowRow>
              <NowIcon>
                <MaterialCommunityIcons name="play" size={24} color="#fff" />
              </NowIcon>
              <NowTextGroup>
                <Eyebrow>Reproduzindo agora</Eyebrow>
                <NowTitle numberOfLines={3}>{selectedVideo?.title || 'Últimos vídeos do canal'}</NowTitle>
              </NowTextGroup>
            </NowRow>

            <PillRow>
              <Pill>
                <MaterialCommunityIcons name="cellphone-play" size={16} color={portalTheme.primary} />
                <PillText>Player interno</PillText>
              </Pill>
              <Pill>
                <MaterialCommunityIcons name="picture-in-picture-bottom-right" size={16} color={portalTheme.primary} />
                <PillText>Picture in Picture</PillText>
              </Pill>
            </PillRow>
          </NowCard>

          <SectionTitle>Todos os vídeos</SectionTitle>
          {videosLoading ? (
            <EmptyBox>
              <ActivityIndicator color={portalTheme.primary} />
              <ErrorText>Carregando vídeos...</ErrorText>
            </EmptyBox>
          ) : videosError ? (
            <EmptyBox>
              <MaterialCommunityIcons name="alert-circle-outline" size={34} color={portalTheme.primary} />
              <ErrorText>Não foi possível carregar a lista de vídeos agora.</ErrorText>
            </EmptyBox>
          ) : videos.length === 0 ? (
            <EmptyBox>
              <MaterialCommunityIcons name="playlist-remove" size={34} color={portalTheme.primary} />
              <ErrorText>Nenhum vídeo encontrado na playlist.</ErrorText>
            </EmptyBox>
          ) : (
            videos.map((video, index) => {
              const selected = selectedVideo?.videoId === video.videoId;

              return (
                <VideoCard
                  key={`${video.videoId}-${index}`}
                  selected={selected}
                  activeOpacity={0.78}
                  onPress={() => handleSelectVideo(video)}
                >
                  <ThumbnailBox>
                    {video.thumbnailUrl ? (
                      <ThumbnailImage source={{ uri: video.thumbnailUrl }} resizeMode="cover" />
                    ) : (
                      <ThumbnailFallback>
                        <MaterialCommunityIcons name="play-circle-outline" size={34} color={portalTheme.muted} />
                      </ThumbnailFallback>
                    )}
                  </ThumbnailBox>
                  <VideoInfo>
                    <VideoTitle numberOfLines={3}>{video.title}</VideoTitle>
                    <VideoMeta selected={selected}>
                      {selected ? 'Reproduzindo agora' : `${formatVideoDate(video.publishedAt)} • Toque para assistir`}
                    </VideoMeta>
                  </VideoInfo>
                </VideoCard>
              );
            })
          )}
        </Inner>
      </Content>
    </PortalBackground>
  );
}
