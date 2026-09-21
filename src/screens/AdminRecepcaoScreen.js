import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, getDocs, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { PortalBackground, PortalCard, PortalScreenHeader } from '../components/PortalScaffold';
import { useMobileModules } from '../context/MobileModulesContext';

const Content = styled.ScrollView`flex: 1; padding: 18px;`;
const TabBar = styled.ScrollView.attrs({ horizontal: true, showsHorizontalScrollIndicator: false })`margin: 0 -18px 16px; padding: 0 18px;`;
const TabChip = styled.TouchableOpacity`min-height: 42px; padding: 0 16px; margin-right: 8px; border-radius: 12px; align-items: center; justify-content: center; background-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.card}; border-width: 1px; border-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.border};`;
const TabText = styled.Text`color: ${({ active, theme }) => active ? '#fff' : theme.portal.text}; font-size: 13px; font-weight: 900;`;
const Title = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 18px; font-weight: 900;`;
const Text = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 14px; line-height: 21px; margin-top: 8px;`;
const ListItem = styled.View`padding: 12px 0; margin-top: 8px; border-top-width: 1px; border-top-color: ${({ theme }) => theme.portal.border};`;
const ListTitle = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 14px; font-weight: 900;`;
const AppointmentCard = styled.View`margin-top: 12px; padding: 14px; border-radius: 16px; background-color: ${({ theme }) => theme.portal.pageAlt}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const AppointmentTop = styled.View`flex-direction: row; align-items: center; justify-content: space-between;`;
const AppointmentTime = styled.Text`color: ${({ theme }) => theme.portal.primary}; font-size: 20px; font-weight: 900;`;
const AppointmentStatus = styled.Text`color: ${({ theme }) => theme.portal.primary}; font-size: 11px; font-weight: 900; text-transform: uppercase;`;
const AppointmentName = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 16px; font-weight: 900; margin-top: 12px;`;
const AppointmentMeta = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 13px; line-height: 19px; margin-top: 4px;`;
const Button = styled.TouchableOpacity`margin-top: 18px; min-height: 50px; padding: 0 18px; align-items: center; justify-content: center; border-radius: 12px; background-color: ${({ theme }) => theme.portal.primary};`;
const ButtonText = styled.Text`color: white; font-size: 15px; font-weight: 900;`;
const FormCard = styled(PortalCard)`margin-top: 18px;`;
const SectionCard = styled(PortalCard)`margin-top: 18px;`;
const ErrorText = styled.Text`margin-top: 18px; color: #d84a3a; font-size: 14px; line-height: 20px;`;
const Input = styled.TextInput`min-height: 48px; margin-top: 10px; padding: 0 14px; border-radius: 10px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; background-color: ${({ theme }) => theme.portal.pageAlt}; color: ${({ theme }) => theme.portal.text};`;
const Step = styled.Text`color: ${({ theme }) => theme.portal.primary}; font-size: 13px; font-weight: 900; margin-top: 14px;`;
const Choice = styled.TouchableOpacity`min-height: 48px; margin-top: 10px; padding: 0 14px; border-radius: 12px; align-items: center; justify-content: center; background-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.pageAlt}; border-width: 1px; border-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.border};`;

const APPOINTMENT_SOURCES = ['balcao-cidadao', 'procon-agendamentos', 'assessoria-microempreendedor', 'solicitacoes-vereadores', 'procon-atendimentos', 'ouvidoria', 'procuradoria-mulher', 'piel-atendimentos'];
const RECEPTION_SECTORS = [
  ['balcao', 'Balcão do Cidadão'], ['procon', 'PROCON'], ['ouvidoria', 'Ouvidoria'],
  ['procuradoria', 'Procuradoria da Mulher'], ['piel', 'PIEL'], ['agendaVereadores', 'Vereadores'],
  ['microempreendedor', 'Assessoria ao Microempreendedor'], ['esic', 'e-SIC'], ['juridico', 'Atendimento Jurídico'],
];
const SERVICES_BY_SECTOR = {
  'Balcão do Cidadão': ['Emissão de documentos', 'Informações gerais', 'Agendamento'], PROCON: ['Orientação ao consumidor', 'Reclamação', 'Agendamento'],
  Ouvidoria: ['Manifestação', 'Denúncia', 'Elogio', 'Solicitação'], 'Procuradoria da Mulher': ['Acolhimento', 'Orientação', 'Denúncia'],
  PIEL: ['Inscrição', 'Atendimento eleitoral'], Vereadores: ['Atendimento no gabinete', 'Solicitação ao vereador'],
  'Assessoria ao Microempreendedor': ['Orientação para MEI', 'Impostos e obrigações'], 'e-SIC': ['Pedido de informação', 'Recurso'], 'Atendimento Jurídico': ['Orientação jurídica'],
};
const todayKeys = () => { const now = new Date(); const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; return [iso, `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`]; };

export default function AdminRecepcaoScreen({ navigation }) {
  const { canUse, canUseAdminApp } = useMobileModules();
  const activeSectors = RECEPTION_SECTORS.filter(([moduleId]) => canUse(moduleId));
  const [error, setError] = useState('');
  const [tab, setTab] = useState('fila');
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [requestForm, setRequestForm] = useState({ nome: '', cpf: '', telefone: '', email: '', setor: 'Balcão do Cidadão', assunto: '', descricao: '' });
  const [creating, setCreating] = useState(false);
  const [flowStep, setFlowStep] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [priority, setPriority] = useState(false);
  const [shouldQueue, setShouldQueue] = useState(false);

  useEffect(() => {
    if (activeSectors.length && !activeSectors.some(([, label]) => label === requestForm.setor)) {
      setRequestForm(current => ({ ...current, setor: activeSectors[0][1] }));
    }
  }, [activeSectors, requestForm.setor]);

  useEffect(() => {
    if (!canUseAdminApp('recepcao')) return undefined;
    let active = true;
    const [iso, br] = todayKeys();
    Promise.all(APPOINTMENT_SOURCES.map(async source => {
      const snapshot = await getDocs(collection(firestore, source));
      return snapshot.docs.map(item => ({ id: item.id, collectionName: source, ...item.data() })).filter(item => [item.appointmentDate, item.dadosSolicitacao?.appointmentDate].some(value => String(value || '') === iso || String(value || '') === br));
    })).then(groups => { if (active) setAppointments(groups.flat().sort((a, b) => String(a.appointmentTime || '').localeCompare(String(b.appointmentTime || '')))); }).catch(failure => { if (active) setError(failure.message || 'Não foi possível carregar os agendamentos de hoje.'); });
    const unsubscribe = onSnapshot(query(collection(firestore, 'atendimento-fila'), where('status', 'in', ['Aguardando', 'Chamando', 'Em Atendimento'])), snapshot => setQueue(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))));
    return () => { active = false; unsubscribe(); };
  }, [canUseAdminApp]);

  const createReceptionRequest = async asWalkIn => {
    if (!requestForm.nome.trim() || !requestForm.assunto.trim()) { setError('Informe o nome do cidadão e o assunto.'); return; }
    setCreating(true); setError('');
    try {
      const requestRef = await addDoc(collection(firestore, 'balcao-cidadao'), { userId: 'recepcao', origem: 'recepcao', status: 'Recebida', prioridade: priority, setorAtendimento: requestForm.setor, protocolo: `REC-${Date.now()}`, dadosUsuario: { identificacao: 'Recepção', name: requestForm.nome.trim(), cpf: requestForm.cpf.trim(), telefone: requestForm.telefone.trim(), phone: requestForm.telefone.trim(), email: requestForm.email.trim() }, dadosSolicitacao: { assunto: requestForm.assunto.trim(), descricao: requestForm.descricao.trim(), anexos: attachments.map(item => ({ uri: item.uri, name: item.fileName || 'anexo' })) }, dataSolicitacao: serverTimestamp(), ultimaAtualizacao: serverTimestamp() });
      if (asWalkIn) await addDoc(collection(firestore, 'atendimento-fila'), { protocolo: requestRef.id, nome: requestForm.nome.trim(), cpf: requestForm.cpf.trim(), telefone: requestForm.telefone.trim(), email: requestForm.email.trim(), assunto: requestForm.assunto.trim(), setor: requestForm.setor, prioridade: priority, status: 'Aguardando', origem: 'recepcao', criadoEm: serverTimestamp() });
      setRequestForm({ nome: '', cpf: '', telefone: '', email: '', setor: 'Balcão do Cidadão', assunto: '', descricao: '' }); setAttachments([]); setPriority(false); setShouldQueue(false); setFlowStep(6); setTab('novo'); Alert.alert('Atendimento registrado', asWalkIn ? 'Solicitação criada e adicionada à fila.' : 'Solicitação criada com sucesso.');
    } catch (failure) { setError(failure.message || 'Não foi possível criar a solicitação.'); } finally { setCreating(false); }
  };

  const advanceStep = () => setFlowStep(step => step === 0 ? 2 : Math.min(step + 1, 6));
  const previousStep = () => setFlowStep(step => step === 2 ? 0 : Math.max(step - 1, 0));
  const identifyUser = async () => {
    const cpf = requestForm.cpf.replace(/\D/g, '');
    if (!cpf) { setError('Informe o CPF para identificar o usuário.'); return; }
    try {
      const snapshot = await getDocs(query(collection(firestore, 'users'), where('cpf', '==', cpf)));
      const found = snapshot.docs[0]?.data();
      if (!found) { setError('Usuário não encontrado. Preencha os dados manualmente.'); return; }
      setRequestForm(current => ({ ...current, nome: found.name || found.nome || current.nome, cpf, telefone: found.phone || found.telefone || current.telefone, email: found.email || current.email })); setError('Usuário identificado.');
    } catch (failure) { setError(failure.message || 'Não foi possível identificar o usuário.'); }
  };
  const finishReceptionRequest = () => {
    if (!requestForm.assunto.trim()) { setError('Selecione o tipo de atendimento antes de gerar o protocolo.'); return; }
    if (shouldQueue) { createReceptionRequest(true); return; }
    Alert.alert('Continuar sem encaixe?', 'O protocolo será gerado, mas o cidadão não será incluído na fila da recepção.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Continuar sem encaixe', onPress: () => createReceptionRequest(false) },
    ]);
  };

  if (!canUseAdminApp('recepcao')) return <PortalBackground><PortalScreenHeader navigation={navigation} title="Acesso indisponível" /><Content><Text>Seu perfil não possui acesso à recepção.</Text></Content></PortalBackground>;


  return <PortalBackground>
    <PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title="Recepção" subtitle="Confirme agendamentos com rapidez e segurança." />
    <Content contentContainerStyle={{ paddingBottom: 34 }}>
      <TabBar>{[['fila', 'Fila'], ['agenda', 'Agendamentos'], ['novo', 'Novo atendimento']].map(([id, label]) => <TabChip key={id} active={tab === id} onPress={() => { setError(''); setTab(id); }}><TabText active={tab === id}>{label}</TabText></TabChip>)}</TabBar>
      <Button onPress={() => navigation.navigate('AdminRecepcaoConfirmacao')}><ButtonText>Confirmar atendimento</ButtonText></Button>
      {tab === 'fila' ? <SectionCard><Title>Fila da recepção</Title><Text>{queue.length ? `${queue.length} atendimento(s) em andamento.` : 'Nenhum atendimento na fila.'}</Text>{queue.slice(0, 20).map(item => <ListItem key={item.id}><ListTitle>{item.nome || 'Cidadão'}</ListTitle><Text>{item.assunto || 'Atendimento'} · {item.status}</Text></ListItem>)}</SectionCard> : null}
      {tab === 'agenda' ? <SectionCard><Title>Agendamentos de hoje</Title><Text>{appointments.length ? `${appointments.length} agendamento(s) encontrado(s).` : 'Nenhum agendamento para hoje.'}</Text>{appointments.map(item => <AppointmentCard key={`${item.collectionName}-${item.id}`}><AppointmentTop><AppointmentTime>{item.appointmentTime || '--:--'}</AppointmentTime><AppointmentStatus>{item.atendimentoConfirmado ? 'Confirmado' : 'Aguardando chegada'}</AppointmentStatus></AppointmentTop><AppointmentName>{item.dadosUsuario?.name || item.nome || item.dadosBeneficiario?.name || 'Cidadão'}</AppointmentName><AppointmentMeta>{item.setorAtendimento || item.collectionName}</AppointmentMeta><AppointmentMeta>{item.assunto || item.dadosSolicitacao?.assunto || item.tipoReclamacao || 'Atendimento presencial'}</AppointmentMeta><AppointmentMeta>Protocolo: {item.protocolo || item.id}</AppointmentMeta></AppointmentCard>)}</SectionCard> : null}
      {tab === 'novo' ? <FormCard><Title>Nova solicitação / encaixe</Title><Step>Etapa {flowStep + 1} de 7 · {['Setor', 'Atendimento', 'Usuário', 'Solicitação', 'Anexos', 'Protocolos e fila', 'Início'][flowStep]}</Step>
        {flowStep === 0 ? <>{activeSectors.length ? activeSectors.map(([moduleId, value]) => <Choice key={moduleId} active={requestForm.setor === value} onPress={() => setRequestForm(current => ({ ...current, setor: value }))}><ButtonText>{value}</ButtonText></Choice>) : <Text>Nenhum módulo de atendimento está ativo no Controle do Sistema.</Text>}</> : null}
        {flowStep === 1 ? <Text>O atendimento será definido pelos serviços disponíveis do setor selecionado.</Text> : null}
        {flowStep === 2 ? <><Input value={requestForm.nome} onChangeText={value => setRequestForm(current => ({ ...current, nome: value }))} placeholder="Nome do cidadão" placeholderTextColor="#94a3b8" /><Input value={requestForm.cpf} onChangeText={value => setRequestForm(current => ({ ...current, cpf: value }))} placeholder="CPF (opcional)" placeholderTextColor="#94a3b8" /><Input value={requestForm.telefone} onChangeText={value => setRequestForm(current => ({ ...current, telefone: value }))} placeholder="Telefone (opcional)" placeholderTextColor="#94a3b8" keyboardType="phone-pad" /><Input value={requestForm.email} onChangeText={value => setRequestForm(current => ({ ...current, email: value }))} placeholder="E-mail (opcional)" placeholderTextColor="#94a3b8" keyboardType="email-address" autoCapitalize="none" /><Button onPress={identifyUser}><ButtonText>Identificar usuário</ButtonText></Button></> : null}
        {flowStep === 3 ? <><Text>Serviços ofertados pelo módulo</Text>{(SERVICES_BY_SECTOR[requestForm.setor] || ['Atendimento']).map(value => <Choice key={value} active={requestForm.assunto === value} onPress={() => setRequestForm(current => ({ ...current, assunto: value }))}><ButtonText>{value}</ButtonText></Choice>)}<Input value={requestForm.descricao} onChangeText={value => setRequestForm(current => ({ ...current, descricao: value }))} placeholder="Observações" placeholderTextColor="#94a3b8" multiline style={{ minHeight: 110, paddingTop: 12 }} /></> : null}
        {flowStep === 4 ? <><Text>Anexos (opcional)</Text><Text>Use a câmera ou selecione arquivos para complementar a solicitação.</Text><Button onPress={async () => { const response = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true }); if (!response.canceled) setAttachments(current => [...current, ...response.assets]); }}><ButtonText>{attachments.length ? `Adicionar mais anexos (${attachments.length})` : 'Anexar arquivos'}</ButtonText></Button></> : null}
        {flowStep === 5 ? <><Text>Defina como o atendimento deve entrar na recepção.</Text><Choice active={priority} onPress={() => setPriority(value => !value)}><ButtonText>{priority ? 'Atendimento prioritário' : 'Atendimento normal'}</ButtonText></Choice><Choice active={shouldQueue} onPress={() => setShouldQueue(value => !value)}><ButtonText>{shouldQueue ? 'Adicionar à fila / encaixe' : 'Não encaixar agora'}</ButtonText></Choice><Text>{requestForm.setor} · {requestForm.assunto || 'Tipo de atendimento não selecionado'} · {requestForm.nome}</Text><Button onPress={finishReceptionRequest} disabled={creating}><ButtonText>{shouldQueue ? 'Gerar protocolo e entrar na fila' : 'Gerar protocolo'}</ButtonText></Button></> : null}
        {flowStep === 6 ? <><Text>Atendimento iniciado. O protocolo foi registrado com sucesso.</Text><Button onPress={() => { setFlowStep(0); setTab('fila'); }}><ButtonText>Ir para a fila</ButtonText></Button></> : null}
        <View style={styles.flowActions}>{flowStep > 0 && flowStep < 6 ? <Button onPress={previousStep}><ButtonText>Voltar</ButtonText></Button> : null}{flowStep < 5 ? <Button onPress={advanceStep}><ButtonText>Continuar</ButtonText></Button> : null}</View>
      </FormCard> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </Content>
  </PortalBackground>;
}

const styles = StyleSheet.create({
  flowActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, marginTop: 6 },
});
