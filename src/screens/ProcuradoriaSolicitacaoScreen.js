import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, doc, onSnapshot, serverTimestamp as firestoreTimestamp } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Text,
    View
} from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { firestore } from '../../services/firebaseConfig';
import { uploadFileToStorage } from '../../services/storageService';
import { AuthContext } from '../context/AuthContext';

const primaryColor = '#a21caf'; // Purple
const flavorId = Constants.expoConfig?.extra?.flavorId || 'paraipaba';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }) => theme.portal.page};
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 50px 20px 20px 20px;
  background-color: ${({ theme }) => theme.portal.card};
`;

const BackButton = styled.TouchableOpacity`
  padding: 5px;
`;

const HeaderTitle = styled.Text`
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.portal.text};
  margin-right: 30px;
`;

const FormContainer = styled.View`
  background-color: ${({ theme }) => theme.portal.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  border-radius: 12px;
  padding: 20px;
  margin: 15px 20px 40px 20px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
  elevation: 2;
`;

const SectionTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${primaryColor};
  margin: 10px 0 15px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.portal.border};
  padding-bottom: 5px;
`;

const InputGroup = styled.View`
  margin-bottom: 15px;
`;

const Label = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.portal.text};
  margin-bottom: 8px;
`;

const Input = styled.TextInput.attrs(({ theme }) => ({ placeholderTextColor: theme.portal.subtle }))`
  background-color: ${({ theme }) => theme.portal.pageAlt};
  border-radius: 8px;
  padding: 12px 15px;
  font-size: 14px;
  color: ${({ theme }) => theme.portal.text};
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
`;

const SelectPlaceholder = styled.TouchableOpacity`
  background-color: ${({ theme }) => theme.portal.pageAlt};
  border-radius: 8px;
  padding: 12px 15px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const SelectValue = styled.Text`
  font-size: 14px;
  color: ${({ theme }) => theme.portal.text};
`;

const AttachmentButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 12px;
  border-width: 1px;
  border-color: ${primaryColor};
  border-style: dashed;
  border-radius: 8px;
  margin-top: 5px;
  background-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(162,28,175,0.14)' : '#fdf2f850'};
`;

const AttachmentText = styled.Text`
  margin-left: 10px;
  color: ${primaryColor};
  font-size: 14px;
  font-weight: 500;
`;

const ImagePreview = styled.Image`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  margin-right: 10px;
`;

const SubmitButton = styled.TouchableOpacity`
  background-color: ${primaryColor};
  padding: 16px;
  border-radius: 12px;
  align-items: center;
  margin-top: 20px;
  shadow-color: ${primaryColor};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 8px;
  elevation: 5;
`;

const SubmitText = styled.Text`
  color: #fff;
  font-weight: 700;
  font-size: 16px;
`;

const ModalOverlay = styled.TouchableOpacity`
  flex: 1;
  background-color: rgba(0,0,0,0.5);
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.View`
  background-color: ${({ theme }) => theme.portal.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  border-radius: 12px;
  padding: 20px;
  width: 85%;
  max-height: 70%;
`;

const ModalItem = styled.TouchableOpacity`
  padding: 15px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.portal.border};
`;

const ATENDIMENTO_TYPES = [
  'Aconselhamento Jurídico', 
  'Apoio Psicológico', 
  'Denúncia de Violência', 
  'Solicitação de Medida Protetiva', 
  'Outros'
];

const VIOLENCIA_TYPES = ['Física', 'Psicológica', 'Moral', 'Sexual', 'Patrimonial'];

const IDENTIFICACAO_TYPES = [
  { label: 'Quero me identificar', value: 'identificado' },
  { label: 'Prefiro não me identificar (Anônimo)', value: 'anonimo' }
];

const RELACAO_VITIMA_TYPES = ['Sou eu', 'Meu familiar', 'Minha amiga', 'Minha mãe', 'Outro'];

export default function ProcuradoriaSolicitacaoScreen({ navigation }) {
    const theme = useTheme();
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState(null);

    const [tipoAtendimento, setTipoAtendimento] = useState('');
    const [tipoViolencia, setTipoViolencia] = useState('');
    const [identificacao, setIdentificacao] = useState('identificado');
    const [assunto, setAssunto] = useState('');
    const [descricao, setDescricao] = useState('');
    const [dataFato, setDataFato] = useState('');
    const [nomeAgressor, setNomeAgressor] = useState('');
    const [relacaoAgressor, setRelacaoAgressor] = useState('');
    
    // Campos Anônimos
    const [relacaoVitima, setRelacaoVitima] = useState('');
    const [enderecoAcontecimento, setEnderecoAcontecimento] = useState('');
    const [pontoReferencia, setPontoReferencia] = useState('');
    
    const [anexos, setAnexos] = useState([]);
    
    // Modais
    const [modalTipoVisible, setModalTipoVisible] = useState(false);
    const [modalViolenciaVisible, setModalViolenciaVisible] = useState(false);
    const [modalIdentVisible, setModalIdentVisible] = useState(false);
    const [modalRelacaoVisible, setModalRelacaoVisible] = useState(false);

    useEffect(() => {
        if (!user) return;
        const userRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) setProfileData(snapshot.data());
        });
        return () => unsubscribe();
    }, [user]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Items, // Images
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            const type = asset.mimeType || 'image/jpeg';
            setAnexos([...anexos, {
                name: asset.uri.split('/').pop(),
                type: type,
                data: `data:${type};base64,${asset.base64}`,
                uri: asset.uri
            }]);
        }
    };

    const handleSubmit = async () => {
        if (!tipoAtendimento || !assunto || !descricao) {
            Alert.alert('Erro', 'Por favor, preencha os campos obrigatórios (Tipo, Assunto e Descrição).');
            return;
        }

        setLoading(true);

        try {
            const isAnonimo = identificacao === 'anonimo';
            const userId = isAnonimo ? 'anonimo' : (user?.uid || 'anonimo');

            // Upload anexos para Storage
            const uploadedAnexos = [];
            for (const anexo of anexos) {
                try {
                    const downloadUrl = await uploadFileToStorage(
                        anexo.uri,
                        `${flavorId}/procuradoria-mulher/${userId}/anexos`
                    );
                    uploadedAnexos.push({ name: anexo.name, type: anexo.type, url: downloadUrl });
                } catch (uploadError) {
                    console.error('Erro ao fazer upload do anexo:', uploadError);
                }
            }

            const payload = {
                flavorId,
                dadosSolicitacao: {
                    tipoAtendimento,
                    tipoViolencia,
                    identificacao,
                    assunto,
                    descricao,
                    dataFato,
                    nomeAgressor,
                    relacaoAgressor,
                    relacaoVitima: isAnonimo ? relacaoVitima : '',
                    enderecoAcontecimento: isAnonimo ? enderecoAcontecimento : '',
                    pontoReferencia: isAnonimo ? pontoReferencia : '',
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
                userId: userId,
                status: 'Recebida',
                dataSolicitacao: firestoreTimestamp()
            };

            await addDoc(collection(firestore, 'procuradoria-mulher'), payload);

            Alert.alert('Sucesso', 'Sua solicitação foi enviada com sucesso e será tratada com sigilo e urgência.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível enviar sua solicitação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container showsVerticalScrollIndicator={false}>
            <HeaderContainer>
                <BackButton onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.portal.text} />
                </BackButton>
                <HeaderTitle>Novo Atendimento</HeaderTitle>
            </HeaderContainer>

            <FormContainer>
                <SectionTitle>Registro de Atendimento</SectionTitle>

                <InputGroup>
                    <Label>Tipo de Atendimento *</Label>
                    <SelectPlaceholder onPress={() => setModalTipoVisible(true)}>
                        <SelectValue>{tipoAtendimento || 'Selecione o tipo'}</SelectValue>
                        <Ionicons name="chevron-down" size={20} color={primaryColor} />
                    </SelectPlaceholder>
                </InputGroup>

                <InputGroup>
                    <Label>Identificação</Label>
                    <SelectPlaceholder onPress={() => setModalIdentVisible(true)}>
                        <SelectValue>{IDENTIFICACAO_TYPES.find(i => i.value === identificacao)?.label}</SelectValue>
                        <Ionicons name="chevron-down" size={20} color={primaryColor} />
                    </SelectPlaceholder>
                </InputGroup>

                {tipoAtendimento === 'Denúncia de Violência' && (
                    <InputGroup>
                        <Label>Tipo de Violência</Label>
                        <SelectPlaceholder onPress={() => setModalViolenciaVisible(true)}>
                            <SelectValue>{tipoViolencia || 'Selecione o tipo de violência'}</SelectValue>
                            <Ionicons name="chevron-down" size={20} color={primaryColor} />
                        </SelectPlaceholder>
                    </InputGroup>
                )}

                <InputGroup>
                    <Label>Assunto *</Label>
                    <Input 
                        placeholder="Ex: Pedido de orientação"
                        value={assunto}
                        onChangeText={setAssunto}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Descrição detalhada *</Label>
                    <Input 
                        placeholder="Descreva o que aconteceu..."
                        multiline
                        textAlignVertical="top"
                        style={{ height: 120 }}
                        value={descricao}
                        onChangeText={setDescricao}
                    />
                </InputGroup>

                {identificacao === 'anonimo' && (
                    <>
                        <SectionTitle>Informações da Ocorrência (Anônimo)</SectionTitle>
                        <InputGroup>
                            <Label>Quem é a vítima? *</Label>
                            <SelectPlaceholder onPress={() => setModalRelacaoVisible(true)}>
                                <SelectValue>{relacaoVitima || 'Selecione a vítima'}</SelectValue>
                                <Ionicons name="chevron-down" size={20} color={primaryColor} />
                            </SelectPlaceholder>
                        </InputGroup>
                        <InputGroup>
                            <Label>Endereço do Acontecimento *</Label>
                            <Input 
                                placeholder="Rua, número, bairro..."
                                value={enderecoAcontecimento}
                                onChangeText={setEnderecoAcontecimento}
                            />
                        </InputGroup>
                        <InputGroup>
                            <Label>Ponto de Referência</Label>
                            <Input 
                                placeholder="Ex: Próximo ao mercado X"
                                value={pontoReferencia}
                                onChangeText={setPontoReferencia}
                            />
                        </InputGroup>
                    </>
                )}

                <SectionTitle>Dados Adicionais</SectionTitle>
                
                <InputGroup>
                    <Label>Data do Fato (Opcional)</Label>
                    <Input 
                        placeholder="DD/MM/AAAA"
                        value={dataFato}
                        onChangeText={setDataFato}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Nome do Acusado (se houver)</Label>
                    <Input 
                        placeholder="Nome completo ou apelido"
                        value={nomeAgressor}
                        onChangeText={setNomeAgressor}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Sua relação com o acusado</Label>
                    <Input 
                        placeholder="Ex: Cônjuge, vizinho..."
                        value={relacaoAgressor}
                        onChangeText={setRelacaoAgressor}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Anexar Provas (Opcional)</Label>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                        {anexos.map((anexo, index) => (
                            <ImagePreview key={index} source={{ uri: anexo.uri }} />
                        ))}
                    </View>
                    <AttachmentButton onPress={pickImage}>
                        <Ionicons name="camera-outline" size={20} color={primaryColor} />
                        <AttachmentText>Adicionar Provas</AttachmentText>
                    </AttachmentButton>
                </InputGroup>

                <SubmitButton onPress={handleSubmit} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <SubmitText>Enviar Solicitação</SubmitText>
                    )}
                </SubmitButton>
            </FormContainer>

            {/* Modais de Seleção */}
            <Modal visible={modalTipoVisible} transparent animationType="fade">
                <ModalOverlay onPress={() => setModalTipoVisible(false)}>
                    <ModalContent>
                        <ScrollView>
                            {ATENDIMENTO_TYPES.map(t => (
                                <ModalItem key={t} onPress={() => { setTipoAtendimento(t); setModalTipoVisible(false); }}>
                                    <Text>{t}</Text>
                                </ModalItem>
                            ))}
                        </ScrollView>
                    </ModalContent>
                </ModalOverlay>
            </Modal>

            <Modal visible={modalViolenciaVisible} transparent animationType="fade">
                <ModalOverlay onPress={() => setModalViolenciaVisible(false)}>
                    <ModalContent>
                        {VIOLENCIA_TYPES.map(t => (
                            <ModalItem key={t} onPress={() => { setTipoViolencia(t); setModalViolenciaVisible(false); }}>
                                <Text>{t}</Text>
                            </ModalItem>
                        ))}
                    </ModalContent>
                </ModalOverlay>
            </Modal>

            <Modal visible={modalIdentVisible} transparent animationType="fade">
                <ModalOverlay onPress={() => setModalIdentVisible(false)}>
                    <ModalContent>
                        {IDENTIFICACAO_TYPES.map(i => (
                            <ModalItem key={i.value} onPress={() => { setIdentificacao(i.value); setModalIdentVisible(false); }}>
                                <Text>{i.label}</Text>
                            </ModalItem>
                        ))}
                    </ModalContent>
                </ModalOverlay>
            </Modal>

            <Modal visible={modalRelacaoVisible} transparent animationType="fade">
                <ModalOverlay onPress={() => setModalRelacaoVisible(false)}>
                    <ModalContent>
                        {RELACAO_VITIMA_TYPES.map(t => (
                            <ModalItem key={t} onPress={() => { setRelacaoVitima(t); setModalRelacaoVisible(false); }}>
                                <Text>{t}</Text>
                            </ModalItem>
                        ))}
                    </ModalContent>
                </ModalOverlay>
            </Modal>
            
            <View style={{ height: 40 }} />
        </Container>
    );
}
