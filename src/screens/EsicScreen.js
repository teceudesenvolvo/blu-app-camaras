import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { firestore, functions } from '../../services/firebaseConfig';
import { PortalBackground, PortalScreenHeader } from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';

const callEsic = async data => (await httpsCallable(functions, 'esic')(data)).data;
const formatDate = value => value ? new Date(value).toLocaleDateString('pt-BR') : '—';

export default function EsicScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const colors = theme.portal;
  const [mode, setMode] = useState('list');
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [detail, setDetail] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [appeal, setAppeal] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async (next = null) => {
    setBusy(true);
    setError('');
    try {
      const result = await callEsic({ action: 'list', cursor: next });
      setItems(previous => next ? [...previous, ...(result.items || [])] : (result.items || []));
      setCursor(result.cursor || null);
      setLoaded(true);
    } catch (failure) {
      setError(failure.message || 'Não foi possível carregar seus pedidos.');
    } finally {
      setBusy(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const open = async id => {
    setBusy(true);
    setError('');
    try {
      let result = await callEsic({ action: 'detail', id });
      if (result.status === 'Respondido' && !result.cienciaAt) {
        await callEsic({ action: 'acknowledge', id });
        result = await callEsic({ action: 'detail', id });
      }
      setDetail(result);
      setMode('detail');
    } catch (failure) {
      setError(failure.message || 'Não foi possível abrir o pedido.');
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (busy) return;
    if (!title.trim() || description.trim().length < 20) {
      setError('Informe o assunto e uma descrição com pelo menos 20 caracteres.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const profileRef = doc(firestore, 'users', user.uid);
      const profile = (await getDoc(profileRef)).data() || {};
      const fullName = String(profile.nome || profile.name || user.displayName || '').trim();
      if (!fullName) {
        setError('Conclua seu nome em Dados pessoais antes de enviar o pedido.');
        return;
      }
      if (!profile.nome) await updateDoc(profileRef, { nome: fullName });
      const result = await callEsic({ action: 'create', titulo: title.trim(), descricao: description.trim() });
      setNotice('Pedido enviado. Protocolo: ' + result.protocolo);
      setTitle('');
      setDescription('');
      setMode('list');
      await load();
    } catch (failure) {
      setError(failure.message || 'Não foi possível enviar o pedido. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const sendAppeal = async () => {
    if (busy || !detail || appeal.trim().length < 20) {
      setError('Descreva o recurso em pelo menos 20 caracteres.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await callEsic({ action: 'appeal', id: detail.id, texto: appeal.trim() });
      setDetail(await callEsic({ action: 'detail', id: detail.id }));
      setAppeal('');
      setNotice('Recurso apresentado com sucesso.');
      await load();
    } catch (failure) {
      setError(failure.message || 'Não foi possível enviar o recurso.');
    } finally {
      setBusy(false);
    }
  };

  const button = (label, onPress, filled = false, disabled = false) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={{ minHeight: 48, paddingHorizontal: 16, marginTop: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? colors.primary : colors.card, borderWidth: filled ? 0 : 1, borderColor: colors.border, opacity: disabled ? 0.6 : 1 }}
    >
      <Text style={{ color: filled ? '#fff' : colors.primary, fontWeight: '800' }}>{label}</Text>
    </TouchableOpacity>
  );

  const inputStyle = { minHeight: 52, padding: 12, marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, fontSize: 15 };
  const bodyStyle = { color: colors.muted, fontSize: 14, lineHeight: 21 };
  const headingStyle = { color: colors.text, fontSize: 17, fontWeight: '800', lineHeight: 23 };

  return (
    <PortalBackground>
      <PortalScreenHeader navigation={navigation} title="e-SIC" subtitle="Pedidos de acesso à informação" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
        refreshControl={mode === 'list' ? <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} /> : undefined}
      >
        {mode === 'list' ? <>
          {button('Novo pedido de informação', () => { setError(''); setNotice(''); setMode('new'); }, true)}
          {notice ? <Text selectable style={{ ...bodyStyle, color: colors.success, marginTop: 14 }}>{notice}</Text> : null}
          {busy && !loaded ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
          {loaded && items.length === 0 && !error ? <Text style={{ ...bodyStyle, marginTop: 24 }}>Você ainda não possui pedidos de informação.</Text> : null}
          {items.map(item => (
            <TouchableOpacity key={item.id} onPress={() => open(item.id)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', padding: 16, marginTop: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
              <View style={{ flex: 1 }}>
                <Text selectable style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>{item.protocolo}</Text>
                <Text numberOfLines={2} style={{ ...headingStyle, fontSize: 15, marginTop: 4 }}>{item.titulo}</Text>
                <Text style={{ ...bodyStyle, marginTop: 4 }}>{item.status} · {formatDate(item.createdAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          ))}
          {cursor ? button(busy ? 'Carregando...' : 'Carregar mais', () => load(cursor), false, busy) : null}
        </> : null}

        {mode === 'new' ? <>
          <Text style={headingStyle}>Novo pedido</Text>
          <Text style={{ ...bodyStyle, marginTop: 8 }}>Descreva a informação desejada. Não é necessário justificar o motivo.</Text>
          <Text style={{ ...headingStyle, fontSize: 13, marginTop: 22 }}>Assunto</Text>
          <TextInput value={title} onChangeText={setTitle} maxLength={200} placeholder="Qual informação você procura?" placeholderTextColor={colors.muted} style={inputStyle} />
          <Text style={{ ...headingStyle, fontSize: 13, marginTop: 18 }}>Descrição</Text>
          <TextInput value={description} onChangeText={setDescription} maxLength={20000} multiline textAlignVertical="top" placeholder="Descreva seu pedido" placeholderTextColor={colors.muted} style={{ ...inputStyle, minHeight: 150 }} />
          {button(busy ? 'Enviando...' : 'Enviar pedido', create, true, busy)}
          {button('Voltar aos pedidos', () => { setError(''); setMode('list'); })}
        </> : null}

        {mode === 'detail' && detail ? <>
          <Text selectable style={{ color: colors.primary, fontWeight: '800' }}>{detail.protocolo}</Text>
          <Text selectable style={{ ...headingStyle, marginTop: 8 }}>{detail.titulo}</Text>
          <Text selectable style={{ ...bodyStyle, marginTop: 12 }}>{detail.descricao}</Text>
          <Text style={{ ...bodyStyle, marginTop: 14 }}>Status: {detail.status}</Text>
          <Text style={bodyStyle}>Prazo: {formatDate(detail.deadline)}</Text>
          {detail.status === 'Respondido' ? <>
            <Text style={{ ...headingStyle, marginTop: 24 }}>Apresentar recurso</Text>
            <TextInput value={appeal} onChangeText={setAppeal} multiline textAlignVertical="top" placeholder="Explique o motivo do recurso" placeholderTextColor={colors.muted} style={{ ...inputStyle, minHeight: 100 }} />
            {button(busy ? 'Enviando...' : 'Enviar recurso', sendAppeal, true, busy)}
          </> : null}
          <Text style={{ ...headingStyle, marginTop: 28 }}>Histórico</Text>
          {(detail.historico || []).map(entry => (
            <View key={entry.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12 }}>
              <Text style={{ ...headingStyle, fontSize: 14 }}>{entry.acao}</Text>
              <Text selectable style={bodyStyle}>{entry.texto}</Text>
              <Text style={{ ...bodyStyle, fontSize: 12 }}>{formatDate(entry.data)}</Text>
            </View>
          ))}
          {button('Voltar aos pedidos', () => { setError(''); setMode('list'); })}
        </> : null}

        {error ? <View style={{ padding: 14, marginTop: 18, borderRadius: 8, backgroundColor: colors.card, borderColor: colors.danger, borderWidth: 1 }}>
          <Text selectable style={{ ...bodyStyle, color: colors.danger }}>{error}</Text>
          {mode === 'list' ? button('Tentar novamente', () => load(), false, busy) : null}
        </View> : null}
      </ScrollView>
    </PortalBackground>
  );
}
