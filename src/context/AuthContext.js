import Constants from 'expo-constants';
import { createContext, useEffect, useState } from 'react';

import app from '../../services/firebaseConfig';

// 🔐 Firebase Auth (Web)
import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from 'firebase/auth';

// 🔥 Firebase Database
import {
    getDatabase,
    onChildAdded,
    onValue,
    orderByChild,
    query,
    ref,
    serverTimestamp,
    set,
    startAt,
    update
} from 'firebase/database';

// 🔔 Expo Notifications
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const auth = getAuth(app);
    const db = getDatabase(app);

    // 🔐 OBSERVADOR DE LOGIN
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (userState) => {
            setUser(userState);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // 🔔 CONFIG GLOBAL DE NOTIFICAÇÃO (IMPORTANTE)
    useEffect(() => {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: false,
                shouldSetBadge: false,
            }),
        });
    }, []);

    // 🔔 REGISTRO DE PUSH TOKEN
    useEffect(() => {
        if (!user) return;

        const registerForPush = async () => {
            try {
                if (!Device.isDevice) {
                    console.log('Push não funciona em simulador');
                    return;
                }

                const { status } = await Notifications.requestPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Permissão de notificação negada');
                    return;
                }

                const token = (await Notifications.getExpoPushTokenAsync()).data;

                await update(ref(db, `${flavorId}/users/${user.uid}`), {
                    pushToken: token,
                    updatedAt: serverTimestamp()
                });

                console.log('Push token salvo:', token);

            } catch (error) {
                console.log('Erro ao registrar push:', error);
            }
        };

        registerForPush();
    }, [user]);

    // 🔔 LISTENER DE NOVAS NOTIFICAÇÕES (FOREGROUND/BACKGROUND)
    useEffect(() => {
        if (!user) return;

        // Começamos a ouvir apenas notificações criadas a partir de agora
        // para evitar disparar notificações antigas ao abrir o app
        const now = Date.now();
        const notificationsRef = ref(db, `${flavorId}/notifications`);
        const q = query(notificationsRef, orderByChild('createdAt'), startAt(now));

        const unsubscribe = onChildAdded(q, async (snapshot) => {
            const notification = snapshot.val();
            
            // Só dispara se a notificação for para este usuário e NÃO estiver lida
            if (notification && notification.userId === user.uid && notification.read !== true) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: notification.tituloNotification || 'Nova Notificação',
                        body: notification.descricaoNotification || 'Você recebeu uma atualização.',
                        data: { screen: 'Notificacoes' },
                        sound: true,
                    },
                    trigger: null, // Exibir imediatamente
                });
            }
        });

        return () => unsubscribe();
    }, [user]);

    // 🔔 CONTADOR DE NOTIFICAÇÕES NÃO LIDAS
    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        const notificationsRef = ref(db, `${flavorId}/notifications`);
        const unsubscribe = onValue(notificationsRef, (snapshot) => {
            let count = 0;
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const notif = child.val();
                    if (notif.userId === user.uid && notif.read !== true) {
                        count++;
                    }
                });
            }
            setUnreadCount(count);
        });

        return () => unsubscribe();
    }, [user]);

    // 🔐 LOGIN
    const login = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Erro login:', error);
            throw error;
        }
    };

    // 🆕 REGISTRO
    const register = async (email, password, extraData = {}) => {
        try {
            const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

            await set(ref(db, `${flavorId}/users/${newUser.uid}`), {
                ...extraData,
                email,
                createdAt: serverTimestamp(),
            });

        } catch (error) {
            console.error('Erro register:', error);
            throw error;
        }
    };

    // 🚪 LOGOUT
    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Erro logout:', error);
        }
    };

    // 🔑 REDEFINIR SENHA
    const resetPassword = async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error('Erro reset password:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, resetPassword, unreadCount, db }}>
            {children}
        </AuthContext.Provider>
    );
};