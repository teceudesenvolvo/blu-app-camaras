import Constants from 'expo-constants';
import { createContext, useEffect, useState } from 'react';


import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { doc, serverTimestamp as firestoreTimestamp, setDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig';

// 🔔 Expo Notifications
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

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
                shouldPlaySound: true,
                shouldSetBadge: true,
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

                const token = (await Notifications.getExpoPushTokenAsync({
                    projectId: Constants.expoConfig?.extra?.eas?.projectId || "a4515ae1-c9e6-4aa1-a5f9-ae420ea3d93c"
                })).data;

                try {
                    await updateDoc(doc(firestore, 'users', user.uid), {
                        pushToken: token,
                        updatedAt: firestoreTimestamp()
                    });
                } catch (fsError) {
                    console.error("Erro ao atualizar pushToken no Firestore:", fsError);
                }

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
        const now = Date.now();
        const q = query(collection(firestore, 'notifications'), where('flavorId', '==', flavorId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const notification = change.doc.data();
                    
                    // Firestore timestamps podem ser objetos ou números.
                    const createdAt = notification.createdAt?.toMillis 
                        ? notification.createdAt.toMillis() 
                        : (notification.createdAt || 0);

                    // Só dispara se foi criada agora
                    if (createdAt < now) return;

                    const isTargetUser = notification && (
                        notification.userId === user.uid || 
                        (notification.userEmail && String(notification.userEmail).toLowerCase() === String(user.email).toLowerCase())
                    );

                    if (isTargetUser && notification.read !== true && notification.isRead !== true) {
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: notification.tituloNotification || 'Nova Notificação',
                                body: notification.descricaoNotification || 'Você recebeu uma atualização.',
                                data: { screen: 'Notificacoes' },
                                sound: true,
                            },
                            trigger: null,
                        });
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [user]);

    // 🔔 CONTADOR DE NOTIFICAÇÕES NÃO LIDAS
    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        const q = query(collection(firestore, 'notifications'), where('flavorId', '==', flavorId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let count = 0;
            snapshot.forEach((docSnap) => {
                const notif = docSnap.data();
                const isTargetUser = notif.userId === user.uid || 
                    (notif.userEmail && String(notif.userEmail).toLowerCase() === String(user.email).toLowerCase());

                if (isTargetUser && notif.read !== true && notif.isRead !== true) {
                    count++;
                }
            });
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

            const userData = {
                ...extraData,
                email,
                createdAt: firestoreTimestamp(),
                flavorId: flavorId
            };

            try {
                await setDoc(doc(firestore, 'users', newUser.uid), userData);
            } catch (fsError) {
                console.error("Erro ao salvar usuário no Firestore:", fsError);
            }

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
        <AuthContext.Provider value={{ user, loading, login, register, logout, resetPassword, unreadCount }}>
            {children}
        </AuthContext.Provider>
    );
};