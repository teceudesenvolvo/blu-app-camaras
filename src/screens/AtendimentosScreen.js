import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import styled from 'styled-components/native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const secondaryColor = Constants.expoConfig?.extra?.theme?.secondary || '#f9c204';
const backgroundColor = Constants.expoConfig?.extra?.theme?.background || '#f0f2f5';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${backgroundColor};
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 50px 20px 20px 20px;
  background-color: #fff;
`;

const BackButton = styled.TouchableOpacity`
  padding: 5px;
`;

const HeaderTitle = styled.Text`
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #111;
  margin-right: 30px;
`;

const Card = styled.View`
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  margin: 15px 20px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
  elevation: 2;
`;

const StepText = styled.Text`
  font-size: 14px;
  color: #888;
  margin-bottom: 15px;
`;

const TabsRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const TabButton = styled.TouchableOpacity`
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  border-width: 1px;
  border-color: ${props => props.active ? primaryColor : '#ddd'};
  background-color: ${props => props.active ? primaryColor : '#fff'};
  margin-right: ${props => props.last ? '0px' : '10px'};
  align-items: center;
`;

const TabText = styled.Text`
  color: ${props => props.active ? '#fff' : primaryColor};
  font-weight: 600;
  font-size: 14px;
`;

const ListLabel = styled.Text`
  font-size: 14px;
  color: #555;
  margin-bottom: 15px;
`;

const ServiceItem = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 10px;
  border-left-width: 4px;
  border-left-color: #2e7d32;
`;

const ServiceText = styled.Text`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #333;
`;

export default function AtendimentosScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Serviço Público');

  return (
    <Container showsVerticalScrollIndicator={false}>
      <HeaderContainer>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </BackButton>
        <HeaderTitle>Serviços</HeaderTitle>
      </HeaderContainer>

      <Card>
        <StepText>1. Escolha a Opção</StepText>
        <TabsRow>
          <TabButton
            active={activeTab === 'Vereador'}
            onPress={() => setActiveTab('Vereador')}
          >
            <TabText active={activeTab === 'Vereador'}>Vereador</TabText>
          </TabButton>
          <TabButton
            last
            active={activeTab === 'Serviço Público'}
            onPress={() => setActiveTab('Serviço Público')}
          >
            <TabText active={activeTab === 'Serviço Público'}>Serviço Público</TabText>
          </TabButton>
        </TabsRow>

        {activeTab === 'Serviço Público' && (
          <View style={{ marginTop: 20 }}>
            <ListLabel>Selecione o Serviço:</ListLabel>

            <ServiceItem onPress={() => navigation.navigate('OuvidoriaMunicipal')}>
              <ServiceText>Ouvidoria Municipal</ServiceText>
              <Ionicons name="arrow-forward" size={16} color="#2e7d32" />
            </ServiceItem>

            <TouchableOpacity
              onPress={() => navigation.navigate('MeusAtendimentos', { source: 'ouvidoria' })}
              style={{ padding: 20, alignItems: 'center', marginTop: 10, backgroundColor: '#fff', borderRadius: 12, borderTopWidth: 1, borderTopColor: '#eee' }}
            >
              <Text style={{ color: primaryColor, fontWeight: 'bold' }}>Ver Meus Atendimentos</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'Vereador' && (
          <View style={{ marginTop: 20, alignItems: 'center', padding: 20 }}>
            <Text style={{ color: '#888' }}>Funcionalidade em desenvolvimento.</Text>
          </View>
        )}
      </Card>
    </Container>
  );
}
