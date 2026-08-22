import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { AuthContext } from '../context/AuthContext';

const stars = [1, 2, 3, 4, 5];

function RatingField({ label, value, onChange, theme }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: theme.portal.text, fontSize: 15, fontWeight: '800' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {stars.map(star => (
          <TouchableOpacity
            key={star}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === star }}
            accessibilityLabel={`${star} estrela${star > 1 ? 's' : ''}`}
            activeOpacity={0.72}
            onPress={() => onChange(star)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: star <= value ? '#f59e0b' : theme.portal.border,
              backgroundColor: star <= value ? (theme.mode === 'dark' ? '#3b2d0a' : '#fffbeb') : theme.portal.card,
            }}
          >
            <Ionicons name="star" size={25} color={star <= value ? '#f59e0b' : theme.portal.subtle} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={{ color: theme.portal.muted, fontSize: 13, fontWeight: '700' }}>
        {value ? `${value} de 5` : 'Selecione uma nota'}
      </Text>
    </View>
  );
}

export default function AvaliarAtendimentoScreen({ route, navigation }) {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const protocolo = route.params?.protocolo || route.params?.solicitacaoId;
  const notificationId = route.params?.notificationId || (protocolo ? `service-evaluation_${protocolo}` : '');
  const [request, setRequest] = useState(null);
  const [attendanceRating, setAttendanceRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user?.uid || !protocolo) {
        if (active) {
          setError('Não foi possível identificar este atendimento.');
          setLoading(false);
        }
        return;
      }

      try {
        const [requestSnapshot, reviewSnapshot] = await Promise.all([
          getDoc(doc(firestore, 'balcao-cidadao', protocolo)),
          getDoc(doc(firestore, 'atendimento-avaliacoes', `${protocolo}_${user.uid}`)),
        ]);
        if (!active) return;

        if (!requestSnapshot.exists()) throw new Error('Atendimento não encontrado.');
        const requestData = requestSnapshot.data() || {};
        const finished = Boolean(requestData.atendimentoPresencialConcluidoEm)
          || requestData.statusFila === 'Atendimento Presencial Concluído';
        if (requestData.userId !== user.uid || !finished) {
          throw new Error('Esta avaliação ainda não está disponível.');
        }

        setRequest({ id: requestSnapshot.id, ...requestData });
        if (reviewSnapshot.exists()) {
          if (notificationId) {
            await setDoc(doc(firestore, 'notifications', notificationId), {
              evaluated: true,
              evaluatedAt: reviewSnapshot.data()?.updatedAt || reviewSnapshot.data()?.createdAt || serverTimestamp(),
              read: true,
              isRead: true,
            }, { merge: true });
          }
          throw new Error('Esta avaliação já foi enviada.');
        }
      } catch (loadError) {
        console.error('Erro ao carregar avaliação:', loadError);
        setError(loadError.message || 'Não foi possível carregar a avaliação.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [notificationId, protocolo, user?.uid]);

  const submit = async () => {
    if (!request || !user?.uid || saving) return;
    if (!attendanceRating || !serviceRating) {
      Alert.alert('Avaliação incompleta', 'Avalie o atendimento e o serviço para continuar.');
      return;
    }

    setSaving(true);
    try {
      const reviewData = {
        protocolo,
        userId: user.uid,
        nota: attendanceRating,
        notaAtendimento: attendanceRating,
        notaServico: serviceRating,
        comentario: comment.trim(),
        setor: 'Balcão do Cidadão',
        assunto: request.dadosSolicitacao?.assunto || '',
        statusSolicitacao: request.status || '',
        atendenteUid: request.atendenteUid || '',
        atendenteNome: request.atendenteNome || '',
        guicheAtendimento: request.guicheAtendimento || '',
        sessaoGuicheId: request.sessaoGuicheId || '',
        updatedAt: serverTimestamp(),
      };
      const reviewRef = doc(firestore, 'atendimento-avaliacoes', `${protocolo}_${user.uid}`);
      const notificationRef = doc(firestore, 'notifications', notificationId || `service-evaluation_${protocolo}`);
      await runTransaction(firestore, async transaction => {
        const existingReview = await transaction.get(reviewRef);
        if (existingReview.exists()) throw new Error('Esta avaliação já foi enviada.');
        transaction.set(reviewRef, { ...reviewData, createdAt: serverTimestamp() });
        transaction.set(notificationRef, {
          evaluated: true,
          evaluatedAt: serverTimestamp(),
          read: true,
          isRead: true,
        }, { merge: true });
      });
      setSaved(true);
      Alert.alert('Obrigado pela avaliação', 'Sua resposta foi registrada com sucesso.', [
        { text: 'OK', onPress: () => navigation.replace('Notificacoes') },
      ]);
    } catch (saveError) {
      console.error('Erro ao salvar avaliação:', saveError);
      if (saveError.message === 'Esta avaliação já foi enviada.') {
        Alert.alert('Avaliação já enviada', saveError.message, [
          { text: 'Voltar às notificações', onPress: () => navigation.replace('Notificacoes') },
        ]);
      } else {
        Alert.alert('Não foi possível salvar', 'Verifique sua conexão e tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.portal.page }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 18, paddingBottom: insets.bottom + 36, gap: 18 }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => navigation.goBack()}
          style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.portal.card, borderWidth: 1, borderColor: theme.portal.border }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.portal.text} />
        </TouchableOpacity>

        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.portal.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }}>Avaliação</Text>
          <Text selectable style={{ color: theme.portal.text, fontSize: 28, lineHeight: 34, fontWeight: '900' }}>Como foi seu atendimento?</Text>
          <Text style={{ color: theme.portal.muted, fontSize: 15, lineHeight: 22 }}>Sua opinião ajuda a Câmara a melhorar o atendimento e os serviços oferecidos.</Text>
        </View>

        {loading ? (
          <View style={{ minHeight: 260, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.portal.primary} /></View>
        ) : error ? (
          <View style={{ padding: 20, borderRadius: 16, borderCurve: 'continuous', backgroundColor: theme.portal.card, borderWidth: 1, borderColor: theme.portal.border, gap: 8 }}>
            <Text selectable style={{ color: theme.portal.danger, fontWeight: '900', fontSize: 16 }}>Avaliação indisponível</Text>
            <Text selectable style={{ color: theme.portal.muted, lineHeight: 20 }}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={{ padding: 18, borderRadius: 16, borderCurve: 'continuous', backgroundColor: theme.portal.card, borderWidth: 1, borderColor: theme.portal.border, gap: 8 }}>
              <Text style={{ color: theme.portal.muted, fontSize: 12, fontWeight: '800' }}>PROTOCOLO</Text>
              <Text selectable style={{ color: theme.portal.text, fontSize: 16, fontWeight: '900' }}>{protocolo}</Text>
              <Text selectable style={{ color: theme.portal.muted, lineHeight: 20 }}>{request.dadosSolicitacao?.assunto || 'Atendimento presencial'}</Text>
            </View>

            <View style={{ padding: 18, borderRadius: 16, borderCurve: 'continuous', backgroundColor: theme.portal.card, borderWidth: 1, borderColor: theme.portal.border, gap: 24 }}>
              <RatingField label="Atendimento do servidor" value={attendanceRating} onChange={setAttendanceRating} theme={theme} />
              <RatingField label="Qualidade do serviço recebido" value={serviceRating} onChange={setServiceRating} theme={theme} />
              <View style={{ gap: 9 }}>
                <Text style={{ color: theme.portal.text, fontSize: 15, fontWeight: '800' }}>Comentário opcional</Text>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Conte como foi sua experiência"
                  placeholderTextColor={theme.portal.subtle}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                  style={{ minHeight: 120, borderWidth: 1, borderColor: theme.portal.border, borderRadius: 14, borderCurve: 'continuous', padding: 14, color: theme.portal.text, backgroundColor: theme.portal.pageAlt, fontSize: 15 }}
                />
              </View>
            </View>

            <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} onPress={submit} disabled={saving} style={{ borderRadius: 15, borderCurve: 'continuous', overflow: 'hidden', opacity: saving ? 0.65 : 1 }}>
              <LinearGradient colors={theme.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 54, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name={saved ? 'checkmark-circle-outline' : 'send-outline'} size={20} color="#fff" />}
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900' }}>{saving ? 'Salvando...' : saved ? 'Avaliação enviada' : 'Enviar avaliação'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}
