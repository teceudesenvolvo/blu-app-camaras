# Sistema de Notificações Push - Documentação

## 📋 Visão Geral

O sistema de notificações push foi convertido completamente para Firebase Functions v2 e funciona através de um fluxo automático de triggers Firestore.

## 🔄 Fluxo de Notificações

```
Atualização no Firestore
    ↓
Função de Update Trigger
    ↓
addFirestoreNotification() cria documento em 'notifications'
    ↓
sendPushNotificationFirestore dispara automaticamente
    ↓
sendPushNotificationToUser envia via Expo API
    ↓
Usuário recebe a push notification
```

## 📱 Tipos de Notificações

### 1. **Balcão do Cidadão** (`onBalcaoCidadaoUpdate`)
- **Trigger**: Atualização em `balcao-cidadao/{id}`
- **Cenários**:
  - Mudança de status da solicitação
  - Nova mensagem do administrador
- **Dados enviados**: `{ solicitacaoId, collection: 'balcao-cidadao' }`

### 2. **Ouvidoria** (`onOuvidoriaUpdate`)
- **Trigger**: Atualização em `ouvidoria/{id}`
- **Cenários**:
  - Mudança de status da manifestação
  - Resposta do administrador
- **Dados enviados**: `{ solicitacaoId, collection: 'ouvidoria' }`
- **Exceção**: Não envia notificações para usuários anônimos

### 3. **Procuradoria da Mulher** (`onProcuradoriaMulherUpdate`)
- **Trigger**: Atualização em `procuradoria-mulher/{id}`
- **Cenários**:
  - Mudança de status da solicitação
  - Nova mensagem do administrador
- **Dados enviados**: `{ solicitacaoId, collection: 'procuradoria-mulher' }`
- **Exceção**: Não envia notificações para usuários anônimos

### 4. **Botão do Pânico** (`handlePanicAlert`)
- **Trigger**: Criação em `panic-alerts/{alertId}`
- **Ações**:
  - Envia email para contato de confiança
  - Envia push notification para contato
  - Busca otimizada por email
- **Dados enviados**: `{ screen: 'PanicLocation', lat, lng, victimName }`

### 5. **Email Genérico** (`sendMailOnNewRequest`)
- **Trigger**: Criação em `mail/{mailId}`
- **Função**: Envia emails via Gmail
- **Com acesso a secrets**: `GMAIL_APP_PASSWORD`

## 🔐 Arquivos de Notificação

Cada notificação criada em `notifications/{notificationId}` possui a estrutura:

```javascript
{
  userId: string,           // ID do usuário destinatário
  flavorId: string,         // ID do sabor/municipalidade
  tituloNotification: string,    // Título da notificação
  descricaoNotification: string, // Descrição/corpo
  createdAt: timestamp,     // Data de criação (servidor)
  read: boolean,            // Lido pelo usuário?
  isRead: boolean,          // Alternativa para read
  processed: boolean,       // Foi processado e enviado?
  processedAt: timestamp,   // Data de processamento
  data: object,             // Dados adicionais (solicitacaoId, screen, etc)
}
```

## 🧪 Como Testar

### Teste 1: Notificação de Mudança de Status

1. Abra o banco de dados Firestore
2. Vá para `balcao-cidadao` e pegue um documento existente
3. Edite o campo `status` de qualquer valor para outro (ex: "Pendente" → "Em análise")
4. A notificação será criada automaticamente em `notifications`
5. Verifique os logs da função em: `Firebase Console → Functions → sendPushNotificationFirestore`

### Teste 2: Notificação de Nova Mensagem

1. Vá para um documento em `balcao-cidadao`
2. Adicione um objeto ao campo `messages`:
```javascript
{
  messages: {
    msg_1: {
      text: "Sua solicitação está em análise",
      sender: "admin",
      timestamp: Date.now()
    }
  }
}
```
3. Uma notificação será criada
4. Verifique `notifications` e os logs

### Teste 3: Botão do Pânico

1. Crie um documento em `panic-alerts`:
```javascript
{
  userId: "user123",
  flavorId: "paraipaba",
  lat: -3.8634,
  lng: -39.1167,
  address: "Rua Principal, 123",
  timestamp: Date.now()
}
```
2. A função enviará:
   - Email para o contato de confiança em `procuradoria-mulher-btn-panico/{userId}`
   - Push notification para o contato
3. Verifique logs em: `Firebase Console → Functions → handlePanicAlert`

## 📊 Monitoramento de Logs

```bash
# Ver logs em tempo real
firebase functions:log --follow

# Ver logs de uma função específica
firebase functions:log sendPushNotificationFirestore --limit 50

# Ver logs com debug completo
firebase functions:log --limit 50
```

## ⚙️ Requisitos para Funcionar

### No Aplicativo (React Native)
1. **Push Token registrado**: O usuário deve permitir notificações e ter um `pushToken`
```javascript
// O pushToken deve estar salvo em users/{userId}
{
  pushToken: "ExponentPushToken[......]"
}
```

### No Firebase
1. **Segredos configurados**:
   - `GMAIL_APP_PASSWORD`: Senha de app do Gmail
   - `GMAIL_EMAIL`: Email do Gmail (padrão: blutecnologiasbr@gmail.com)

2. **Banco de dados estruturado**:
   - Coleções: `balcao-cidadao`, `ouvidoria`, `procuradoria-mulher`
   - Cada doc deve ter: `userId`, `flavorId`, `status`, `messages`

## 🚀 Deploy

```bash
# Deploy apenas das funções
firebase deploy --only functions

# Deploy com logs detalhados
firebase deploy --only functions --debug
```

## 📝 Troubleshooting

### Notificações não chegam?
1. ✅ Verifique se `pushToken` está salvo em `users/{userId}`
2. ✅ Verifique permissões de notificações no app
3. ✅ Veja logs em `Firebase Console → Functions`
4. ✅ Teste manualmente criando um documento em `notifications`

### "User not found"
- O `userId` em `balcao-cidadao` não existe em `users`
- Adicione o usuário primeiro em `users/{userId}`

### Email não enviado (handlePanicAlert)
- Verifique se o documento `procuradoria-mulher-btn-panico/{userId}` existe
- Verifique se o email está preenchido corretamente
- Verifique logs da função `handlePanicAlert`

### Função não disparou
- Verifique em `Cloud Functions → Audit Logs`
- Confirme que o trigger foi acionado (status 200)
- Aguarde 1-2 segundos para propagação

## 🔗 Links Úteis

- [Firebase Console](https://console.firebase.google.com/project/blu-app-camara/firestore)
- [Cloud Functions Dashboard](https://console.cloud.google.com/functions)
- [Firebase Functions v2 Docs](https://firebase.google.com/docs/functions/2nd-gen-overview)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)

---

**Última atualização**: 15 de maio de 2026
**Versão**: 2.0 (Firebase Functions v2)
