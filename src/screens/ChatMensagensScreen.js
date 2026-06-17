import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import {
  PortalBackground,
  PortalHeader,
  PortalHeaderRow,
  PortalTitle,
  PortalTitleGroup,
  PortalSubtitle,
} from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';
import { portalTheme } from '../styles/portalTheme';

const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const SOURCES = [
  { key: 'balcao-cidadao', label: 'Balcão', icon: 'card-account-details-outline', color: portalTheme.primary, detail: 'BalcaoDetalhe' },
  { key: 'ouvidoria', label: 'Ouvidoria', icon: 'bullhorn-outline', color: '#0f766e', detail: 'OuvidoriaDetalhe' },
  { key: 'procuradoria-mulher', label: 'Mulher', icon: 'gender-female', color: '#db2777', detail: 'ProcuradoriaDetalhe' },
];

const HeaderBadge = styled.View`
  width: 42px;
  height: 42px;
  border-radius: 21px;
  align-items: center;
  justify-content: center;
  background-color: rgba(2, 90, 161, 0.1);
  margin-right: 12px;
`;

const List = styled.FlatList`
  flex: 1;
`;

const Content = styled.View`
  padding: 18px;
`;

const ConversationCard = styled.TouchableOpacity`
  background-color: ${portalTheme.card};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${portalTheme.border};
  margin-bottom: 12px;
  padding: 14px;
  shadow-color: #0f172a;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.08;
  shadow-radius: 18px;
  elevation: 3;
`;

const ConversationRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ConversationIcon = styled.View`
  width: 46px;
  height: 46px;
  border-radius: 23px;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.bg || 'rgba(2, 90, 161, 0.1)'};
  margin-right: 12px;
`;

const ConversationInfo = styled.View`
  flex: 1;
`;

const ConversationTitle = styled.Text`
  color: ${portalTheme.text};
  font-size: 15px;
  line-height: 19px;
  font-weight: 900;
`;

const ConversationMeta = styled.Text`
  color: ${portalTheme.muted};
  font-size: 12px;
  font-weight: 800;
  margin-top: 4px;
`;

const LastMessage = styled.Text`
  color: ${portalTheme.muted};
  font-size: 13px;
  line-height: 18px;
  margin-top: 7px;
`;

const EmptyState = styled.View`
  align-items: center;
  padding: 52px 22px;
`;

const EmptyText = styled.Text`
  color: ${portalTheme.muted};
  font-size: 14px;
  line-height: 20px;
  font-weight: 800;
  text-align: center;
  margin-top: 12px;
`;

const ChatContainer = styled.View`
  flex: 1;
`;

const ChatHeaderButton = styled.TouchableOpacity`
  width: 42px;
  height: 42px;
  border-radius: 21px;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border-width: 1px;
  border-color: ${portalTheme.border};
  margin-right: 12px;
`;

const MessagesList = styled.FlatList`
  flex: 1;
`;

const MessageBubble = styled.View`
  max-width: 82%;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.isUser ? portalTheme.primary : '#ffffff'};
  border-width: ${props => props.isUser ? '0' : '1px'};
  border-color: ${portalTheme.border};
  border-radius: 16px;
  padding: 10px 12px;
  margin-bottom: 10px;
`;

const MessageText = styled.Text`
  color: ${props => props.isUser ? '#ffffff' : portalTheme.text};
  font-size: 14px;
  line-height: 20px;
  font-weight: 700;
`;

const MessageTime = styled.Text`
  color: ${props => props.isUser ? 'rgba(255,255,255,0.75)' : portalTheme.subtle};
  font-size: 10px;
  font-weight: 800;
  margin-top: 5px;
  text-align: right;
`;

const InputWrap = styled.View`
  flex-direction: row;
  align-items: flex-end;
  padding: 10px 14px 118px;
  background-color: rgba(248, 251, 255, 0.96);
  border-top-width: 1px;
  border-top-color: ${portalTheme.border};
`;

const ChatInput = styled.TextInput`
  flex: 1;
  min-height: 46px;
  max-height: 120px;
  border-radius: 16px;
  background-color: #ffffff;
  border-width: 1px;
  border-color: ${portalTheme.border};
  padding: 12px 14px;
  color: ${portalTheme.text};
  font-size: 15px;
`;

const SendButton = styled.TouchableOpacity`
  width: 46px;
  height: 46px;
  border-radius: 23px;
  align-items: center;
  justify-content: center;
  margin-left: 10px;
  background-color: ${portalTheme.primary};
  opacity: ${props => props.disabled ? 0.55 : 1};
`;

function getTimestamp(value) {
  if (!value) return 0;
  if (value.toMillis) return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDate(value) {
  const timestamp = getTimestamp(value);
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function normalizeMessages(messages) {
  if (!messages) return [];

  const list = Array.isArray(messages)
    ? messages.map((message, index) => ({ id: String(index), ...message }))
    : Object.entries(messages).map(([id, message]) => ({ id, ...message }));

  return list.sort((a, b) => getTimestamp(a.timestamp || a.createdAt || a.data) - getTimestamp(b.timestamp || b.createdAt || b.data));
}

function getConversationTitle(item) {
  return item.dadosSolicitacao?.assunto ||
    item.dadosManifestacao?.assunto ||
    item.dadosSolicitacao?.descricao ||
    item.dadosManifestacao?.descricao ||
    'Atendimento';
}

export default function ChatMensagensScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [bySource, setBySource] = useState({});
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return undefined;

    const latest = {};
    const apply = () => {
      setBySource({ ...latest });
      setLoading(false);
    };

    const unsubscribes = SOURCES.map((source) => {
      const q = query(
        collection(firestore, source.key),
        where('userId', '==', user.uid),
      );

      return onSnapshot(
        q,
        (snapshot) => {
          latest[source.key] = snapshot.docs
            .map((docSnap) => {
              const data = docSnap.data();
              const messages = normalizeMessages(data.messages);
              const lastMessage = messages[messages.length - 1] || null;

              return {
                ...data,
                id: docSnap.id,
                sourceKey: source.key,
                sourceLabel: source.label,
                sourceIcon: source.icon,
                sourceColor: source.color,
                detailRoute: source.detail,
                messages,
                lastMessage,
                lastMessageAt: getTimestamp(lastMessage?.timestamp || lastMessage?.createdAt || lastMessage?.data),
              };
            })
            .filter((item) => (item.flavorId === flavorId || !item.flavorId) && item.messages.length > 0);

          apply();
        },
        (error) => {
          console.error(`Erro ao carregar conversas de ${source.key}:`, error);
          apply();
        },
      );
    });

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [user]);

  const conversations = useMemo(() => {
    return Object.values(bySource)
      .flat()
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }, [bySource]);

  const selectedFreshConversation = useMemo(() => {
    if (!selectedConversation) return null;
    return conversations.find((item) => item.sourceKey === selectedConversation.sourceKey && item.id === selectedConversation.id) || selectedConversation;
  }, [conversations, selectedConversation]);

  const handleSend = async () => {
    if (!selectedFreshConversation || !messageText.trim()) return;

    setSending(true);
    try {
      const docRef = doc(firestore, selectedFreshConversation.sourceKey, selectedFreshConversation.id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        Alert.alert('Erro', 'A conversa não foi encontrada.');
        return;
      }

      const msgId = Date.now().toString();
      await updateDoc(docRef, {
        [`messages.${msgId}`]: {
          text: messageText.trim(),
          sender: 'user',
          timestamp: new Date().toISOString(),
          userId: user?.uid || 'anonimo',
        },
      });

      setMessageText('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  if (selectedFreshConversation) {
    return (
      <PortalBackground>
        <ChatContainer>
          <PortalHeader compact>
            <PortalHeaderRow>
              <ChatHeaderButton onPress={() => setSelectedConversation(null)} activeOpacity={0.75}>
                <Ionicons name="arrow-back" size={22} color={portalTheme.primary} />
              </ChatHeaderButton>
              <PortalTitleGroup>
                <PortalTitle>{selectedFreshConversation.sourceLabel}</PortalTitle>
                <PortalSubtitle numberOfLines={1}>{getConversationTitle(selectedFreshConversation)}</PortalSubtitle>
              </PortalTitleGroup>
            </PortalHeaderRow>
          </PortalHeader>

          <MessagesList
            data={selectedFreshConversation.messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 18, paddingBottom: 16 }}
            renderItem={({ item }) => {
              const isUser = item.sender === 'user';

              return (
                <MessageBubble isUser={isUser}>
                  <MessageText isUser={isUser}>{item.text || item.message || item.msg || ''}</MessageText>
                  <MessageTime isUser={isUser}>{formatDate(item.timestamp || item.createdAt || item.data)}</MessageTime>
                </MessageBubble>
              );
            }}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <InputWrap>
              <ChatInput
                placeholder="Digite sua mensagem..."
                value={messageText}
                onChangeText={setMessageText}
                multiline
                placeholderTextColor={portalTheme.subtle}
              />
              <SendButton onPress={handleSend} disabled={sending || !messageText.trim()}>
                {sending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Ionicons name="send" size={20} color="#ffffff" />
                )}
              </SendButton>
            </InputWrap>
          </KeyboardAvoidingView>
        </ChatContainer>
      </PortalBackground>
    );
  }

  return (
    <PortalBackground>
      <PortalHeader compact>
        <PortalHeaderRow>
          <HeaderBadge>
            <Ionicons name="chatbubbles-outline" size={22} color={portalTheme.primary} />
          </HeaderBadge>
          <PortalTitleGroup>
            <PortalTitle>Mensagens</PortalTitle>
            <PortalSubtitle>Converse com a equipe sobre seus atendimentos.</PortalSubtitle>
          </PortalTitleGroup>
        </PortalHeaderRow>
      </PortalHeader>

      {loading ? (
        <ActivityIndicator size="large" color={portalTheme.primary} style={{ marginTop: 24 }} />
      ) : (
        <List
          data={conversations}
          keyExtractor={(item) => `${item.sourceKey}-${item.id}`}
          contentContainerStyle={{ paddingBottom: 124 }}
          ListHeaderComponent={<Content />}
          ListEmptyComponent={
            <EmptyState>
              <MaterialCommunityIcons name="message-text-outline" size={40} color={portalTheme.primary} />
              <EmptyText>Nenhuma conversa encontrada. As mensagens aparecerão aqui quando houver retorno em seus atendimentos.</EmptyText>
            </EmptyState>
          }
          renderItem={({ item }) => {
            const text = item.lastMessage?.text || item.lastMessage?.message || item.lastMessage?.msg || '';

            return (
              <Content style={{ paddingTop: 0, paddingBottom: 0 }}>
                <ConversationCard activeOpacity={0.78} onPress={() => setSelectedConversation(item)}>
                  <ConversationRow>
                    <ConversationIcon bg={`${item.sourceColor}18`}>
                      <MaterialCommunityIcons name={item.sourceIcon} size={23} color={item.sourceColor} />
                    </ConversationIcon>
                    <ConversationInfo>
                      <ConversationTitle numberOfLines={1}>{getConversationTitle(item)}</ConversationTitle>
                      <ConversationMeta>{item.sourceLabel} • {formatDate(item.lastMessage?.timestamp || item.lastMessage?.createdAt || item.lastMessage?.data)}</ConversationMeta>
                      <LastMessage numberOfLines={2}>{text || 'Mensagem disponível'}</LastMessage>
                    </ConversationInfo>
                    <Ionicons name="chevron-forward" size={20} color={portalTheme.muted} />
                  </ConversationRow>
                </ConversationCard>
              </Content>
            );
          }}
        />
      )}
    </PortalBackground>
  );
}
