const fs = require('fs');
const path = require('path');

const chamber = process.argv[2];

if (!chamber) {
    console.log("❌ Especifique a câmara: node switch-chamber.js paraipaba");
    process.exit(1);
}

// Mapeamento de nomes amigáveis para exibição
const names = {
    paraipaba: "CM Paraipaba"
};

try {
    // 1. ATUALIZA O NOME NO APP.JSON
    const appJsonPath = './app.json';
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    const newName = names[chamber] || `CM ${chamber.toUpperCase()}`;

    appJson.expo.name = newName;
    appJson.expo.ios.bundleIdentifier = `br.com.blutecnologias.${chamber}`; // Opcional: ajusta o ID

    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log(`📝 Nome do app alterado para: ${newName}`);

    // 2. ATUALIZA O CONFIG JS (Para as APIs de Terceiros)
    const configContent = `import config from './${chamber}';\nexport default config;`;
    fs.writeFileSync('./src/config/index.js', configContent);

    // 3. COPIA ÍCONE E SPLASH (Essencial para não dar erro no prebuild)
    const srcAssets = `./assets/flavors/${chamber}`;
    const destAssets = `./assets`;

    if (fs.existsSync(srcAssets)) {
        fs.copyFileSync(path.join(srcAssets, 'icon.png'), path.join(destAssets, 'icon.png'));
        fs.copyFileSync(path.join(srcAssets, 'splash.png'), path.join(destAssets, 'splash.png'));
        console.log(`🎨 Ícones e Splash de ${chamber} aplicados.`);
    }

    console.log(`🚀 Tudo pronto para compilar a ${newName}!`);

} catch (err) {
    console.error(`❌ Erro: ${err.message}`);
}