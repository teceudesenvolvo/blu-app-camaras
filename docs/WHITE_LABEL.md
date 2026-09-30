# Arquitetura white-label

Cada clone deste repositório representa uma Câmara Municipal independente. O código compartilhado fica no núcleo; a identidade do tenant fica em `flavors/<slug>/config.json` e a configuração pública do Firebase fica no `.env` da raiz.

## Regras

- Um clone deve ter apenas um flavor ativo para não exigir `CAMARA`.
- `CAMARA` é somente um override temporário para testes com múltiplos flavors.
- Cada Câmara usa Firebase, EAS, Bundle Identifier, package name e credenciais próprios.
- Dados públicos do Firebase podem estar no `.env`; segredos ficam no Secret Manager/EAS.
- O `projectId` do endpoint de vídeos é o `projectId` resolvido do `.env`.
- Functions recebem sua identidade por `APP_FLAVOR_ID`, `APP_DISPLAY_NAME` e links de loja.

## Novo clone

1. Copie o flavor existente para um novo slug.
2. Troque dados institucionais, assets e identificadores nativos.
3. Crie o Firebase e preencha `.env` a partir de `.env.example`.
4. Gere os arquivos Google Services para os aplicativos novos.
5. Crie o projeto EAS e atualize `easProjectId`.
6. Configure Functions, regras, índices e secrets com `--project <project-id>`.
7. Rode `npm run config:check`, `npx expo-doctor` e um build de teste.

O guia operacional completo está no [README.md](../README.md).
