import { CameraView, useCameraPermissions } from 'expo-camera';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useContext, useState } from 'react';
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

export default function AdminRecepcaoConfirmacaoScreen({ navigation }) {
  const { canUseAdminApp } = useMobileModules();
  const { user } = useContext(AuthContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!canUseAdminApp('recepcao')) return <PortalBackground><PortalScreenHeader navigation={navigation} title="Acesso indisponível" /></PortalBackground>;
  const scan = async () => { if (!permission?.granted) { const response = await requestPermission(); if (!response.granted) return; } setMessage(''); setScanning(true); };
  const onScan = async ({ data }) => {
    if (busy) return;
    const parsed = parseAppointmentQr(data);
    if (!parsed || !allowedCollections.has(parsed.collection)) { setScanning(false); setMessage('QR Code inválido para confirmação.'); return; }
    setBusy(true); setScanning(false);
    try {
      const reference = doc(firestore, parsed.collection, parsed.id); const snapshot = await getDoc(reference);
      if (!snapshot.exists()) throw new Error('Agendamento não encontrado.');
      await updateDoc(reference, { atendimentoConfirmado: true, atendimentoConfirmadoEm: serverTimestamp(), atendimentoConfirmadoPor: user?.uid || 'recepcao' });
      setMessage('Atendimento confirmado com sucesso.');
    } catch (error) { setMessage(error.message || 'Não foi possível confirmar o atendimento.'); Alert.alert('Confirmação', error.message || 'Tente novamente.'); } finally { setBusy(false); }
  };
  return <PortalBackground><PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title="Confirmar atendimento" subtitle="Leia o QR Code do agendamento na recepção." /><Content contentContainerStyle={{ paddingBottom: 34 }}><PortalCard><Title>Leitura do agendamento</Title><Text>Solicite ao cidadão que apresente o QR Code exibido nos detalhes da solicitação agendada.</Text><Button onPress={scan} disabled={busy}><ButtonText>{busy ? 'Confirmando...' : 'Abrir leitor de QR Code'}</ButtonText></Button></PortalCard>{scanning ? <View style={styles.camera}><CameraView style={StyleSheet.absoluteFillObject} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} /><View style={styles.frame} /></View> : null}{message ? <PortalCard><Title>{message}</Title></PortalCard> : null}</Content></PortalBackground>;
}
const styles = StyleSheet.create({ camera: { height: 330, marginTop: 18, overflow: 'hidden', borderRadius: 16, backgroundColor: '#061522' }, frame: { position: 'absolute', width: 220, height: 220, top: 55, left: '50%', marginLeft: -110, borderWidth: 3, borderColor: '#fff', borderRadius: 18 } });
