import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import app from '../../services/firebaseConfig';
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

export default function NotificacoesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const db = getDatabase(app);
    const notificationsRef = ref(db, `${flavorId}/notifications`);

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = [];
      if (snapshot.exists()) {
        const updates = {};
        snapshot.forEach((child) => {
          const notification = child.val();
          
          // Filtra por userId ou userEmail
          const isTargetUser = notification.userId === user.uid || 
              (notification.userEmail && String(notification.userEmail).toLowerCase() === String(user.email).toLowerCase());

          if (isTargetUser) {
            data.push({
              id: child.key,
              ...notification
            });

            // Se ainda não foi lida, prepara para marcar como lida
            if (notification.read !== true) {
              updates[`${flavorId}/notifications/${child.key}/read`] = true;
            }
          }
        });

        // Executa as atualizações de leitura em massa, se houver
        if (Object.keys(updates).length > 0) {
          update(ref(db), updates);
        }

        // Ordena por data (mais recente primeiro)
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const renderItem = ({ item }) => (
    <NotificationCard activeOpacity={0.7}>
      <NotificationTitle>{item.tituloNotification}</NotificationTitle>
      <NotificationDesc>{item.descricaoNotification}</NotificationDesc>
      <NotificationDate>
        {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : ''}
      </NotificationDate>
    </NotificationCard>
  );

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
