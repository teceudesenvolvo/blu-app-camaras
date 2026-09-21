import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { ModuleButton, ModuleError, ModuleField, ModulePage, ModuleRow, ModuleText } from '../components/CitizenModuleUi';
import { AuthContext } from '../context/AuthContext';
import { appointmentQrUrl } from '../utils/appointmentQr';

const isoDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const brDate = value => { const [year, month, day] = String(value || '').split('-'); return `${day}/${month}/${year}`; };
const weekday = value => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
const initialComplaint = { tipoReclamacao: '', assuntoDenuncia: '', companyName: '', cnpj: '', classificacao: '', formaAquisicao: '', tipoContratacao: '', dataContratacao: '', nomeServico: '', tipoDocumento: '', numeroDocumento: '', dataOcorrencia: '', formaPagamento: '', valorCompra: '', descricao: '', pedidoConsumidor: '' };
const normalizeStatus = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function ProconScreen({ navigation }) {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const [mode, setMode] = useState('list');
  const [complaintStep, setComplaintStep] = useState(1);
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
  const canSchedule = complaints.some(item => normalizeStatus(item.status) === 'agendamento liberado');
  const freeTimes = useMemo(() => {
    if (blockedDates.includes(brDate(dateValue))) return [];
    return (availability[weekday(dateValue)] || []).filter(slot => !(bookedSlots[dateValue] || []).includes(slot));
  }, [availability, blockedDates, bookedSlots, dateValue]);

  const submitComplaint = async () => {
    if (busy) return;
    if (!complaint.tipoReclamacao.trim() || !complaint.assuntoDenuncia.trim() || !complaint.companyName.trim() || !complaint.classificacao.trim() || complaint.descricao.trim().length < 20 || !complaint.pedidoConsumidor.trim()) {
      setError('Preencha o tipo, assunto, fornecedor, classificação, descrição de pelo menos 20 caracteres e o pedido.'); return;
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
      setComplaint(initialComplaint); setComplaintStep(1); setMode('list'); Alert.alert('Reclamação registrada', `Protocolo ${protocolo}`);
    } catch (failure) { setError(failure.message || 'Não foi possível registrar a reclamação.'); }
    finally { setBusy(false); }
  };

  const submitAppointment = async () => {
    if (busy) return;
    if (!canSchedule) { setError('O agendamento será liberado após a análise da sua reclamação pelo PROCON.'); return; }
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
          status: 'Agendado', setorAtendimento: 'PROCON', origem: 'app', appointmentQrCode: appointmentQrUrl({ collection: 'procon-agendamentos', id: appointmentRef.id, module: 'procon', appointmentDate: dateValue, appointmentTime: time }), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      });
      setMode('list'); setSubject(''); setTime(''); Alert.alert('Agendamento confirmado', `${brDate(dateValue)} às ${time}`);
    } catch (failure) { setError(failure.message || 'Não foi possível concluir o agendamento.'); }
    finally { setBusy(false); }
  };

  return <ModulePage navigation={navigation} title="PROCON" subtitle="Reclamações e atendimento presencial">
    {mode === 'list' ? <>
      <ModuleButton onPress={() => { setError(''); setComplaintStep(1); setMode('complaint'); }}>Nova reclamação</ModuleButton>
      {canSchedule ? <ModuleButton secondary onPress={() => { setError(''); setMode('schedule'); }}>Agendar atendimento</ModuleButton> : <ModuleText muted style={{ marginTop: 12 }}>O agendamento presencial será liberado após o admin analisar sua reclamação.</ModuleText>}
      <ModuleText heading style={{ marginTop: 25 }}>Meus atendimentos</ModuleText>
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {!loading && !complaints.length && !appointments.length ? <ModuleText muted style={{ marginTop: 12 }}>Nenhum atendimento registrado.</ModuleText> : null}
      {complaints.map(item => <ModuleRow key={item.id} title={item.assuntoDenuncia || item.protocolo || 'Reclamação'} detail={`${item.status || 'Registrado'} · ${item.protocolo || item.id}`} onPress={() => { setSelected(item); setMode('detail'); }} />)}
      {appointments.map(item => <ModuleRow key={item.id} title={`Agendamento · ${item.assunto || 'PROCON'}`} detail={`${item.status || 'Agendado'} · ${brDate(item.appointmentDate)} às ${item.appointmentTime || ''}`} onPress={() => { setSelected(item); setMode('detail'); }} />)}
    </> : null}
    {mode === 'complaint' ? <>
      <ModuleText heading>Nova reclamação · Etapa {complaintStep} de 3</ModuleText>
      <ModuleText muted style={{ marginTop: 6 }}>{complaintStep === 1 ? 'Identifique o problema e o fornecedor.' : complaintStep === 2 ? 'Informe os detalhes da compra ou serviço.' : 'Revise os dados antes de enviar ao PROCON.'}</ModuleText>
      {complaintStep === 1 ? <>
        {Object.entries({ tipoReclamacao: 'Tipo de reclamação', assuntoDenuncia: 'Assunto', classificacao: 'Classificação', companyName: 'Fornecedor ou empresa', cnpj: 'CNPJ do fornecedor (opcional)' }).map(([key, label]) => <ModuleField key={key} label={label} value={complaint[key]} onChangeText={value => setComplaint(previous => ({ ...previous, [key]: value }))} keyboardType={key === 'cnpj' ? 'number-pad' : 'default'} />)}
        <ModuleButton onPress={() => { if (!complaint.tipoReclamacao.trim() || !complaint.assuntoDenuncia.trim() || !complaint.companyName.trim() || !complaint.classificacao.trim()) { setError('Preencha os campos obrigatórios desta etapa.'); return; } setError(''); setComplaintStep(2); }}>Continuar</ModuleButton>
      </> : null}
      {complaintStep === 2 ? <>
        {Object.entries({ formaAquisicao: 'Forma de aquisição', tipoContratacao: 'Tipo de contratação', dataContratacao: 'Data da contratação', nomeServico: 'Produto ou serviço', tipoDocumento: 'Tipo de documento', numeroDocumento: 'Número do documento', dataOcorrencia: 'Data da ocorrência', formaPagamento: 'Forma de pagamento', valorCompra: 'Valor da compra' }).map(([key, label]) => <ModuleField key={key} label={label} value={complaint[key]} onChangeText={value => setComplaint(previous => ({ ...previous, [key]: value }))} keyboardType={key === 'valorCompra' ? 'decimal-pad' : 'default'} />)}
        <ModuleButton secondary onPress={() => setComplaintStep(1)}>Voltar</ModuleButton><ModuleButton onPress={() => { setError(''); setComplaintStep(3); }}>Continuar</ModuleButton>
      </> : null}
      {complaintStep === 3 ? <>
        <ModuleField label="Descreva o ocorrido (mínimo de 20 caracteres)" value={complaint.descricao} onChangeText={value => setComplaint(previous => ({ ...previous, descricao: value }))} multiline maxLength={2000} />
        <ModuleField label="O que você solicita?" value={complaint.pedidoConsumidor} onChangeText={value => setComplaint(previous => ({ ...previous, pedidoConsumidor: value }))} multiline maxLength={1000} />
        <ModuleText muted style={{ marginTop: 12 }}>Ao enviar, sua reclamação será registrada com os dados informados e receberá um protocolo para acompanhamento.</ModuleText>
        <ModuleButton secondary onPress={() => setComplaintStep(2)}>Voltar</ModuleButton><ModuleButton disabled={busy} onPress={submitComplaint}>{busy ? 'Enviando...' : 'Registrar reclamação'}</ModuleButton>
      </> : null}
    </> : null}
    {mode === 'schedule' ? <>
      <ModuleText heading>Data e horário</ModuleText>
      <ModuleButton secondary onPress={() => setShowPicker(true)}>{brDate(dateValue)}</ModuleButton>
      {showPicker ? <DateTimePicker value={date} minimumDate={new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} themeVariant={theme.mode === 'dark' ? 'dark' : 'light'} textColor={theme.portal.text} onChange={(_, value) => { if (Platform.OS !== 'ios') setShowPicker(false); if (value) { setDate(value); setTime(''); } }} /> : null}
      {!freeTimes.length ? <ModuleText muted style={{ marginTop: 14 }}>Não há horários disponíveis nessa data.</ModuleText> : freeTimes.map(slot => <ModuleButton key={slot} secondary={slot !== time} onPress={() => setTime(slot)}>{slot}</ModuleButton>)}
      <ModuleField label="Assunto" value={subject} onChangeText={setSubject} />
      <ModuleButton disabled={busy || !time || !freeTimes.includes(time)} onPress={submitAppointment}>{busy ? 'Confirmando...' : 'Confirmar agendamento'}</ModuleButton>
    </> : null}
    {mode === 'detail' && selected ? <View>
      <ModuleText heading>{selected.assuntoDenuncia || selected.assunto || 'Atendimento PROCON'}</ModuleText>
      <ModuleText muted style={{ marginTop: 8 }}>{selected.status} · {selected.protocolo || selected.id}</ModuleText>
      {selected.descricao ? <ModuleText style={{ marginTop: 16 }}>{selected.descricao}</ModuleText> : null}
      {selected.pedidoConsumidor ? <ModuleText style={{ marginTop: 16 }}>Pedido: {selected.pedidoConsumidor}</ModuleText> : null}
      {selected.appointmentDate ? <><ModuleText style={{ marginTop: 16 }}>Atendimento: {brDate(selected.appointmentDate)} às {selected.appointmentTime}</ModuleText>{selected.appointmentQrCode ? <Image source={{ uri: selected.appointmentQrCode }} resizeMode="contain" style={{ width: 220, height: 220, alignSelf: 'center', marginTop: 18 }} /> : null}</> : null}
    </View> : null}
    {mode !== 'list' ? <ModuleButton secondary onPress={() => { setError(''); setMode('list'); }}>Voltar aos atendimentos</ModuleButton> : null}
    <ModuleError>{error}</ModuleError>
  </ModulePage>;
}
