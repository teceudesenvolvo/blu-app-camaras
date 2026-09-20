import { MaterialCommunityIcons } from "@expo/vector-icons";
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from "react-native";
import styled from "styled-components/native";
import {
  PortalBackground,
  PortalCard,
  PortalScreenHeader,
} from "../components/PortalScaffold";
import { useMobileModules } from "../context/MobileModulesContext";
import { firestore } from "../../services/firebaseConfig";

const Content = styled.View`
  flex: 1;
`;
const Toolbar = styled.View`
  padding: 14px 18px 6px;
`;
const Horizontal = styled(ScrollView).attrs({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: { alignItems: 'center' },
})`
  height: 48px;
  margin-bottom: 10px;
  flex-grow: 0;
`;
const Chip = styled.TouchableOpacity`
  height: 42px;
  align-self: center;
  justify-content: center;
  padding: 0 13px;
  margin-right: 8px;
  border-radius: 12px;
  background-color: ${({ active, theme }) => (active ? theme.portal.primary : theme.portal.card)};
  border-width: 1px;
  border-color: ${({ active, theme }) => (active ? theme.portal.primary : theme.portal.border)};
`;
const ChipText = styled.Text`
  font-size: 12px;
  font-weight: 800;
  color: ${({ active, theme }) => (active ? "#fff" : theme.portal.text)};
`;
const SelectButton = styled.TouchableOpacity`
  min-height: 48px;
  justify-content: center;
  padding: 0 14px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  background-color: ${({ theme }) => theme.portal.card};
`;
const SelectText = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 14px;
  font-weight: 800;
`;
const Card = styled.TouchableOpacity`
  margin: 6px 18px;
  padding: 16px;
  border-radius: 14px;
  background-color: ${({ theme }) => theme.portal.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
`;
const Row = styled.View`
  flex-direction: row;
  align-items: center;
`;
const Info = styled.View`
  flex: 1;
  margin-left: 12px;
`;
const Title = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 15px;
  font-weight: 900;
`;
const Detail = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 12px;
  margin-top: 4px;
`;
const Empty = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  text-align: center;
  margin: 36px 24px;
  line-height: 22px;
`;
const DetailCard = styled(PortalCard)`
  margin: 18px;
`;
const Label = styled.Text`
  color: ${({ theme }) => theme.portal.muted};
  font-size: 12px;
  font-weight: 800;
  margin-top: 14px;
`;
const Value = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 15px;
  line-height: 22px;
  margin-top: 4px;
`;
const Tabs = styled.View`
  flex-direction: row;
  padding: 14px 18px 0;
`;
const Tab = styled.TouchableOpacity`
  padding: 11px 15px;
  margin-right: 8px;
  border-radius: 10px;
  background-color: ${({ active, theme }) => (active ? theme.portal.primary : theme.portal.card)};
`;
const TabText = styled.Text`
  color: ${({ active, theme }) => (active ? "#fff" : theme.portal.text)};
  font-size: 13px;
  font-weight: 900;
`;
const MessageRow = styled.View`
  padding: 13px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.portal.border};
`;
const ModalPanel = styled.View`
  background-color: ${({ theme }) => theme.portal.card};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  padding: 16px;
  max-height: 72%;
`;

const STATUSES = [
  "Todos",
  "Recebida",
  "Aguardando Análise",
  "Em análise",
  "Agendamento Liberado",
  "Agendado",
  "Concluída",
  "Não Classificado",
];
const dateOf = (item) =>
  item.dataSolicitacao?.toDate
    ? item.dataSolicitacao.toDate()
    : new Date(item.dataSolicitacao || item.createdAt || 0);
const formatDate = (item) => {
  const date = dateOf(item);
  return Number.isNaN(date.getTime())
    ? "Data não informada"
    : date.toLocaleString("pt-BR");
};
const requestData = (item) =>
  item.dadosSolicitacao || item.solicitacao || item.request || item;
const userData = (item) =>
  item.dadosUsuario ||
  item.usuario ||
  item.userDataAtTimeOfRequest ||
  item.userData ||
  item;
const messageText = (item) =>
  item.text || item.message || item.texto || item.conteudo || "";
const messageDate = (item) =>
  item.criadoEm?.toDate ? item.criadoEm.toDate().toLocaleString("pt-BR") : "";

export default function AdminGabineteScreen({ navigation }) {
  const { canUseAdminApp } = useMobileModules();
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [memberId, setMemberId] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [tab, setTab] = useState("demandas");
  const [status, setStatus] = useState("Todos");
  const [selected, setSelected] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [demandMessage, setDemandMessage] = useState("");

  useEffect(() => {
    if (!canUseAdminApp("agendaVereadores")) return undefined;
    const stops = [
      onSnapshot(collection(firestore, "vereadores"), (snapshot) =>
        setMembers(snapshot.docs.map((row) => ({ id: row.id, ...row.data() }))),
      ),
      onSnapshot(
        collection(firestore, "solicitacoes-vereadores"),
        (snapshot) => {
          setRequests(
            snapshot.docs.map((row) => ({ id: row.id, ...row.data() })),
          );
          setLoading(false);
        },
        () => setLoading(false),
      ),
      onSnapshot(collection(firestore, "gabinetes-mensagens"), (snapshot) =>
        setMessages(
          snapshot.docs.map((row) => ({ id: row.id, ...row.data() })),
        ),
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [canUseAdminApp]);

  const member = members.find((item) => (item.userId || item.id) === memberId);
  const memberName = (item) => item?.name || item?.nome || "Vereador(a)";
  const selectedRequests = useMemo(
    () =>
      requests
        .filter(
          (item) =>
            (item.gabineteId || requestData(item).vereadorId) === memberId &&
            (status === "Todos" ||
              (item.status || "Não Classificado") === status),
        )
        .sort((a, b) => dateOf(b) - dateOf(a)),
    [requests, memberId, status],
  );
  const selectedMessages = useMemo(
    () =>
      messages
        .filter((item) => item.gabineteId === memberId)
        .sort(
          (a, b) =>
            (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0),
        ),
    [messages, memberId],
  );
  const conversations = useMemo(() => {
    const grouped = selectedMessages.reduce((result, item) => {
      const key =
        item.userId ||
        item.autorId ||
        item.email ||
        item.nomeUsuario ||
        item.id;
      const current = result[key] || { id: key, messages: [] };
      current.messages.push(item);
      result[key] = current;
      return result;
    }, {});
    return Object.values(grouped).sort(
      (a, b) =>
        (b.messages[0]?.criadoEm?.toMillis?.() || 0) -
        (a.messages[0]?.criadoEm?.toMillis?.() || 0),
    );
  }, [selectedMessages]);
  const updateDemand = async updates => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(firestore, "solicitacoes-vereadores", selected.id), { ...updates, ultimaAtualizacao: serverTimestamp() });
      setSelected(current => ({ ...current, ...updates }));
      setRequests(current => current.map(item => item.id === selected.id ? { ...item, ...updates } : item));
    } catch (error) {
      console.error("Erro ao atualizar demanda do gabinete:", error);
    } finally {
      setSaving(false);
    }
  };
  const sendDemandMessage = async () => {
    if (!selected || !demandMessage.trim() || saving) return;
    const id = "admin-" + Date.now();
    const messagesUpdate = { ...selected.messages, [id]: { text: demandMessage.trim(), sender: "admin", autorTipo: "admin", timestamp: new Date().toISOString(), readByUser: false } };
    setSaving(true);
    try {
      await updateDoc(doc(firestore, "solicitacoes-vereadores", selected.id), { messages: messagesUpdate, ultimaAtualizacao: serverTimestamp() });
      setSelected(current => ({ ...current, messages: messagesUpdate }));
      setRequests(current => current.map(item => item.id === selected.id ? { ...item, messages: messagesUpdate } : item));
      setDemandMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem da demanda:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!canUseAdminApp("agendaVereadores"))
    return (
      <PortalBackground>
        <PortalScreenHeader
          navigation={navigation}
          title="Acesso indisponível"
        />
      </PortalBackground>
    );
  if (selectedConversation) {
    const conversationMessages = [...selectedConversation.messages].sort(
      (a, b) =>
        (a.criadoEm?.toMillis?.() || 0) - (b.criadoEm?.toMillis?.() || 0),
    );
    const firstMessage = conversationMessages[0] || {};
    return (
      <PortalBackground>
        <PortalScreenHeader
          navigation={{ goBack: () => setSelectedConversation(null) }}
          eyebrow="Mensagens do gabinete"
          title={firstMessage.nomeUsuario || firstMessage.email || "Conversa"}
          subtitle={
            member
              ? "Gabinete de " + memberName(member)
              : "Histórico da conversa"
          }
        />
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36 }}>
          <DetailCard>
            <Label>Participante</Label>
            <Value>
              {firstMessage.nomeUsuario ||
                firstMessage.email ||
                "Cidadão não identificado"}
            </Value>
            <Label>Mensagens</Label>
            {conversationMessages.map((item) => (
              <MessageRow key={item.id}>
                <Value>{messageText(item) || "Mensagem sem conteúdo"}</Value>
                <Label>
                  {item.autorTipo === "admin" ? "Gabinete" : "Cidadão"}{" "}
                  {messageDate(item) ? "· " + messageDate(item) : ""}
                </Label>
              </MessageRow>
            ))}
          </DetailCard>
        </ScrollView>
      </PortalBackground>
    );
  }
  if (selected) {
    const data = requestData(selected);
    const user = userData(selected);
    return (
      <PortalBackground>
        <PortalScreenHeader
          navigation={{ goBack: () => setSelected(null) }}
          eyebrow="Área administrativa"
          title="Detalhes da demanda"
          subtitle={selected.protocolo || selected.id}
        />
        <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
          <DetailCard>
            <Label>Solicitante</Label>
            <Value>
              {user.name || user.nome || user.email || "Não informado"}
            </Value>
            <Label>Assunto</Label>
            <Value>{data.assunto || data.categoria || "Não informado"}</Value>
            <Label>Descrição</Label>
            <Value>
              {data.descricao || data.description || "Não informado"}
            </Value>
            <Label>Endereço da demanda</Label>
            <Value>{data.endereco || "Não informado"}</Value>
            <Label>Situação</Label>
            <Value>{selected.status || "Não Classificado"}</Value>
            <Label>Atualizar situação</Label>
            <Horizontal style={{ marginTop: 8 }}>
              {STATUSES.slice(1).map(item => <Chip key={item} active={(selected.status || "Não Classificado") === item} disabled={saving} onPress={() => updateDemand({ status: item })}><ChipText active={(selected.status || "Não Classificado") === item}>{item}</ChipText></Chip>)}
            </Horizontal>
            <Label>Data da solicitação</Label>
            <Value>{formatDate(selected)}</Value>
            {selected.fotos?.length ? (
              <>
                <Label>Imagens anexadas</Label>
                <Value>{selected.fotos.length} imagem(ns) anexada(s)</Value>
              </>
            ) : null}
            <Label>Mensagem para o cidadão</Label>
            <TextInput multiline value={demandMessage} onChangeText={setDemandMessage} placeholder="Digite uma mensagem sobre esta demanda..." placeholderTextColor="#94a3b8" style={{ minHeight: 84, marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#334155", backgroundColor: "#102536", color: "#f8fafc", textAlignVertical: "top" }} />
            <Pressable disabled={saving || !demandMessage.trim()} onPress={sendDemandMessage} style={{ marginTop: 10, padding: 12, alignItems: "center", borderRadius: 11, backgroundColor: "#0284c7", opacity: saving || !demandMessage.trim() ? 0.5 : 1 }}><Text style={{ color: "#fff", fontWeight: "900" }}>{saving ? "Enviando..." : "Enviar mensagem"}</Text></Pressable>
          </DetailCard>
        </ScrollView>
      </PortalBackground>
    );
  }

  return (
    <PortalBackground>
      <PortalScreenHeader
        navigation={navigation}
        eyebrow="Área administrativa"
        title="Gabinete do Vereador"
        subtitle="Acompanhe demandas e mensagens de cada gabinete."
      />
      <Content>
        <Toolbar>
          <SelectButton
            onPress={() => setPickerVisible(true)}
            disabled={!members.length}
          >
            <SelectText>
              {member
                ? `Gabinete de ${memberName(member)}`
                : members.length
                  ? "Selecione um gabinete"
                  : "Nenhum vereador disponível"}
            </SelectText>
          </SelectButton>
          <Modal
            visible={pickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setPickerVisible(false)}
          >
            <Pressable
              onPress={() => setPickerVisible(false)}
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.55)",
                justifyContent: "center",
                padding: 24,
              }}
            >
              <Pressable onPress={(event) => event.stopPropagation()}>
                <ModalPanel>
                  <Text
                    style={{
                      color: "#94a3b8",
                      fontSize: 12,
                      fontWeight: "800",
                      marginBottom: 10,
                    }}
                  >
                    SELECIONE O GABINETE
                  </Text>
                  <ScrollView>
                    {members.map((item) => {
                      const id = item.userId || item.id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => {
                            setMemberId(id);
                            setPickerVisible(false);
                            setStatus("Todos");
                          }}
                          style={{
                            paddingVertical: 15,
                            borderBottomWidth: 1,
                            borderBottomColor: "#334155",
                          }}
                        >
                          <Text
                            style={{
                              color: "#f8fafc",
                              fontSize: 15,
                              fontWeight: "800",
                            }}
                          >
                            {memberName(item)}
                          </Text>
                          {item.partido ? (
                            <Text style={{ color: "#94a3b8", marginTop: 3 }}>
                              {item.partido}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </ModalPanel>
              </Pressable>
            </Pressable>
          </Modal>
        </Toolbar>
        {!memberId ? (
          <Empty>
            Selecione um gabinete para consultar suas demandas e mensagens.
          </Empty>
        ) : (
          <>
            <Tabs>
              <Tab
                active={tab === "demandas"}
                onPress={() => setTab("demandas")}
              >
                <TabText active={tab === "demandas"}>
                  Demandas ({selectedRequests.length})
                </TabText>
              </Tab>
              <Tab
                active={tab === "mensagens"}
                onPress={() => setTab("mensagens")}
              >
                <TabText active={tab === "mensagens"}>
                  Mensagens ({selectedMessages.length})
                </TabText>
              </Tab>
            </Tabs>
            {tab === "demandas" ? (
              <>
                <Horizontal style={{ marginLeft: 18, marginTop: 12 }}>
                  {STATUSES.map((item) => (
                    <Chip
                      key={item}
                      active={status === item}
                      onPress={() => setStatus(item)}
                    >
                      <ChipText active={status === item}>{item}</ChipText>
                    </Chip>
                  ))}
                </Horizontal>
                <FlatList
                  data={selectedRequests}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 36 }}
                  ListEmptyComponent={
                    <Empty>
                      Nenhuma demanda encontrada para este gabinete.
                    </Empty>
                  }
                  renderItem={({ item }) => {
                    const data = requestData(item);
                    const user = userData(item);
                    return (
                      <Card onPress={() => setSelected(item)}>
                        <Row>
                          <MaterialCommunityIcons
                            name="account-question-outline"
                            size={29}
                            color="#0284C7"
                          />
                          <Info>
                            <Title>
                              {data.assunto ||
                                data.categoria ||
                                "Demanda sem assunto"}
                            </Title>
                            <Detail>
                              Solicitante:{" "}
                              {user.name ||
                                user.nome ||
                                user.email ||
                                "Não informado"}
                            </Detail>
                            <Detail>
                              {item.status || "Não Classificado"} ·{" "}
                              {formatDate(item)}
                            </Detail>
                          </Info>
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={22}
                            color="#94a3b8"
                          />
                        </Row>
                      </Card>
                    );
                  }}
                />
                {loading ? (
                  <ActivityIndicator style={{ marginTop: 12 }} />
                ) : null}
              </>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
                {!conversations.length ? (
                  <Empty>Nenhuma conversa encontrada para este gabinete.</Empty>
                ) : (
                  conversations.map((conversation) => {
                    const latest =
                      conversation.messages[conversation.messages.length - 1] ||
                      {};
                    return (
                      <Card
                        key={conversation.id}
                        onPress={() => setSelectedConversation(conversation)}
                      >
                        <Row>
                          <MaterialCommunityIcons
                            name="message-text-outline"
                            size={29}
                            color="#0284C7"
                          />
                          <Info>
                            <Title>
                              {latest.nomeUsuario ||
                                latest.email ||
                                "Cidadão não identificado"}
                            </Title>
                            <Detail>
                              {messageText(latest) || "Mensagem sem conteúdo"}
                            </Detail>
                            <Detail>
                              {conversation.messages.length} mensagem(ns){" "}
                              {messageDate(latest)
                                ? "· " + messageDate(latest)
                                : ""}
                            </Detail>
                          </Info>
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={22}
                            color="#94a3b8"
                          />
                        </Row>
                      </Card>
                    );
                  })
                )}
              </ScrollView>
            )}
          </>
        )}
      </Content>
    </PortalBackground>
  );
}
