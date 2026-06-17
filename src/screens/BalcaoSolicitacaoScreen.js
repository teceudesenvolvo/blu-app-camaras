import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, serverTimestamp as firestoreTimestamp, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { uploadFileToStorage } from '../../services/storageService';
import { AuthContext } from '../context/AuthContext';

const secondaryColor = Constants.expoConfig?.extra?.theme?.secondary || '#f9c204';
const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const backgroundColor = Constants.expoConfig?.extra?.theme?.background || '#f0f2f5';
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const isBeforeToday = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return true;
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate < getStartOfToday();
};

const padDatePart = (value) => String(value).padStart(2, '0');

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  return `${year}-${month}-${day}`;
};

const normalizeSlotList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'object') return Object.values(value).filter(Boolean);
  return [];
};

const normalizeBookedSlots = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, bookedValue]) => (bookedValue === true ? key : bookedValue))
      .filter(Boolean);
  }
  return [];
};

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${backgroundColor};
`;

const HeaderContainer = styled.View`
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

const FormContainer = styled.View`
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  margin: 15px 20px 40px 20px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
  elevation: 2;
`;

const InputGroup = styled.View`
  margin-bottom: 15px;
`;

const Label = styled.Text`
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 600;
`;

const Input = styled.TextInput`
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  font-size: 16px;
  color: #333;
  border-width: 1px;
  border-color: #e0e0e0;
`;

// Estilos para o seletor customizado
const StyledSelect = styled.TouchableOpacity`
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 12px 15px;
  border-width: 1px;
  border-color: #e0e0e0;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const SelectText = styled.Text`
  font-size: 16px;
  color: ${props => props.placeholder ? '#999' : '#333'};
`;

const RequirementsCard = styled.View`
  margin-top: 20px;
  background-color: #f5f6fa;
  border-radius: 8px;
  padding: 15px;
  border-left-width: 4px;
  border-left-color: ${secondaryColor};
`;

const RequirementItem = styled.View`
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 10px;
`;

const RequirementText = styled.Text`
  flex: 1;
  color: #444;
  font-size: 14px;
  line-height: 20px;
`;

const ModalBackdrop = styled.TouchableOpacity`
  flex: 1;
  background-color: rgba(0,0,0,0.5);
  justify-content: center;
  align-items: center;
`;

const ModalContainer = styled.View`
  background-color: #fff;
  border-radius: 10px;
  padding: 10px;
  width: 85%;
  max-height: 80%;
`;

const ModalItem = styled.TouchableOpacity`
  padding: 15px;
  border-bottom-width: 1px;
  border-bottom-color: #eee;
`;

const ModalItemText = styled.Text`
  font-size: 16px;
  color: #333;
`;

const TextArea = styled(Input)`
  height: 100px;
  text-align-vertical: top;
`;

const SubmitButton = styled.TouchableOpacity`
  background-color: ${primaryColor};
  padding: 16px;
  border-radius: 8px;
  align-items: center;
  margin-top: 20px;
  opacity: ${props => props.disabled ? 0.7 : 1};
`;

const SubmitText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 16px;
`;

const SlotContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 5px;
`;

const SlotButton = styled.TouchableOpacity`
  padding: 10px 15px;
  border-radius: 20px;
  background-color: ${props => props.selected ? primaryColor : '#e0e0e0'};
  margin-right: 10px;
  margin-bottom: 10px;
`;

const SlotText = styled.Text`
  font-size: 14px;
  color: ${props => props.selected ? '#fff' : '#333'};
  font-weight: 600;
`;

const TabContainer = styled.View`
  flex-direction: row;
  margin-top: 10px;
  margin-bottom: 20px;
`;

const TabButton = styled.TouchableOpacity`
  flex: 1;
  padding: 12px;
  background-color: ${props => props.active ? primaryColor : '#f5f5f5'};
  border-width: 1px;
  border-color: ${props => props.active ? primaryColor : '#e0e0e0'};
  align-items: center;
  ${props => props.first ? 'border-top-left-radius: 8px; border-bottom-left-radius: 8px;' : ''}
  ${props => props.last ? 'border-top-right-radius: 8px; border-bottom-right-radius: 8px;' : ''}
`;

const TabText = styled.Text`
  color: ${props => props.active ? '#fff' : '#666'};
  font-weight: 600;
`;

const Card = styled.View`
  background-color: #f9fafb;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-width: 1px;
  border-color: #eee;
`;

const RadioGroup = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 5px;
  margin-bottom: 10px;
`;

const RadioButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  margin-right: 15px;
  margin-bottom: 5px;
`;

const RadioCircle = styled.View`
  height: 20px;
  width: 20px;
  border-radius: 10px;
  border-width: 2px;
  border-color: ${props => props.selected ? primaryColor : '#ccc'};
  align-items: center;
  justify-content: center;
  margin-right: 8px;
`;

const SelectedBg = styled.View`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: ${primaryColor};
`;

const documentsData = {
  'cin': {
    label: 'Carteira de Identidade Nacional (CIN)',
    requirements: [
      'Certidão de Nascimento ou Casamento original (em bom estado, sem rasuras).',
      'Identidade do responsável legal (necessário se for menor de idade ou se aplicável).',
    ],
    attachments: [
      { key: 'cin_certidao', label: 'Certidão de Nascimento/Casamento' },
      { key: 'cin_rg_responsavel', label: 'RG do Responsável (se aplicável)' },
    ]
  }
};

export default function BalcaoSolicitacaoScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const serviceName = route.params?.serviceName || 'Solicitação';
  const [loading, setLoading] = useState(false);

  // Estado único para controlar todos os campos possíveis
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    tipoDocumento: '',
    dataPreferencia: '',
    // dataAgendamento será usado para armazenar a data selecionada (Objeto Date ou String ISO)
    dataAgendamento: '',
    motivo: '',
    programa: '',
    descricao: '',
    assunto: '',
    mensagem: '',
    observacoes: '',
    anexos: {},
  });

  // Estados específicos para Agendamento
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObject, setDateObject] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [documentPickerVisible, setDocumentPickerVisible] = useState(false);
  const [parentescoPickerVisible, setParentescoPickerVisible] = useState(false);
  const [beneficiaryPickerVisible, setBeneficiaryPickerVisible] = useState(false);

  // States for beneficiary (requester vs other)
  const [destino, setDestino] = useState('voce'); // voce | outro
  const [beneficiaryMode, setBeneficiaryMode] = useState('existente'); // existente | novo
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [parentesco, setParentesco] = useState('');
  const [otherPerson, setOtherPerson] = useState({ name: '', cpf: '', phone: '' });
  const [phonePreference, setPhonePreference] = useState('novo'); // novo | mesmo
  const [enderecoPreference, setEnderecoPreference] = useState('mesmo'); // mesmo | novo
  const [novoEndereco, setNovoEndereco] = useState({ cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '' });
  const [loggedInUserData, setLoggedInUserData] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const docRef = doc(firestore, 'users', user.uid);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const userData = snapshot.data();
          setLoggedInUserData(userData);
          setFormData(prev => ({
            ...prev,
            nome: userData.name || user.displayName || '',
            telefone: userData.phone || user.phoneNumber || '',
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            nome: user.displayName || '',
            telefone: user.phoneNumber || '',
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
        setFormData(prev => ({ ...prev, nome: user.displayName || '', telefone: user.phoneNumber || '' }));
      }
    };

    fetchUserData();
  }, [user]);

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
        if (data.length === 0) {
          setBeneficiaryMode('novo');
        }
      },
      (error) => {
        console.error('Erro ao carregar beneficiários:', error);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Efeito para buscar horários quando a data é digitada
  useEffect(() => {
    // Reseta os slots se a data for apagada
    if (serviceName === 'Agendamentos' && formData.dataAgendamento.length < 10) {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }

    // Busca apenas se o formato for DD/MM/AAAA
    if (serviceName === 'Agendamentos' && formData.dataAgendamento.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const parts = formData.dataAgendamento.split('/');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexado
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);

      // Verifica se a data é válida e não está no passado
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day && date >= today) {
        fetchAvailability(date);
      } else {
        setAvailableSlots([]);
        setSelectedSlot(null);
      }
    }
  }, [formData.dataAgendamento, serviceName]);

  // Função para buscar horários disponíveis no Firebase
  const fetchAvailability = async (selectedDate) => {
    if (isBeforeToday(selectedDate)) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      Alert.alert('Data inválida', 'Não é possível agendar para uma data anterior a hoje.');
      return;
    }

    setLoadingSlots(true);
    setSelectedSlot(null); // Reseta horário selecionado ao mudar data
    setAvailableSlots([]);

    try {
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dateStr = formatLocalDate(selectedDate);

      const docRef = doc(firestore, 'balcao-config', flavorId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const config = snapshot.data();
        const baseSlots = normalizeSlotList(
          config.availability?.[dayName]
        );
        const booked = normalizeBookedSlots(
          config.bookedSlots?.[dateStr],
        );

        const freeSlots = baseSlots.filter(slot => !booked.includes(slot));
        setAvailableSlots(freeSlots);
      } else {
        setAvailableSlots([]);
      }

    } catch (error) {
      console.error("Erro ao buscar horários:", error);
      console.log("Detailed error:", error.message, error.stack);

      Alert.alert("Erro", "Não foi possível carregar os horários disponíveis.");
    } finally {
      setLoadingSlots(false);
    }
  };

  // Manipulador de mudança de data

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      if (isBeforeToday(selectedDate)) {
        setAvailableSlots([]);
        setSelectedSlot(null);
        Alert.alert('Data inválida', 'Não é possível agendar para uma data anterior a hoje.');
        return;
      }

      setDateObject(selectedDate);
      // Salva formato legível no formData ou ISO para backend
      const formattedDate = selectedDate.toLocaleDateString('pt-BR');
      handleChange('dataAgendamento', formattedDate);


      // Dispara busca de horários
      fetchAvailability(selectedDate);
    }
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAttachmentChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      anexos: {
        ...prev.anexos,
        [key]: value
      }
    }));
  };

  const handlePickImage = async (attachmentKey) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,

      allowsEditing: false,
      quality: 0.5,
      base64: false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const newAttachment = {
        uri: asset.uri,
        name: asset.uri.split('/').pop(),
        type: asset.type || 'image/jpeg',
      };
      handleAttachmentChange(attachmentKey, [newAttachment]);
    }
  };

  const handleOtherPersonChange = (name, value) => {
    setOtherPerson(prev => ({ ...prev, [name]: value }));
  };

  const handleNovoEnderecoChange = (name, value) => {
    setNovoEndereco(prev => ({ ...prev, [name]: value }));
  };

  const selectBeneficiary = (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setBeneficiaryPickerVisible(false);
    setOtherPerson({
      name: beneficiary.name || '',
      cpf: beneficiary.cpf || '',
      phone: beneficiary.phone || '',
    });
    setParentesco(beneficiary.parentesco || '');

    if (beneficiary.endereco) {
      setNovoEndereco({
        cep: beneficiary.endereco.cep || '',
        rua: beneficiary.endereco.rua || '',
        numero: beneficiary.endereco.numero || '',
        bairro: beneficiary.endereco.bairro || '',
        cidade: beneficiary.endereco.cidade || '',
        estado: beneficiary.endereco.estado || '',
      });
    }
  };

  const fetchAddressByCep = async () => {
    const cep = novoEndereco.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
        if (response.ok) {
          const data = await response.json();
          setNovoEndereco(prev => ({
            ...prev,
            rua: data.street || '',
            bairro: data.neighborhood || '',
            cidade: data.city || '',
            estado: data.state || ''
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const renderBeneficiarioFields = () => {
    return (
      <InputGroup>
        <Label>Para quem é esta solicitação?</Label>
        <TabContainer>
          <TabButton first active={destino === 'voce'} onPress={() => setDestino('voce')}>
            <TabText active={destino === 'voce'}>Para mim</TabText>
          </TabButton>
          <TabButton last active={destino === 'outro'} onPress={() => setDestino('outro')}>
            <TabText active={destino === 'outro'}>Outra pessoa</TabText>
          </TabButton>
        </TabContainer>

        {destino === 'outro' && (
          <Card>
            <Label>Beneficiário</Label>
            <TabContainer>
              <TabButton first active={beneficiaryMode === 'existente'} onPress={() => setBeneficiaryMode('existente')}>
                <TabText active={beneficiaryMode === 'existente'}>Existente</TabText>
              </TabButton>
              <TabButton last active={beneficiaryMode === 'novo'} onPress={() => {
                setBeneficiaryMode('novo');
                setSelectedBeneficiary(null);
              }}>
                <TabText active={beneficiaryMode === 'novo'}>Criar novo</TabText>
              </TabButton>
            </TabContainer>

            {beneficiaryMode === 'existente' ? (
              <>
                <StyledSelect onPress={() => setBeneficiaryPickerVisible(true)} style={{ marginBottom: 15 }}>
                  <SelectText placeholder={!selectedBeneficiary}>
                    {selectedBeneficiary?.name || 'Selecione um beneficiário cadastrado...'}
                  </SelectText>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </StyledSelect>

                <Modal
                  transparent={true}
                  visible={beneficiaryPickerVisible}
                  animationType="fade"
                  onRequestClose={() => setBeneficiaryPickerVisible(false)}
                >
                  <ModalBackdrop onPress={() => setBeneficiaryPickerVisible(false)}>
                    <ModalContainer>
                      <ScrollView>
                        {beneficiarios.length === 0 ? (
                          <ModalItem onPress={() => {
                            setBeneficiaryMode('novo');
                            setBeneficiaryPickerVisible(false);
                          }}>
                            <ModalItemText>Nenhum cadastrado. Criar novo beneficiário</ModalItemText>
                          </ModalItem>
                        ) : (
                          beneficiarios.map((beneficiary) => (
                            <ModalItem key={beneficiary.id} onPress={() => selectBeneficiary(beneficiary)}>
                              <ModalItemText>{beneficiary.name} • {beneficiary.parentesco || 'Sem parentesco'}</ModalItemText>
                            </ModalItem>
                          ))
                        )}
                      </ScrollView>
                    </ModalContainer>
                  </ModalBackdrop>
                </Modal>

                {selectedBeneficiary ? (
                  <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
                    <Text style={{ color: '#111827', fontWeight: '800', marginBottom: 4 }}>{selectedBeneficiary.name}</Text>
                    <Text style={{ color: '#666', fontWeight: '600' }}>{selectedBeneficiary.parentesco || 'Parentesco não informado'} • CPF {selectedBeneficiary.cpf || 'não informado'}</Text>
                    {selectedBeneficiary.phone ? <Text style={{ color: '#666', fontWeight: '600', marginTop: 2 }}>{selectedBeneficiary.phone}</Text> : null}
                  </View>
                ) : null}
              </>
            ) : null}

            {beneficiaryMode === 'novo' && (
              <>
                <Label>Grau de Parentesco *</Label>
                <StyledSelect onPress={() => setParentescoPickerVisible(true)} style={{ marginBottom: 15 }}>
                  <SelectText placeholder={!parentesco}>
                    {parentesco || 'Selecione o grau de parentesco...'}
                  </SelectText>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </StyledSelect>

                <Modal
                  transparent={true}
                  visible={parentescoPickerVisible}
                  animationType="fade"
                  onRequestClose={() => setParentescoPickerVisible(false)}
                >
                  <ModalBackdrop onPress={() => setParentescoPickerVisible(false)}>
                    <ModalContainer>
                      <ScrollView>
                        {['Pai/Mãe', 'Filho(a)', 'Tio(a)', 'Avô/Avó', 'Cônjuge', 'Outro'].map((opcao, index) => (
                          <ModalItem
                            key={index}
                            onPress={() => {
                              setParentesco(opcao);
                              setParentescoPickerVisible(false);
                            }}
                          >
                            <ModalItemText>{opcao}</ModalItemText>
                          </ModalItem>
                        ))}
                      </ScrollView>
                    </ModalContainer>
                  </ModalBackdrop>
                </Modal>
            
                <Label>Nome Completo do Beneficiário *</Label>
                <Input
                  placeholder="Nome"
                  value={otherPerson.name}
                  onChangeText={(v) => handleOtherPersonChange('name', v)}
                  style={{ marginBottom: 15 }}
                />

                <Label>CPF do Beneficiário *</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={otherPerson.cpf}
                  onChangeText={(v) => handleOtherPersonChange('cpf', v)}
                  keyboardType="number-pad"
                  style={{ marginBottom: 15 }}
                />
              </>
            )}

            {beneficiaryMode === 'novo' && (
              <>
                <Label>Telefone do Beneficiário *</Label>
                <RadioGroup>
                  <RadioButton onPress={() => setPhonePreference('mesmo')}>
                    <RadioCircle selected={phonePreference === 'mesmo'}>
                      {phonePreference === 'mesmo' && <SelectedBg />}
                    </RadioCircle>
                    <Text style={{color: '#333'}}>Usar o meu</Text>
                  </RadioButton>
                  <RadioButton onPress={() => setPhonePreference('novo')}>
                    <RadioCircle selected={phonePreference === 'novo'}>
                      {phonePreference === 'novo' && <SelectedBg />}
                    </RadioCircle>
                    <Text style={{color: '#333'}}>Informar novo</Text>
                  </RadioButton>
                </RadioGroup>
                
                {phonePreference === 'novo' && (
                  <Input
                    placeholder="(00) 00000-0000"
                    value={otherPerson.phone}
                    onChangeText={(v) => handleOtherPersonChange('phone', v)}
                    keyboardType="phone-pad"
                    style={{ marginBottom: 15 }}
                  />
                )}

                <Label>Endereço do Beneficiário</Label>
                <RadioGroup>
                  <RadioButton onPress={() => setEnderecoPreference('mesmo')}>
                    <RadioCircle selected={enderecoPreference === 'mesmo'}>
                      {enderecoPreference === 'mesmo' && <SelectedBg />}
                    </RadioCircle>
                    <Text style={{color: '#333'}}>Usar meu endereço</Text>
                  </RadioButton>
                  <RadioButton onPress={() => setEnderecoPreference('novo')}>
                    <RadioCircle selected={enderecoPreference === 'novo'}>
                      {enderecoPreference === 'novo' && <SelectedBg />}
                    </RadioCircle>
                    <Text style={{color: '#333'}}>Informar novo endereço</Text>
                  </RadioButton>
                </RadioGroup>

                {enderecoPreference === 'novo' && (
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderColor: '#eee', paddingTop: 15 }}>
                    <Label>CEP *</Label>
                    <Input
                      placeholder="00000-000"
                      value={novoEndereco.cep}
                      onChangeText={(v) => handleNovoEnderecoChange('cep', v)}
                      onBlur={fetchAddressByCep}
                      keyboardType="number-pad"
                      style={{ marginBottom: 15 }}
                    />
                    
                    <Label>Rua/Logradouro *</Label>
                    <Input
                      placeholder="Rua..."
                      value={novoEndereco.rua}
                      onChangeText={(v) => handleNovoEnderecoChange('rua', v)}
                      style={{ marginBottom: 15 }}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Label>Número *</Label>
                        <Input
                          placeholder="Nº"
                          value={novoEndereco.numero}
                          onChangeText={(v) => handleNovoEnderecoChange('numero', v)}
                          style={{ marginBottom: 15 }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Label>Bairro *</Label>
                        <Input
                          placeholder="Bairro..."
                          value={novoEndereco.bairro}
                          onChangeText={(v) => handleNovoEnderecoChange('bairro', v)}
                          style={{ marginBottom: 15 }}
                        />
                      </View>
                    </View>

                    <Label>Cidade/Estado *</Label>
                    <Input
                      placeholder="Cidade - UF"
                      value={novoEndereco.cidade ? `${novoEndereco.cidade} - ${novoEndereco.estado}` : ''}
                      editable={false}
                      style={{ backgroundColor: '#e9ecef', marginBottom: 15 }}
                    />
                  </View>
                )}
              </>
            )}
          </Card>
        )}
      </InputGroup>
    );
  };

  // Renderização condicional dos campos baseada no serviço
  const renderServiceFields = () => {
    const selectedDocData = formData.tipoDocumento ? documentsData[formData.tipoDocumento] : null;
    switch (serviceName) {
      case 'Emissão de Documentos':
        return (
          <>
            <InputGroup>
              <Label>Tipo de Documento</Label>
              <StyledSelect onPress={() => setDocumentPickerVisible(true)}>
                <SelectText placeholder={!selectedDocData}>
                  {selectedDocData?.label || 'Selecione um documento...'}
                </SelectText>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </StyledSelect>
            </InputGroup>

            <Modal
              transparent={true}
              visible={documentPickerVisible}
              animationType="fade"
              onRequestClose={() => setDocumentPickerVisible(false)}
            >
              <ModalBackdrop onPress={() => setDocumentPickerVisible(false)}>
                <ModalContainer>
                  <ScrollView>
                    {Object.entries(documentsData).map(([key, { label }]) => (
                      <ModalItem
                        key={key}
                        onPress={() => {
                          handleChange('tipoDocumento', key);
                          setDocumentPickerVisible(false);
                        }}
                      >
                        <ModalItemText>{label}</ModalItemText>
                      </ModalItem>
                    ))}
                  </ScrollView>
                </ModalContainer>
              </ModalBackdrop>
            </Modal>

            {selectedDocData && (
              <RequirementsCard>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 15 }}>Documentos e Informações Necessárias:</Text>
                {selectedDocData.requirements.map((req, index) => (
                  <RequirementItem key={index}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={primaryColor} style={{ marginRight: 8, marginTop: 1 }} />
                    <RequirementText>{req}</RequirementText>
                  </RequirementItem>
                ))}
              </RequirementsCard>
            )}

            {selectedDocData && selectedDocData.attachments.length > 0 && (
              <InputGroup style={{ marginTop: 20 }}>
                <Label>Anexos Necessários</Label>
                {selectedDocData.attachments.map(att => (
                  <StyledSelect key={att.key} onPress={() => handlePickImage(att.key)} style={{ marginBottom: 10 }}>
                    <SelectText placeholder={!formData.anexos[att.key]}>{formData.anexos[att.key] ? `✓ ${att.label}` : att.label}</SelectText>
                    <Ionicons name={formData.anexos[att.key] ? "checkmark-circle" : "camera-outline"} size={20} color={formData.anexos[att.key] ? 'green' : '#666'} />
                  </StyledSelect>
                ))}
              </InputGroup>
            )}
          </>
        );


      case 'Agendamentos':
        return (
          <>
            <InputGroup>
              <Label>Data Desejada</Label>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <Input
                  placeholder="Toque para selecionar a data"
                  value={formData.dataAgendamento}
                  editable={false} // Impede digitação manual para forçar uso do picker
                  style={{ color: '#000' }}
                />
                <Ionicons name="calendar" size={20} color="#666" style={{ position: 'absolute', right: 15, top: 12 }} />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={dateObject}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}
              <Input
                placeholder="DD/MM/AAAA"
                value={formData.dataAgendamento}
                onChangeText={(t) => handleChange('dataAgendamento', t)}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </InputGroup>

            {formData.dataAgendamento ? (
              <InputGroup>
                <Label>Horários Disponíveis {loadingSlots && <ActivityIndicator size="small" color={primaryColor} />}</Label>
                {availableSlots.length > 0 ? (
                  <SlotContainer>
                    {availableSlots.map((time) => (
                      <SlotButton
                        key={time}
                        selected={selectedSlot === time}
                        onPress={() => setSelectedSlot(time)}
                      >
                        <SlotText selected={selectedSlot === time}>{time}</SlotText>
                      </SlotButton>
                    ))}
                  </SlotContainer>
                ) : (
                  <Text style={{ color: '#888', fontStyle: 'italic', marginTop: 5 }}>
                    {!loadingSlots && "Nenhum horário disponível para esta data."}
                  </Text>
                )}
              </InputGroup>
            ) : null}

            <InputGroup>
              <Label>Motivo do Agendamento</Label>
              <TextArea
                placeholder="Descreva o motivo..."
                multiline
                numberOfLines={3}
                value={formData.motivo}
                onChangeText={(t) => handleChange('motivo', t)}
              />
            </InputGroup>
          </>
        );

      case 'Atendimento Social':
        return (
          <>
            <InputGroup>
              <Label>Programa de Interesse</Label>
              <Input
                placeholder="Ex: Cesta Básica, Auxílio Gás"
                value={formData.programa}
                onChangeText={(t) => handleChange('programa', t)}
              />
            </InputGroup>
            <InputGroup>
              <Label>Descreva sua necessidade</Label>
              <TextArea
                placeholder="Detalhe sua situação..."
                multiline
                numberOfLines={4}
                value={formData.descricao}
                onChangeText={(t) => handleChange('descricao', t)}
              />
            </InputGroup>
          </>
        );

      default: // Informações Gerais e outros
        return (
          <>
            <InputGroup>
              <Label>Assunto</Label>
              <Input
                placeholder="Digite o assunto"
                value={formData.assunto}
                onChangeText={(t) => handleChange('assunto', t)}
              />
            </InputGroup>
            <InputGroup>
              <Label>Sua Mensagem</Label>
              <TextArea
                placeholder="Digite sua mensagem..."
                multiline
                numberOfLines={4}
                value={formData.mensagem}
                onChangeText={(t) => handleChange('mensagem', t)}
              />
            </InputGroup>
          </>
        );
    }
  };

  const bookTimeSlot = async (dateStr, slot) => {
    try {
      const docRef = doc(firestore, 'balcao-config', flavorId);

      await updateDoc(docRef, {
        [`bookedSlots.${dateStr}.${slot}`]: slot
      });
      console.log(`Horário ${slot} agendado com sucesso em ${dateStr}`);
    } catch (error) {
      console.error("Erro ao salvar horário agendado:", error);
      throw new Error("Não foi possível registrar o horário. Tente novamente.");
    }
  };

  const handleSubmit = async () => {
    // Validação básica simples
    if (!formData.nome || !formData.telefone) {
      Alert.alert('Atenção', 'Por favor, preencha seu nome e telefone.');
      return;
    }

    if (serviceName === 'Agendamentos' && (!formData.dataAgendamento || !selectedSlot)) {
      Alert.alert('Atenção', 'Por favor, selecione uma data e um horário disponível.');
      return;
    }

    if (destino === 'outro') {
      if (beneficiaryMode === 'existente' && !selectedBeneficiary) {
        Alert.alert('Atenção', 'Selecione um beneficiário ou escolha criar um novo.');
        return;
      }

      if (beneficiaryMode === 'novo' && (!otherPerson.name || !otherPerson.cpf || !parentesco)) {
        Alert.alert('Atenção', 'Informe nome, CPF e parentesco do beneficiário.');
        return;
      }
    }

    if (serviceName === 'Agendamentos') {
      const dateObj = new Date(formData.dataAgendamento.split('/').reverse().join('-'));
      if (isBeforeToday(dateObj)) {
        Alert.alert('Data inválida', 'Não é possível agendar para uma data anterior a hoje.');
        setAvailableSlots([]);
        setSelectedSlot(null);
        return;
      }
    }

    setLoading(true);

    try {
      const { nome, telefone, ...dadosSolicitacao } = formData;

      // 1. Upload anexos para o Storage (se houver)
      const uploadedAnexos = {};
      if (dadosSolicitacao.anexos) {
        for (const [key, attachments] of Object.entries(dadosSolicitacao.anexos)) {
          if (Array.isArray(attachments)) {
            const uploadedList = await Promise.all(attachments.map(async (att) => {
              let downloadUrl = att.uri;
              if (att.uri && !att.uri.startsWith('http')) { // Only upload if it's a local URI
                downloadUrl = await uploadFileToStorage(att.uri, `${flavorId}/balcao-cidadao/${user.uid}/anexos`);
              }
              return { 
                name: att.name,
                type: att.type,
                url: downloadUrl, 
                data: downloadUrl,
                uri: downloadUrl 
              };
            }));
            uploadedAnexos[key] = uploadedList;
          }
        }
      }

      // Adiciona o horário selecionado explicitamente se for agendamento
      if (serviceName === 'Agendamentos' && selectedSlot) {
        const dateObj = new Date(formData.dataAgendamento.split('/').reverse().join('-'));
        const dateISO = dateObj.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        dadosSolicitacao.horario = selectedSlot;
        await bookTimeSlot(dateISO, selectedSlot);
      }

      // Não renomear o tipoDocumento para a label, deixar a chave ('cin') como no web.

      // Dados Beneficiario
      const dadosUsuarioParaSalvar = {
          id: user.uid,
          email: loggedInUserData?.email || user.email || '',
          name: loggedInUserData?.name || formData.nome || 'Não informado',
          cpf: loggedInUserData?.cpf || 'Não informado',
          phone: loggedInUserData?.phone || formData.telefone || 'Não informado',
      };

      let dadosBeneficiario;
      if (destino === 'voce') {
          dadosBeneficiario = { 
              ...dadosUsuarioParaSalvar, 
              parentesco: 'O Próprio', 
              endereco: { 
                  rua: loggedInUserData?.address || 'Não informado', 
                  numero: loggedInUserData?.numero || 'S/N', 
                  bairro: loggedInUserData?.neighborhood || 'Não informado', 
                  cidade: loggedInUserData?.city || 'Não informado', 
                  estado: loggedInUserData?.state || 'Não informado', 
                  cep: loggedInUserData?.cep || 'Não informado' 
              } 
          };
      } else {
          const selectedEndereco = selectedBeneficiary?.endereco || {};
          const phoneFinal = beneficiaryMode === 'existente'
              ? (selectedBeneficiary?.phone || formData.telefone || 'Não informado')
              : phonePreference === 'mesmo' ? (loggedInUserData?.phone || formData.telefone || 'Não informado') : otherPerson.phone;
          const enderecoFinal = beneficiaryMode === 'existente'
              ? selectedEndereco
              : enderecoPreference === 'mesmo' 
              ? { 
                  rua: loggedInUserData?.address || 'Não informado', 
                  numero: loggedInUserData?.numero || 'S/N', 
                  bairro: loggedInUserData?.neighborhood || 'Não informado', 
                  cidade: loggedInUserData?.city || 'Não informado', 
                  estado: loggedInUserData?.state || 'Não informado', 
                  cep: loggedInUserData?.cep || 'Não informado' 
              }
              : novoEndereco;
          
          dadosBeneficiario = {
              id: selectedBeneficiary?.id || 'outro',
              name: selectedBeneficiary?.name || otherPerson.name,
              cpf: selectedBeneficiary?.cpf || otherPerson.cpf,
              phone: phoneFinal,
              parentesco: selectedBeneficiary?.parentesco || parentesco || 'Não informado',
              endereco: {
                  rua: enderecoFinal.rua || 'Não informado',
                  numero: enderecoFinal.numero || 'S/N',
                  bairro: enderecoFinal.bairro || 'Não informado',
                  cidade: enderecoFinal.cidade || 'Não informado',
                  estado: enderecoFinal.estado || 'Não informado',
                  cep: enderecoFinal.cep || 'Não informado'
              }
          };

          if (beneficiaryMode === 'novo') {
              try {
                await addDoc(collection(firestore, 'balcao'), {
                  type: 'beneficiario',
                  flavorId,
                  userId: user.uid,
                  name: dadosBeneficiario.name,
                  cpf: dadosBeneficiario.cpf,
                  phone: dadosBeneficiario.phone,
                  parentesco: dadosBeneficiario.parentesco,
                  endereco: dadosBeneficiario.endereco,
                  createdAt: firestoreTimestamp(),
                  updatedAt: firestoreTimestamp(),
                });
              } catch (beneficiaryError) {
                console.error('Erro ao salvar beneficiário:', beneficiaryError);
              }
          }
      }

      const firestoreData = {
        flavorId,
        userId: user.uid,
        source: 'mobile',
        dadosUsuario: dadosUsuarioParaSalvar,
        dadosBeneficiario: dadosBeneficiario,
        dadosSolicitacao: {
          assunto: serviceName === 'Emissão de Documentos' ? 'Emissão de Documentos' : (formData.assunto || serviceName),
          ...(serviceName === 'Emissão de Documentos' ? {
            tipoDocumento: formData.tipoDocumento || '',
            detalhes: {
              estadoCivil: formData.estadoCivil || ''
            }
          } : {
            descricao: formData.descricao || formData.mensagem || ''
          }),
          anexos: uploadedAnexos
        },
        status: 'Aguardando Atendimento',
        dataSolicitacao: new Date().getTime(),
        ultimaAtualizacao: new Date().getTime(),
      };

      await addDoc(collection(firestore, 'balcao-cidadao'), firestoreData);

      Alert.alert('Sucesso', 'Sua solicitação foi enviada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', error.message || 'Não foi possível enviar sua solicitação.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (!user) return;

    // (Consulta movida ou não utilizada diretamente aqui)
  }, [user]);


  return (
    <Container showsVerticalScrollIndicator={false}>
      <HeaderContainer>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </BackButton>
        <HeaderTitle>{serviceName}</HeaderTitle>
      </HeaderContainer>


      <FormContainer>
        {renderBeneficiarioFields()}
        {renderServiceFields()}

        <SubmitButton onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <SubmitText>Enviar Solicitação</SubmitText>
          )}
        </SubmitButton>
      </FormContainer>
    </Container>
  );
}
