import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
    StyleSheet
} from 'react-native';
import styled from 'styled-components/native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const primaryColor = '#e7e7e7';
const secondaryColor = Constants.expoConfig?.extra?.theme?.secondary || '#f9c204';

const Container = styled.View`
  flex: 1;
  background-color: ${primaryColor};
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 50px 20px 20px 20px;
`;

const BackButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
`;

const BackText = styled.Text`
  color: #000;
  font-size: 16px;
  margin-left: 5px;
`;

const TopSection = styled.View`
  align-items: center;
  padding-bottom: 30px;
`;

const FormSection = styled.View`
  flex: 1;
  background-color: #fff;
  border-top-left-radius: 40px;
  border-top-right-radius: 40px;
  padding: 40px 30px;
`;

const Label = styled.Text`
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 700;
`;

const Input = styled.TextInput`
  background-color: #f5f5f5;
  border-radius: 12px;
  padding: 15px;
  font-size: 16px;
  margin-bottom: 20px;
  color: #333;
`;

const NextButton = styled.TouchableOpacity`
  background-color: ${secondaryColor};
  border-radius: 12px;
  padding: 18px;
  align-items: center;
  margin-top: 20px;
  margin-bottom: 20px;
  shadow-color: ${secondaryColor};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 5px;
  elevation: 5;
`;

const NextButtonText = styled.Text`
  color: #fff;
  font-size: 18px;
  font-weight: 800;
`;

export default function CadastroScreen({ navigation }) {
    const [nome, setNome] = useState('');
    const [sexo, setSexo] = useState('');
    const [telefone, setTelefone] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confSenha, setConfSenha] = useState('');
    const [showSenha, setShowSenha] = useState(false);
    const [showConfSenha, setShowConfSenha] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register } = useContext(AuthContext);

    const handleRegister = async () => {
        if (!nome || !email || !senha || !telefone) {
            Alert.alert('Erro', 'Por favor, preencha os campos obrigatórios.');
            return;
        }
        if (senha !== confSenha) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return;
        }

        setLoading(true);
        try {
            await register(email, senha, {
                name: nome,
                sexo,
                phone: telefone,
            });
            Alert.alert('Sucesso', 'Bem-vindo ao Blue App!');
        } catch (error) {
            Alert.alert('Erro no Cadastro', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <Container>
                <Header>
                    <BackButton onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                        <BackText>Voltar</BackText>
                    </BackButton>
                </Header>

                <TopSection>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={{ width: 280, height: 150, resizeMode: 'contain' }}
                    />
                </TopSection>

                <FormSection>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Label>Nome</Label>
                        <Input
                            value={nome}
                            onChangeText={setNome}
                            placeholder="Nome Sobrenome"
                        />

                        <Label>Sexo</Label>
                        <Input
                            value={sexo}
                            onChangeText={setSexo}
                            placeholder="Selecione seu sexo"
                        />

                        <Label>Telefone</Label>
                        <Input
                            value={telefone}
                            onChangeText={setTelefone}
                            placeholder="(XX) X XXXX-XXXX"
                            keyboardType="phone-pad"
                        />

                        <Label>Email</Label>
                        <Input
                            value={email}
                            onChangeText={setEmail}
                            placeholder="email@dominio.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Label>Senha</Label>
                        <View style={{ position: 'relative' }}>
                            <Input
                                value={senha}
                                onChangeText={setSenha}
                                placeholder="Mín. 6 caracteres"
                                secureTextEntry={!showSenha}
                                style={{ paddingRight: 50 }}
                            />
                            <TouchableOpacity 
                                style={{ position: 'absolute', right: 15, top: 15 }}
                                onPress={() => setShowSenha(!showSenha)}
                            >
                                <Ionicons name={showSenha ? "eye-off" : "eye"} size={22} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <Label>Conf. Senha</Label>
                        <View style={{ position: 'relative' }}>
                            <Input
                                value={confSenha}
                                onChangeText={setConfSenha}
                                placeholder="Repita a senha"
                                secureTextEntry={!showConfSenha}
                                style={{ paddingRight: 50 }}
                            />
                            <TouchableOpacity 
                                style={{ position: 'absolute', right: 15, top: 15 }}
                                onPress={() => setShowConfSenha(!showConfSenha)}
                            >
                                <Ionicons name={showConfSenha ? "eye-off" : "eye"} size={22} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <NextButton activeOpacity={0.8} onPress={handleRegister}>
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <NextButtonText>Próximo</NextButtonText>
                            )}
                        </NextButton>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </FormSection>
            </Container>
        </KeyboardAvoidingView>
    );
}
