import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { doc, serverTimestamp as firestoreTimestamp, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
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
import { firestore } from '../../services/firebaseConfig';
import { uploadFileToStorage } from '../../services/storageService';
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

const FileCard = styled.View`
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
  border-width: 1px;
  border-color: #e5e7eb;
`;

const FileCardTitle = styled.Text`
  font-size: 13px;
  color: #4b5563;
  font-weight: bold;
  margin-bottom: 5px;
`;

const UploadButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: #e5e7eb;
  padding: 6px 12px;
  border-radius: 6px;
  align-self: flex-start;
  margin-top: 8px;
`;

const UploadButtonText = styled.Text`
  font-size: 12px;
  color: #374151;
  margin-left: 5px;
`;

const AttachmentImage = styled.Image`
  width: 100%;
  height: 200px;
  border-radius: 8px;
  margin-bottom: 10px;
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
    const { userName, userPhone, tipo, status: currentStatus, createdAt, id: solicitacaoId } = item;

    const [status, setStatus] = useState(currentStatus);
    const [dadosSolicitacao, setDadosSolicitacao] = useState(item.dadosSolicitacao || {});
    const [rootAnexos, setRootAnexos] = useState(item.anexos || null);
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
    const [uploading, setUploading] = useState(false);

    const FIELD_LABELS = {
        cin_certidao: "Certidão de Nascimento/Casamento",
        cin_responsavel: "Documento do Responsável",
        cpf_identidade: "Documento de Identidade (RG/CNH)",
        cpf_estado_civil: "Comprovante de Estado Civil",
        cpf_selfie: "Selfie com Documento",
        cpf_residencia: "Comprovante de Residência",
        arquivos_adicionais: "Arquivos Adicionais"
    };

    useEffect(() => {
        const docRef = doc(firestore, 'balcao-cidadao', solicitacaoId);

        const unsubStatus = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStatus(data.status);
                setDadosSolicitacao(data.dadosSolicitacao || {});
                if (data.anexos) {
                    setRootAnexos(data.anexos);
                }

                // Carregar mensagens do mapa 'messages' dentro do documento (padrão web)
                if (data.messages) {
                    let msgsList = [];
                    if (Array.isArray(data.messages)) {
                        msgsList = data.messages.map((m, i) => ({ id: i.toString(), ...m }));
                    } else {
                        msgsList = Object.entries(data.messages).map(([id, msg]) => ({
                            id,
                            ...msg
                        }));
                    }

                    msgsList.sort((a, b) => {
                        const getTime = (obj) => {
                            const ts = obj.timestamp || obj.createdAt || obj.data;
                            if (!ts) return Date.now();
                            if (ts.toMillis) return ts.toMillis();
                            if (ts.seconds) return ts.seconds * 1000;
                            const d = new Date(typeof ts === 'number' ? ts : ts).getTime();
                            return isNaN(d) ? 0 : d;
                        };
                        return getTime(a) - getTime(b);
                    });
                    setMessages(msgsList);
                }
            }
        });

        return () => {
            unsubStatus();
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

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dateISO = `${date.getFullYear()}-${month}-${day}`;
        const dateBR = `${day}/${month}/${date.getFullYear()}`;

        if (blockedDates.includes(dateBR)) {
            setAvailableTimes([]);
            Alert.alert("Data Indisponível", "Este dia não está disponível para agendamento (feriado ou bloqueado).");
            return;
        }

        // Dia da semana em inglês para bater com o portal web
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        const allSlots = availability[dayOfWeek] || [];
        const bookedObj = bookedSlots[dateISO] || [];
        const booked = Array.isArray(bookedObj) ? bookedObj : Object.keys(bookedObj);

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
            const day = String(appointmentDate.getDate()).padStart(2, '0');
            const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
            const dateISO = `${appointmentDate.getFullYear()}-${month}-${day}`;
            const configRef = doc(firestore, 'balcao-config', 'bookedSlots');

            // Check race condition
            const configSnap = await getDoc(configRef);
            let existing = [];
            if (configSnap.exists()) {
                const data = configSnap.data();
                existing = Array.isArray(data[dateISO]) ? data[dateISO] : (data[dateISO] ? Object.keys(data[dateISO]) : []);
            }

            if (existing.includes(appointmentTime)) {
                Alert.alert("Erro", "Este horário acaba de ser ocupado. Por favor, escolha outro.");
                setScheduling(false);
                updateAvailableTimes(appointmentDate);
                return;
            }

            // Update Config usando array como o portal web
            await updateDoc(configRef, {
                [dateISO]: [...existing, appointmentTime]
            });

            // Update Document
            const fsDocRef = doc(firestore, 'balcao-cidadao', solicitacaoId);
            await updateDoc(fsDocRef, {
                status: 'Agendado',
                appointmentDate: appointmentDate.toLocaleDateString('pt-BR'),
                appointmentTime: appointmentTime
            });

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
            const docRef = doc(firestore, 'balcao-cidadao', solicitacaoId);
            const msgId = Date.now().toString();

            const docSnap = await getDoc(docRef); // Verifica se o documento existe
            if (!docSnap.exists()) {
                Alert.alert("Erro", "A solicitação não foi encontrada ou foi removida. Não é possível enviar a mensagem.");
                return;
            }

            await updateDoc(docRef, {
                [`messages.${msgId}`]: {
                    text: newMessage,
                    sender: 'user',
                    timestamp: new Date().toISOString(), // Padrão ISO igual ao web
                    userId: user?.uid || 'anonimo'
                }
            });
            setNewMessage('');
        } catch (error) {
            console.error(error);
            Alert.alert("Erro", "Não foi possível enviar a mensagem.");
        }
    };


    const handleFileUpdate = async (fieldKey) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.5,
        });

        if (!result.canceled) {
            setUploading(true);
            try {
                const asset = result.assets[0];
                const folderPath = `${flavorId}/balcao-cidadao/${user.uid}/anexos`;
                const downloadUrl = await uploadFileToStorage(asset.uri, folderPath);

                const newFile = {
                    name: asset.uri.split('/').pop(),
                    type: asset.type || 'image/jpeg',
                    url: downloadUrl,
                    data: downloadUrl,
                    uri: downloadUrl
                };

                const fsDocRef = doc(firestore, 'balcao-cidadao', solicitacaoId);
                const currentDoc = await getDoc(fsDocRef);
                const currentAnexos = currentDoc.data().dadosSolicitacao?.anexos || {};

                let updatedFieldFiles = [newFile];
                if (fieldKey === 'arquivos_adicionais') {
                    updatedFieldFiles = [...(currentAnexos.arquivos_adicionais || []), newFile];
                }

                await updateDoc(fsDocRef, {
                    [`dadosSolicitacao.anexos.${fieldKey}`]: updatedFieldFiles,
                    ultimaAtualizacao: firestoreTimestamp(),
                    status: 'Documentação Reenviada',
                    deletionTimestamp: null
                });

                Alert.alert("Sucesso", "Arquivo atualizado com sucesso!");
            } catch (error) {
                console.error("Erro ao fazer upload:", error);
                Alert.alert("Erro", "Falha ao enviar arquivo.");
            } finally {
                setUploading(false);
            }
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
        let date;
        if (typeof ts === 'object' && ts.toDate) {
            date = ts.toDate();
        } else if (typeof ts === 'object' && ts.seconds) {
            date = new Date(ts.seconds * 1000);
        } else if (typeof ts === 'number' || (typeof ts === 'string' && !isNaN(Number(ts)))) {
            // Trata timestamps numéricos (ms) vindos do RTDB/Migração
            date = new Date(Number(ts));
        } else {
            date = new Date(ts);
        }
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString('pt-BR');
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

                {item.dadosBeneficiario && (
                    <Section>
                        <SectionTitle>Beneficiário do Atendimento</SectionTitle>
                        <InfoRow>
                            <Label>Nome</Label>
                            <Value>{item.dadosBeneficiario.name || 'N/A'}</Value>
                        </InfoRow>
                        <InfoRow>
                            <Label>Grau de Parentesco</Label>
                            <Value>{item.dadosBeneficiario.parentesco || 'N/A'}</Value>
                        </InfoRow>
                        {item.dadosBeneficiario.cpf && (
                            <InfoRow>
                                <Label>CPF</Label>
                                <Value>{item.dadosBeneficiario.cpf}</Value>
                            </InfoRow>
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
                                <MessageBubble key={msg.id || index} isUser={msg.sender === 'user'}>
                                    <MessageText isUser={msg.sender === 'user'}>{msg.text || msg.message || msg.msg || ''}</MessageText>
                                    <MessageTime isUser={msg.sender === 'user'}>
                                        {formatDate(msg.timestamp || msg.createdAt || msg.data)}
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
                {(!(dadosSolicitacao?.anexos?.arquivos_adicionais || rootAnexos?.arquivos_adicionais)) && (
                    <Section>
                        <UploadButton onPress={() => handleFileUpdate('arquivos_adicionais')} disabled={uploading} style={{ backgroundColor: '#e5e7eb', padding: 12, borderRadius: 8, width: '100%', justifyContent: 'center' }}>
                            {uploading ? <ActivityIndicator size="small" color="#666" /> : <Ionicons name="add-circle-outline" size={20} color="#374151" />}
                            <UploadButtonText style={{ fontSize: 14 }}>{uploading ? 'Enviando...' : 'Anexar Outros Arquivos'}</UploadButtonText>
                        </UploadButton>
                    </Section>
                )}

                {((dadosSolicitacao?.anexos && Object.keys(dadosSolicitacao.anexos).length > 0) || rootAnexos) && (
                    <Section>
                        <SectionTitle>Documentação e Anexos</SectionTitle>
                        {Object.entries(dadosSolicitacao?.anexos || rootAnexos || {}).map(([field, files]) => {
                            // files pode ser um array de arquivos ou um único arquivo em dados legados
                            const filesArray = Array.isArray(files) ? files : [files];
                            return (
                                <FileCard key={field}>
                                    <FileCardTitle>{FIELD_LABELS[field] || field}:</FileCardTitle>
                                    {filesArray.map((anexo, idx) => {
                                        if (!anexo) return null;

                                        const uri = typeof anexo === 'string' ? anexo : (anexo.url || anexo.data || anexo.uri);
                                        const fileName = typeof anexo === 'string' ? 'Arquivo' : (anexo.name || 'Arquivo Anexado');

                                        if (!uri) return <Text key={idx} style={{ color: 'red' }}>Erro: URI inválida</Text>;

                                        return (
                                            <View key={idx}>
                                                <AttachmentImage
                                                    source={{ uri }}
                                                    resizeMode="contain"
                                                />
                                                <Text style={{ fontSize: 12, color: '#2563eb', marginBottom: 5 }}>
                                                    <Ionicons name="document-attach" /> {fileName}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                    <UploadButton onPress={() => handleFileUpdate(field)} disabled={uploading}>
                                        {uploading ? <ActivityIndicator size="small" color="#666" /> : <Ionicons name="cloud-upload-outline" size={16} color="#374151" />}
                                        <UploadButtonText>{uploading ? 'Enviando...' : 'Substituir Arquivo'}</UploadButtonText>
                                    </UploadButton>
                                </FileCard>
                            );
                        })}
                    </Section>
                )}



                <View style={{ height: 40 }} />
            </Content>
        </Container>
    );
}
