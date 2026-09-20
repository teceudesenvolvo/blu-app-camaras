import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import chamberConfig from '../config';
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, TextInput } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { PortalBackground, PortalCard, PortalScreenHeader } from '../components/PortalScaffold';
import { firestore } from '../../services/firebaseConfig';
import { useMobileModules } from '../context/MobileModulesContext';

const FilterRow = styled.View`padding: 14px 18px 4px;`;
const FilterScroll = styled(ScrollView).attrs({ horizontal: true, showsHorizontalScrollIndicator: false })`margin-bottom: 8px;`;
const FilterChip = styled.TouchableOpacity`padding: 10px 13px; margin-right: 8px; border-radius: 12px; background-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.card}; border-width: 1px; border-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.border};`;
const FilterChipText = styled.Text`font-size: 12px; font-weight: 800; color: ${({ active, theme }) => active ? '#fff' : theme.portal.text};`;
const FilterInput = styled(TextInput)`height: 44px; flex: 1; padding: 0 12px; border-radius: 11px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; background-color: ${({ theme }) => theme.portal.card}; color: ${({ theme }) => theme.portal.text}; font-size: 12px;`;
const DateRow = styled.View`flex-direction: row; gap: 8px; margin-top: 8px;`;
const DateField = styled.TouchableOpacity`height: 44px; flex: 1; padding: 0 12px; border-radius: 11px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; background-color: ${({ theme }) => theme.portal.card}; justify-content: center;`;
const DateFieldContent = styled.View`flex-direction: row; align-items: center;`;
const DateFieldText = styled.Text`margin-left: 7px; color: ${({ active, theme }) => active ? theme.portal.text : '#94a3b8'}; font-size: 12px;`;
const ClearFiltersButton = styled.TouchableOpacity`height: 44px; flex: 1; border-radius: 11px; align-items: center; justify-content: center; background-color: ${({ theme }) => theme.portal.pageAlt}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const ClearFiltersText = styled.Text`color: ${({ theme }) => theme.portal.primary}; font-size: 12px; font-weight: 900;`;
const DatePickerBackdrop = styled.TouchableOpacity`flex: 1; align-items: center; justify-content: center; padding: 24px; background-color: rgba(2, 8, 23, 0.5);`;
const DatePickerPanel = styled.View`width: 100%; max-width: 340px; padding: 18px; border-radius: 18px; align-items: center; background-color: ${({ theme }) => theme.portal.card};`;
const Card = styled.TouchableOpacity.attrs({ activeOpacity: 0.82 })`margin: 6px 18px; padding: 16px; border-radius: 14px; background-color: ${({ theme }) => theme.portal.card}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const Row = styled.View`flex-direction: row; align-items: center;`;
const Info = styled.View`flex: 1; margin-left: 12px;`;
const Title = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 15px; font-weight: 900;`;
const Detail = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 12px; margin-top: 4px;`;
const Empty = styled.Text`color: ${({ theme }) => theme.portal.muted}; text-align: center; margin: 36px 24px; line-height: 22px;`;
const DetailCard = styled(PortalCard)`margin: 18px;`;
const DetailLabel = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 12px; font-weight: 800; margin-top: 14px;`;
const DetailValue = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 15px; line-height: 22px; margin-top: 4px;`;
const CardBeneficiary = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 13px; font-style: italic; margin-top: 4px;`;
const CardDate = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 13px; margin-top: 4px;`;
const StatusRow = styled.View`flex-direction: row; flex-wrap: wrap; margin-top: 8px;`;
const StatusButton = styled.TouchableOpacity`padding: 10px 12px; border-radius: 10px; margin: 0 7px 7px 0; background-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.pageAlt};`;
const StatusText = styled.Text`color: ${({ active, theme }) => active ? '#fff' : theme.portal.text}; font-size: 12px; font-weight: 800;`;
const NoteInput = styled(TextInput)`min-height: 92px; margin-top: 8px; padding: 12px; border-radius: 10px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; color: ${({ theme }) => theme.portal.text}; background-color: ${({ theme }) => theme.portal.pageAlt}; text-align-vertical: top;`;
const ActionButton = styled.TouchableOpacity`margin-top: 12px; padding: 13px; border-radius: 11px; align-items: center; background-color: ${({ theme }) => theme.portal.primary};`;
const ActionText = styled.Text`color: #fff; font-weight: 900;`;
const DetailTabs = styled.View`flex-direction: row; flex-wrap: wrap; padding: 14px 18px 0;`;
const DetailTab = styled.TouchableOpacity`padding: 10px 12px; margin: 0 7px 8px 0; border-radius: 10px; background-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.card};`;
const DetailTabText = styled.Text`color: ${({ active, theme }) => active ? '#fff' : theme.portal.text}; font-size: 12px; font-weight: 900;`;
const FileRow = styled.View`padding: 12px 0; border-bottom-width: 1px; border-bottom-color: ${({ theme }) => theme.portal.border};`;

const STATUS_FILTERS = ['Todas', 'Aguardando Atendimento', 'Agendamento Liberado', 'Agendado', 'Em Análise', 'Documentação Reprovada', 'Documentação Reenviada', 'Documento em emissão', 'Documento Pronto', 'Concluído', 'Não Classificado'];
const SUBJECT_FILTERS = ['Todos', 'Informações Gerais', 'Emissão de Documentos', 'Agendamento', 'Outros'];
const STATUS_OPTIONS = ['Aguardando Atendimento', 'Em Análise', 'Agendamento Liberado', 'Agendado', 'Documentação Reprovada', 'Documentação Reenviada', 'Documento em emissão', 'Documento Pronto', 'Concluído'];
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const itemDate = item => {
  const value = item.dataSolicitacao || item.createdAt;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatDate = item => {
  const date = itemDate(item);
  return date ? date.toLocaleString('pt-BR') : 'Data não informada';
};
const filterDateForItem = (item, statusFilter) => {
  if (statusFilter === 'Agendado' && (item.appointmentDate || item.dataAgendamento)) {
    const rawDate = String(item.appointmentDate || item.dataAgendamento);
    const brazilianDate = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const isoDate = brazilianDate ? `${brazilianDate[3]}-${brazilianDate[2]}-${brazilianDate[1]}` : rawDate;
    const appointmentDate = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
    return Number.isNaN(appointmentDate.getTime()) ? null : appointmentDate;
  }
  return itemDate(item);
};
const matchesSubject = (item, filter) => {
  if (filter === 'Todos') return true;
  const subject = normalize(`${item.dadosSolicitacao?.assunto || ''} ${item.dadosSolicitacao?.tipoAtendimento || ''} ${item.tipo || ''}`);
  if (filter === 'Informações Gerais') return subject.includes('informac');
  if (filter === 'Emissão de Documentos') return subject.includes('document');
  if (filter === 'Agendamento') return subject.includes('agend');
  return !subject.includes('informac') && !subject.includes('document') && !subject.includes('agend');
};

export default function AdminBalcaoScreen({ navigation }) {
  const theme = useTheme();
  const { canUseAdminApp } = useMobileModules();
  const [items, setItems] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Todas');
  const [filterSubject, setFilterSubject] = useState('Todos');
  const [beneficiary, setBeneficiary] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePicker, setDatePicker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('dados');
  const [note, setNote] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canUseAdminApp('balcao')) return undefined;
    const stop = onSnapshot(query(collection(firestore, 'balcao-cidadao'), where('flavorId', '==', chamberConfig.flavorId)), snapshot => {
      setItems(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      setLoading(false);
    }, failure => { setError(failure.message || 'Não foi possível carregar as solicitações.'); setLoading(false); });
    return () => stop();
  }, [canUseAdminApp]);

  const visibleItems = useMemo(() => items.filter(item => {
    const status = filterStatus === 'Todas' || normalize(item.status || item.statusFila || 'Não Classificado') === normalize(filterStatus);
    const requester = normalize(`${item.userName || ''} ${item.nome || ''} ${item.dadosUsuario?.name || ''} ${item.dadosBeneficiario?.name || ''}`);
    const beneficiaryMatches = !beneficiary.trim() || requester.includes(normalize(beneficiary));
    const date = filterDateForItem(item, filterStatus);
    const fromMatches = !dateFrom || (date && date >= new Date(`${dateFrom}T00:00:00`));
    const toMatches = !dateTo || (date && date <= new Date(`${dateTo}T23:59:59`));
    return status && matchesSubject(item, filterSubject) && beneficiaryMatches && fromMatches && toMatches;
  }), [beneficiary, dateFrom, dateTo, filterStatus, filterSubject, items]);
  const updateRequest = async updates => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(firestore, 'balcao-cidadao', selected.id), { ...updates, ultimaAtualizacao: serverTimestamp() });
      setSelected(current => ({ ...current, ...updates }));
      setItems(current => current.map(item => item.id === selected.id ? { ...item, ...updates } : item));
    } catch (failure) {
      setError(failure.message || 'Não foi possível atualizar a solicitação.');
    } finally { setSaving(false); }
  };
  if (selected) return <PortalBackground>
    <PortalScreenHeader navigation={{ goBack: () => setSelected(null) }} eyebrow="Área administrativa" title="Solicitação do Balcão" subtitle={selected.protocolo || selected.id} />
    <DetailTabs>{[['dados', 'Dados'], ['situacao', 'Situação'], ['agendamento', 'Agendamento'], ['arquivos', 'Arquivos'], ['chat', 'Chat']].map(([id, label]) => <DetailTab key={id} active={detailTab === id} onPress={() => setDetailTab(id)}><DetailTabText active={detailTab === id}>{label}</DetailTabText></DetailTab>)}</DetailTabs>
    <DetailCard>
      {detailTab === 'dados' && <>
        <DetailLabel>Solicitante</DetailLabel><DetailValue>{selected.userName || selected.nome || selected.dadosUsuario?.name || 'Cidadão'}</DetailValue>
        <DetailLabel>Assunto</DetailLabel><DetailValue>{selected.dadosSolicitacao?.assunto || selected.tipo || 'Solicitação do Balcão'}</DetailValue>
        <DetailLabel>Descrição</DetailLabel><DetailValue>{selected.dadosSolicitacao?.descricao || selected.descricao || 'Não informado.'}</DetailValue>
        <DetailLabel>Beneficiário</DetailLabel><DetailValue>{selected.dadosBeneficiario?.name || selected.beneficiario?.nome || 'Não informado.'}</DetailValue>
      </>}
      {detailTab === 'situacao' && <>
        <DetailLabel>Status atual</DetailLabel><DetailValue>{selected.status || 'Não Classificado'}</DetailValue>
        <StatusRow>{STATUS_OPTIONS.map(status => <StatusButton key={status} active={selected.status === status} disabled={saving} onPress={() => updateRequest({ status })}><StatusText active={selected.status === status}>{status}</StatusText></StatusButton>)}</StatusRow>
        <DetailLabel>Observação interna</DetailLabel><NoteInput value={note} onChangeText={setNote} placeholder="Registre uma observação para a equipe..." placeholderTextColor="#94a3b8" multiline />
        <ActionButton disabled={saving || !note.trim()} onPress={() => { const messages = { ...(selected.messages || {}), [`admin-${Date.now()}`]: { text: note.trim(), sender: 'admin-app', timestamp: new Date().toISOString() } }; updateRequest({ messages }); setNote(''); }}><ActionText>{saving ? 'Salvando...' : 'Salvar observação'}</ActionText></ActionButton>
      </>}
      {detailTab === 'agendamento' && <>
        <DetailLabel>Data</DetailLabel><DetailValue>{selected.appointmentDate || 'Não agendado'}</DetailValue>
        <DetailLabel>Horário</DetailLabel><DetailValue>{selected.appointmentTime || 'Não informado'}</DetailValue>
        <DetailLabel>Guichê</DetailLabel><DetailValue>{selected.guiche || selected.guicheId || 'Não informado'}</DetailValue>
      </>}
      {detailTab === 'arquivos' && <>
        {Object.values(selected.arquivos || {}).flat().map((file, index) => <FileRow key={`${file.url || file.uri || index}`}><DetailValue>{file.name || file.fileName || `Arquivo ${index + 1}`}</DetailValue></FileRow>)}
        {(!selected.arquivos || Object.values(selected.arquivos || {}).flat().length === 0) && <DetailValue>Nenhum arquivo anexado.</DetailValue>}
      </>}
      {detailTab === 'chat' && <>
        {Object.values(selected.messages || {}).map((message, index) => <FileRow key={message.id || index}><DetailValue>{message.text || message.message || ''}</DetailValue><DetailLabel>{message.sender || 'Atendimento'}</DetailLabel></FileRow>)}
        {(!selected.messages || Object.keys(selected.messages).length === 0) && <DetailValue>Nenhuma mensagem registrada.</DetailValue>}
        <NoteInput value={chatMessage} onChangeText={setChatMessage} placeholder="Digite uma mensagem para o solicitante..." placeholderTextColor="#94a3b8" multiline />
        <ActionButton disabled={saving || !chatMessage.trim()} onPress={() => { const messages = { ...(selected.messages || {}), [`admin-${Date.now()}`]: { text: chatMessage.trim(), sender: 'admin-app', timestamp: new Date().toISOString(), read: false } }; updateRequest({ messages }); setChatMessage(''); }}><ActionText>{saving ? 'Enviando...' : 'Enviar mensagem'}</ActionText></ActionButton>
      </>}
    </DetailCard>
  </PortalBackground>;
  return <PortalBackground>
    <PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title="Balcão do Cidadão" subtitle="Solicitações e atendimentos do setor." />
    <FilterRow>
      <FilterScroll>{STATUS_FILTERS.map(item => <FilterChip key={item} active={filterStatus === item} onPress={() => setFilterStatus(item)}><FilterChipText active={filterStatus === item}>{item}</FilterChipText></FilterChip>)}</FilterScroll>
      <FilterScroll>{SUBJECT_FILTERS.map(item => <FilterChip key={item} active={filterSubject === item} onPress={() => setFilterSubject(item)}><FilterChipText active={filterSubject === item}>{item}</FilterChipText></FilterChip>)}</FilterScroll>
      <DateRow><FilterInput value={beneficiary} onChangeText={setBeneficiary} placeholder="Beneficiário" placeholderTextColor="#94a3b8" /><DateField onPress={() => setDatePicker({ field: 'from', value: dateFrom ? new Date(`${dateFrom}T12:00:00`) : new Date() })}><DateFieldContent><MaterialCommunityIcons name="calendar-month-outline" size={18} color={theme.portal.primary} /><DateFieldText active={Boolean(dateFrom)}>{dateFrom ? `Início: ${dateFrom}` : 'Data início'}</DateFieldText></DateFieldContent></DateField></DateRow>
      <DateRow><DateField onPress={() => setDatePicker({ field: 'to', value: dateTo ? new Date(`${dateTo}T12:00:00`) : new Date() })}><DateFieldContent><MaterialCommunityIcons name="calendar-month-outline" size={18} color={theme.portal.primary} /><DateFieldText active={Boolean(dateTo)}>{dateTo ? `Fim: ${dateTo}` : 'Data fim'}</DateFieldText></DateFieldContent></DateField><ClearFiltersButton onPress={() => { setFilterStatus('Todas'); setFilterSubject('Todos'); setBeneficiary(''); setDateFrom(''); setDateTo(''); }}><ClearFiltersText>Limpar filtros</ClearFiltersText></ClearFiltersButton></DateRow>
      <Modal transparent animationType="fade" visible={Boolean(datePicker)} onRequestClose={() => setDatePicker(null)}>
        <DatePickerBackdrop activeOpacity={1} onPress={() => setDatePicker(null)}>
          <DatePickerPanel onStartShouldSetResponder={() => true}>
            {datePicker && <DateTimePicker value={datePicker.value} mode="date" display="spinner" themeVariant={theme.mode === 'dark' ? 'dark' : 'light'} textColor={theme.portal.text} onChange={(event, value) => { if (!value) return; const iso = value.toISOString().slice(0, 10); if (datePicker.field === 'from') setDateFrom(iso); else setDateTo(iso); setDatePicker(null); }} />}
          </DatePickerPanel>
        </DatePickerBackdrop>
      </Modal>
    </FilterRow>
    {loading ? <ActivityIndicator style={{ marginTop: 36 }} /> : error ? <Empty>{error}</Empty> : <FlatList data={visibleItems} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 36 }} ListEmptyComponent={<Empty>Nenhuma solicitação encontrada para este filtro.</Empty>} renderItem={({ item }) => <Card onPress={() => { setSelected(item); setDetailTab('dados'); }}><Row><MaterialCommunityIcons name="account-check-outline" size={28} color="#0284C7" /><Info><Title>{item.dadosSolicitacao?.assunto || item.tipo || 'Solicitação do Balcão'}</Title><Detail>Solicitante: {item.userName || item.nome || item.dadosUsuario?.name || 'Cidadão'}</Detail><CardBeneficiary>Beneficiário: {item.dadosBeneficiario?.name || item.beneficiario?.nome || 'Não informado'}</CardBeneficiary><CardDate>{formatDate(item)}</CardDate></Info><MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" /></Row></Card>} />}
  </PortalBackground>;
}
