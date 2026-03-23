import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyDc1N9npL8gvdaR1s2vXZlEk29pG8hLYTA",
    authDomain: "blu-app-camara.firebaseapp.com",
    databaseURL: "https://blu-app-camara-default-rtdb.firebaseio.com",
    projectId: "blu-app-camara",
    storageBucket: "blu-app-camara.firebasestorage.app",
    messagingSenderId: "1070248841383",
    appId: "1:1070248841383:web:1df6b381187a6f296bcb82",
    measurementId: "G-2Y562TKJW3"
};

const app = initializeApp(firebaseConfig);

// Inicialização com persistência para manter o usuário logado
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getDatabase(app);

export { auth, db };
export default app;