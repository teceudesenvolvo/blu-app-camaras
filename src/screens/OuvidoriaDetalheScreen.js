import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useState, useEffect, useContext } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { 
  getDatabase, ref, onValue, push, set, serverTimestamp 
} from 'firebase/database';
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

export default function OuvidoriaDetalheScreen({ route, navigation }) {
    const { user } = useContext(AuthContext);
    const { item } = route.params;
    const { dadosManifestacao, dadosUsuario, dataManifestacao: initialData, status: initialStatus, id: solicitacaoId } = item;

    // Anexos podem estar no topo (antigo) ou dentro de dadosManifestacao (novo)
    const anexos = dadosManifestacao?.anexos || item.anexos || [];

    const [status, setStatus] = useState(initialStatus);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    const db = getDatabase(app);

    useEffect(() => {
        const statusRef = ref(db, `${flavorId}/ouvidoria/${solicitacaoId}/status`);
        const messagesRef = ref(db, `${flavorId}/ouvidoria/${solicitacaoId}/messages`);

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

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            const messagesRef = ref(db, `${flavorId}/ouvidoria/${solicitacaoId}/messages`);
            const newMsgRef = push(messagesRef);
            await set(newMsgRef, {
                text: newMessage,
                sender: 'user',
                timestamp: serverTimestamp(),
                userId: user?.uid || 'anonimo'
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
            case 'Recebida': return '#004a99';
            case 'Pendente': return '#f9c204';
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
                <HeaderTitle>Detalhes da Ouvidoria</HeaderTitle>
            </Header>

            <Content showsVerticalScrollIndicator={false}>
                <Section>
                    <SectionTitle>Status da Manifestação</SectionTitle>
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
                    <SectionTitle>Dados da Manifestação</SectionTitle>
                    <InfoRow>
                        <Label>Tipo</Label>
                        <Value>{dadosManifestacao?.tipoManifestacao || item.tipo || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Assunto</Label>
                        <Value>{dadosManifestacao?.assunto || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Data do Fato</Label>
                        <Value>{dadosManifestacao?.dataFato || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Local do Fato</Label>
                        <Value>{dadosManifestacao?.localFato || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Envolvidos</Label>
                        <Value>{dadosManifestacao?.envolvidos || 'N/A'}</Value>
                    </InfoRow>
                    <InfoRow>
                        <Label>Descrição</Label>
                        <Value>{dadosManifestacao?.descricao || item.descricao || 'N/A'}</Value>
                    </InfoRow>
                </Section>

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

                {anexos && anexos.length > 0 && (
                    <Section>
                        <SectionTitle>Anexos</SectionTitle>
                        <AttachmentContainer>
                            {anexos.map((anexo, index) => (
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
