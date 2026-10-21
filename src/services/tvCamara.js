import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig';

export const TV_PLAYLIST_COLLECTION = 'tv-camara-playlist';
export const TV_LOGS_COLLECTION = 'tv-camara-logs';

export function extractYoutubeVideoId(value = '') {
  const text = String(value).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  return patterns.map(pattern => text.match(pattern)?.[1]).find(Boolean) || '';
}

export const getYoutubeThumbnail = videoId => videoId
  ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  : '';

export function normalizeTvVideo(video = {}, source = 'endpoint') {
  const rawVideoId = video.videoId || extractYoutubeVideoId(video.url || video.link || '');
  const videoId = /^[a-zA-Z0-9_-]{11}$/.test(rawVideoId) ? rawVideoId : '';
  return {
    ...video,
    videoId,
    title: video.title || video.titulo || 'Vídeo da TV Câmara',
    description: video.description || video.descricao || '',
    thumbnailUrl: video.thumbnailUrl || video.thumbnail || getYoutubeThumbnail(videoId),
    publishedAt: video.publishedAt || video.createdAt || new Date().toISOString(),
    source,
  };
}

const timestampOf = video => {
  const value = video?.publishedAt || video?.createdAt || '';
  const timestamp = new Date(value?.toDate ? value.toDate() : value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export function mergeTvVideos(manualVideos = [], endpointVideos = []) {
  const unique = new Map();
  [...manualVideos, ...endpointVideos].forEach(video => {
    if (video.videoId && !unique.has(video.videoId)) unique.set(video.videoId, video);
  });
  return [...unique.values()].sort((first, second) => timestampOf(second) - timestampOf(first));
}

export function buildTvPlayerUrl(videoId, { origin, widgetReferrer } = {}) {
  if (!videoId) return null;
  const params = new URLSearchParams({ rel: '0', playsinline: '1' });
  if (origin) params.set('origin', origin);
  if (widgetReferrer) params.set('widget_referrer', widgetReferrer);
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export function getTvEmbedIdentity(website, fallbackHost) {
  const candidate = String(website || '').trim();
  const normalized = candidate ? (/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`) : '';
  try {
    const parsed = new URL(normalized || `https://${fallbackHost}`);
    return { origin: parsed.origin, referrer: `${parsed.origin}/` };
  } catch {
    return { origin: '', referrer: '' };
  }
}

export function formatTvVideoDate(value) {
  if (!value) return 'TV Câmara';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'TV Câmara';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export async function fetchManualTvVideos() {
  const snapshot = await getDocs(query(collection(firestore, TV_PLAYLIST_COLLECTION), orderBy('createdAt', 'desc')));
  return snapshot.docs
    .map(item => normalizeTvVideo({ id: item.id, ...item.data() }, 'manual'))
    .filter(video => video.active !== false && video.videoId);
}

export async function fetchEndpointTvVideos(endpoint) {
  if (!endpoint) throw new Error('Configure o endpoint da TV Câmara no Controle do Sistema.');
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`A fonte da TV Câmara respondeu com erro HTTP ${response.status}.`);
  const payload = await response.json();
  const videos = Array.isArray(payload?.videos) ? payload.videos.map(video => normalizeTvVideo(video)) : [];
  return { payload, videos };
}
