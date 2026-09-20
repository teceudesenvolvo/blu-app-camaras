import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, TextInput } from 'react-native';
import styled from 'styled-components/native';

import chamberConfig from '../config';
import { PortalBackground, PortalCard, PortalScreenHeader } from '../components/PortalScaffold';
import { useMobileModules } from '../context/MobileModulesContext';
import { firestore } from '../../services/firebaseConfig';
import { uploadFileToStorage } from '../../services/storageService';

const FilterBar = styled.View`padding: 14px 18px 6px;`;
const Horizontal = styled(ScrollView).attrs({ horizontal: true, showsHorizontalScrollIndicator: false })`margin-bottom: 8px;`;
const Chip = styled.TouchableOpacity`padding: 10px 13px; margin-right: 8px; border-radius: 12px; background-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.card}; border-width: 1px; border-color: ${({ active, theme }) => active ? theme.portal.primary : theme.portal.border};`;
const ChipText = styled.Text`font-size: 12px; font-weight: 800; color: ${({ active, theme }) => active ? '#fff' : theme.portal.text};`;
const Search = styled(TextInput)`height: 44px; padding: 0 12px; border-radius: 11px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; background-color: ${({ theme }) => theme.portal.card}; color: ${({ theme }) => theme.portal.text}; font-size: 12px;`;
const Card = styled.TouchableOpacity`margin: 6px 18px; padding: 14px; border-radius: 14px; background-color: ${({ theme }) => theme.portal.card}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const Row = styled.View`flex-direction: row; align-items: center;`;
const Info = styled.View`flex: 1; margin-left: 12px;`;
const Title = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 15px; font-weight: 900;`;
const Detail = styled.Text`color: ${({ theme }) => theme.portal.muted}; font-size: 12px; margin-top: 4px;`;
const Empty = styled.Text`color: ${({ theme }) => theme.portal.muted}; text-align: center; margin: 36px 24px;`;
const FormCard = styled(PortalCard)`margin: 18px;`;
const Label = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 13px; font-weight: 800; margin-top: 14px;`;
const Input = styled(TextInput)`min-height: 46px; margin-top: 8px; padding: 0 12px; border-radius: 10px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; color: ${({ theme }) => theme.portal.text}; background-color: ${({ theme }) => theme.portal.pageAlt};`;
const EditorShell = styled.View`margin-top: 8px; border-radius: 10px; border-width: 1px; border-color: ${({ theme }) => theme.portal.border}; background-color: ${({ theme }) => theme.portal.pageAlt}; overflow: hidden;`;
const EditorToolbar = styled.ScrollView.attrs({ horizontal: true, showsHorizontalScrollIndicator: false })`padding: 8px; border-bottom-width: 1px; border-bottom-color: ${({ theme }) => theme.portal.border};`;
const EditorTool = styled.TouchableOpacity`min-width: 38px; height: 34px; margin-right: 6px; border-radius: 7px; align-items: center; justify-content: center; background-color: ${({ theme }) => theme.portal.card}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const EditorToolText = styled.Text`color: ${({ theme }) => theme.portal.text}; font-size: 13px; font-weight: 900;`;
const EditorInput = styled.TextInput`min-height: 230px; padding: 14px; color: ${({ theme }) => theme.portal.text}; font-size: 15px; line-height: 23px; text-align-vertical: top;`;
const Action = styled.TouchableOpacity`margin-top: 12px; padding: 13px; border-radius: 11px; align-items: center; background-color: ${({ theme }) => theme.portal.primary};`;
const SecondaryAction = styled(Action)`background-color: ${({ theme }) => theme.portal.pageAlt}; border-width: 1px; border-color: ${({ theme }) => theme.portal.border};`;
const DangerAction = styled(Action)`background-color: ${({ theme }) => theme.portal.danger};`;
const ActionText = styled.Text`color: ${({ inverse, theme }) => inverse ? theme.portal.text : '#fff'}; font-weight: 900;`;
const Cover = styled(Image)`width: 92px; height: 64px; border-radius: 8px; background-color: ${({ theme }) => theme.portal.pageAlt};`;
const Preview = styled(Image)`width: 100%; height: 170px; margin-top: 12px; border-radius: 10px; background-color: ${({ theme }) => theme.portal.pageAlt};`;

const emptyForm = { titulo: '', subtitulo: '', conteudo: '', capaUrl: '', autor: '', status: 'Rascunho' };
const STATUSES = ['Todas', 'Publicado', 'Rascunho'];
const cleanText = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const dateOf = item => item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || item.updatedAt || 0);

export default function AdminNoticiasScreen({ navigation }) {
  const { canUseAdminApp } = useMobileModules();
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageUri, setImageUri] = useState('');
  const [saving, setSaving] = useState(false);
  const [editorSelection, setEditorSelection] = useState({ start: 0, end: 0 });

  useEffect(() => {
    if (!canUseAdminApp('noticias')) return undefined;
    return onSnapshot(collection(firestore, 'noticias'), snapshot => {
      setItems(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }, () => setItems([]));
  }, [canUseAdminApp]);

  const visibleItems = useMemo(() => items.filter(item => {
    const status = item.status || 'Rascunho';
    const text = cleanText(`${item.titulo} ${item.subtitulo} ${item.autor}`);
    return (statusFilter === 'Todas' || status === statusFilter) && (!search.trim() || text.toLowerCase().includes(search.toLowerCase().trim()));
  }).sort((a, b) => dateOf(b) - dateOf(a)), [items, search, statusFilter]);

  if (!canUseAdminApp('noticias')) return <PortalBackground><PortalScreenHeader navigation={navigation} title="Acesso indisponível" /></PortalBackground>;

  const openForm = item => {
    setSelected(item || { id: null });
    setForm(item ? { ...emptyForm, ...item } : emptyForm);
    setImageUri(item?.capaUrl || '');
    setEditorSelection({ start: 0, end: 0 });
  };
  const applyMarkup = (opening, closing) => {
    const value = form.conteudo || '';
    const start = editorSelection.start || 0;
    const end = editorSelection.end || start;
    const selectedText = value.slice(start, end) || 'texto';
    setForm({ ...form, conteudo: `${value.slice(0, start)}${opening}${selectedText}${closing}${value.slice(end)}` });
  };
  const chooseCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [2, 1], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.width !== 1440 || asset.height !== 720) {
      Alert.alert('Imagem inválida', `A imagem de capa deve ter exatamente 1440x720 pixels. A imagem selecionada tem ${asset.width}x${asset.height} pixels.`);
      return;
    }
    setImageUri(asset.uri);
  };
  const save = async status => {
    if (!form.titulo.trim() || !form.conteudo.trim()) return Alert.alert('Atenção', 'Informe o título e o conteúdo da notícia.');
    setSaving(true);
    try {
      let capaUrl = form.capaUrl || '';
      if (imageUri && imageUri !== capaUrl) capaUrl = await uploadFileToStorage(imageUri, `${chamberConfig.flavorId}/noticias`);
      const data = { titulo: form.titulo.trim(), subtitulo: form.subtitulo.trim(), conteudo: form.conteudo.trim(), capaUrl, autor: form.autor.trim(), status, updatedAt: serverTimestamp() };
      if (selected?.id) await updateDoc(doc(firestore, 'noticias', selected.id), data);
      else await addDoc(collection(firestore, 'noticias'), { ...data, createdAt: serverTimestamp() });
      setSelected(null);
    } catch (error) { Alert.alert('Erro ao salvar', error.message || 'Não foi possível salvar a notícia.'); }
    finally { setSaving(false); }
  };
  const remove = () => {
    if (!selected?.id) return;
    Alert.alert('Excluir notícia', 'Deseja realmente excluir esta notícia?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: async () => {
      try { await deleteDoc(doc(firestore, 'noticias', selected.id)); setSelected(null); }
      catch (error) { Alert.alert('Erro ao excluir', error.message || 'Não foi possível excluir a notícia.'); }
    } }]);
  };

  if (selected) return <PortalBackground>
    <PortalScreenHeader navigation={{ goBack: () => setSelected(null) }} eyebrow="Área administrativa" title={selected.id ? 'Editar notícia' : 'Nova notícia'} subtitle="Publicação para o portal e aplicativo." />
    <ScrollView contentContainerStyle={{ paddingBottom: 38 }}><FormCard>
      <Label>Título</Label><Input placeholder="Título da notícia" placeholderTextColor="#94a3b8" value={form.titulo} onChangeText={titulo => setForm({ ...form, titulo })} />
      <Label>Subtítulo / resumo</Label><Input placeholder="Breve descrição da notícia" placeholderTextColor="#94a3b8" value={form.subtitulo} onChangeText={subtitulo => setForm({ ...form, subtitulo })} />
      <Label>Autor ou setor</Label><Input placeholder="Ex.: Câmara Municipal" placeholderTextColor="#94a3b8" value={form.autor} onChangeText={autor => setForm({ ...form, autor })} />
      <Label>Imagem de capa (1440x720px)</Label><SecondaryAction onPress={chooseCover}><ActionText inverse><MaterialCommunityIcons name="image-plus-outline" size={18} />  Selecionar imagem</ActionText></SecondaryAction>{imageUri ? <Preview source={{ uri: imageUri }} contentFit="cover" /> : null}
      <Label>Conteúdo da notícia</Label>
      <EditorShell>
        <EditorToolbar>
          <EditorTool onPress={() => applyMarkup('<strong>', '</strong>')}><EditorToolText>B</EditorToolText></EditorTool>
          <EditorTool onPress={() => applyMarkup('<em>', '</em>')}><EditorToolText>I</EditorToolText></EditorTool>
          <EditorTool onPress={() => applyMarkup('<h2>', '</h2>')}><EditorToolText>H2</EditorToolText></EditorTool>
          <EditorTool onPress={() => applyMarkup('<h3>', '</h3>')}><EditorToolText>H3</EditorToolText></EditorTool>
          <EditorTool onPress={() => applyMarkup('<p>', '</p>')}><EditorToolText>P</EditorToolText></EditorTool>
          <EditorTool onPress={() => applyMarkup('<ul><li>', '</li></ul>')}><EditorToolText>Lista</EditorToolText></EditorTool>
          <EditorTool onPress={() => applyMarkup('<a href="URL">', '</a>')}><EditorToolText>Link</EditorToolText></EditorTool>
        </EditorToolbar>
        <EditorInput multiline placeholder="Escreva sua notícia aqui... Use a barra acima para formatar." placeholderTextColor="#94a3b8" value={form.conteudo} onChangeText={conteudo => setForm({ ...form, conteudo })} onSelectionChange={event => setEditorSelection(event.nativeEvent.selection)} />
      </EditorShell>
      <Action disabled={saving} onPress={() => save('Publicado')}><ActionText>{saving ? 'Salvando...' : 'Publicar notícia'}</ActionText></Action>
      <SecondaryAction disabled={saving} onPress={() => save('Rascunho')}><ActionText inverse>Salvar como rascunho</ActionText></SecondaryAction>
      {selected.id && <DangerAction onPress={remove}><ActionText>Excluir notícia</ActionText></DangerAction>}
    </FormCard></ScrollView>
  </PortalBackground>;

  return <PortalBackground>
    <PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title="Notícias" subtitle="Publique novidades e avisos para os cidadãos." />
    <Action onPress={() => openForm()}><ActionText>Nova notícia</ActionText></Action>
    <FilterBar><Horizontal>{STATUSES.map(status => <Chip key={status} active={statusFilter === status} onPress={() => setStatusFilter(status)}><ChipText active={statusFilter === status}>{status}</ChipText></Chip>)}</Horizontal><Search value={search} onChangeText={setSearch} placeholder="Buscar notícia" placeholderTextColor="#94a3b8" /></FilterBar>
    <FlatList data={visibleItems} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 36 }} ListEmptyComponent={<Empty>Nenhuma notícia encontrada.</Empty>} renderItem={({ item }) => <Card onPress={() => openForm(item)}><Row>{item.capaUrl ? <Cover source={{ uri: item.capaUrl }} contentFit="cover" /> : <MaterialCommunityIcons name="newspaper-variant-outline" size={48} color="#94a3b8" />}<Info><Title>{item.titulo || 'Notícia sem título'}</Title><Detail numberOfLines={2}>{cleanText(item.subtitulo || item.conteudo)}</Detail><Detail>{item.status || 'Rascunho'}{item.autor ? ` · ${item.autor}` : ''}</Detail></Info><MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" /></Row></Card>} />
  </PortalBackground>;
}
