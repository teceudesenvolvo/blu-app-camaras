import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import styled, { useTheme } from 'styled-components/native';
import { collectAttachmentFiles } from '../utils/attachments';

const FileRow = styled.TouchableOpacity`
  min-height: 50px;
  flex-direction: row;
  align-items: center;
  padding: 10px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.portal.border};
`;
const FileName = styled.Text`
  flex: 1;
  margin-left: 10px;
  color: ${({ theme }) => theme.portal.text};
  font-size: 14px;
  font-weight: 700;
`;
const Overlay = styled.View`
  flex: 1;
  padding: 16px;
  justify-content: center;
  background-color: rgba(2, 8, 23, 0.86);
`;
const Viewer = styled.View`
  width: 100%;
  height: 82%;
  overflow: hidden;
  border-radius: 14px;
  background-color: ${({ theme }) => theme.portal.card};
`;
const ViewerHeader = styled.View`
  min-height: 54px;
  flex-direction: row;
  align-items: center;
  padding: 0 14px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.portal.border};
`;
const ViewerTitle = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.portal.text};
  font-size: 14px;
  font-weight: 800;
`;
const CloseButton = styled.TouchableOpacity`
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
`;
const Preview = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.portal.pageAlt};
`;

function isImage(file) {
  const type = String(file.type || file.mimeType || '').toLowerCase();
  return type.startsWith('image/') || /\.(avif|gif|heic|heif|jpe?g|png|webp)(\?|$)/i.test(file.url);
}

export default function AttachmentList({ sources = [] }) {
  const theme = useTheme();
  const files = collectAttachmentFiles(...sources);
  const [selected, setSelected] = useState(null);
  const [documentError, setDocumentError] = useState(false);

  const openFile = file => {
    setDocumentError(false);
    setSelected(file);
  };
  const documentUrl = selected?.url && `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(selected.url)}`;

  return <>
    {files.map((file, index) => (
      <FileRow key={`${file.url}-${index}`} onPress={() => openFile(file)}>
        <MaterialCommunityIcons name={isImage(file) ? 'image-outline' : 'file-document-outline'} size={21} color={theme.portal.primary} />
        <FileName numberOfLines={2}>{file.name || `Arquivo ${index + 1}`}</FileName>
        <MaterialCommunityIcons name="open-in-new" size={18} color={theme.portal.muted} />
      </FileRow>
    ))}
    {!files.length ? <Text style={{ color: theme.portal.muted }}>Nenhum arquivo anexado.</Text> : null}
    <Modal visible={Boolean(selected)} animationType="fade" onRequestClose={() => setSelected(null)} statusBarTranslucent>
      <Overlay>
        <Viewer>
          <ViewerHeader>
            <ViewerTitle numberOfLines={1}>{selected?.name || 'Arquivo anexado'}</ViewerTitle>
            <CloseButton onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Fechar visualizador">
              <MaterialCommunityIcons name="close" size={24} color={theme.portal.text} />
            </CloseButton>
          </ViewerHeader>
          <Preview>
            {selected && isImage(selected) ? (
              <Image source={{ uri: selected.url }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
            ) : selected && !documentError ? (
              <WebView
                source={{ uri: documentUrl }}
                startInLoadingState
                renderLoading={() => <ActivityIndicator size="large" color={theme.portal.primary} />}
                onError={() => setDocumentError(true)}
                onHttpError={event => { if (event.nativeEvent.statusCode >= 400) setDocumentError(true); }}
              />
            ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <MaterialCommunityIcons name="file-alert-outline" size={42} color={theme.portal.muted} />
                <Text style={{ marginTop: 12, color: theme.portal.text, textAlign: 'center' }}>
                  Não foi possível exibir este arquivo no aplicativo.
                </Text>
              </View>
            )}
          </Preview>
        </Viewer>
      </Overlay>
    </Modal>
  </>;
}
