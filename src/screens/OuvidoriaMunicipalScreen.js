import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, doc, onSnapshot, serverTimestamp as firestoreTimestamp, setDoc } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Text, View } from 'react-native';
import styled from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { uploadFileToStorage } from '../../services/storageService';
import { AuthContext } from '../context/AuthContext';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const secondaryColor = Constants.expoConfig?.extra?.theme?.secondary || '#f9c204';
const backgroundColor = Constants.expoConfig?.extra?.theme?.background || '#f0f2f5';
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${backgroundColor};
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 72px 20px 20px 20px;
  background-color: #fff;
`;

const BackButton = styled.TouchableOpacity`
  padding: 5px;
`;

const HeaderTitle = styled.Text`
  font-size: 22px;
  font-weight: 900;
  color: #111;
`;

const HeaderSubtitle = styled.Text`
  margin-top: 5px;
  font-size: 14px;
  line-height: 20px;
  color: #64748b;
`;

const HeaderTextGroup = styled.View`
  flex: 1;
`;

const FormContainer = styled.View`
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  margin: 15px 20px 40px 20px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
  elevation: 2;
`;

const StepText = styled.Text`
  font-size: 14px;
  color: #888;
  margin-bottom: 15px;
`;

const ServiceInfoCard = styled.View`
  background-color: #eef2ff;
  padding: 15px;
  border-radius: 8px;
  border-left-width: 4px;
  border-left-color: ${primaryColor};
  margin-bottom: 20px;
`;

const ServiceInfoTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${primaryColor};
  margin-bottom: 5px;
`;

const ServiceInfoSub = styled.Text`
  font-size: 12px;
  color: #666;
`;

const InputGroup = styled.View`
  margin-bottom: 15px;
`;

const Label = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: #444;
  margin-bottom: 8px;
`;

const Input = styled.TextInput`
  background-color: #f5f6fa;
  border-radius: 8px;
  padding: 12px 15px;
  font-size: 14px;
  color: #333;
  border-width: 1px;
  border-color: #eee;
`;

const SelectPlaceholder = styled.TouchableOpacity`
  background-color: #f5f6fa;
  border-radius: 8px;
  padding: 12px 15px;
  border-width: 1px;
  border-color: #eee;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const SelectText = styled.Text`
  font-size: 14px;
  color: #333;
`;

const ConfirmButton = styled.TouchableOpacity`
  background-color: ${primaryColor};
  padding: 15px;
  border-radius: 8px;
  align-items: center;
  margin-top: 10px;
`;

const ConfirmText = styled.Text`
  color: #fff;
  font-weight: 600;
  font-size: 16px;
`;

const ReturnButton = styled.TouchableOpacity`
  padding: 15px;
  align-items: center;
  margin-top: 5px;
`;

const ReturnText = styled.Text`
  color: ${secondaryColor};
  font-weight: 500;
  font-size: 14px;
`;

const AttachmentButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 10px;
  border-width: 1px;
  border-color: #ddd;
  border-style: dashed;
  border-radius: 8px;
  margin-top: 5px;
`;

const AttachmentText = styled.Text`
  margin-left: 10px;
  color: #666;
  font-size: 14px;
`;

const ImagePreview = styled.Image`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  margin-right: 10px;
`;

const ModalOverlay = styled.TouchableOpacity`
  flex: 1;
  background-color: rgba(0,0,0,0.5);
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.View`
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  width: 80%;
`;

const ModalItem = styled.TouchableOpacity`
  padding: 15px;
  border-bottom-width: 1px;
  border-bottom-color: #eee;
`;

const MANIFESTATION_TYPES = ['Elogio', 'Reclamação', 'Sugestão', 'Denúncia', 'Solicitação'];
const IDENTIFICATION_TYPES = ['Identificar-se', 'Anônimo'];

export default function OuvidoriaMunicipalScreen({ navigation }) {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState(null);
    
    const [tipo, setTipo] = useState('Selecione...');
    const [identificacao, setIdentificacao] = useState('Identificado');
    const [assunto, setAssunto] = useState('');
    const [descricao, setDescricao] = useState('');
    const [dataFato, setDataFato] = useState('');
    const [envolvidos, setEnvolvidos] = useState('');
    const [localFato, setLocalFato] = useState('');
    const [anexos, setAnexos] = useState([]);

    const [modalTipoVisible, setModalTipoVisible] = useState(false);
    const [modalIdentVisible, setModalIdentVisible] = useState(false);

    // 👤 Buscar dados do perfil do usuário para o dadosUsuario
    useEffect(() => {
        if (!user) return;
        const userRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                setProfileData(snapshot.data());
            }
        });
        return () => unsubscribe();
    }, [user]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            const filename = asset.uri.split('/').pop();
            const type = asset.mimeType || 'image/jpeg';
            
            const newAnexo = {
                uri: asset.uri,
                name: filename,
                type: type,
                data: `data:${type};base64,${asset.base64}`
            };
            setAnexos([...anexos, newAnexo]);
        }
    };

    const handleSubmit = async () => {
        if (tipo === 'Selecione...' || !assunto || !descricao) {
            Alert.alert('Erro', 'Por favor, preencha os campos obrigatórios (Tipo, Assunto e Descrição).');
            return;
        }

        setLoading(true);

        try {
            const isAnonimo = identificacao === 'Anônimo';

            // Upload de anexos para Storage
            const uploadedAnexos = [];
            for (const anexo of anexos) {
                try {
                    const downloadUrl = await uploadFileToStorage(
                        anexo.uri,
                        `${flavorId}/ouvidoria/${user.uid}/anexos`
                    );
                    uploadedAnexos.push({
                        name: anexo.name,
                        type: anexo.type,
                        url: downloadUrl
                    });
                } catch (uploadError) {
                    console.error('Erro ao fazer upload de anexo:', uploadError);
                }
            }

            const payload = {
                flavorId,
                dadosManifestacao: {
                    tipoManifestacao: tipo,
                    identificacao: isAnonimo ? 'anonimo' : 'identificado',
                    assunto,
                    descricao,
                    localFato,
                    dataFato,
                    envolvidos,
                    anexos: uploadedAnexos
                },
                dadosUsuario: {
                    identificacao: isAnonimo ? 'Anônimo' : 'Identificado',
                    id: isAnonimo ? '' : (user?.uid || ''),
                    email: isAnonimo ? '' : (user?.email || profileData?.email || ''),
                    name: isAnonimo ? 'Não informado' : (profileData?.name || user?.displayName || 'Não informado'),
                    cpf: isAnonimo ? 'Não informado' : (profileData?.cpf || 'Não informado'),
                    phone: isAnonimo ? 'Não informado' : (profileData?.phone || profileData?.celular || 'Não informado')
                },
                userId: isAnonimo ? 'anonimo' : (user?.uid || 'anonimo'),
                status: 'Recebida',
                dataManifestacao: firestoreTimestamp()
            };

            const docRef = await addDoc(collection(firestore, 'ouvidoria'), payload);
            // Salvar o próprio ID no documento, como era feito no dual-write
            await setDoc(docRef, { id: docRef.id }, { merge: true });

            Alert.alert('Sucesso', 'Sua manifestação foi enviada com sucesso!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Erro ao enviar ouvidoria:', error);
            Alert.alert('Erro', 'Não foi possível enviar sua solicitação. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };;

    return (
        <Container showsVerticalScrollIndicator={false}>
            <HeaderContainer>
                <BackButton onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </BackButton>
                <HeaderTextGroup>
                    <HeaderTitle>Ouvidoria</HeaderTitle>
                    <HeaderSubtitle>Envie sua manifestação e acompanhe o atendimento.</HeaderSubtitle>
                </HeaderTextGroup>
            </HeaderContainer>

            <FormContainer>
                <StepText>Detalhes da Solicitação</StepText>

                <ServiceInfoCard>
                    <ServiceInfoTitle>Serviço Selecionado:{"\n"}Ouvidoria Municipal</ServiceInfoTitle>
                    <ServiceInfoSub>Tipo: Serviço Público</ServiceInfoSub>
                </ServiceInfoCard>

                <InputGroup>
                    <Label>Tipo de Manifestação *</Label>
                    <SelectPlaceholder onPress={() => setModalTipoVisible(true)}>
                        <SelectText style={{ color: tipo === 'Selecione...' ? '#888' : '#333' }}>{tipo}</SelectText>
                        <Ionicons name="chevron-down" size={16} color="#888" />
                    </SelectPlaceholder>
                </InputGroup>

                <InputGroup>
                    <Label>Identificação</Label>
                    <SelectPlaceholder onPress={() => setModalIdentVisible(true)}>
                        <SelectText>{identificacao}</SelectText>
                        <Ionicons name="chevron-down" size={16} color="#888" />
                    </SelectPlaceholder>
                </InputGroup>

                <InputGroup>
                    <Label>Assunto *</Label>
                    <Input 
                        placeholder="Ex: Iluminação Pública" 
                        value={assunto}
                        onChangeText={setAssunto}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Local do Fato</Label>
                    <Input 
                        placeholder="Onde ocorreu?" 
                        value={localFato}
                        onChangeText={setLocalFato}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Envolvidos</Label>
                    <Input 
                        placeholder="Quem estava envolvido?" 
                        value={envolvidos}
                        onChangeText={setEnvolvidos}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Descrição detalhada *</Label>
                    <Input
                        placeholder="Descreva o ocorrido..."
                        multiline
                        textAlignVertical="top"
                        style={{ height: 100 }}
                        value={descricao}
                        onChangeText={setDescricao}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Data do fato</Label>
                    <Input 
                        placeholder="DD/MM/AAAA" 
                        value={dataFato}
                        onChangeText={setDataFato}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Anexos (Opcional)</Label>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                        {anexos.map((anexo, index) => (
                            <ImagePreview key={index} source={{ uri: anexo.uri }} />
                        ))}
                    </View>
                    <AttachmentButton onPress={pickImage}>
                        <Ionicons name="camera-outline" size={20} color={primaryColor} />
                        <AttachmentText>Adicionar Foto</AttachmentText>
                    </AttachmentButton>
                </InputGroup>

                <ConfirmButton onPress={handleSubmit} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ConfirmText>Confirmar Solicitação</ConfirmText>
                    )}
                </ConfirmButton>

                <ReturnButton onPress={() => navigation.goBack()}>
                    <ReturnText>← Voltar</ReturnText>
                </ReturnButton>
            </FormContainer>

            {/* Modal para Tipo de Manifestação */}
            <Modal visible={modalTipoVisible} transparent animationType="fade">
                <ModalOverlay onPress={() => setModalTipoVisible(false)}>
                    <ModalContent>
                        {MANIFESTATION_TYPES.map((t) => (
                            <ModalItem key={t} onPress={() => { setTipo(t); setModalTipoVisible(false); }}>
                                <Text>{t}</Text>
                            </ModalItem>
                        ))}
                    </ModalContent>
                </ModalOverlay>
            </Modal>

            {/* Modal para Identificação */}
            <Modal visible={modalIdentVisible} transparent animationType="fade">
                <ModalOverlay onPress={() => setModalIdentVisible(false)}>
                    <ModalContent>
                        {IDENTIFICATION_TYPES.map((i) => (
                            <ModalItem key={i} onPress={() => { setIdentificacao(i); setModalIdentVisible(false); }}>
                                <Text>{i}</Text>
                            </ModalItem>
                        ))}
                    </ModalContent>
                </ModalOverlay>
            </Modal>
        </Container>
    );
}
