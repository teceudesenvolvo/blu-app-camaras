import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { google } from "googleapis";

const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube";
const REDIRECT_URI = "http://localhost";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
}

function extractCode(rawInput: string): string {
  const trimmed = rawInput.trim();

  if (!trimmed) {
    throw new Error("Nenhum authorization code foi informado.");
  }

  try {
    const parsedUrl = new URL(trimmed);
    const code = parsedUrl.searchParams.get("code");

    if (code) {
      return code;
    }
  } catch {
    // O usuario pode colar apenas o parametro code, nao a URL completa.
  }

  return trimmed;
}

async function main(): Promise<void> {
  console.log("Iniciando geracao de refresh_token para YouTube Data API v3...");

  const clientId = getRequiredEnv("CLIENT_ID");
  const clientSecret = getRequiredEnv("CLIENT_SECRET");

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI,
  );

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [YOUTUBE_SCOPE],
  });

  console.log("\nAbra esta URL no navegador e autorize o acesso:");
  console.log(authorizationUrl);
  console.log(
    "\nDepois da autorizacao, copie o valor do parametro code retornado pelo Google.",
  );
  console.log("Tambem pode colar a URL completa de retorno, se preferir.\n");

  const readline = createInterface({ input, output });

  try {
    const answer = await readline.question("Cole o authorization code: ");
    const code = extractCode(answer);

    console.log("\nTrocando authorization code por tokens...");

    const { tokens } = await oauth2Client.getToken(code);

    console.log("\nTokens recebidos com sucesso:");
    console.log("access_token:", tokens.access_token ?? "(nao retornado)");
    console.log("refresh_token:", tokens.refresh_token ?? "(nao retornado)");
    console.log("expiry_date:", tokens.expiry_date ?? "(nao retornado)");
    console.log("scope:", tokens.scope ?? "(nao retornado)");

    if (!tokens.refresh_token) {
      console.warn(
        "\nAtencao: o Google nao retornou refresh_token. Revogue o acesso do app na sua conta Google e execute novamente com prompt=consent.",
      );
    }
  } finally {
    readline.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("\nFalha ao gerar refresh_token.");
  console.error(message);
  process.exitCode = 1;
});
