import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { AuthContext } from '../context/AuthContext';
import { useMobileModules } from '../context/MobileModulesContext';
import { PortalBackground, PortalHeader, PortalHeaderRow, PortalSubtitle, PortalTitle, PortalTitleGroup } from '../components/PortalScaffold';

const AREAS = [
  { id: 'balcao', label: 'Balcão', collection: 'balcao-cidadao', subject: ['dadosSolicitacao', 'assunto'], date: 'dataSolicitacao', color: '#0369a1' },
  { id: 'ouvidoria', label: 'Ouvidoria', collection: 'ouvidoria', subject: ['dadosManifestacao', 'assunto'], date: 'dataManifestacao', color: '#0f766e' },
  { id: 'procuradoria', label: 'Procuradoria', collection: 'procuradoria-mulher', subject: ['dadosSolicitacao', 'assunto'], date: 'dataSolicitacao', color: '#db2777' },
];
const get = (value, path) => path.reduce((current, key) => current?.[key], value);
const time = value => value?.toMillis?.() || value?.seconds * 1000 || (value ? new Date(value).getTime() : 0) || 0;
const messagesOf = value => Array.isArray(value) ? value.map((item, index) => ({ id: String(index), ...item })) : Object.entries(value || {}).map(([id, item]) => ({ id, ...item }));
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(item => item[0]).join('').toUpperCase() || '?';
const dateLabel = value => { const stamp = time(value); return stamp ? new Date(stamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''; };

const HeaderIcon = styled.View`width: 42px; height: 42px; border-radius: 21px; align-items: center; justify-content: center; background-color: ${({ theme }) => `${theme.portal.primary}18`}; margin-right: 12px;`;
const Body = styled.View`flex: 1; flex-direction: row; padding: 14px 18px 112px; gap: 14px;`;
const Sidebar = styled.View`width: 42%; max-width: 300px;`;
const AreaTabs = styled.ScrollView.attrs({ contentContainerStyle: { alignItems: 'center' } })`height: 52px; flex-grow: 0; margin-bottom: 10px;`;
const Tab = styled.TouchableOpacity`height: 42px; align-self: center; justify-content: center; padding: 0 15px; border-radius: 12px; background-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.card}; border-width: 1px; border-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.border}; margin-right: 7px;`;
const TabText = styled.Text`color: ${({ active, theme }) => active ? '#fff' : theme.portal.text}; font-size: 12px; font-weight: 900;`;
const FilterRow = styled.View`flex-direction: row; gap: 6px; margin-bottom: 10px;`;
const Filter = styled.TouchableOpacity`flex: 1; padding: 8px 4px; border-radius: 10px; align-items: center; background-color: ${({ active, theme }) => active ? `${theme.portal.primary}20` : theme.portal.card}; border-width: 1px; border-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.border};`;
const FilterText = styled.Text`color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.muted}; font-size: 10px; font-weight: 900;`;
const Thread = styled.TouchableOpacity`padding: 11px; border-radius: 14px; background-color: ${({ active, theme }) => active ? `${theme.portal.primary}16` : theme.portal.card}; border-width: 1px; border-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.border}; margin-bottom: 8px;`;
const ThreadRow = styled.View`flex-direction: row; align-items: center;`;
const Avatar = styled.View`width: 38px; height: 38px; border-radius: 19px; align-items: center; justify-content: center; background-color: ${({ color }) => `${color || '#0369a1'}25`}; margin-right: 9px;`;
const AvatarText = styled.Text`color: ${({ color }) => color || '#0369a1'}; font-size: 12px; font-weight: 900;`;
const ThreadInfo = styled.View`flex: 1;`;
const ThreadName = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 13px; font-weight: 900;`;
const ThreadPreview = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 11px; margin-top: 3px;`;
const ThreadTime = styled.Text`color: ${({ theme }) => theme.portal.subtle}; font-size: 10px;`;
const Badge = styled.View`min-width: 22px; height: 22px; padding: 0 7px; align-self: flex-start; border-radius: 11px; align-items: center; justify-content: center; background-color: ${({ theme }) => theme.portal.primary}; margin-top: 7px;`;
const BadgeText = styled.Text`color: #fff; font-size: 10px; font-weight: 900;`;
const Chat = styled.View`flex: 1; border-radius: 16px; overflow: hidden; background-color: ${({ theme }) => theme.portal.card}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const ChatHeader = styled.View`padding: 12px; flex-direction: row; align-items: center; border-bottom-width: 1px; border-bottom-color: ${({ theme }) => theme.portal.border};`;
const ChatTitle = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 14px; font-weight: 900;`;
const ChatMeta = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 11px; margin-top: 3px;`;
const ChatList = styled.FlatList`flex: 1;`;
const Bubble = styled.View`align-self: ${({ mine }) => mine ? 'flex-end' : 'flex-start'}; max-width: 82%; padding: 9px 11px; margin: 5px 10px; border-radius: 15px; background-color: ${({ mine, theme }) => mine ? theme.portal.primary : theme.portal.background}; border-width: ${({ mine }) => mine ? 0 : 1}px; border-color: ${({ theme }) => theme.portal.border};`;
const BubbleText = styled.Text`color: ${({ mine, theme }) => mine ? '#fff' : theme.portal.text}; font-size: 13px; line-height: 18px;`;
const BubbleTime = styled.Text`color: ${({ mine, theme }) => mine ? 'rgba(255,255,255,.72)' : theme.portal.subtle}; font-size: 9px; text-align: right; margin-top: 4px;`;
const Composer = styled.View`flex-direction: row; align-items: flex-end; padding: 9px; border-top-width: 1px; border-top-color: ${({ theme }) => theme.portal.border};`;
const Input = styled.TextInput`flex: 1; min-height: 42px; max-height: 110px; border-radius: 15px; padding: 10px 12px; color: ${({ theme }) => theme.portal.text}; background-color: ${({ theme }) => theme.portal.background}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const Send = styled.TouchableOpacity`width: 42px; height: 42px; border-radius: 21px; margin-left: 8px; align-items: center; justify-content: center; background-color: ${({ theme }) => theme.portal.primary}; opacity: ${({ disabled }) => disabled ? .5 : 1};`;
const Empty = styled.View`flex: 1; align-items: center; justify-content: center; padding: 20px;`;
const EmptyText = styled.Text`color: ${({ theme }) => theme.portal.muted}; text-align: center; font-weight: 800; margin-top: 10px;`;

export default function AdminMensagensScreen({ navigation, route, mode }) {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const { canUseAdminApp } = useMobileModules();
  const [areaId, setAreaId] = useState('balcao');
  const [threads, setThreads] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const isDetailRoute = route?.name === 'AdminMensagensDetalhe';

  const area = AREAS.find(item => item.id === areaId) || AREAS[0];
  useEffect(() => {
    if (!area || !canUseAdminApp('mensagens')) return undefined;
    return onSnapshot(collection(firestore, area.collection), snapshot => {
      const data = snapshot.docs.map(row => {
        const item = row.data();
        const messages = messagesOf(item.messages).sort((a, b) => time(a.timestamp || a.createdAt) - time(b.timestamp || b.createdAt));
        const last = messages[messages.length - 1];
        return { ...item, id: row.id, area, messages, last, unread: messages.filter(message => message.sender !== 'admin' && message.readByAdmin !== true).length, lastAt: time(last?.timestamp || last?.createdAt || item[area.date]) };
      }).filter(item => item.messages.length);
      setThreads(data.sort((a, b) => b.lastAt - a.lastAt));
    }, error => console.error('Erro ao carregar mensagens administrativas:', error));
  }, [area, canUseAdminApp]);

  const filtered = useMemo(() => threads.filter(item => {
    const term = search.trim().toLowerCase();
    const matches = !term || [item.dadosUsuario?.name, item.dadosUsuario?.email, get(item, area.subject)].filter(Boolean).join(' ').toLowerCase().includes(term);
    return matches && (filter === 'all' || (filter === 'unread' ? item.unread > 0 : false));
  }), [area.subject, filter, search, threads]);
  useEffect(() => { setPageSize(10); }, [areaId, filter, search]);
  const visibleThreads = filtered.slice(0, pageSize);
  const current = selected && filtered.find(item => item.id === selected.id) || selected;

  useEffect(() => {
    if (!isDetailRoute || !route.params?.areaId || !route.params?.conversationId) return;
    const conversation = threads.find(item => item.area.id === route.params.areaId && item.id === route.params.conversationId);
    if (conversation) setSelected(conversation);
  }, [isDetailRoute, route.params?.areaId, route.params?.conversationId, threads]);

  const send = async () => {
    if (!current || !text.trim() || !user) return;
    setSending(true);
    try {
      const id = `admin-${Date.now()}`;
      await updateDoc(doc(firestore, current.area.collection, current.id), { [`messages.${id}`]: { text: text.trim(), sender: 'admin', timestamp: new Date().toISOString(), readByAdmin: true, readByUser: false } });
      setText('');
    } catch (error) { console.error('Erro ao enviar mensagem administrativa:', error); Alert.alert('Não foi possível enviar', 'Verifique sua permissão e tente novamente.'); } finally { setSending(false); }
  };

  if (!canUseAdminApp('mensagens')) return <PortalBackground><Empty><MaterialCommunityIcons name="lock-outline" size={42} color={theme.portal.muted} /><EmptyText>Você não possui permissão para acessar as mensagens administrativas.</EmptyText></Empty></PortalBackground>;
  if (current && mode !== 'list') return <PortalBackground>
    <PortalHeader compact><PortalHeaderRow><TouchableOpacity onPress={() => isDetailRoute ? navigation.goBack() : setSelected(null)} style={{ marginRight: 10 }}><Ionicons name="arrow-back" size={25} color={theme.portal.text} /></TouchableOpacity><HeaderIcon><Ionicons name="chatbubbles-outline" size={22} color={theme.portal.primary} /></HeaderIcon><PortalTitleGroup><PortalTitle>{current.dadosUsuario?.name || current.dadosUsuario?.email || 'Cidadão'}</PortalTitle><PortalSubtitle>{current.area.label} · {get(current, current.area.subject) || 'Atendimento'}</PortalSubtitle></PortalTitleGroup></PortalHeaderRow></PortalHeader>
    <Body style={{ paddingBottom: 18 }}><Chat>
      <ChatList data={current.messages} keyExtractor={item => item.id} contentContainerStyle={{ paddingVertical: 8 }} renderItem={({ item }) => <Bubble mine={item.sender === 'admin'}><BubbleText mine={item.sender === 'admin'}>{item.text || item.message || ''}</BubbleText><BubbleTime mine={item.sender === 'admin'}>{dateLabel(item.timestamp || item.createdAt)}</BubbleTime></Bubble>} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Composer><Input value={text} onChangeText={setText} multiline placeholder="Digite uma mensagem" placeholderTextColor={theme.portal.subtle} /><Send disabled={sending || !text.trim()} onPress={send}>{sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={19} color="#fff" />}</Send></Composer></KeyboardAvoidingView>
    </Chat></Body>
  </PortalBackground>;
  return <PortalBackground>
    <PortalHeader compact><PortalHeaderRow><HeaderIcon><Ionicons name="chatbubbles-outline" size={22} color={theme.portal.primary} /></HeaderIcon><PortalTitleGroup><PortalTitle>Mensagens</PortalTitle><PortalSubtitle>Converse com os cidadãos e equipes.</PortalSubtitle></PortalTitleGroup></PortalHeaderRow></PortalHeader>
    <Body>
      <Sidebar style={{ width: "100%", maxWidth: "none" }}>
        <AreaTabs horizontal showsHorizontalScrollIndicator={false}>{AREAS.map(item => <Tab key={item.id} active={areaId === item.id} onPress={() => { setAreaId(item.id); setSelected(null); }}><TabText active={areaId === item.id}>{item.label}</TabText></Tab>)}</AreaTabs>
        <Input value={search} onChangeText={setSearch} placeholder="Buscar conversa" placeholderTextColor={theme.portal.subtle} />
        <FilterRow><Filter active={filter === 'all'} onPress={() => setFilter('all')}><FilterText active={filter === 'all'}>Todas</FilterText></Filter><Filter active={filter === 'unread'} onPress={() => setFilter('unread')}><FilterText active={filter === 'unread'}>Não lidas</FilterText></Filter></FilterRow>
        <ScrollView showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 18 }}>{visibleThreads.map(item => <Thread key={item.id} active={current?.id === item.id} onPress={() => mode === 'list' ? navigation.getParent()?.navigate('AdminMensagensDetalhe', { areaId: item.area.id, conversationId: item.id }) : setSelected(item)}><ThreadRow><Avatar color={item.area.color}><AvatarText color={item.area.color}>{initials(item.dadosUsuario?.name || item.dadosUsuario?.email)}</AvatarText></Avatar><ThreadInfo><ThreadName numberOfLines={1}>{item.dadosUsuario?.name || item.dadosUsuario?.email || 'Cidadão'}</ThreadName><ThreadPreview numberOfLines={1}>{item.last?.text || item.last?.message || get(item, area.subject) || 'Mensagem'}</ThreadPreview></ThreadInfo><ThreadTime>{dateLabel(item.last?.timestamp || item.last?.createdAt)}</ThreadTime></ThreadRow>{item.unread > 0 && <Badge><BadgeText>{item.unread}</BadgeText></Badge>}</Thread>)}{pageSize < filtered.length ? <TouchableOpacity onPress={() => setPageSize(value => value + 10)} style={{ padding: 13, alignItems: 'center', borderRadius: 12, backgroundColor: theme.portal.card, borderWidth: 1, borderColor: theme.portal.border }}><ThreadName>Carregar mais 10</ThreadName></TouchableOpacity> : null}</ScrollView>
        {!filtered.length && <Empty><EmptyText>Nenhuma conversa encontrada.</EmptyText></Empty>}
      </Sidebar>
      {null}
    </Body>
  </PortalBackground>;
}
