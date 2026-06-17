import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { collection, doc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import {
  PortalBackground,
  PortalHeader,
  PortalHeaderRow,
  PortalBackButton,
  PortalTitle,
  PortalTitleGroup,
  PortalSubtitle,
} from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';
import { portalTheme } from '../styles/portalTheme';

const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Container = styled(PortalBackground)`
  flex: 1;
`;

const HeaderBadge = styled.View`
  width: 42px;
  height: 42px;
  border-radius: 21px;
  align-items: center;
  justify-content: center;
  background-color: rgba(2, 90, 161, 0.1);
  margin-right: 12px;
`;

const NotificationCard = styled.TouchableOpacity`
  background-color: ${portalTheme.card};
  border-radius: 14px;
  border-width: 1px;
  margin-bottom: 12px;
  padding: 15px;
  border-color: ${props => props.unread ? portalTheme.primary : portalTheme.border};
  shadow-color: #0f172a;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.08;
  shadow-radius: 18px;
  elevation: 3;
`;

const CardRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
`;

const CardIcon = styled.View`
  width: 42px;
  height: 42px;
  border-radius: 21px;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.bg || 'rgba(2, 90, 161, 0.1)'};
  margin-right: 12px;
`;

const CardBody = styled.View`
  flex: 1;
`;

const NotificationTitle = styled.Text`
  font-size: 15px;
  line-height: 19px;
  font-weight: 900;
  color: ${portalTheme.text};
  margin-bottom: 5px;
`;

const NotificationDesc = styled.Text`
  font-size: 13px;
  color: ${portalTheme.muted};
  line-height: 19px;
  margin-bottom: 10px;
`;

const NotificationDate = styled.Text`
  font-size: 12px;
  color: ${portalTheme.subtle};
  font-weight: 700;
`;

const EmptyState = styled.View`
  align-items: center;
  padding: 46px 22px;
`;

const EmptyText = styled.Text`
  margin-top: 12px;
  color: ${portalTheme.muted};
  font-size: 14px;
  font-weight: 800;
  text-align: center;
`;

const getNotificationRoute = (notification = {}) => {
  const data = notification.data || {};

  if (data.screen === 'TvCamara') {
    return {
      name: 'TvCamara',
      params: { videoId: data.videoId },
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

function getNotificationIcon(notification) {
  const data = notification.data || {};

  if (data.screen === 'TvCamara') {
    return { icon: 'television-play', color: '#0f172a', bg: 'rgba(15, 23, 42, 0.1)' };
  }

  if (data.screen === 'NoticiaDetalhe' || data.type === 'news') {
    return { icon: 'newspaper-variant-outline', color: portalTheme.primary, bg: 'rgba(2, 90, 161, 0.1)' };
  }

  if (data.collection === 'procuradoria-mulher' || data.source === 'procuradoria-mulher') {
    return { icon: 'gender-female', color: '#db2777', bg: 'rgba(219, 39, 119, 0.1)' };
  }

  if (data.collection === 'ouvidoria' || data.source === 'ouvidoria') {
    return { icon: 'bullhorn-outline', color: '#0f766e', bg: 'rgba(15, 118, 110, 0.1)' };
  }

  return { icon: 'message-text-outline', color: portalTheme.primary, bg: 'rgba(2, 90, 161, 0.1)' };
}

export default function NotificacoesScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const isTabScreen = route?.name === 'Mensagens';

  useEffect(() => {
    if (!user) return undefined;

    const q = query(
      collection(firestore, 'notifications'),
      where('flavorId', '==', flavorId),
      where('userId', '==', user.uid),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = [];
      const batch = writeBatch(firestore);
      let hasUpdates = false;
      const userEmail = user?.email ? String(user.email).toLowerCase() : '';

      snapshot.forEach((docSnap) => {
        const notification = docSnap.data();
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
            createdAt,
            unread: !isRead,
          });

          if (!isRead && docSnap.id) {
            const notifRef = doc(firestore, 'notifications', docSnap.id);
            batch.update(notifRef, { read: true, isRead: true });
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates) {
        try {
          batch.commit().catch(err => console.error('Erro ao atualizar status de leitura:', err));
        } catch (err) {
          console.error('Erro ao atualizar status de leitura:', err);
        }
      }

      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifications(data);
      setLoading(false);
    }, (error) => {
      console.error('Erro no listener de notificações:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = useMemo(() => notifications.filter((item) => item.unread).length, [notifications]);

  const handleNotificationPress = (notification) => {
    const targetRoute = getNotificationRoute(notification);

    if (targetRoute) {
      navigation.navigate(targetRoute.name, targetRoute.params);
    }
  };

  const renderItem = ({ item }) => {
    const targetRoute = getNotificationRoute(item);
    const icon = getNotificationIcon(item);

    return (
      <NotificationCard
        unread={item.unread}
        activeOpacity={targetRoute ? 0.76 : 1}
        onPress={() => handleNotificationPress(item)}
        disabled={!targetRoute}
      >
        <CardRow>
          <CardIcon bg={icon.bg}>
            <MaterialCommunityIcons name={icon.icon} size={22} color={icon.color} />
          </CardIcon>
          <CardBody>
            <NotificationTitle>{item.tituloNotification || 'Mensagem'}</NotificationTitle>
            <NotificationDesc>{item.descricaoNotification || 'Você recebeu uma nova mensagem.'}</NotificationDesc>
            <NotificationDate>
              {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : ''}
            </NotificationDate>
          </CardBody>
        </CardRow>
      </NotificationCard>
    );
  };

  return (
    <Container>
      <PortalHeader compact>
        <PortalHeaderRow>
          {isTabScreen ? (
            <HeaderBadge>
              <Ionicons name="chatbubbles-outline" size={22} color={portalTheme.primary} />
            </HeaderBadge>
          ) : (
            <PortalBackButton onPress={() => navigation.goBack()} activeOpacity={0.75}>
              <Ionicons name="arrow-back" size={22} color={portalTheme.primary} />
            </PortalBackButton>
          )}
          <PortalTitleGroup>
            <PortalTitle>{isTabScreen ? 'Mensagens' : 'Notificações'}</PortalTitle>
            <PortalSubtitle>
              {unreadCount > 0
                ? `${unreadCount} mensagem${unreadCount > 1 ? 's' : ''} nova${unreadCount > 1 ? 's' : ''}.`
                : 'Acompanhe atualizações, retornos e avisos importantes.'}
            </PortalSubtitle>
          </PortalTitleGroup>
        </PortalHeaderRow>
      </PortalHeader>

      {loading ? (
        <ActivityIndicator size="large" color={portalTheme.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 18, paddingBottom: isTabScreen ? 124 : 42 }}
          ListEmptyComponent={
            <EmptyState>
              <MaterialCommunityIcons name="message-text-outline" size={38} color={portalTheme.primary} />
              <EmptyText>Nenhuma mensagem recebida até o momento.</EmptyText>
            </EmptyState>
          }
        />
      )}
    </Container>
  );
}
