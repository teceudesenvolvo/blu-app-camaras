import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { doc, serverTimestamp as firestoreTimestamp, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { uploadFileToStorage } from '../../services/storageService';
import { AuthContext } from '../context/AuthContext';

const primaryColor = '#a21caf'; // Purple
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
  background-color: ${({ theme }) => theme.portal.card};
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
  background-color: ${({ theme }) => theme.portal.card};
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
  border-bottom-color: #fce7f3;
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
  background-color: ${({ theme }) => theme.portal.card};
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

export default function ProcuradoriaDetalheScreen({ route, navigation }) {
    const { user } = useContext(AuthContext);
    const { item } = route.params;
    const { dadosSolicitacao: initialDados, dadosUsuario, dataSolicitacao: initialData, status: initialStatus, id: solicitacaoId } = item;

    const [status, setStatus] = useState(initialStatus);
    const [dadosSolicitacao, setDadosSolicitacao] = useState(initialDados || {});
    const [rootAnexos, setRootAnexos] = useState(item.anexos || null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [uploading, setUploading] = useState(false);

    const FIELD_LABELS = {
        arquivos_adicionais: "Arquivos Adicionais",
        evidencias: "Evidências",
        documentos: "Documentos",
        anexos: "Anexos"
    };



    useEffect(() => {
        const docRef = doc(firestore, 'procuradoria-mulher', solicitacaoId);

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

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            const docRef = doc(firestore, 'procuradoria-mulher', solicitacaoId);
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
                const folderPath = `${flavorId}/procuradoria-mulher/${user.uid}/anexos`;
                const downloadUrl = await uploadFileToStorage(asset.uri, folderPath);
                
                const newFile = {
                    name: asset.uri.split('/').pop(),
                    type: asset.type || 'image/jpeg',
                    url: downloadUrl,
                    data: downloadUrl,
                    uri: downloadUrl
                };

                const fsDocRef = doc(firestore, 'procuradoria-mulher', solicitacaoId);
                const currentDoc = await getDoc(fsDocRef);
                const currentData = currentDoc.data();
                const currentAnexos = currentData.dadosSolicitacao?.anexos || currentData.anexos || {};

                let updatedFieldFiles = [newFile];
                
                // Tratar se anexos antigos forem array
                if (Array.isArray(currentAnexos)) {
                    updatedFieldFiles = [...currentAnexos, newFile];
                    await updateDoc(fsDocRef, {
                        anexos: updatedFieldFiles,
                        ultimaAtualizacao: firestoreTimestamp(),
                        status: 'Documentação Reenviada'
                    });
                } else {
                    if (fieldKey === 'arquivos_adicionais' || currentAnexos[fieldKey]) {
                        updatedFieldFiles = [...(currentAnexos[fieldKey] || []), newFile];
                    }
                    await updateDoc(fsDocRef, {
                        [`dadosSolicitacao.anexos.${fieldKey}`]: updatedFieldFiles,
                        ultimaAtualizacao: firestoreTimestamp(),
                        status: 'Documentação Reenviada'
                    });
                }

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
            case 'Recebida': return '#a21caf';
            case 'Pendente': return '#f9c204';
            case 'Cancelado': return '#dc2626';
            default: return '#666';
        }
    };

    const formatDate = (ts) => {
        if (!ts) return 'Enviando...';
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
                <HeaderTitle>Detalhes do Atendimento</HeaderTitle>
            </Header>

            <Content showsVerticalScrollIndicator={false}>
                <Section>
                    <SectionTitle>Status da Solicitação</SectionTitle>
                    <InfoRow>
                        <Label>Situação Atual</Label>
                        <StatusBadge bgColor={getStatusColor(status)}>
                            <StatusText>{status || 'Aguardando'}</StatusText>
                        </StatusBadge>
                    </InfoRow>
                    <InfoRow>
                        <Label>Data de Envio</Label>
                        <Value>{formatDate(initialData || item.createdAt)}</Value>
                    </InfoRow>
                </Section>

                <Section>
                    <SectionTitle>Dados do Atendimento</SectionTitle>
                    <InfoRow>
                        <Label>Tipo de Atendimento</Label>
                        <Value>{dadosSolicitacao?.tipoAtendimento || item.tipo || 'N/A'}</Value>
                    </InfoRow>
                    {dadosSolicitacao?.tipoViolencia ? (
                        <InfoRow>
                            <Label>Tipo de Violência</Label>
                            <Value>{dadosSolicitacao.tipoViolencia}</Value>
                        </InfoRow>
                    ) : null}
                    <InfoRow>
                        <Label>Assunto</Label>
                        <Value>{dadosSolicitacao?.assunto || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Data do Fato</Label>
                        <Value>{dadosSolicitacao?.dataFato || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Descrição</Label>
                        <Value>{dadosSolicitacao?.descricao || item.descricao || 'N/A'}</Value>
                    </InfoRow>
                    {dadosSolicitacao?.nomeAgressor ? (
                        <InfoRow>
                            <Label>Nome do Acusado</Label>
                            <Value>{dadosSolicitacao.nomeAgressor}</Value>
                        </InfoRow>
                    ) : null}
                    {dadosSolicitacao?.relacaoAgressor ? (
                        <InfoRow>
                            <Label>Relação com o Acusado</Label>
                            <Value>{dadosSolicitacao.relacaoAgressor}</Value>
                        </InfoRow>
                    ) : null}
                </Section>

                {dadosSolicitacao?.identificacao === 'anonimo' && (
                    <Section>
                        <SectionTitle>Detalhes da Ocorrência (Anônimo)</SectionTitle>
                        <InfoRow>
                            <Label>Relação com a Vítima</Label>
                            <Value>{dadosSolicitacao.relacaoVitima || 'N/A'}</Value>
                        </InfoRow>
                        <InfoRow>
                            <Label>Endereço</Label>
                            <Value>{dadosSolicitacao.enderecoAcontecimento || 'N/A'}</Value>
                        </InfoRow>
                        <InfoRow>
                            <Label>Ponto de Referência</Label>
                            <Value>{dadosSolicitacao.pontoReferencia || 'N/A'}</Value>
                        </InfoRow>
                    </Section>
                )}

                <Section>
                    <SectionTitle>Identificação</SectionTitle>
                    <InfoRow>
                        <Label>Modo de Identificação</Label>
                        <Value>{dadosUsuario?.identificacao || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Nome</Label>
                        <Value>{dadosUsuario?.name || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>CPF</Label>
                        <Value>{dadosUsuario?.cpf || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Telefone</Label>
                        <Value>{dadosUsuario?.phone || 'N/A'}</Value>
                    </InfoRow>
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

                {( (dadosSolicitacao?.anexos && Object.keys(dadosSolicitacao.anexos).length > 0) || (rootAnexos && (Array.isArray(rootAnexos) ? rootAnexos.length > 0 : Object.keys(rootAnexos).length > 0)) ) && (
                    <Section>
                        <SectionTitle>Documentação e Anexos</SectionTitle>
                        {Object.entries(
                            dadosSolicitacao?.anexos || 
                            (Array.isArray(rootAnexos) ? { anexos: rootAnexos } : rootAnexos) || {}
                        ).map(([field, files]) => {
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

                {(!(dadosSolicitacao?.anexos?.arquivos_adicionais || (rootAnexos && !Array.isArray(rootAnexos) && rootAnexos.arquivos_adicionais))) && (
                    <Section>
                        <UploadButton onPress={() => handleFileUpdate('arquivos_adicionais')} disabled={uploading} style={{ backgroundColor: '#e5e7eb', padding: 12, borderRadius: 8, width: '100%', justifyContent: 'center' }}>
                            {uploading ? <ActivityIndicator size="small" color="#666" /> : <Ionicons name="add-circle-outline" size={20} color="#374151" />}
                            <UploadButtonText style={{ fontSize: 14 }}>{uploading ? 'Enviando...' : 'Anexar Outros Arquivos'}</UploadButtonText>
                        </UploadButton>
                    </Section>
                )}

                <View style={{ height: 40 }} />
            </Content>
        </Container>
    );
}
