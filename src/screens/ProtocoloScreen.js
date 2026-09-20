import { httpsCallable } from 'firebase/functions';
import * as DocumentPicker from 'expo-document-picker';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from 'styled-components/native';
import { firestore, functions, storage } from '../../services/firebaseConfig';
import { uploadFileToStorage } from '../../services/storageService';
import { ModuleButton, ModuleError, ModuleField, ModulePage, ModuleRow, ModuleText } from '../components/CitizenModuleUi';
import { AuthContext } from '../context/AuthContext';

const statusText = { awaiting_receipt: 'Recebido', in_progress: 'Em análise', awaiting_citizen: 'Aguardando você', completed: 'Concluído', archived: 'Arquivado', cancelled: 'Cancelado', suspended: 'Suspenso' };
const formatDate = value => value?.toDate?.()?.toLocaleDateString('pt-BR') || 'Data não informada';
const signHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body{margin:0;background:#fff;overflow:hidden}canvas{width:100%;height:170px;touch-action:none;display:block}</style></head><body><canvas id="sign"></canvas><script>const c=document.getElementById('sign'),ctx=c.getContext('2d');c.width=900;c.height=220;ctx.lineWidth=4;ctx.lineCap='round';ctx.strokeStyle='#172554';let drawing=false;function point(e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}}c.onpointerdown=e=>{drawing=true;c.setPointerCapture(e.pointerId);let p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};c.onpointermove=e=>{if(!drawing)return;let p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke()};c.onpointerup=()=>{if(drawing){drawing=false;window.ReactNativeWebView.postMessage(c.toDataURL('image/png'))}};window.addEventListener('message',e=>{if(e.data==='clear'){ctx.clearRect(0,0,c.width,c.height);window.ReactNativeWebView.postMessage('cleared')}})</script></body></html>`;

export default function ProtocoloScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const colors = useTheme().portal;
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [pending, setPending] = useState([]);
  const [mode, setMode] = useState('list');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ typeId: '', subject: '', description: '', additionalData: {} });
  const [signature, setSignature] = useState('');
  const [answer, setAnswer] = useState('');
  const [number, setNumber] = useState('');
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState(null);
  const [webview, setWebview] = useState(null);
  const [documents, setDocuments] = useState([]);
  const selectedType = types.find(item => item.id === form.typeId);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const stopItems = onSnapshot(query(collection(firestore, 'processes'), where('requesterId', '==', user.uid)), snapshot => {
      setItems(snapshot.docs.map(row => ({ id: row.id, ...row.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
      setLoading(false); setError('');
    }, failure => { setError(failure.message || 'Não foi possível carregar os protocolos.'); setLoading(false); });
    const stopTypes = onSnapshot(collection(firestore, 'processTypes'), snapshot => setTypes(snapshot.docs.map(row => ({ id: row.id, ...row.data() })).filter(item => item.active !== false && item.allowCitizenOpen !== false)), failure => setError(failure.message || 'Não foi possível carregar os serviços.'));
    return () => { stopItems(); stopTypes(); };
  }, [user?.uid]);

  useEffect(() => {
    if (!selected?.id) return undefined;
    const stopProcess = onSnapshot(doc(firestore, 'processes', selected.id), snapshot => { if (snapshot.exists()) setSelected({ id: snapshot.id, ...snapshot.data() }); });
    const stopEvents = onSnapshot(query(collection(firestore, 'processes', selected.id, 'timeline'), where('visibility', '==', 'public')), snapshot => setEvents(snapshot.docs.map(row => ({ id: row.id, ...row.data() })).sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))));
    const stopPending = onSnapshot(collection(firestore, 'processes', selected.id, 'pendingItems'), snapshot => setPending(snapshot.docs.map(row => ({ id: row.id, ...row.data() }))));
    return () => { stopProcess(); stopEvents(); stopPending(); };
  }, [selected?.id]);

  const create = async () => {
    if (busy || !selectedType) return;
    if (!form.subject.trim() || !signature) { setError('Informe o assunto e assine antes de protocolar.'); return; }
    if ((selectedType.requiredDocuments || []).length && !documents.length) { setError('Adicione os documentos exigidos antes de protocolar.'); return; }
    const missing = (selectedType.formFields || []).find(field => field.required && !String(form.additionalData[field.id] || '').trim());
    if (missing) { setError(`Preencha o campo obrigatório: ${missing.label}.`); return; }
    setBusy(true); setError('');
    let created = null;
    try {
      const profile = (await getDoc(doc(firestore, 'users', user.uid))).data() || {};
      created = (await httpsCallable(functions, 'processCommand')({ action: 'create', ...form, origin: 'digital', requesterId: user.uid, requesterName: profile.name || profile.nome || user.displayName || user.email, requesterDocument: profile.cpf || profile.cnpj || '', requesterEmail: user.email || '', requesterPhone: profile.phone || profile.telefone || '', requesterType: 'cidadao', destinationId: selectedType.initialDepartmentId || 'protocolo', metadata: { additionalData: form.additionalData, signedByRequester: true } })).data;
      const path = `processes/${created.id}/documents/signature-${Date.now()}.png`;
      const target = ref(storage, path);
      await uploadString(target, signature, 'data_url', { contentType: 'image/png' });
      const url = await getDownloadURL(target);
      await httpsCallable(functions, 'processCommand')({ action: 'document', processId: created.id, name: `Assinatura-${created.protocolNumber}.png`, storagePath: path, url, mimeType: 'image/png', accessLevel: 'public', version: 1 });
      await Promise.all(documents.map(async (file, index) => {
        const folder = `processes/${created.id}/documents`;
        const fileUrl = await uploadFileToStorage(file.uri, folder, { contentType: file.mimeType || 'application/octet-stream' });
        return httpsCallable(functions, 'processCommand')({ action: 'document', processId: created.id, name: file.name || `Documento-${index + 1}`, storagePath: `${folder}/${file.name || index}`, url: fileUrl, mimeType: file.mimeType || 'application/octet-stream', accessLevel: 'public', version: 1 });
      }));
      setForm({ typeId: '', subject: '', description: '', additionalData: {} }); setSignature(''); setDocuments([]); setMode('list');
    } catch (failure) { setError(created ? `Protocolo ${created.protocolNumber} criado, mas a assinatura não foi anexada. Contate o setor de Protocolo antes de enviar outro pedido. ${failure.message || ''}` : failure.message || 'Não foi possível criar o protocolo.'); }
    finally { setBusy(false); }
  };

  const pickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
    if (!result.canceled) setDocuments(result.assets || []);
  };

  const respond = async item => {
    if (busy || !answer.trim()) { setError('Escreva uma resposta para a pendência.'); return; }
    setBusy(true); setError('');
    try { await httpsCallable(functions, 'processCommand')({ action: 'answerPending', processId: selected.id, pendingId: item.id, detail: answer.trim() }); setAnswer(''); }
    catch (failure) { setError(failure.message || 'Não foi possível responder.'); }
    finally { setBusy(false); }
  };
  const search = async () => {
    if (!number.trim() || !code.trim()) return;
    setBusy(true); setError(''); setLookup(null);
    try { setLookup((await httpsCallable(functions, 'publicProcessLookup')({ protocolNumber: number.trim(), authenticationCode: code.trim().toUpperCase() })).data); }
    catch (failure) { setError(failure.message || 'Protocolo não encontrado.'); }
    finally { setBusy(false); }
  };

  return <ModulePage navigation={navigation} title="Protocolo e Processos" subtitle="Solicitações e acompanhamento">
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>{[['list', 'Meus'], ['new', 'Novo'], ['search', 'Consultar']].map(([key, label]) => <ModuleButton key={key} secondary={mode !== key} onPress={() => { setMode(key); setError(''); }} style={{ flex: 1, marginTop: 0 }}>{label}</ModuleButton>)}</View>
    {mode === 'list' ? <>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && !items.length && !error ? <ModuleText muted>Nenhum protocolo registrado.</ModuleText> : null}
      {items.map(item => <ModuleRow key={item.id} title={item.protocolNumber || item.subject} detail={`${item.subject} · ${statusText[item.status] || item.status}`} onPress={() => { setSelected(item); setMode('detail'); }} />)}
    </> : null}
    {mode === 'new' ? <>
      <ModuleText heading>Novo protocolo</ModuleText>
      <ModuleText muted style={{ marginTop: 8 }}>Selecione um serviço disponível para abertura digital.</ModuleText>
      {types.map(item => <ModuleRow key={item.id} title={item.name || item.nome || 'Serviço'} detail={(item.requiredDocuments || []).length ? 'Exige documentos anexos' : ''} onPress={() => setForm(previous => ({ ...previous, typeId: item.id, additionalData: {} }))}>
        {form.typeId === item.id ? <ModuleText style={{ color: colors.primary, marginTop: 5 }}>Selecionado</ModuleText> : null}
      </ModuleRow>)}
      {!types.length ? <ModuleText muted style={{ marginTop: 12 }}>Nenhum tipo de processo está disponível para abertura.</ModuleText> : null}
      {selectedType ? <>
        <ModuleField label="Assunto" value={form.subject} onChangeText={value => setForm(previous => ({ ...previous, subject: value }))} />
        <ModuleField label="Descrição" value={form.description} onChangeText={value => setForm(previous => ({ ...previous, description: value }))} multiline maxLength={10000} />
        {(selectedType.formFields || []).map(field => <ModuleField key={field.id} label={`${field.label}${field.required ? ' *' : ''}`} value={String(form.additionalData[field.id] || '')} onChangeText={value => setForm(previous => ({ ...previous, additionalData: { ...previous.additionalData, [field.id]: value } }))} multiline={field.type === 'textarea'} />)}
        {(selectedType.requiredDocuments || []).length ? <ModuleText muted style={{ marginTop: 16 }}>Documentos exigidos: {selectedType.requiredDocuments.join(', ')}</ModuleText> : null}
        <ModuleButton secondary onPress={pickDocuments}>Adicionar documentos ({documents.length})</ModuleButton>
        {documents.map((file, index) => <ModuleRow key={`${file.uri}-${index}`} title={file.name || `Documento ${index + 1}`} detail={file.mimeType || 'Arquivo selecionado'} disabled />)}
        <>
          <ModuleText style={{ marginTop: 20, fontWeight: '800' }}>Assinatura eletrônica</ModuleText>
          <View style={{ height: 170, marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' }}><WebView originWhitelist={['*']} source={{ html: signHtml }} onMessage={event => setSignature(event.nativeEvent.data === 'cleared' ? '' : event.nativeEvent.data)} ref={setWebview} scrollEnabled={false} /></View>
          <ModuleText muted style={{ marginTop: 5 }}>{signature ? 'Assinatura registrada' : 'Assine no espaço acima'}</ModuleText>
          <ModuleButton secondary onPress={() => { webview?.postMessage('clear'); setSignature(''); }}>Limpar assinatura</ModuleButton>
          <ModuleButton disabled={busy || !signature} onPress={create}>{busy ? 'Enviando...' : 'Protocolar'}</ModuleButton>
        </>
      </> : null}
    </> : null}
    {mode === 'detail' && selected ? <>
      <ModuleText heading>{selected.protocolNumber}</ModuleText>
      <ModuleText style={{ marginTop: 8 }}>{selected.subject}</ModuleText>
      <ModuleText muted>{statusText[selected.status] || selected.status} · {formatDate(selected.createdAt)}</ModuleText>
      {selected.description ? <ModuleText style={{ marginTop: 14 }}>{selected.description}</ModuleText> : null}
      {pending.filter(item => item.status !== 'answered').map(item => <View key={item.id} style={{ marginTop: 22 }}><ModuleText heading>Pendência</ModuleText><ModuleText>{item.reason || item.motivo || item.detail || 'Complementação solicitada'}</ModuleText><ModuleField label="Sua resposta" value={answer} onChangeText={setAnswer} multiline /><ModuleButton disabled={busy} onPress={() => respond(item)}>Responder pendência</ModuleButton></View>)}
      <ModuleText heading style={{ marginTop: 25 }}>Andamento</ModuleText>
      {events.map(item => <ModuleRow key={item.id} title={String(item.action || 'Atualização').replaceAll('_', ' ')} detail={`${item.detail || ''} · ${formatDate(item.createdAt)}`} disabled />)}
      {!events.length ? <ModuleText muted style={{ marginTop: 10 }}>Nenhuma atualização publicada.</ModuleText> : null}
      <ModuleButton secondary onPress={() => setMode('list')}>Voltar aos protocolos</ModuleButton>
    </> : null}
    {mode === 'search' ? <>
      <ModuleText muted>Consulte usando o número e o código de autenticação do comprovante.</ModuleText>
      <ModuleField label="Número do protocolo" value={number} onChangeText={setNumber} />
      <ModuleField label="Código de autenticação" value={code} onChangeText={setCode} />
      <ModuleButton disabled={busy || !number.trim() || !code.trim()} onPress={search}>{busy ? 'Consultando...' : 'Consultar'}</ModuleButton>
      {lookup ? <ModuleRow title={lookup.protocolNumber} detail={`${lookup.subject} · ${statusText[lookup.status] || lookup.status}`} disabled /> : null}
    </> : null}
    <ModuleError>{error}</ModuleError>
  </ModulePage>;
}
