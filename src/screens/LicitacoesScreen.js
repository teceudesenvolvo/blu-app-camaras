import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Text, View } from 'react-native';
import styled from 'styled-components/native';

const primaryColor = Constants.expoConfig?.extra?.theme?.primary || '#004a99';
const secondaryColor = Constants.expoConfig?.extra?.theme?.secondary || '#f9c204';

const Container = styled.View`
  flex: 1;
  background-color: ${props => props.theme.background || '#f4f4f5'};
`;

const Header = styled.View`
  padding: 20px;
  padding-top: 60px;
  background-color: #fff;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const HeaderTitle = styled.Text`
  color: #333;
  font-size: 18px;
  font-weight: bold;
`;

const BackButton = styled.TouchableOpacity`
  position: absolute;
  left: 20px;
  top: 60px;
  z-index: 10;
`;

const FiltersWrapper = styled.View`
  padding: 20px;
  background-color: #fff;
`;

const SearchInputContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #f1f5f9;
  border-radius: 8px;
  padding: 0 15px;
  height: 45px;
  margin-bottom: 15px;
`;

const SearchInput = styled.TextInput`
  flex: 1;
  margin-left: 10px;
  font-size: 14px;
  color: #333;
`;

const DropdownsRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const DropdownItem = styled.TouchableOpacity`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: #f1f5f9;
  border-radius: 8px;
  padding: 0 15px;
  height: 45px;
  margin: 0 5px;
  ${props => props.first && `margin-left: 0;`}
  ${props => props.last && `margin-right: 0;`}
`;

const DropdownText = styled.Text`
  color: #555;
  font-size: 14px;
`;

const Card = styled.View`
  background-color: #fff;
  margin: 10px 20px;
  padding: 20px;
  border-radius: 16px;
  elevation: 2;
  border: 1px solid #f0f0f0;
`;

const CardTitle = styled.Text`
  font-size: 16px;
  font-weight: 800;
  color: ${primaryColor};
  margin-bottom: 6px;
`;

const CardInfo = styled.Text`
  font-size: 12px;
  color: #888;
  margin-bottom: 2px;
`;

const CardDesc = styled.Text`
  font-size: 13px;
  color: #333;
  font-weight: 600;
  margin-top: 8px;
  margin-bottom: 10px;
  line-height: 18px;
`;

const CardValue = styled.Text`
  font-size: 15px;
  font-weight: 800;
  color: ${primaryColor};
`;

const ModalBackdrop = styled.TouchableOpacity`
  flex: 1;
  background-color: rgba(0,0,0,0.5);
  justify-content: center;
  align-items: center;
`;

const ModalContainer = styled.View`
  background-color: #fff;
  border-radius: 10px;
  padding: 10px;
  width: 80%;
  max-height: 70%;
`;

const ModalItem = styled.TouchableOpacity`
  padding: 15px;
  border-bottom-width: 1px;
  border-bottom-color: #eee;
`;

const ModalItemText = styled.Text`
  font-size: 16px;
  color: #333;
`;

const CNPJ = '35076017000107';

const MODALIDADES = [
    { label: 'Selecione', value: null },
    { label: 'Dispensa de Licitação', value: 8 },
    { label: 'Inexigibilidade', value: 9 },
    { label: 'Pregão Eletrônico', value: 6 },
    { label: 'Concorrência Eletrônica', value: 4 },
    { label: 'Diálogo Competitivo', value: 2 },
    { label: 'Concurso', value: 3 },
];

const ANOS = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2,
    new Date().getFullYear() - 3,
];


export default function LicitacoesScreen({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [licitacoes, setLicitacoes] = useState([]);
    const [filteredLicitacoes, setFilteredLicitacoes] = useState([]);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [year, setYear] = useState(new Date().getFullYear());
    const [modality, setModality] = useState(MODALIDADES[0]); // { label: 'Todas', value: null }

    const [isYearModalVisible, setYearModalVisible] = useState(false);
    const [isModalityModalVisible, setModalityModalVisible] = useState(false);

    const fetchLicitacoes = useCallback(async (pageNumber, selectedYear, selectedModality) => {
        if (pageNumber === 1) setLoading(true);
        else setLoadingMore(true);

        const dataInicial = `${selectedYear}0101`;
        const dataFinal = `${selectedYear}1231`;
        const modalidadeParam = selectedModality.value ? `&codigoModalidadeContratacao=${selectedModality.value}` : '';
        const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=${dataInicial}&dataFinal=${dataFinal}&uf=ce&cnpj=${CNPJ}${modalidadeParam}&pagina=${pageNumber}&tamanhoPagina=20`;

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                if (pageNumber === 1) setLicitacoes([]);
                return;
            }

            const json = await response.json();

            if (json && json.data) {
                setLicitacoes(prev => pageNumber === 1 ? json.data : [...prev, ...json.data]);
                setTotalPages(json.totalPaginas || 1);
            } else {
                if (pageNumber === 1) setLicitacoes([]);
            }
        } catch (error) {
            console.log("Erro ao buscar licitações:", error);
            if (pageNumber === 1) setLicitacoes([]);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setPage(1);
        setLicitacoes([]);
        fetchLicitacoes(1, year, modality);
    }, [year, modality, fetchLicitacoes]);

    useEffect(() => {
        if (searchText) {
            const filtered = licitacoes.filter(item =>
                (item.objetoCompra || '').toLowerCase().includes(searchText.toLowerCase())
            );
            setFilteredLicitacoes(filtered);
        } else {
            setFilteredLicitacoes(licitacoes);
        }
    }, [searchText, licitacoes]);

    const handleLoadMore = () => {
        if (!loadingMore && page < totalPages) {
            const newPage = page + 1;
            setPage(newPage);
            fetchLicitacoes(newPage, year, modality);
        }
    };

    const renderItem = ({ item }) => (
        <Card>
            <CardTitle>Contrato Nº {item.numeroCompra || 'Não informado'}</CardTitle>
            <CardInfo>Modalidade: {item.modalidadeNome || 'Não informado'}</CardInfo>
            <CardInfo>Data da Publicação: {item.dataPublicacaoPncp ? new Date(item.dataPublicacaoPncp).toLocaleDateString('pt-BR') : 'Não informado'}</CardInfo>
            <CardDesc>Objeto: {item.objetoCompra || 'Não informado'}</CardDesc>
            <CardValue>
                Valor Estimado: {item.valorTotalEstimado ? item.valorTotalEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informado'}
            </CardValue>
        </Card>
    );

    return (
        <Container>
            <Header>
                <BackButton onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
                </BackButton>
                <HeaderTitle>Contratações</HeaderTitle>
            </Header>

            <FiltersWrapper>
                <SearchInputContainer>
                    <MaterialCommunityIcons name="magnify" size={20} color="#888" />
                    <SearchInput
                        placeholder="Pesquisar por objeto do contrato"
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholderTextColor="#aaa"
                    />
                </SearchInputContainer>

                <DropdownsRow>
                    <DropdownItem first onPress={() => setYearModalVisible(true)}>
                        <DropdownText>{year}</DropdownText>
                        <MaterialCommunityIcons name="menu-down" size={20} color="#555" />
                    </DropdownItem>
                    <DropdownItem last onPress={() => setModalityModalVisible(true)}>
                        <DropdownText numberOfLines={1}>{modality.label}</DropdownText>
                        <MaterialCommunityIcons name="menu-down" size={20} color="#555" />
                    </DropdownItem>
                </DropdownsRow>
            </FiltersWrapper>

            <Modal
                transparent={true}
                visible={isYearModalVisible}
                animationType="fade"
                onRequestClose={() => setYearModalVisible(false)}
            >
                <ModalBackdrop onPress={() => setYearModalVisible(false)}>
                    <ModalContainer>
                        <FlatList
                            data={ANOS}
                            keyExtractor={item => item.toString()}
                            renderItem={({ item }) => (
                                <ModalItem onPress={() => {
                                    setYear(item);
                                    setYearModalVisible(false);
                                }}>
                                    <ModalItemText>{item}</ModalItemText>
                                </ModalItem>
                            )}
                        />
                    </ModalContainer>
                </ModalBackdrop>
            </Modal>

            <Modal
                transparent={true}
                visible={isModalityModalVisible}
                animationType="fade"
                onRequestClose={() => setModalityModalVisible(false)}
            >
                <ModalBackdrop onPress={() => setModalityModalVisible(false)}>
                    <ModalContainer>
                        <FlatList
                            data={MODALIDADES}
                            keyExtractor={item => item.label}
                            renderItem={({ item }) => (
                                <ModalItem onPress={() => {
                                    setModality(item);
                                    setModalityModalVisible(false);
                                }}>
                                    <ModalItemText>{item.label}</ModalItemText>
                                </ModalItem>
                            )}
                        />
                    </ModalContainer>
                </ModalBackdrop>
            </Modal>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <FlatList
                    data={filteredLicitacoes}
                    keyExtractor={(item, index) => item.numeroControlePNCP || index.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore && <ActivityIndicator size="small" color={primaryColor} style={{ marginVertical: 20 }} />}
                    ListEmptyComponent={
                        !loading && (
                            <View style={{ marginTop: 50, alignItems: 'center' }}>
                                <Text style={{ color: '#888', fontWeight: 'bold' }}>Não Existem Licitações</Text>
                            </View>
                        )
                    }
                />
            )}
        </Container>
    );
}
