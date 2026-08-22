import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, View } from 'react-native';
import styled from 'styled-components/native';
import {
  PortalBackground,
  PortalCard,
  PortalInput,
  PortalScreenHeader,
} from '../components/PortalScaffold';
import { portalTheme } from '../styles/portalTheme';

const Container = styled(PortalBackground)`
  flex: 1;
`;

const FiltersWrapper = styled.View`
  padding: 18px 18px 8px;
`;

const SearchInputContainer = styled(PortalCard)`
  flex-direction: row;
  align-items: center;
  padding: 0 14px;
  height: 54px;
  margin-bottom: 12px;
`;

const SearchInput = styled(PortalInput)`
  flex: 1;
  min-height: 48px;
  border-width: 0;
  padding: 0;
  margin-left: 10px;
  background-color: transparent;
  font-size: 14px;
`;

const DropdownsRow = styled.View`
  flex-direction: row;
`;

const DropdownItem = styled.TouchableOpacity`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: ${({ theme }) => theme.portal.card};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  padding: 0 14px;
  height: 52px;
  margin-right: ${props => props.last ? '0' : '10px'};
`;

const DropdownText = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 14px;
  font-weight: 800;
`;

const Card = styled(PortalCard)`
  margin: 6px 18px 10px;
`;

const CardTopRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
`;

const CardIcon = styled.View`
  width: 42px;
  height: 42px;
  border-radius: 21px;
  background-color: rgba(2, 90, 161, 0.1);
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const CardTitleGroup = styled.View`
  flex: 1;
`;

const CardTitle = styled.Text`
  font-size: 16px;
  font-weight: 900;
  color: ${({ theme }) => theme.portal.text};
  margin-bottom: 5px;
`;

const CardInfo = styled.Text`
  font-size: 12px;
  color: ${({ theme }) => theme.portal.muted};
  margin-bottom: 2px;
  font-weight: 700;
`;

const CardDesc = styled.Text`
  font-size: 13px;
  color: ${({ theme }) => theme.portal.text};
  font-weight: 600;
  margin-top: 12px;
  margin-bottom: 12px;
  line-height: 19px;
`;

const CardValue = styled.Text`
  font-size: 15px;
  font-weight: 900;
  color: ${({ theme }) => theme.portal.primary};
`;

const ModalBackdrop = styled.TouchableOpacity`
  flex: 1;
  background-color: rgba(15,23,42,0.42);
  justify-content: center;
  align-items: center;
`;

const ModalContainer = styled(PortalCard)`
  padding: 8px;
  width: 82%;
  max-height: 70%;
`;

const ModalItem = styled.TouchableOpacity`
  padding: 15px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.portal.border};
`;

const ModalItemText = styled.Text`
  font-size: 16px;
  color: ${({ theme }) => theme.portal.text};
  font-weight: 700;
`;

const EmptyState = styled.View`
  margin-top: 48px;
  align-items: center;
  padding: 20px;
`;

const EmptyText = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-weight: 800;
  margin-top: 10px;
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

export default function LicitacoesScreen() {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [licitacoes, setLicitacoes] = useState([]);
  const [filteredLicitacoes, setFilteredLicitacoes] = useState([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [year, setYear] = useState(new Date().getFullYear());
  const [modality, setModality] = useState(MODALIDADES[1]);

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
      } else if (pageNumber === 1) {
        setLicitacoes([]);
      }
    } catch (error) {
      console.log('Erro ao buscar licitações:', error);
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
      <CardTopRow>
        <CardIcon>
          <MaterialCommunityIcons name="file-document-check-outline" size={22} color={portalTheme.primary} />
        </CardIcon>
        <CardTitleGroup>
          <CardTitle>Contrato Nº {item.numeroCompra || 'Não informado'}</CardTitle>
          <CardInfo>Modalidade: {item.modalidadeNome || 'Não informado'}</CardInfo>
          <CardInfo>Publicação: {item.dataPublicacaoPncp ? new Date(item.dataPublicacaoPncp).toLocaleDateString('pt-BR') : 'Não informado'}</CardInfo>
        </CardTitleGroup>
      </CardTopRow>

      <CardDesc numberOfLines={4}>Objeto: {item.objetoCompra || 'Não informado'}</CardDesc>
      <CardValue>
        {item.valorTotalEstimado ? item.valorTotalEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Valor não informado'}
      </CardValue>
    </Card>
  );

  return (
    <Container>
      <PortalScreenHeader
        title="Licitações"
        subtitle="Acompanhe as contratações públicas e filtre por ano, modalidade ou objeto."
        canGoBack={false}
      />

      <FiltersWrapper>
        <SearchInputContainer>
          <MaterialCommunityIcons name="magnify" size={21} color={portalTheme.primary} />
          <SearchInput
            placeholder="Pesquisar por objeto do contrato"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={portalTheme.subtle}
          />
        </SearchInputContainer>

        <DropdownsRow>
          <DropdownItem onPress={() => setYearModalVisible(true)}>
            <DropdownText>{year}</DropdownText>
            <MaterialCommunityIcons name="chevron-down" size={20} color={portalTheme.primary} />
          </DropdownItem>
          <DropdownItem last onPress={() => setModalityModalVisible(true)}>
            <DropdownText numberOfLines={1}>{modality.label}</DropdownText>
            <MaterialCommunityIcons name="chevron-down" size={20} color={portalTheme.primary} />
          </DropdownItem>
        </DropdownsRow>
      </FiltersWrapper>

      <Modal transparent visible={isYearModalVisible} animationType="fade" onRequestClose={() => setYearModalVisible(false)}>
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

      <Modal transparent visible={isModalityModalVisible} animationType="fade" onRequestClose={() => setModalityModalVisible(false)}>
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
          <ActivityIndicator size="large" color={portalTheme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredLicitacoes}
          keyExtractor={(item, index) => item.numeroControlePNCP || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 6 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore && <ActivityIndicator size="small" color={portalTheme.primary} style={{ marginVertical: 20 }} />}
          ListEmptyComponent={
            !loading && (
              <EmptyState>
                <MaterialCommunityIcons name="file-search-outline" size={36} color={portalTheme.primary} />
                <EmptyText>Não existem licitações para os filtros selecionados.</EmptyText>
              </EmptyState>
            )
          }
        />
      )}
    </Container>
  );
}
