import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

// 1. Telas da BottomBar
import AtendimentosScreen from '../screens/AtendimentosScreen';
import HomeScreen from '../screens/Home';
import PerfilScreen from '../screens/PerfilScreen';
import ProcuradoriaScreen from '../screens/ProcuradoriaScreen';
import TvCamaraScreen from '../screens/TvCamaraScreen';

// 2. Telas Internas (Escondem a BottomBar)
import AtendimentoJuridicoScreen from '../screens/AtendimentoJuridicoScreen';
import BalcaoCidadaoScreen from '../screens/BalcaoCidadaoScreen';
import BalcaoDetalheScreen from '../screens/BalcaoDetalheScreen';
import BalcaoSolicitacaoScreen from '../screens/BalcaoSolicitacaoScreen';
import CadastroScreen from '../screens/CadastroScreen';
import ChatMensagensScreen from '../screens/ChatMensagensScreen';
import ContatoConfiancaScreen from '../screens/ContatoConfiancaScreen';
import LicitacoesScreen from '../screens/LicitacoesScreen';
import LoginScreen from '../screens/LoginScreen';
import MeusAtendimentosScreen from '../screens/MeusAtendimentosScreen';
import NoticiaDetalheScreen from '../screens/NoticiaDetalheScreen';
import NotificacoesScreen from '../screens/NotificacoesScreen';
import OuvidoriaDetalheScreen from '../screens/OuvidoriaDetalheScreen';
import OuvidoriaMunicipalScreen from '../screens/OuvidoriaMunicipalScreen';
import PanicLocationScreen from '../screens/PanicLocationScreen';
import PerfilBeneficiariosScreen from '../screens/PerfilBeneficiariosScreen';
import PerfilDadosPessoaisScreen from '../screens/PerfilDadosPessoaisScreen';
import PerfilSegurancaScreen from '../screens/PerfilSegurancaScreen';
import PielScreen from '../screens/Piel';
import ProcuradoriaDetalheScreen from '../screens/ProcuradoriaDetalheScreen';
import ProcuradoriaSolicitacaoScreen from '../screens/ProcuradoriaSolicitacaoScreen';
import VereadoresScreen from '../screens/VereadoresScreen';

import { AuthContext, AuthProvider } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const { width } = Dimensions.get('window');

const getNotificationRoute = (data = {}) => {
    if (data.screen === 'TvCamara') {
        return {
            name: 'TvCamara',
            params: { videoId: data.videoId },
        };
    }

    if (data.screen === 'NoticiaDetalhe' || data.type === 'news') {
        return {
            name: 'NoticiaDetalhe',
            params: {
                id: data.id || data.noticiaId || data.protocolo,
            },
        };
    }

    if (data.screen === 'MeusAtendimentos' || data.collection) {
        return {
            name: 'MeusAtendimentos',
            params: {
                source: data.source || data.collection || 'balcao-cidadao',
                solicitacaoId: data.solicitacaoId || data.protocolo,
            },
        };
    }

    if (data.screen) {
        return {
            name: data.screen,
            params: data,
        };
    }

    return null;
};

const LiquidTabItem = ({ icon, isFocused, onPress, primaryColor, compact, showBadge }) => {
    const focusProgress = useSharedValue(isFocused ? 1 : 0);

    React.useEffect(() => {
        focusProgress.value = withSpring(isFocused ? 1 : 0, {
            damping: 13,
            stiffness: 180,
        });
    }, [focusProgress, isFocused]);

    const iconStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(focusProgress.value, [0, 1], [2, -2]) },
            { scale: interpolate(focusProgress.value, [0, 1], [0.94, 1.1]) },
        ],
    }));

    const dotStyle = useAnimatedStyle(() => ({
        opacity: focusProgress.value,
        transform: [{ scale: interpolate(focusProgress.value, [0, 1], [0.35, 1]) }],
    }));

    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.72}
        >
            <Animated.View style={[iconStyle, styles.iconWrap]}>
                <MaterialCommunityIcons name={icon} size={compact ? 31 : 26} color={isFocused ? primaryColor : '#111827'} />
                {showBadge ? <View style={styles.messageBadge} /> : null}
            </Animated.View>
            {!compact ? <Animated.View style={[styles.activeDot, { backgroundColor: primaryColor }, dotStyle]} /> : null}
        </TouchableOpacity>
    );
};

// 3. O COMPONENTE DA BARRA
const LiquidTabBar = ({ state, descriptors, navigation }) => {
    const { unreadMessagesCount } = React.useContext(AuthContext);
    const { theme } = Constants.expoConfig.extra;
    const primaryColor = theme?.primary || '#025AA1';
    const pillRoutes = state.routes.slice(0, -1);
    const profileRoute = state.routes[state.routes.length - 1];
    const pillWidth = width - 128;
    const tabWidth = pillWidth / pillRoutes.length;
    const bubbleSize = Math.min(58, tabWidth - 10);
    const translateX = useSharedValue(0);
    const liquidProgress = useSharedValue(0);
    const direction = useSharedValue(1);
    const previousIndex = React.useRef(state.index);

    React.useEffect(() => {
        const delta = state.index - previousIndex.current;
        direction.value = delta === 0 ? direction.value : Math.sign(delta);
        previousIndex.current = state.index;
        liquidProgress.value = 0;
        liquidProgress.value = withSequence(
            withTiming(1, { duration: 150 }),
            withTiming(0, { duration: 280 }),
        );
        translateX.value = withSpring(Math.min(state.index, pillRoutes.length - 1) * tabWidth, {
            damping: 16,
            stiffness: 118,
            mass: 0.78,
        });
    }, [direction, liquidProgress, pillRoutes.length, state.index, tabWidth, translateX]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value - direction.value * interpolate(liquidProgress.value, [0, 1], [0, 8]) },
            { scaleX: interpolate(liquidProgress.value, [0, 1], [1, 1.44]) },
            { scaleY: interpolate(liquidProgress.value, [0, 1], [1, 0.92]) },
        ],
    }));

    const trailStyle = useAnimatedStyle(() => ({
        opacity: interpolate(liquidProgress.value, [0, 0.2, 1], [0, 0.55, 0]),
        transform: [
            { translateX: translateX.value - direction.value * interpolate(liquidProgress.value, [0, 1], [0, 30]) },
            { scaleX: interpolate(liquidProgress.value, [0, 1], [0.86, 1.5]) },
            { scaleY: interpolate(liquidProgress.value, [0, 1], [0.88, 0.72]) },
        ],
    }));

    const shimmerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(liquidProgress.value, [0, 0.45, 1], [0.2, 0.95, 0.35]),
        transform: [
            { translateX: translateX.value + direction.value * interpolate(liquidProgress.value, [0, 1], [-18, 20]) },
            { scaleX: interpolate(liquidProgress.value, [0, 1], [0.7, 1.25]) },
        ],
    }));

    return (
        <View style={styles.navContainer}>
            <BlurView intensity={96} tint="light" style={[styles.blur, { width: pillWidth }]}>
                <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(255,255,255,0.86)', 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0.22)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
                <View pointerEvents="none" style={styles.glassHighlight} />
                <View pointerEvents="none" style={styles.glassGlowLeft} />
                {state.index < pillRoutes.length ? (
                    <>
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.trail,
                                trailStyle,
                                {
                                    width: bubbleSize,
                                    height: bubbleSize,
                                    borderRadius: bubbleSize / 2,
                                    left: (tabWidth - bubbleSize) / 2,
                                    backgroundColor: `${primaryColor}1c`,
                                },
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.bubble,
                                animatedStyle,
                                {
                                    width: bubbleSize + 10,
                                    height: 64,
                                    borderRadius: 32,
                                    left: (tabWidth - bubbleSize) / 2 - 5,
                                },
                            ]}
                        >
                            <LinearGradient
                                colors={['rgba(255,255,255,0.98)', `${primaryColor}28`, 'rgba(255,255,255,0.48)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.bubbleGradient}
                            />
                            <Animated.View style={[styles.bubbleShimmer, shimmerStyle]} />
                        </Animated.View>
                    </>
                ) : null}
                {pillRoutes.map((route, index) => {
                    const isFocused = state.index === index;
                    const { options } = descriptors[route.key];
                    const icon = options.tabBarIconName || 'help-circle';
                    const showBadge = route.name === 'Mensagens' && unreadMessagesCount > 0;

                    return (
                        <LiquidTabItem
                            key={route.key}
                            icon={icon}
                            isFocused={isFocused}
                            primaryColor={primaryColor}
                            showBadge={showBadge}
                            onPress={() => navigation.navigate(route.name)}
                        />
                    );
                })}
            </BlurView>

            <TouchableOpacity activeOpacity={0.76} onPress={() => navigation.navigate(profileRoute.name)} style={styles.profileButtonOuter}>
                <BlurView intensity={96} tint="light" style={styles.profileButton}>
                    <LinearGradient
                        colors={state.index === state.routes.length - 1
                            ? ['rgba(125, 211, 252, 0.96)', 'rgba(16, 185, 129, 0.56)', 'rgba(255,255,255,0.55)']
                            : ['rgba(255,255,255,0.88)', 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0.24)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <MaterialCommunityIcons
                        name={descriptors[profileRoute.key].options.tabBarIconName || 'account-outline'}
                        size={34}
                        color={state.index === state.routes.length - 1 ? primaryColor : '#111827'}
                    />
                </BlurView>
            </TouchableOpacity>
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
            <Tab.Screen name="Inicio" component={HomeScreen} options={{ tabBarIconName: 'home-variant', tabBarLabel: 'Início' }} />
            <Tab.Screen name="Servicos" component={AtendimentosScreen} options={{ tabBarIconName: 'view-grid-plus-outline', tabBarLabel: 'Serviços' }} />
            <Tab.Screen name="Licitacoes" component={LicitacoesScreen} options={{ tabBarIconName: 'gavel', tabBarLabel: 'Licitações' }} />
            <Tab.Screen name="Mensagens" component={ChatMensagensScreen} options={{ tabBarIconName: 'message-text-outline', tabBarLabel: 'Mensagens' }} />
            <Tab.Screen name="Perfil" component={PerfilScreen} options={{ tabBarIconName: 'account-outline', tabBarLabel: 'Perfil' }} />
        </Tab.Navigator>
    );
}

// 5. STACK NAVIGATOR PRINCIPAL
function NavigationContent() {
    const { user, loading } = React.useContext(AuthContext);
    const navigation = useNavigation();

    useEffect(() => {
        // Listener para quando o usuário CLICA na notificação
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            const route = getNotificationRoute(data);

            if (route) {
                navigation.navigate(route.name, route.params);
            }
        });

        return () => subscription.remove();
    }, [navigation]);

    useEffect(() => {
        const shortcutItems = [
            {
                id: 'new-balcao',
                title: 'Nova solicitação',
                subtitle: 'Balcão do Cidadão',
                icon: 'compose',
                params: { screen: 'BalcaoCidadao' },
            },
            {
                id: 'tv-camara',
                title: 'TV Câmara',
                subtitle: 'Assistir no app',
                icon: 'play',
                params: { screen: 'TvCamara' },
            },
        ];

        const openShortcut = (action) => {
            const actionId = action?.id || action?.type;
            const screen = action?.params?.screen;

            if (!user) {
                navigation.navigate('Login');
                return;
            }

            if (actionId === 'new-balcao' || screen === 'BalcaoCidadao' || screen === 'BalcaoSolicitacao') {
                navigation.navigate('BalcaoCidadao');
                return;
            }

            if (actionId === 'tv-camara' || screen === 'TvCamara') {
                navigation.navigate('TvCamara');
            }
        };

        QuickActions.setItems(shortcutItems).catch((error) => {
            console.warn('Nao foi possivel configurar atalhos do app:', error);
        });

        if (QuickActions.initial) {
            openShortcut(QuickActions.initial);
        }

        const subscription = QuickActions.addListener(openShortcut);
        return () => subscription?.remove?.();
    }, [navigation, user]);

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
                    <Stack.Screen name="Procuradoria" component={ProcuradoriaScreen} />
                    <Stack.Screen name="TvCamara" component={TvCamaraScreen} />
                    <Stack.Screen name="AtendimentoJuridico" component={AtendimentoJuridicoScreen} />
                    <Stack.Screen name="OuvidoriaMunicipal" component={OuvidoriaMunicipalScreen} />
                    <Stack.Screen name="BalcaoCidadao" component={BalcaoCidadaoScreen} />
                    <Stack.Screen name="Notificacoes" component={NotificacoesScreen} />
                    <Stack.Screen name="PerfilDadosPessoais" component={PerfilDadosPessoaisScreen} />
                    <Stack.Screen name="PerfilSeguranca" component={PerfilSegurancaScreen} />
                    <Stack.Screen name="PerfilBeneficiarios" component={PerfilBeneficiariosScreen} />
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
    navContainer: {
        position: 'absolute',
        bottom: 28,
        left: 18,
        right: 18,
        height: 82,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    blur: {
        height: 82,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 41,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.9)',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
        elevation: 12,
    },
    glassHighlight: {
        position: 'absolute',
        top: 5,
        left: 18,
        right: 18,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 1,
    },
    glassGlowLeft: {
        position: 'absolute',
        left: -18,
        top: 8,
        width: 92,
        height: 58,
        borderRadius: 40,
        backgroundColor: 'rgba(125, 211, 252, 0.25)',
    },
    trail: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.45)',
    },
    bubble: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        shadowColor: '#025AA1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 5,
    },
    bubbleGradient: {
        width: '100%',
        height: '100%',
    },
    bubbleShimmer: {
        position: 'absolute',
        top: 8,
        bottom: 8,
        width: 18,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.52)',
    },
    tabButton: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 0,
        paddingBottom: 0,
    },
    iconWrap: {
        position: 'relative',
    },
    profileButtonOuter: {
        width: 82,
        height: 82,
        borderRadius: 41,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.9)',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
        elevation: 12,
    },
    profileButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeDot: {
        position: 'absolute',
        bottom: 7,
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    messageBadge: {
        position: 'absolute',
        top: -3,
        right: -5,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#dc2626',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.92)',
    },
});
