import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Text } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { uploadProfileImageToStorage } from '../../services/storageService';
import {
  PortalBackground,
  PortalCard,
  PortalInput,
  PortalScreenHeader,
} from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';
import { portalTheme } from '../styles/portalTheme';
import { fetchAddressByCep, formatCep, formatCpf, formatPhone, isValidCpf, onlyDigits } from '../utils/brasilForms';

const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Scroll = styled.ScrollView`
  flex: 1;
`;

const Content = styled.View`
  padding: 18px 18px 120px;
`;

const CompletionNotice = styled.View`
  flex-direction: row;
  align-items: flex-start;
  padding: 14px;
  border-radius: 14px;
  background-color: rgba(249, 192, 4, 0.16);
  border-width: 1px;
  border-color: rgba(249, 192, 4, 0.34);
  margin-bottom: 14px;
`;

const NoticeTextGroup = styled.View`
  flex: 1;
  margin-left: 10px;
`;

const NoticeTitle = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 14px;
  font-weight: 900;
`;

const NoticeText = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 13px;
  line-height: 18px;
  font-weight: 700;
  margin-top: 3px;
`;

const AvatarRow = styled.View`
  align-items: center;
  margin-bottom: 18px;
`;

const AvatarButton = styled.TouchableOpacity`
  width: 106px;
  height: 106px;
  border-radius: 53px;
  background-color: ${({ theme }) => theme.portal.card};
  border-width: 3px;
  border-color: ${({ theme }) => theme.portal.border};
  align-items: center;
  justify-content: center;
`;

const AvatarImage = styled.Image`
  width: 94px;
  height: 94px;
  border-radius: 47px;
`;

const AvatarPlaceholder = styled.View`
  width: 94px;
  height: 94px;
  border-radius: 47px;
  background-color: #e5e7eb;
  align-items: center;
  justify-content: center;
`;

const CameraBadge = styled.View`
  position: absolute;
  right: 0;
  bottom: 2px;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${({ theme }) => theme.portal.secondary};
  align-items: center;
  justify-content: center;
  border-width: 2px;
  border-color: ${({ theme }) => theme.portal.card};
`;

const Field = styled.View`
  margin-bottom: 14px;
`;

const Label = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 13px;
  font-weight: 900;
  margin-bottom: 7px;
`;

const ActionRow = styled.View`
  flex-direction: row;
  margin-bottom: 14px;
`;

const ActionButton = styled.TouchableOpacity`
  flex: 1;
  min-height: 46px;
  border-radius: 14px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  background-color: ${({ danger, theme }) => danger ? (theme.mode === 'dark' ? 'rgba(190, 24, 93, 0.18)' : '#fff1f2') : 'transparent'};
  border-width: ${props => props.danger ? '1px' : '0'};
  border-color: #fecdd3;
  margin-left: ${props => props.second ? '10px' : '0'};
`;

const ActionGradient = styled(LinearGradient).attrs({
  colors: ['#025AA1', '#0077ed'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
})`
  width: 100%;
  min-height: 46px;
  align-items: center;
  justify-content: center;
`;

const ActionText = styled.Text`
  color: ${props => props.danger ? '#dc2626' : '#ffffff'};
  font-size: 14px;
  font-weight: 900;
`;

const SecurityButton = styled.TouchableOpacity`
  min-height: 50px;
  border-radius: 14px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  margin-bottom: 16px;
`;

const SecurityGradient = styled(LinearGradient).attrs(({ theme }) => ({
  colors: theme.mode === 'dark'
    ? ['rgba(56,167,240,0.18)', 'rgba(16,37,54,0.94)', 'rgba(7,19,31,0.92)']
    : ['#e0f2fe', '#dbeafe', '#ffffff'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
}))`
  width: 100%;
  min-height: 50px;
  border-radius: 14px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.primary};
  align-items: center;
  justify-content: center;
  flex-direction: row;
`;

const SecurityText = styled.Text`
  color: ${({ theme }) => theme.portal.primary};
  font-size: 14px;
  font-weight: 900;
  margin-left: 8px;
`;

const SectionTitle = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 16px;
  font-weight: 900;
  margin: 16px 0 12px;
`;

const SelectField = styled.TouchableOpacity`
  min-height: 52px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  background-color: ${({ theme }) => theme.portal.card};
  padding: 0 14px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const SelectText = styled.Text`
  color: ${props => props.selected ? portalTheme.text : portalTheme.subtle};
  font-size: 15px;
  font-weight: 700;
`;

const ModalOverlay = styled.TouchableOpacity`
  flex: 1;
  background-color: rgba(15, 23, 42, 0.45);
  justify-content: center;
  padding: 24px;
`;

const ModalCard = styled.View`
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

const sexOptions = ['Feminino', 'Masculino', 'Outro', 'Prefiro não informar'];
const maritalStatusOptions = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'];

const personalFields = [
  ['name', 'Nome completo', 'Nome completo'],
  ['cpf', 'CPF', '000.000.000-00', 'numeric'],
  ['phone', 'Telefone', '(00) 00000-0000', 'phone-pad'],
];

const addressFields = [
  ['cep', 'CEP', '00000-000', 'numeric'],
  ['address', 'Endereço', 'Rua, Av...'],
  ['numero', 'Número', 'Nº', 'numeric'],
  ['complemento', 'Complemento', 'Apt, Bloco...'],
  ['neighborhood', 'Bairro', 'Bairro'],
  ['city', 'Cidade', 'Cidade'],
  ['state', 'Estado', 'UF'],
];

const getAvatarUri = (form = {}, userData = {}) => {
  const safeForm = form || {};
  const safeUserData = userData || {};

  return safeForm.avatarUri ||
    safeForm.avatarUrl ||
    safeUserData.avatarUrl ||
    safeForm.avatarBase64 ||
    safeUserData.avatarBase64 ||
    null;
};

export default function PerfilDadosPessoaisScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [selectModal, setSelectModal] = useState(null);
  const completionMode = route?.params?.completeRegistration === true || userData?.cadastroCompleto === false;

  useEffect(() => {
    if (!user) return undefined;

    const unsubscribe = onSnapshot(doc(firestore, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserData(data);
        setForm(current => Object.keys(current).length ? current : data);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setForm(prev => ({ ...prev, avatarUri: result.assets[0].uri }));
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const save = async () => {
    if (!user) return;

    if (form.cpf && !isValidCpf(form.cpf)) {
      Alert.alert('CPF inválido', 'Confira o CPF informado antes de salvar.');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = { ...form };

      if (dataToSave.avatarUri && !dataToSave.avatarUri.startsWith('http')) {
        const uploadedAvatar = await uploadProfileImageToStorage(dataToSave.avatarUri, user.uid, flavorId);
        dataToSave.avatarUrl = uploadedAvatar.url;
        dataToSave.avatarPath = uploadedAvatar.path;
        dataToSave.avatarBase64 = uploadedAvatar.url;
        dataToSave.avatarUpdatedAt = serverTimestamp();
      }

      delete dataToSave.avatarUri;

      await updateDoc(doc(firestore, 'users', user.uid), {
        ...dataToSave,
        cadastroCompleto: true,
        googleProfilePending: false,
      });
      Alert.alert('Sucesso', completionMode ? 'Cadastro concluído com sucesso.' : 'Dados pessoais atualizados.');
    } catch (error) {
      console.error('Erro ao salvar dados pessoais:', error);
      Alert.alert('Erro', 'Não foi possível atualizar seus dados.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm(userData || {});
  };

  const handleCpfChange = (text) => {
    setForm(prev => ({ ...prev, cpf: formatCpf(text) }));
  };

  const handleCpfBlur = () => {
    if (form.cpf && onlyDigits(form.cpf).length === 11 && !isValidCpf(form.cpf)) {
      Alert.alert('CPF inválido', 'O CPF informado não passou na validação dos dígitos.');
    }
  };

  const handleCepChange = (text) => {
    setForm(prev => ({ ...prev, cep: formatCep(text) }));
  };

  const handlePhoneChange = (text) => {
    setForm(prev => ({ ...prev, phone: formatPhone(text) }));
  };

  const handleCepBlur = async () => {
    if (onlyDigits(form.cep).length !== 8) return;

    setCepLoading(true);
    try {
      const address = await fetchAddressByCep(form.cep);
      setForm(prev => ({
        ...prev,
        cep: address.cep,
        address: address.address || prev.address,
        neighborhood: address.neighborhood || prev.neighborhood,
        city: address.city || prev.city,
        state: address.state || prev.state,
      }));
    } catch (error) {
      Alert.alert('CEP não encontrado', error.message || 'Não foi possível preencher o endereço.');
    } finally {
      setCepLoading(false);
    }
  };

  const avatarUri = getAvatarUri(form, userData);

  const renderEditableField = ([key, label, placeholder, keyboardType]) => (
    <Field key={key}>
      <Label>{key === 'cep' && cepLoading ? 'CEP - buscando...' : label}</Label>
      <PortalInput
        value={form[key] || ''}
        placeholder={placeholder}
        onChangeText={
          key === 'cpf'
            ? handleCpfChange
            : key === 'cep'
              ? handleCepChange
              : key === 'phone'
                ? handlePhoneChange
                : (text) => setForm({ ...form, [key]: text })
        }
        onBlur={key === 'cpf' ? handleCpfBlur : key === 'cep' ? handleCepBlur : undefined}
        keyboardType={keyboardType}
        maxLength={key === 'state' ? 2 : undefined}
        autoCapitalize={key === 'state' ? 'characters' : 'sentences'}
      />
    </Field>
  );

  const renderSelectField = (key, label, options) => (
    <Field>
      <Label>{label}</Label>
      <SelectField onPress={() => setSelectModal({ key, label, options })}>
        <SelectText selected={Boolean(form[key])}>{form[key] || `Selecione ${label.toLowerCase()}`}</SelectText>
        <Ionicons name="chevron-down" size={20} color={portalTheme.muted} />
      </SelectField>
    </Field>
  );

  return (
    <PortalBackground>
      <PortalScreenHeader
        navigation={navigation}
        title="Dados pessoais"
        subtitle="Atualize suas informações cadastrais e foto de perfil."
      />

      <Scroll showsVerticalScrollIndicator={false}>
        <Content>
          {completionMode ? (
            <CompletionNotice>
              <Ionicons name="information-circle-outline" size={22} color={portalTheme.primary} />
              <NoticeTextGroup>
                <NoticeTitle>Conclua seu cadastro</NoticeTitle>
                <NoticeText>Complete seus dados pessoais para criar solicitações e acompanhar atendimentos no app.</NoticeText>
              </NoticeTextGroup>
            </CompletionNotice>
          ) : null}

          <PortalCard>
            <AvatarRow>
              <AvatarButton activeOpacity={0.75} onPress={pickAvatar}>
                {avatarUri ? (
                  <AvatarImage source={{ uri: avatarUri }} />
                ) : (
                  <AvatarPlaceholder>
                    <Ionicons name="person" size={46} color="#94a3b8" />
                  </AvatarPlaceholder>
                )}
                <CameraBadge>
                  <Ionicons name="camera-outline" size={18} color="#ffffff" />
                </CameraBadge>
              </AvatarButton>
            </AvatarRow>

            <ActionRow>
              <ActionButton onPress={save} disabled={saving}>
                <ActionGradient>
                  {saving ? <ActivityIndicator color="#fff" /> : <ActionText>Salvar</ActionText>}
                </ActionGradient>
              </ActionButton>
              <ActionButton second danger onPress={cancel}>
                <ActionText danger>Cancelar</ActionText>
              </ActionButton>
            </ActionRow>

            <SecurityButton activeOpacity={0.78} onPress={() => navigation.navigate('PerfilSeguranca')}>
              <SecurityGradient>
                <Ionicons name="key-outline" size={19} color={portalTheme.primary} />
                <SecurityText>Alterar senha</SecurityText>
              </SecurityGradient>
            </SecurityButton>

            <SectionTitle>Identificação</SectionTitle>
            {personalFields.map(renderEditableField)}
            {renderSelectField('sexo', 'Sexo', sexOptions)}
            {renderSelectField('estadoCivil', 'Estado civil', maritalStatusOptions)}

            <SectionTitle>Endereço</SectionTitle>
            {addressFields.map(renderEditableField)}
          </PortalCard>
        </Content>
      </Scroll>

      <Modal visible={Boolean(selectModal)} transparent animationType="fade" onRequestClose={() => setSelectModal(null)}>
        <ModalOverlay activeOpacity={1} onPress={() => setSelectModal(null)}>
          <ModalCard>
            <ModalTitle>{selectModal?.label}</ModalTitle>
            {selectModal?.options?.map((option) => (
              <ModalItem
                key={option}
                onPress={() => {
                  setForm(prev => ({ ...prev, [selectModal.key]: option }));
                  setSelectModal(null);
                }}
              >
                <Text style={{ fontSize: 16, color: portalTheme.text }}>{option}</Text>
              </ModalItem>
            ))}
          </ModalCard>
        </ModalOverlay>
      </Modal>
    </PortalBackground>
  );
}
