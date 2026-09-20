import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { PortalBackground, PortalScreenHeader } from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';

const TYPES = [
  'Orientação para abertura de um novo negócio (MEI)',
  'Dicas e orientações para melhorar seu negócio',
  'Ajuda para organização de finanças',
  'Informações sobre impostos e obrigações',
];
const digits = value => String(value || '').replace(/\D/g, '');
const dateKey = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const formatDate = value => {
  const millis = value?.toMillis?.() || value;
  return millis ? new Date(millis).toLocaleDateString('pt-BR') : 'Data indisponível';
};

export default function MicroempreendedorScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const colors = useTheme().portal;
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState('list');
  const [tab, setTab] = useState('dados');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState('');
  const [business, setBusiness] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjData, setCnpjData] = useState(null);
  const [contact, setContact] = useState('WhatsApp');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [bookedSlots, setBookedSlots] = useState({});
  const [blockedDates, setBlockedDates] = useState([]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    return onSnapshot(query(collection(firestore, 'assessoria-microempreendedor'), where('userId', '==', user.uid)), snapshot => {
      setItems(snapshot.docs.map(row => ({ id: row.id, ...row.data() })).sort((a, b) => (b.dataSolicitacao?.toMillis?.() || 0) - (a.dataSolicitacao?.toMillis?.() || 0)));
      setLoading(false);
      setError('');
    }, failure => { setError(failure.message || 'Não foi possível carregar suas solicitações.'); setLoading(false); });
  }, [user?.uid]);

  const selected = items.find(item => item.id === selectedId);
  useEffect(() => {
    if (selected?.status !== 'Agendamento Liberado') return undefined;
    let active = true;
    Promise.all([
      getDoc(doc(firestore, 'microempreendedor-config', 'availability')),
      getDoc(doc(firestore, 'microempreendedor-config', 'bookedSlots')),
      getDoc(doc(firestore, 'microempreendedor-config', 'blockedDates')),
    ]).then(([available, booked, blocked]) => {
      if (!active) return;
      setAvailability(available.data() || {});
      setBookedSlots(booked.data() || {});
      setBlockedDates(blocked.data()?.dates || []);
    }).catch(failure => { if (active) setError(failure.message || 'Não foi possível carregar os horários.'); });
    return () => { active = false; };
  }, [selected?.id, selected?.status]);

  const dateString = dateKey(date);
  const blocked = blockedDates.includes(dateString.split('-').reverse().join('/'));
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const slots = useMemo(() => {
    const available = Array.isArray(availability?.[weekday]) ? availability[weekday] : [];
    const booked = Array.isArray(bookedSlots[dateString]) ? bookedSlots[dateString] : [];
    return blocked || dateString < dateKey(new Date()) ? [] : available.filter(slot => {
      if (booked.includes(slot)) return false;
      if (dateString !== dateKey(new Date())) return true;
      return new Date(`${dateString}T${slot}:00`).getTime() > Date.now();
    });
  }, [availability, weekday, bookedSlots, dateString, blocked]);

  const button = (label, onPress, filled = false, disabled = false) => <TouchableOpacity
    accessibilityRole="button" onPress={onPress} disabled={disabled}
    style={{ minHeight: 48, paddingHorizontal: 15, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: filled ? colors.primary : colors.card, borderWidth: filled ? 0 : 1, borderColor: colors.border, opacity: disabled ? 0.5 : 1 }}
  ><Text style={{ color: filled ? '#fff' : colors.primary, fontWeight: '800', textAlign: 'center' }}>{label}</Text></TouchableOpacity>;
  const field = (label, value, onChange, options = {}) => <View style={{ marginTop: 18 }}>
    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{label}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder={options.placeholder || ''} placeholderTextColor={colors.muted} multiline={options.multiline} maxLength={options.maxLength || 2000} keyboardType={options.keyboardType || 'default'} textAlignVertical={options.multiline ? 'top' : 'center'} style={{ minHeight: options.multiline ? 125 : 50, marginTop: 7, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.card, color: colors.text }} />
  </View>;

  const lookupCnpj = async () => {
    const number = digits(cnpj);
    if (number.length !== 14) { setError('Informe um CNPJ com 14 dígitos.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${number}`);
      if (!response.ok) throw new Error(response.status === 404 ? 'CNPJ não encontrado.' : 'Não foi possível consultar o CNPJ.');
      const data = await response.json();
      setBusiness(previous => previous || data.nome_fantasia || data.razao_social || '');
      setCnpjData({
        razaoSocial: data.razao_social || '', nomeFantasia: data.nome_fantasia || '', cnpj: number,
        situacaoCadastral: data.descricao_situacao_cadastral || '', naturezaJuridica: data.natureza_juridica || '',
        cnaeFiscalDescricao: data.cnae_fiscal_descricao || '', telefone: [data.ddd_telefone_1, data.ddd_telefone_2].filter(Boolean).join(' / '), email: data.email || '',
        endereco: { logradouro: data.logradouro || '', numero: data.numero || '', complemento: data.complemento || '', bairro: data.bairro || '', municipio: data.municipio || '', uf: data.uf || '', cep: data.cep || '' },
      });
    } catch (failure) { setError(failure.message || 'Não foi possível consultar o CNPJ.'); }
    finally { setBusy(false); }
  };

  const create = async () => {
    if (busy) return;
    if (!type || description.trim().length < 20 || (cnpj && digits(cnpj).length !== 14)) {
      setError('Selecione o tipo, descreva sua necessidade em 20 caracteres e confira o CNPJ, se informado.');
      return;
    }
    setBusy(true); setError('');
    try {
      const profile = (await getDoc(doc(firestore, 'users', user.uid))).data() || {};
      await addDoc(collection(firestore, 'assessoria-microempreendedor'), {
        dadosAssessoria: { tipo: type, nomeNegocio: business.trim(), cnpj: cnpj.trim(), contatoPreferencial: contact, descricao: description.trim(), cnpjData },
        dadosUsuario: { id: user.uid, email: profile.email || user.email || '', name: profile.name || profile.nome || user.displayName || '', cpf: profile.cpf || 'Não informado', phone: profile.phone || profile.telefone || 'Não informado' },
        userId: user.uid, status: 'Recebida', dataSolicitacao: serverTimestamp(), ultimaAtualizacao: serverTimestamp(), messages: {},
      });
      setType(''); setBusiness(''); setCnpj(''); setCnpjData(null); setDescription(''); setContact('WhatsApp');
      setMode('list');
      Alert.alert('Solicitação enviada', 'Sua assessoria foi registrada.');
    } catch (failure) { setError(failure.message || 'Não foi possível enviar a solicitação.'); }
    finally { setBusy(false); }
  };

  const sendMessage = async () => {
    if (!selected || !message.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await updateDoc(doc(firestore, 'assessoria-microempreendedor', selected.id), {
        [`messages.${id}`]: { text: message.trim(), sender: 'user', timestamp: new Date().toISOString(), readByAdmin: false, readByUser: true },
        ultimaAtualizacao: serverTimestamp(),
      });
      setMessage('');
    } catch (failure) { setError(failure.message || 'Não foi possível enviar a mensagem.'); }
    finally { setBusy(false); }
  };

  const schedule = async () => {
    if (!selected || !time || busy || dateString < dateKey(new Date()) || !slots.includes(time)) {
      setError('Escolha uma data e um horário disponíveis.');
      return;
    }
    setBusy(true); setError('');
    try {
      await runTransaction(firestore, async transaction => {
        const requestRef = doc(firestore, 'assessoria-microempreendedor', selected.id);
        const bookedRef = doc(firestore, 'microempreendedor-config', 'bookedSlots');
        const availableRef = doc(firestore, 'microempreendedor-config', 'availability');
        const blockedRef = doc(firestore, 'microempreendedor-config', 'blockedDates');
        const [requestSnap, bookedSnap, availableSnap, blockedSnap] = await Promise.all([
          transaction.get(requestRef), transaction.get(bookedRef), transaction.get(availableRef), transaction.get(blockedRef),
        ]);
        if (requestSnap.data()?.userId !== user.uid || requestSnap.data()?.status !== 'Agendamento Liberado') throw new Error('O agendamento não está mais disponível.');
        if (dateString < dateKey(new Date()) || (dateString === dateKey(new Date()) && new Date(`${dateString}T${time}:00`).getTime() <= Date.now())) throw new Error('Este horário já passou.');
        if (blockedSnap.data()?.dates?.includes(dateString.split('-').reverse().join('/'))) throw new Error('Esta data foi bloqueada.');
        if (!Array.isArray(availableSnap.data()?.[weekday]) || !availableSnap.data()[weekday].includes(time)) throw new Error('Este horário não está mais disponível.');
        const currentBooked = bookedSnap.data()?.[dateString] || [];
        if (!Array.isArray(currentBooked) || currentBooked.includes(time)) throw new Error('Este horário acabou de ser reservado.');
        transaction.set(bookedRef, { [dateString]: [...currentBooked, time] }, { merge: true });
        transaction.update(requestRef, { status: 'Agendado', appointmentDate: dateString, appointmentTime: time, ultimaAtualizacao: serverTimestamp() });
      });
      Alert.alert('Agendamento confirmado', `${date.toLocaleDateString('pt-BR')} às ${time}`);
      setTime('');
    } catch (failure) { setError(failure.message || 'Não foi possível confirmar o agendamento.'); }
    finally { setBusy(false); }
  };

  const itemStyle = { padding: 15, marginTop: 10, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
  const textStyle = { color: colors.text, fontSize: 15, lineHeight: 22 };
  const mutedStyle = { color: colors.muted, fontSize: 13, lineHeight: 19 };
  const headingStyle = { color: colors.text, fontSize: 18, fontWeight: '800' };
  const open = item => { setSelectedId(item.id); setTab('dados'); setError(''); setMode('detail'); };

  return <PortalBackground>
    <PortalScreenHeader navigation={navigation} title="Microempreendedor" subtitle="Assessoria para seu negócio" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 110 }}>
      {mode === 'list' ? <>
        {button('Nova solicitação', () => { setError(''); setMode('new'); }, true)}
        <Text style={{ ...headingStyle, marginTop: 26 }}>Minhas solicitações</Text>
        {loading ? <ActivityIndicator style={{ marginTop: 18 }} color={colors.primary} /> : null}
        {!loading && !items.length && !error ? <Text style={{ ...mutedStyle, marginTop: 12 }}>Você ainda não solicitou assessoria.</Text> : null}
        {items.map(item => <TouchableOpacity key={item.id} onPress={() => open(item)} accessibilityRole="button" style={itemStyle}>
          <Text style={{ ...textStyle, fontWeight: '800' }}>{item.dadosAssessoria?.tipo || 'Assessoria'}</Text>
          <Text style={{ ...mutedStyle, marginTop: 4 }}>{item.status || 'Recebida'} · {formatDate(item.dataSolicitacao)}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} style={{ position: 'absolute', right: 12, top: 22 }} />
        </TouchableOpacity>)}
      </> : null}

      {mode === 'new' ? <>
        <Text style={headingStyle}>Nova assessoria</Text>
        <Text style={{ ...textStyle, marginTop: 18, fontWeight: '800' }}>Tipo de orientação</Text>
        {TYPES.map(option => <TouchableOpacity key={option} onPress={() => setType(option)} accessibilityRole="radio" accessibilityState={{ checked: type === option }} style={{ ...itemStyle, borderColor: type === option ? colors.primary : colors.border, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name={type === option ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.primary} />
          <Text style={{ ...textStyle, flex: 1, marginLeft: 10 }}>{option}</Text>
        </TouchableOpacity>)}
        {field('Nome do negócio (opcional)', business, setBusiness)}
        {field('CNPJ (opcional)', cnpj, value => { setCnpj(value); setCnpjData(null); }, { keyboardType: 'number-pad', maxLength: 18, placeholder: '00.000.000/0000-00' })}
        {cnpj ? button(busy ? 'Consultando...' : 'Consultar CNPJ', lookupCnpj, false, busy) : null}
        {cnpjData ? <Text style={{ ...mutedStyle, marginTop: 8 }}>{cnpjData.razaoSocial} · {cnpjData.situacaoCadastral}</Text> : null}
        <Text style={{ ...textStyle, marginTop: 20, fontWeight: '800' }}>Contato preferencial</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>{['WhatsApp', 'Telefone', 'Email'].map(option => <TouchableOpacity key={option} onPress={() => setContact(option)} accessibilityRole="radio" accessibilityState={{ checked: contact === option }} style={{ flex: 1, minHeight: 43, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, borderColor: contact === option ? colors.primary : colors.border, backgroundColor: colors.card }}><Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{option}</Text></TouchableOpacity>)}</View>
        {field('Descreva sua necessidade', description, setDescription, { multiline: true, maxLength: 20000 })}
        {button(busy ? 'Enviando...' : 'Enviar solicitação', create, true, busy)}
        {button('Voltar', () => { setError(''); setMode('list'); })}
      </> : null}

      {mode === 'detail' && selected ? <>
        <Text style={headingStyle}>{selected.dadosAssessoria?.tipo || 'Assessoria'}</Text>
        <Text style={{ ...mutedStyle, marginTop: 6 }}>{selected.status} · {formatDate(selected.dataSolicitacao)}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>{['dados', 'mensagens'].map(option => <TouchableOpacity key={option} onPress={() => setTab(option)} accessibilityRole="tab" accessibilityState={{ selected: tab === option }} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: tab === option ? 2 : 1, borderColor: tab === option ? colors.primary : colors.border }}><Text style={{ color: tab === option ? colors.primary : colors.muted, fontWeight: '800' }}>{option === 'dados' ? 'Dados' : 'Mensagens'}</Text></TouchableOpacity>)}</View>
        {tab === 'dados' ? <>
          <View style={itemStyle}>
            <Text style={textStyle}>Negócio: {selected.dadosAssessoria?.nomeNegocio || 'Não informado'}</Text>
            <Text style={textStyle}>CNPJ: {selected.dadosAssessoria?.cnpj || 'Não informado'}</Text>
            <Text style={textStyle}>Contato: {selected.dadosAssessoria?.contatoPreferencial || 'Não informado'}</Text>
            <Text style={{ ...textStyle, marginTop: 10 }}>{selected.dadosAssessoria?.descricao}</Text>
            {selected.status === 'Agendado' ? <Text style={{ ...textStyle, marginTop: 12, fontWeight: '800' }}>Agendado para {selected.appointmentDate?.split('-').reverse().join('/')} às {selected.appointmentTime}</Text> : null}
          </View>
          {selected.status === 'Agendamento Liberado' ? <View style={{ marginTop: 22 }}>
            <Text style={headingStyle}>Agendamento</Text>
            {button(`Data: ${date.toLocaleDateString('pt-BR')}`, () => setShowDatePicker(true))}
            {showDatePicker ? <DateTimePicker value={date} minimumDate={new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(_, value) => { if (Platform.OS !== 'ios') setShowDatePicker(false); if (value) { setDate(value); setTime(''); } }} /> : null}
            {blocked ? <Text style={{ ...mutedStyle, marginTop: 12 }}>Esta data está bloqueada.</Text> : null}
            {!availability ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} /> : !slots.length && !blocked ? <Text style={{ ...mutedStyle, marginTop: 12 }}>Sem horários disponíveis nesta data.</Text> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{slots.map(slot => <TouchableOpacity key={slot} onPress={() => setTime(slot)} accessibilityRole="radio" accessibilityState={{ checked: time === slot }} style={{ padding: 12, borderWidth: 1, borderColor: time === slot ? colors.primary : colors.border, backgroundColor: colors.card, borderRadius: 8 }}><Text style={{ color: colors.text, fontWeight: '700' }}>{slot}</Text></TouchableOpacity>)}</View>
            {button(busy ? 'Confirmando...' : 'Confirmar agendamento', schedule, true, busy || !time)}
          </View> : null}
        </> : <>
          {Object.entries(selected.messages || {}).sort((a, b) => String(a[1].timestamp).localeCompare(String(b[1].timestamp))).map(([id, entry]) => <View key={id} style={itemStyle}><Text style={{ ...mutedStyle, fontWeight: '800' }}>{entry.sender === 'admin' ? 'Equipe' : 'Você'}</Text><Text style={textStyle}>{entry.text}</Text><Text style={mutedStyle}>{entry.timestamp ? new Date(entry.timestamp).toLocaleString('pt-BR') : ''}</Text></View>)}
          {!Object.keys(selected.messages || {}).length ? <Text style={{ ...mutedStyle, marginTop: 15 }}>Nenhuma mensagem ainda.</Text> : null}
          {field('Mensagem', message, setMessage, { multiline: true, maxLength: 2000 })}
          {button(busy ? 'Enviando...' : 'Enviar mensagem', sendMessage, true, busy || !message.trim())}
        </>}
        {button('Voltar às solicitações', () => { setError(''); setMode('list'); })}
      </> : null}
      {error ? <Text selectable style={{ color: colors.danger, marginTop: 18, lineHeight: 20 }}>{error}</Text> : null}
    </ScrollView>
  </PortalBackground>;
}
