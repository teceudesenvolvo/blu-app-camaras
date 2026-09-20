import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { PortalBackground, PortalScreenHeader } from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';

const emptyForm = { assunto: '', descricao: '', cepAcontecimento: '', cidadeAcontecimento: '', bairroAcontecimento: '', enderecoAcontecimento: '', numeroAcontecimento: '' };
const dateLabel = value => value?.toDate?.()?.toLocaleDateString('pt-BR') || 'Data não informada';

export default function AtendimentoJuridicoScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const colors = useTheme().portal;
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('list');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user?.uid) return undefined;
    return onSnapshot(query(collection(firestore, 'atendimento-juridico'), where('userId', '==', user.uid)), snapshot => {
      setItems(snapshot.docs.map(row => ({ id: row.id, ...row.data() })).sort((a, b) => (b.dataSolicitacao?.toMillis?.() || 0) - (a.dataSolicitacao?.toMillis?.() || 0)));
      setLoading(false); setError('');
    }, failure => { setError(failure.message || 'Não foi possível carregar suas solicitações.'); setLoading(false); });
  }, [user?.uid]);

  const field = (label, key, multiline = false) => <View style={{ marginTop: 16 }}>
    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{label}</Text>
    <TextInput value={form[key]} onChangeText={value => setForm(previous => ({ ...previous, [key]: value }))} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} placeholderTextColor={colors.muted} maxLength={multiline ? 10000 : 250} keyboardType={key === 'cepAcontecimento' || key === 'numeroAcontecimento' ? 'number-pad' : 'default'} style={{ minHeight: multiline ? 120 : 48, marginTop: 7, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text }} />
  </View>;
  const button = (label, onPress, disabled = false) => <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled} style={{ minHeight: 48, marginTop: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 8, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{label}</Text></TouchableOpacity>;

  const submit = async () => {
    if (busy) return;
    if (!form.assunto.trim() || form.descricao.trim().length < 20) { setError('Informe o assunto e descreva o caso em pelo menos 20 caracteres.'); return; }
    setBusy(true); setError('');
    try {
      const profile = (await getDoc(doc(firestore, 'users', user.uid))).data() || {};
      await addDoc(collection(firestore, 'atendimento-juridico'), {
        dadosAcontecimento: { ...form, assunto: form.assunto.trim(), descricao: form.descricao.trim(), dataAcontecimento: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` },
        dadosUsuario: { id: user.uid, email: profile.email || user.email || '', name: profile.name || profile.nome || user.displayName || '', cpf: profile.cpf || 'Não informado', phone: profile.phone || profile.telefone || 'Não informado', address: profile.address || '', city: profile.city || '', state: profile.state || '', cep: profile.cep || '' },
        userId: user.uid, status: 'Aguardando Atendimento', dataSolicitacao: serverTimestamp(),
      });
      setForm(emptyForm); setMode('list'); Alert.alert('Solicitação enviada', 'Seu pedido de orientação jurídica foi registrado.');
    } catch (failure) { setError(failure.message || 'Não foi possível enviar a solicitação.'); }
    finally { setBusy(false); }
  };

  return <PortalBackground>
    <PortalScreenHeader navigation={navigation} title="Atendimento Jurídico" subtitle="Orientações e solicitações" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 110 }}>
      {mode === 'list' ? <>
        {button('Nova solicitação', () => { setError(''); setMode('new'); })}
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, marginTop: 26 }}>Meus atendimentos</Text>
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 18 }} /> : null}
        {!loading && !items.length && !error ? <Text style={{ color: colors.muted, marginTop: 15 }}>Nenhuma solicitação registrada.</Text> : null}
        {items.map(item => <TouchableOpacity key={item.id} onPress={() => { setSelected(item); setMode('detail'); }} accessibilityRole="button" style={{ marginTop: 10, padding: 16, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.text, fontWeight: '800' }}>{item.dadosAcontecimento?.assunto || 'Orientação jurídica'}</Text><Text style={{ color: colors.muted, marginTop: 5 }}>{item.status} · {dateLabel(item.dataSolicitacao)}</Text></TouchableOpacity>)}
      </> : null}
      {mode === 'new' ? <>
        {field('Assunto', 'assunto')}
        {field('Descrição do caso', 'descricao', true)}
        <Text style={{ color: colors.text, fontWeight: '800', marginTop: 18 }}>Data do acontecimento</Text>
        {button(date.toLocaleDateString('pt-BR'), () => setShowPicker(true))}
        {showPicker ? <DateTimePicker value={date} maximumDate={new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(_, value) => { if (Platform.OS !== 'ios') setShowPicker(false); if (value) setDate(value); }} /> : null}
        {field('CEP do local', 'cepAcontecimento')}
        {field('Endereço', 'enderecoAcontecimento')}
        {field('Número', 'numeroAcontecimento')}
        {field('Bairro', 'bairroAcontecimento')}
        {field('Cidade', 'cidadeAcontecimento')}
        {button(busy ? 'Enviando...' : 'Enviar solicitação', submit, busy)}
      </> : null}
      {mode === 'detail' && selected ? <View style={{ padding: 16, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{selected.dadosAcontecimento?.assunto}</Text>
        <Text style={{ color: colors.primary, marginTop: 8 }}>{selected.status}</Text>
        <Text style={{ color: colors.muted, marginTop: 8 }}>Solicitado em {dateLabel(selected.dataSolicitacao)}</Text>
        <Text selectable style={{ color: colors.text, lineHeight: 22, marginTop: 18 }}>{selected.dadosAcontecimento?.descricao}</Text>
        <Text style={{ color: colors.muted, marginTop: 14 }}>Data do acontecimento: {selected.dadosAcontecimento?.dataAcontecimento || 'Não informada'}</Text>
      </View> : null}
      {mode !== 'list' ? button('Voltar aos atendimentos', () => { setError(''); setMode('list'); }) : null}
      {error ? <Text selectable style={{ color: colors.danger, marginTop: 16 }}>{error}</Text> : null}
    </ScrollView>
  </PortalBackground>;
}
