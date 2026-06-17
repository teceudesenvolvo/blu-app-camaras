import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import {
  PortalBackground,
  PortalCard,
} from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';
import { portalGradients, portalTheme } from '../styles/portalTheme';

const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Container = styled(PortalBackground)`
  flex: 1;
`;

const Scroll = styled.ScrollView`
  flex: 1;
`;

const Cover = styled(LinearGradient).attrs({
  colors: portalGradients.primary,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
})`
  padding: 64px 20px 72px;
  border-bottom-left-radius: 28px;
  border-bottom-right-radius: 28px;
`;

const HeaderActions = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
`;

const HeaderButton = styled.TouchableOpacity`
  min-height: 38px;
  padding: 0 13px;
  border-radius: 999px;
  background-color: rgba(255,255,255,0.18);
  border-width: 1px;
  border-color: rgba(255,255,255,0.35);
  align-items: center;
  justify-content: center;
  margin-left: 8px;
`;

const HeaderButtonText = styled.Text`
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
`;

const ProfileCard = styled(PortalCard)`
  margin: -56px 18px 14px;
  align-items: center;
`;

const AvatarButton = styled.TouchableOpacity`
  margin-top: -58px;
  margin-bottom: 12px;
`;

const AvatarBox = styled.View`
  width: 108px;
  height: 108px;
  border-radius: 54px;
  border-width: 4px;
  border-color: #ffffff;
  background-color: #ffffff;
  justify-content: center;
  align-items: center;
  shadow-color: #0f172a;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.18;
  shadow-radius: 18px;
  elevation: 6;
`;

const AvatarImage = styled.Image`
  width: 96px;
  height: 96px;
  border-radius: 48px;
`;

const EditIconCircle = styled.View`
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${portalTheme.secondary};
  justify-content: center;
  align-items: center;
  border-width: 2px;
  border-color: #ffffff;
`;

const ProfileName = styled.Text`
  font-size: 23px;
  font-weight: 900;
  color: ${portalTheme.text};
  text-align: center;
`;

const ProfileEmail = styled.Text`
  margin-top: 4px;
  color: ${portalTheme.muted};
  font-size: 13px;
  font-weight: 700;
  text-align: center;
`;

const RolePill = styled.View`
  margin-top: 10px;
  padding: 7px 12px;
  border-radius: 999px;
  background-color: rgba(2, 90, 161, 0.09);
`;

const RoleText = styled.Text`
  color: ${portalTheme.primary};
  font-size: 12px;
  font-weight: 900;
`;

const StatsRow = styled.View`
  flex-direction: row;
  width: 100%;
  margin-top: 18px;
`;

const StatBox = styled.TouchableOpacity`
  flex: 1;
  align-items: center;
  padding: 12px 6px;
  border-radius: 14px;
  background-color: #f8fafc;
  margin: 0 4px;
`;

const StatNumber = styled.Text`
  color: ${portalTheme.text};
  font-size: 20px;
  font-weight: 900;
`;

const StatLabel = styled.Text`
  color: ${portalTheme.muted};
  font-size: 11px;
  font-weight: 800;
  margin-top: 3px;
  text-align: center;
`;

const Section = styled.View`
  padding: 0 18px 14px;
`;

const SectionTitle = styled.Text`
  color: ${portalTheme.text};
  font-size: 18px;
  font-weight: 900;
  margin: 12px 0;
`;

const TimelineCard = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-radius: 14px;
  border-width: 1px;
  border-color: ${portalTheme.border};
  padding: 13px;
  margin-bottom: 10px;
`;

const TimelineIcon = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.bg || 'rgba(2, 90, 161, 0.1)'};
  margin-right: 12px;
`;

const TimelineInfo = styled.View`
  flex: 1;
`;

const TimelineTitle = styled.Text`
  color: ${portalTheme.text};
  font-size: 14px;
  line-height: 18px;
  font-weight: 900;
`;

const TimelineMeta = styled.Text`
  color: ${portalTheme.muted};
  font-size: 12px;
  font-weight: 700;
  margin-top: 4px;
`;

const StatusPill = styled.View`
  padding: 5px 8px;
  border-radius: 999px;
  background-color: ${props => props.bg || 'rgba(2, 90, 161, 0.1)'};
`;

const StatusText = styled.Text`
  color: ${props => props.color || portalTheme.primary};
  font-size: 10px;
  font-weight: 900;
`;

const ProfileActions = styled.View`
  width: 100%;
  margin-top: 16px;
`;

const ProfileAction = styled.TouchableOpacity`
  min-height: 52px;
  border-radius: 14px;
  border-width: 1px;
  border-color: ${portalTheme.border};
  background-color: #f8fafc;
  flex-direction: row;
  align-items: center;
  padding: 0 13px;
  margin-top: 9px;
`;

const ProfileActionIcon = styled.View`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.bg || 'rgba(2, 90, 161, 0.1)'};
  margin-right: 10px;
`;

const ProfileActionTextGroup = styled.View`
  flex: 1;
`;

const ProfileActionTitle = styled.Text`
  color: ${portalTheme.text};
  font-size: 14px;
  font-weight: 900;
`;

const ProfileActionSubtitle = styled.Text`
  color: ${portalTheme.muted};
  font-size: 12px;
  font-weight: 700;
  margin-top: 2px;
`;

const COLLECTIONS = [
  { key: 'balcao-cidadao', label: 'Balcão', icon: 'card-account-details-outline', color: portalTheme.primary, bg: 'rgba(2, 90, 161, 0.1)' },
  { key: 'ouvidoria', label: 'Ouvidoria', icon: 'bullhorn-outline', color: '#0f766e', bg: 'rgba(15, 118, 110, 0.1)' },
  { key: 'procuradoria-mulher', label: 'Mulher', icon: 'gender-female', color: '#db2777', bg: 'rgba(219, 39, 119, 0.1)' },
];

function normalizeDate(item) {
  return item.createdAt?.toMillis?.() ||
    item.dataManifestacao?.toMillis?.() ||
    item.updatedAt?.toMillis?.() ||
    item.createdAt ||
    item.dataManifestacao ||
    0;
}

function formatDate(value) {
  const timestamp = typeof value === 'number' ? value : new Date(value).getTime();
  if (!timestamp || Number.isNaN(timestamp)) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(timestamp));
}

function getStatusInfo(status) {
  switch (status) {
    case 'Concluído':
    case 'Agendado':
      return { label: status, color: '#0f766e', bg: 'rgba(15, 118, 110, 0.1)' };
    case 'Cancelado':
      return { label: 'Cancelado', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' };
    case 'Pendente':
    case 'Recebida':
      return { label: status, color: portalTheme.primary, bg: 'rgba(2, 90, 161, 0.1)' };
    default:
      return { label: status || 'Aguardando', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' };
  }
}

function getRequestTitle(item) {
  return item.tipoServico || item.tipoManifestacao || item.assunto || item.serviceName || item.description || 'Solicitação';
}

export default function PerfilScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [form, setForm] = useState({});
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!user) return undefined;

    const unsubscribe = onSnapshot(doc(firestore, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserData(data);
        setForm(data);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const latestByCollection = {};

    const applyRequests = () => {
      const combined = Object.values(latestByCollection)
        .flat()
        .sort((a, b) => b.sortDate - a.sortDate);

      setRequests(combined);
    };

    const unsubscribes = COLLECTIONS.map((source) => {
      const requestsQuery = query(
        collection(firestore, source.key),
        where('userId', '==', user.uid),
      );

      return onSnapshot(
        requestsQuery,
        (snapshot) => {
          latestByCollection[source.key] = snapshot.docs
            .map((docSnap) => {
              const data = docSnap.data();
              return {
                ...data,
                id: docSnap.id,
                originCollection: source.key,
                sourceLabel: source.label,
                sourceIcon: source.icon,
                sourceColor: source.color,
                sourceBg: source.bg,
                sortDate: normalizeDate(data),
              };
            })
            .filter((item) => item.flavorId === flavorId || !item.flavorId);

          applyRequests();
        },
        (error) => {
          console.error(`Erro ao carregar atendimentos de ${source.key}:`, error);
        },
      );
    });

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [user]);

  const stats = useMemo(() => {
    const total = requests.length;
    const byKey = requests.reduce((acc, item) => {
      acc[item.originCollection] = (acc[item.originCollection] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      balcao: byKey['balcao-cidadao'] || 0,
      ouvidoria: byKey.ouvidoria || 0,
      procuradoria: byKey['procuradoria-mulher'] || 0,
    };
  }, [requests]);

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: logout, style: 'destructive' },
    ]);
  };

  const openRequest = (item) => {
    let destination = 'BalcaoDetalhe';
    if (item.originCollection === 'ouvidoria') destination = 'OuvidoriaDetalhe';
    if (item.originCollection === 'procuradoria-mulher') destination = 'ProcuradoriaDetalhe';

    navigation.navigate(destination, { item });
  };

  const avatarSource = form.avatarUri
    ? { uri: form.avatarUri }
    : form.avatarBase64
      ? { uri: form.avatarBase64 }
      : userData?.avatarBase64
        ? { uri: userData.avatarBase64 }
        : require('../../assets/logo.png');

  const visibleRequests = requests.slice(0, 5);

  return (
    <Container>
      <Scroll showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <Cover>
          <HeaderActions>
            <HeaderButton onPress={handleLogout}>
              <HeaderButtonText>Sair</HeaderButtonText>
            </HeaderButton>
          </HeaderActions>
        </Cover>

        <ProfileCard>
          <AvatarButton activeOpacity={0.75} onPress={() => navigation.navigate('PerfilDadosPessoais')}>
            <AvatarBox>
              <AvatarImage source={avatarSource} />
            </AvatarBox>
            <EditIconCircle>
              <MaterialCommunityIcons name="account-edit-outline" size={17} color="#fff" />
            </EditIconCircle>
          </AvatarButton>

          <ProfileName>{userData?.name || user?.displayName || 'Usuário'}</ProfileName>
          <ProfileEmail>{user?.email || userData?.email || 'Email não informado'}</ProfileEmail>
          <RolePill>
            <RoleText>{form.tipo || userData?.tipo || 'Cidadão'}</RoleText>
          </RolePill>

          <StatsRow>
            <StatBox onPress={() => navigation.navigate('MeusAtendimentos', { source: 'balcao-cidadao' })}>
              <StatNumber>{stats.balcao}</StatNumber>
              <StatLabel>Balcão</StatLabel>
            </StatBox>
            <StatBox onPress={() => navigation.navigate('MeusAtendimentos', { source: 'ouvidoria' })}>
              <StatNumber>{stats.ouvidoria}</StatNumber>
              <StatLabel>Ouvidoria</StatLabel>
            </StatBox>
            <StatBox onPress={() => navigation.navigate('MeusAtendimentos', { source: 'procuradoria-mulher' })}>
              <StatNumber>{stats.procuradoria}</StatNumber>
              <StatLabel>Mulher</StatLabel>
            </StatBox>
            <StatBox>
              <StatNumber>{stats.total}</StatNumber>
              <StatLabel>Total</StatLabel>
            </StatBox>
          </StatsRow>

          <ProfileActions>
            <ProfileAction activeOpacity={0.78} onPress={() => navigation.navigate('PerfilDadosPessoais')}>
              <ProfileActionIcon>
                <Ionicons name="person-outline" size={19} color={portalTheme.primary} />
              </ProfileActionIcon>
              <ProfileActionTextGroup>
                <ProfileActionTitle>Dados pessoais</ProfileActionTitle>
                <ProfileActionSubtitle>Cadastro, endereço e foto de perfil</ProfileActionSubtitle>
              </ProfileActionTextGroup>
              <Ionicons name="chevron-forward" size={20} color={portalTheme.muted} />
            </ProfileAction>

            <ProfileAction activeOpacity={0.78} onPress={() => navigation.navigate('PerfilBeneficiarios')}>
              <ProfileActionIcon bg="rgba(15, 118, 110, 0.1)">
                <MaterialCommunityIcons name="account-heart-outline" size={20} color="#0f766e" />
              </ProfileActionIcon>
              <ProfileActionTextGroup>
                <ProfileActionTitle>Beneficiários</ProfileActionTitle>
                <ProfileActionSubtitle>Pessoas vinculadas ao Balcão</ProfileActionSubtitle>
              </ProfileActionTextGroup>
              <Ionicons name="chevron-forward" size={20} color={portalTheme.muted} />
            </ProfileAction>

            <ProfileAction activeOpacity={0.78} onPress={() => navigation.navigate('PerfilSeguranca')}>
              <ProfileActionIcon bg="rgba(124, 58, 237, 0.1)">
                <Ionicons name="shield-checkmark-outline" size={19} color="#7c3aed" />
              </ProfileActionIcon>
              <ProfileActionTextGroup>
                <ProfileActionTitle>Segurança</ProfileActionTitle>
                <ProfileActionSubtitle>Senha e atividades de login</ProfileActionSubtitle>
              </ProfileActionTextGroup>
              <Ionicons name="chevron-forward" size={20} color={portalTheme.muted} />
            </ProfileAction>
          </ProfileActions>
        </ProfileCard>

        <Section>
          <SectionTitle>Atendimentos recentes</SectionTitle>
          {visibleRequests.length === 0 ? (
            <PortalCard>
              <TimelineMeta>Você ainda não possui atendimentos registrados.</TimelineMeta>
            </PortalCard>
          ) : (
            visibleRequests.map((item) => {
              const status = getStatusInfo(item.status);

              return (
                <TimelineCard key={`${item.originCollection}-${item.id}`} activeOpacity={0.78} onPress={() => openRequest(item)}>
                  <TimelineIcon bg={item.sourceBg}>
                    <MaterialCommunityIcons name={item.sourceIcon} size={22} color={item.sourceColor} />
                  </TimelineIcon>
                  <TimelineInfo>
                    <TimelineTitle numberOfLines={2}>{getRequestTitle(item)}</TimelineTitle>
                    <TimelineMeta>{item.sourceLabel} • {formatDate(item.sortDate)}</TimelineMeta>
                  </TimelineInfo>
                  <StatusPill bg={status.bg}>
                    <StatusText color={status.color}>{status.label}</StatusText>
                  </StatusPill>
                </TimelineCard>
              );
            })
          )}
        </Section>

      </Scroll>
    </Container>
  );
}
