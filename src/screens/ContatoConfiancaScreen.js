import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const Container = styled.View`
  flex: 1;
  background-color: #fcf4f8;
`;

const Header = styled.View`
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

const Content = styled.View`
  padding: 20px;
`;

const Card = styled.View`
  background-color: #fff;
  border-radius: 20px;
  padding: 25px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.05;
  shadow-radius: 10px;
  elevation: 3;
`;

const InfoText = styled.Text`
  font-size: 14px;
  color: #666;
  text-align: center;
  line-height: 20px;
  margin-bottom: 25px;
`;

const Label = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
`;

const Input = styled.TextInput`
  background-color: #f5f5f5;
  border-radius: 10px;
  padding: 15px;
  font-size: 16px;
  color: #333;
  margin-bottom: 20px;
`;

const SaveButton = styled.TouchableOpacity`
  background-color: #a21caf;
  border-radius: 12px;
  padding: 18px;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
`;

const SaveButtonText = styled.Text`
  color: #fff;
  font-size: 16px;
  font-weight: bold;
`;

export default function ContatoConfiancaScreen({ navigation }) {
    const [email, setEmail] = useState('leo@teste.com');
    const [phone, setPhone] = useState('8599998733');

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <Container>
                <Header>
                    <BackButton onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </BackButton>
                    <HeaderTitle>Contato de Confiança</HeaderTitle>
                </Header>

                <Content>
                    <Card>
                        <InfoText>
                            Este contato receberá um alerta quando você acionar o Botão do Pânico.
                        </InfoText>

                        <Label>E-mail do Contato</Label>
                        <Input
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Digite o e-mail"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Label>Telefone do Contato</Label>
                        <Input
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Digite o telefone"
                            keyboardType="phone-pad"
                        />

                        <SaveButton activeOpacity={0.8} onPress={() => navigation.goBack()}>
                            <SaveButtonText>Salvar Contato</SaveButtonText>
                        </SaveButton>
                    </Card>
                </Content>
            </Container>
        </KeyboardAvoidingView>
    );
}
