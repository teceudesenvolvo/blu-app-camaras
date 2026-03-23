import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Dimensions, View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

// 1. Telas da BottomBar
import HomeScreen from '../screens/Home';
import AtendimentosScreen from '../screens/AtendimentosScreen';
import ProcuradoriaScreen from '../screens/ProcuradoriaScreen';
import PerfilScreen from '../screens/PerfilScreen';

// 2. Telas Internas (Escondem a BottomBar)
import VereadoresScreen from '../screens/VereadoresScreen';
import PielScreen from '../screens/Piel';
import LicitacoesScreen from '../screens/LicitacoesScreen';
import AtendimentoJuridicoScreen from '../screens/AtendimentoJuridicoScreen';
import OuvidoriaMunicipalScreen from '../screens/OuvidoriaMunicipalScreen';
import BalcaoCidadaoScreen from '../screens/BalcaoCidadaoScreen';
import NotificacoesScreen from '../screens/NotificacoesScreen';
import ProcuradoriaSolicitacaoScreen from '../screens/ProcuradoriaSolicitacaoScreen';
import BalcaoSolicitacaoScreen from '../screens/BalcaoSolicitacaoScreen';
import ContatoConfiancaScreen from '../screens/ContatoConfiancaScreen';
import MeusAtendimentosScreen from '../screens/MeusAtendimentosScreen';
import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import NoticiaDetalheScreen from '../screens/NoticiaDetalheScreen';
import OuvidoriaDetalheScreen from '../screens/OuvidoriaDetalheScreen';
import BalcaoDetalheScreen from '../screens/BalcaoDetalheScreen';
import ProcuradoriaDetalheScreen from '../screens/ProcuradoriaDetalheScreen';
import PanicLocationScreen from '../screens/PanicLocationScreen';

import { AuthProvider, AuthContext } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const { width } = Dimensions.get('window');
const TAB_WIDTH = (width - 40) / 4;

// 3. O COMPONENTE DA BARRA
const LiquidTabBar = ({ state, descriptors, navigation }) => {
    const { theme } = Constants.expoConfig.extra;
    const primaryColor = theme?.primary || '#025AA1';
    const translateX = useSharedValue(0);

    React.useEffect(() => {
        translateX.value = withSpring(state.index * TAB_WIDTH, {
            damping: 14,
            stiffness: 100,
        });
    }, [state.index]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <View style={styles.navContainer}>
            <BlurView intensity={80} tint="light" style={styles.blur}>
                <Animated.View style={[styles.bubble, animatedStyle, { backgroundColor: primaryColor + '15' }]} />
                {state.routes.map((route, index) => {
                    const isFocused = state.index === index;
                    const { options } = descriptors[route.key];
                    const icon = options.tabBarIconName || 'help-circle';

                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => navigation.navigate(route.name)}
                            style={{ flex: 1, alignItems: 'center' }}
                        >
                            <MaterialCommunityIcons name={icon} size={28} color={isFocused ? primaryColor : '#94a3b8'} />
                        </TouchableOpacity>
                    );
                })}
            </BlurView>
        </View>
    );
};

// 4. TAB NAVIGATOR (Telas principais com a barra visível)
function BottomTabNavigator() {
    return (
        <Tab.Navigator
            tabBar={props => <LiquidTabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIconName: 'home-variant' }} />
            <Tab.Screen name="Atendimentos" component={AtendimentosScreen} options={{ tabBarIconName: 'plus-circle-outline' }} />
            <Tab.Screen name="Procuradoria" component={ProcuradoriaScreen} options={{ tabBarIconName: 'gender-female' }} />
            <Tab.Screen name="Perfil" component={PerfilScreen} options={{ tabBarIconName: 'account-outline' }} />
        </Tab.Navigator>
    );
}

import { useNavigation } from '@react-navigation/native';

// 5. STACK NAVIGATOR PRINCIPAL
function NavigationContent() {
    const { user, loading } = React.useContext(AuthContext);
    const navigation = useNavigation();

    useEffect(() => {
        // Listener para quando o usuário CLICA na notificação
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.screen) {
                navigation.navigate(data.screen);
            }
        });

        return () => subscription.remove();
    }, [navigation]);

    if (loading) {
        return null; // Or a splash screen
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Cadastro" component={CadastroScreen} />
                </>
            ) : (
                <>
                    <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
                    <Stack.Screen name="Vereadores" component={VereadoresScreen} />
                    <Stack.Screen name="Piel" component={PielScreen} />
                    <Stack.Screen name="Licitacoes" component={LicitacoesScreen} />
                    <Stack.Screen name="AtendimentoJuridico" component={AtendimentoJuridicoScreen} />
                    <Stack.Screen name="OuvidoriaMunicipal" component={OuvidoriaMunicipalScreen} />
                    <Stack.Screen name="BalcaoCidadao" component={BalcaoCidadaoScreen} />
                    <Stack.Screen name="Notificacoes" component={NotificacoesScreen} />
                    <Stack.Screen name="ProcuradoriaSolicitacao" component={ProcuradoriaSolicitacaoScreen} />
                    <Stack.Screen name="BalcaoSolicitacao" component={BalcaoSolicitacaoScreen} />
                    <Stack.Screen name="ContatoConfianca" component={ContatoConfiancaScreen} />
                    <Stack.Screen name="MeusAtendimentos" component={MeusAtendimentosScreen} />
                    <Stack.Screen name="NoticiaDetalhe" component={NoticiaDetalheScreen} />
                    <Stack.Screen name="OuvidoriaDetalhe" component={OuvidoriaDetalheScreen} />
                    <Stack.Screen name="BalcaoDetalhe" component={BalcaoDetalheScreen} />
                    <Stack.Screen name="ProcuradoriaDetalhe" component={ProcuradoriaDetalheScreen} />
                    <Stack.Screen name="PanicLocation" component={PanicLocationScreen} />
                </>
            )}
        </Stack.Navigator>
    );
}

export default function AppNavigator() {
    return (
        <AuthProvider>
            <NavigationContent />
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    navContainer: { position: 'absolute', bottom: 30, left: 20, right: 20, height: 70, borderRadius: 35, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.1)' },
    blur: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    bubble: { position: 'absolute', width: 50, height: 50, borderRadius: 25, left: (TAB_WIDTH - 50) / 2 }
});