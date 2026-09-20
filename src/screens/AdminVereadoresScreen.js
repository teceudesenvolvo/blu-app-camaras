import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Switch, TextInput } from 'react-native';
import styled from 'styled-components/native';
import { PortalBackground, PortalCard, PortalScreenHeader } from '../components/PortalScaffold';
import { firestore } from '../../services/firebaseConfig';
import { useMobileModules } from '../context/MobileModulesContext';

const Card = styled.TouchableOpacity`margin: 6px 18px; padding: 16px; border-radius: 14px; background-color: ${({ theme }) => theme.portal.card}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const Row = styled.View`flex-direction: row; align-items: center;`;
const Info = styled.View`flex: 1; margin-left: 12px;`;
const Title = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 15px; font-weight: 900;`;
const Detail = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 12px; margin-top: 4px;`;
const Empty = styled.Text`color: ${({ theme }) => theme.portal.muted}; text-align: center; margin: 36px 24px;`;
const FormCard = styled(PortalCard)`margin: 18px;`;
const Input = styled(TextInput)`min-height: 46px; margin-top: 10px; padding: 0 12px; border-radius: 10px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; color: ${({ theme }) => theme.portal.text}; background-color: ${({ theme }) => theme.portal.pageAlt};`;
const TextArea = styled(Input)`height: 120px; padding-top: 12px; text-align-vertical: top;`;
const Button = styled.TouchableOpacity`margin-top: 12px; padding: 13px; border-radius: 10px; align-items: center; background-color: ${({ theme }) => theme.portal.primary};`;
const DangerButton = styled(Button)`background-color: ${({ theme }) => theme.portal.danger};`;
const ButtonText = styled.Text`color: #fff; font-weight: 900;`;

const emptyForm = { name: '', cargo: 'Vereador', partido: '', dataNascimento: '', biografia: '', avatarUrl: '', permiteAgendamentoVisita: true };

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
  const openForm = item => { setSelected(item || { id: null }); setForm(item ? { ...emptyForm, ...item } : emptyForm); };
  const save = async () => { if (!form.name.trim()) return Alert.alert('Atenção', 'Informe o nome do vereador.'); setSaving(true); try { if (selected?.id) await updateDoc(doc(firestore, 'vereadores', selected.id), form); else await addDoc(collection(firestore, 'vereadores'), { ...form, tipo: 'Vereador' }); setSelected(null); } catch (error) { Alert.alert('Erro', error.message || 'Não foi possível salvar.'); } finally { setSaving(false); } };
  const remove = () => selected?.id && Alert.alert('Excluir vereador', 'Deseja realmente excluir este cadastro?', [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: async () => { await deleteDoc(doc(firestore, 'vereadores', selected.id)); setSelected(null); } }]);
  if (selected) return <PortalBackground><PortalScreenHeader navigation={{ goBack: () => setSelected(null) }} eyebrow="Área administrativa" title={selected.id ? 'Editar vereador' : 'Novo vereador'} subtitle="Cadastro parlamentar" /><FormCard><Input placeholder="Nome completo" placeholderTextColor="#94a3b8" value={form.name} onChangeText={value => setForm({ ...form, name: value })} /><Input placeholder="Cargo" placeholderTextColor="#94a3b8" value={form.cargo} onChangeText={value => setForm({ ...form, cargo: value })} /><Input placeholder="Partido" placeholderTextColor="#94a3b8" value={form.partido} onChangeText={value => setForm({ ...form, partido: value })} /><Input placeholder="Data de nascimento" placeholderTextColor="#94a3b8" value={form.dataNascimento} onChangeText={value => setForm({ ...form, dataNascimento: value })} /><Input placeholder="URL da foto" placeholderTextColor="#94a3b8" value={form.avatarUrl} onChangeText={value => setForm({ ...form, avatarUrl: value })} /><TextArea multiline placeholder="Biografia" placeholderTextColor="#94a3b8" value={form.biografia} onChangeText={value => setForm({ ...form, biografia: value })} /><Row style={{ marginTop: 16, justifyContent: 'space-between' }}><Detail>Permitir agendamento de visita</Detail><Switch value={form.permiteAgendamentoVisita !== false} onValueChange={value => setForm({ ...form, permiteAgendamentoVisita: value })} /></Row><Button disabled={saving} onPress={save}><ButtonText>{saving ? 'Salvando...' : 'Salvar vereador'}</ButtonText></Button>{selected.id && <DangerButton onPress={remove}><ButtonText>Excluir cadastro</ButtonText></DangerButton>}</FormCard></PortalBackground>;
  return <PortalBackground><PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title="Vereadores" subtitle="Cadastre e gerencie os parlamentares." /><Button style={{ margin: 18 }} onPress={() => openForm()}><ButtonText>Novo vereador</ButtonText></Button>{loading ? null : <FlatList data={items} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 36 }} ListEmptyComponent={<Empty>Nenhum vereador cadastrado.</Empty>} renderItem={({ item }) => <Card onPress={() => openForm(item)}><Row><MaterialCommunityIcons name="account-tie-outline" size={30} color="#0284C7" /><Info><Title>{item.name || 'Vereador sem nome'}</Title><Detail>{item.cargo || 'Vereador'} {item.partido ? `· ${item.partido}` : ''}</Detail><Detail>Toque para editar cadastro, biografia e foto.</Detail></Info><MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" /></Row></Card>} />}</PortalBackground>;
}
