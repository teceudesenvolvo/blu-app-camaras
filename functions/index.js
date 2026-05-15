const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const nodemailer = require('nodemailer'); // Keep nodemailer for email sending

admin.initializeApp();

// Configurações do E-mail (Gmail App Password)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'blutecnologiasbr@gmail.com',
        pass: 'tbqx ljgd lhot vjek'
    }
});

// --- Helper to send push notifications ---
async function sendPushNotificationToUser(userId, title, body, data) {
    try {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log(`User ${userId} not found for push notification.`);
            return;
        }
        const userData = userDoc.data();
        const pushToken = userData.pushToken;

        if (!pushToken) {
            console.log(`No pushToken found for user ${userId}.`);
            return;
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

        console.log(`Push notification sent to ${userId}:`, response.data);
    } catch (error) {
        console.error(`Error sending push notification to user ${userId}:`, error);
    }
}

// --- Helper to add a notification to Firestore (which will then trigger the push) ---
async function addFirestoreNotification(userId, flavorId, title, body, data) {
    await admin.firestore().collection('notifications').add({
        userId: userId,
        flavorId: flavorId,
        tituloNotification: title,
        descricaoNotification: body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        isRead: false,
        ...data
    });
    console.log(`Notification added to Firestore for user ${userId}.`);
}

/**
 * Triggered when a new panic alert is added to /{flavorId}/panic-alerts/{userId}/{alertId}
 */
exports.handlePanicAlert = functions.database.ref('/{flavorId}/panic-alerts/{userId}/{alertId}')
    .onCreate(async (snapshot, context) => {
        const alert = snapshot.val();
        const userId = context.params.userId;
        const flavorId = context.params.flavorId;

        try {
            // 1. Buscar dados da vítima (quem apertou o botão)
            const victimRef = admin.database().ref(`${flavorId}/users/${userId}`);
            const victimSnap = await victimRef.once('value');
            if (!victimSnap.exists()) {
                console.log(`Vítima ${userId} não encontrada.`);
                return null;
            }

            const victim = victimSnap.val();
            const contact = victim.contatoConfianca;

            if (!contact || (!contact.email && !contact.phone)) {
                console.log(`Nenhum contato de confiança para ${userId}`);
                return null;
            }

            const locationUrl = `https://www.google.com/maps?q=${alert.lat},${alert.lng}`;
            const messageBody = `🆘 ALERTA DE PÂNICO - PROCURADORIA DA MULHER 🆘\n\n` +
                `A usuária ${victim.name || 'Não Identificada'} acionou o botão do pânico!\n\n` +
                `📍 Localização: ${alert.address || 'Ver no mapa'}\n` +
                `🔗 Mapa: ${locationUrl}\n\n` +
                `⚠️ Atenção: Por favor, verifique a segurança da pessoa imediatamente.`;

            // 2. Enviar E-mail para o contato
            if (contact.email) {
                try {
                    await transporter.sendMail({
                        from: '"Alerta de Pânico - Procuradoria" <blutecnologiasbr@gmail.com>',
                        to: contact.email,
                        subject: '🆘 URGENTE: Pedido de Socorro!',
                        text: messageBody
                    });
                    console.log(`E-mail de pânico enviado para: ${contact.email}`);
                } catch (e) { console.error('Erro ao enviar e-mail:', e); }
            }

            // 3. Buscar o usuário do contato para enviar PUSH
            const usersRef = admin.database().ref(`${flavorId}/users`);
            const usersSnap = await usersRef.once('value');

            let contactPushToken = null;
            const normalize = (val) => String(val || '').replace(/\D/g, '');
            const targetEmail = String(contact.email || '').toLowerCase();
            const targetPhone = normalize(contact.phone);

            console.log(`Buscando usuário para PUSH: Email(${targetEmail}) ou Telefone(${targetPhone})`);

            usersSnap.forEach((child) => {
                const u = child.val();
                const uEmail = String(u.email || '').toLowerCase();
                const uPhone = normalize(u.phone);

                if ((targetEmail && uEmail === targetEmail) || (targetPhone && uPhone === targetPhone)) {
                    if (u.pushToken) {
                        contactPushToken = u.pushToken;
                        console.log(`Usuário encontrado para PUSH: ${child.key}`);
                    }
                }
            });

            if (contactPushToken) {
                await axios.post('https://exp.host/--/api/v2/push/send', {
                    to: contactPushToken,
                    sound: 'default',
                    priority: 'high',
                    title: '🆘 PEDIDO DE SOCORRO!',
                    body: `${victim.name || 'Uma pessoa'} precisa de ajuda urgente! Veja a localização.`,
                    data: {
                        screen: 'PanicLocation',
                        lat: alert.lat,
                        lng: alert.lng,
                        victimName: victim.name
                    },
                });
                console.log('Push de pânico enviado com sucesso.');
            } else {
                console.log('Nenhum usuário correspondente com pushToken encontrado para o contato.');
            }

            return { success: true };

        } catch (error) {
            console.error('Erro ao processar alerta de pânico:', error);
            return null;
        }
    });

/**
 * Triggered when a new notification is added to /{flavorId}/notifications/{notifId}
 * Sends a push notification to the user's Expo push token.
 */
exports.sendPushNotification = functions.database.ref('/{flavorId}/notifications/{notifId}')
    .onCreate(async (snapshot, context) => {
        const notification = snapshot.val();
        const flavorId = context.params.flavorId;

        const userId = notification.userId;
        const userEmail = notification.userEmail ? String(notification.userEmail).toLowerCase() : null;

        if (!userId && !userEmail) {
            console.log('No userId or userEmail found in notification');
            return null;
        }

        try {
            let userData = null;
            let pushToken = null;

            // 1. Tentar buscar por userId
            if (userId) {
                const userRef = admin.database().ref(`${flavorId}/users/${userId}`);
                const userSnapshot = await userRef.once('value');
                if (userSnapshot.exists()) {
                    userData = userSnapshot.val();
                    pushToken = userData.pushToken;
                }
            }

            // 2. Se não encontrou por userId ou pushToken, tentar por userEmail
            if (!pushToken && userEmail) {
                console.log(`Buscando pushToken pelo e-mail: ${userEmail}`);
                const usersRef = admin.database().ref(`${flavorId}/users`);
                const usersSnap = await usersRef.once('value');

                usersSnap.forEach((child) => {
                    const u = child.val();
                    if (u.email && String(u.email).toLowerCase() === userEmail) {
                        if (u.pushToken) {
                            pushToken = u.pushToken;
                            console.log(`Usuário encontrado pelo e-mail: ${child.key}`);
                        }
                    }
                });
            }

            if (!pushToken) {
                console.log(`No pushToken found for user (ID: ${userId}, Email: ${userEmail})`);
                return null;
            }

            const message = {
                to: pushToken,
                sound: 'default',
                priority: 'high',
                title: notification.tituloNotification || 'Nova Notificação',
                body: notification.descricaoNotification || 'Você recebeu uma mensagem.',
                data: {
                    screen: 'Notificacoes',
                    ...notification
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

            console.log('Push notification sent successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('Error sending push notification:', error);
            return null;
        }
    });
