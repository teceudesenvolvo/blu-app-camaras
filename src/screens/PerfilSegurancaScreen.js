import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { EmailAuthProvider, getAuth, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import app, { firestore, functions } from '../../services/firebaseConfig';
import {
  PortalBackground,
  PortalCard,
  PortalInput,
  PortalScreenHeader,
} from '../components/PortalScaffold';
import { AuthContext } from '../context/AuthContext';
import { portalTheme } from '../styles/portalTheme';

const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Scroll = styled.ScrollView`
  flex: 1;
`;

const Content = styled.View`
  padding: 18px 18px 120px;
`;

const SectionTitle = styled.Text`
  color: ${portalTheme.text};
  font-size: 18px;
  font-weight: 900;
  margin: 18px 0 12px;
`;

const Field = styled.View`
  margin-bottom: 14px;
`;

const Label = styled.Text`
  color: ${portalTheme.text};
  font-size: 13px;
  font-weight: 900;
  margin-bottom: 7px;
`;

const PasswordInputWrapper = styled.View`
  position: relative;
`;

const SaveButton = styled.TouchableOpacity`
  min-height: 52px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  background-color: ${portalTheme.primary};
  margin-top: 8px;
  opacity: ${props => props.disabled ? 0.72 : 1};
`;

const SaveText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
`;

const OutlineButton = styled.TouchableOpacity`
  min-height: 50px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-color: rgba(220, 38, 38, 0.24);
  background-color: #fff1f2;
  margin-bottom: 14px;
  opacity: ${props => props.disabled ? 0.72 : 1};
`;

const OutlineButtonText = styled.Text`
  color: #dc2626;
  font-size: 14px;
  font-weight: 900;
`;

const HelperText = styled.Text`
  color: ${portalTheme.muted};
  font-size: 12px;
  line-height: 18px;
  font-weight: 700;
  margin-bottom: 14px;
`;

const ActivityCard = styled(PortalCard)`
  margin-bottom: 10px;
`;

const ActivityRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const DeviceIcon = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  align-items: center;
  justify-content: center;
  background-color: rgba(2, 90, 161, 0.1);
  margin-right: 12px;
`;

const ActivityInfo = styled.View`
  flex: 1;
`;

const ActivityTitle = styled.Text`
  color: ${portalTheme.text};
  font-size: 14px;
  font-weight: 900;
`;

const ActivityMeta = styled.Text`
  color: ${portalTheme.muted};
  font-size: 12px;
  font-weight: 700;
  margin-top: 4px;
`;

const RevokedBadge = styled.Text`
  align-self: flex-start;
  color: #b91c1c;
  background-color: #fee2e2;
  border-radius: 999px;
  overflow: hidden;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 900;
  margin-top: 8px;
`;

const EmptyText = styled.Text`
  color: ${portalTheme.muted};
  font-size: 13px;
  font-weight: 700;
  line-height: 19px;
`;

function formatDate(value) {
  const timestamp = value?.toMillis?.() || value || 0;
  if (!timestamp) return 'Data não informada';
  return new Date(timestamp).toLocaleString('pt-BR');
}

export default function PerfilSegurancaScreen({ navigation }) {
  const { user, currentLoginActivityId } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    if (!user) return undefined;

    const q = query(
      collection(firestore, 'login-activities'),
      where('userId', '==', user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
          .filter(item => item.flavorId === flavorId || !item.flavorId)
          .sort((a, b) => (b.createdAt?.toMillis?.() || b.createdAt || 0) - (a.createdAt?.toMillis?.() || a.createdAt || 0));

        setActivities(data.slice(0, 20));
        setLoadingActivities(false);
      },
      (error) => {
        console.error('Erro ao carregar atividades de login:', error);
        setLoadingActivities(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Erro', 'As novas senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setPasswordLoading(true);
    const auth = getAuth(app);
    const currentUser = auth.currentUser;

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      Alert.alert('Sucesso', 'Senha alterada com sucesso.');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      let msg = 'Erro ao alterar a senha. Verifique sua senha atual.';
      if (error.code === 'auth/wrong-password') msg = 'Senha atual incorreta.';
      Alert.alert('Erro', msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogoutOtherDevices = () => {
    Alert.alert(
      'Encerrar outros dispositivos?',
      'As outras sessões serão revogadas e precisarão fazer login novamente. Este aparelho continuará como sessão principal.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            setLogoutLoading(true);
            try {
              const logoutOtherDevices = httpsCallable(functions, 'logoutOtherDevices');
              await logoutOtherDevices({ currentActivityId: currentLoginActivityId });
              Alert.alert('Pronto', 'As outras sessões foram encerradas.');
            } catch (error) {
              console.error('Erro ao encerrar outros dispositivos:', error);
              Alert.alert('Erro', 'Não foi possível encerrar as outras sessões agora.');
            } finally {
              setLogoutLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <PortalBackground>
      <PortalScreenHeader
        navigation={navigation}
        title="Segurança"
        subtitle="Gerencie sua senha e acompanhe atividades recentes de login."
      />

      <Scroll showsVerticalScrollIndicator={false}>
        <Content>
          <PortalCard>
            <SectionTitle style={{ marginTop: 0 }}>Alterar senha</SectionTitle>

            <Field>
              <Label>Senha atual</Label>
              <PasswordInputWrapper>
                <PortalInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrent}
                  placeholder="Digite a senha atual"
                  style={{ paddingRight: 50 }}
                />
                <TouchableOpacity style={{ position: 'absolute', right: 15, top: 14 }} onPress={() => setShowCurrent(!showCurrent)}>
                  <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={22} color={portalTheme.muted} />
                </TouchableOpacity>
              </PasswordInputWrapper>
            </Field>

            <Field>
              <Label>Nova senha</Label>
              <PasswordInputWrapper>
                <PortalInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  placeholder="Mín. 6 caracteres"
                  style={{ paddingRight: 50 }}
                />
                <TouchableOpacity style={{ position: 'absolute', right: 15, top: 14 }} onPress={() => setShowNew(!showNew)}>
                  <Ionicons name={showNew ? 'eye-off' : 'eye'} size={22} color={portalTheme.muted} />
                </TouchableOpacity>
              </PasswordInputWrapper>
            </Field>

            <Field>
              <Label>Confirmar nova senha</Label>
              <PasswordInputWrapper>
                <PortalInput
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry={!showConfirm}
                  placeholder="Repita a nova senha"
                  style={{ paddingRight: 50 }}
                />
                <TouchableOpacity style={{ position: 'absolute', right: 15, top: 14 }} onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={22} color={portalTheme.muted} />
                </TouchableOpacity>
              </PasswordInputWrapper>
            </Field>

            <SaveButton onPress={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? <ActivityIndicator color="#fff" /> : <SaveText>Salvar nova senha</SaveText>}
            </SaveButton>
          </PortalCard>

          <SectionTitle>Atividades de login</SectionTitle>
          <OutlineButton onPress={handleLogoutOtherDevices} disabled={logoutLoading}>
            {logoutLoading ? <ActivityIndicator color="#dc2626" /> : <OutlineButtonText>Encerrar outros dispositivos</OutlineButtonText>}
          </OutlineButton>
          <HelperText>
            Use esta opção se não reconhecer algum acesso. As sessões encerradas aparecerão marcadas na lista.
          </HelperText>
          {loadingActivities ? (
            <ActivityIndicator color={portalTheme.primary} />
          ) : activities.length === 0 ? (
            <PortalCard>
              <EmptyText>As atividades de login aparecerão aqui a partir dos próximos acessos.</EmptyText>
            </PortalCard>
          ) : (
            activities.map((activity) => (
              <ActivityCard key={activity.id}>
                <ActivityRow>
                  <DeviceIcon>
                    <MaterialCommunityIcons name={activity.platform === 'ios' ? 'cellphone' : 'monitor-cellphone'} size={22} color={portalTheme.primary} />
                  </DeviceIcon>
                  <ActivityInfo>
                    <ActivityTitle>{activity.deviceName || activity.modelName || 'Dispositivo'}</ActivityTitle>
                    <ActivityMeta>{activity.platform || 'plataforma'} • {formatDate(activity.createdAt)}</ActivityMeta>
                    {activity.appVersion ? <ActivityMeta>Versão do app: {activity.appVersion}</ActivityMeta> : null}
                    {activity.revoked ? <RevokedBadge>Sessão encerrada</RevokedBadge> : null}
                  </ActivityInfo>
                </ActivityRow>
              </ActivityCard>
            ))
          )}
        </Content>
      </Scroll>
    </PortalBackground>
  );
}
