import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import {
    get,
    getDatabase,
    onValue, push,
    ref,
    serverTimestamp,
    set,
    update
} from 'firebase/database';
import { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import styled from 'styled-components/native';
import app from '../../services/firebaseConfig';
import { AuthContext } from '../context/AuthContext';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const backgroundColor = Constants.expoConfig?.extra?.theme?.background || '#f0f2f5';
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Container = styled.View`
  flex: 1;
  background-color: ${backgroundColor};
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 50px 20px 20px 20px;
  background-color: #fff;
  border-bottom-width: 1px;
  border-bottom-color: #eee;
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

const Content = styled.ScrollView`
  flex: 1;
  padding: 20px;
`;

const Section = styled.View`
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
  elevation: 2;
`;

const SectionTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: ${primaryColor};
  margin-bottom: 15px;
  border-bottom-width: 1px;
  border-bottom-color: #f0f0f0;
  padding-bottom: 8px;
`;

const InfoRow = styled.View`
  margin-bottom: 12px;
`;

const Label = styled.Text`
  font-size: 12px;
  color: #888;
  margin-bottom: 2px;
  text-transform: uppercase;
`;

const Value = styled.Text`
  font-size: 15px;
  color: #333;
  font-weight: 500;
`;

const StatusBadge = styled.View`
  background-color: ${props => props.bgColor || '#e0e0e0'};
  padding: 6px 12px;
  border-radius: 6px;
  align-self: flex-start;
  margin-top: 5px;
`;

const StatusText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 12px;
`;

const AttachmentContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 10px;
`;

const AttachmentImage = styled.Image`
  width: 100px;
  height: 100px;
  border-radius: 8px;
  margin-right: 10px;
  margin-bottom: 10px;
  background-color: #eee;
`;

// Estilos para Chat
const MessageBubble = styled.View`
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 10px;
  max-width: 85%;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.isUser ? primaryColor : '#f0f0f0'};
`;

const MessageText = styled.Text`
  color: ${props => props.isUser ? '#fff' : '#333'};
  font-size: 14px;
`;

const MessageTime = styled.Text`
  color: ${props => props.isUser ? 'rgba(255,255,255,0.7)' : '#888'};
  font-size: 10px;
  margin-top: 4px;
  align-self: flex-end;
`;

const InputRow = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #fff;
  border-radius: 25px;
  padding: 5px 15px;
  margin-top: 10px;
  border-width: 1px;
  border-color: #ddd;
`;

const ChatInput = styled.TextInput`
  flex: 1;
  padding: 10px;
  font-size: 15px;
`;

// Estilos para Agendamento
const SlotContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 10px;
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

export default function BalcaoDetalheScreen({ route, navigation }) {
    const { user } = useContext(AuthContext);
    const { item } = route.params;
    const { dadosSolicitacao, userName, userPhone, tipo, status: currentStatus, createdAt, id: solicitacaoId } = item;

    const [status, setStatus] = useState(currentStatus);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    // Agendamento states
    const [appointmentDate, setAppointmentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [appointmentTime, setAppointmentTime] = useState('');
    const [availability, setAvailability] = useState(null);
    const [bookedSlots, setBookedSlots] = useState({});
    const [blockedDates, setBlockedDates] = useState([]);
    const [availableTimes, setAvailableTimes] = useState([]);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [scheduling, setScheduling] = useState(false);

    const db = getDatabase(app);

    // 1. Escutar mensagens e status em tempo real
    useEffect(() => {
        const statusRef = ref(db, `${flavorId}/balcao-cidadao/${solicitacaoId}/status`);
        const messagesRef = ref(db, `${flavorId}/balcao-cidadao/${solicitacaoId}/messages`);

        const unsubStatus = onValue(statusRef, (snap) => {
            if (snap.exists()) setStatus(snap.val());
        });

        const unsubMessages = onValue(messagesRef, (snap) => {
            if (snap.exists()) {
                const msgsList = Object.values(snap.val()).sort((a, b) => a.timestamp - b.timestamp);
                setMessages(msgsList);
            }
        });

        return () => {
            unsubStatus();
            unsubMessages();
        };
    }, [solicitacaoId]);

    // 2. Fetch Config Agendamento
    useEffect(() => {
        if (status === 'Agendamento Liberado') {
            fetchAgendamentoConfig();
        }
    }, [status]);

    const fetchAgendamentoConfig = async () => {
        setLoadingConfig(true);
        try {
            const availRef = ref(db, `${flavorId}/balcao-config/availability`);
            const bookedRef = ref(db, `${flavorId}/balcao-config/bookedSlots`);
            const blockedRef = ref(db, `${flavorId}/balcao-config/blockedDates`);

            const [availSnap, bookedSnap, blockedSnap] = await Promise.all([
                get(availRef), get(bookedRef), get(blockedRef)
            ]);

            if (availSnap.exists()) setAvailability(availSnap.val());
            if (bookedSnap.exists()) setBookedSlots(bookedSnap.val());

            let manualBlocked = [];
            if (blockedSnap.exists()) manualBlocked = blockedSnap.val() || [];

            // BrasilAPI Holidays
            const currentYear = new Date().getFullYear();
            const years = [currentYear, currentYear + 1];
            let holidays = [];

            for (const year of years) {
                try {
                    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
                    if (res.ok) {
                        const data = await res.json();
                        const formatted = data.map(h => {
                            const [y, m, d] = h.date.split('-');
                            return `${d}/${m}/${y}`;
                        });
                        holidays = [...holidays, ...formatted];
                    }
                } catch (e) { console.error(e); }

                // Municipal Paraipaba
                holidays.push(`05/02/${year}`); // Emancipação
                holidays.push(`01/11/${year}`); // Padroeira
                holidays.push(`19/03/${year}`); // São José
            }

            setBlockedDates([...new Set([...manualBlocked, ...holidays])]);
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
        } finally {
            setLoadingConfig(false);
        }
    };

    // 3. Atualizar horários quando a data muda
    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setAppointmentDate(selectedDate);
            updateAvailableTimes(selectedDate);
        }
    };

    const updateAvailableTimes = (date) => {
        if (!availability) return;

        const dateBR = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        const dateISO = date.toISOString().split('T')[0];

        if (blockedDates.includes(dateBR)) {
            setAvailableTimes([]);
            Alert.alert("Data Indisponível", "Este dia não está disponível para agendamento (feriado ou bloqueado).");
            return;
        }

        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const allSlots = availability[dayOfWeek] ? Object.values(availability[dayOfWeek]) : [];
        const booked = bookedSlots[dateISO] || [];

        const freeSlots = allSlots.filter(s => !booked.includes(s));
        setAvailableTimes(freeSlots);
        setAppointmentTime('');
    };

    // 4. Confirmar Agendamento
    const handleScheduleSubmit = async () => {
        if (!appointmentTime) {
            Alert.alert("Atenção", "Por favor, selecione um horário.");
            return;
        }

        setScheduling(true);
        try {
            const dateISO = appointmentDate.toISOString().split('T')[0];
            const solicitacaoRef = ref(db, `${flavorId}/balcao-cidadao/${solicitacaoId}`);
            const bookedSlotRef = ref(db, `${flavorId}/balcao-config/bookedSlots/${dateISO}`);

            // Check race condition
            const snap = await get(bookedSlotRef);
            const existing = snap.val() || [];
            if (existing.includes(appointmentTime)) {
                Alert.alert("Erro", "Este horário acaba de ser ocupado. Por favor, escolha outro.");
                setScheduling(false);
                updateAvailableTimes(appointmentDate);
                return;
            }

            await update(solicitacaoRef, {
                status: 'Agendado',
                appointmentDate: appointmentDate.toLocaleDateString('pt-BR'),
                appointmentTime: appointmentTime
            });
            await set(bookedSlotRef, [...existing, appointmentTime]);

            Alert.alert("Sucesso", "Agendamento confirmado!");
        } catch (error) {
            console.error(error);
            Alert.alert("Erro", "Não foi possível confirmar o agendamento.");
        } finally {
            setScheduling(false);
        }
    };

    // 5. Chat Logic
    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            const messagesRef = ref(db, `${flavorId}/balcao-cidadao/${solicitacaoId}/messages`);
            const newMsgRef = push(messagesRef);
            await set(newMsgRef, {
                text: newMessage,
                sender: 'user',
                timestamp: serverTimestamp(),
                userId: user.uid
            });
            setNewMessage('');
        } catch (error) {
            console.error(error);
            Alert.alert("Erro", "Não foi possível enviar a mensagem.");
        }
    };

    const getStatusColor = (s) => {
        switch (s) {
            case 'Concluído': return '#2e7d32';
            case 'Pendente': return '#f9c204';
            case 'Agendamento Liberado': return '#004a99';
            case 'Agendado': return '#2e7d32';
            case 'Cancelado': return '#dc2626';
            default: return '#666';
        }
    };

    const formatDate = (ts) => {
        if (!ts) return 'N/A';
        return new Date(ts).toLocaleString('pt-BR');
    };

    return (
        <Container>
            <Header>
                <BackButton onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </BackButton>
                <HeaderTitle>Detalhes da Solicitação</HeaderTitle>
            </Header>

            <Content showsVerticalScrollIndicator={false}>
                <Section>
                    <SectionTitle>Status</SectionTitle>
                    <InfoRow>
                        <Label>Situação Atual</Label>
                        <StatusBadge bgColor={getStatusColor(status)}>
                            <StatusText>{status || 'Pendente'}</StatusText>
                        </StatusBadge>
                    </InfoRow>
                    <InfoRow>
                        <Label>Data de Envio</Label>
                        <Value>{formatDate(createdAt)}</Value>
                    </InfoRow>
                    {status === 'Agendado' && (
                        <View style={{ marginTop: 10, padding: 10, backgroundColor: '#f0f9ff', borderRadius: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0369a1' }}>
                                <Ionicons name="calendar-outline" size={16} /> Agendado para:
                            </Text>
                            <Text style={{ fontSize: 14, color: '#0369a1' }}>
                                {item.appointmentDate} às {item.appointmentTime}
                            </Text>
                        </View>
                    )}
                </Section>

                {status === 'Agendamento Liberado' && (
                    <Section>
                        <SectionTitle>Realizar Agendamento</SectionTitle>
                        {loadingConfig ? (
                            <ActivityIndicator color={primaryColor} />
                        ) : (
                            <>
                                <Label>Selecione a Data</Label>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    style={{ padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between' }}
                                >
                                    <Text>{appointmentDate.toLocaleDateString('pt-BR')}</Text>
                                    <Ionicons name="calendar" size={20} color={primaryColor} />
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={appointmentDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onDateChange}
                                        minimumDate={new Date()}
                                    />
                                )}

                                <Label>Selecione o Horário</Label>
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
                                        <Text style={{ color: '#888', fontStyle: 'italic', fontSize: 13 }}>
                                            Nenhum horário disponível para esta data.
                                        </Text>
                                    )}
                                </SlotContainer>

                                <TouchableOpacity
                                    onPress={handleScheduleSubmit}
                                    disabled={scheduling || !appointmentTime}
                                    style={{
                                        backgroundColor: primaryColor,
                                        padding: 15,
                                        borderRadius: 8,
                                        marginTop: 15,
                                        alignItems: 'center',
                                        opacity: (!appointmentTime || scheduling) ? 0.6 : 1
                                    }}
                                >
                                    {scheduling ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirmar Agendamento</Text>}
                                </TouchableOpacity>
                            </>
                        )}
                    </Section>
                )}

                <Section>
                    <SectionTitle>Dados do Serviço</SectionTitle>
                    <InfoRow>
                        <Label>Serviço</Label>
                        <Value>{tipo || 'Balcão do Cidadão'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Nome do Solicitante</Label>
                        <Value>{userName || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Telefone</Label>
                        <Value>{userPhone || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Assunto</Label>
                        <Value>{tipo || 'N/A'}</Value>
                    </InfoRow>
                    {dadosSolicitacao?.descricao && (
                        <InfoRow>
                            <Label>Descrição</Label>
                            <Value>{dadosSolicitacao.descricao}</Value>
                        </InfoRow>
                    )}
                </Section>

                <Section>
                    <SectionTitle>Mensagens</SectionTitle>
                    <View style={{ minHeight: 100 }}>
                        {messages.length > 0 ? (
                            messages.map((msg, index) => (
                                <MessageBubble key={index} isUser={msg.sender === 'user'}>
                                    <MessageText isUser={msg.sender === 'user'}>{msg.text}</MessageText>
                                    <MessageTime isUser={msg.sender === 'user'}>
                                        {new Date(msg.timestamp).toLocaleString('pt-BR')}
                                    </MessageTime>
                                </MessageBubble>
                            ))
                        ) : (
                            <Text style={{ color: '#888', textAlign: 'center', marginVertical: 20 }}>Nenhuma mensagem trocada.</Text>
                        )}
                    </View>

                    <InputRow>
                        <ChatInput
                            placeholder="Digite sua mensagem..."
                            value={newMessage}
                            onChangeText={setNewMessage}
                            multiline
                        />
                        <TouchableOpacity onPress={handleSendMessage}>
                            <Ionicons name="send" size={24} color={primaryColor} />
                        </TouchableOpacity>
                    </InputRow>
                </Section>

                {item.dadosSolicitacao?.anexos && (
                    <Section>
                        <SectionTitle>Anexos</SectionTitle>
                        <AttachmentContainer>
                            {/* Flattening attachments logic */}
                            {Object.values(item.dadosSolicitacao.anexos).flat().map((anexo, index) => (
                                <AttachmentImage
                                    key={index}
                                    source={{ uri: anexo.data || anexo.uri }}
                                    resizeMode="cover"
                                />
                            ))}
                        </AttachmentContainer>
                    </Section>
                )}

                <View style={{ height: 40 }} />
            </Content>
        </Container>
    );
}
