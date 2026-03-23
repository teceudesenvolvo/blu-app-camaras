const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

/**
 * Triggered when a new notification is added to /{flavorId}/notifications/{notifId}
 * Sends a push notification to the user's Expo push token.
 */
exports.sendPushNotification = functions.database.ref('/{flavorId}/notifications/{notifId}')
    .onCreate(async (snapshot, context) => {
        const notification = snapshot.val();
        const userId = notification.userId;
        const flavorId = context.params.flavorId;

        if (!userId) {
            console.log('No userId found in notification');
            return null;
        }

        try {
            // 1. Fetch the user's Expo Push Token from the database
            const userRef = admin.database().ref(`${flavorId}/users/${userId}`);
            const userSnapshot = await userRef.once('value');
            
            if (!userSnapshot.exists()) {
                console.log(`User ${userId} not found`);
                return null;
            }

            const userData = userSnapshot.val();
            const pushToken = userData.pushToken;

            if (!pushToken) {
                console.log(`No pushToken found for user ${userId}`);
                return null;
            }

            // 2. Prepare the notification payload for Expo Push API
            // Note: We use the new fields 'tituloNotification' and 'descricaoNotification' 
            // set by the user in the latest app update.
            const message = {
                to: pushToken,
                sound: 'default',
                title: notification.tituloNotification || 'Nova Notificação',
                body: notification.descricaoNotification || 'Você recebeu uma mensagem.',
                data: { screen: 'Notificacoes' }, // Tells the app to navigate here on click
            };

            // 3. Send the request to Expo's Push Service
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
