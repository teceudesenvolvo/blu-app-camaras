import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { XMLParser } from "fast-xml-parser";
import admin from "firebase-admin";
import { google, youtube_v3 } from "googleapis";

if (!admin.apps.length) {
  admin.initializeApp();
}

const youtubeClientId = defineSecret("YOUTUBE_CLIENT_ID");
const youtubeClientSecret = defineSecret("YOUTUBE_CLIENT_SECRET");
const youtubeRefreshToken = defineSecret("YOUTUBE_REFRESH_TOKEN");
const youtubeChannelId = defineSecret("YOUTUBE_CHANNEL_ID");
const youtubePlaylistId = defineSecret("YOUTUBE_PLAYLIST_ID");
const youtubeWebhookVerifyToken = defineSecret("YOUTUBE_WEBHOOK_VERIFY_TOKEN");

type PlaylistVideo = {
  playlistItemId: string;
  videoId: string;
  title: string;
};

type PublicPlaylistVideo = {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  position: number | null;
};

type YoutubeWebhookEntry = {
  videoId?: string;
  channelId?: string;
  title?: string;
};

function readSecret(secret: ReturnType<typeof defineSecret>, name: string): string {
  const value = secret.value()?.trim();

  if (!value) {
    throw new Error(`Secret obrigatorio ausente: ${name}`);
  }

  return value;
}

function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getPlaylistVideo(item: youtube_v3.Schema$PlaylistItem): PlaylistVideo | null {
  const playlistItemId = item.id;
  const videoId = item.snippet?.resourceId?.videoId;

  if (!playlistItemId || !videoId) {
    return null;
  }

  return {
    playlistItemId,
    videoId,
    title: item.snippet?.title ?? "Novo video na TV Câmara",
  };
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getPublicPlaylistVideo(item: youtube_v3.Schema$PlaylistItem): PublicPlaylistVideo | null {
  const videoId = item.snippet?.resourceId?.videoId;
  const title = item.snippet?.title;

  if (!videoId || !title) {
    return null;
  }

  const thumbnails = item.snippet?.thumbnails;
  const thumbnailUrl =
    thumbnails?.maxres?.url ??
    thumbnails?.standard?.url ??
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    null;

  return {
    videoId,
    title,
    description: item.snippet?.description ?? "",
    thumbnailUrl,
    publishedAt: item.snippet?.publishedAt ?? null,
    position: item.snippet?.position ?? null,
  };
}

function getFeedText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "#text" in value) {
    return String((value as { "#text"?: unknown })["#text"] ?? "");
  }

  return "";
}

function getPublicFeedVideo(entry: Record<string, unknown>, position: number): PublicPlaylistVideo | null {
  const videoId = getFeedText(entry.videoId) || getFeedText(entry.id).split(":").pop() || "";
  const title = getFeedText(entry.title) || "Vídeo da TV Câmara";

  if (!videoId) {
    return null;
  }

  const group = entry.group && typeof entry.group === "object"
    ? entry.group as Record<string, unknown>
    : {};
  const thumbnails = normalizeArray(group.thumbnail as Record<string, unknown> | Record<string, unknown>[] | undefined);
  const thumbnailUrl = thumbnails
    .map((thumbnail) => String(thumbnail?.["@_url"] ?? ""))
    .find(Boolean) || null;

  return {
    videoId,
    title,
    description: getFeedText(group.description),
    thumbnailUrl,
    publishedAt: getFeedText(entry.published) || getFeedText(entry.updated) || null,
    position,
  };
}

async function fetchPublicYoutubeFeedVideos(params: {
  playlistId?: string;
  channelId?: string;
}): Promise<PublicPlaylistVideo[]> {
  const feedUrls = [
    params.playlistId
      ? `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(params.playlistId)}`
      : "",
    params.channelId
      ? `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(params.channelId)}`
      : "",
  ].filter(Boolean);

  for (const feedUrl of feedUrls) {
    const feedResponse = await fetch(feedUrl);

    if (!feedResponse.ok) {
      logger.warn("Feed público do YouTube retornou erro.", {
        feedUrl,
        status: feedResponse.status,
      });
      continue;
    }

    const xml = await feedResponse.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
    });
    const parsed = parser.parse(xml);
    const entries = normalizeArray(parsed?.feed?.entry as Record<string, unknown> | Record<string, unknown>[] | undefined);
    const videos = entries
      .map((entry, index) => getPublicFeedVideo(entry, index))
      .filter((video): video is PublicPlaylistVideo => Boolean(video));

    if (videos.length > 0) {
      return videos;
    }
  }

  return [];
}

async function createYoutubeClient() {
  const clientId = readSecret(youtubeClientId, "YOUTUBE_CLIENT_ID");
  const clientSecret = readSecret(youtubeClientSecret, "YOUTUBE_CLIENT_SECRET");
  const refreshToken = readSecret(youtubeRefreshToken, "YOUTUBE_REFRESH_TOKEN");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.youtube({
    version: "v3",
    auth: oauth2Client,
  });
}

async function getUploadsPlaylistId(
  youtube: youtube_v3.Youtube,
  channelId: string,
): Promise<string> {
  const channelsResponse = await youtube.channels.list({
    part: ["contentDetails"],
    id: [channelId],
    maxResults: 1,
  });

  const uploadsPlaylistId =
    channelsResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error("Nao foi possivel encontrar a playlist de uploads do canal.");
  }

  return uploadsPlaylistId;
}

async function listAllPlaylistVideos(
  youtube: youtube_v3.Youtube,
  playlistId: string,
): Promise<PlaylistVideo[]> {
  const videos: PlaylistVideo[] = [];
  let pageToken: string | undefined;

  do {
    const playlistItemsResponse = await youtube.playlistItems.list({
      part: ["snippet"],
      playlistId,
      maxResults: 50,
      pageToken,
    });

    const pageVideos = (playlistItemsResponse.data.items ?? [])
      .map(getPlaylistVideo)
      .filter((video): video is PlaylistVideo => Boolean(video));

    videos.push(...pageVideos);
    pageToken = playlistItemsResponse.data.nextPageToken ?? undefined;
  } while (pageToken);

  return videos;
}

async function addVideoToPlaylistIfMissing(params: {
  youtube: youtube_v3.Youtube;
  playlistId: string;
  videoId: string;
  knownPlaylistVideoIds?: Set<string>;
}): Promise<boolean> {
  const { youtube, playlistId, videoId, knownPlaylistVideoIds } = params;
  const db = admin.firestore();
  const cacheRef = db.collection("youtubePlaylistVideos").doc(videoId);
  const cachedVideo = await cacheRef.get();

  if (cachedVideo.exists || knownPlaylistVideoIds?.has(videoId)) {
    return false;
  }

  await youtube.playlistItems.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId,
        },
      },
    },
  });

  await cacheRef.set(
    {
      videoId,
      playlistId,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  knownPlaylistVideoIds?.add(videoId);
  return true;
}

async function notifyUsersAboutNewYoutubeVideo(params: {
  videoId: string;
  title: string;
}): Promise<number> {
  const { videoId, title } = params;
  const db = admin.firestore();
  const usersSnapshot = await db.collection("users").get();
  let batch = db.batch();
  let batchOperations = 0;
  let created = 0;

  for (const userDoc of usersSnapshot.docs) {
    const notificationRef = db.collection("notifications").doc();
    const userData = userDoc.data() ?? {};

    batch.set(notificationRef, {
      userId: userDoc.id,
      flavorId: userData.flavorId || "paraipaba",
      tituloNotification: "Novo video na TV Câmara",
      descricaoNotification: title || "Há um novo vídeo disponível para assistir.",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      isRead: false,
      data: {
        screen: "TvCamara",
        type: "youtube-video",
        videoId,
      },
    });

    batchOperations += 1;
    created += 1;

    if (batchOperations >= 450) {
      await batch.commit();
      batch = db.batch();
      batchOperations = 0;
    }
  }

  if (batchOperations > 0) {
    await batch.commit();
  }

  return created;
}

async function subscribeToYoutubeWebSub(callbackUrl: string): Promise<void> {
  const channelId = readSecret(youtubeChannelId, "YOUTUBE_CHANNEL_ID");
  const verifyToken = readSecret(youtubeWebhookVerifyToken, "YOUTUBE_WEBHOOK_VERIFY_TOKEN");
  const params = new URLSearchParams({
    "hub.callback": callbackUrl,
    "hub.mode": "subscribe",
    "hub.topic": `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    "hub.verify": "async",
    "hub.verify_token": verifyToken,
    "hub.lease_seconds": String(60 * 60 * 24 * 5),
  });

  const response = await fetch("https://pubsubhubbub.appspot.com/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Falha ao renovar WebSub: HTTP ${response.status}`);
  }
}

export const youtubeChannelWebhook = onRequest(
  {
    region: "southamerica-east1",
    secrets: [
      youtubeClientId,
      youtubeClientSecret,
      youtubeRefreshToken,
      youtubeChannelId,
      youtubePlaylistId,
      youtubeWebhookVerifyToken,
    ],
  },
  async (request, response) => {
    if (request.method === "GET") {
      const mode = String(request.query["hub.mode"] ?? "");
      const challenge = String(request.query["hub.challenge"] ?? "");
      const verifyToken = String(request.query["hub.verify_token"] ?? "");
      const expectedVerifyToken = readSecret(
        youtubeWebhookVerifyToken,
        "YOUTUBE_WEBHOOK_VERIFY_TOKEN",
      );

      if (mode === "subscribe" && challenge && verifyToken === expectedVerifyToken) {
        response.status(200).send(challenge);
        return;
      }

      response.status(403).send("Verificacao recusada.");
      return;
    }

    if (request.method !== "POST") {
      response.status(405).send("Metodo nao permitido.");
      return;
    }

    try {
      const channelId = readSecret(youtubeChannelId, "YOUTUBE_CHANNEL_ID");
      const playlistId = readSecret(youtubePlaylistId, "YOUTUBE_PLAYLIST_ID");
      const body = request.rawBody?.toString("utf8") ?? "";

      if (!body) {
        response.status(204).send("");
        return;
      }

      const parser = new XMLParser({
        ignoreAttributes: false,
        removeNSPrefix: true,
      });
      const parsed = parser.parse(body);
      const entries = normalizeArray<YoutubeWebhookEntry>(parsed?.feed?.entry);

      if (entries.length === 0) {
        logger.info("Webhook YouTube recebido sem novos videos.");
        response.status(204).send("");
        return;
      }

      const youtube = await createYoutubeClient();
      let inserted = 0;

      for (const entry of entries) {
        const videoId = entry?.videoId;
        const entryChannelId = entry?.channelId;
        const title = entry?.title ?? "Novo video na TV Câmara";

        if (!videoId || entryChannelId !== channelId) {
          logger.warn("Entrada WebSub ignorada por canal ou video invalido.", {
            hasVideoId: Boolean(videoId),
            matchesChannel: entryChannelId === channelId,
          });
          continue;
        }

        const wasInserted = await addVideoToPlaylistIfMissing({
          youtube,
          playlistId,
          videoId,
        });

        if (wasInserted) {
          inserted += 1;
          const notificationsCreated = await notifyUsersAboutNewYoutubeVideo({
            videoId,
            title,
          });

          logger.info("Video novo adicionado via webhook YouTube.", { videoId });
          logger.info("Notificacoes criadas para novo video da TV Camara.", {
            videoId,
            notificationsCreated,
          });
        }
      }

      response.status(204).send("");
      logger.info("Webhook YouTube processado.", { inserted });
    } catch (error) {
      logger.error("Falha ao processar webhook do YouTube.", {
        error: getApiErrorMessage(error),
      });

      response.status(500).send("Falha ao processar webhook.");
    }
  },
);

export const renovarWebhookYoutube = onSchedule(
  {
    schedule: "0 3 */3 * *",
    timeZone: "America/Fortaleza",
    region: "southamerica-east1",
    secrets: [
      youtubeChannelId,
      youtubeWebhookVerifyToken,
    ],
  },
  async () => {
    const callbackUrl =
      "https://southamerica-east1-blu-app-camara.cloudfunctions.net/youtubeChannelWebhook";

    await subscribeToYoutubeWebSub(callbackUrl);
    logger.info("Inscricao WebSub do YouTube renovada.");
  },
);

export const listarVideosTvCamara = onRequest(
  {
    region: "southamerica-east1",
    cors: true,
    secrets: [
      youtubeClientId,
      youtubeClientSecret,
      youtubeRefreshToken,
      youtubeChannelId,
      youtubePlaylistId,
    ],
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response.status(405).json({
        ok: false,
        error: "Metodo nao permitido.",
      });
      return;
    }

    try {
      const playlistId = readSecret(youtubePlaylistId, "YOUTUBE_PLAYLIST_ID");
      const youtube = await createYoutubeClient();
      const videos: PublicPlaylistVideo[] = [];
      let pageToken: string | undefined;

      do {
        const playlistItemsResponse = await youtube.playlistItems.list({
          part: ["snippet"],
          playlistId,
          maxResults: 50,
          pageToken,
        });

        const pageVideos = (playlistItemsResponse.data.items ?? [])
          .map(getPublicPlaylistVideo)
          .filter((video): video is PublicPlaylistVideo => Boolean(video));

        videos.push(...pageVideos);
        pageToken = playlistItemsResponse.data.nextPageToken ?? undefined;
      } while (pageToken);

      videos.sort((firstVideo, secondVideo) => {
        const firstTime = firstVideo.publishedAt ? Date.parse(firstVideo.publishedAt) : 0;
        const secondTime = secondVideo.publishedAt ? Date.parse(secondVideo.publishedAt) : 0;

        return secondTime - firstTime;
      });

      logger.info("Lista publica da TV Camara carregada.", {
        videosCount: videos.length,
      });

      response.set("Cache-Control", "public, max-age=300, s-maxage=300");
      response.json({
        ok: true,
        videos,
      });
    } catch (error) {
      logger.error("Falha ao listar videos da TV Camara.", {
        error: getApiErrorMessage(error),
      });

      try {
        const fallbackVideos = await fetchPublicYoutubeFeedVideos({
          playlistId: youtubePlaylistId.value()?.trim(),
          channelId: youtubeChannelId.value()?.trim(),
        });

        if (fallbackVideos.length > 0) {
          fallbackVideos.sort((firstVideo, secondVideo) => {
            const firstTime = firstVideo.publishedAt ? Date.parse(firstVideo.publishedAt) : 0;
            const secondTime = secondVideo.publishedAt ? Date.parse(secondVideo.publishedAt) : 0;

            return secondTime - firstTime;
          });

          logger.warn("Lista pública da TV Câmara carregada via feed público.", {
            videosCount: fallbackVideos.length,
            reason: getApiErrorMessage(error),
          });

          response.set("Cache-Control", "public, max-age=180, s-maxage=180");
          response.json({
            ok: true,
            fallback: "youtube-public-feed",
            videos: fallbackVideos,
          });
          return;
        }
      } catch (fallbackError) {
        logger.error("Fallback público da TV Câmara também falhou.", {
          error: getApiErrorMessage(fallbackError),
        });
      }

      response.status(500).json({
        ok: false,
        error: "Falha ao carregar videos da TV Camara.",
      });
    }
  },
);

export const atualizarPlaylistYoutube = onSchedule(
  {
    schedule: "*/30 8-19 * * *",
    timeZone: "America/Fortaleza",
    region: "southamerica-east1",
    secrets: [
      youtubeClientId,
      youtubeClientSecret,
      youtubeRefreshToken,
      youtubeChannelId,
      youtubePlaylistId,
    ],
  },
  async () => {
    logger.info("Iniciando backfill da playlist do YouTube com todos os videos do canal.");

    try {
      const channelId = readSecret(youtubeChannelId, "YOUTUBE_CHANNEL_ID");
      const playlistId = readSecret(youtubePlaylistId, "YOUTUBE_PLAYLIST_ID");
      const youtube = await createYoutubeClient();
      const uploadsPlaylistId = await getUploadsPlaylistId(youtube, channelId);

      const [channelUploads, currentPlaylistVideos] = await Promise.all([
        listAllPlaylistVideos(youtube, uploadsPlaylistId),
        listAllPlaylistVideos(youtube, playlistId),
      ]);

      const currentPlaylistVideoIds = new Set(
        currentPlaylistVideos.map((video) => video.videoId),
      );
      const uniqueChannelVideos = Array.from(
        new Map(channelUploads.map((video) => [video.videoId, video])).values(),
      );
      let inserted = 0;

      logger.info("Comparando uploads do canal com playlist publica.", {
        channelVideosCount: uniqueChannelVideos.length,
        playlistVideosCount: currentPlaylistVideoIds.size,
      });

      for (const video of uniqueChannelVideos) {
        const wasInserted = await addVideoToPlaylistIfMissing({
          youtube,
          playlistId,
          videoId: video.videoId,
          knownPlaylistVideoIds: currentPlaylistVideoIds,
        });

        if (wasInserted) {
          inserted += 1;
          const notificationsCreated = await notifyUsersAboutNewYoutubeVideo({
            videoId: video.videoId,
            title: video.title,
          });

          logger.info("Video adicionado durante backfill da playlist.", {
            videoId: video.videoId,
          });
          logger.info("Notificacoes criadas para video adicionado por backfill.", {
            videoId: video.videoId,
            notificationsCreated,
          });
        }
      }

      logger.info("Backfill da playlist do YouTube concluido.", {
        channelVideosCount: uniqueChannelVideos.length,
        inserted,
      });
    } catch (error) {
      logger.error("Falha ao atualizar playlist do YouTube.", {
        error: getApiErrorMessage(error),
      });

      throw error;
    }
  },
);
