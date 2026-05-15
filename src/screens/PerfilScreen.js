import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text } from 'react-native';
import styled from 'styled-components/native';
import { AuthContext } from '../context/AuthContext';

// ✅ Firebase Web
import { Ionicons } from '@expo/vector-icons';
import { EmailAuthProvider, getAuth, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Modal, TouchableOpacity } from 'react-native';
import app, { firestore } from '../../services/firebaseConfig';
import { uploadFileToStorage } from '../../services/storageService';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const secondaryColor = Constants.expoConfig?.extra?.theme?.secondary || '#f9c204';
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Container = styled.View`
  flex: 1;
  background-color: #fdfdfd;
  margin-bottom: 100px;
`;

const Header = styled.View`
  padding: 20px;
  padding-top: 60px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
`;

const HeaderAction = styled.TouchableOpacity``;

const HeaderActionText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.color || primaryColor};
`;

const ProfileSection = styled.View`
  align-items: center;
  padding: 20px;
  background-color: #fff;
  border-bottom-width: 1px;
  border-bottom-color: #f0f0f0;
`;

const AvatarWrapper = styled.View`
  margin-bottom: 15px;
`;

const AvatarBox = styled.View`
  width: 100px;
  height: 100px;
  border-radius: 50px;
  border-width: 3px;
  border-color: ${primaryColor};
  justify-content: center;
  align-items: center;
`;

const AvatarImage = styled.Image`
  width: 90px;
  height: 90px;
  border-radius: 45px;
`;

const EditIconCircle = styled.View`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 30px;
  height: 30px;
  border-radius: 15px;
  background-color: ${secondaryColor};
  justify-content: center;
  align-items: center;
  border-width: 2px;
  border-color: #fff;
`;

const ProfileName = styled.Text`
  font-size: 22px;
  font-weight: bold;
  color: #333;
`;

const InfoList = styled.ScrollView`
  flex: 1;
  padding: 20px;
`;

const InfoField = styled.View`
  margin-bottom: 20px;
  border-bottom-width: 1px;
  border-bottom-color: #eee;
  padding-bottom: 10px;
`;

const Label = styled.Text`
  font-size: 13px;
  color: #777;
  margin-bottom: 5px;
  font-weight: 500;
`;

const Value = styled.Text`
  font-size: 16px;
  color: #333;
  font-weight: 600;
`;

const EditableInput = styled.TextInput`
  font-size: 16px;
  color: #333;
  font-weight: 600;
  border-bottom-width: 1px;
  border-bottom-color: ${primaryColor};
  padding-bottom: 4px;
`;

const ChangePasswordButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border-width: 1px;
  border-color: ${primaryColor};
  padding: 12px;
  border-radius: 8px;
  margin-top: 15px;
`;

const ChangePasswordText = styled.Text`
  color: ${primaryColor};
  font-weight: 700;
  margin-left: 10px;
`;

const ModalContainer = styled.View`
  flex: 1;
  background-color: rgba(0,0,0,0.5);
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled.View`
  background-color: #fff;
  border-radius: 20px;
  padding: 30px;
`;

const ModalTitle = styled.Text`
  font-size: 20px;
  font-weight: 800;
  color: #333;
  margin-bottom: 20px;
  text-align: center;
`;

const PasswordInputWrapper = styled.View`
  position: relative;
  margin-bottom: 15px;
`;

const ModalInput = styled.TextInput`
  background-color: #f5f5f5;
  border-radius: 12px;
  padding: 15px;
  font-size: 16px;
  color: #333;
`;

const SavePasswordButton = styled.TouchableOpacity`
  background-color: ${primaryColor};
  border-radius: 12px;
  padding: 15px;
  align-items: center;
  margin-top: 20px;
`;

const CancelPasswordButton = styled.TouchableOpacity`
  padding: 15px;
  align-items: center;
  margin-top: 10px;
`;

export default function PerfilScreen() {
  const { user, logout } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  // Password Change States
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(firestore, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserData(data);

        if (!isEditing) {
          setForm(data);
        }
      }
    });

    return () => unsubscribe();
  }, [user, isEditing]);

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: logout, style: 'destructive' }
    ]);
  };

  const handlePickImage = async () => {
    if (!isEditing) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setForm(prev => ({ ...prev, avatarUri: asset.uri }));
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = { ...form };

      // Se houver uma nova imagem local, faz upload para o Storage
      if (dataToSave.avatarUri && !dataToSave.avatarUri.startsWith('http')) {
        const downloadUrl = await uploadFileToStorage(dataToSave.avatarUri, `${flavorId}/perfil/${user.uid}/avatar`);
        dataToSave.avatarBase64 = downloadUrl; // Mantém o nome do campo para compatibilidade
        delete dataToSave.avatarUri;
      }

      try {
        await updateDoc(doc(firestore, 'users', user.uid), dataToSave);
      } catch (fsError) {
        console.error("Erro ao atualizar perfil no Firestore:", fsError);
        throw fsError;
      }

      setIsEditing(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao atualizar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      handleSave();
    } else {
      setForm(userData || {});
      setIsEditing(true);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setForm(userData || {});
  };

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
      // Reautenticar
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Atualizar senha
      await updatePassword(currentUser, newPassword);
      
      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      setIsPasswordModalVisible(false);
      // Limpar campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error(error);
      let msg = 'Erro ao alterar a senha. Verifique sua senha atual.';
      if (error.code === 'auth/wrong-password') msg = 'Senha atual incorreta.';
      Alert.alert('Erro', msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <HeaderAction onPress={toggleEdit} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={primaryColor} size="small" />
          ) : (
            <HeaderActionText>{isEditing ? 'Salvar' : 'Editar'}</HeaderActionText>
          )}
        </HeaderAction>

        <HeaderAction onPress={isEditing ? cancelEdit : handleLogout}>
          <HeaderActionText color="#dc2626">
            {isEditing ? 'Cancelar' : 'Sair'}
          </HeaderActionText>
        </HeaderAction>
      </Header>

      <ProfileSection>
        <AvatarWrapper onTouchEnd={handlePickImage}>
          <AvatarBox>
            <AvatarImage
              source={
                form.avatarUri
                  ? { uri: form.avatarUri }
                  : form.avatarBase64
                    ? { uri: form.avatarBase64 }
                    : userData?.avatarBase64
                      ? { uri: userData.avatarBase64 }
                      : require('../../assets/logo.png')
              }
            />
          </AvatarBox>
          <EditIconCircle>
            <MaterialCommunityIcons
              name={isEditing ? "camera-plus" : "camera"}
              size={16}
              color="#fff"
            />
          </EditIconCircle>
        </AvatarWrapper>

        <ProfileName>
          {form.name || userData?.name || user?.displayName || 'Usuário'}
        </ProfileName>
        <Text>{form.tipo || userData?.tipo || 'Não informado'}</Text>

        <ChangePasswordButton onPress={() => setIsPasswordModalVisible(true)}>
          <Ionicons name="key-outline" size={20} color={primaryColor} />
          <ChangePasswordText>Alterar Minha Senha</ChangePasswordText>
        </ChangePasswordButton>
      </ProfileSection>

      <Modal
        visible={isPasswordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <ModalContainer>
          <ModalContent>
            <ModalTitle>Alterar Senha</ModalTitle>

            <Label>Senha Atual</Label>
            <PasswordInputWrapper>
              <ModalInput
                placeholder="Digite a senha atual"
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                style={{ paddingRight: 50 }}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 15, top: 12 }}
                onPress={() => setShowCurrent(!showCurrent)}
              >
                <Ionicons name={showCurrent ? "eye-off" : "eye"} size={22} color="#888" />
              </TouchableOpacity>
            </PasswordInputWrapper>

            <Label>Nova Senha</Label>
            <PasswordInputWrapper>
              <ModalInput
                placeholder="Mín. 6 caracteres"
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                style={{ paddingRight: 50 }}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 15, top: 12 }}
                onPress={() => setShowNew(!showNew)}
              >
                <Ionicons name={showNew ? "eye-off" : "eye"} size={22} color="#888" />
              </TouchableOpacity>
            </PasswordInputWrapper>

            <Label>Confirmar Nova Senha</Label>
            <PasswordInputWrapper>
              <ModalInput
                placeholder="Repita a nova senha"
                secureTextEntry={!showConfirm}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                style={{ paddingRight: 50 }}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 15, top: 12 }}
                onPress={() => setShowConfirm(!showConfirm)}
              >
                <Ionicons name={showConfirm ? "eye-off" : "eye"} size={22} color="#888" />
              </TouchableOpacity>
            </PasswordInputWrapper>

            <SavePasswordButton onPress={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Salvar Nova Senha</Text>
              )}
            </SavePasswordButton>

            <CancelPasswordButton onPress={() => setIsPasswordModalVisible(false)}>
              <Text style={{ color: '#999', fontSize: 14 }}>Cancelar</Text>
            </CancelPasswordButton>
          </ModalContent>
        </ModalContainer>
      </Modal>

      <InfoList>
        <InfoField>
          <Label>CPF</Label>
          <Value>{userData?.cpf || 'Não informado'}</Value>
        </InfoField>

        <InfoField>
          <Label>Sexo</Label>
          <Value>{userData?.sexo || 'Não informado'}</Value>
        </InfoField>

        <InfoField>
          <Label>Estado Civil</Label>
          <Value>{userData?.estadoCivil || 'Não informado'}</Value>
        </InfoField>

        <InfoField>
          <Label>Endereço</Label>
          <Value>{userData?.address || 'Não informado'}</Value>
        </InfoField>

        <InfoField>
          <Label>Bairro</Label>
          <Value>{userData?.neighborhood || 'Não informado'}</Value>
        </InfoField>

        <InfoField>
          <Label>Cidade</Label>
          <Value>{userData?.city || 'Não informado'}</Value>
        </InfoField>

        <InfoField>
          <Label>Estado</Label>
          <Value>{userData?.state || 'Não informado'}</Value>
        </InfoField>

        <InfoField>
          <Label>Número</Label>
          <Value>{userData?.numero || 'Não informado'}</Value>
        </InfoField>

        <InfoField>
          <Label>Complemento</Label>
          <Value>{userData?.complemento || 'Não informado'}</Value>
        </InfoField>
      </InfoList>
    </Container>
  );
}