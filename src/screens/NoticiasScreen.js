import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { PortalBackground, PortalScreenHeader } from '../components/PortalScaffold';

const published = item => {
  const status = String(item.status || item.situacao || '').toLowerCase().trim();
  return item.publicado === true || item.published === true || item.isPublished === true ||
    ['publicado', 'publicada', 'published'].includes(status);
};
const plain = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export default function NoticiasScreen({ navigation }) {
  const theme = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(firestore, 'noticias'), orderBy('createdAt', 'desc')));
      setItems(snapshot.docs.map(row => ({ id: row.id, ...row.data() })).filter(published));
      setError('');
    } catch (failure) {
      console.warn('Falha ao carregar notícias:', failure.code || failure.message);
      setError('Não foi possível carregar as notícias.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PortalBackground>
      <PortalScreenHeader navigation={navigation} title="Notícias" subtitle="Publicações da Câmara" />
      {loading && items.length === 0 ? <ActivityIndicator style={{ marginTop: 28 }} color={theme.portal.primary} /> : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.portal.primary} />}
          ListHeaderComponent={error ? <View style={{ paddingVertical: 14 }}><Text style={{ color: theme.portal.muted }}>{error}</Text><TouchableOpacity onPress={() => load(true)}><Text style={{ color: theme.portal.primary, marginTop: 8 }}>Tentar novamente</Text></TouchableOpacity></View> : null}
          ListEmptyComponent={!error ? <Text style={{ color: theme.portal.muted, paddingVertical: 24 }}>Nenhuma notícia publicada no momento.</Text> : null}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('NoticiaDetalhe', { news: item, id: item.id })}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10, backgroundColor: theme.portal.card, borderColor: theme.portal.border, borderWidth: 1, borderRadius: 8 }}
            >
              {item.capaUrl ? <Image source={{ uri: item.capaUrl }} style={{ width: 82, height: 82, borderRadius: 6 }} /> : <Ionicons name="newspaper-outline" size={48} color={theme.portal.muted} />}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text numberOfLines={3} style={{ color: theme.portal.text, fontSize: 15, fontWeight: '800', lineHeight: 20 }}>{item.titulo || item.title?.rendered || 'Notícia'}</Text>
                <Text numberOfLines={2} style={{ color: theme.portal.muted, fontSize: 12, lineHeight: 17, marginTop: 5 }}>{plain(item.resumo || item.subtitulo || item.descricao)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.portal.muted} />
            </TouchableOpacity>
          )}
        />
      )}
    </PortalBackground>
  );
}
