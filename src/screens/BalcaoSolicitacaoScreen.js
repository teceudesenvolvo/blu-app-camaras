import React, { useState, useContext, useEffect } from 'react';
import { View, Alert, TextInput, Text, TouchableOpacity, ScrollView, Platform, Modal, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { getDatabase, ref, get, push, set, update, query, orderByChild, equalTo, onValue, serverTimestamp } from 'firebase/database';
import app from '../../services/firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const secondaryColor = Constants.expoConfig?.extra?.theme?.secondary || '#f9c204';
const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const backgroundColor = Constants.expoConfig?.extra?.theme?.background || '#f0f2f5';
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

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
  },
  'cpf': {
    label: 'CPF (2ª via / Atualização)',
    requirements: [
      'Documento de Identidade: RG, CNH ou Passaporte (original e cópia).',
      'Comprovante de Estado Civil: Certidão de Nascimento (solteiros) ou Casamento (casados/divorciados).',
      'Comprovante de Residência: Recente (últimos 3 meses).',
      'Selfie com Documento: Para pedidos online, é necessário anexar uma foto segurando o documento de identidade aberto ao lado do rosto.',
    ],
    attachments: [
        { key: 'cpf_identidade', label: 'Documento de Identidade' },
        { key: 'cpf_estado_civil', label: 'Comprovante de Estado Civil' },
        { key: 'cpf_residencia', label: 'Comprovante de Residência' },
        { key: 'cpf_selfie', label: 'Selfie com Documento' },
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

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const db = getDatabase(app);
        const snapshot = await get(ref(db, `${flavorId}/users/${user.uid}`));
        if (snapshot.exists()) {
          const userData = snapshot.val();
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
      }
    }
  }, [formData.dataAgendamento, serviceName]);

  // Função para buscar horários disponíveis no Firebase
  const fetchAvailability = async (selectedDate) => {
    setLoadingSlots(true);
    setSelectedSlot(null); // Reseta horário selecionado ao mudar data
    setAvailableSlots([]);

    try {
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = daysOfWeek[selectedDate.getDay()];
      const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const db = getDatabase(app);
      const snapshot = await get(ref(db, `${flavorId}/balcao-config`));
      
      if (snapshot.exists()) {
        const config = snapshot.val();
        
        // 1. Busca slots base do dia da semana (ex: 'monday')
        const baseSlots = config.availability && config.availability[dayName] 
          ? Object.values(config.availability[dayName])
          : [];

        const bookedSlotsObject = config.bookedSlots && config.bookedSlots[dateStr]
            ? config.bookedSlots[dateStr]
            : {};

        // 2. Busca slots já ocupados na data específica (bookedSlots/YYYY-MM-DD)
        const booked = config.bookedSlots && config.bookedSlots[dateStr]
            ? Object.entries(config.bookedSlots[dateStr]).map(([key, value]) => value)
            : [];
        
        
        console.log('Base slots:', baseSlots);
        console.log('Booked slots object:', bookedSlotsObject);
        console.log('Booked slots keys:', booked);
    

        const freeSlots = baseSlots.filter(slot => !booked.includes(slot));
        
        setAvailableSlots(freeSlots);
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
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const base64Image = `data:image/jpeg;base64,${asset.base64}`;
      const newAttachment = {
          data: base64Image,
          name: asset.uri.split('/').pop(),
          type: asset.type,
      };
      handleAttachmentChange(attachmentKey, [newAttachment]);
    }
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
                <Text style={{fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 15}}>Documentos e Informações Necessárias:</Text>
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
                  <StyledSelect key={att.key} onPress={() => handlePickImage(att.key)} style={{marginBottom: 10}}>
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
                <Label>Horários Disponíveis {loadingSlots && <ActivityIndicator size="small" color={primaryColor}/>}</Label>
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
      const slotKey = Object.keys(availableSlots).find(key => availableSlots[key] === slot) || 0;
      const db = getDatabase(app);
      await update(ref(db, `${flavorId}/balcao-config/bookedSlots/${dateStr}`), { [slot]: true });
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

    setLoading(true);

    try {
      const db = getDatabase(app);
      const newRequestRef = push(ref(db, `${flavorId}/balcao-cidadao`));

      const { nome, telefone, ...dadosSolicitacao } = formData;


      // Adiciona o horário selecionado explicitamente se for agendamento
      if (serviceName === 'Agendamentos' && selectedSlot) {
        const dateObj = new Date(formData.dataAgendamento.split('/').reverse().join('-'));
        const dateISO = dateObj.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        dadosSolicitacao.horario = selectedSlot;
        await bookTimeSlot(dateISO, selectedSlot);
      }



    
      if (serviceName === 'Emissão de Documentos' && dadosSolicitacao.tipoDocumento) {
        dadosSolicitacao.tipoDocumento = documentsData[dadosSolicitacao.tipoDocumento].label;
      }
      
      await set(newRequestRef, {
        userId: user.uid,
        userName: nome,
        userPhone: telefone,
        tipo: `Balcão do Cidadão: ${serviceName}`,
        dadosSolicitacao: {
          ...dadosSolicitacao,
          anexos: dadosSolicitacao.anexos || {}
        },
        status: 'Pendente',
        createdAt: serverTimestamp(),
      });

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

    // Use the corrected path here as well
    const db = getDatabase(app);
    const q = query(
      ref(db, `${flavorId}/balcao-cidadao`),
      orderByChild('userId'),
      equalTo(user.uid)
    );
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
