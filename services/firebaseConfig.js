import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
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

// Inicializa o Auth com persistência via AsyncStorage
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const firestore = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { auth, firestore, functions, storage };
export default app;
