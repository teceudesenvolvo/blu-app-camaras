import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { PortalBackground, PortalCard, PortalScreenHeader } from '../components/PortalScaffold';
import { useMobileModules } from '../context/MobileModulesContext';
import { firestore } from '../../services/firebaseConfig';

const RATINGS = ['Todas', '5 estrelas', '4 estrelas', '3 estrelas', '2 estrelas', '1 estrela'];
const rating = item => Number(item.notaAtendimento || item.nota || 0);
const dateOf = item => item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || item.updatedAt || 0);
const dateLabel = item => { const date = dateOf(item); return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleString('pt-BR'); };
const cardStyle = { marginHorizontal: 18, marginVertical: 6, padding: 16, borderRadius: 14, borderWidth: 1 };

export default function AdminAvaliacoesScreen({ navigation }) {
  const theme = useTheme();
  const { canUseAdminApp } = useMobileModules();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('Todas');
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (!canUseAdminApp('avaliacoes')) return undefined;
    return onSnapshot(collection(firestore, 'atendimento-avaliacoes'), snapshot => setItems(snapshot.docs.map(row => ({ id: row.id, ...row.data() }))), () => setItems([]));
  }, [canUseAdminApp]);
  const visible = useMemo(() => items.filter(item => filter === 'Todas' || rating(item) === Number(filter.charAt(0))).sort((a, b) => dateOf(b) - dateOf(a)), [items, filter]);
  const average = useMemo(() => items.length ? (items.reduce((total, item) => total + rating(item), 0) / items.length).toFixed(1).replace('.', ',') : '0,0', [items]);
  const label = { color: theme.portal.muted, fontSize: 12, fontWeight: '800', marginTop: 14 };
  const value = { color: theme.portal.text, fontSize: 15, lineHeight: 22, marginTop: 4 };
  if (!canUseAdminApp('avaliacoes')) return <PortalBackground><PortalScreenHeader navigation={navigation} title="Acesso indisponível" /></PortalBackground>;
  if (selected) return <PortalBackground><PortalScreenHeader navigation={{ goBack: () => setSelected(null) }} eyebrow="Área administrativa" title="Detalhes da avaliação" subtitle={selected.protocolo || selected.id} /><ScrollView contentContainerStyle={{ paddingBottom: 36 }}><PortalCard style={{ margin: 18 }}><Text style={label}>Nota do atendimento</Text><Text style={value}>{rating(selected)} de 5 estrelas</Text><Text style={label}>Nota do serviço</Text><Text style={value}>{selected.notaServico || 'Não informada'} de 5 estrelas</Text><Text style={label}>Setor</Text><Text style={value}>{selected.setor || 'Não informado'}</Text><Text style={label}>Assunto</Text><Text style={value}>{selected.assunto || 'Não informado'}</Text><Text style={label}>Comentário</Text><Text style={value}>{selected.comentario || 'Nenhum comentário informado.'}</Text><Text style={label}>Atendente</Text><Text style={value}>{selected.atendenteNome || selected.atendenteUid || 'Não informado'}</Text><Text style={label}>Data</Text><Text style={value}>{dateLabel(selected)}</Text></PortalCard></ScrollView></PortalBackground>;
  return <PortalBackground><PortalScreenHeader navigation={navigation} eyebrow="Área administrativa" title="Avaliações" subtitle="Acompanhe a opinião dos cidadãos sobre os atendimentos." /><PortalCard style={{ margin: 18, marginBottom: 8 }}><Text style={{ color: theme.portal.muted, fontSize: 14, fontWeight: '900' }}>Média geral do atendimento</Text><Text style={{ color: theme.portal.primary, fontSize: 28, fontWeight: '900', marginTop: 5 }}>{average} / 5</Text><Text style={{ color: theme.portal.muted, marginTop: 4 }}>{items.length} avaliação(ões) registrada(s)</Text></PortalCard><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 8, alignItems: 'center' }}>{RATINGS.map(item => { const active = filter === item; return <TouchableOpacity key={item} onPress={() => setFilter(item)} style={{ minHeight: 44, paddingHorizontal: 16, marginRight: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? theme.portal.primary : theme.portal.card, borderWidth: 1, borderColor: active ? theme.portal.primary : theme.portal.border }}><Text numberOfLines={1} style={{ color: active ? '#fff' : theme.portal.text, fontSize: 13, lineHeight: 18, fontWeight: '800' }}>{item}</Text></TouchableOpacity>; })}</ScrollView><FlatList data={visible} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 36 }} ListEmptyComponent={<Text style={{ color: theme.portal.muted, textAlign: 'center', margin: 36 }}>Nenhuma avaliação encontrada.</Text>} renderItem={({ item }) => <TouchableOpacity onPress={() => setSelected(item)} style={[cardStyle, { backgroundColor: theme.portal.card, borderColor: theme.portal.border }]}><View style={{ flexDirection: 'row', alignItems: 'center' }}><MaterialCommunityIcons name="star-circle-outline" size={30} color="#f59e0b" /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: theme.portal.text, fontSize: 15, fontWeight: '900' }}>{rating(item)} de 5 estrelas</Text><Text style={{ color: theme.portal.muted, fontSize: 12, marginTop: 4 }}>{item.setor || 'Atendimento'} · {item.assunto || 'Sem assunto'}</Text><Text numberOfLines={2} style={{ color: theme.portal.muted, fontSize: 12, marginTop: 4 }}>{item.comentario || 'Sem comentário'}</Text><Text style={{ color: theme.portal.muted, fontSize: 12, marginTop: 4 }}>{dateLabel(item)}</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color={theme.portal.subtle} /></View></TouchableOpacity>} /></PortalBackground>;
}
