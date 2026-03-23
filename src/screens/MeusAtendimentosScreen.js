import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import Constants from 'expo-constants';
import { getDatabase, ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import app from '../../services/firebaseConfig';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const backgroundColor = Constants.expoConfig?.extra?.theme?.background || '#f0f2f5';
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Container = styled.View`
  flex: 1;
  background-color: ${backgroundColor};
`;

const Header = styled.View`
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
  padding: 20px;
`;

const RequestCard = styled.View`
  background-color: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
  flex-direction: row;
  align-items: center;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
  elevation: 2;
  border-left-width: 4px;
  border-left-color: ${props => props.statusColor || primaryColor};
`;

const IconWrapper = styled.View`
  width: 45px;
  height: 45px;
  border-radius: 22.5px;
  background-color: ${props => props.bgColor || primaryColor + '15'};
  justify-content: center;
  align-items: center;
  margin-right: 15px;
`;

const InfoSection = styled.View`
  flex: 1;
`;

const RequestTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
`;

const RequestDate = styled.Text`
  font-size: 12px;
  color: #888;
  margin-bottom: 2px;
`;

const StatusTag = styled.View`
  background-color: ${props => props.bgColor || '#e0e0e0'};
  padding: 4px 8px;
  border-radius: 4px;
  align-self: flex-start;
  margin-top: 5px;
`;

const StatusText = styled.Text`
  font-size: 10px;
  font-weight: bold;
  color: ${props => props.textColor || '#666'};
  text-transform: uppercase;
`;

export default function MeusAtendimentosScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const { source } = route.params || {};

  useEffect(() => {
    if (!user) return;

    let basePath = 'solicitacoes'; // Rota padrão
    if (source === 'balcao-cidadao') {
      basePath = 'balcao-cidadao';
    } else if (source === 'ouvidoria') {
      basePath = 'ouvidoria';
    } else if (source === 'procuradoria-mulher') {
      basePath = 'procuradoria-mulher';
    }

    const refPath = `${flavorId}/${basePath}`;
    const db = getDatabase(app);
    const requestsQuery = query(
      ref(db, refPath),
      orderByChild('userId'),
      equalTo(user.uid)
    );

    const unsubscribe = onValue(
      requestsQuery,
      (snapshot) => {
        const data = [];
        if (snapshot.exists()) {
          snapshot.forEach(childSnapshot => {
            data.push({
              ...childSnapshot.val(),
              id: childSnapshot.key,
            });
          });
        }
        // RTDB doesn't sort by createdAt on server effectively with orderByChild on another field
        // So we sort locally for 'desc' order
        data.sort((a, b) => (b.dataManifestacao || b.createdAt || 0) - (a.dataManifestacao || a.createdAt || 0));

        setRequests(data);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, source]);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'Concluído': return { color: '#2e7d32', label: 'Concluído' };
      case 'Pendente': return { color: '#f9c204', label: 'Em Análise' };
      case 'Recebida': return { color: '#004a99', label: 'Recebida' };
      case 'Cancelado': return { color: '#dc2626', label: 'Cancelado' };
      default: return { color: '#a21caf', label: status || 'Aguardando' };
    }
  };

  const getIcon = (tipo) => {
    if (tipo?.includes('Procuradoria')) return 'gender-female';
    if (tipo?.includes('Balcão')) return 'card-account-details-outline';
    return 'message-text-outline';
  };

  const renderItem = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    const timestamp = item.dataManifestacao || item.createdAt;
    const dateStr = timestamp ? new Date(timestamp).toLocaleString('pt-BR') : 'Recentemente';
    
    // Se for Ouvidoria ou Procuradoria, o título principal é o Assunto
    const isOuvidoria = source === 'ouvidoria' || item.source === 'ouvidoria' || item.dadosManifestacao !== undefined;
    const isProcuradoria = source === 'procuradoria-mulher' || item.source === 'procuradoria-mulher' || item.dadosSolicitacao !== undefined;

    const titleDisplay = item.dadosManifestacao?.assunto || item.dadosSolicitacao?.assunto || item.tipo || 'Atendimento';
    const subTypeDisplay = item.dadosManifestacao?.tipoManifestacao || item.dadosSolicitacao?.tipoAtendimento || '';

    const handlePress = () => {
      let destination = 'BalcaoDetalhe';
      if (isOuvidoria) destination = 'OuvidoriaDetalhe';
      if (isProcuradoria) destination = 'ProcuradoriaDetalhe';
      
      navigation.navigate(destination, { item });
    };

    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <RequestCard statusColor={statusInfo.color}>
          <IconWrapper bgColor={statusInfo.color + '15'}>
            <MaterialCommunityIcons name={getIcon(subTypeDisplay || titleDisplay)} size={24} color={statusInfo.color} />
          </IconWrapper>
          <InfoSection>
            <RequestTitle numberOfLines={1}>{titleDisplay}</RequestTitle>
            {subTypeDisplay ? <Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{subTypeDisplay}</Text> : null}
            <RequestDate>{dateStr}</RequestDate>
            <StatusTag bgColor={statusInfo.color + '20'}>
              <StatusText textColor={statusInfo.color}>{statusInfo.label}</StatusText>
            </StatusTag>
          </InfoSection>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </RequestCard>
      </TouchableOpacity>
    );
  };

  return (
    <Container>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </BackButton>
        <HeaderTitle>Meus Atendimentos</HeaderTitle>
      </Header>

      <ListContainer>
        {loading ? (
          <ActivityIndicator size="large" color={primaryColor} />
        ) : (
          <FlatList
            data={requests}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }}>
                <Text style={{ color: '#888' }}>Nenhum atendimento encontrado.</Text>
              </View>
            }
          />
        )}
      </ListContainer>
    </Container>
  );
}
