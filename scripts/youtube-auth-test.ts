import { google, youtube_v3 } from "googleapis";

const REDIRECT_URI = "http://localhost";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
}

function getChannelName(channel: youtube_v3.Schema$Channel): string {
  return channel.snippet?.title ?? channel.id ?? "Canal sem nome retornado";
}

async function main(): Promise<void> {
  console.log("Validando refresh_token com YouTube Data API v3...");

  const clientId = getRequiredEnv("CLIENT_ID");
  const clientSecret = getRequiredEnv("CLIENT_SECRET");
  const refreshToken = getRequiredEnv("REFRESH_TOKEN");

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  console.log("Consultando canal autenticado...");

  const response = await youtube.channels.list({
    mine: true,
    part: ["snippet"],
  });

  const channels = response.data.items ?? [];

  if (channels.length === 0) {
    throw new Error(
      "Nenhum canal foi retornado para a conta autenticada. Verifique se a conta possui um canal do YouTube.",
    );
  }

  console.log("\nRefresh token validado com sucesso.");
  console.log("Canal autenticado:", getChannelName(channels[0]));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("\nFalha ao validar autenticacao do YouTube.");
  console.error(message);
  process.exitCode = 1;
});
