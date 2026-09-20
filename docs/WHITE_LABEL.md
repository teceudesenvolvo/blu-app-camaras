# Base compartilhada das Camaras

O codigo de telas e servicos e unico. A selecao ocorre em app.config.js usando
CAMARA. Sem essa variavel, o desenvolvimento local usa Paraipaba. Um id
desconhecido interrompe a configuracao. Nao use os antigos scripts switch.

## Arquitetura definida

Cada Camara possui seu proprio projeto Firebase, canal YouTube, playlist,
projeto EAS e aplicativos nas lojas. O app nunca seleciona ou troca o projeto
Firebase a partir de uma URL recebida do portal: essa identidade pertence ao build.

O projeto BluPortalServicosCamaras sera o administrador da configuracao publica
de conteudo no Firebase da respectiva Camara. Endpoints de noticias e vereadores,
alem da identificacao publica da TV Camara, devem ser editaveis nesse portal.
Alterar uma fonte de conteudo nao deve exigir recompilar o aplicativo.

Contrato proposto para a proxima implementacao, ainda nao consumido pelo app:

```text
app-config/public
  schemaVersion: 1
  news: { source: "firestore" | "endpoint", endpoint: HTTPS_URL }
  councilors: { source: "firestore" | "endpoint", endpoint: HTTPS_URL }
  tv: { videosEndpoint: HTTPS_URL, channelId: STRING, playlistId: STRING }
  updatedAt: TIMESTAMP
```

No modo firestore, endpoint fica vazio. Os nomes e formatos retornados pelas
APIs externas precisam de um contrato e adaptadores antes de habilitar o modo
endpoint. URLs publicas nao devem conter tokens, senhas ou chaves privadas.
Refresh token e client secret do YouTube continuam nos Secrets das Functions
do projeto correspondente. Salvar channelId/playlistId no portal precisa ser
integrado a sincronizacao do backend; salvar apenas o documento nao altera
automaticamente os secrets usados pelas Functions atuais.

A configuracao publica precisa de leitura conforme o fluxo do aplicativo e
escrita exclusiva de administradores. As regras atuais do portal permitem
escrita de qualquer usuario autenticado em qualquer documento: e necessario
revisar essa regra abrangente antes de disponibilizar o editor. Adicionar uma
regra restritiva isolada nao anula a permissao abrangente existente.

Estado atual: noticias e vereadores ainda sao lidos das collections locais.
A TV usa o endpoint derivado do Firebase selecionado no build. O editor no
portal, leitura remota no app e adaptadores de endpoints ainda serao implementados.

## Desenvolvimento e verificacao

```sh
CAMARA=paraipaba npx expo start --clear
CAMARA=paraipaba npx expo config --type public
node --test tests/chamber-config.test.cjs
```

## Cadastrar outra Camara

1. Crie flavors/<id>/config.json seguindo o esquema de Paraipaba.
2. Substitua nome, slug, flavorId, cityId, institutionName, municipality, state,
   cnpj, firebaseCollection, cores, arquivos de assets e modulos.
3. Configure Firebase proprio e seus arquivos nativos. Preserve os identificadores
   dos aplicativos que ja foram publicados. Registre a logo em src/config/branding.js
   com require estatico para o Metro.
4. Configure ios.bundleIdentifier, android.package e googleServicesFile de cada
   plataforma; atualize tambem os assets de android.adaptiveIcon.
5. Use um projeto EAS proprio e seu easProjectId. A URL de updates e derivada dele.
6. Crie perfis EAS por Camara com env.CAMARA definido no proprio perfil, incluindo
   desenvolvimento, preview e producao. Configure o perfil submit correspondente
   com ascAppId e appleTeamId da conta correta e credenciais no EAS.
7. Valide a configuracao resolvida, os arquivos Firebase e um build de teste antes
   de distribuir. Nao reutilize credenciais ou ids de Paraipaba.

Firebase web config e publico e faz parte do app. Chaves privadas Apple/Google,
client secrets e refresh tokens devem permanecer fora de extra/config.json.

## Entregar upgrades

Uma alteracao nas telas beneficia todos os proximos builds gerados desta base.
Cada app instalado precisa receber sua propria publicacao. EAS Update exige
publicar separadamente para cada projeto/canal e runtime compativel; alteracoes
nativas exigem novo binario e revisao nas lojas. Nao ha publicacao automatica
para todas as Camaras nesta etapa. A versao comum continua em app.json.

## Backend e proxima etapa

Esta etapa centraliza a configuracao do aplicativo. Antes de ativar uma segunda
Camara, parametrizar e validar tambem functions/index.js e functions/src/index.ts:
ha flavorId padrao, destinatarios e URL de webhook especificos de Paraipaba.
Publicar Functions, regras e indices no Firebase de cada Camara usando
--project explicito; configurar todos os secrets por projeto. Auditar horarios,
feriados municipais e dados demonstrativos em Vereadores.

modules e preservado como configuracao; nao e um mecanismo de autorizacao nem
garante ocultacao de todas as telas. Dados pessoais continuam exigindo regras
de acesso no Firebase. Projetos Firebase separados sao a estrategia desta base.
