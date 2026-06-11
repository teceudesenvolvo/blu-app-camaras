# YouTube OAuth 2.0 e Firebase Functions

Este projeto usa Node.js 20, TypeScript e `googleapis` para gerar e validar um `refresh_token` OAuth 2.0 da YouTube Data API v3.

## Dependencias

As dependencias necessarias foram adicionadas na raiz do projeto:

```bash
npm install googleapis
npm install --save-dev tsx @types/node
```

## Gerar refresh_token

Use o OAuth Client do tipo Desktop Application do projeto Google Cloud `blu-app-camara`.

```bash
export CLIENT_ID="seu-client-id"
export CLIENT_SECRET="seu-client-secret"
npm run youtube:refresh-token
```

O script exibira a URL de autorizacao. Abra no navegador, autorize o acesso e cole no terminal o valor do parametro `code` retornado pelo Google. O script tambem aceita a URL completa de retorno.

Escopo solicitado:

```text
https://www.googleapis.com/auth/youtube
```

Redirect URI usado:

```text
http://localhost
```

## Validar refresh_token

```bash
export CLIENT_ID="seu-client-id"
export CLIENT_SECRET="seu-client-secret"
export REFRESH_TOKEN="refresh-token-gerado"
npm run youtube:auth-test
```

O teste chama `youtube.channels.list({ mine: true })` e exibe o nome do canal autenticado.

## Firebase Functions Secrets

Depois de validar o token, salve os valores como secrets:

```bash
firebase functions:secrets:set YOUTUBE_CLIENT_ID
firebase functions:secrets:set YOUTUBE_CLIENT_SECRET
firebase functions:secrets:set YOUTUBE_REFRESH_TOKEN
```

Para a funcao agendada de sincronizacao da playlist, configure tambem:

```bash
firebase functions:secrets:set YOUTUBE_CHANNEL_ID
firebase functions:secrets:set YOUTUBE_PLAYLIST_ID
firebase functions:secrets:set YOUTUBE_WEBHOOK_VERIFY_TOKEN
```

Nao cole secrets em arquivos versionados e nao registre esses valores em logs.

## Sincronizacao da playlist

A playlist da TV Camara e mantida por duas rotinas:

- `youtubeChannelWebhook`: recebe notificacoes WebSub/PubSubHubbub do YouTube quando o canal publica ou atualiza videos.
- `atualizarPlaylistYoutube`: roda uma vez por dia como backfill de seguranca para garantir que a playlist tenha todos os videos do canal.

A funcao `atualizarPlaylistYoutube` fica em `functions/src/index.ts` e roda diariamente:

```text
0 6 * * *
```

Timezone:

```text
America/Fortaleza
```

Regiao:

```text
southamerica-east1
```

Ela usa a playlist de uploads do canal, pagina todos os videos do canal, compara com os itens atuais da playlist publica e adiciona somente os videos ausentes. Ela nao remove videos antigos.

O webhook adiciona videos novos quase em tempo real com baixo uso de cota: normalmente apenas `playlistItems.insert` quando chega um video novo. Um cache em Firestore evita tentativas repetidas para o mesmo `videoId`.

## Renovar inscricao WebSub

A funcao `renovarWebhookYoutube` renova a inscricao no hub do YouTube a cada 3 dias:

```text
0 3 */3 * *
```

Depois do deploy, rode a renovacao manualmente pelo Cloud Scheduler ou aguarde o proximo ciclo. A URL de callback usada e:

```text
https://southamerica-east1-blu-app-camara.cloudfunctions.net/youtubeChannelWebhook
```

### Instalar dependencias das Functions

```bash
cd functions
npm install googleapis
npm install fast-xml-parser
npm install --save-dev typescript @types/node
cd ..
```

### Build

```bash
npm --prefix functions run build
```

### Deploy somente da funcao

```bash
firebase deploy --only functions:atualizarPlaylistYoutube
firebase deploy --only functions:youtubeChannelWebhook
firebase deploy --only functions:renovarWebhookYoutube
firebase deploy --only functions:listarVideosTvCamara
```

### Teste manual

Depois do deploy, abra o Firebase Console ou o Google Cloud Console:

1. Acesse Cloud Scheduler.
2. Encontre o job criado para `atualizarPlaylistYoutube`.
3. Clique em `Force run` / `Executar agora`.
4. Confira os logs em Cloud Logging ou pelo Firebase:

```bash
firebase functions:log --only atualizarPlaylistYoutube
```

## Exemplo para Firebase Functions v2

```js
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { google } = require("googleapis");

const youtubeClientId = defineSecret("YOUTUBE_CLIENT_ID");
const youtubeClientSecret = defineSecret("YOUTUBE_CLIENT_SECRET");
const youtubeRefreshToken = defineSecret("YOUTUBE_REFRESH_TOKEN");

exports.testYoutubeAuth = onRequest(
  {
    secrets: [youtubeClientId, youtubeClientSecret, youtubeRefreshToken],
  },
  async (request, response) => {
    try {
      const oauth2Client = new google.auth.OAuth2(
        youtubeClientId.value(),
        youtubeClientSecret.value(),
        "http://localhost",
      );

      oauth2Client.setCredentials({
        refresh_token: youtubeRefreshToken.value(),
      });

      const youtube = google.youtube({
        version: "v3",
        auth: oauth2Client,
      });

      const result = await youtube.channels.list({
        mine: true,
        part: ["snippet"],
      });

      const channel = result.data.items?.[0];

      if (!channel) {
        response.status(404).json({
          ok: false,
          error: "Nenhum canal foi retornado para a conta autenticada.",
        });
        return;
      }

      console.log("YouTube autenticado com sucesso:", channel.snippet?.title);

      response.json({
        ok: true,
        channelName: channel.snippet?.title,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      console.error("Falha na autenticacao do YouTube:", message);
      response.status(500).json({
        ok: false,
        error: "Falha ao consultar YouTube Data API.",
      });
    }
  },
);
```

Nunca salve `CLIENT_ID`, `CLIENT_SECRET` ou `REFRESH_TOKEN` hardcoded no codigo-fonte.
