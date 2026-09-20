import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, FlatList, TextInput } from 'react-native';
import styled from 'styled-components/native';

import { PortalBackground, PortalCard, PortalScreenHeader } from '../components/PortalScaffold';
import { useMobileModules } from '../context/MobileModulesContext';
import { firestore } from '../../services/firebaseConfig';

const Card = styled.TouchableOpacity`margin: 6px 18px; padding: 16px; border-radius: 14px; background-color: ${({ theme }) => theme.portal.card}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const Row = styled.View`flex-direction: row; align-items: center;`;
const Info = styled.View`flex: 1; margin-left: 12px;`;
const Title = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 15px; font-weight: 900;`;
const Detail = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 12px; margin-top: 5px;`;
const Empty = styled.Text`color: ${({ theme }) => theme.portal.muted}; text-align: center; margin: 36px 24px;`;
const FormCard = styled(PortalCard)`margin: 18px;`;
const Input = styled(TextInput)`min-height: 46px; margin-top: 10px; padding: 0 12px; border-radius: 10px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; color: ${({ theme }) => theme.portal.text}; background-color: ${({ theme }) => theme.portal.pageAlt};`;
const TextArea = styled(Input)`height: 150px; padding-top: 12px; text-align-vertical: top;`;
const Button = styled.TouchableOpacity`margin: 18px; padding: 13px; border-radius: 10px; align-items: center; background-color: ${({ theme }) => theme.portal.primary};`;
const FormButton = styled(Button)`margin: 12px 0 0;`;
const DangerButton = styled(FormButton)`background-color: ${({ theme }) => theme.portal.danger};`;
const ButtonText = styled.Text`color: #fff; font-weight: 900;`;
const SectionLabel = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 13px; font-weight: 800; margin-top: 14px;`;

const emptyForm = { title: '', content: '' };
const timestampOf = value => value?.toMillis ? value.toMillis() : (value ? new Date(value).getTime() || 0 : 0);

export default function AdminPielScreen({ navigation }) {
  const { canUseAdminApp } = useMobileModules();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canUseAdminApp('piel')) return undefined;
    setLoading(true);
    return onSnapshot(collection(firestore, 'piel'), snapshot => {
      setItems(snapshot.docs.map(item => {
        const data = item.data();
        return { id: item.id, ...data, timestamp: timestampOf(data.createdAt || data.migratedAt) };
      }).sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    }, () => setLoading(false));
  }, [canUseAdminApp]);

  if (!canUseAdminApp('piel')) return <PortalBackground><PortalScreenHeader navigation={navigation} title="Acesso indisponível" /></PortalBackground>;

  const openForm = item => { setSelected(item || { id: null }); setForm(item ? { title: item.title || '', content: item.content || '' } : emptyForm); };
  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return Alert.alert('Atenção', 'Informe o título e o conteúdo do informativo.');
    setSaving(true);
    try {
      const data = { title: form.title.trim(), content: form.content.trim(), updatedAt: serverTimestamp() };
      if (selected?.id) await updateDoc(doc(firestore, 'piel', selected.id), data);
      else await addDoc(collection(firestore, 'piel'), { ...data, createdAt: serverTimestamp() });
      setSelected(null);
    } catch (error) { Alert.alert('Erro ao salvar', error.message || 'Não foi possível salvar o informativo.'); }
    finally { setSaving(false); }
  };
  const remove = () => {
    if (!selected?.id) return;
    Alert.alert('Excluir informativo', 'Deseja realmente excluir este informativo?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: async () => {
      try { await deleteDoc(doc(firestore, 'piel', selected.id)); setSelected(null); }
      catch (error) { Alert.alert('Erro ao excluir', error.message || 'Não foi possível excluir o informativo.'); }
    } }]);
  };

  if (selected) return <PortalBackground>
    <PortalScreenHeader navigation={{ goBack: () => setSelected(null) }} eyebrow="Área administrativa" title={selected.id ? 'Editar informativo' : 'Novo informativo'} subtitle="Conteúdo publicado na página PIEL." />
    <FormCard>
      <SectionLabel>Título</SectionLabel>
      <Input placeholder="Título do informativo" placeholderTextColor="#94a3b8" value={form.title} onChangeText={title => setForm({ ...form, title })} />
      <SectionLabel>Conteúdo</SectionLabel>
      <TextArea multiline placeholder="Escreva o conteúdo do informativo" placeholderTextColor="#94a3b8" value={form.content} onChangeText={content => setForm({ ...form, content })} />
      <FormButton disabled={saving} onPress={save}><ButtonText>{saving ? 'Salvando...' : 'Salvar informativo'}</ButtonText></FormButton>
      {selected.id && <DangerButton onPress={remove}><ButtonText>Excluir informativo</ButtonText></DangerButton>}
    </FormCard>
  </PortalBackground>;

  return <PortalBackground>
    <PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title="PIEL" subtitle="Gerencie os informativos do Ponto de Inclusão Eleitoral." />
    <Button onPress={() => openForm()}><ButtonText>Novo informativo</ButtonText></Button>
    <FlatList data={items} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 36 }} ListEmptyComponent={!loading ? <Empty>Nenhum informativo cadastrado.</Empty> : null} renderItem={({ item }) => <Card onPress={() => openForm(item)} activeOpacity={0.8}><Row><MaterialCommunityIcons name="card-account-details-outline" size={30} color="#0284C7" /><Info><Title>{item.title || 'Informativo sem título'}</Title><Detail numberOfLines={2}>{item.content || 'Sem conteúdo.'}</Detail>{item.timestamp > 0 && <Detail>Publicado em {new Date(item.timestamp).toLocaleDateString('pt-BR')}</Detail>}</Info><MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" /></Row></Card>} />
  </PortalBackground>;
}
