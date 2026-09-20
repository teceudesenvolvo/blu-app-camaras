import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, TextInput } from 'react-native';
import styled from 'styled-components/native';

import { PortalBackground, PortalCard, PortalScreenHeader } from '../components/PortalScaffold';
import { useMobileModules } from '../context/MobileModulesContext';
import { firestore } from '../../services/firebaseConfig';

const FilterBar = styled.View`padding: 14px 18px 6px;`;
const Horizontal = styled(ScrollView).attrs({ horizontal: true, showsHorizontalScrollIndicator: false })`margin-bottom: 8px;`;
const Chip = styled.TouchableOpacity`padding: 10px 13px; margin-right: 8px; border-radius: 12px; background-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.card}; border-width: 1px; border-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.border};`;
const ChipText = styled.Text`font-size: 12px; font-weight: 800; color: ${({ active, theme }) => active ? '#fff' : theme.portal.text};`;
const Search = styled(TextInput)`height: 44px; padding: 0 12px; border-radius: 11px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; background-color: ${({ theme }) => theme.portal.card}; color: ${({ theme }) => theme.portal.text}; font-size: 12px;`;
const Card = styled.TouchableOpacity`margin: 6px 18px; padding: 16px; border-radius: 14px; background-color: ${({ theme }) => theme.portal.card}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const Row = styled.View`flex-direction: row; align-items: center;`;
const Info = styled.View`flex: 1; margin-left: 12px;`;
const Title = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 15px; font-weight: 900;`;
const Detail = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 12px; margin-top: 4px;`;
const Empty = styled.Text`color: ${({ theme }) => theme.portal.muted}; text-align: center; margin: 36px 24px; line-height: 22px;`;
const DetailCard = styled(PortalCard)`margin: 18px;`;
const Label = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 12px; font-weight: 800; margin-top: 14px;`;
const Value = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 15px; line-height: 22px; margin-top: 4px;`;
const Tabs = styled.View`flex-direction: row; flex-wrap: wrap; padding: 14px 18px 0;`;
const Tab = styled.TouchableOpacity`padding: 10px 12px; margin: 0 7px 8px 0; border-radius: 10px; background-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.card};`;
const TabText = styled.Text`color: ${({ active, theme }) => active ? '#fff' : theme.portal.text}; font-size: 12px; font-weight: 900;`;
const StatusButton = styled.TouchableOpacity`padding: 10px 12px; border-radius: 10px; margin: 8px 7px 0 0; background-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.pageAlt};`;
const StatusText = styled.Text`color: ${({ active, theme }) => active ? '#fff' : theme.portal.text}; font-size: 12px; font-weight: 800;`;
const MessageInput = styled(TextInput)`min-height: 90px; margin-top: 10px; padding: 12px; border-radius: 10px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; color: ${({ theme }) => theme.portal.text}; background-color: ${({ theme }) => theme.portal.pageAlt}; text-align-vertical: top;`;
const Action = styled.TouchableOpacity`margin-top: 12px; padding: 13px; border-radius: 11px; align-items: center; background-color: ${({ theme }) => theme.portal.primary};`;
const ActionText = styled.Text`color: #fff; font-weight: 900;`;
const MessageRow = styled.View`padding: 12px 0; border-bottom-width: 1px; border-bottom-color: ${({ theme }) => theme.portal.border};`;

const STATUSES = ['Todas', 'Recebida', 'Em Acolhimento', 'Encaminhada', 'Concluída', 'Não Classificado'];
const DETAIL_TABS = [['dados', 'Dados'], ['situacao', 'Situação'], ['agendamento', 'Agendamento'], ['arquivos', 'Arquivos'], ['chat', 'Chat']];
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const dateOf = item => item.dataSolicitacao?.toDate ? item.dataSolicitacao.toDate() : new Date(item.dataSolicitacao || item.createdAt || 0);
const formatDate = item => { const date = dateOf(item); return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleString('pt-BR'); };
const messagesOf = item => Array.isArray(item.messages) ? item.messages : Object.entries(item.messages || {}).map(([id, message]) => ({ id, ...message }));
const filesOf = item => {
  const source = item.dadosSolicitacao?.anexos || item.anexos;
  if (!source) return [];
  if (Array.isArray(source)) return source.flatMap(file => Array.isArray(file) ? file : [file]);
  return Object.values(source).flatMap(file => Array.isArray(file) ? file : [file]);
};
const requestData = item => item.dadosSolicitacao || item.solicitacao || item.request || item;
const userData = item => item.dadosUsuario || item.usuario || item.userDataAtTimeOfRequest || item.userData || item;

export default function AdminProcuradoriaScreen({ navigation }) {
  const { canUseAdminApp } = useMobileModules();
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('dados');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canUseAdminApp('procuradoria')) return undefined;
    return onSnapshot(collection(firestore, 'procuradoria-mulher'), snapshot => {
      setItems(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }, () => setItems([]));
  }, [canUseAdminApp]);

  const visibleItems = useMemo(() => items.filter(item => {
    const text = normalize(`${requestData(item).assunto || item.assunto || item.subject || ''} ${requestData(item).tipoAtendimento || requestData(item).tipo || item.tipoAtendimento || ''} ${userData(item).name || userData(item).nome || userData(item).email || ''} ${item.id}`);
    return (statusFilter === 'Todas' || normalize(item.status || 'Não Classificado') === normalize(statusFilter)) && (!search.trim() || text.includes(normalize(search)));
  }).sort((a, b) => dateOf(b) - dateOf(a)), [items, search, statusFilter]);

  if (!canUseAdminApp('procuradoria')) return <PortalBackground><PortalScreenHeader navigation={navigation} title="Acesso indisponível" /></PortalBackground>;

  const updateRequest = async updates => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(firestore, 'procuradoria-mulher', selected.id), { ...updates, ultimaAtualizacao: serverTimestamp() });
      setSelected(current => ({ ...current, ...updates }));
      setItems(current => current.map(item => item.id === selected.id ? { ...item, ...updates } : item));
    } catch (error) { Alert.alert('Erro', error.message || 'Não foi possível atualizar o atendimento.'); }
    finally { setSaving(false); }
  };

  if (selected) return <PortalBackground>
    <PortalScreenHeader navigation={{ goBack: () => setSelected(null) }} eyebrow="Área administrativa" title="Atendimento da Procuradoria" subtitle={selected.protocolo || selected.id} />
    <Tabs>{DETAIL_TABS.map(([id, label]) => <Tab key={id} active={tab === id} onPress={() => setTab(id)}><TabText active={tab === id}>{label}</TabText></Tab>)}</Tabs>
    <DetailCard>
      {tab === 'dados' && <>
        <Label>Solicitante</Label><Value>{userData(selected).name || userData(selected).nome || userData(selected).email || 'Não informado'}</Value>
        <Label>Identificação</Label><Value>{userData(selected).identificacao || requestData(selected).identificacao || 'Não informado'}</Value>
        <Label>Tipo de atendimento</Label><Value>{requestData(selected).tipoAtendimento || requestData(selected).tipo || selected.tipoAtendimento || 'Acolhimento'}</Value>
        <Label>Assunto</Label><Value>{requestData(selected).assunto || selected.assunto || selected.subject || 'Não informado'}</Value>
        <Label>Descrição</Label><Value>{requestData(selected).descricao || selected.descricao || selected.description || 'Não informado'}</Value>
        {(requestData(selected).tipoViolencia || selected.tipoViolencia) ? <><Label>Tipo de violência</Label><Value>{requestData(selected).tipoViolencia || selected.tipoViolencia}</Value></> : null}
      </>}
      {tab === 'situacao' && <>
        <Label>Status atual</Label><Value>{selected.status || 'Não Classificado'}</Value>
        {STATUSES.slice(1, -1).map(status => <StatusButton key={status} active={selected.status === status} disabled={saving} onPress={() => updateRequest({ status })}><StatusText active={selected.status === status}>{status}</StatusText></StatusButton>)}
      </>}
      {tab === 'agendamento' && <><Label>Data</Label><Value>{selected.appointmentDate || 'Não agendado'}</Value><Label>Horário</Label><Value>{selected.appointmentTime || 'Não informado'}</Value><Label>Guichê</Label><Value>{selected.guiche || selected.guicheId || 'Não informado'}</Value></>}
      {tab === 'arquivos' && <>{filesOf(selected).map((file, index) => <MessageRow key={file.url || index}><Value>{file.name || file.fileName || `Arquivo ${index + 1}`}</Value></MessageRow>)}{!filesOf(selected).length && <Value>Nenhum arquivo anexado.</Value>}</>}
      {tab === 'chat' && <>{messagesOf(selected).map((item, index) => <MessageRow key={item.id || index}><Value>{item.text || item.message || ''}</Value><Label>{item.sender || 'Atendimento'}</Label></MessageRow>)}{!messagesOf(selected).length && <Value>Nenhuma mensagem registrada.</Value>}<MessageInput multiline value={message} onChangeText={setMessage} placeholder="Digite uma mensagem para a solicitante..." placeholderTextColor="#94a3b8" /><Action disabled={saving || !message.trim()} onPress={() => { const id = `admin-${Date.now()}`; updateRequest({ [`messages.${id}`]: { text: message.trim(), sender: 'admin', timestamp: new Date().toISOString() } }); setMessage(''); }}><ActionText>{saving ? 'Enviando...' : 'Enviar mensagem'}</ActionText></Action></>}
    </DetailCard>
  </PortalBackground>;

  return <PortalBackground>
    <PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title="Procuradoria da Mulher" subtitle="Gerencie acolhimentos e solicitações com sigilo." />
    <FilterBar><Horizontal>{STATUSES.map(status => <Chip key={status} active={statusFilter === status} onPress={() => setStatusFilter(status)}><ChipText active={statusFilter === status}>{status}</ChipText></Chip>)}</Horizontal><Search value={search} onChangeText={setSearch} placeholder="Buscar por solicitante, assunto ou protocolo" placeholderTextColor="#94a3b8" /></FilterBar>
    <FlatList data={visibleItems} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 36 }} ListEmptyComponent={<Empty>Nenhum atendimento encontrado para este filtro.</Empty>} renderItem={({ item }) => <Card onPress={() => { setSelected(item); setTab('dados'); }}><Row><MaterialCommunityIcons name="account-heart-outline" size={29} color="#db2777" /><Info><Title>{requestData(item).assunto || item.assunto || item.subject || 'Atendimento reservado'}</Title><Detail>Solicitante: {userData(item).name || userData(item).nome || userData(item).email || 'Não informado'}</Detail><Detail>{requestData(item).tipoAtendimento || requestData(item).tipo || item.tipoAtendimento || 'Acolhimento'} · {item.status || 'Não Classificado'}</Detail><Detail>{formatDate(item)}</Detail></Info><MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" /></Row></Card>} />
  </PortalBackground>;
}
