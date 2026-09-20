import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { PortalBackground, PortalScreenHeader } from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';

const dateValue = value => value?.toMillis?.() || value || 0;

export default function AvaliacoesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const theme = useTheme().portal;
  const [requests, setRequests] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [ready, setReady] = useState({ requests: false, reviews: false });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.uid) return undefined;
    const own = where('userId', '==', user.uid);
    const unsubRequests = onSnapshot(query(collection(firestore, 'balcao-cidadao'), own), snapshot => {
      setRequests(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      setReady(previous => ({ ...previous, requests: true }));
    }, failure => { setError(failure.message); setReady(previous => ({ ...previous, requests: true })); });
    const unsubReviews = onSnapshot(query(collection(firestore, 'atendimento-avaliacoes'), own), snapshot => {
      setReviews(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      setReady(previous => ({ ...previous, reviews: true }));
    }, failure => { setError(failure.message); setReady(previous => ({ ...previous, reviews: true })); });
    return () => { unsubRequests(); unsubReviews(); };
  }, [user?.uid]);

  const items = useMemo(() => {
    const reviewed = new Set(reviews.map(item => item.protocolo));
    return requests
      .filter(item => Boolean(item.atendimentoPresencialConcluidoEm) || item.statusFila === 'Atendimento Presencial Concluído')
      .map(item => ({ ...item, reviewed: reviewed.has(item.id) }))
      .sort((a, b) => dateValue(b.atendimentoPresencialConcluidoEm || b.dataSolicitacao) - dateValue(a.atendimentoPresencialConcluidoEm || a.dataSolicitacao));
  }, [requests, reviews]);

  return <PortalBackground>
    <PortalScreenHeader navigation={navigation} title="Avaliações" subtitle="Atendimentos presenciais concluídos" />
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 110 }}>
      {!ready.requests || !ready.reviews ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? <Text style={{ color: theme.danger, lineHeight: 20 }}>{error}</Text> : null}
      {ready.requests && ready.reviews && !items.length && !error ? <Text style={{ color: theme.muted, lineHeight: 21 }}>Nenhum atendimento disponível para avaliação.</Text> : null}
      {items.map(item => <TouchableOpacity
        key={item.id}
        accessibilityRole="button"
        disabled={item.reviewed}
        onPress={() => navigation.navigate('AvaliarAtendimento', { protocolo: item.id })}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, borderRadius: 8 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>{item.dadosSolicitacao?.assunto || 'Atendimento no Balcão'}</Text>
          <Text style={{ color: item.reviewed ? theme.muted : theme.primary, marginTop: 5 }}>{item.reviewed ? 'Avaliação enviada' : 'Avaliar atendimento'}</Text>
        </View>
        <Ionicons name={item.reviewed ? 'checkmark-circle-outline' : 'chevron-forward'} size={22} color={item.reviewed ? theme.muted : theme.primary} />
      </TouchableOpacity>)}
    </ScrollView>
  </PortalBackground>;
}
