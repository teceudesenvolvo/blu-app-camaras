import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
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

const AddButton = styled.TouchableOpacity`
  min-height: 52px;
  border-radius: 14px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  margin-bottom: 16px;
`;

const AddButtonGradient = styled(LinearGradient).attrs({
  colors: ['#025AA1', '#0077ed'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
})`
  width: 100%;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  flex-direction: row;
`;

const AddButtonText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
  margin-left: 8px;
`;

const BeneficiaryCard = styled(PortalCard)`
  margin-bottom: 12px;
`;

const EditButton = styled.TouchableOpacity`
  width: 38px;
  height: 38px;
  border-radius: 19px;
  background-color: rgba(2, 90, 161, 0.08);
  align-items: center;
  justify-content: center;
  margin-left: 10px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
`;

const IconBox = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  align-items: center;
  justify-content: center;
  background-color: rgba(2, 90, 161, 0.1);
  margin-right: 12px;
`;

const Info = styled.View`
  flex: 1;
`;

const Name = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 15px;
  font-weight: 900;
`;

const Meta = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 12px;
  font-weight: 700;
  margin-top: 4px;
`;

const EmptyText = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 13px;
  line-height: 19px;
  font-weight: 700;
`;

const ModalBackdrop = styled.View`
  flex: 1;
  background-color: rgba(15,23,42,0.48);
  justify-content: flex-end;
`;

const ModalContent = styled(PortalCard)`
  max-height: 88%;
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;
  padding: 0;
`;

const ModalHeader = styled.View`
  padding: 18px 20px 10px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.portal.border};
`;

const ModalScroll = styled.ScrollView`
  padding: 18px 20px 6px;
`;

const ModalTitle = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 19px;
  font-weight: 900;
`;

const ModalSubtitle = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 13px;
  line-height: 19px;
  font-weight: 700;
  margin-top: 5px;
`;

const Field = styled.View`
  margin-bottom: 12px;
`;

const Label = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 13px;
  font-weight: 900;
  margin-bottom: 7px;
`;

const ModalActions = styled.View`
  flex-direction: row;
  padding: 12px 20px 20px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.portal.border};
  background-color: ${({ theme }) => theme.portal.card};
`;

const ModalButton = styled.TouchableOpacity`
  flex: 1;
  min-height: 48px;
  border-radius: 14px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  background-color: ${({ secondary, theme }) => secondary ? (theme.mode === 'dark' ? 'rgba(190, 24, 93, 0.18)' : '#fff1f2') : 'transparent'};
  border-width: ${props => props.secondary ? '1px' : '0'};
  border-color: #fecdd3;
  margin-left: ${props => props.second ? '10px' : '0'};
`;

const ModalButtonGradient = styled(LinearGradient).attrs({
  colors: ['#025AA1', '#0077ed'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
})`
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
`;

const ModalButtonText = styled.Text`
  color: ${props => props.secondary ? '#dc2626' : '#ffffff'};
  font-size: 14px;
  font-weight: 900;
`;

const AddressChoice = styled.View`
  flex-direction: row;
  gap: 10px;
  margin-bottom: 14px;
`;

const ChoiceButton = styled.TouchableOpacity`
  flex: 1;
  min-height: 44px;
  border-radius: 14px;
  overflow: hidden;
  border-width: 1px;
  border-color: ${props => props.active ? portalTheme.primary : portalTheme.border};
  background-color: ${({ active, theme }) => active ? 'transparent' : theme.portal.page};
`;

const ChoiceGradient = styled(LinearGradient).attrs(({ theme }) => ({
  colors: theme.mode === 'dark'
    ? ['rgba(56,167,240,0.16)', 'rgba(16,37,54,0.94)', 'rgba(7,19,31,0.9)']
    : ['#e0f2fe', '#dbeafe', '#ffffff'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
}))`
  min-height: 44px;
  align-items: center;
  justify-content: center;
`;

const ChoiceText = styled.Text`
  color: ${props => props.active ? portalTheme.primary : portalTheme.muted};
  font-size: 13px;
  font-weight: 900;
`;

const initialForm = {
  name: '',
  cpf: '',
  phone: '',
  parentesco: '',
  cep: '',
  rua: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
};

export default function PerfilBeneficiariosScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingBeneficiary, setEditingBeneficiary] = useState(null);
  const [userData, setUserData] = useState(null);
  const [addressMode, setAddressMode] = useState('novo');
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (!user) return undefined;

    const q = query(
      collection(firestore, 'balcao'),
      where('userId', '==', user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
          .filter(item => (item.flavorId === flavorId || !item.flavorId) && item.type === 'beneficiario')
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

        setBeneficiarios(data);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar beneficiários:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const unsubscribe = onSnapshot(doc(firestore, 'users', user.uid), (snapshot) => {
      setUserData(snapshot.exists() ? snapshot.data() : null);
    });

    return () => unsubscribe();
  }, [user]);

  const openNewBeneficiary = () => {
    setEditingBeneficiary(null);
    setForm(initialForm);
    setAddressMode('novo');
    setModalVisible(true);
  };

  const openEditBeneficiary = (item) => {
    setEditingBeneficiary(item);
    setForm({
      name: item.name || '',
      cpf: formatCpf(item.cpf || ''),
      phone: formatPhone(item.phone || ''),
      parentesco: item.parentesco || '',
      cep: formatCep(item.endereco?.cep || ''),
      rua: item.endereco?.rua || '',
      numero: item.endereco?.numero || '',
      bairro: item.endereco?.bairro || '',
      cidade: item.endereco?.cidade || '',
      estado: item.endereco?.estado || '',
    });
    setAddressMode('novo');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingBeneficiary(null);
    setForm(initialForm);
    setAddressMode('novo');
  };

  const saveBeneficiary = async () => {
    if (!form.name || !form.cpf || !form.parentesco) {
      Alert.alert('Atenção', 'Informe nome, CPF e parentesco do beneficiário.');
      return;
    }

    if (!isValidCpf(form.cpf)) {
      Alert.alert('CPF inválido', 'Confira o CPF do beneficiário antes de salvar.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: 'beneficiario',
        flavorId,
        userId: user.uid,
        name: form.name,
        cpf: form.cpf,
        phone: form.phone,
        parentesco: form.parentesco,
        endereco: {
          cep: form.cep,
          rua: form.rua,
          numero: form.numero,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
        },
        updatedAt: serverTimestamp(),
      };

      if (editingBeneficiary?.id) {
        await updateDoc(doc(firestore, 'balcao', editingBeneficiary.id), payload);
      } else {
        await addDoc(collection(firestore, 'balcao'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      setForm(initialForm);
      setModalVisible(false);
      setEditingBeneficiary(null);
      Alert.alert('Sucesso', editingBeneficiary ? 'Beneficiário atualizado.' : 'Beneficiário cadastrado.');
    } catch (error) {
      console.error('Erro ao salvar beneficiário:', error);
      Alert.alert('Erro', 'Não foi possível cadastrar o beneficiário.');
    } finally {
      setSaving(false);
    }
  };

  const applyUserAddress = () => {
    if (!userData) {
      Alert.alert('Endereço não encontrado', 'Complete seus dados pessoais para reutilizar seu endereço.');
      return;
    }

    setAddressMode('usuario');
    setForm(prev => ({
      ...prev,
      cep: formatCep(userData.cep || ''),
      rua: userData.address || '',
      numero: userData.numero || '',
      bairro: userData.neighborhood || '',
      cidade: userData.city || '',
      estado: userData.state || '',
    }));
  };

  const useNewAddress = () => {
    setAddressMode('novo');
    setForm(prev => ({
      ...prev,
      cep: '',
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
    }));
  };

  const handleCpfChange = (text) => {
    setForm(prev => ({ ...prev, cpf: formatCpf(text) }));
  };

  const handlePhoneChange = (text) => {
    setForm(prev => ({ ...prev, phone: formatPhone(text) }));
  };

  const handleCpfBlur = () => {
    if (form.cpf && onlyDigits(form.cpf).length === 11 && !isValidCpf(form.cpf)) {
      Alert.alert('CPF inválido', 'O CPF informado não passou na validação dos dígitos.');
    }
  };

  const handleCepChange = (text) => {
    setAddressMode('novo');
    setForm(prev => ({ ...prev, cep: formatCep(text) }));
  };

  const handleCepBlur = async () => {
    if (onlyDigits(form.cep).length !== 8) return;

    setCepLoading(true);
    try {
      const address = await fetchAddressByCep(form.cep);
      setForm(prev => ({
        ...prev,
        cep: address.cep,
        rua: address.address || prev.rua,
        bairro: address.neighborhood || prev.bairro,
        cidade: address.city || prev.cidade,
        estado: address.state || prev.estado,
      }));
    } catch (error) {
      Alert.alert('CEP não encontrado', error.message || 'Não foi possível preencher o endereço.');
    } finally {
      setCepLoading(false);
    }
  };

  return (
    <PortalBackground>
      <PortalScreenHeader
        navigation={navigation}
        title="Beneficiários"
        subtitle="Cadastre pessoas para usar nas solicitações do Balcão."
      />

      <Scroll showsVerticalScrollIndicator={false}>
        <Content>
          <AddButton activeOpacity={0.78} onPress={openNewBeneficiary}>
            <AddButtonGradient>
              <Ionicons name="person-add-outline" size={20} color="#ffffff" />
              <AddButtonText>Novo beneficiário</AddButtonText>
            </AddButtonGradient>
          </AddButton>

          {loading ? (
            <ActivityIndicator color={portalTheme.primary} />
          ) : beneficiarios.length === 0 ? (
            <PortalCard>
              <EmptyText>Nenhum beneficiário cadastrado. Você poderá criar um novo aqui ou durante uma solicitação do Balcão.</EmptyText>
            </PortalCard>
          ) : (
            beneficiarios.map((item) => (
              <BeneficiaryCard key={item.id}>
                <Row>
                  <IconBox>
                    <MaterialCommunityIcons name="account-heart-outline" size={23} color={portalTheme.primary} />
                  </IconBox>
                  <Info>
                    <Name>{item.name}</Name>
                    <Meta>{item.parentesco || 'Parentesco não informado'} • CPF {item.cpf || 'não informado'}</Meta>
                    {item.phone ? <Meta>{item.phone}</Meta> : null}
                  </Info>
                  <EditButton onPress={() => openEditBeneficiary(item)}>
                    <Ionicons name="create-outline" size={20} color={portalTheme.primary} />
                  </EditButton>
                </Row>
              </BeneficiaryCard>
            ))
          )}
        </Content>
      </Scroll>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ModalBackdrop>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>{editingBeneficiary ? 'Editar beneficiário' : 'Novo beneficiário'}</ModalTitle>
                <ModalSubtitle>{editingBeneficiary ? 'Atualize os dados do beneficiário.' : 'Informe os dados principais para usar em solicitações do Balcão.'}</ModalSubtitle>
              </ModalHeader>

              <ModalScroll
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 14 }}
              >
                {[
                  ['name', 'Nome completo', 'Nome do beneficiário'],
                  ['cpf', 'CPF', '000.000.000-00', 'numeric'],
                  ['phone', 'Telefone', '(00) 00000-0000', 'phone-pad'],
                  ['parentesco', 'Parentesco', 'Ex: Filho(a), Pai/Mãe'],
                ].map(([key, label, placeholder, keyboardType]) => (
                  <Field key={key}>
                    <Label>{label}</Label>
                    <PortalInput
                      value={form[key]}
                      placeholder={placeholder}
                      keyboardType={keyboardType}
                      onChangeText={key === 'cpf' ? handleCpfChange : key === 'phone' ? handlePhoneChange : (text) => setForm({ ...form, [key]: text })}
                      onBlur={key === 'cpf' ? handleCpfBlur : undefined}
                    />
                  </Field>
                ))}

                <Label>Endereço</Label>
                <AddressChoice>
                  <ChoiceButton active={addressMode === 'usuario'} onPress={applyUserAddress}>
                    {addressMode === 'usuario' ? (
                      <ChoiceGradient>
                        <ChoiceText active>Usar meu endereço</ChoiceText>
                      </ChoiceGradient>
                    ) : (
                      <ChoiceGradient>
                        <ChoiceText>Usar meu endereço</ChoiceText>
                      </ChoiceGradient>
                    )}
                  </ChoiceButton>
                  <ChoiceButton active={addressMode === 'novo'} onPress={useNewAddress}>
                    {addressMode === 'novo' ? (
                      <ChoiceGradient>
                        <ChoiceText active>Novo endereço</ChoiceText>
                      </ChoiceGradient>
                    ) : (
                      <ChoiceGradient>
                        <ChoiceText>Novo endereço</ChoiceText>
                      </ChoiceGradient>
                    )}
                  </ChoiceButton>
                </AddressChoice>

                {[
                  ['cep', cepLoading ? 'CEP - buscando...' : 'CEP', '00000-000', 'numeric'],
                  ['rua', 'Rua', 'Rua ou logradouro'],
                  ['numero', 'Número', 'Nº'],
                  ['bairro', 'Bairro', 'Bairro'],
                  ['cidade', 'Cidade', 'Cidade'],
                  ['estado', 'Estado', 'UF'],
                ].map(([key, label, placeholder, keyboardType]) => (
                  <Field key={key}>
                    <Label>{label}</Label>
                    <PortalInput
                      value={form[key]}
                      placeholder={placeholder}
                      keyboardType={keyboardType}
                      onChangeText={key === 'cep' ? handleCepChange : (text) => setForm({ ...form, [key]: text })}
                      onBlur={key === 'cep' ? handleCepBlur : undefined}
                      maxLength={key === 'estado' ? 2 : undefined}
                      autoCapitalize={key === 'estado' ? 'characters' : 'sentences'}
                    />
                  </Field>
                ))}
              </ModalScroll>

              <ModalActions>
                <ModalButton onPress={saveBeneficiary} disabled={saving}>
                  <ModalButtonGradient>
                    {saving ? <ActivityIndicator color="#fff" /> : <ModalButtonText>{editingBeneficiary ? 'Atualizar' : 'Salvar'}</ModalButtonText>}
                  </ModalButtonGradient>
                </ModalButton>
                <ModalButton second secondary onPress={closeModal}>
                  <ModalButtonText secondary>Cancelar</ModalButtonText>
                </ModalButton>
              </ModalActions>
            </ModalContent>
          </ModalBackdrop>
        </KeyboardAvoidingView>
      </Modal>
    </PortalBackground>
  );
}
