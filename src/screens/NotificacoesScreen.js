import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { collection, doc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { AuthContext } from '../context/AuthContext';

const backgroundColor = Constants.expoConfig?.extra?.theme?.background || '#f0f2f5';
const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Container = styled.View`
  flex: 1;
  background-color: ${backgroundColor};
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 50px 20px 20px 20px;
  background-color: #fff;
`;

const BackButton = styled.TouchableOpacity`
  padding: 5px;
`;

const HeaderTitle = styled.Text`
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #111;
  margin-right: 30px;
`;

const ListContainer = styled.View`
  flex: 1;
`;

const NotificationCard = styled.TouchableOpacity`
  background-color: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 12px;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.05;
  shadow-radius: 3px;
  elevation: 2;
`;

const NotificationTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #1A1A40;
  margin-bottom: 5px;
`;

const NotificationDesc = styled.Text`
  font-size: 13px;
  color: #666;
  line-height: 18px;
  margin-bottom: 10px;
`;

const NotificationDate = styled.Text`
  font-size: 12px;
  color: #aaa;
  text-align: right;
`;

const getNotificationRoute = (notification = {}) => {
  const data = notification.data || {};

  if (data.screen === 'TvCamara') {
    return {
      name: 'MainTabs',
      params: { screen: 'TvCamara', params: { videoId: data.videoId } },
    };
  }

  if (data.screen === 'NoticiaDetalhe' || data.type === 'news') {
    return {
      name: 'NoticiaDetalhe',
      params: {
        id: data.id || data.noticiaId || data.protocolo,
      },
    };
  }

  if (data.screen === 'MeusAtendimentos' || data.collection) {
    return {
      name: 'MeusAtendimentos',
      params: {
        source: data.source || data.collection || 'balcao-cidadao',
        solicitacaoId: data.solicitacaoId || data.protocolo,
      },
    };
  }

  if (data.screen) {
    return {
      name: data.screen,
      params: data,
    };
  }

  return null;
};

export default function NotificacoesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // 1. Otimização da Query: Filtra diretamente pelo userId do usuário logado.
    // Isso evita baixar notificações de outros usuários e garante que o listener seja eficiente.
    const q = query(
      collection(firestore, 'notifications'),
      where('flavorId', '==', flavorId),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = [];
      const batch = writeBatch(firestore);
      let hasUpdates = false;
      const userEmail = user?.email ? String(user.email).toLowerCase() : '';

      snapshot.forEach((docSnap) => {
        const notification = docSnap.data();
        
        // Verificação de segurança adicional para o caso de notificações enviadas via e-mail
        const notificationEmail = notification.userEmail ? String(notification.userEmail).toLowerCase() : '';
        const isTargetUser = notification.userId === user.uid || (notificationEmail && notificationEmail === userEmail);
        const isRead = notification.read === true || notification.isRead === true;
        
        const createdAt = notification.createdAt?.toMillis
          ? notification.createdAt.toMillis()
          : (notification.createdAt || notification.timestamp || (notification.migratedAt ? new Date(notification.migratedAt).getTime() : 0));

        if (isTargetUser) {
          data.push({
            id: docSnap.id,
            ...notification,
            createdAt
          });

          // 2. Só adiciona ao batch se houver algo para atualizar de fato
          if (!isRead && docSnap.id) {
            const notifRef = doc(firestore, 'notifications', docSnap.id);
            batch.update(notifRef, { read: true, isRead: true });
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates) {
        try {
          // 3. O commit é assíncrono e não deve bloquear a renderização inicial dos dados já recebidos
          batch.commit().catch(err => console.error("Erro ao atualizar status de leitura:", err));
        } catch (err) {
          console.error("Erro ao atualizar status de leitura:", err);
        }
      }

      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifications(data);
      setLoading(false);
    }, (error) => {
      // 4. Tratamento de erro: Essencial para identificar falhas de permissão ou índices ausentes
      console.error("Erro no listener de notificações:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationPress = (notification) => {
    const route = getNotificationRoute(notification);

    if (route) {
      navigation.navigate(route.name, route.params);
    }
  };

  const renderItem = ({ item }) => {
    const route = getNotificationRoute(item);

    return (
      <NotificationCard
        activeOpacity={route ? 0.7 : 1}
        onPress={() => handleNotificationPress(item)}
        disabled={!route}
      >
        <NotificationTitle>{item.tituloNotification}</NotificationTitle>
        <NotificationDesc>{item.descricaoNotification}</NotificationDesc>
        <NotificationDate>
          {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : ''}
        </NotificationDate>
      </NotificationCard>
    );
  };

  return (
    <Container>
      <HeaderContainer>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </BackButton>
        <HeaderTitle>Notificações</HeaderTitle>
      </HeaderContainer>

      <ListContainer>
        {loading ? (
          <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>Nenhuma notificação recebida.</Text>}
          />
        )}
      </ListContainer>
    </Container>
  );
}
