import { chamberLogo } from '../config/branding';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
} from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { AuthContext } from '../context/AuthContext';
import { useSystemControl } from '../context/SystemControlContext';
import { formatCep, formatCpf, formatPhone, isValidCpf, onlyDigits } from '../utils/brasilForms';

const Screen = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.portal.page};
  position: relative;
`;

const Hero = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300px;
  background-color: ${({ theme }) => theme.portal.primary};
  align-items: center;
  justify-content: flex-end;
  padding: 54px 24px 68px;
  border-bottom-left-radius: 32px;
  border-bottom-right-radius: 32px;
  z-index: 1;
`;

const BackButton = styled.TouchableOpacity`
  position: absolute;
  left: 18px;
  top: 56px;
  width: 42px;
  height: 42px;
  border-radius: 21px;
  background-color: rgba(255, 255, 255, 0.16);
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.35);
  align-items: center;
  justify-content: center;
  z-index: 10;
  elevation: 10;
`;

const BrandImage = styled.Image`
  width: 128px;
  height: 128px;
`;

const Content = styled.View`
  margin: -28px 0 0;
  padding: 26px 20px 34px;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  background-color: ${({ theme }) => theme.portal.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  z-index: 3;
  elevation: 3;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 30px;
  line-height: 36px;
  font-weight: 900;
  text-align: left;
`;

const Subtitle = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 15px;
  line-height: 22px;
  font-weight: 700;
  text-align: left;
  margin-top: 8px;
  margin-bottom: 26px;
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

const SelectPlaceholder = styled.TouchableOpacity`
  min-height: 54px;
  border-radius: 14px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  background-color: ${({ theme }) => theme.portal.page};
  padding: 0 15px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const SelectText = styled.Text`
  color: ${({ selected, theme }) => selected ? theme.portal.text : theme.portal.subtle};
  font-size: 16px;
`;

const PrimaryButton = styled.TouchableOpacity`
  min-height: 54px;
  border-radius: 14px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
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

const LoginContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 24px;
`;

const LoginText = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 14px;
  font-weight: 700;
`;

const LoginLink = styled.TouchableOpacity`
  margin-left: 5px;
`;

const LoginLinkText = styled.Text`
  color: ${({ theme }) => theme.portal.primary};
  font-weight: 900;
  font-size: 14px;
`;

const ModalOverlay = styled.TouchableOpacity`
  flex: 1;
  background-color: rgba(15, 23, 42, 0.45);
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const ModalContent = styled.View`
  width: 100%;
  border-radius: 18px;
  background-color: ${({ theme }) => theme.portal.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  padding: 10px;
`;

const ModalTitle = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 17px;
  font-weight: 900;
  padding: 10px 12px 4px;
`;

const ModalItem = styled.TouchableOpacity`
  padding: 15px 12px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.portal.border};
`;

export default function CadastroScreen({ navigation }) {
  const theme = useTheme();
  const { settings } = useSystemControl();
  const [nome, setNome] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confSenha, setConfSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfSenha, setShowConfSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalSexoVisible, setModalSexoVisible] = useState(false);

  const { register } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!nome || !email || !senha || !telefone || !cpf || !cep) {
      Alert.alert('Atenção', 'Preencha nome, CPF, telefone, CEP, email e senha.');
      return;
    }
    if (!isValidCpf(cpf)) {
      Alert.alert('Atenção', 'Informe um CPF válido.');
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
        nome,
        sexo,
        phone: onlyDigits(telefone),
        cpf: onlyDigits(cpf),
        cep: onlyDigits(cep),
        cadastroCompleto: false,
      });
      setTimeout(() => {
        navigation.navigate('PerfilDadosPessoais', {
          completeRegistration: true,
          startEditing: true,
        });
      }, 350);
    } catch (error) {
      Alert.alert('Erro no Cadastro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = ({ label, value, onChangeText, visible, setVisible, placeholder }) => (
    <FieldBlock>
      <Label>{label}</Label>
      <InputShell>
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.portal.subtle}
          secureTextEntry={!visible}
          style={{ paddingRight: 50 }}
        />
        <EyeButton onPress={() => setVisible(!visible)}>
          <Ionicons name={visible ? 'eye-off' : 'eye'} size={22} color={theme.portal.muted} />
        </EyeButton>
      </InputShell>
    </FieldBlock>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <Screen>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </BackButton>
        <Hero>
          <BrandImage
            source={settings?.branding?.loginCoverUrl
              ? { uri: settings.branding.loginCoverUrl }
              : settings?.branding?.logoUrl
                ? { uri: settings.branding.logoUrl }
                : chamberLogo}
            resizeMode="contain"
          />
        </Hero>
        <ScrollView
          style={{ zIndex: 2 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingTop: 272 }}
        >
          <Content>
            <Title>Criar conta</Title>
            <Subtitle>Faça seu cadastro para acompanhar solicitações e acessar os serviços digitais.</Subtitle>

            <FieldBlock>
              <Label>Nome</Label>
              <Input value={nome} onChangeText={setNome} placeholder="Nome Sobrenome" placeholderTextColor={theme.portal.subtle} />
            </FieldBlock>

            <FieldBlock>
              <Label>Sexo</Label>
              <SelectPlaceholder onPress={() => setModalSexoVisible(true)}>
                <SelectText selected={Boolean(sexo)}>{sexo || 'Selecione seu sexo'}</SelectText>
                <Ionicons name="chevron-down" size={20} color={theme.portal.muted} />
              </SelectPlaceholder>
            </FieldBlock>

            <FieldBlock>
              <Label>Telefone</Label>
              <Input
                value={telefone}
                onChangeText={value => setTelefone(formatPhone(value))}
                placeholder="(XX) X XXXX-XXXX"
                placeholderTextColor={theme.portal.subtle}
                keyboardType="phone-pad"
              />
            </FieldBlock>

            <FieldBlock>
              <Label>CPF</Label>
              <Input
                value={cpf}
                onChangeText={value => setCpf(formatCpf(value))}
                placeholder="000.000.000-00"
                placeholderTextColor={theme.portal.subtle}
                keyboardType="number-pad"
              />
            </FieldBlock>

            <FieldBlock>
              <Label>CEP</Label>
              <Input
                value={cep}
                onChangeText={value => setCep(formatCep(value))}
                placeholder="00000-000"
                placeholderTextColor={theme.portal.subtle}
                keyboardType="number-pad"
              />
            </FieldBlock>

            <FieldBlock>
              <Label>Email</Label>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="email@dominio.com"
                placeholderTextColor={theme.portal.subtle}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </FieldBlock>

            {renderPasswordField({
              label: 'Senha',
              value: senha,
              onChangeText: setSenha,
              visible: showSenha,
              setVisible: setShowSenha,
              placeholder: 'Mín. 6 caracteres',
            })}

            {renderPasswordField({
              label: 'Confirmar senha',
              value: confSenha,
              onChangeText: setConfSenha,
              visible: showConfSenha,
              setVisible: setShowConfSenha,
              placeholder: 'Repita a senha',
            })}

            <PrimaryButton activeOpacity={0.86} onPress={handleRegister} disabled={loading}>
              <PrimaryGradient>
                {loading ? <ActivityIndicator color="#fff" /> : <PrimaryButtonText>Cadastrar</PrimaryButtonText>}
              </PrimaryGradient>
            </PrimaryButton>

            <LoginContainer>
              <LoginText>Já possui uma conta?</LoginText>
              <LoginLink onPress={() => navigation.goBack()}>
                <LoginLinkText>Entrar</LoginLinkText>
              </LoginLink>
            </LoginContainer>
          </Content>
        </ScrollView>

        <Modal visible={modalSexoVisible} transparent animationType="fade">
          <ModalOverlay activeOpacity={1} onPress={() => setModalSexoVisible(false)}>
            <ModalContent>
              <ModalTitle>Selecione seu sexo</ModalTitle>
              {['Feminino', 'Masculino', 'Outro'].map((option) => (
                <ModalItem
                  key={option}
                  onPress={() => {
                    setSexo(option);
                    setModalSexoVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: theme.portal.text }}>{option}</Text>
                </ModalItem>
              ))}
            </ModalContent>
          </ModalOverlay>
        </Modal>
      </Screen>
    </KeyboardAvoidingView>
  );
}
