import { CameraView, useCameraPermissions } from 'expo-camera';
import { collection, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useContext, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { PortalBackground, PortalCard, PortalScreenHeader } from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';
import { useMobileModules } from '../context/MobileModulesContext';
import { parseAppointmentQr } from '../utils/appointmentQr';

const Content = styled.ScrollView`flex: 1; padding: 18px;`;
const Title = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 18px; font-weight: 900;`;
const Text = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 14px; line-height: 21px; margin-top: 8px;`;
const Button = styled.TouchableOpacity`margin-top: 18px; min-height: 50px; align-items: center; justify-content: center; border-radius: 12px; background-color: ${({ theme }) => theme.portal.primary};`;
const ButtonText = styled.Text`color: #fff; font-size: 15px; font-weight: 900;`;
const allowedCollections = new Set(['balcao-cidadao', 'procon-agendamentos', 'assessoria-microempreendedor', 'solicitacoes-vereadores', 'procon-atendimentos', 'ouvidoria', 'procuradoria-mulher', 'piel-atendimentos']);
const sectorByCollection = { 'balcao-cidadao': 'Balcão do Cidadão', 'procon-agendamentos': 'PROCON', 'procon-atendimentos': 'PROCON', 'assessoria-microempreendedor': 'Assessoria ao Microempreendedor', ouvidoria: 'Ouvidoria', 'procuradoria-mulher': 'Procuradoria da Mulher', 'piel-atendimentos': 'PIEL', 'solicitacoes-vereadores': 'Vereadores' };
const prefixBySector = { 'Balcão do Cidadão': 'B', PROCON: 'P', 'Assessoria ao Microempreendedor': 'M', Ouvidoria: 'O', 'Procuradoria da Mulher': 'W', PIEL: 'E', Vereadores: 'V' };
const localDateKey = date => { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };
const appointmentDateKey = value => {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  }
  if (value?.toDate) return localDateKey(value.toDate());
  if (value instanceof Date) return localDateKey(value);
  return '';
};

export default function AdminRecepcaoConfirmacaoScreen({ navigation, route }) {
  const { canUseAdminApp } = useMobileModules();
  const { user } = useContext(AuthContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const autoConfirmStarted = useRef(false);
  const scan = async () => { if (!permission?.granted) { const response = await requestPermission(); if (!response.granted) { setMessage('Permita o acesso à câmera nas configurações do aparelho para ler o QR Code.'); return; } } setMessage(''); setScanning(true); };
  const onScan = async ({ data }) => {
    if (busy) return;
    const parsed = parseAppointmentQr(data);
    if (!parsed || !allowedCollections.has(parsed.collection)) { setScanning(false); setMessage('QR Code inválido para confirmação.'); return; }
    setBusy(true); setScanning(false);
    try {
      const reference = doc(firestore, parsed.collection, parsed.id); const snapshot = await getDoc(reference);
      if (!snapshot.exists()) throw new Error('Agendamento não encontrado.');
      const appointment = snapshot.data() || {};
      const scheduledDate = appointmentDateKey(appointment.appointmentDate || appointment.dataAgendamento || appointment.data);
      const today = localDateKey(new Date());
      if (!scheduledDate) { setMessage('Este agendamento não possui uma data válida.'); return; }
      if (scheduledDate !== today) { setMessage(scheduledDate > today ? 'Este agendamento só poderá ser confirmado na data marcada.' : 'A data deste agendamento já passou e não pode ser confirmada.'); return; }
      if (appointment.senhaAtendimento) { setMessage(`Este atendimento já está na fila com a senha ${appointment.senhaAtendimento}.`); return; }
      const setor = appointment.setorAtendimento || sectorByCollection[parsed.collection] || 'Balcão do Cidadão';
      const prefix = prefixBySector[setor] || 'B';
      const date = new Date();
      const dateKey = date.toISOString().slice(0, 10);
      const counterRef = doc(firestore, 'atendimento-fila-meta', `${dateKey}-${prefix}`);
      const queueRef = doc(collection(firestore, 'atendimento-fila'));
      const senha = await runTransaction(firestore, async transaction => {
        const freshRequest = await transaction.get(reference);
        const current = freshRequest.data() || {};
        if (current.senhaAtendimento) return current.senhaAtendimento;
        if (appointmentDateKey(current.appointmentDate || current.dataAgendamento || current.data) !== localDateKey(new Date())) {
          throw new Error('Este agendamento não é válido para confirmação hoje.');
        }
        const counter = await transaction.get(counterRef);
        const next = Number(counter.data()?.ultimoNumero || 0) + 1;
        const password = `${prefix}${String(next).padStart(3, '0')}`;
        const nome = current.nome || current.dadosUsuario?.nome || current.dadosBeneficiario?.nome || current.solicitante || 'Cidadão';
        transaction.set(counterRef, { ultimoNumero: next, data: dateKey, setor, prefixo: prefix }, { merge: true });
        transaction.set(queueRef, {
          senha: password, protocolo: parsed.id, nome,
          beneficiarioNome: current.dadosBeneficiario?.nome || nome,
          solicitanteNome: current.dadosUsuario?.nome || nome,
          cpf: current.cpf || current.dadosUsuario?.cpf || current.dadosBeneficiario?.cpf || '',
          userId: current.userId || current.dadosUsuario?.uid || current.dadosUsuario?.id || '',
          userEmail: current.email || current.dadosUsuario?.email || '',
          assunto: current.assunto || current.titulo || 'Atendimento',
          appointmentDate: current.appointmentDate || current.dataAgendamento || '',
          appointmentTime: current.appointmentTime || current.horarioAgendamento || '',
          collectionName: parsed.collection, setor, prioridade: Boolean(current.prioridade),
          status: 'Aguardando', criadoEm: serverTimestamp(), ordemFilaEm: serverTimestamp(),
          chamadoEm: null, criadoPor: user?.email || user?.uid || 'Recepção',
        });
        transaction.update(reference, { atendimentoConfirmado: true, atendimentoConfirmadoEm: serverTimestamp(), atendimentoConfirmadoPor: user?.uid || 'recepcao', statusFila: 'Aguardando Atendimento Presencial', chegadaRecepcaoEm: serverTimestamp(), ultimaAtualizacao: serverTimestamp(), senhaAtendimento: password, tipoEntradaFila: 'Agendamento' });
        return password;
      });
      setMessage(`Atendimento confirmado e enviado para a fila. Senha: ${senha}`);
    } catch (error) { setMessage(error.message || 'Não foi possível confirmar o atendimento.'); Alert.alert('Confirmação', error.message || 'Tente novamente.'); } finally { setBusy(false); }
  };
  useEffect(() => {
    const appointment = route?.params;
    if (!appointment?.autoConfirm || autoConfirmStarted.current || !appointment.collectionName || !appointment.appointmentId) return;
    autoConfirmStarted.current = true;
    onScan({ data: JSON.stringify({ type: 'blu-agendamento', version: 1, collection: appointment.collectionName, id: appointment.appointmentId }) });
  }, [route?.params]);
  if (!canUseAdminApp('recepcao')) return <PortalBackground><PortalScreenHeader navigation={navigation} title="Acesso indisponível" /></PortalBackground>;
  return <PortalBackground><PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title="Confirmar atendimento" subtitle="Leia o QR Code do agendamento na recepção." /><Content contentContainerStyle={{ paddingBottom: 34 }}><PortalCard><Title>Leitura do agendamento</Title><Text>Solicite ao cidadão que apresente o QR Code exibido nos detalhes da solicitação agendada.</Text><Button onPress={scan} disabled={busy}><ButtonText>{busy ? 'Confirmando...' : 'Abrir leitor de QR Code'}</ButtonText></Button></PortalCard>{scanning ? <View style={styles.camera}><CameraView style={styles.preview} facing="back" active={scanning} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} onMountError={() => { setScanning(false); setMessage('Não foi possível abrir a câmera. Verifique a permissão nas configurações do aparelho.'); }} /><View pointerEvents="none" style={styles.overlay}><View style={styles.frame} /><Text style={styles.hint}>Posicione o QR Code dentro da moldura</Text></View><Button style={styles.closeButton} onPress={() => setScanning(false)}><ButtonText>Fechar câmera</ButtonText></Button></View> : null}{message ? <PortalCard><Title>{message}</Title></PortalCard> : null}</Content></PortalBackground>;
}
const styles = StyleSheet.create({
  camera: { width: '100%', height: 390, marginTop: 18, overflow: 'hidden', borderRadius: 16, backgroundColor: '#061522' },
  preview: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center' },
  frame: { position: 'absolute', width: 220, height: 220, top: 54, left: '50%', marginLeft: -110, borderWidth: 3, borderColor: '#fff', borderRadius: 18 },
  hint: { position: 'absolute', top: 286, color: '#fff', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  closeButton: { position: 'absolute', left: 18, right: 18, bottom: 18, marginTop: 0 },
});
