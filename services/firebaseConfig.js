import config from '../src/config';
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';



const app = initializeApp(config.firebase);

// Inicializa o Auth com persistência via AsyncStorage
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// O transporte WebChannel pode cair repetidamente em simuladores e algumas
// redes móveis. Long polling mantém as escutas do Firestore estáveis no RN.
const firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
});
const storage = getStorage(app);
const functions = getFunctions(app, config.functionsRegion);

export { auth, firestore, functions, storage };
export default app;
