# Blu App Câmaras

Aplicativo white-label para Câmaras Municipais. O código de telas e serviços é compartilhado; cada clone possui identidade visual, Firebase, aplicativos nativos, projeto EAS e publicação próprios.

## Pré-requisitos

- Node.js 20 ou superior
- npm
- conta Firebase com permissão no projeto
- conta Expo/EAS para builds
- Xcode e CocoaPods para desenvolvimento iOS local
- Android Studio/SDK para desenvolvimento Android local
- contas Apple Developer/App Store Connect e Google Play Console para publicar

## Como clonar

```sh
git clone <url-do-repositorio> blu-app-<slug>
cd blu-app-<slug>
npm install
cp .env.example .env
```

O fluxo normal não exige `CAMARA=...`. Quando existe apenas um diretório em `flavors/` com `config.json`, ele é selecionado automaticamente. `CAMARA` continua disponível somente como override técnico para testes com mais de um flavor.

## Configuração do tenant

1. Copie `flavors/paraipaba` para `flavors/<slug>`.
2. Edite `flavors/<slug>/config.json` com nome, município, UF, módulos, cores, assets, identificadores nativos e projeto EAS.
3. Remova o flavor de exemplo ou mantenha somente um `config.json` no clone. O slug do diretório deve ser igual a `flavorId`.
4. Substitua os assets referenciados no JSON e confirme que todos os arquivos existem.
5. Registre um novo Bundle Identifier na Apple e um novo package name no Google Play.
6. Gere os arquivos nativos do Firebase para os dois aplicativos:
   - iOS: `services/firebase/<slug>/GoogleService-Info.plist`
   - Android: `flavors/<slug>/google-services.json`
7. Atualize `ios.bundleIdentifier`, `android.package`, `googleServicesFile` e `easProjectId` no flavor.

O código compartilhado fica em `src/`. Não troque a Câmara editando telas ou criando condicionais espalhadas pelo app; a configuração deve ficar no flavor e no `.env`.

As logomarcas exibidas dentro do aplicativo podem ser administradas pelo portal em `system-control/portal > branding`. O app prioriza `branding.logoUrl` do Firebase e usa o logo local do flavor como fallback para login, cadastro e inicialização offline.

O ícone instalado, splash screen, favicon nativo e ícone enviado às lojas não podem ser alterados depois que o app iniciou. Eles precisam continuar nos assets do flavor e ser atualizados antes de cada novo build.

## Requisições Firebase e clones

As telas podem usar collections como `noticias`, `users`, `balcao-cidadao` e `vereadores`, pois esses nomes são o contrato de dados compartilhado entre o app e o portal. Elas não apontam para um projeto específico: `services/firebaseConfig.js` inicializa Auth, Firestore, Storage e Functions exclusivamente com `src/config`, que vem do `.env` e do flavor resolvido pelo `app.config.js`.

Ao criar um clone, não altere essas telas para trocar o Firebase. Troque apenas `.env`, `config.json`, arquivos Google Services, `firebase use --add` e os secrets das Functions. Assim, uma atualização do núcleo continua aplicável aos repositórios clonados.

Os únicos pontos que podem conter dados do tenant são configuração, assets, regras e backend de implantação. O `config:check` valida também a existência dos dois arquivos nativos do Firebase antes de iniciar um build.

## Firebase por clone

Cada clone deve apontar para um projeto Firebase diferente. O arquivo `.env` da raiz concentra a configuração pública usada pelo app:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_DATABASE_URL=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...
EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION=us-central1
```

A configuração web do Firebase é pública e pode estar no app. Nunca coloque no `.env` chaves privadas, senha de conta de serviço, certificado Apple, refresh token ou segredo do YouTube.

Crie o projeto e selecione-o no Firebase CLI:

```sh
npx firebase-tools login
npx firebase-tools use --add <firebase-project-id>
```

O comando `firebase use --add` cria o `.firebaserc` local do clone. Confira se ele aponta para o mesmo `EXPO_PUBLIC_FIREBASE_PROJECT_ID` do `.env`.

Inicialize ou valide Authentication, Firestore, Realtime Database (se usado), Storage, Functions e Cloud Messaging no console Firebase.

Publique regras, índices e Functions no projeto correto:

```sh
npx firebase-tools deploy --project <firebase-project-id> --only firestore:rules,firestore:indexes,storage
cd functions
npm install
npx firebase-tools deploy --project <firebase-project-id> --only functions
cd ..
```

## Cloud Functions e segredos

Crie `functions/.env.<firebase-project-id>` a partir de `functions/.env.example`. Segredos devem ser cadastrados no Secret Manager, nunca commitados:

```sh
npx firebase-tools functions:secrets:set GMAIL_APP_PASSWORD --project <firebase-project-id>
```

As Functions usam `APP_FLAVOR_ID`, `APP_DISPLAY_NAME`, `APP_STORE_IOS_URL` e `APP_STORE_ANDROID_URL` para notificações e links. Não deixe URLs, nomes ou IDs de Paraipaba no clone novo.

## Desenvolvimento local

```sh
npm install
npm run config:check
npx expo config --type public
npx expo start --clear
```

Para selecionar explicitamente um flavor durante uma migração:

```sh
CAMARA=paraipaba npx expo start --clear
CAMARA=paraipaba npx expo config --type public
```

Expo Go não substitui um development build quando o app usa módulos nativos como câmera, notificações ou configurações nativas do Firebase. Use `npx expo run:ios`, `npx expo run:android` ou um build EAS de desenvolvimento.

## Validação antes do build

```sh
npm run config:check
npx expo config --type public --json
npx expo-doctor
npm run lint
git diff --check
```

Confirme `extra.firebase.projectId`, `extra.flavorId`, `extra.eas.projectId`, Bundle Identifier, package name, arquivos Google Services, módulos e assets.

## EAS Build

```sh
npm install --global eas-cli
eas login
eas whoami
eas build:configure
eas build --platform ios --profile production
eas build --platform android --profile production
```

O `eas.json` usa `appVersionSource: remote` e incremento automático no perfil de produção. Para cada clone, substitua os dados de `submit.production.ios` pelos valores da própria App Store Connect. O Android pode ser enviado manualmente pelo arquivo `.aab`.

## Publicação

### Apple

Gere o build iOS, envie com `eas submit --platform ios --profile production` ou Transporter, aguarde o processamento em TestFlight, selecione o build na versão correta, preencha metadados, privacidade e exportação de criptografia e envie para revisão.

O `CFBundleShortVersionString` precisa ser maior que a versão já aprovada. Para uma nova versão, altere `version` em `app.json`; o build number é incrementado pelo EAS.

### Google Play

Gere o `.aab`, envie à faixa desejada, preencha classificação, segurança de dados, conteúdo, capturas e notas da versão, revise os alertas de otimização DEX/R8 e publique.

## Atualizações OTA

Alterações apenas em JavaScript podem usar EAS Update:

```sh
eas update --branch production --message "Descrição da atualização"
```

Alterações em Expo SDK, plugins, permissões, câmera, Firebase nativo ou Swift/Kotlin exigem novo build e nova distribuição nas lojas.

## Estrutura principal

```text
app.config.js             configuração dinâmica do build
app.json                  versão e defaults do Expo
eas.json                  perfis EAS
.env                      Firebase público do clone atual
flavors/<slug>/            identidade e assets da Câmara
src/config/                consumo da configuração resolvida
services/                  Firebase e integrações
functions/                 backend Firebase
tests/                     validações de configuração
```

## Solução de problemas

**Firebase errado:** confirme `.env`, `extra.firebase.projectId` e reinicie com `npx expo start --clear`.

**Mais de um flavor:** remova flavors que não pertencem ao clone ou use temporariamente `CAMARA=<slug>`.

**Build iOS não aparece:** aguarde o processamento, confirme o Bundle Identifier e verifique se a versão não está fechada. Uma versão já aprovada precisa de novo número.

**Módulo nativo ausente no Expo Go:** use um development build.

**Functions notificam a Câmara errada:** confira `functions/.env.<project-id>`, secrets e projeto selecionado antes do deploy.

## Política de alterações

Correções comuns devem ser feitas neste núcleo e sincronizadas nos clones por Pull Request. Dados de implantação, assets, credenciais, regras específicas e identificadores permanecem no clone correspondente. Nunca commite credenciais privadas.
