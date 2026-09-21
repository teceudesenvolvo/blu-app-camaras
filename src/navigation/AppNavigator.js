import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from 'styled-components/native';
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
import AvaliarAtendimentoScreen from '../screens/AvaliarAtendimentoScreen';
import BalcaoCidadaoScreen from '../screens/BalcaoCidadaoScreen';
import BalcaoDetalheScreen from '../screens/BalcaoDetalheScreen';
import BalcaoSolicitacaoScreen from '../screens/BalcaoSolicitacaoScreen';
import CadastroScreen from '../screens/CadastroScreen';
import ChatMensagensScreen from '../screens/ChatMensagensScreen';
import ChatMensagensListaScreen from '../screens/ChatMensagensListaScreen';
import ContatoConfiancaScreen from '../screens/ContatoConfiancaScreen';
import LicitacoesScreen from '../screens/LicitacoesScreen';
import LicitacaoDetalheScreen from '../screens/LicitacaoDetalheScreen';
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
import { MobileModulesProvider, useMobileModules } from '../context/MobileModulesContext';
import { moduleForScreen, routeForModule } from '../config/mobileModules';
import { PortalBackground, PortalScreenHeader } from '../components/PortalScaffold';
import EsicScreen from '../screens/EsicScreen';
import NoticiasScreen from '../screens/NoticiasScreen';
import MicroempreendedorScreen from '../screens/MicroempreendedorScreen';
import AvaliacoesScreen from '../screens/AvaliacoesScreen';
import ProtocoloScreen from '../screens/ProtocoloScreen';
import GabineteVereadorScreen from '../screens/GabineteVereadorScreen';
import EscolaParlamentoScreen from '../screens/EscolaParlamentoScreen';
import ProconScreen from '../screens/ProconScreen';
import AdminModuleScreen, { ADMIN_ROUTE_MODULES } from '../screens/AdminModuleScreen';
import AdminBalcaoScreen from '../screens/AdminBalcaoScreen';
import AdminVereadoresScreen from '../screens/AdminVereadoresScreen';
import AdminPielScreen from '../screens/AdminPielScreen';
import AdminProcuradoriaScreen from '../screens/AdminProcuradoriaScreen';
import AdminGabineteScreen from '../screens/AdminGabineteScreen';
import AdminAvaliacoesScreen from '../screens/AdminAvaliacoesScreen';
import AdminNoticiasScreen from '../screens/AdminNoticiasScreen';
import AdminProtocoloScreen from '../screens/AdminProtocoloScreen';
import AdminContratosScreen from '../screens/AdminContratosScreen';
import AdminAlmoxarifadoScreen from '../screens/AdminAlmoxarifadoScreen';
import AdminPatrimonioScreen from '../screens/AdminPatrimonioScreen';
import AdminManutencaoScreen from '../screens/AdminManutencaoScreen';
import AdminFrotasScreen from '../screens/AdminFrotasScreen';
import AdminLegislativoScreen from '../screens/AdminLegislativoScreen';
import AdminEsicScreen from '../screens/AdminEsicScreen';
import AdminJuridicoScreen from '../screens/AdminJuridicoScreen';
import AdminMicroempreendedorScreen from '../screens/AdminMicroempreendedorScreen';
import AdminMensagensScreen from '../screens/AdminMensagensScreen';
import AdminMensagensListaScreen from '../screens/AdminMensagensListaScreen';
import AdminOuvidoriaScreen from '../screens/AdminOuvidoriaScreen';
import AdminProconScreen from '../screens/AdminProconScreen';
import AdminRecepcaoScreen from '../screens/AdminRecepcaoScreen';
import AdminRecepcaoConfirmacaoScreen from '../screens/AdminRecepcaoConfirmacaoScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const { width } = Dimensions.get('window');

const UnavailableText = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 15px;
  line-height: 22px;
  margin: 20px;
`;

const guardScreen = (Screen, moduleId) => function GuardedScreen(props) {
    const { loading, canUse } = useMobileModules();
    const requestedModule = moduleId || moduleForScreen(props.route.name, props.route.params);
    if (loading) return <PortalBackground />;
    if (requestedModule && !canUse(requestedModule)) {
        return <PortalBackground>
            <PortalScreenHeader navigation={props.navigation} title="Acesso indisponível" />
            <UnavailableText>Este serviço não está disponível para seu perfil neste aplicativo.</UnavailableText>
        </PortalBackground>;
    }
    return <Screen {...props} />;
};

const guardedScreens = {
    Vereadores: guardScreen(VereadoresScreen, 'vereadores'),
    Piel: guardScreen(PielScreen, 'piel'),
    Procuradoria: guardScreen(ProcuradoriaScreen, 'procuradoria'),
    TvCamara: guardScreen(TvCamaraScreen, 'tvCamara'),
    AtendimentoJuridico: guardScreen(AtendimentoJuridicoScreen, 'juridico'),
    OuvidoriaMunicipal: guardScreen(OuvidoriaMunicipalScreen, 'ouvidoria'),
    BalcaoCidadao: guardScreen(BalcaoCidadaoScreen, 'balcao'),
    ProcuradoriaSolicitacao: guardScreen(ProcuradoriaSolicitacaoScreen, 'procuradoria'),
    BalcaoSolicitacao: guardScreen(BalcaoSolicitacaoScreen, 'balcao'),
    ContatoConfianca: guardScreen(ContatoConfiancaScreen, 'procuradoria'),
    MeusAtendimentos: guardScreen(MeusAtendimentosScreen),
    NoticiaDetalhe: guardScreen(NoticiaDetalheScreen, 'noticias'),
    Noticias: guardScreen(NoticiasScreen, 'noticias'),
    Esic: guardScreen(EsicScreen, 'esic'),
    Microempreendedor: guardScreen(MicroempreendedorScreen, 'microempreendedor'),
    Avaliacoes: guardScreen(AvaliacoesScreen, 'avaliacoes'),
    Protocolo: guardScreen(ProtocoloScreen, 'protocolo'),
    GabineteVereador: guardScreen(GabineteVereadorScreen, 'agendaVereadores'),
    EscolaParlamento: guardScreen(EscolaParlamentoScreen, 'escolaParlamento'),
    Procon: guardScreen(ProconScreen, 'procon'),
    OuvidoriaDetalhe: guardScreen(OuvidoriaDetalheScreen, 'ouvidoria'),
    BalcaoDetalhe: guardScreen(BalcaoDetalheScreen, 'balcao'),
    AvaliarAtendimento: guardScreen(AvaliarAtendimentoScreen, 'avaliacoes'),
    ProcuradoriaDetalhe: guardScreen(ProcuradoriaDetalheScreen, 'procuradoria'),
    PanicLocation: guardScreen(PanicLocationScreen, 'procuradoria'),
};

const getNotificationRoute = (data = {}) => {
    if (data.type === 'service-evaluation') {
        return {
            name: 'AvaliarAtendimento',
            params: {
                protocolo: data.protocolo || data.solicitacaoId,
                notificationId: data.notificationId,
            },
        };
    }

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

const LiquidTabItem = ({ icon, isFocused, onPress, primaryColor, dotColor, activeIconColor, inactiveColor, compact, showBadge }) => {
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
                <MaterialCommunityIcons name={icon} size={compact ? 31 : 26} color={isFocused ? activeIconColor : inactiveColor} />
                {showBadge ? <View style={styles.messageBadge} /> : null}
            </Animated.View>
            {!compact ? <Animated.View style={[styles.activeDot, { backgroundColor: dotColor }, dotStyle]} /> : null}
        </TouchableOpacity>
    );
};

// 3. O COMPONENTE DA BARRA
const LiquidTabBar = ({ state, descriptors, navigation }) => {
    const { unreadMessagesCount } = React.useContext(AuthContext);
    const appTheme = useTheme();
    const primaryColor = appTheme.portal.primary;
    const isDark = appTheme.mode === 'dark';
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

    if (descriptors[state.routes[state.index].key]?.options?.hideTabBar || state.routes[state.index].params?.chatOpen) return null;

    return (
        <View style={styles.navContainer}>
            <BlurView intensity={96} tint={isDark ? 'dark' : 'light'} style={[styles.blur, { width: pillWidth, borderColor: isDark ? 'rgba(226,242,255,0.72)' : 'rgba(255,255,255,0.92)' }]}>
                <LinearGradient
                    pointerEvents="none"
                    colors={isDark
                        ? ['rgba(16,37,54,0.92)', 'rgba(7,19,31,0.72)', 'rgba(41,65,84,0.46)']
                        : ['rgba(255,255,255,0.86)', 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0.22)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
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
                                    borderWidth: 1,
                                    borderColor: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.88)',
                                },
                            ]}
                        >
                            <LinearGradient
                                colors={isDark
                                    ? ['rgba(255,255,255,0.98)', `${primaryColor}92`, 'rgba(226,242,255,0.78)']
                                    : ['rgba(255,255,255,0.98)', `${primaryColor}28`, 'rgba(255,255,255,0.48)']}
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
                            dotColor={isDark ? appTheme.portal.accent : appTheme.portal.secondary}
                            activeIconColor={isDark ? appTheme.portal.accent : appTheme.portal.secondary}
                            inactiveColor={appTheme.portal.text}
                            showBadge={showBadge}
                            onPress={() => navigation.navigate(options.routeTarget || route.name)}
                        />
                    );
                })}
            </BlurView>

            <TouchableOpacity activeOpacity={0.76} onPress={() => navigation.navigate(profileRoute.name)} style={[styles.profileButtonOuter, { borderColor: isDark ? 'rgba(226,242,255,0.72)' : 'rgba(255,255,255,0.92)' }]}>
                <BlurView intensity={96} tint={isDark ? 'dark' : 'light'} style={styles.profileButton}>
                    <LinearGradient
                        colors={state.index === state.routes.length - 1
                            ? ['rgba(125, 211, 252, 0.96)', 'rgba(16, 185, 129, 0.56)', 'rgba(255,255,255,0.55)']
                            : isDark
                                ? ['rgba(16,37,54,0.94)', 'rgba(7,19,31,0.72)', 'rgba(41,65,84,0.5)']
                                : ['rgba(255,255,255,0.88)', 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0.24)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <MaterialCommunityIcons
                        name={descriptors[profileRoute.key].options.tabBarIconName || 'account-outline'}
                        size={34}
                        color={state.index === state.routes.length - 1 ? (isDark ? appTheme.portal.accent : appTheme.portal.secondary) : appTheme.portal.text}
                    />
                </BlurView>
            </TouchableOpacity>
        </View>
    );
};

function MensagensTabScreen(props) {
    const { canUseAdminApp } = useMobileModules();
    const Screen = canUseAdminApp('mensagens') ? AdminMensagensListaScreen : ChatMensagensListaScreen;
    return <Screen {...props} />;
}

// 4. TAB NAVIGATOR (Telas principais com a barra visível)
function BottomTabNavigator() {
    const { canUse, settings, role } = useMobileModules();
    const routes = {
        servicos: { name: 'Servicos', component: AtendimentosScreen, icon: 'view-grid-plus-outline', label: 'Serviços' },
                licitacoes: { name: 'Licitacoes', component: LicitacoesScreen, icon: 'gavel', label: 'Licitações' },
        mensagens: { name: 'Mensagens', component: MensagensTabScreen, icon: 'message-text-outline', label: 'Mensagens', module: 'mensagens' },
        balcao: { name: 'BalcaoCidadao', component: guardedScreens.BalcaoCidadao, icon: 'account-check-outline', label: 'Balcão', module: 'balcao' },
        legislativo: { name: 'Legislativo', component: guardedScreens.Protocolo, icon: 'scale-balance', label: 'Legislativo', module: 'legislativo' },
        protocolo: { name: 'Protocolo', component: guardedScreens.Protocolo, icon: 'folder-text-outline', label: 'Protocolo', module: 'protocolo' },
        ouvidoria: { name: 'Ouvidoria', component: guardedScreens.OuvidoriaMunicipal, icon: 'message-alert-outline', label: 'Ouvidoria', module: 'ouvidoria' },
        esic: { name: 'Esic', component: guardedScreens.Esic, icon: 'file-lock-outline', label: 'e-SIC', module: 'esic' },
        procuradoria: { name: 'Procuradoria', component: guardedScreens.Procuradoria, icon: 'gender-female', label: 'Mulher', module: 'procuradoria' },
        procon: { name: 'Procon', component: guardedScreens.Procon, icon: 'shield-check-outline', label: 'PROCON', module: 'procon' },
        microempreendedor: { name: 'Microempreendedor', component: guardedScreens.Microempreendedor, icon: 'briefcase-outline', label: 'Negócios', module: 'microempreendedor' },
        escolaParlamento: { name: 'EscolaParlamento', component: guardedScreens.EscolaParlamento, icon: 'school-outline', label: 'Escola', module: 'escolaParlamento' },
        tvCamara: { name: 'TvCamara', component: guardedScreens.TvCamara, icon: 'television-play', label: 'TV Câmara', module: 'tvCamara' },
        noticias: { name: 'Noticias', component: guardedScreens.Noticias, icon: 'newspaper-variant-outline', label: 'Notícias', module: 'noticias' },
        vereadores: { name: 'Vereadores', component: guardedScreens.Vereadores, icon: 'account-group-outline', label: 'Vereadores', module: 'vereadores' },
        piel: { name: 'Piel', component: guardedScreens.Piel, icon: 'card-account-details-outline', label: 'PIEL', module: 'piel' },
        avaliacoes: { name: 'Avaliacoes', component: guardedScreens.Avaliacoes, icon: 'star-outline', label: 'Avaliações', module: 'avaliacoes' },
    };
    const configured = Array.isArray(settings?.appBottomBarModules) ? settings.appBottomBarModules : ['servicos', 'licitacoes', 'mensagens'];
    const middleRoutes = configured.map(id => routes[id]).filter(Boolean).filter(route => !route.module || canUse(route.module));
    return (
        <Tab.Navigator
            tabBar={props => <LiquidTabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tab.Screen name="Inicio" component={HomeScreen} options={{ tabBarIconName: 'home-variant', tabBarLabel: 'Início' }} />
            {middleRoutes.map(route => <Tab.Screen key={route.name} name={route.name} component={route.component} options={{
                tabBarIconName: route.icon,
                tabBarLabel: route.label,
                routeTarget: route.module === 'mensagens' ? route.name : routeForModule(settings, role, route.module || route.name, route.name),
            }} />)}
            <Tab.Screen name="Perfil" component={PerfilScreen} options={{ tabBarIconName: 'account-outline', tabBarLabel: 'Perfil' }} />
        </Tab.Navigator>
    );
}

// 5. STACK NAVIGATOR PRINCIPAL
function NavigationContent() {
    const { user, loading } = React.useContext(AuthContext);
    const { loading: modulesLoading, canUse } = useMobileModules();
    const navigation = useNavigation();

    useEffect(() => {
        // Listener para quando o usuário CLICA na notificação
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            const route = getNotificationRoute(data);

            if (route && canUse(moduleForScreen(route.name, route.params))) {
                navigation.navigate(route.name, route.params);
            }
        });

        return () => subscription.remove();
    }, [navigation, canUse]);

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

            if ((actionId === 'new-balcao' || screen === 'BalcaoCidadao' || screen === 'BalcaoSolicitacao') && canUse('balcao')) {
                navigation.navigate('BalcaoCidadao');
                return;
            }

            if ((actionId === 'tv-camara' || screen === 'TvCamara') && canUse('tvCamara')) {
                navigation.navigate('TvCamara');
            }
        };

        QuickActions.setItems(shortcutItems.filter(item => canUse(item.id === 'tv-camara' ? 'tvCamara' : 'balcao'))).catch((error) => {
            console.warn('Nao foi possivel configurar atalhos do app:', error);
        });

        if (QuickActions.initial) {
            openShortcut(QuickActions.initial);
        }

        const subscription = QuickActions.addListener(openShortcut);
        return () => subscription?.remove?.();
    }, [navigation, user, canUse]);

    if (loading || modulesLoading) {
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
                    <Stack.Screen name="Vereadores" component={guardedScreens.Vereadores} />
                    <Stack.Screen name="Piel" component={guardedScreens.Piel} />
                    <Stack.Screen name="Procuradoria" component={guardedScreens.Procuradoria} />
                    <Stack.Screen name="TvCamara" component={guardedScreens.TvCamara} />
                    <Stack.Screen name="AtendimentoJuridico" component={guardedScreens.AtendimentoJuridico} />
                    <Stack.Screen name="OuvidoriaMunicipal" component={guardedScreens.OuvidoriaMunicipal} />
                    <Stack.Screen name="BalcaoCidadao" component={guardedScreens.BalcaoCidadao} />
                    <Stack.Screen name="Notificacoes" component={NotificacoesScreen} />
                    <Stack.Screen name="PerfilDadosPessoais" component={PerfilDadosPessoaisScreen} />
                    <Stack.Screen name="PerfilSeguranca" component={PerfilSegurancaScreen} />
                    <Stack.Screen name="PerfilBeneficiarios" component={PerfilBeneficiariosScreen} />
                    <Stack.Screen name="ProcuradoriaSolicitacao" component={guardedScreens.ProcuradoriaSolicitacao} />
                    <Stack.Screen name="BalcaoSolicitacao" component={guardedScreens.BalcaoSolicitacao} />
                    <Stack.Screen name="ContatoConfianca" component={guardedScreens.ContatoConfianca} />
                    <Stack.Screen name="MeusAtendimentos" component={guardedScreens.MeusAtendimentos} />
                    <Stack.Screen name="NoticiaDetalhe" component={guardedScreens.NoticiaDetalhe} />
                    <Stack.Screen name="LicitacaoDetalhe" component={LicitacaoDetalheScreen} />
                    <Stack.Screen name="Noticias" component={guardedScreens.Noticias} />
                    <Stack.Screen name="Esic" component={guardedScreens.Esic} />
                    <Stack.Screen name="Microempreendedor" component={guardedScreens.Microempreendedor} />
                    <Stack.Screen name="Avaliacoes" component={guardedScreens.Avaliacoes} />
                    <Stack.Screen name="Protocolo" component={guardedScreens.Protocolo} />
                    <Stack.Screen name="GabineteVereador" component={guardedScreens.GabineteVereador} />
                    <Stack.Screen name="EscolaParlamento" component={guardedScreens.EscolaParlamento} />
                    <Stack.Screen name="Procon" component={guardedScreens.Procon} />
                    <Stack.Screen name="OuvidoriaDetalhe" component={guardedScreens.OuvidoriaDetalhe} />
                    <Stack.Screen name="BalcaoDetalhe" component={guardedScreens.BalcaoDetalhe} />
                    <Stack.Screen name="AvaliarAtendimento" component={guardedScreens.AvaliarAtendimento} />
                    <Stack.Screen name="ProcuradoriaDetalhe" component={guardedScreens.ProcuradoriaDetalhe} />
                    <Stack.Screen name="ChatMensagensDetalhe" component={guardScreen(ChatMensagensScreen, 'mensagens')} />
                    <Stack.Screen name="AdminMensagensDetalhe" component={guardScreen(AdminMensagensScreen, 'mensagens')} />
                    <Stack.Screen name="AdminRecepcaoConfirmacao" component={AdminRecepcaoConfirmacaoScreen} />
                    <Stack.Screen name="PanicLocation" component={guardedScreens.PanicLocation} />
                    {Object.entries(ADMIN_ROUTE_MODULES).map(([name, moduleId]) => (
                        <Stack.Screen key={name} name={name} component={name === 'AdminBalcao' ? AdminBalcaoScreen : name === 'AdminVereadores' ? AdminVereadoresScreen : name === 'AdminPiel' ? AdminPielScreen : name === 'AdminProcuradoria' ? AdminProcuradoriaScreen : name === 'AdminGabinete' ? AdminGabineteScreen : name === 'AdminAvaliacoes' ? AdminAvaliacoesScreen : name === 'AdminOuvidoria' ? AdminOuvidoriaScreen : name === 'AdminProcon' ? AdminProconScreen : name === 'AdminRecepcao' ? AdminRecepcaoScreen : name === 'AdminNoticias' ? AdminNoticiasScreen : name === 'AdminProtocolo' ? AdminProtocoloScreen : name === 'AdminContratos' ? AdminContratosScreen : name === 'AdminAlmoxarifado' ? AdminAlmoxarifadoScreen : name === 'AdminPatrimonio' ? AdminPatrimonioScreen : name === 'AdminManutencao' ? AdminManutencaoScreen : name === 'AdminFrotas' ? AdminFrotasScreen : name === 'AdminLegislativo' ? AdminLegislativoScreen : name === 'AdminEsic' ? AdminEsicScreen : name === 'AdminJuridico' ? AdminJuridicoScreen : name === 'AdminMicroempreendedor' ? AdminMicroempreendedorScreen : name === 'AdminMensagens' ? AdminMensagensScreen : name === 'AdminTvCamara' ? TvCamaraScreen : AdminModuleScreen} initialParams={{ moduleId }} />
                    ))}
                </>
            )}
        </Stack.Navigator>
    );
}

export default function AppNavigator() {
    return (
        <AuthProvider>
            <MobileModulesProvider>
                <NavigationContent />
            </MobileModulesProvider>
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
        borderWidth: 1,
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
        borderWidth: 0,
    },
    bubble: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 0,
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
        borderWidth: 1,
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
