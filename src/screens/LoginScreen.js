import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';
import styled from 'styled-components/native';
import { AuthContext } from '../context/AuthContext';

const primaryColor = '#e7e7e7';
const secondaryColor = Constants.expoConfig?.extra?.theme?.secondary || '#f9c204';

const Container = styled.View`
  flex: 1;
  background-color: ${primaryColor};
`;

const TopSection = styled.View`
  flex: 0.45;
  justify-content: center;
  align-items: center;
  padding-top: 40px;
`;

const FormSection = styled.View`
  flex: 0.55;
  background-color: #fff;
  border-top-left-radius: 40px;
  border-top-right-radius: 40px;
  padding: 40px 30px;
`;

const Label = styled.Text`
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 500;
`;

const Input = styled.TextInput`
  background-color: #f5f5f5;
  border-radius: 12px;
  padding: 15px;
  font-size: 16px;
  margin-bottom: 20px;
  color: #333;
`;

const ForgotPassword = styled.TouchableOpacity`
  align-self: flex-end;
  margin-bottom: 30px;
`;

const ForgotPasswordText = styled.Text`
  color: ${secondaryColor};
  font-size: 14px;
  text-decoration-line: underline;
`;

const LoginButton = styled.TouchableOpacity`
  background-color: ${secondaryColor};
  border-radius: 12px;
  padding: 18px;
  align-items: center;
  margin-bottom: 25px;
  shadow-color: ${secondaryColor};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 5px;
  elevation: 5;
`;

const LoginButtonText = styled.Text`
  color: #fff;
  font-size: 18px;
  font-weight: 800;
`;

const SignupContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
`;

const SignupText = styled.Text`
  color: #666;
  font-size: 14px;
`;

const SignupLink = styled.TouchableOpacity`
  margin-left: 5px;
`;

const SignupLinkText = styled.Text`
  color: ${secondaryColor};
  font-weight: bold;
  font-size: 14px;
`;

const FooterText = styled.Text`
  color: #ccc;
  font-size: 12px;
  text-align: center;
  margin-top: 40px;
`;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, resetPassword } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert('Erro de Login', 'E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('E-mail necessário', 'Por favor, insira seu e-mail para receber o link de redefinição.');
      return;
    }

    try {
      await resetPassword(email);
      Alert.alert('Sucesso', 'Um link de redefinição de senha foi enviado para o seu e-mail.');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível enviar o e-mail de redefinição. Verifique o endereço digitado.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <Container>
        <TopSection>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 320, height: 220, resizeMode: 'contain' }}
          />
        </TopSection>

        <FormSection>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Label>E-mail</Label>
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
                value={password}
                onChangeText={setPassword}
                placeholder="Senha"
                secureTextEntry={!showPassword}
                style={{ paddingRight: 50 }}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 15, top: 15 }}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <ForgotPassword onPress={handleForgotPassword}>
              <ForgotPasswordText>Esqueceu a senha?</ForgotPasswordText>
            </ForgotPassword>

            <LoginButton activeOpacity={0.8} onPress={handleLogin}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <LoginButtonText>Entrar</LoginButtonText>
              )}
            </LoginButton>

            <SignupContainer>
              <SignupText>Não possui uma conta?</SignupText>
              <SignupLink onPress={() => navigation.navigate('Cadastro')}>
                <SignupLinkText>Cadastre-se</SignupLinkText>
              </SignupLink>
            </SignupContainer>

            <FooterText>Desenvolvido por Blu Tecnologias</FooterText>
          </ScrollView>
        </FormSection>
      </Container>
    </KeyboardAvoidingView>
  );
}
