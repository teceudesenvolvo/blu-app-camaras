import { MaterialCommunityIcons } from '@expo/vector-icons';
import { httpsCallable } from 'firebase/functions';
import {
  addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Share, TextInput, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';

import { PortalBackground, PortalCard, PortalScreenHeader } from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';
import chamberConfig from '../config';
import { useMobileModules } from '../context/MobileModulesContext';
import { useSystemControl } from '../context/SystemControlContext';
import {
  buildTvPlayerUrl, extractYoutubeVideoId, fetchEndpointTvVideos, formatTvVideoDate,
  getTvEmbedIdentity, getYoutubeThumbnail, mergeTvVideos, normalizeTvVideo, TV_LOGS_COLLECTION,
  TV_PLAYLIST_COLLECTION,
} from '../services/tvCamara';
import { auth, firestore, functions } from '../../services/firebaseConfig';

const Content = styled.ScrollView`flex: 1;`;
const Inner = styled.View`padding: 16px 18px 40px;`;
const Toolbar = styled.View`flex-direction: row; gap: 8px; margin-bottom: 14px;`;
const Tab = styled.TouchableOpacity`padding: 10px 14px; border-radius: 12px; background-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.card}; border-width: 1px; border-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.border};`;
const TabText = styled.Text`color: ${({ active, theme }) => active ? '#fff' : theme.portal.text}; font-size: 13px; font-weight: 800;`;
const Metrics = styled.View`flex-direction: row; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;`;
const Metric = styled(PortalCard)`flex: 1; min-width: 28%; padding: 14px;`;
const MetricLabel = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 12px; font-weight: 700;`;
const MetricValue = styled.Text`margin-top: 4px; color: ${({ theme }) => theme.portal.text}; font-size: 22px; font-weight: 900;`;
const Card = styled(PortalCard)`margin-bottom: 14px;`;
const CardTitle = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 17px; font-weight: 900; margin-bottom: 10px;`;
const Copy = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 13px; line-height: 19px;`;
const Label = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 13px; font-weight: 800; margin-top: 12px;`;
const Input = styled(TextInput)`min-height: 46px; margin-top: 7px; padding: 0 12px; border-radius: 11px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; color: ${({ theme }) => theme.portal.text}; background-color: ${({ theme }) => theme.portal.pageAlt};`;
const TextArea = styled(Input)`height: 90px; padding: 11px 12px; text-align-vertical: top;`;
const Button = styled.TouchableOpacity`min-height: 46px; margin-top: 12px; padding: 12px 14px; border-radius: 11px; align-items: center; justify-content: center; flex-direction: row; gap: 8px; background-color: ${({ theme, secondary }) => secondary ? theme.portal.pageAlt : theme.portal.primary}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const ButtonText = styled.Text`color: ${({ theme, secondary }) => secondary ? theme.portal.primary : '#fff'}; font-size: 14px; font-weight: 900;`;
const VideoRow = styled.View`flex-direction: row; align-items: center; padding: 11px 0; border-bottom-width: 1px; border-bottom-color: ${({ theme }) => theme.portal.border};`;
const Thumbnail = styled.Image`width: 94px; height: 60px; border-radius: 8px; background-color: #dbe5ef;`;
const VideoInfo = styled.View`flex: 1; margin-left: 11px; margin-right: 7px;`;
const VideoTitle = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 13px; line-height: 18px; font-weight: 800;`;
const Meta = styled.Text`margin-top: 4px; color: ${({ theme }) => theme.portal.muted}; font-size: 11px;`;
const IconButton = styled.TouchableOpacity`width: 38px; height: 38px; align-items: center; justify-content: center; border-radius: 19px; background-color: ${({ theme }) => theme.portal.pageAlt};`;
const PlayerFrame = styled.View`width: 100%; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 12px; background-color: #030712;`;
const PlayerFallback = styled.View`flex: 1; align-items: center; justify-content: center; padding: 18px;`;
const ErrorText = styled.Text`color: ${({ theme }) => theme.portal.danger}; font-size: 13px; line-height: 19px; margin-top: 8px;`;
const EmptyText = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 14px; line-height: 21px; padding: 18px 4px; text-align: center;`;
const LogRow = styled.View`padding: 11px 0; border-bottom-width: 1px; border-bottom-color: ${({ theme }) => theme.portal.border};`;
const LogTitle = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 13px; font-weight: 800;`;
const LogMeta = styled.Text`margin-top: 4px; color: ${({ theme }) => theme.portal.muted}; font-size: 11px;`;
const StatusPill = styled.View`align-self: flex-start; margin-top: 8px; padding: 5px 9px; border-radius: 20px; background-color: ${({ theme, failed }) => failed ? theme.portal.danger + '18' : theme.portal.success + '18'};`;
const StatusText = styled.Text`color: ${({ theme, failed }) => failed ? theme.portal.danger : theme.portal.success}; font-size: 11px; font-weight: 800;`;

const defaultForm = { url: '', title: '', description: '' };
const getTranscriptionText = value => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const text = value.text || value.transcript || value.transcription || value.html;
  const fromSegments = Array.isArray(value.segments)
    ? value.segments.map(segment => typeof segment === 'string' ? segment : segment.text || '').filter(Boolean).join('\n')
    : '';
  return String(text || fromSegments || JSON.stringify(value))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
const dateOf = value => {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('pt-BR') : 'Sem data';
};
const getWebView = () => {
  try { return require('react-native-webview').default; }
  catch { return null; }
};
const functionEndpoint = (name, settings) => {
  const configuredBase = String(settings?.integrations?.functionsBaseUrl || '').trim().replace(/\/$/, '');
  const base = configuredBase || `https://${chamberConfig.functionsRegion || 'us-central1'}-${chamberConfig.firebase.projectId}.cloudfunctions.net`;
  return `${base}/${name}`;
};

export default function AdminTvCamaraScreen({ navigation }) {
  const { canUseAdminApp } = useMobileModules();
  const { settings } = useSystemControl();
  const { user } = useContext(AuthContext);
  const WebView = useMemo(getWebView, []);
  const endpoint = settings?.integrations?.youtubeApiUrl || chamberConfig.videosEndpoint || '';
  const [tab, setTab] = useState('playlist');
  const [manualVideos, setManualVideos] = useState([]);
  const [endpointVideos, setEndpointVideos] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playerError, setPlayerError] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playlistError, setPlaylistError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [endpointError, setEndpointError] = useState('');
  const [transcriptionVideoId, setTranscriptionVideoId] = useState('');
  const [transcriptionBusy, setTranscriptionBusy] = useState(false);
  const [transcriptionJobId, setTranscriptionJobId] = useState('');
  const [transcription, setTranscription] = useState(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [transcriptionMessage, setTranscriptionMessage] = useState('');
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthUrl, setOauthUrl] = useState('');
  const [oauthCallback, setOauthCallback] = useState('');
  const [oauthMessage, setOauthMessage] = useState('');
  const [syncingLogs, setSyncingLogs] = useState(false);

  const videos = useMemo(() => mergeTvVideos(manualVideos, endpointVideos), [manualVideos, endpointVideos]);
  const embedIdentity = useMemo(
    () => getTvEmbedIdentity(settings?.tenant?.website, chamberConfig.firebase.authDomain),
    [settings?.tenant?.website],
  );
  const playerUrl = buildTvPlayerUrl(selectedVideo?.videoId, {
    origin: embedIdentity.origin,
    widgetReferrer: embedIdentity.referrer,
  });

  useEffect(() => {
    if (!canUseAdminApp('tvCamara')) return undefined;
    const stopPlaylist = onSnapshot(query(collection(firestore, TV_PLAYLIST_COLLECTION), orderBy('createdAt', 'desc')), snapshot => {
      setPlaylistError('');
      setManualVideos(snapshot.docs.map(item => normalizeTvVideo({ id: item.id, ...item.data() }, 'manual')).filter(item => item.videoId));
      setLoading(false);
    }, error => {
      console.error('Falha ao carregar playlist manual da TV Câmara:', error);
      setPlaylistError(error.message || 'Não foi possível carregar a playlist manual.');
      setLoading(false);
    });
    const stopLogs = onSnapshot(query(collection(firestore, TV_LOGS_COLLECTION), orderBy('createdAt', 'desc'), limit(25)), snapshot => {
      setLogs(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }, error => console.warn('Falha ao carregar registros da TV Câmara:', error.code || error.message));
    return () => { stopPlaylist(); stopLogs(); };
  }, [canUseAdminApp]);

  useEffect(() => {
    if (selectedVideo && videos.some(video => video.videoId === selectedVideo.videoId)) return;
    setSelectedVideo(videos[0] || null);
  }, [selectedVideo, videos]);

  useEffect(() => {
    if (!transcriptionJobId) return undefined;
    return onSnapshot(doc(firestore, 'tv-camara-transcriptions', transcriptionJobId), snapshot => {
      if (!snapshot.exists()) {
        setTranscriptionBusy(false);
        setTranscriptionMessage('O processamento não foi localizado.');
        return;
      }
      const job = snapshot.data();
      if (job.status === 'completed') {
        const result = job.transcription || job.transcript || null;
        setTranscription(result);
        setTranscriptionText(getTranscriptionText(result));
        setTranscriptionMessage('Transcrição concluída.');
        setTranscriptionBusy(false);
      } else if (job.status === 'error') {
        setTranscriptionMessage(job.error || 'Não foi possível transcrever o vídeo.');
        setTranscriptionBusy(false);
      } else {
        setTranscriptionMessage(job.status === 'queued' ? 'Aguardando processamento…' : 'Transcrevendo vídeo…');
      }
    }, error => {
      setTranscriptionMessage(error.message || 'Não foi possível acompanhar a transcrição.');
      setTranscriptionBusy(false);
    });
  }, [transcriptionJobId]);

  const writeLog = useCallback(async (status, message, details = {}) => {
    try {
      await addDoc(collection(firestore, TV_LOGS_COLLECTION), {
        status, category: 'youtube', functionId: 'listarVideosTvCamara', functionName: 'listarVideosTvCamara',
        functionLabel: 'Listagem da TV Câmara', endpoint: endpoint || null, message, details,
        createdAt: serverTimestamp(), createdBy: user?.email || 'admin',
      });
    } catch (error) {
      console.warn('Não foi possível salvar o log da TV Câmara:', error.code || error.message);
    }
  }, [endpoint, user?.email]);

  const refreshVideos = useCallback(async () => {
    setRefreshing(true);
    setEndpointError('');
    const startedAt = Date.now();
    try {
      const result = await fetchEndpointTvVideos(endpoint);
      setEndpointVideos(result.videos);
      await writeLog('success', `Fonte consultada: ${result.videos.length} vídeo(s).`, {
        count: result.videos.length, durationMs: Date.now() - startedAt, playlistId: result.payload?.playlistId || null,
      });
    } catch (error) {
      console.error('Falha ao atualizar vídeos da TV Câmara:', error);
      setEndpointError(error.message || 'Não foi possível consultar a fonte da TV Câmara.');
      await writeLog('error', error.message || 'Falha ao consultar a fonte.', { durationMs: Date.now() - startedAt }).catch(() => {});
    } finally {
      setRefreshing(false);
    }
  }, [endpoint, writeLog]);

  const selectVideo = video => {
    setPlayerError(false);
    setSelectedVideo(video);
  };

  const postAdminFunction = async (name, body) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    const response = await fetch(functionEndpoint(name, settings), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...body, source: 'admin-tv-camara' }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || `Falha HTTP ${response.status}.`);
    return payload;
  };

  const generateYoutubeAuthorization = async () => {
    setOauthBusy(true);
    setOauthMessage('');
    try {
      const payload = await postAdminFunction('getYoutubeOAuthUrl', {});
      if (!payload.authUrl) throw new Error('O Firebase não retornou a URL de autorização.');
      setOauthUrl(payload.authUrl);
      await Linking.openURL(payload.authUrl);
      setOauthMessage('Autorize a conta do canal no navegador. Depois, cole aqui a URL de retorno do Google.');
    } catch (error) {
      setOauthMessage(error.message || 'Não foi possível iniciar a autorização do YouTube.');
    } finally { setOauthBusy(false); }
  };

  const saveYoutubeAuthorization = async () => {
    if (!oauthCallback.trim()) return;
    setOauthBusy(true);
    setOauthMessage('');
    try {
      await postAdminFunction('updateYoutubeRefreshToken', { callbackUrl: oauthCallback.trim() });
      setOauthCallback('');
      setOauthUrl('');
      setOauthMessage('Autorização atualizada no Firebase. Os tokens permanecem protegidos no servidor.');
      await writeLog('success', 'Refresh token do YouTube atualizado pelo fluxo OAuth.', { action: 'oauth-refresh' });
    } catch (error) {
      setOauthMessage(error.message || 'Não foi possível atualizar a autorização do YouTube.');
    } finally { setOauthBusy(false); }
  };

  const syncYoutubeLogs = async () => {
    setSyncingLogs(true);
    try {
      await postAdminFunction('syncYoutubeFunctionLogs', { functionId: 'all' });
      await writeLog('success', 'Logs das funções do YouTube sincronizados.', { action: 'sync-youtube-logs' });
    } catch (error) {
      console.error('Falha ao sincronizar logs do YouTube:', error);
      Alert.alert('Não foi possível sincronizar', error.message || 'Tente novamente.');
    } finally { setSyncingLogs(false); }
  };

  useEffect(() => {
    if (canUseAdminApp('tvCamara')) refreshVideos();
  }, [canUseAdminApp, refreshVideos]);

  if (!canUseAdminApp('tvCamara')) return <PortalBackground><PortalScreenHeader navigation={navigation} title="Acesso indisponível" /><EmptyText>Seu perfil não possui acesso administrativo à TV Câmara.</EmptyText></PortalBackground>;

  const addVideo = async () => {
    const videoId = extractYoutubeVideoId(form.url);
    if (!videoId) return Alert.alert('Link inválido', 'Informe uma URL ou um ID válido do YouTube.');
    if (manualVideos.some(video => video.videoId === videoId)) return Alert.alert('Vídeo já cadastrado', 'Este vídeo já está na playlist manual.');
    setSaving(true);
    try {
      await addDoc(collection(firestore, TV_PLAYLIST_COLLECTION), {
        videoId, url: `https://www.youtube.com/watch?v=${videoId}`,
        title: form.title.trim() || 'Vídeo da TV Câmara', description: form.description.trim(),
        thumbnailUrl: getYoutubeThumbnail(videoId), active: true, createdAt: serverTimestamp(),
        createdBy: user?.email || user?.uid || 'admin',
      });
      await writeLog('success', `Vídeo manual adicionado: ${form.title.trim() || videoId}.`, { action: 'add-video', videoId });
      setForm(defaultForm);
      setShowForm(false);
      Alert.alert('Adicionado', 'O vídeo foi incluído na playlist manual.');
    } catch (error) {
      console.error('Falha ao adicionar vídeo à playlist:', error);
      Alert.alert('Não foi possível salvar', error.message || 'Tente novamente.');
    } finally { setSaving(false); }
  };

  const toggleVideo = async video => {
    const active = video.active === false;
    try {
      await updateDoc(doc(firestore, TV_PLAYLIST_COLLECTION, video.id), { active, updatedAt: serverTimestamp() });
      await writeLog('success', `Vídeo ${active ? 'ativado' : 'ocultado'}: ${video.title}.`, { action: active ? 'activate-video' : 'hide-video', videoId: video.videoId });
    } catch (error) { Alert.alert('Não foi possível atualizar', error.message || 'Tente novamente.'); }
  };

  const removeVideo = video => Alert.alert('Remover vídeo', `Remover “${video.title}” da playlist manual?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: async () => {
      try {
        await deleteDoc(doc(firestore, TV_PLAYLIST_COLLECTION, video.id));
        await writeLog('success', `Vídeo removido: ${video.title}.`, { action: 'delete-video', videoId: video.videoId });
      } catch (error) { Alert.alert('Não foi possível remover', error.message || 'Tente novamente.'); }
    } },
  ]);

  const startTranscription = async () => {
    if (!transcriptionVideoId) return Alert.alert('Selecione um vídeo', 'Escolha um vídeo da playlist para transcrever.');
    setTranscriptionBusy(true);
    setTranscription(null);
    setTranscriptionText('');
    setTranscriptionMessage('Enviando solicitação…');
    try {
      const video = videos.find(item => item.videoId === transcriptionVideoId);
      const result = await httpsCallable(functions, 'startTvCamaraTranscription')({
        videoId: transcriptionVideoId, videoTitle: video?.title || 'Sessão da TV Câmara', videoSource: video?.source || 'playlist',
      });
      setTranscriptionJobId(result.data?.jobId || '');
      if (!result.data?.jobId) throw new Error('O serviço não retornou o identificador do processamento.');
      setTranscriptionMessage('Solicitação enviada.');
      await writeLog('success', `Transcrição iniciada: ${video?.title || transcriptionVideoId}.`, { action: 'transcription-start', videoId: transcriptionVideoId });
    } catch (error) {
      console.error('Falha ao iniciar transcrição da TV Câmara:', error);
      setTranscriptionBusy(false);
      setTranscriptionMessage(error.message || 'Não foi possível iniciar a transcrição.');
    }
  };

  const shareTranscription = async () => {
    const text = transcriptionText.trim();
    if (!text) return;
    const video = videos.find(item => item.videoId === transcriptionVideoId);
    try {
      await Share.share({
        title: `Transcrição: ${video?.title || 'TV Câmara'}`,
        message: `${video?.title ? `${video.title}\n\n` : ''}${text}`,
      });
    } catch (error) {
      Alert.alert('Não foi possível compartilhar', error.message || 'Tente novamente.');
    }
  };

  return <PortalBackground>
    <PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title="TV Câmara" subtitle="Gerencie a playlist, acompanhe a integração e transcreva sessões." />
    <Content showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Inner>
        <Metrics>
          <Metric><MetricLabel>Playlist manual</MetricLabel><MetricValue>{manualVideos.filter(video => video.active !== false).length}</MetricValue></Metric>
          <Metric><MetricLabel>Vídeos da fonte</MetricLabel><MetricValue>{endpointVideos.length}</MetricValue></Metric>
          <Metric><MetricLabel>Total disponível</MetricLabel><MetricValue>{videos.length}</MetricValue></Metric>
        </Metrics>
        <Toolbar>
          <Tab active={tab === 'playlist'} onPress={() => setTab('playlist')}><TabText active={tab === 'playlist'}>Playlist</TabText></Tab>
          <Tab active={tab === 'integracao'} onPress={() => setTab('integracao')}><TabText active={tab === 'integracao'}>Integração e logs</TabText></Tab>
        </Toolbar>

        {tab === 'playlist' ? <>
          <Card>
            <CardTitle>Prévia da transmissão</CardTitle>
            <PlayerFrame>
              {!WebView || !playerUrl || playerError ? (
                <PlayerFallback>
                  <MaterialCommunityIcons name={playerError ? 'alert-circle-outline' : 'television-play'} size={34} color="#fff" />
                  <Copy style={{ marginTop: 8, textAlign: 'center' }}>{!WebView ? 'O player interno não está disponível neste binário.' : playerError ? 'O YouTube não permitiu a reprodução incorporada deste vídeo. Abra-o no YouTube para assistir.' : 'Selecione um vídeo da playlist.'}</Copy>
                  {playerError && selectedVideo?.videoId ? <Button onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${selectedVideo.videoId}`)}><ButtonText>Abrir no YouTube</ButtonText></Button> : null}
                </PlayerFallback>
              ) : <WebView
                key={selectedVideo.videoId}
                source={{ uri: playerUrl, headers: { Referer: embedIdentity.referrer } }}
                style={{ flex: 1, backgroundColor: '#030712' }}
                javaScriptEnabled
                domStorageEnabled
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={['https://*']}
                setSupportMultipleWindows={false}
                onError={event => {
                  console.warn('Falha no player administrativo da TV Câmara:', event.nativeEvent?.description);
                  setPlayerError(true);
                }}
              />}
            </PlayerFrame>
            <CardTitle style={{ marginTop: 12, marginBottom: 0 }}>{selectedVideo?.title || 'Nenhum vídeo selecionado'}</CardTitle>
            {selectedVideo?.description ? <Copy style={{ marginTop: 6 }}>{selectedVideo.description}</Copy> : null}
            {selectedVideo?.videoId ? <Button secondary onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${selectedVideo.videoId}`)}><MaterialCommunityIcons name="open-in-new" size={17} color="#025AA1" /><ButtonText secondary>Abrir no YouTube</ButtonText></Button> : null}
          </Card>

          <Card>
            <CardTitle>{showForm ? 'Adicionar vídeo manual' : 'Vídeos da playlist'}</CardTitle>
            {!showForm ? <>
              <Copy>Vídeos adicionados aqui são combinados com a fonte automática do YouTube, assim como no portal.</Copy>
              <Button onPress={() => setShowForm(true)}><MaterialCommunityIcons name="plus" size={19} color="#fff" /><ButtonText>Adicionar vídeo</ButtonText></Button>
            </> : <>
              <Label>URL ou ID do YouTube</Label><Input value={form.url} onChangeText={url => setForm(current => ({ ...current, url }))} autoCapitalize="none" placeholder="https://youtu.be/..." placeholderTextColor="#94a3b8" />
              <Label>Título</Label><Input value={form.title} onChangeText={title => setForm(current => ({ ...current, title }))} placeholder="Título exibido na playlist" placeholderTextColor="#94a3b8" />
              <Label>Descrição</Label><TextArea multiline value={form.description} onChangeText={description => setForm(current => ({ ...current, description }))} placeholder="Descrição opcional" placeholderTextColor="#94a3b8" />
              <Button disabled={saving} onPress={addVideo}><MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" /><ButtonText>{saving ? 'Salvando…' : 'Salvar na playlist'}</ButtonText></Button>
              <Button secondary onPress={() => { setShowForm(false); setForm(defaultForm); }}><ButtonText secondary>Cancelar</ButtonText></Button>
            </>}
            {playlistError ? <ErrorText>{playlistError}</ErrorText> : null}
            {loading ? <ActivityIndicator style={{ marginTop: 16 }} color="#025AA1" /> : videos.length === 0 ? <EmptyText>Nenhum vídeo disponível na playlist.</EmptyText> : <ScrollView style={{ maxHeight: 340 }} nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 4 }}>
              {videos.map(video => <VideoRow key={`${video.source}-${video.videoId}`}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => selectVideo(video)}><Thumbnail source={{ uri: video.thumbnailUrl }} /></TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => selectVideo(video)}><VideoInfo><VideoTitle numberOfLines={2}>{video.title}</VideoTitle><Meta>{video.source === 'manual' ? (video.active === false ? 'Oculto · Playlist manual' : 'Playlist manual') : 'Fonte YouTube'} · {formatTvVideoDate(video.publishedAt)}</Meta></VideoInfo></TouchableOpacity>
                {video.source === 'manual' ? <>
                  <IconButton accessibilityLabel={video.active === false ? 'Ativar vídeo' : 'Ocultar vídeo'} onPress={() => toggleVideo(video)}><MaterialCommunityIcons name={video.active === false ? 'eye-outline' : 'eye-off-outline'} size={20} color="#025AA1" /></IconButton>
                  <IconButton accessibilityLabel="Remover vídeo" onPress={() => removeVideo(video)}><MaterialCommunityIcons name="trash-can-outline" size={20} color="#dc2626" /></IconButton>
                </> : null}
              </VideoRow>)}
            </ScrollView>}
          </Card>

          <Card>
            <CardTitle>Transcrever sessão</CardTitle>
            <Copy>A transcrição é processada pelas funções protegidas do Firebase; credenciais do canal não ficam armazenadas no aplicativo.</Copy>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
              {videos.map(video => <Tab key={video.videoId} active={transcriptionVideoId === video.videoId} onPress={() => setTranscriptionVideoId(video.videoId)}><TabText active={transcriptionVideoId === video.videoId} numberOfLines={1}>{video.title}</TabText></Tab>)}
            </ScrollView>
            <Button disabled={transcriptionBusy || !transcriptionVideoId} onPress={startTranscription}><MaterialCommunityIcons name="microphone-outline" size={18} color="#fff" /><ButtonText>{transcriptionBusy ? 'Processando…' : 'Transcrever vídeo'}</ButtonText></Button>
            {transcriptionMessage ? <Copy style={{ marginTop: 9 }}>{transcriptionMessage}</Copy> : null}
            {transcription ? <>
              <Input multiline value={transcriptionText} onChangeText={setTranscriptionText} style={{ minHeight: 180, paddingTop: 10, textAlignVertical: 'top' }} />
              <Button secondary onPress={shareTranscription}><MaterialCommunityIcons name="share-variant" size={18} color="#025AA1" /><ButtonText secondary>Compartilhar transcrição</ButtonText></Button>
            </> : null}
          </Card>
        </> : <>
          <Card>
            <CardTitle>Fonte YouTube</CardTitle>
            <Copy>Endpoint configurado no Controle do Sistema. A URL é pública e não contém credenciais de escrita.</Copy>
            <Copy selectable style={{ marginTop: 8 }}>{endpoint || 'Nenhum endpoint configurado.'}</Copy>
            {endpointError ? <ErrorText>{endpointError}</ErrorText> : null}
            <StatusPill failed={Boolean(endpointError)}><StatusText failed={Boolean(endpointError)}>{refreshing ? 'Consultando…' : endpointError ? 'Falha na última consulta' : `Fonte respondendo · ${endpointVideos.length} vídeo(s)`}</StatusText></StatusPill>
            <Button disabled={refreshing} onPress={refreshVideos}><MaterialCommunityIcons name="refresh" size={18} color="#fff" /><ButtonText>{refreshing ? 'Atualizando…' : 'Testar e atualizar vídeos'}</ButtonText></Button>
          </Card>
          <Card>
            <CardTitle>Autorização do canal</CardTitle>
            <Copy>O Client ID, Client Secret e refresh token ficam no Firebase. Esta tela solicita a autorização e envia somente a URL de retorno ao servidor.</Copy>
            <Button disabled={oauthBusy} onPress={generateYoutubeAuthorization}><MaterialCommunityIcons name="open-in-new" size={18} color="#fff" /><ButtonText>{oauthBusy ? 'Aguarde…' : 'Gerar autorização do Google'}</ButtonText></Button>
            {oauthUrl ? <Button secondary onPress={() => Linking.openURL(oauthUrl)}><ButtonText secondary>Abrir autorização novamente</ButtonText></Button> : null}
            <Label>URL de retorno do Google</Label>
            <TextArea multiline autoCapitalize="none" value={oauthCallback} onChangeText={setOauthCallback} placeholder="Cole a URL retornada pelo Google" placeholderTextColor="#94a3b8" />
            <Button disabled={oauthBusy || !oauthCallback.trim()} onPress={saveYoutubeAuthorization}><MaterialCommunityIcons name="key-change" size={18} color="#fff" /><ButtonText>{oauthBusy ? 'Atualizando…' : 'Atualizar autorização no Firebase'}</ButtonText></Button>
            {oauthMessage ? <Copy style={{ marginTop: 10 }}>{oauthMessage}</Copy> : null}
          </Card>
          <Card>
            <CardTitle>Automação do canal</CardTitle>
            {[
              ['calendar-sync', 'Atualizar playlist do YouTube', 'Execução automática agendada no Firebase.'],
              ['webhook', 'Webhook do canal YouTube', 'Recebe notificações externas do canal.'],
              ['refresh', 'Renovar webhook YouTube', 'Renovação automática do webhook.'],
              ['video-outline', 'Listar vídeos da TV Câmara', 'Fonte consultada pelo botão Testar e atualizar vídeos.'],
            ].map(([icon, title, description]) => <VideoRow key={title}>
              <MaterialCommunityIcons name={icon} size={23} color="#025AA1" />
              <VideoInfo><VideoTitle>{title}</VideoTitle><Meta>{description}</Meta></VideoInfo>
              <StatusPill><StatusText>{title.startsWith('Listar') ? (endpointError ? 'Com erro' : 'Testável') : title.startsWith('Webhook') ? 'Externo' : 'Automática'}</StatusText></StatusPill>
            </VideoRow>)}
          </Card>
          <Card>
            <CardTitle>Registros recentes</CardTitle>
            <Copy>Eventos locais e registros sincronizados das funções executadas no Firebase.</Copy>
            <Button secondary disabled={syncingLogs} onPress={syncYoutubeLogs}><MaterialCommunityIcons name="cloud-sync-outline" size={18} color="#025AA1" /><ButtonText secondary>{syncingLogs ? 'Sincronizando…' : 'Sincronizar logs do Firebase'}</ButtonText></Button>
            {logs.length === 0 ? <EmptyText>Nenhum registro de integração encontrado.</EmptyText> : logs.map(log => <LogRow key={log.id}>
              <LogTitle>{log.functionLabel || log.functionName || 'TV Câmara'} · {log.message || log.status}</LogTitle>
              <LogMeta>{dateOf(log.createdAt)} · {log.createdBy || 'Sistema'}{Number.isFinite(log.durationMs) ? ` · ${log.durationMs} ms` : ''}</LogMeta>
              <StatusPill failed={log.status === 'error'}><StatusText failed={log.status === 'error'}>{log.status === 'error' ? 'Erro' : 'Sucesso'}</StatusText></StatusPill>
            </LogRow>)}</Card>
        </>}
      </Inner>
    </Content>
  </PortalBackground>;
}
