import { chamberLogo } from '../config/branding';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useContext, useState } from 'react';
import {
  ActivityIndicator,
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

const FieldError = styled.Text`
  color: #b42318;
  font-size: 12px;
  line-height: 17px;
  font-weight: 700;
  margin-top: 6px;
`;

const FormError = styled.View`
  border-width: 1px;
  border-color: #fda29b;
  border-radius: 12px;
  background-color: #fff1f0;
  padding: 12px 14px;
  margin-top: 12px;
`;

const FormErrorText = styled.Text`
  color: #912018;
  font-size: 13px;
  line-height: 19px;
  font-weight: 700;
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const { register } = useContext(AuthContext);

  const updateField = (setter, field) => value => {
    setter(value);
    setFieldErrors(current => ({ ...current, [field]: '' }));
    setSubmitError('');
  };

  const authErrorMessage = error => {
    const rawCode = error?.code || error?.message?.match(/(?:auth|functions)\/[a-z-]+/)?.[0];
    switch (rawCode) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já possui uma conta. Entre com ele ou use “Esqueci minha senha”.';
      case 'auth/invalid-email':
        return 'Informe um endereço de e-mail válido.';
      case 'auth/weak-password':
        return 'Escolha uma senha com pelo menos 6 caracteres.';
      case 'auth/missing-password':
        return 'Informe uma senha para continuar.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Não foi possível validar esses dados. Confira o e-mail e a senha ou tente recuperar sua senha.';
      case 'auth/network-request-failed':
        return 'Sem conexão com o serviço de cadastro. Verifique sua internet e tente novamente. Se esta conta já tiver sido criada, entre em vez de cadastrar de novo.';
      case 'auth/too-many-requests':
        return 'Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente.';
      case 'auth/operation-not-allowed':
        return 'O cadastro por e-mail está indisponível no momento. Tente novamente mais tarde ou fale com o suporte.';
      case 'functions/already-exists':
      case 'already-exists':
        return 'Já existe um cadastro com esses dados. Entre na sua conta ou fale com o suporte para verificar seu acesso.';
      default:
        return 'Não foi possível concluir o cadastro. Confira os dados e sua conexão; se o problema continuar, fale com o suporte da Câmara.';
    }
  };

  const handleRegister = async () => {
    const nextErrors = {};
    if (!nome.trim()) nextErrors.nome = 'Informe seu nome.';
    if (!telefone.trim()) nextErrors.telefone = 'Informe seu telefone.';
    if (!cpf.trim()) nextErrors.cpf = 'Informe seu CPF.';
    if (!cep.trim()) nextErrors.cep = 'Informe seu CEP.';
    if (!email.trim()) nextErrors.email = 'Informe seu e-mail.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Informe um endereço de e-mail válido.';
    if (!senha) nextErrors.senha = 'Informe uma senha.';
    else if (senha.length < 6) nextErrors.senha = 'Use uma senha com pelo menos 6 caracteres.';
    if (!confSenha) nextErrors.confSenha = 'Confirme sua senha.';
    if (!isValidCpf(cpf)) {
      if (cpf.trim()) nextErrors.cpf = 'Informe um CPF válido.';
    }
    if (senha && confSenha && senha !== confSenha) nextErrors.confSenha = 'As senhas não coincidem.';
    setFieldErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length) {
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), senha, {
        name: nome.trim(),
        nome: nome.trim(),
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
      console.warn('Falha no cadastro:', error?.code || error?.message || 'erro desconhecido');
      setSubmitError(authErrorMessage(error));
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
              <Input value={nome} onChangeText={updateField(setNome, 'nome')} placeholder="Nome Sobrenome" placeholderTextColor={theme.portal.subtle} />
              {fieldErrors.nome ? <FieldError>{fieldErrors.nome}</FieldError> : null}
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
                onChangeText={value => updateField(setTelefone, 'telefone')(formatPhone(value))}
                placeholder="(XX) X XXXX-XXXX"
                placeholderTextColor={theme.portal.subtle}
                keyboardType="phone-pad"
              />
              {fieldErrors.telefone ? <FieldError>{fieldErrors.telefone}</FieldError> : null}
            </FieldBlock>

            <FieldBlock>
              <Label>CPF</Label>
              <Input
                value={cpf}
                onChangeText={value => updateField(setCpf, 'cpf')(formatCpf(value))}
                placeholder="000.000.000-00"
                placeholderTextColor={theme.portal.subtle}
                keyboardType="number-pad"
              />
              {fieldErrors.cpf ? <FieldError>{fieldErrors.cpf}</FieldError> : null}
            </FieldBlock>

            <FieldBlock>
              <Label>CEP</Label>
              <Input
                value={cep}
                onChangeText={value => updateField(setCep, 'cep')(formatCep(value))}
                placeholder="00000-000"
                placeholderTextColor={theme.portal.subtle}
                keyboardType="number-pad"
              />
              {fieldErrors.cep ? <FieldError>{fieldErrors.cep}</FieldError> : null}
            </FieldBlock>

            <FieldBlock>
              <Label>Email</Label>
              <Input
                value={email}
                onChangeText={updateField(setEmail, 'email')}
                placeholder="email@dominio.com"
                placeholderTextColor={theme.portal.subtle}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {fieldErrors.email ? <FieldError>{fieldErrors.email}</FieldError> : null}
            </FieldBlock>

            {renderPasswordField({
              label: 'Senha',
              value: senha,
              onChangeText: updateField(setSenha, 'senha'),
              visible: showSenha,
              setVisible: setShowSenha,
              placeholder: 'Mín. 6 caracteres',
            })}
            {fieldErrors.senha ? <FieldError style={{ marginTop: -8, marginBottom: 12 }}>{fieldErrors.senha}</FieldError> : null}

            {renderPasswordField({
              label: 'Confirmar senha',
              value: confSenha,
              onChangeText: updateField(setConfSenha, 'confSenha'),
              visible: showConfSenha,
              setVisible: setShowConfSenha,
              placeholder: 'Repita a senha',
            })}
            {fieldErrors.confSenha ? <FieldError style={{ marginTop: -8, marginBottom: 12 }}>{fieldErrors.confSenha}</FieldError> : null}

            <PrimaryButton activeOpacity={0.86} onPress={handleRegister} disabled={loading}>
              <PrimaryGradient>
                {loading ? <ActivityIndicator color="#fff" /> : <PrimaryButtonText>Cadastrar</PrimaryButtonText>}
              </PrimaryGradient>
            </PrimaryButton>
            {submitError ? <FormError accessibilityRole="alert"><FormErrorText>{submitError}</FormErrorText></FormError> : null}

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
