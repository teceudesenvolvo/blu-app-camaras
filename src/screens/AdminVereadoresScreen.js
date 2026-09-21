import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Switch, TextInput } from 'react-native';
import styled from 'styled-components/native';
import { PortalBackground, PortalScreenHeader } from '../components/PortalScaffold';
import { firestore, storage } from '../../services/firebaseConfig';
import { useMobileModules } from '../context/MobileModulesContext';

const Card = styled.TouchableOpacity`margin: 6px 18px; padding: 16px; border-radius: 14px; background-color: ${({ theme }) => theme.portal.card}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const Row = styled.View`flex-direction: row; align-items: center;`;
const Info = styled.View`flex: 1; margin-left: 12px;`;
const Title = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 15px; font-weight: 900;`;
const Detail = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 12px; margin-top: 4px;`;
const Empty = styled.Text`color: ${({ theme }) => theme.portal.muted}; text-align: center; margin: 36px 24px;`;
const FormCard = styled.ScrollView.attrs({
  contentContainerStyle: { padding: 18, paddingBottom: 36 },
  keyboardShouldPersistTaps: 'handled',
})`
  margin: 18px;
  border-radius: 14px;
  background-color: ${({ theme }) => theme.portal.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
`;
const Input = styled(TextInput)`min-height: 46px; margin-top: 12px; padding: 0 12px; border-radius: 10px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; color: ${({ theme }) => theme.portal.text}; background-color: ${({ theme }) => theme.portal.pageAlt};`;
const TextArea = styled(Input)`height: 120px; padding-top: 12px; text-align-vertical: top;`;
const EditorToolbar = styled.View`flex-direction: row; gap: 8px; margin-top: 14px;`;
const EditorButton = styled.TouchableOpacity`padding: 8px 12px; border-radius: 8px; background-color: ${({ theme }) => theme.portal.pageAlt}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const EditorButtonText = styled.Text`color: ${({ theme }) => theme.portal.text}; font-weight: 800;`;
const Preview = styled.Image`width: 96px; height: 96px; border-radius: 14px; margin-top: 12px;`;
const Button = styled.TouchableOpacity`margin-top: 18px; padding: 13px; border-radius: 10px; align-items: center; background-color: ${({ theme }) => theme.portal.primary};`;
const DangerButton = styled(Button)`background-color: ${({ theme }) => theme.portal.danger};`;
const ButtonText = styled.Text`color: #fff; font-weight: 900;`;

const emptyForm = { name: '', cargo: 'Vereador', partido: '', dataNascimento: '', biografia: '', avatarUrl: '', permiteAgendamentoVisita: true };
const decodeBiography = value => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ')
  .trim();
const formatDate = value => {
  const text = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text.slice(8, 10)}/${text.slice(5, 7)}/${text.slice(0, 4)}`;
  return text;
};
const formatDateInput = value => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};
const dateForStorage = value => {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
};

export default function AdminVereadoresScreen({ navigation }) {
  const { canUseAdminApp } = useMobileModules();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!canUseAdminApp('vereadores')) return undefined;
    return onSnapshot(query(collection(firestore, 'vereadores'), orderBy('name', 'asc')), snapshot => { setItems(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))); setLoading(false); }, () => setLoading(false));
  }, [canUseAdminApp]);
  if (!canUseAdminApp('vereadores')) return <PortalBackground><PortalScreenHeader navigation={navigation} title="Acesso indisponível" /></PortalBackground>;
  const openForm = item => { setSelected(item || { id: null }); setForm(item ? { ...emptyForm, ...item, avatarUrl: item.avatarUrl || item.avatarBase64 || '' } : emptyForm); };
  const chooseImage = async () => { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [1, 1] }); if (result.canceled) return; const asset = result.assets[0]; setSaving(true); try { const response = await fetch(asset.uri); const blob = await response.blob(); const imageRef = ref(storage, `vereadores/${selected?.id || Date.now()}.jpg`); await uploadBytes(imageRef, blob, { contentType: 'image/jpeg' }); const avatarUrl = await getDownloadURL(imageRef); setForm(current => ({ ...current, avatarUrl })); } catch (error) { Alert.alert('Erro', error.message || 'Não foi possível enviar a imagem.'); } finally { setSaving(false); } };
  const save = async () => { if (!form.name.trim()) return Alert.alert('Atenção', 'Informe o nome do vereador.'); setSaving(true); try { const payload = { ...form, dataNascimento: dateForStorage(form.dataNascimento), biografia: form.biografia }; if (selected?.id) await updateDoc(doc(firestore, 'vereadores', selected.id), payload); else await addDoc(collection(firestore, 'vereadores'), { ...payload, tipo: 'Vereador' }); setSelected(null); } catch (error) { Alert.alert('Erro', error.message || 'Não foi possível salvar.'); } finally { setSaving(false); } };
  const remove = () => selected?.id && Alert.alert('Excluir vereador', 'Deseja realmente excluir este cadastro?', [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: async () => { await deleteDoc(doc(firestore, 'vereadores', selected.id)); setSelected(null); } }]);
  if (selected) return <PortalBackground><PortalScreenHeader navigation={{ goBack: () => setSelected(null) }} eyebrow="Área administrativa" title={selected.id ? 'Editar vereador' : 'Novo vereador'} subtitle="Cadastro parlamentar" /><FormCard><Input placeholder="Nome completo" placeholderTextColor="#94a3b8" value={form.name} onChangeText={value => setForm({ ...form, name: value })} /><Input placeholder="Cargo" placeholderTextColor="#94a3b8" value={form.cargo} onChangeText={value => setForm({ ...form, cargo: value })} /><Input placeholder="Partido" placeholderTextColor="#94a3b8" value={form.partido} onChangeText={value => setForm({ ...form, partido: value })} /><Input placeholder="Data de nascimento (dd/mm/aaaa)" placeholderTextColor="#94a3b8" value={formatDate(form.dataNascimento)} onChangeText={value => setForm({ ...form, dataNascimento: formatDateInput(value) })} /><EditorButton style={{ marginTop: 12 }} onPress={chooseImage}><EditorButtonText>{form.avatarUrl ? 'Substituir foto' : 'Carregar foto do vereador'}</EditorButtonText></EditorButton>{form.avatarUrl ? <Preview resizeMode="cover" source={{ uri: form.avatarUrl }} /> : null}<EditorToolbar><EditorButton onPress={() => setForm({ ...form, biografia: `<h2>${decodeBiography(form.biografia)}</h2>` })}><EditorButtonText>Título</EditorButtonText></EditorButton><EditorButton onPress={() => setForm({ ...form, biografia: `<strong>${decodeBiography(form.biografia)}</strong>` })}><EditorButtonText>Negrito</EditorButtonText></EditorButton><EditorButton onPress={() => setForm({ ...form, biografia: `<ul><li>${decodeBiography(form.biografia)}</li></ul>` })}><EditorButtonText>Lista</EditorButtonText></EditorButton></EditorToolbar><TextArea multiline placeholder="Biografia" placeholderTextColor="#94a3b8" value={decodeBiography(form.biografia)} onChangeText={value => setForm({ ...form, biografia: value })} /><Row style={{ marginTop: 16, justifyContent: 'space-between' }}><Detail>Permitir agendamento de visita</Detail><Switch value={form.permiteAgendamentoVisita !== false} onValueChange={value => setForm({ ...form, permiteAgendamentoVisita: value })} /></Row><Button disabled={saving} onPress={save}><ButtonText>{saving ? 'Salvando...' : 'Salvar vereador'}</ButtonText></Button>{selected.id && <DangerButton onPress={remove}><ButtonText>Excluir cadastro</ButtonText></DangerButton>}</FormCard></PortalBackground>;
  return <PortalBackground><PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title="Vereadores" subtitle="Cadastre e gerencie os parlamentares." /><Button style={{ margin: 18 }} onPress={() => openForm()}><ButtonText>Novo vereador</ButtonText></Button>{loading ? null : <FlatList data={items} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 36 }} ListEmptyComponent={<Empty>Nenhum vereador cadastrado.</Empty>} renderItem={({ item }) => <Card onPress={() => openForm(item)}><Row><MaterialCommunityIcons name="account-tie-outline" size={30} color="#0284C7" /><Info><Title>{item.name || 'Vereador sem nome'}</Title><Detail>{item.cargo || 'Vereador'} {item.partido ? `· ${item.partido}` : ''}</Detail><Detail>Toque para editar cadastro, biografia e foto.</Detail></Info><MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" /></Row></Card>} />}</PortalBackground>;
}
