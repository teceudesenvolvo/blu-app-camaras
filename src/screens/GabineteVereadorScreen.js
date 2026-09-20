import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, where, query } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { firestore } from '../../services/firebaseConfig';
import { uploadFileToStorage } from '../../services/storageService';
import { ModuleButton, ModuleError, ModuleField, ModulePage, ModuleRow, ModuleText } from '../components/CitizenModuleUi';
import { AuthContext } from '../context/AuthContext';

const emptyForm = { assunto: '', descricao: '', endereco: '', categoria: 'Outra demanda' };
const formatDate = value => value?.toDate?.()?.toLocaleDateString('pt-BR') || '';

export default function GabineteVereadorScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [mode, setMode] = useState('list');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [selfieUri, setSelfieUri] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const member = members.find(item => (item.userId || item.id) === memberId);
  const registered = visitors.some(item => item.gabineteId === memberId && item.cadastroCompleto);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const stopMembers = onSnapshot(collection(firestore, 'vereadores'), snapshot => setMembers(snapshot.docs.map(row => ({ id: row.id, ...row.data() }))), failure => setError(failure.message));
    const own = where('userId', '==', user.uid);
    const stopRequests = onSnapshot(query(collection(firestore, 'solicitacoes-vereadores'), own), snapshot => { setRequests(snapshot.docs.map(row => ({ id: row.id, ...row.data() })).sort((a, b) => (b.dataSolicitacao?.toMillis?.() || 0) - (a.dataSolicitacao?.toMillis?.() || 0))); setLoading(false); }, failure => { setError(failure.message); setLoading(false); });
    const stopMessages = onSnapshot(query(collection(firestore, 'gabinetes-mensagens'), own), snapshot => setMessages(snapshot.docs.map(row => ({ id: row.id, ...row.data() })).sort((a, b) => (a.criadoEm?.toMillis?.() || 0) - (b.criadoEm?.toMillis?.() || 0))), failure => setError(failure.message));
    const stopVisitors = onSnapshot(query(collection(firestore, 'gabinetes-visitantes'), own), snapshot => setVisitors(snapshot.docs.map(row => ({ id: row.id, ...row.data() }))), failure => setError(failure.message));
    return () => { stopMembers(); stopRequests(); stopMessages(); stopVisitors(); };
  }, [user?.uid]);

  const userData = async () => {
    const profile = (await getDoc(doc(firestore, 'users', user.uid))).data() || {};
    return { id: user.uid, email: profile.email || user.email || '', name: profile.name || profile.nome || user.displayName || '', phone: profile.phone || profile.telefone || '', address: profile.address || '', birthDate: profile.birthDate || profile.dataNascimento || '' };
  };
  const sendRequest = async isMeeting => {
    if (busy) return;
    if (!memberId || !form.assunto.trim() || form.descricao.trim().length < 15 || (!isMeeting && !form.endereco.trim()) || (isMeeting && !registered)) {
      setError(isMeeting && !registered ? 'Cadastre-se como visitante deste gabinete antes de solicitar uma reunião.' : 'Selecione o vereador e preencha assunto, descrição e endereço da demanda.'); return;
    }
    setBusy(true); setError('');
    try {
      const protocol = `GAB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      await addDoc(collection(firestore, 'solicitacoes-vereadores'), {
        protocolo: protocol, userId: user.uid, gabineteId: memberId, tipoDemanda: isMeeting ? 'Atendimento no gabinete' : form.categoria,
        dadosUsuario: await userData(), dadosSolicitacao: { ...form, vereadorId: memberId, vereadorNome: member?.name || member?.nome || 'Vereador(a)', categoriaDemanda: isMeeting ? 'Atendimento no gabinete' : form.categoria, tipoAtendimento: 'Presencial' },
        fotos: [], status: isMeeting ? 'Aguardando Análise' : 'RECEBIDA', prioridade: 'Normal', dataSolicitacao: serverTimestamp(),
      });
      setNotice(`Solicitação recebida. Protocolo ${protocol}.`); setForm(emptyForm); setMode('list');
    } catch (failure) { setError(failure.message || 'Não foi possível enviar a solicitação.'); }
    finally { setBusy(false); }
  };
  const chooseSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { setError('Permita o uso da câmera para concluir o cadastro de visitante.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
    if (!result.canceled) setSelfieUri(result.assets[0]?.uri || '');
  };
  const registerVisitor = async () => {
    if (busy || !memberId || !selfieUri) { setError('Selecione o gabinete e tire uma selfie.'); return; }
    setBusy(true); setError('');
    try {
      const selfieUrl = await uploadFileToStorage(selfieUri, `gabinetes/${memberId}/${user.uid}`);
      await setDoc(doc(firestore, 'gabinetes-visitantes', `${memberId}_${user.uid}`), { ...(await userData()), userId: user.uid, selfieUrl, gabineteId: memberId, criadoEm: serverTimestamp(), cadastroCompleto: true }, { merge: true });
      setSelfieUri(''); setMode('new'); setNotice('Cadastro de visitante concluído. Você já pode solicitar uma reunião.');
    } catch (failure) { setError(failure.message || 'Não foi possível concluir o cadastro.'); }
    finally { setBusy(false); }
  };
  const sendMessage = async () => {
    if (busy || !memberId || !message.trim()) return;
    setBusy(true); setError('');
    try {
      const profile = await userData();
      await addDoc(collection(firestore, 'gabinetes-mensagens'), { gabineteId: memberId, userId: user.uid, nomeUsuario: profile.name || user.email, texto: message.trim(), autorId: user.uid, autorTipo: 'cidadao', criadoEm: serverTimestamp() });
      setMessage('');
    } catch (failure) { setError(failure.message || 'Não foi possível enviar a mensagem.'); }
    finally { setBusy(false); }
  };
  const acceptTime = async (item, offer) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await updateDoc(doc(firestore, 'solicitacoes-vereadores', item.id), { status: 'Agendado', appointmentDate: offer.date, appointmentTime: offer.time, agendadoPor: user.uid, ultimaAtualizacao: serverTimestamp() });
      setNotice('Horário confirmado.');
    } catch (failure) { setError(failure.message || 'Não foi possível confirmar o horário.'); }
    finally { setBusy(false); }
  };

  return <ModulePage navigation={navigation} title="Gabinete Vereador" subtitle="Demandas, reuniões e mensagens">
    {notice ? <ModuleText style={{ color: '#15803d', marginBottom: 12 }}>{notice}</ModuleText> : null}
    <ModuleButton onPress={() => { setMode('new'); setError(''); }}>Nova demanda ou reunião</ModuleButton>
    <ModuleButton secondary onPress={() => { setMode('messages'); setError(''); }}>Mensagens ao gabinete</ModuleButton>
    {mode === 'list' ? <>
      <ModuleText heading style={{ marginTop: 24 }}>Minhas solicitações</ModuleText>
      {loading ? <ActivityIndicator style={{ marginTop: 18 }} /> : null}
      {!loading && !requests.length ? <ModuleText muted style={{ marginTop: 10 }}>Nenhuma solicitação registrada.</ModuleText> : null}
      {requests.map(item => <ModuleRow key={item.id} title={item.dadosSolicitacao?.assunto || item.protocolo} detail={`${item.status} · ${formatDate(item.dataSolicitacao)}`} disabled>
        {item.status === 'Datas Liberadas' ? (item.horariosOferecidos || []).map(offer => <ModuleButton key={`${offer.date}-${offer.time}`} disabled={busy} onPress={() => acceptTime(item, offer)}>{offer.date?.split('-').reverse().join('/')} às {offer.time}</ModuleButton>) : null}
      </ModuleRow>)}
    </> : null}
    {mode !== 'list' ? <>
      <ModuleText heading style={{ marginTop: 24 }}>Escolha o vereador</ModuleText>
      {members.map(item => { const id = item.userId || item.id; return <ModuleRow key={id} title={item.name || item.nome || 'Vereador(a)'} detail={memberId === id ? 'Selecionado' : ''} onPress={() => setMemberId(id)} />; })}
      {!members.length ? <ModuleText muted style={{ marginTop: 12 }}>Nenhum vereador disponível.</ModuleText> : null}
    </> : null}
    {mode === 'new' ? <>
      <ModuleField label="Assunto" value={form.assunto} onChangeText={value => setForm(previous => ({ ...previous, assunto: value }))} />
      <ModuleField label="Descrição" value={form.descricao} onChangeText={value => setForm(previous => ({ ...previous, descricao: value }))} multiline />
      <ModuleField label="Endereço da demanda" value={form.endereco} onChangeText={value => setForm(previous => ({ ...previous, endereco: value }))} />
      <ModuleButton disabled={busy || !memberId} onPress={() => sendRequest(false)}>{busy ? 'Enviando...' : 'Enviar demanda'}</ModuleButton>
      {memberId ? <ModuleButton secondary onPress={() => setMode(registered ? 'meeting' : 'visitor')}>{registered ? 'Solicitar reunião' : 'Cadastrar visitante para reunião'}</ModuleButton> : null}
    </> : null}
    {mode === 'visitor' ? <>
      <ModuleText muted style={{ marginTop: 16 }}>O cadastro de visitante com selfie é necessário para pedir uma reunião neste gabinete.</ModuleText>
      <ModuleButton secondary onPress={chooseSelfie}>{selfieUri ? 'Selfie selecionada' : 'Tirar selfie'}</ModuleButton>
      <ModuleButton disabled={busy || !selfieUri} onPress={registerVisitor}>{busy ? 'Salvando...' : 'Concluir cadastro'}</ModuleButton>
    </> : null}
    {mode === 'meeting' ? <>
      <ModuleField label="Assunto da reunião" value={form.assunto} onChangeText={value => setForm(previous => ({ ...previous, assunto: value }))} />
      <ModuleField label="Motivo" value={form.descricao} onChangeText={value => setForm(previous => ({ ...previous, descricao: value }))} multiline />
      <ModuleButton disabled={busy || !registered} onPress={() => sendRequest(true)}>{busy ? 'Enviando...' : 'Solicitar reunião'}</ModuleButton>
    </> : null}
    {mode === 'messages' ? <>
      {messages.filter(item => !memberId || item.gabineteId === memberId).map(item => <ModuleRow key={item.id} title={item.autorTipo === 'cidadao' ? 'Você' : 'Gabinete'} detail={item.texto} disabled />)}
      <ModuleField label="Sua mensagem" value={message} onChangeText={setMessage} multiline />
      <ModuleButton disabled={busy || !memberId || !message.trim()} onPress={sendMessage}>{busy ? 'Enviando...' : 'Enviar mensagem'}</ModuleButton>
    </> : null}
    {mode !== 'list' ? <ModuleButton secondary onPress={() => { setMode('list'); setError(''); }}>Voltar às solicitações</ModuleButton> : null}
    <ModuleError>{error}</ModuleError>
  </ModulePage>;
}
