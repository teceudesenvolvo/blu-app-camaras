import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const Container = styled.View`
  flex: 1;
  background-color: #fff1f2;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const AlertCard = styled.View`
  background-color: ${({ theme }) => theme.portal.card};
  border-radius: 30px;
  padding: 40px 20px;
  width: 100%;
  align-items: center;
  shadow-color: #be123c;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.1;
  shadow-radius: 20px;
  elevation: 10;
`;

const IconContainer = styled.View`
  width: 100px;
  height: 100px;
  border-radius: 50px;
  background-color: #ffe4e6;
  justify-content: center;
  align-items: center;
  margin-bottom: 25px;
`;

const Title = styled.Text`
  font-size: 24px;
  font-weight: 800;
  color: #be123c;
  text-align: center;
  margin-bottom: 10px;
`;

const Subtitle = styled.Text`
  font-size: 16px;
  color: #4b5563;
  text-align: center;
  line-height: 24px;
  margin-bottom: 30px;
`;

const MapButton = styled.TouchableOpacity`
  background-color: #be123c;
  flex-direction: row;
  align-items: center;
  padding: 18px 30px;
  border-radius: 15px;
  width: 100%;
  justify-content: center;
  margin-bottom: 15px;
`;

const MapButtonText = styled.Text`
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin-left: 10px;
`;

const CloseButton = styled.TouchableOpacity`
  padding: 15px;
`;

const CloseButtonText = styled.Text`
  color: #9ca3af;
  font-size: 14px;
`;

export default function PanicLocationScreen({ route, navigation }) {
    const { lat, lng, victimName } = route.params || {};

    const openInMaps = () => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${lat},${lng}`;
        const label = `Alerta de Pânico - ${victimName || 'Socorro'}`;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });

        Linking.openURL(url);
    };

    return (
        <Container>
            <AlertCard>
                <IconContainer>
                    <MaterialCommunityIcons name="shield-alert" size={60} color="#be123c" />
                </IconContainer>
                
                <Title>PEDIDO DE SOCORRO!</Title>
                <Subtitle>
                    <Text style={{ fontWeight: 'bold' }}>{victimName || 'Uma pessoa'}</Text> acionou o botão do pânico e precisa de ajuda urgente. 
                </Subtitle>

                <MapButton activeOpacity={0.8} onPress={openInMaps}>
                    <Ionicons name="map" size={24} color="#fff" />
                    <MapButtonText>Ver Localização no Mapa</MapButtonText>
                </MapButton>

                <CloseButton onPress={() => navigation.goBack()}>
                    <CloseButtonText>Fechar</CloseButtonText>
                </CloseButton>
            </AlertCard>
        </Container>
    );
}
