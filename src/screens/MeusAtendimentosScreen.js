import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, runTransaction, where } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { AuthContext } from '../context/AuthContext';

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

const Container = styled.View`
  flex: 1;
  background-color: ${backgroundColor};
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

const ListContainer = styled.View`
  flex: 1;
  padding: 20px;
`;

const RequestCard = styled.View`
  background-color: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
  flex-direction: row;
  align-items: center;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
  elevation: 2;
  border-left-width: 4px;
  border-left-color: ${props => props.statusColor || primaryColor};
`;

const IconWrapper = styled.View`
  width: 45px;
  height: 45px;
  border-radius: 22.5px;
  background-color: ${props => props.bgColor || primaryColor + '15'};
  justify-content: center;
  align-items: center;
  margin-right: 15px;
`;

const InfoSection = styled.View`
  flex: 1;
`;

const RequestTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
`;

const RequestDate = styled.Text`
  font-size: 12px;
  color: #888;
  margin-bottom: 2px;
`;

const StatusTag = styled.View`
  background-color: ${props => props.bgColor || '#e0e0e0'};
  padding: 4px 8px;
  border-radius: 4px;
  align-self: flex-start;
  margin-top: 5px;
`;

const StatusText = styled.Text`
  font-size: 10px;
  font-weight: bold;
  color: ${props => props.textColor || '#666'};
  text-transform: uppercase;
`;

const FormContainer = styled.View`
  margin-top: 15px;
  padding-top: 15px;
  border-top-width: 1px;
  border-color: #eee;
`;

const Label = styled.Text`
  font-size: 13px;
  font-weight: bold;
  color: #444;
  margin-bottom: 8px;
`;

const SlotContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 5px;
  margin-bottom: 15px;
`;

const SlotButton = styled.TouchableOpacity`
  padding: 8px 12px;
  border-radius: 20px;
  background-color: ${props => props.selected ? primaryColor : '#f5f5f5'};
  margin-right: 8px;
  margin-bottom: 8px;
  border-width: 1px;
  border-color: ${props => props.selected ? primaryColor : '#ddd'};
`;

const SlotText = styled.Text`
  color: ${props => props.selected ? '#fff' : '#666'};
  font-size: 12px;
  font-weight: 600;
`;

const SubmitBtn = styled.TouchableOpacity`
  background-color: ${primaryColor};
  padding: 10px;
  border-radius: 8px;
  align-items: center;
`;

const SubmitBtnText = styled.Text`
  color: #fff;
  font-weight: 600;
  font-size: 14px;
`;

const AgendamentoInlineForm = ({ solicitacaoId }) => {
    const [appointmentDate, setAppointmentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [appointmentTime, setAppointmentTime] = useState('');
    const [availability, setAvailability] = useState(null);
    const [bookedSlots, setBookedSlots] = useState({});
    const [blockedDates, setBlockedDates] = useState([]);
    const [availableTimes, setAvailableTimes] = useState([]);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [scheduling, setScheduling] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const availabilityRef = doc(firestore, 'balcao-config', 'availability');
                const bookedSlotsRef = doc(firestore, 'balcao-config', 'bookedSlots');
                const blockedDatesRef = doc(firestore, 'balcao-config', 'blockedDates');

                const [availSnap, bookedSnap, blockedSnap] = await Promise.all([
                    getDoc(availabilityRef), getDoc(bookedSlotsRef), getDoc(blockedDatesRef)
                ]);

                if (availSnap.exists()) setAvailability(availSnap.data());
                if (bookedSnap.exists()) setBookedSlots(bookedSnap.data());

                let manualBlocked = [];
                if (blockedSnap.exists()) {
                    const data = blockedSnap.data();
                    manualBlocked = data.dates || data.blockedDates || [];
                }

                    const currentYear = new Date().getFullYear();
                    const years = [currentYear, currentYear + 1];
                    let holidays = [];

                    await Promise.all(years.map(async (year) => {
                        // Feriados Locais Fixos (Exemplo)
                        holidays.push(`05/02/${year}`);
                        holidays.push(`01/11/${year}`);
                        holidays.push(`19/03/${year}`);
                        try {
                            const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
                            if (res.ok) {
                                const hData = await res.json();
                                const formatted = hData.map(h => {
                                    const [y, m, d] = h.date.split('-');
                                    return `${d}/${m}/${y}`;
                                });
                                holidays = [...holidays, ...formatted];
                            }
                        } catch (error) {
                            console.log("Erro ao buscar feriados", error);
                        }
                    }));

                    const allBlockedDates = [...new Set([...manualBlocked, ...holidays])];
                    setBlockedDates(allBlockedDates);
            } catch (error) {
                console.error("Erro ao carregar configurações de agenda", error);
            } finally {
                setLoadingConfig(false);
            }
        };

        fetchConfig();
    }, []);

    useEffect(() => {
        if (!availability) return;

        if (isBeforeToday(appointmentDate)) {
            setAvailableTimes([]);
            setAppointmentTime('');
            return;
        }

        // Formata data para bater com o padrão Web (YYYY-MM-DD para chaves e DD/MM/YYYY para bloqueios)
        const day = String(appointmentDate.getDate()).padStart(2, '0');
        const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
        const dateISO = `${appointmentDate.getFullYear()}-${month}-${day}`;
        const dateBR = `${day}/${month}/${appointmentDate.getFullYear()}`;

        if (blockedDates.includes(dateBR)) {
            setAvailableTimes([]);
            setAppointmentTime('');
            return;
        }

        // Obtém o dia da semana em inglês para bater com o mapa 'availability'
        const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        const allSlotsForDay = availability[dayOfWeek] || [];
        
        const existingObj = bookedSlots[dateISO] || [];
        // O portal web armazena bookedSlots como arrays de horários
        const existingBookings = Array.isArray(existingObj) ? existingObj : Object.keys(existingObj);

        const freeSlots = allSlotsForDay.filter(slot => !existingBookings.includes(slot));
        setAvailableTimes(freeSlots);
        setAppointmentTime('');
    }, [appointmentDate, availability, bookedSlots, blockedDates]);

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            if (isBeforeToday(selectedDate)) {
                Alert.alert('Data inválida', 'Não é possível agendar para uma data anterior a hoje.');
                setAppointmentTime('');
                return;
            }
            setAppointmentDate(selectedDate);
        }
    };

    const handleSchedule = async () => {
        if (!appointmentTime) return;
        if (isBeforeToday(appointmentDate)) {
            Alert.alert('Data inválida', 'Não é possível agendar para uma data anterior a hoje.');
            setAppointmentTime('');
            return;
        }
        setScheduling(true);
        const day = String(appointmentDate.getDate()).padStart(2, '0');
        const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
        const dateISO = `${appointmentDate.getFullYear()}-${month}-${day}`;

        try {
            const bookedSlotRef = doc(firestore, 'balcao-config', 'bookedSlots');
            const solicitacaoRef = doc(firestore, 'balcao-cidadao', solicitacaoId);

            await runTransaction(firestore, async (transaction) => {
                const configSnap = await transaction.get(bookedSlotRef);
                
                let existing = [];
                if (configSnap.exists()) {
                    const data = configSnap.data();
                    existing = Array.isArray(data[dateISO]) ? data[dateISO] : (data[dateISO] ? Object.keys(data[dateISO]) : []);
                }

                if (existing.includes(appointmentTime)) {
                    throw new Error("Este horário acabou de ser ocupado. Por favor, escolha outro.");
                }

                transaction.update(solicitacaoRef, {
                    status: 'Agendado',
                    appointmentDate: appointmentDate.toLocaleDateString('pt-BR'),
                    appointmentTime: appointmentTime
                });

                transaction.set(bookedSlotRef, {
                    [dateISO]: [...existing, appointmentTime]
                }, { merge: true });
            });

            alert('Agendamento confirmado com sucesso!');
        } catch (error) {
            alert(error.message || 'Erro ao agendar horário.');
        } finally {
            setScheduling(false);
        }
    };

    if (loadingConfig) {
        return (
            <FormContainer>
                <ActivityIndicator size="small" color={primaryColor} />
            </FormContainer>
        );
    }

    return (
        <FormContainer>
            <Label>Escolha a Data</Label>
            <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={{ padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#eee' }}
            >
                <Text style={{color: '#333'}}>{appointmentDate.toLocaleDateString('pt-BR')}</Text>
                <Ionicons name="calendar" size={18} color={primaryColor} />
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={appointmentDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                />
            )}

            <Label>Horários Disponíveis</Label>
            <SlotContainer>
                {availableTimes.length > 0 ? (
                    availableTimes.map(time => (
                        <SlotButton
                            key={time}
                            selected={appointmentTime === time}
                            onPress={() => setAppointmentTime(time)}
                        >
                            <SlotText selected={appointmentTime === time}>{time}</SlotText>
                        </SlotButton>
                    ))
                ) : (
                    <Text style={{ color: '#888', fontStyle: 'italic', fontSize: 12 }}>
                        Nenhum horário disponível para esta data.
                    </Text>
                )}
            </SlotContainer>

            <SubmitBtn disabled={!appointmentTime || scheduling} onPress={handleSchedule} style={{ opacity: (!appointmentTime || scheduling) ? 0.5 : 1 }}>
                {scheduling ? <ActivityIndicator size="small" color="#fff" /> : <SubmitBtnText>Confirmar Agendamento</SubmitBtnText>}
            </SubmitBtn>
        </FormContainer>
    );
};

export default function MeusAtendimentosScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const { source, solicitacaoId } = route.params || {};

  useEffect(() => {
    if (!user) return;

    let basePath = 'solicitacoes'; // Rota padrão
    if (source === 'balcao-cidadao') {
      basePath = 'balcao-cidadao';
    } else if (source === 'ouvidoria') {
      basePath = 'ouvidoria';
    } else if (source === 'procuradoria-mulher') {
      basePath = 'procuradoria-mulher';
    }

    const requestsQuery = query(
      collection(firestore, basePath),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const data = [];
        snapshot.forEach(docSnap => {
          const item = docSnap.data();
          // Filter by flavorId locally to avoid needing a composite index
          if (item.flavorId === flavorId || !item.flavorId) {
            data.push({
              ...item,
              id: docSnap.id,
              originCollection: basePath,
              // Handle Firestore timestamps
              createdAt: item.createdAt?.toMillis ? item.createdAt.toMillis() : item.createdAt,
              dataManifestacao: item.dataManifestacao?.toMillis ? item.dataManifestacao.toMillis() : item.dataManifestacao
            });
          }
        });
        
        // Sort locally for 'desc' order
        data.sort((a, b) => (b.dataManifestacao || b.createdAt || 0) - (a.dataManifestacao || a.createdAt || 0));

        setRequests(data);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, source]);

  useEffect(() => {
    if (loading || !solicitacaoId || requests.length === 0) return;

    const selectedRequest = requests.find((request) => request.id === solicitacaoId);
    if (!selectedRequest) return;

    let destination = 'BalcaoDetalhe';
    if (selectedRequest.originCollection === 'ouvidoria') destination = 'OuvidoriaDetalhe';
    if (selectedRequest.originCollection === 'procuradoria-mulher') destination = 'ProcuradoriaDetalhe';

    navigation.navigate(destination, { item: selectedRequest });
  }, [loading, navigation, requests, solicitacaoId]);

    const getStatusInfo = (status) => {
    switch (status) {
      case 'Concluído': return { color: '#2e7d32', label: 'Concluído' };
      case 'Agendado': return { color: '#2e7d32', label: 'Agendado' };
      case 'Agendamento Liberado': return { color: '#004a99', label: 'Agendar Agora' };
      case 'Pendente': return { color: '#f9c204', label: 'Em Análise' };
      case 'Recebida': return { color: '#004a99', label: 'Recebida' };
      case 'Documentação Reenviada': return { color: '#004a99', label: 'Doc. Enviada' };
      case 'Manifestação Atualizada': return { color: '#004a99', label: 'Atualizada' };
      case 'Cancelado': return { color: '#dc2626', label: 'Cancelado' };
      default: return { color: '#a21caf', label: status || 'Aguardando' };
    }
  };

  const getIcon = (tipo) => {
    if (tipo?.includes('Procuradoria')) return 'gender-female';
    if (tipo?.includes('Balcão')) return 'card-account-details-outline';
    return 'message-text-outline';
  };

  const deleteRequest = async (item) => {
    if (!item?.id) return;
    setDeletingId(item.id);
    try {
      await deleteDoc(doc(firestore, item.originCollection || 'balcao-cidadao', item.id));
    } catch (error) {
      console.error('Erro ao excluir solicitação cancelada:', error);
      Alert.alert('Erro', 'Não foi possível excluir a solicitação. Por favor, tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteRequest = (item) => {
    Alert.alert(
      'Excluir solicitação',
      'Tem certeza que deseja excluir esta solicitação cancelada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteRequest(item) }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    const timestamp = item.dataManifestacao || item.createdAt;
    const dateStr = timestamp ? new Date(timestamp).toLocaleString('pt-BR') : 'Recentemente';
    
    const titleDisplay = item.dadosManifestacao?.assunto || item.dadosSolicitacao?.assunto || item.tipo || 'Atendimento';
    const subTypeDisplay = item.dadosManifestacao?.tipoManifestacao || item.dadosSolicitacao?.tipoAtendimento || '';

    const handlePress = () => {
      let destination = 'BalcaoDetalhe';
      if (item.originCollection === 'ouvidoria') destination = 'OuvidoriaDetalhe';
      if (item.originCollection === 'procuradoria-mulher') destination = 'ProcuradoriaDetalhe';
      
      navigation.navigate(destination, { item });
    };

    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <RequestCard statusColor={statusInfo.color}>
          <IconWrapper bgColor={statusInfo.color + '15'}>
            <MaterialCommunityIcons name={getIcon(subTypeDisplay || titleDisplay)} size={24} color={statusInfo.color} />
          </IconWrapper>
          <InfoSection>
            <RequestTitle numberOfLines={1}>{titleDisplay}</RequestTitle>
            {subTypeDisplay ? <Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{subTypeDisplay}</Text> : null}
            <RequestDate>{dateStr}</RequestDate>
            <StatusTag bgColor={statusInfo.color + '20'}>
              <StatusText textColor={statusInfo.color}>{statusInfo.label}</StatusText>
            </StatusTag>
          </InfoSection>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </RequestCard>
        {item.status === 'Agendamento Liberado' && (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 15, marginTop: -10, marginBottom: 15, marginHorizontal: 0, elevation: 1 }}>
             <Text style={{ fontSize: 14, fontWeight: 'bold', color: primaryColor, marginBottom: 5 }}>Realizar Agendamento</Text>
             <Text style={{ fontSize: 12, color: '#666' }}>Sua documentação foi aprovada. Por favor, escolha um horário para o atendimento presencial.</Text>
             <AgendamentoInlineForm solicitacaoId={item.id} />
          </View>
        )}
        {item.status === 'Cancelado' && (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 15, marginTop: 10, marginBottom: 15, elevation: 1 }}>
            <TouchableOpacity
              onPress={() => confirmDeleteRequest(item)}
              disabled={deletingId === item.id}
              style={{
                backgroundColor: '#dc2626',
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
                opacity: deletingId === item.id ? 0.6 : 1
              }}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700' }}>Excluir Solicitação</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Container>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </BackButton>
        <HeaderTitle>Meus Atendimentos</HeaderTitle>
      </Header>

      <ListContainer>
        {loading ? (
          <ActivityIndicator size="large" color={primaryColor} />
        ) : (
          <FlatList
            data={requests}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }}>
                <Text style={{ color: '#888' }}>Nenhum atendimento encontrado.</Text>
              </View>
            }
          />
        )}
      </ListContainer>
    </Container>
  );
}
