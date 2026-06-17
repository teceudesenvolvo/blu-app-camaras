const functions = require('firebase-functions');
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineString, defineSecret } = require("firebase-functions/params");
const admin = require('firebase-admin');
const axios = require('axios');
const nodemailer = require('nodemailer'); // Keep nodemailer for email sending

admin.initializeApp();

exports.logoutOtherDevices = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const uid = context.auth.uid;
    const currentActivityId = data && data.currentActivityId ? String(data.currentActivityId) : null;

    try {
        const snapshot = await admin.firestore()
            .collection('login-activities')
            .where('userId', '==', uid)
            .get();

        const batch = admin.firestore().batch();
        let revokedActivities = 0;

        snapshot.docs.forEach((docSnap) => {
            if (currentActivityId && docSnap.id === currentActivityId) return;

            batch.update(docSnap.ref, {
                revoked: true,
                revokedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            revokedActivities += 1;
        });

        if (revokedActivities > 0) {
            await batch.commit();
        }

        return { success: true, revokedActivities };
    } catch (error) {
        console.error('Erro ao encerrar sessões de outros dispositivos:', error);
        throw new functions.https.HttpsError('internal', 'Não foi possível encerrar as outras sessões.');
    }
});

// Parâmetros e Segredos da v2
const gmailEmail = defineString("GMAIL_EMAIL", { default: 'blutecnologiasbr@gmail.com' });
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

// Configurações do E-mail (Gmail App Password)
let mailTransport;

const initializeMailTransport = async () => {
    if (mailTransport) return mailTransport;
    const pass = await gmailAppPassword.value();
    mailTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailEmail.value(),
            pass: pass
        }
    });
    return mailTransport;
};

// --- Helper to send push notifications ---
async function sendPushNotificationToUser(userId, title, body, data) {
    try {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.error(`User ${userId} not found for push notification.`);
            return false;
        }
        const userData = userDoc.data();
        const pushToken = userData.pushToken;

        if (!pushToken) {
            console.warn(`No pushToken found for user ${userId}.`);
            return false;
        }

        const message = {
            to: pushToken,
            sound: 'default',
            priority: 'high',
            title: title,
            body: body,
            data: {
                screen: 'Notificacoes', // Default screen for general notifications
                ...data
            },
            _displayInForeground: true,
        };

        const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });

        // Verifica se houve erro específico do Expo (ex: token inválido)
        const expoData = response.data;
        if (expoData.data && expoData.data[0] && expoData.data[0].status === 'error') {
            console.error(`Expo push error for ${userId}:`, expoData.data[0].message);
            return false;
        }

        console.log(`Push notification successfully sent to ${userId}`);
        return true;
    } catch (error) {
        console.error(`Error sending push notification to user ${userId}:`, error);
        return false;
    }
}

// --- Helper to add a notification to Firestore (which will then trigger the push) ---
async function addFirestoreNotification(userId, flavorId, title, body, data) {
    const notificationData = data || {};
    if (!notificationData.screen && notificationData.collection) {
        notificationData.screen = 'MeusAtendimentos';
        notificationData.source = notificationData.collection;
    }

    await admin.firestore().collection('notifications').add({
        userId: userId,
        flavorId: flavorId,
        tituloNotification: title,
        descricaoNotification: body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        isRead: false,
        data: notificationData // Garante que os metadados fiquem dentro do objeto 'data'
    });
    console.log(`Notification added to Firestore for user ${userId}.`);
}

// 1. Botão do Pânico (Firestore Trigger) - Convertido para v2 com suporte a secrets
const handlePanicAlert = onDocumentCreated(
    {
        document: "panic-alerts/{alertId}",
        secrets: [gmailAppPassword],
    },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return null;

        const alert = snapshot.data();
        const userId = alert.userId;
        const flavorId = alert.flavorId;

        if (!userId || !flavorId) return null;

        try {
            // Busca dados da vítima no Firestore
            const victimDoc = await admin.firestore().collection('users').doc(userId).get();
            if (!victimDoc.exists) return null;
            const victim = victimDoc.data();

            // Busca contato de confiança no Firestore
            const contactDoc = await admin.firestore().collection('procuradoria-mulher-btn-panico').doc(userId).get();
            if (!contactDoc.exists) return null;
            const contact = contactDoc.data();

            if (!contact || (!contact.email && !contact.telefone)) return null;

            const locationUrl = `https://www.google.com/maps?q=${alert.lat},${alert.lng}`;
            const messageBody = `🆘 ALERTA DE PÂNICO - PROCURADORIA DA MULHER 🆘\n\n` +
                `A usuária ${victim.name || 'Não Identificada'} acionou o botão do pânico!\n\n` +
                `📍 Localização: ${alert.address || 'Ver no mapa'}\n` +
                `🔗 Mapa: ${locationUrl}\n\n` +
                `⚠️ Atenção: Por favor, verifique a segurança da pessoa imediatamente.`;

            // Envia E-mail
            if (contact.email) {
                try {
                    const transport = await initializeMailTransport();
                    await transport.sendMail({
                        from: '"Alerta de Pânico - Procuradoria" <blutecnologiasbr@gmail.com>',
                        to: contact.email,
                        subject: '🆘 URGENTE: Pedido de Socorro!',
                        text: messageBody
                    });
                    console.log(`E-mail enviado para: ${contact.email}`);
                } catch (emailError) {
                    console.error('Falha ao enviar e-mail:', emailError);
                }
            }

            // Envia Push para o contato (Busca otimizada por Query)
            const targetEmail = String(contact.email || '').toLowerCase();
            let contactUserId = null;

            if (targetEmail) {
                const userQuery = await admin.firestore().collection('users')
                    .where('email', '==', targetEmail)
                    .limit(1)
                    .get();
                
                if (!userQuery.empty) {
                    contactUserId = userQuery.docs[0].id;
                }
            }

            // Nota: Para busca por telefone, recomenda-se salvar um campo 'normalizedPhone' no Firestore 
            // para permitir consultas indexadas (.where) em vez de varrer a coleção inteira.

            if (contactUserId) {
                // Salva no histórico de notificações do contato
                await addFirestoreNotification(
                    contactUserId, 
                    flavorId, 
                    '🆘 PEDIDO DE SOCORRO!', 
                    `${victim.name || 'Uma pessoa'} precisa de ajuda urgente! Veja a localização.`,
                    { screen: 'PanicLocation', lat: alert.lat, lng: alert.lng, victimName: victim.name }
                );
            }

            return { success: true };
        } catch (error) {
            console.error('Erro no processamento do pânico:', error);
            return null;
        }
    }
);

exports.handlePanicAlert = handlePanicAlert;

// 2. Envio de Notificações Gerais via Firestore - v2 API
exports.sendPushNotificationFirestore = onDocumentCreated(
    "notifications/{notificationId}",
    async (event) => {
        const notification = event.data?.data();
        if (!notification || !notification.userId) {
            console.log('Invalid notification data');
            return null;
        }

        console.log(`Processing notification for user: ${notification.userId}`);

        try {
            const success = await sendPushNotificationToUser(
                notification.userId,
                notification.tituloNotification || 'Nova notificação',
                notification.descricaoNotification || '',
                notification.data || {}
            );
            
            if (success) {
                await event.data.ref.update({ processed: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
            } else {
                await event.data.ref.update({ processed: false, error: 'Push delivery failed or no token' });
            }
        } catch (error) {
            console.error('Erro ao processar notificação:', error);
        }
        return null;
    }
);

// 3. Triggers para Notificações de Atualização - Balcão do Cidadão (v2 API)
exports.onBalcaoCidadaoUpdate = onDocumentUpdated(
    "balcao-cidadao/{id}",
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        const docId = event.params.id;
        
        if (!before || !after) return null;
        
        const userId = after.userId;
        const flavorId = after.flavorId;
        if (!userId || !flavorId) {
            console.log('Missing userId or flavorId');
            return null;
        }

        let title = "Atualização no Balcão do Cidadão";
        let data = { screen: 'MeusAtendimentos', source: 'balcao-cidadao', solicitacaoId: docId, collection: 'balcao-cidadao' };

        try {
            // Verifica mudança de status
            if (before.status !== after.status) {
                console.log(`Status changed for ${docId}: ${before.status} -> ${after.status}`);
                await addFirestoreNotification(userId, flavorId, title, `Sua solicitação mudou para: ${after.status}`, data);
            }

            // Verifica novas mensagens do admin
            const beforeMsgs = Object.keys(before.messages || {}).length;
            const afterMsgs = Object.keys(after.messages || {}).length;
            if (afterMsgs > beforeMsgs) {
                const messagesArray = Object.values(after.messages).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                const lastMsg = messagesArray[0];
                if (lastMsg && lastMsg.sender === 'admin') {
                    console.log(`New admin message for ${docId}`);
                    await addFirestoreNotification(userId, flavorId, title, `Nova mensagem do administrador disponível.`, data);
                }
            }
        } catch (error) {
            console.error('Erro ao processar atualização do Balcão do Cidadão:', error);
        }
        return null;
    }
);

// --- Funções do Portal Web Integradas ---

/**
 * 4. Envio de E-mail genérico via trigger de coleção 'mail'
 */
exports.sendMailOnNewRequest = onDocumentCreated(
    {
        document: "mail/{mailId}",
        secrets: [gmailAppPassword],
    },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const mailData = snapshot.data();
        const transport = await initializeMailTransport();

        const emailFooter = "<br><br><hr><p><i>Por favor não responda " +
            "este email. Email oficial da câmara:<br/>" +
            "balcaocidadao25@gmail.com</i></p>" +
            "<p>Este email foi enviado automaticamente pelo sistema do " +
            "Portal de Serviços da Câmara Municipal de Paraipaba.<br/>" +
            " Se você tiver dúvidas ou precisar de assistência, por " +
            "favor entre em contato com a câmara através do email " +
            "acima. Obrigado por utilizar o Portal de Serviços da " +
            "Câmara Municipal de Paraipaba. <strong>" +
            "Atenciosamente,<br>Blu Tecnologias</strong></p>";

        const mailOptions = {
            from: `"Portal de Serviços" <${gmailEmail.value()}>`,
            to: mailData.to,
            subject: mailData.message.subject,
            html: `${mailData.message.html}${emailFooter}`,
        };

        try {
            await transport.sendMail(mailOptions);

            if (mailData.userId) {
                const protocolo = mailData.protocolo || "";
                const status = mailData.status || "Atualizado";
                const desc = `O status da sua solicitação (Protocolo: ${protocolo})` +
                    ` foi alterado para: ${status}.`;

                await addFirestoreNotification(
                    mailData.userId,
                    "paraipaba",
                    "Status de Solicitação Atualizado",
                    desc,
                    {
                        protocolo: protocolo,
                        solicitacaoId: protocolo,
                        status: status,
                        screen: "MeusAtendimentos",
                        source: mailData.collection || "balcao-cidadao",
                        collection: mailData.collection || "balcao-cidadao",
                    }
                );
            }

            return snapshot.ref.delete();
        } catch (error) {
            console.error(`Erro ao enviar email para ${mailData.to}:`, error);
            return null;
        }
    }
);

/**
 * 5. Cleanup agendado (Limpeza de solicitações expiradas e anexos)
 */
function cleanupFiles(request, promises) {
    const reqId = request.id || "N/A";
    console.log(`Limpando anexos da solicitação: ${reqId}`);
    let filesToDelete = [];
    
    if (Array.isArray(request.arquivos)) {
        filesToDelete = [...request.arquivos];
    }
    
    const balcaoAnexos = request.dadosSolicitacao?.anexos;
    if (balcaoAnexos) {
        Object.values(balcaoAnexos).forEach((fieldArray) => {
            if (Array.isArray(fieldArray)) {
                filesToDelete = filesToDelete.concat(fieldArray);
            }
        });
    }

    filesToDelete.forEach((file) => {
        if (file.url && file.url.includes("firebasestorage.googleapis.com")) {
            try {
                const urlParts = file.url.split("/o/");
                const filePath = decodeURIComponent(urlParts[1].split("?")[0]);
                promises.push(
                    admin.storage().bucket().file(filePath).delete()
                        .catch((err) => console.error(`Erro no arquivo ${filePath}: `, err.message))
                );
            } catch (e) {
                console.error("URL de arquivo malformada no storage");
            }
        }
    });
}

function processDeletion(snapshot, promises, collName) {
    const data = snapshot.data();
    cleanupFiles(data, promises);

    if (collName === "balcao-cidadao" && data) {
        const appDate = data.appointmentDate || data.dadosSolicitacao?.appointmentDate;
        const appTime = data.appointmentTime || data.dadosSolicitacao?.appointmentTime;
        if (appDate && appTime) {
            const bookedSlotsRef = admin.firestore().collection("balcao-config").doc("bookedSlots");
            promises.push(bookedSlotsRef.update({
                [appDate]: admin.firestore.FieldValue.arrayRemove(appTime),
            }));
        }
    }
    promises.push(snapshot.ref.delete());
}

exports.cleanupExpiredRequests = onSchedule("every 1 hours", async (event) => {
    const now = Date.now();
    const db = admin.firestore();
    try {
        const deletionPromises = [];
        const collections = [
            "balcao-cidadao",
            "denuncias-procon",
            "atendimento-juridico",
            "procuradoria-mulher",
            "ouvidoria",
        ];

        for (const collName of collections) {
            const expiredSnapshot = await db.collection(collName)
                .where("deletionTimestamp", "<=", now)
                .where("deletionTimestamp", ">", 0)
                .get();

            expiredSnapshot.forEach((doc) => {
                const val = doc.data();
                if (!val) return;

                const finalStatuses = ["Concluído", "Concluída", "Cancelado", "Cancelada", "Finalizada", "Respondida"];
                const isFinalStatus = finalStatuses.includes(val.status);

                if (isFinalStatus) {
                    console.log(`DELETANDO: Solicitação ${doc.id} expirou.`);
                    processDeletion(doc, deletionPromises, collName);
                } else {
                    console.log(`MANTENDO: ${doc.id} ainda está em prazo ou status ativo.`);
                }
            });
        }

        await Promise.all(deletionPromises);
        console.log(`Limpeza concluída. Operações: ${deletionPromises.length}`);
        return null;
    } catch (error) {
        console.error("Erro na cleanupExpiredRequests:", error);
        return null;
    }
});

// 4. Triggers para Notificações de Atualização - Ouvidoria (v2 API)
exports.onOuvidoriaUpdate = onDocumentUpdated(
    "ouvidoria/{id}",
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        const docId = event.params.id;
        
        if (!before || !after) return null;
        
        const userId = after.userId;
        const flavorId = after.flavorId;
        if (!userId || !flavorId || userId === 'anonimo') {
            console.log('Missing userId, flavorId or user is anonymous');
            return null;
        }

        let title = "Atualização na Ouvidoria";
        let data = { screen: 'MeusAtendimentos', source: 'ouvidoria', solicitacaoId: docId, collection: 'ouvidoria' };

        try {
            // Verifica mudança de status
            if (before.status !== after.status) {
                console.log(`Status changed in Ouvidoria for ${docId}: ${before.status} -> ${after.status}`);
                await addFirestoreNotification(userId, flavorId, title, `Sua manifestação mudou para: ${after.status}`, data);
            }

            // Verifica novas mensagens do admin
            const beforeMsgs = Object.keys(before.messages || {}).length;
            const afterMsgs = Object.keys(after.messages || {}).length;
            if (afterMsgs > beforeMsgs) {
                const messagesArray = Object.values(after.messages).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                const lastMsg = messagesArray[0];
                if (lastMsg && lastMsg.sender === 'admin') {
                    console.log(`New admin message in Ouvidoria for ${docId}`);
                    await addFirestoreNotification(userId, flavorId, title, `O administrador respondeu sua manifestação.`, data);
                }
            }
        } catch (error) {
            console.error('Erro ao processar atualização da Ouvidoria:', error);
        }
        return null;
    }
);

/**
 * 6. Notifica todos os usuários quando uma nova notícia é publicada
 */
exports.notifyUsersOnNewsPublished = onDocumentWritten(
    "noticias/{noticiaId}",
    async (event) => {
        const beforeData = event.data.before ? event.data.before.data() : null;
        const afterData = event.data.after ? event.data.after.data() : null;

        // Caso de exclusão de documento
        if (!afterData) return null;

        // Verifica se o status mudou para "Publicado"
        const isNewlyPublished = afterData.status === "Publicado" &&
            (!beforeData || beforeData.status !== "Publicado");

        if (!isNewlyPublished) return null;

        const db = admin.firestore();
        console.log("Iniciando notificação de nova notícia: " + event.params.noticiaId);
        
        const usersSnapshot = await db.collection("users").get();
        console.log(`Encontrados ${usersSnapshot.size} usuários para processar.`);

        const mailRef = db.collection("mail");
        const promises = [];

        usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data() || {};
            const email = userData.email || userData.userEmail || null;
            
            // Cria notificação no Firestore usando o helper padrão
            promises.push(
                addFirestoreNotification(
                    userDoc.id,
                    "paraipaba",
                    "📢 " + afterData.titulo,
                    afterData.subtitulo || "Novidade no app.",
                    {
                        protocolo: event.params.noticiaId,
                        id: event.params.noticiaId,
                        noticiaId: event.params.noticiaId,
                        type: "news",
                        screen: "NoticiaDetalhe",
                    }
                )
            );

            // Enfileira e-mail informativo
            if (email) {
                promises.push(
                    mailRef.add({
                        to: email,
                        message: {
                            subject: `Informativo: ${afterData.titulo}`,
                            html: `<h3>${afterData.titulo}</h3>` +
                                `<p>${afterData.subtitulo || ""}</p>` +
                                `<hr><p>Uma nova notícia foi publicada no ` +
                                `Portal de Serviços da Câmara Municipal de ` +
                                `Paraipaba.</p><p>Acesse o aplicativo para ler ` +
                                `o conteúdo completo.</p>`,
                        },
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    })
                );
            }
        });

        await Promise.all(promises);
        console.log("Notificações de notícias processadas.");
        return null;
    }
);

// 5. Triggers para Notificações de Atualização - Procuradoria da Mulher (v2 API)
exports.onProcuradoriaMulherUpdate = onDocumentUpdated(
    "procuradoria-mulher/{id}",
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        const docId = event.params.id;
        
        if (!before || !after) return null;
        
        const userId = after.userId;
        const flavorId = after.flavorId;
        if (!userId || !flavorId || userId === 'anonimo') {
            console.log('Missing userId, flavorId or user is anonymous');
            return null;
        }

        let title = "Atualização na Procuradoria";
        let data = { screen: 'MeusAtendimentos', source: 'procuradoria-mulher', solicitacaoId: docId, collection: 'procuradoria-mulher' };

        try {
            // Verifica mudança de status
            if (before.status !== after.status) {
                console.log(`Status changed in Procuradoria for ${docId}: ${before.status} -> ${after.status}`);
                await addFirestoreNotification(userId, flavorId, title, `Sua solicitação mudou para: ${after.status}`, data);
            }

            // Verifica novas mensagens do admin
            const beforeMsgs = Object.keys(before.messages || {}).length;
            const afterMsgs = Object.keys(after.messages || {}).length;
            if (afterMsgs > beforeMsgs) {
                const messagesArray = Object.values(after.messages).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                const lastMsg = messagesArray[0];
                if (lastMsg && lastMsg.sender === 'admin') {
                    console.log(`New admin message in Procuradoria for ${docId}`);
                    await addFirestoreNotification(userId, flavorId, title, `Há uma nova mensagem na sua solicitação.`, data);
                }
            }
        } catch (error) {
            console.error('Erro ao processar atualização da Procuradoria:', error);
        }
        return null;
    }
);

try {
    Object.assign(exports, require("./lib/index"));
} catch (error) {
    console.warn("Funcoes TypeScript ainda nao compiladas. Execute `npm --prefix functions run build`.");
}
