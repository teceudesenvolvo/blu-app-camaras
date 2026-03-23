import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { getDatabase, ref, set, onValue, serverTimestamp } from 'firebase/database';
import app from '../../services/firebaseConfig';
import { AuthContext } from '../context/AuthContext';

const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';
const db = getDatabase(app);

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
    const { user } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;

        const contactRef = ref(db, `${flavorId}/users/${user.uid}/contatoConfianca`);
        const unsubscribe = onValue(contactRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setEmail(data.email || '');
                setPhone(data.phone || '');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleSave = async () => {
        if (!email && !phone) {
            Alert.alert('Erro', 'Preencha pelo menos um meio de contato (E-mail ou Telefone).');
            return;
        }

        setSaving(true);
        try {
            const contactRef = ref(db, `${flavorId}/users/${user.uid}/contatoConfianca`);
            await set(contactRef, {
                email,
                phone,
                updatedAt: serverTimestamp()
            });
            Alert.alert('Sucesso', 'Contato de confiança salvo com sucesso!');
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível salvar o contato.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#a21caf" />
            </View>
        );
    }

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
                            Este contato receberá um alerta via E-mail e Notificação Push quando você acionar o Botão do Pânico.
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

                        <SaveButton activeOpacity={0.8} onPress={handleSave} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <SaveButtonText>Salvar Contato</SaveButtonText>
                            )}
                        </SaveButton>
                    </Card>
                </Content>
            </Container>
        </KeyboardAvoidingView>
    );
}
