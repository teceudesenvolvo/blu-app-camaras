# Blu App Câmaras

Base white-label do aplicativo das Câmaras. O código de telas é compartilhado e cada Câmara é selecionada por `CAMARA`, com Firebase, identidade visual, assets, YouTube, EAS e identificadores próprios.

## Desenvolvimento

```bash
npm install
CAMARA=paraipaba npx expo start -c
CAMARA=paraipaba npm run config:check
CAMARA=paraipaba npm run config:print
```

Nunca inicie um clone sem informar `CAMARA`: isso evita compilar acidentalmente o aplicativo de outra Câmara.

## Criar um clone

1. Copie `flavors/paraipaba` para `flavors/<id-da-camara>`.
2. Edite `flavors/<id-da-camara>/config.json` com nome, slug, cores, Firebase, YouTube, bundle IDs e `easProjectId` próprios.
3. Substitua os arquivos `google-services.json`, `GoogleService-Info.plist`, ícone e splash dentro do flavor.
4. Registre a logo em `src/config/branding.js` usando `require` estático.
5. Crie os projetos Firebase e EAS da nova Câmara e configure os secrets das Functions nesse projeto.
6. Crie perfis EAS com `env.CAMARA=<id-da-camara>` e configure o `ascAppId`, `appleTeamId` e credenciais da conta Apple correta.
7. Valide antes do primeiro build:

```bash
CAMARA=<id-da-camara> npm run config:check
CAMARA=<id-da-camara> npx expo config --type public
CAMARA=<id-da-camara> npx expo-doctor
```

Cada clone deve usar `firebase deploy --project <firebase-project-id>` e seus próprios secrets. Não copie credenciais de outra Câmara.

## Builds e publicação

```bash
CAMARA=<id-da-camara> eas build --platform ios --profile production
CAMARA=<id-da-camara> eas build --platform android --profile production
CAMARA=<id-da-camara> eas submit --platform ios --profile production
CAMARA=<id-da-camara> eas submit --platform android --profile production
```

Atualizações de código beneficiam todos os clones na base, mas cada aplicativo precisa de build, canal EAS e publicação próprios. Alterações nativas exigem novo binário e revisão nas lojas.

Mais detalhes de arquitetura e checklist: [`docs/WHITE_LABEL.md`](docs/WHITE_LABEL.md).

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
