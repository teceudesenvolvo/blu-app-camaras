import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const TAB_WIDTH = (width - 40) / 4; // 4 abas, descontando as margens laterais

export const LiquidTabBar = ({ state, descriptors, navigation }) => {
    const { theme } = Constants.expoConfig.extra;
    const primaryColor = theme?.primary || '#025AA1';

    // Valor compartilhado para a posição X da "bolha líquida"
    const translateX = useSharedValue(0);

    useEffect(() => {
        // Move a bolha suavemente para a posição da aba ativa
        translateX.value = withSpring(state.index * TAB_WIDTH, {
            damping: 12, // Controla o "quique" (elasticidade)
            stiffness: 90, // Controla a velocidade da "fluidez"
        });
    }, [state.index]);

    const animatedBubbleStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <View style={styles.container}>
            <BlurView intensity={60} tint="light" style={styles.blurContainer}>
                {/* A BOLHA LÍQUIDA (O efeito que corre por trás) */}
                <Animated.View style={[styles.bubble, animatedBubbleStyle, { backgroundColor: primaryColor + '25' }]}>
                    {/* Um brilho extra no centro da bolha */}
                    <View style={[styles.innerGlow, { backgroundColor: primaryColor }]} />
                </Animated.View>

                {/* ÍCONES */}
                {state.routes.map((route, index) => {
                    const isFocused = state.index === index;
                    const { options } = descriptors[route.key];

                    const onPress = () => {
                        const event = navigation.emit({ type: 'tabPress', target: route.key });
                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    return (
                        <TouchableOpacity key={index} onPress={onPress} style={styles.tabItem}>
                            <MaterialCommunityIcons
                                name={options.tabBarIconName}
                                size={28}
                                color={isFocused ? primaryColor : '#94a3b8'}
                            />
                        </TouchableOpacity>
                    );
                })}
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        right: 20,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    blurContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    bubble: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        left: (TAB_WIDTH - 50) / 2, // Centraliza a bolha na largura da aba
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerGlow: {
        width: 6,
        height: 6,
        borderRadius: 3,
        position: 'absolute',
        bottom: -10, // Um pontinho "líquido" embaixo do ícone ativo
    }
});