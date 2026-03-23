const fs = require('fs');
const path = require('path');

const chamber = process.argv[2] || 'paraipaba';
const flavorPath = path.join(__dirname, 'flavors', chamber);

if (!fs.existsSync(flavorPath)) {
    console.error(`❌ Erro: Flavor '${chamber}' não encontrado.`);
    process.exit(1);
}

// 1. Carregar Configurações
const configPath = path.join(flavorPath, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 2. Atualizar app.json (Identidade do App)
const appJsonPath = path.join(__dirname, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

appJson.expo.name = config.name;
appJson.expo.slug = config.slug || chamber; // Garante um slug único
appJson.expo.ios.bundleIdentifier = config.bundleIdentifier;
appJson.expo.android.package = config.bundleIdentifier;
appJson.expo.extra = { ...config };

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

// 3. Mover Assets (Logo, Splash, etc)
const assetsSource = path.join(flavorPath, 'assets');
const assetsDest = path.join(__dirname, 'assets');

// GARANTIA: Cria a pasta assets na raiz se ela não existir
if (!fs.existsSync(assetsDest)) {
    fs.mkdirSync(assetsDest, { recursive: true });
}

if (fs.existsSync(assetsSource)) {
    const files = fs.readdirSync(assetsSource);
    files.forEach(file => {
        const srcFile = path.join(assetsSource, file);
        const destFile = path.join(assetsDest, file);
        fs.copyFileSync(srcFile, destFile);
        console.log(`  ➡️  Arquivo movido: ${file}`);
    });
} else {
    console.warn(`⚠️  Aviso: Pasta de assets não encontrada em ${assetsSource}`);
}

// 4. Mover Firebase (google-services.json)
const fbSource = path.join(flavorPath, 'google-services.json');
const fbDest = path.join(__dirname, 'google-services.json');

if (fs.existsSync(fbSource)) {
    fs.copyFileSync(fbSource, fbDest);
    console.log(`✅ Firebase (Android) configurado.`);
}

// 5. Mover Firebase (GoogleService-Info.plist para iOS se existir)
const fbIosSource = path.join(flavorPath, 'GoogleService-Info.plist');
const fbIosDest = path.join(__dirname, 'GoogleService-Info.plist');

if (fs.existsSync(fbIosSource)) {
    fs.copyFileSync(fbIosSource, fbIosDest);
    console.log(`✅ Firebase (iOS) configurado.`);
}

console.log(`\n🚀 PROJETO CONFIGURADO PARA: ${config.name.toUpperCase()}\n`);