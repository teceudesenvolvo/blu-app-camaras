import config from '../src/config';
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';



const app = initializeApp(config.firebase);

// Inicializa o Auth com persistência via AsyncStorage
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const firestore = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, config.functionsRegion);

export { auth, firestore, functions, storage };
export default app;
