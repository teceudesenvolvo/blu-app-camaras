import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { AuthContext } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const Screen = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.portal.card};
`;

const Hero = styled.View`
  min-height: 238px;
  background-color: ${({ theme }) => theme.mode === 'dark' ? theme.portal.pageAlt : '#eef2f6'};
  align-items: center;
  justify-content: center;
  border-bottom-left-radius: 34px;
  border-bottom-right-radius: 34px;
  padding-top: 34px;
`;

const Content = styled.View`
  flex: 1;
  padding: 28px 24px 28px;
`;

const BrandImage = styled.Image`
  width: 108px;
  height: 108px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 26px;
  line-height: 32px;
  font-weight: 900;
  text-align: center;
`;

const Subtitle = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 15px;
  line-height: 22px;
  font-weight: 700;
  margin-top: 8px;
  margin-bottom: 34px;
  text-align: center;
`;

const FieldBlock = styled.View`
  margin-bottom: 14px;
`;

const Label = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 13px;
  font-weight: 900;
  margin-bottom: 8px;
`;

const InputShell = styled.View`
  position: relative;
`;

const Input = styled.TextInput`
  min-height: 54px;
  border-radius: 14px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  background-color: ${({ theme }) => theme.portal.page};
  padding: 0 15px;
  color: ${({ theme }) => theme.portal.text};
  font-size: 16px;
`;

const EyeButton = styled.TouchableOpacity`
  position: absolute;
  right: 14px;
  top: 16px;
`;

const ForgotPassword = styled.TouchableOpacity`
  align-self: flex-end;
  margin: 2px 0 22px;
`;

const ForgotPasswordText = styled.Text`
  color: ${({ theme }) => theme.portal.primary};
  font-size: 13px;
  font-weight: 900;
`;

const PrimaryButton = styled.TouchableOpacity`
  min-height: 54px;
  border-radius: 14px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.disabled ? 0.72 : 1};
`;

const PrimaryGradient = styled(LinearGradient).attrs(({ theme }) => ({
  colors: theme.gradients.primary,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
}))`
  width: 100%;
  min-height: 54px;
  align-items: center;
  justify-content: center;
`;

const PrimaryButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
`;

const SignupContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 24px;
`;

const SignupText = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 14px;
  font-weight: 700;
`;

const SignupLink = styled.TouchableOpacity`
  margin-left: 5px;
`;

const SignupLinkText = styled.Text`
  color: ${({ theme }) => theme.portal.primary};
  font-weight: 900;
  font-size: 14px;
`;

const FooterText = styled.Text`
  color: ${({ theme }) => theme.portal.subtle};
  font-size: 12px;
  text-align: center;
  margin-top: 34px;
`;

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
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
    } catch (_error) {
      Alert.alert('Erro de Login', 'E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('E-mail necessário', 'Digite seu e-mail para receber o link de redefinição.');
      return;
    }

    try {
      await resetPassword(email);
      Alert.alert('Sucesso', 'Enviamos um link de redefinição para o seu e-mail.');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível enviar o e-mail de redefinição.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          <Hero>
            <BrandImage source={require('../../assets/logo-camara-paraipaba.png')} resizeMode="contain" />
          </Hero>
          <Content>
            <Title>Entrar</Title>
            <Subtitle>Acesse seus serviços, acompanhe solicitações e mensagens da Câmara.</Subtitle>

            <FieldBlock>
              <Label>E-mail</Label>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="email@dominio.com"
                placeholderTextColor={theme.portal.subtle}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </FieldBlock>

            <FieldBlock>
              <Label>Senha</Label>
              <InputShell>
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Senha"
                  placeholderTextColor={theme.portal.subtle}
                  secureTextEntry={!showPassword}
                  style={{ paddingRight: 50 }}
                />
                <EyeButton onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={theme.portal.muted} />
                </EyeButton>
              </InputShell>
            </FieldBlock>

            <ForgotPassword onPress={handleForgotPassword}>
              <ForgotPasswordText>Esqueceu a senha?</ForgotPasswordText>
            </ForgotPassword>

            <PrimaryButton activeOpacity={0.86} onPress={handleLogin} disabled={loading}>
              <PrimaryGradient>
                {loading ? <ActivityIndicator color="#ffffff" /> : <PrimaryButtonText>Continuar</PrimaryButtonText>}
              </PrimaryGradient>
            </PrimaryButton>

            <SignupContainer>
              <SignupText>Não possui uma conta?</SignupText>
              <SignupLink onPress={() => navigation.navigate('Cadastro')}>
                <SignupLinkText>Cadastre-se</SignupLinkText>
              </SignupLink>
            </SignupContainer>

            <FooterText>Desenvolvido por Blu Tecnologias</FooterText>
          </Content>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}
