import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
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
  background-color: ${({ theme }) => theme.portal.card};
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

const FormContainer = styled.View`
  background-color: ${({ theme }) => theme.portal.card};
  border-radius: 12px;
  padding: 20px;
  margin: 15px 20px 40px 20px;
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

const ServiceInfoCard = styled.View`
  background-color: #eef2ff;
  padding: 15px;
  border-radius: 8px;
  border-left-width: 4px;
  border-left-color: ${primaryColor};
  margin-bottom: 20px;
`;

const ServiceInfoTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${primaryColor};
  margin-bottom: 5px;
`;

const ServiceInfoSub = styled.Text`
  font-size: 12px;
  color: #666;
`;

const InputGroup = styled.View`
  margin-bottom: 15px;
`;

const Label = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: #444;
  margin-bottom: 8px;
`;

const Input = styled.TextInput`
  background-color: #f5f6fa;
  border-radius: 8px;
  padding: 12px 15px;
  font-size: 14px;
  color: #333;
  border-width: 1px;
  border-color: #eee;
`;

const SelectPlaceholder = styled.TouchableOpacity`
  background-color: #f5f6fa;
  border-radius: 8px;
  padding: 12px 15px;
  border-width: 1px;
  border-color: #eee;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const SelectText = styled.Text`
  font-size: 14px;
  color: #888;
`;

const ConfirmButton = styled.TouchableOpacity`
  background-color: ${primaryColor};
  padding: 15px;
  border-radius: 8px;
  align-items: center;
  margin-top: 10px;
`;

const ConfirmText = styled.Text`
  color: #fff;
  font-weight: 600;
  font-size: 16px;
`;

const ReturnButton = styled.TouchableOpacity`
  padding: 15px;
  align-items: center;
  margin-top: 5px;
`;

const ReturnText = styled.Text`
  color: ${secondaryColor};
  font-weight: 500;
  font-size: 14px;
`;

export default function AtendimentoJuridicoScreen({ navigation }) {
    return (
        <Container showsVerticalScrollIndicator={false}>
            <HeaderContainer>
                <BackButton onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </BackButton>
                <HeaderTitle>Serviços</HeaderTitle>
            </HeaderContainer>

            <FormContainer>
                <StepText>2. Detalhes da Solicitação</StepText>

                <ServiceInfoCard>
                    <ServiceInfoTitle>Serviço Selecionado:{"\n"}Atendimento Jurídico</ServiceInfoTitle>
                    <ServiceInfoSub>Tipo: Serviço Público</ServiceInfoSub>
                </ServiceInfoCard>

                <InputGroup>
                    <Label>Sobre o acontecimento</Label>
                    <Input placeholder="" />
                </InputGroup>

                <InputGroup>
                    <Label>Data do Acontecimento</Label>
                    <Input placeholder="DD/MM/AAAA" />
                </InputGroup>

                <InputGroup>
                    <Label>CEP do local</Label>
                    <Input placeholder="" keyboardType="numeric" />
                </InputGroup>

                <InputGroup>
                    <Label>Endereço</Label>
                    <Input placeholder="" />
                </InputGroup>

                <InputGroup>
                    <Label>Número</Label>
                    <Input placeholder="" keyboardType="numeric" />
                </InputGroup>

                <InputGroup>
                    <Label>Bairro</Label>
                    <Input placeholder="" />
                </InputGroup>

                <InputGroup>
                    <Label>Cidade</Label>
                    <Input placeholder="" />
                </InputGroup>

                <InputGroup>
                    <Label>Assunto</Label>
                    <SelectPlaceholder>
                        <SelectText>Selecione...</SelectText>
                        <Ionicons name="chevron-down" size={16} color="#888" />
                    </SelectPlaceholder>
                </InputGroup>

                <InputGroup>
                    <Label>Descreva seu caso</Label>
                    <Input
                        placeholder=""
                        multiline
                        textAlignVertical="top"
                        style={{ height: 100 }}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Nome (do seu perfil)</Label>
                    <Input value="Leonardo Luiz" editable={false} style={{ color: '#888' }} />
                </InputGroup>

                <InputGroup>
                    <Label>Telefone / WhatsApp (do seu perfil)</Label>
                    <Input value="85999991213" editable={false} style={{ color: '#888' }} />
                </InputGroup>

                <ConfirmButton onPress={() => alert('Solicitação enviada!')}>
                    <ConfirmText>Confirmar Solicitação</ConfirmText>
                </ConfirmButton>

                <ReturnButton onPress={() => navigation.goBack()}>
                    <ReturnText>← Voltar para a Seleção</ReturnText>
                </ReturnButton>
            </FormContainer>
        </Container>
    );
}
