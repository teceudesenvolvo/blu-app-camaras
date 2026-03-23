import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent garante que o ambiente (Expo Go ou Native) 
// carregue o App.js corretamente e lide com as assets.
registerRootComponent(App);