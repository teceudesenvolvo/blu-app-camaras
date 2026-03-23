import { NavigationContainer } from '@react-navigation/native'; // Faltava esta importação
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from 'styled-components/native';

// Importamos apenas o Navegador Principal
import AppNavigator from './src/navigation/AppNavigator';

// Pegamos os dados do Antigravity/Switch (Paraipaba)
const { theme: flavorTheme } = Constants.expoConfig.extra;

const appTheme = {
  primary: flavorTheme?.primary || '#004a99',
  secondary: flavorTheme?.secondary || '#f9c204',
  background: flavorTheme?.background || '#f8fafc',
};

export default function App() {
  return (
    <NavigationContainer>
      <ThemeProvider theme={appTheme}>
        <StatusBar style="dark" />

        {/* O AppNavigator agora controla qual tela mostrar */}
        <AppNavigator />
      </ThemeProvider>
    </NavigationContainer>
  );
}