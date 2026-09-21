import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc, where, query } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, Text } from 'react-native';
import { useTheme } from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { uploadFileToStorage } from '../../services/storageService';
import { ModuleButton, ModuleError, ModuleField, ModulePage, ModuleRow, ModuleText } from '../components/CitizenModuleUi';
import { AuthContext } from '../context/AuthContext';
import { appointmentQrUrl } from '../utils/appointmentQr';
import { fetchAddressByCep, formatCep } from '../utils/brasilForms';

const emptyForm = { assunto: '', descricao: '', endereco: '', categoria: 'Outra demanda' };
const formatDate = value => value?.toDate?.()?.toLocaleDateString('pt-BR') || '';
const isoDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const weekday = value => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
const APPOINTMENT_RELEASED_STATUSES = ['Agendamento Liberado', 'Datas Liberadas'];

export default function GabineteVereadorScreen({ navigation }) {
  const theme = useTheme();
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
  const [memberPickerVisible, setMemberPickerVisible] = useState(false);
  const [availability, setAvailability] = useState({});
  const [bookedSlots, setBookedSlots] = useState({});
  const [blockedDates, setBlockedDates] = useState([]);
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentTime, setAppointmentTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cep, setCep] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [demandImages, setDemandImages] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const member = members.find(item => (item.userId || item.id) === memberId);
  const visitSchedulingEnabled = member?.permiteAgendamentoVisita !== false && member?.permiteAgendamento !== false && member?.agendamentoVisitaAtivo !== false;
  const registered = visitors.some(item => item.gabineteId === memberId && item.cadastroCompleto);
  const appointmentDateValue = isoDate(appointmentDate);
  const availableTimes = (blockedDates.includes(appointmentDateValue) ? [] : (availability[weekday(appointmentDateValue)] || [])).filter(slot => !(bookedSlots[appointmentDateValue] || []).includes(slot));
  const selectedRequest = requests.find(item => item.id === selectedRequestId);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const stopMembers = onSnapshot(collection(firestore, 'vereadores'), snapshot => setMembers(snapshot.docs.map(row => ({ id: row.id, ...row.data() }))), failure => setError(failure.message));
    const own = where('userId', '==', user.uid);
    const stopRequests = onSnapshot(query(collection(firestore, 'solicitacoes-vereadores'), own), snapshot => { setRequests(snapshot.docs.map(row => ({ id: row.id, ...row.data() })).sort((a, b) => (b.dataSolicitacao?.toMillis?.() || 0) - (a.dataSolicitacao?.toMillis?.() || 0))); setLoading(false); }, failure => { setError(failure.message); setLoading(false); });
    const stopMessages = onSnapshot(query(collection(firestore, 'gabinetes-mensagens'), own), snapshot => setMessages(snapshot.docs.map(row => ({ id: row.id, ...row.data() })).sort((a, b) => (a.criadoEm?.toMillis?.() || 0) - (b.criadoEm?.toMillis?.() || 0))), failure => setError(failure.message));
    const stopVisitors = onSnapshot(query(collection(firestore, 'gabinetes-visitantes'), own), snapshot => setVisitors(snapshot.docs.map(row => ({ id: row.id, ...row.data() }))), failure => setError(failure.message));
    return () => { stopMembers(); stopRequests(); stopMessages(); stopVisitors(); };
  }, [user?.uid]);

  useEffect(() => {
    if (mode !== 'meeting' || !memberId) return undefined;
    let active = true;
    Promise.all(['availability', 'blockedDates', 'bookedSlots'].map(id => getDoc(doc(firestore, `vereadores-agenda-config/${memberId}/agenda`, id))))
      .then(([available, blocked, booked]) => { if (!active) return; setAvailability(available.data() || {}); setBlockedDates(blocked.data()?.dates || []); setBookedSlots(booked.data() || {}); setAppointmentTime(''); })
      .catch(failure => { if (active) setError(failure.message || 'Não foi possível carregar a agenda do gabinete.'); });
    return () => { active = false; };
  }, [memberId, mode]);

  const userData = async () => {
    const profile = (await getDoc(doc(firestore, 'users', user.uid))).data() || {};
    return { id: user.uid, email: profile.email || user.email || '', name: profile.name || profile.nome || user.displayName || '', phone: profile.phone || profile.telefone || '', address: profile.address || '', birthDate: profile.birthDate || profile.dataNascimento || '' };
  };
  const sendRequest = async isMeeting => {
    if (busy) return;
    if (!memberId || !form.assunto.trim() || form.descricao.trim().length < 15 || (!isMeeting && !form.endereco.trim()) || (isMeeting && (!registered || !visitSchedulingEnabled || !appointmentTime || !availableTimes.includes(appointmentTime)))) {
      setError(isMeeting && !registered ? 'Cadastre-se como visitante deste gabinete antes de solicitar uma reunião.' : isMeeting && !visitSchedulingEnabled ? 'Este gabinete não permite agendamento de visitas.' : isMeeting ? 'Escolha uma data e um horário disponível.' : 'Selecione o vereador e preencha assunto, descrição e endereço da demanda.'); return;
    }
    setBusy(true); setError('');
    try {
      const protocol = `GAB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const fotos = isMeeting ? [] : await Promise.all(demandImages.map(async (image, index) => ({
        name: image.fileName || `demanda-${index + 1}.jpg`,
        url: await uploadFileToStorage(image.uri, `gabinetes/${memberId}/${user.uid}/demandas`),
        type: image.mimeType || 'image/jpeg',
      })));
      const request = {
        protocolo: protocol, userId: user.uid, gabineteId: memberId, tipoDemanda: isMeeting ? 'Atendimento no gabinete' : form.categoria,
        dadosUsuario: await userData(), dadosSolicitacao: { ...form, vereadorId: memberId, vereadorNome: member?.name || member?.nome || 'Vereador(a)', categoriaDemanda: isMeeting ? 'Atendimento no gabinete' : form.categoria, tipoAtendimento: 'Presencial' },
        fotos, status: isMeeting ? 'Aguardando Análise' : 'RECEBIDA', prioridade: 'Normal', dataSolicitacao: serverTimestamp(),
        ...(isMeeting ? { appointmentDate: appointmentDateValue, appointmentTime } : {}),
      };
      if (isMeeting) {
        const slotRef = doc(firestore, `vereadores-agenda-config/${memberId}/agenda`, 'bookedSlots');
        await runTransaction(firestore, async transaction => {
          const current = (await transaction.get(slotRef)).data() || {};
          const reserved = current[appointmentDateValue] || [];
          if (reserved.includes(appointmentTime)) throw new Error('Este horário acabou de ser reservado. Escolha outro.');
          transaction.set(slotRef, { [appointmentDateValue]: [...reserved, appointmentTime].sort() }, { merge: true });
          const requestRef = doc(collection(firestore, 'solicitacoes-vereadores'));
          request.appointmentQrCode = appointmentQrUrl({ collection: 'solicitacoes-vereadores', id: requestRef.id, module: 'agendaVereadores', appointmentDate: appointmentDateValue, appointmentTime });
          transaction.set(requestRef, request);
        });
      } else await addDoc(collection(firestore, 'solicitacoes-vereadores'), request);
      setNotice(`Solicitação recebida. Protocolo ${protocol}.`); setForm(emptyForm); setDemandImages([]); setAppointmentTime(''); setMode('list');
    } catch (failure) { setError(failure.message || 'Não foi possível enviar a solicitação.'); }
    finally { setBusy(false); }
  };
  const chooseDemandImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Permita o acesso às fotos para anexar imagens à demanda.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8, selectionLimit: 6 });
    if (!result.canceled) setDemandImages(result.assets || []);
  };
  const chooseSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { setError('Permita o uso da câmera para concluir o cadastro de visitante.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, cameraType: ImagePicker.CameraType.front, quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets?.[0]?.uri) setSelfieUri(result.assets[0].uri);
  };
  const loadAddressByCep = async value => {
    setCep(value);
    if (value.replace(/\D/g, '').length !== 8) return;
    setCepLoading(true); setError('');
    try { const address = await fetchAddressByCep(value); setCep(address.cep); setForm(previous => ({ ...previous, endereco: [address.address, address.neighborhood, address.city, address.state].filter(Boolean).join(', ') })); }
    catch (failure) { setError(failure.message || 'Não foi possível consultar o CEP.'); }
    finally { setCepLoading(false); }
  };
  const useDeviceLocation = async () => {
    setLocating(true); setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Permita o uso da localização para preencher o endereço da demanda.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = position.coords;
      setForm(previous => ({ ...previous, endereco: `Localização do dispositivo: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
      setNotice('Localização adicionada à demanda.');
    } catch (failure) { setError(failure.message || 'Não foi possível obter sua localização.'); }
    finally { setLocating(false); }
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
      await updateDoc(doc(firestore, 'solicitacoes-vereadores', item.id), { status: 'Agendado', appointmentDate: offer.date, appointmentTime: offer.time, appointmentQrCode: appointmentQrUrl({ collection: 'solicitacoes-vereadores', id: item.id, module: 'agendaVereadores', appointmentDate: offer.date, appointmentTime: offer.time }), agendadoPor: user.uid, ultimaAtualizacao: serverTimestamp() });
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
      {requests.map(item => <ModuleRow key={item.id} title={item.dadosSolicitacao?.assunto || item.protocolo} detail={`${item.status} · ${formatDate(item.dataSolicitacao)}`} onPress={() => { setSelectedRequestId(item.id); setMode('requestDetail'); }}>
        {APPOINTMENT_RELEASED_STATUSES.includes(item.status) ? (item.horariosOferecidos || []).map(offer => <ModuleButton key={`${offer.date}-${offer.time}`} disabled={busy} onPress={() => acceptTime(item, offer)}>{offer.date?.split('-').reverse().join('/')} às {offer.time}</ModuleButton>) : null}
      </ModuleRow>)}
    </> : null}
    {mode === 'requestDetail' && selectedRequest ? <>
      <ModuleText heading style={{ marginTop: 24 }}>{selectedRequest.dadosSolicitacao?.assunto || 'Detalhes da demanda'}</ModuleText>
      <ModuleText muted style={{ marginTop: 6 }}>{selectedRequest.protocolo || selectedRequest.id} · {formatDate(selectedRequest.dataSolicitacao)}</ModuleText>
      <ModuleText style={{ marginTop: 16 }}>Vereador: {selectedRequest.dadosSolicitacao?.vereadorNome || 'Não informado'}</ModuleText>
      <ModuleText style={{ marginTop: 12 }}>Situação: {selectedRequest.status || 'Recebida'}</ModuleText>
      {selectedRequest.dadosSolicitacao?.descricao ? <ModuleText style={{ marginTop: 12 }}>{selectedRequest.dadosSolicitacao.descricao}</ModuleText> : null}
      {selectedRequest.status === 'Agendado' ? <><ModuleRow title="Visita aprovada" detail={`${selectedRequest.appointmentDate?.split('-').reverse().join('/')} às ${selectedRequest.appointmentTime || 'horário não informado'}`} disabled />{selectedRequest.appointmentQrCode ? <Image source={{ uri: selectedRequest.appointmentQrCode }} resizeMode="contain" style={{ width: 220, height: 220, alignSelf: 'center', marginTop: 18 }} /> : null}</> : null}
      {APPOINTMENT_RELEASED_STATUSES.includes(selectedRequest.status) ? <><ModuleText heading style={{ marginTop: 22 }}>Escolha um horário</ModuleText>{(selectedRequest.horariosOferecidos || []).map(offer => <ModuleButton key={`${offer.date}-${offer.time}`} disabled={busy} onPress={() => acceptTime(selectedRequest, offer)}>{offer.date?.split('-').reverse().join('/')} às {offer.time}</ModuleButton>)}</> : null}
      {!['Agendado', ...APPOINTMENT_RELEASED_STATUSES].includes(selectedRequest.status) ? <ModuleText muted style={{ marginTop: 18 }}>O gabinete ainda está analisando esta solicitação. O agendamento aparecerá aqui quando for aprovado.</ModuleText> : null}
      <ModuleButton secondary onPress={() => setMode('list')}>Voltar às solicitações</ModuleButton>
    </> : null}
    {['new', 'messages', 'visitor', 'meeting'].includes(mode) ? <>
      <ModuleText heading style={{ marginTop: 24 }}>Escolha o vereador</ModuleText>
      <ModuleButton secondary onPress={() => setMemberPickerVisible(true)} disabled={!members.length}>
        {member ? `Vereador: ${member.name || member.nome || 'Vereador(a)'}` : members.length ? 'Selecione um vereador' : 'Nenhum vereador disponível'}
      </ModuleButton>
      <Modal visible={memberPickerVisible} transparent animationType="fade" onRequestClose={() => setMemberPickerVisible(false)}>
        <Pressable onPress={() => setMemberPickerVisible(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <Pressable onPress={event => event.stopPropagation()} style={{ backgroundColor: theme.portal.card, borderRadius: 16, borderWidth: 1, borderColor: theme.portal.border, padding: 16, maxHeight: '70%' }}>
            <Text style={{ color: theme.portal.text, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>Escolha o vereador</Text>
            <ScrollView showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 4 }}>
              {members.map(item => { const id = item.userId || item.id; return <Pressable key={id} onPress={() => { setMemberId(id); setMemberPickerVisible(false); }} style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.portal.border }}><Text style={{ color: theme.portal.text, fontSize: 15, fontWeight: memberId === id ? '800' : '500' }}>{item.name || item.nome || 'Vereador(a)'}</Text>{item.partido ? <Text style={{ color: theme.portal.muted, marginTop: 3 }}>{item.partido}</Text> : null}</Pressable>; })}
            </ScrollView>
            <Pressable onPress={() => setMemberPickerVisible(false)} style={{ alignItems: 'center', paddingTop: 16 }}><Text style={{ color: theme.portal.primary, fontWeight: '800' }}>Cancelar</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </> : null}
    {mode === 'new' ? <>
      <ModuleField label="Assunto" value={form.assunto} onChangeText={value => setForm(previous => ({ ...previous, assunto: value }))} />
      <ModuleField label="Descrição" value={form.descricao} onChangeText={value => setForm(previous => ({ ...previous, descricao: value }))} multiline />
      <ModuleText muted style={{ marginTop: 16 }}>Informe o endereço completo pelo CEP ou use a localização do dispositivo.</ModuleText>
      <ModuleField label="CEP" value={cep} onChangeText={value => loadAddressByCep(formatCep(value))} keyboardType="number-pad" />
      {cepLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      <ModuleField label="Endereço da demanda" value={form.endereco} onChangeText={value => setForm(previous => ({ ...previous, endereco: value }))} multiline />
      <ModuleButton secondary onPress={useDeviceLocation} disabled={locating}>{locating ? 'Obtendo localização...' : 'Usar localização do dispositivo'}</ModuleButton>
      <ModuleButton secondary onPress={chooseDemandImages}>Adicionar imagens ({demandImages.length}/6)</ModuleButton>
      {demandImages.length ? <ModuleText muted style={{ marginTop: 8 }}>{demandImages.map(image => image.fileName || 'Imagem selecionada').join(' · ')}</ModuleText> : null}
      <ModuleButton disabled={busy || !memberId} onPress={() => sendRequest(false)}>{busy ? 'Enviando...' : 'Enviar demanda'}</ModuleButton>
      {memberId && visitSchedulingEnabled ? <ModuleButton secondary onPress={() => setMode(registered ? 'meeting' : 'visitor')}>{registered ? 'Solicitar reunião' : 'Cadastrar visitante para reunião'}</ModuleButton> : null}
      {memberId && !visitSchedulingEnabled ? <ModuleText muted style={{ marginTop: 12 }}>Este gabinete não está recebendo agendamentos de visitas no momento.</ModuleText> : null}
    </> : null}
    {mode === 'visitor' ? <>
      <ModuleText muted style={{ marginTop: 16 }}>O cadastro de visitante com selfie é necessário para pedir uma reunião neste gabinete.</ModuleText>
      <ModuleButton secondary onPress={chooseSelfie}>{selfieUri ? 'Selfie selecionada' : 'Tirar selfie'}</ModuleButton>
      <ModuleButton disabled={busy || !selfieUri} onPress={registerVisitor}>{busy ? 'Salvando...' : 'Concluir cadastro'}</ModuleButton>
    </> : null}
    {mode === 'meeting' ? <>
      <ModuleText muted style={{ marginTop: 12 }}>Escolha uma data e um horário liberados pelo gabinete.</ModuleText>
      <ModuleButton secondary onPress={() => setShowDatePicker(true)}>{appointmentDateValue.split('-').reverse().join('/')}</ModuleButton>
      {showDatePicker ? <DateTimePicker value={appointmentDate} minimumDate={new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} themeVariant={theme.mode === 'dark' ? 'dark' : 'light'} onChange={(_, value) => { if (Platform.OS !== 'ios') setShowDatePicker(false); if (value) { setAppointmentDate(value); setAppointmentTime(''); } }} /> : null}
      {!availableTimes.length ? <ModuleText muted style={{ marginTop: 10 }}>Nenhum horário disponível nesta data.</ModuleText> : availableTimes.map(slot => <ModuleButton key={slot} secondary={slot !== appointmentTime} onPress={() => setAppointmentTime(slot)}>{slot}</ModuleButton>)}
      <ModuleField label="Assunto da reunião" value={form.assunto} onChangeText={value => setForm(previous => ({ ...previous, assunto: value }))} />
      <ModuleField label="Motivo" value={form.descricao} onChangeText={value => setForm(previous => ({ ...previous, descricao: value }))} multiline />
      <ModuleButton disabled={busy || !registered || !appointmentTime} onPress={() => sendRequest(true)}>{busy ? 'Enviando...' : 'Solicitar agendamento'}</ModuleButton>
    </> : null}
    {mode === 'messages' ? <>
      {messages.filter(item => !memberId || item.gabineteId === memberId).map(item => <ModuleRow key={item.id} title={item.autorTipo === 'cidadao' ? 'Você' : 'Gabinete'} detail={item.texto} disabled />)}
      <ModuleField label="Sua mensagem" value={message} onChangeText={setMessage} multiline />
      <ModuleButton disabled={busy || !memberId || !message.trim()} onPress={sendMessage}>{busy ? 'Enviando...' : 'Enviar mensagem'}</ModuleButton>
    </> : null}
    {['new', 'messages', 'visitor', 'meeting'].includes(mode) ? <ModuleButton secondary onPress={() => { setMode('list'); setError(''); }}>Voltar às solicitações</ModuleButton> : null}
    <ModuleError>{error}</ModuleError>
  </ModulePage>;
}
