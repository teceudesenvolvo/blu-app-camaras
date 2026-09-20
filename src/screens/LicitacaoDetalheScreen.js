import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Linking, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import styled from 'styled-components/native';
import {
  PortalBackground,
  PortalCard,
  PortalScreenHeader,
  PortalSubtitle,
  PortalTitle,
} from '../components/PortalScaffold';
import { portalTheme } from '../styles/portalTheme';
import { useSystemControl } from '../context/SystemControlContext';

const Content = styled(ScrollView)`
  flex: 1;
  padding: 18px;
`;

const Section = styled(PortalCard)`
  margin-bottom: 14px;
`;

const Label = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 4px;
  text-transform: uppercase;
`;

const Value = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 15px;
  line-height: 22px;
  margin-bottom: 14px;
`;

const LinkButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 13px 0 2px;
`;

const LinkText = styled.Text`
  color: ${({ theme }) => theme.portal.primary};
  font-size: 15px;
  font-weight: 900;
  margin-left: 8px;
`;

const FileRow = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 12px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.portal.border};
`;

const FileText = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.portal.text};
  font-size: 14px;
  font-weight: 700;
  margin-left: 8px;
`;

const formatDate = value => value ? new Date(value).toLocaleDateString('pt-BR') : 'Não informado';
const formatMoney = value => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informado';
};

const getProcurementParts = value => {
  const match = String(value || '').match(/^(\d{14})-\d+-(\d+)\/(\d{4})$/);
  return match ? { cnpj: match[1], sequencial: Number(match[2]), ano: Number(match[3]) } : null;
};

const getDetailUrl = (configuredUrl, parts) => {
  if (!configuredUrl || !parts) return '';
  const base = String(configuredUrl)
    .replaceAll('{cnpj}', parts.cnpj)
    .replace(/\/contratacoes\/publicacao\/?$/, '');
  return `${base}/orgaos/${parts.cnpj}/compras/${parts.ano}/${parts.sequencial}`;
};

export default function LicitacaoDetalheScreen({ navigation, route }) {
  const initialItem = route.params?.licitacao || {};
  const { settings } = useSystemControl();
  const [item, setItem] = useState(initialItem);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    const parts = getProcurementParts(initialItem.numeroControlePNCP);
    const config = settings?.integrations?.procurementApi;
    const detailUrl = getDetailUrl(config?.url, parts);
    if (!detailUrl || !config?.enabled) return undefined;

    let active = true;
    setLoadingDetails(true);
    fetch(detailUrl)
      .then(response => { if (!response.ok) throw new Error(`API de detalhes HTTP ${response.status}`); return response.json(); })
      .then(payload => {
        const detail = payload?.data || payload?.result || payload;
        if (active && detail && typeof detail === 'object') {
          setItem(current => ({ ...current, ...detail, arquivos: detail.arquivos || detail.documentos || current.arquivos || [] }));
        }
      })
      .catch(error => { if (active) setDetailError(error.message); })
      .finally(() => { if (active) setLoadingDetails(false); });
    return () => { active = false; };
  }, [initialItem.numeroControlePNCP, settings?.integrations?.procurementApi]);

  const openDetails = () => item.linkSistemaOrigem && Linking.openURL(item.linkSistemaOrigem);
  const files = Array.isArray(item.arquivos) ? item.arquivos : [];
  const openFile = file => {
    const url = typeof file === 'string' ? file : file.url || file.link || file.href;
    if (url) Linking.openURL(url);
  };

  return (
    <PortalBackground>
      <PortalScreenHeader navigation={navigation} title="Detalhes da licitação" subtitle="Consulte os dados públicos deste processo." />
      <Content contentContainerStyle={{ paddingBottom: 36 }}>
        <Section>
          <PortalTitle>{item.numeroCompra || 'Processo sem número'}</PortalTitle>
          <PortalSubtitle>{item.modalidadeNome || 'Modalidade não informada'}</PortalSubtitle>
        </Section>

        <Section>
          <Label>Objeto</Label>
          <Value>{item.objetoCompra || 'Não informado'}</Value>
          <Label>Situação</Label>
          <Value>{item.situacaoCompraNome || 'Não informada'}</Value>
          <Label>Fornecedor</Label>
          <Value>{loadingDetails ? 'Carregando...' : item.nomeRazaoSocialFornecedor || item.nomeFornecedor || 'Não informado'}</Value>
          <Label>Valor estimado</Label>
          <Value>{formatMoney(item.valorTotalEstimado)}</Value>
        </Section>

        <Section>
          <Label>Datas</Label>
          <Value>
            Abertura: {loadingDetails ? 'Carregando...' : formatDate(item.dataAberturaProposta || item.dataInicioRecebimentoProposta)}{`\n`}
            Encerramento: {loadingDetails ? 'Carregando...' : formatDate(item.dataEncerramentoProposta || item.dataFimRecebimentoProposta)}{`\n`}
            Publicação: {formatDate(item.dataPublicacaoPncp)}
          </Value>
          {detailError ? <PortalSubtitle>Não foi possível carregar todos os dados: {detailError}</PortalSubtitle> : null}
          {item.linkSistemaOrigem ? (
            <LinkButton onPress={openDetails} activeOpacity={0.75}>
              <MaterialCommunityIcons name="open-in-new" size={20} color={portalTheme.primary} />
              <LinkText>Ver processo e arquivos no portal oficial</LinkText>
            </LinkButton>
          ) : null}
        </Section>

        {files.length ? (
          <Section>
            <Label>Arquivos do processo</Label>
            {files.map((file, index) => (
              <FileRow key={`${file.url || file.link || file}-${index}`} onPress={() => openFile(file)} activeOpacity={0.75}>
                <MaterialCommunityIcons name="file-download-outline" size={21} color={portalTheme.primary} />
                <FileText numberOfLines={2}>{typeof file === 'string' ? file : file.nome || file.name || 'Documento do processo'}</FileText>
              </FileRow>
            ))}
          </Section>
        ) : null}
      </Content>
    </PortalBackground>
  );
}
