import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, View } from 'react-native';
import { firestore } from '../../services/firebaseConfig';
import { ModuleButton, ModuleError, ModuleField, ModulePage, ModuleRow, ModuleText } from '../components/CitizenModuleUi';
import { AuthContext } from '../context/AuthContext';

const isoDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const brDate = value => { const [year, month, day] = String(value || '').split('-'); return `${day}/${month}/${year}`; };
const weekday = value => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
const initialComplaint = { assuntoDenuncia: '', companyName: '', cnpj: '', classificacao: '', descricao: '', pedidoConsumidor: '' };

export default function ProconScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [mode, setMode] = useState('list');
  const [complaints, setComplaints] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [complaint, setComplaint] = useState(initialComplaint);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [time, setTime] = useState('');
  const [subject, setSubject] = useState('');
  const [availability, setAvailability] = useState({});
  const [blockedDates, setBlockedDates] = useState([]);
  const [bookedSlots, setBookedSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.uid) return undefined;
    let received = 0;
    const failed = failure => { setError(failure.message || 'Não foi possível carregar o PROCON.'); setLoading(false); };
    const loaded = () => { received += 1; if (received >= 2) setLoading(false); };
    const unsubs = [
      onSnapshot(query(collection(firestore, 'procon-atendimentos'), where('userId', '==', user.uid)), snapshot => { setComplaints(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))); loaded(); }, failed),
      onSnapshot(query(collection(firestore, 'procon-agendamentos'), where('userId', '==', user.uid)), snapshot => { setAppointments(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))); loaded(); }, failed),
    ];
    return () => unsubs.forEach(unsubscribe => unsubscribe());
  }, [user?.uid]);

  useEffect(() => {
    if (mode !== 'schedule') return;
    Promise.all(['availability', 'blockedDates', 'bookedSlots'].map(id => getDoc(doc(firestore, 'procon-config', id))))
      .then(([available, blocked, booked]) => { setAvailability(available.data() || {}); setBlockedDates(blocked.data()?.dates || []); setBookedSlots(booked.data() || {}); setError(''); })
      .catch(failure => setError(failure.message || 'Não foi possível carregar a agenda.'));
  }, [mode]);

  const dateValue = isoDate(date);
  const freeTimes = useMemo(() => {
    if (blockedDates.includes(brDate(dateValue))) return [];
    return (availability[weekday(dateValue)] || []).filter(slot => !(bookedSlots[dateValue] || []).includes(slot));
  }, [availability, blockedDates, bookedSlots, dateValue]);

  const submitComplaint = async () => {
    if (busy) return;
    if (!complaint.assuntoDenuncia.trim() || !complaint.companyName.trim() || !complaint.classificacao.trim() || complaint.descricao.trim().length < 20 || !complaint.pedidoConsumidor.trim()) {
      setError('Informe assunto, fornecedor, classificação, descrição de pelo menos 20 caracteres e o pedido.'); return;
    }
    const cnpj = complaint.cnpj.replace(/\D/g, '');
    if (cnpj && cnpj.length !== 14) { setError('O CNPJ deve ter 14 dígitos ou ficar vazio.'); return; }
    setBusy(true); setError('');
    try {
      const profile = (await getDoc(doc(firestore, 'users', user.uid))).data() || {};
      const name = profile.name || profile.nome || user.displayName || user.email || '';
      const protocolo = `PROCON-${Date.now()}`;
      await setDoc(doc(firestore, 'procon-consumidores', user.uid), { userId: user.uid, nome: name, cpf: profile.cpf || '', email: user.email || '', telefone: profile.phone || profile.telefone || '', updatedAt: serverTimestamp() }, { merge: true });
      await addDoc(collection(firestore, 'procon-atendimentos'), {
        ...complaint, cnpj, cnpjEmpresaReclamada: cnpj, protocolo, userId: user.uid, status: 'Em Análise',
        arquivos: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        userDataAtTimeOfComplaint: { name, cpf: profile.cpf || '', email: user.email || '', phone: profile.phone || profile.telefone || '' },
      });
      setComplaint(initialComplaint); setMode('list'); Alert.alert('Reclamação registrada', `Protocolo ${protocolo}`);
    } catch (failure) { setError(failure.message || 'Não foi possível registrar a reclamação.'); }
    finally { setBusy(false); }
  };

  const submitAppointment = async () => {
    if (busy) return;
    if (dateValue < isoDate(new Date()) || !time || !freeTimes.includes(time) || !subject.trim()) { setError('Escolha uma data futura, um horário disponível e informe o assunto.'); return; }
    setBusy(true); setError('');
    try {
      const profile = (await getDoc(doc(firestore, 'users', user.uid))).data() || {};
      const appointmentRef = doc(collection(firestore, 'procon-agendamentos'));
      const slotsRef = doc(firestore, 'procon-config', 'bookedSlots');
      await runTransaction(firestore, async transaction => {
        const slots = (await transaction.get(slotsRef)).data() || {};
        const reserved = slots[dateValue] || [];
        if (reserved.includes(time)) throw new Error('Este horário acabou de ser reservado. Escolha outro.');
        transaction.set(slotsRef, { [dateValue]: [...reserved, time].sort() }, { merge: true });
        transaction.set(appointmentRef, {
          appointmentDate: dateValue, appointmentTime: time, assunto: subject.trim(), observacoes: '', prioridade: false,
          protocolo: appointmentRef.id, userId: user.uid, nome: profile.name || profile.nome || user.displayName || user.email || '',
          cpf: profile.cpf || '', email: user.email || '', telefone: profile.phone || profile.telefone || '',
          dadosUsuario: { name: profile.name || profile.nome || user.displayName || '', cpf: profile.cpf || '', email: user.email || '' },
          status: 'Agendado', setorAtendimento: 'PROCON', origem: 'app', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      });
      setMode('list'); setSubject(''); setTime(''); Alert.alert('Agendamento confirmado', `${brDate(dateValue)} às ${time}`);
    } catch (failure) { setError(failure.message || 'Não foi possível concluir o agendamento.'); }
    finally { setBusy(false); }
  };

  return <ModulePage navigation={navigation} title="PROCON" subtitle="Reclamações e atendimento presencial">
    {mode === 'list' ? <>
      <ModuleButton onPress={() => { setError(''); setMode('complaint'); }}>Nova reclamação</ModuleButton>
      <ModuleButton secondary onPress={() => { setError(''); setMode('schedule'); }}>Agendar atendimento</ModuleButton>
      <ModuleText heading style={{ marginTop: 25 }}>Meus atendimentos</ModuleText>
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {!loading && !complaints.length && !appointments.length ? <ModuleText muted style={{ marginTop: 12 }}>Nenhum atendimento registrado.</ModuleText> : null}
      {complaints.map(item => <ModuleRow key={item.id} title={item.assuntoDenuncia || item.protocolo || 'Reclamação'} detail={`${item.status || 'Registrado'} · ${item.protocolo || item.id}`} onPress={() => { setSelected(item); setMode('detail'); }} />)}
      {appointments.map(item => <ModuleRow key={item.id} title={`Agendamento · ${item.assunto || 'PROCON'}`} detail={`${item.status || 'Agendado'} · ${brDate(item.appointmentDate)} às ${item.appointmentTime || ''}`} onPress={() => { setSelected(item); setMode('detail'); }} />)}
    </> : null}
    {mode === 'complaint' ? <>
      {Object.entries({ assuntoDenuncia: 'Assunto', companyName: 'Fornecedor', cnpj: 'CNPJ do fornecedor (opcional)', classificacao: 'Classificação', descricao: 'Descreva o ocorrido', pedidoConsumidor: 'O que você solicita?' }).map(([key, label]) => <ModuleField key={key} label={label} value={complaint[key]} onChangeText={value => setComplaint(previous => ({ ...previous, [key]: value }))} multiline={key === 'descricao' || key === 'pedidoConsumidor'} keyboardType={key === 'cnpj' ? 'number-pad' : 'default'} maxLength={key === 'descricao' ? 2000 : 250} />)}
      <ModuleButton disabled={busy} onPress={submitComplaint}>{busy ? 'Enviando...' : 'Registrar reclamação'}</ModuleButton>
    </> : null}
    {mode === 'schedule' ? <>
      <ModuleText heading>Data e horário</ModuleText>
      <ModuleButton secondary onPress={() => setShowPicker(true)}>{brDate(dateValue)}</ModuleButton>
      {showPicker ? <DateTimePicker value={date} minimumDate={new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(_, value) => { if (Platform.OS !== 'ios') setShowPicker(false); if (value) { setDate(value); setTime(''); } }} /> : null}
      {!freeTimes.length ? <ModuleText muted style={{ marginTop: 14 }}>Não há horários disponíveis nessa data.</ModuleText> : freeTimes.map(slot => <ModuleButton key={slot} secondary={slot !== time} onPress={() => setTime(slot)}>{slot}</ModuleButton>)}
      <ModuleField label="Assunto" value={subject} onChangeText={setSubject} />
      <ModuleButton disabled={busy || !time || !freeTimes.includes(time)} onPress={submitAppointment}>{busy ? 'Confirmando...' : 'Confirmar agendamento'}</ModuleButton>
    </> : null}
    {mode === 'detail' && selected ? <View>
      <ModuleText heading>{selected.assuntoDenuncia || selected.assunto || 'Atendimento PROCON'}</ModuleText>
      <ModuleText muted style={{ marginTop: 8 }}>{selected.status} · {selected.protocolo || selected.id}</ModuleText>
      {selected.descricao ? <ModuleText style={{ marginTop: 16 }}>{selected.descricao}</ModuleText> : null}
      {selected.pedidoConsumidor ? <ModuleText style={{ marginTop: 16 }}>Pedido: {selected.pedidoConsumidor}</ModuleText> : null}
      {selected.appointmentDate ? <ModuleText style={{ marginTop: 16 }}>Atendimento: {brDate(selected.appointmentDate)} às {selected.appointmentTime}</ModuleText> : null}
    </View> : null}
    {mode !== 'list' ? <ModuleButton secondary onPress={() => { setError(''); setMode('list'); }}>Voltar aos atendimentos</ModuleButton> : null}
    <ModuleError>{error}</ModuleError>
  </ModulePage>;
}
