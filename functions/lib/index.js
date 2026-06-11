"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.atualizarPlaylistYoutube = exports.listarVideosTvCamara = exports.renovarWebhookYoutube = exports.youtubeChannelWebhook = void 0;
const firebase_functions_1 = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const fast_xml_parser_1 = require("fast-xml-parser");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const googleapis_1 = require("googleapis");
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp();
}
const youtubeClientId = (0, params_1.defineSecret)("YOUTUBE_CLIENT_ID");
const youtubeClientSecret = (0, params_1.defineSecret)("YOUTUBE_CLIENT_SECRET");
const youtubeRefreshToken = (0, params_1.defineSecret)("YOUTUBE_REFRESH_TOKEN");
const youtubeChannelId = (0, params_1.defineSecret)("YOUTUBE_CHANNEL_ID");
const youtubePlaylistId = (0, params_1.defineSecret)("YOUTUBE_PLAYLIST_ID");
const youtubeWebhookVerifyToken = (0, params_1.defineSecret)("YOUTUBE_WEBHOOK_VERIFY_TOKEN");
function readSecret(secret, name) {
    const value = secret.value()?.trim();
    if (!value) {
        throw new Error(`Secret obrigatorio ausente: ${name}`);
    }
    return value;
}
function getApiErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
function getPlaylistVideo(item) {
    const playlistItemId = item.id;
    const videoId = item.snippet?.resourceId?.videoId;
    if (!playlistItemId || !videoId) {
        return null;
    }
    return {
        playlistItemId,
        videoId,
    };
}
function normalizeArray(value) {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}
function getPublicPlaylistVideo(item) {
    const videoId = item.snippet?.resourceId?.videoId;
    const title = item.snippet?.title;
    if (!videoId || !title) {
        return null;
    }
    const thumbnails = item.snippet?.thumbnails;
    const thumbnailUrl = thumbnails?.maxres?.url ??
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
async function createYoutubeClient() {
    const clientId = readSecret(youtubeClientId, "YOUTUBE_CLIENT_ID");
    const clientSecret = readSecret(youtubeClientSecret, "YOUTUBE_CLIENT_SECRET");
    const refreshToken = readSecret(youtubeRefreshToken, "YOUTUBE_REFRESH_TOKEN");
    const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
        refresh_token: refreshToken,
    });
    return googleapis_1.google.youtube({
        version: "v3",
        auth: oauth2Client,
    });
}
async function getUploadsPlaylistId(youtube, channelId) {
    const channelsResponse = await youtube.channels.list({
        part: ["contentDetails"],
        id: [channelId],
        maxResults: 1,
    });
    const uploadsPlaylistId = channelsResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
        throw new Error("Nao foi possivel encontrar a playlist de uploads do canal.");
    }
    return uploadsPlaylistId;
}
async function listAllPlaylistVideos(youtube, playlistId) {
    const videos = [];
    let pageToken;
    do {
        const playlistItemsResponse = await youtube.playlistItems.list({
            part: ["snippet"],
            playlistId,
            maxResults: 50,
            pageToken,
        });
        const pageVideos = (playlistItemsResponse.data.items ?? [])
            .map(getPlaylistVideo)
            .filter((video) => Boolean(video));
        videos.push(...pageVideos);
        pageToken = playlistItemsResponse.data.nextPageToken ?? undefined;
    } while (pageToken);
    return videos;
}
async function addVideoToPlaylistIfMissing(params) {
    const { youtube, playlistId, videoId, knownPlaylistVideoIds } = params;
    const db = firebase_admin_1.default.firestore();
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
    await cacheRef.set({
        videoId,
        playlistId,
        addedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    knownPlaylistVideoIds?.add(videoId);
    return true;
}
async function subscribeToYoutubeWebSub(callbackUrl) {
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
exports.youtubeChannelWebhook = (0, https_1.onRequest)({
    region: "southamerica-east1",
    secrets: [
        youtubeClientId,
        youtubeClientSecret,
        youtubeRefreshToken,
        youtubeChannelId,
        youtubePlaylistId,
        youtubeWebhookVerifyToken,
    ],
}, async (request, response) => {
    if (request.method === "GET") {
        const mode = String(request.query["hub.mode"] ?? "");
        const challenge = String(request.query["hub.challenge"] ?? "");
        const verifyToken = String(request.query["hub.verify_token"] ?? "");
        const expectedVerifyToken = readSecret(youtubeWebhookVerifyToken, "YOUTUBE_WEBHOOK_VERIFY_TOKEN");
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
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            removeNSPrefix: true,
        });
        const parsed = parser.parse(body);
        const entries = normalizeArray(parsed?.feed?.entry);
        if (entries.length === 0) {
            firebase_functions_1.logger.info("Webhook YouTube recebido sem novos videos.");
            response.status(204).send("");
            return;
        }
        const youtube = await createYoutubeClient();
        let inserted = 0;
        for (const entry of entries) {
            const videoId = entry?.videoId;
            const entryChannelId = entry?.channelId;
            if (!videoId || entryChannelId !== channelId) {
                firebase_functions_1.logger.warn("Entrada WebSub ignorada por canal ou video invalido.", {
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
                firebase_functions_1.logger.info("Video novo adicionado via webhook YouTube.", { videoId });
            }
        }
        response.status(204).send("");
        firebase_functions_1.logger.info("Webhook YouTube processado.", { inserted });
    }
    catch (error) {
        firebase_functions_1.logger.error("Falha ao processar webhook do YouTube.", {
            error: getApiErrorMessage(error),
        });
        response.status(500).send("Falha ao processar webhook.");
    }
});
exports.renovarWebhookYoutube = (0, scheduler_1.onSchedule)({
    schedule: "0 3 */3 * *",
    timeZone: "America/Fortaleza",
    region: "southamerica-east1",
    secrets: [
        youtubeChannelId,
        youtubeWebhookVerifyToken,
    ],
}, async () => {
    const callbackUrl = "https://southamerica-east1-blu-app-camara.cloudfunctions.net/youtubeChannelWebhook";
    await subscribeToYoutubeWebSub(callbackUrl);
    firebase_functions_1.logger.info("Inscricao WebSub do YouTube renovada.");
});
exports.listarVideosTvCamara = (0, https_1.onRequest)({
    region: "southamerica-east1",
    cors: true,
    secrets: [
        youtubeClientId,
        youtubeClientSecret,
        youtubeRefreshToken,
        youtubePlaylistId,
    ],
}, async (request, response) => {
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
        const videos = [];
        let pageToken;
        do {
            const playlistItemsResponse = await youtube.playlistItems.list({
                part: ["snippet"],
                playlistId,
                maxResults: 50,
                pageToken,
            });
            const pageVideos = (playlistItemsResponse.data.items ?? [])
                .map(getPublicPlaylistVideo)
                .filter((video) => Boolean(video));
            videos.push(...pageVideos);
            pageToken = playlistItemsResponse.data.nextPageToken ?? undefined;
        } while (pageToken);
        firebase_functions_1.logger.info("Lista publica da TV Camara carregada.", {
            videosCount: videos.length,
        });
        response.set("Cache-Control", "public, max-age=300, s-maxage=300");
        response.json({
            ok: true,
            videos,
        });
    }
    catch (error) {
        firebase_functions_1.logger.error("Falha ao listar videos da TV Camara.", {
            error: getApiErrorMessage(error),
        });
        response.status(500).json({
            ok: false,
            error: "Falha ao carregar videos da TV Camara.",
        });
    }
});
exports.atualizarPlaylistYoutube = (0, scheduler_1.onSchedule)({
    schedule: "0 6 * * *",
    timeZone: "America/Fortaleza",
    region: "southamerica-east1",
    secrets: [
        youtubeClientId,
        youtubeClientSecret,
        youtubeRefreshToken,
        youtubeChannelId,
        youtubePlaylistId,
    ],
}, async () => {
    firebase_functions_1.logger.info("Iniciando backfill da playlist do YouTube com todos os videos do canal.");
    try {
        const channelId = readSecret(youtubeChannelId, "YOUTUBE_CHANNEL_ID");
        const playlistId = readSecret(youtubePlaylistId, "YOUTUBE_PLAYLIST_ID");
        const youtube = await createYoutubeClient();
        const uploadsPlaylistId = await getUploadsPlaylistId(youtube, channelId);
        const [channelUploads, currentPlaylistVideos] = await Promise.all([
            listAllPlaylistVideos(youtube, uploadsPlaylistId),
            listAllPlaylistVideos(youtube, playlistId),
        ]);
        const currentPlaylistVideoIds = new Set(currentPlaylistVideos.map((video) => video.videoId));
        const uniqueChannelVideoIds = Array.from(new Set(channelUploads.map((video) => video.videoId)));
        let inserted = 0;
        firebase_functions_1.logger.info("Comparando uploads do canal com playlist publica.", {
            channelVideosCount: uniqueChannelVideoIds.length,
            playlistVideosCount: currentPlaylistVideoIds.size,
        });
        for (const videoId of uniqueChannelVideoIds) {
            const wasInserted = await addVideoToPlaylistIfMissing({
                youtube,
                playlistId,
                videoId,
                knownPlaylistVideoIds: currentPlaylistVideoIds,
            });
            if (wasInserted) {
                inserted += 1;
                firebase_functions_1.logger.info("Video adicionado durante backfill da playlist.", { videoId });
            }
        }
        firebase_functions_1.logger.info("Backfill da playlist do YouTube concluido.", {
            channelVideosCount: uniqueChannelVideoIds.length,
            inserted,
        });
    }
    catch (error) {
        firebase_functions_1.logger.error("Falha ao atualizar playlist do YouTube.", {
            error: getApiErrorMessage(error),
        });
        throw error;
    }
});
