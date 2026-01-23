export interface WebhookAction {
  id: string;
  name: string;
  description: string;
}

export interface WebhookCategory {
  id: string;
  name: string;
  description: string;
  defaultUrl: string;
  actions: WebhookAction[];
}

export const webhookCategories: WebhookCategory[] = [
  {
    id: "messages",
    name: "Mensagens",
    description: "Eventos relacionados a envio e recebimento de mensagens",
    defaultUrl: "https://n8n-n8n.nuwfic.easypanel.host/webhook/send_messages",
    actions: [
      { id: "message.sent", name: "message.sent", description: "Mensagem enviada com sucesso" },
      { id: "message.delivered", name: "message.delivered", description: "Mensagem entregue ao destinatário" },
      { id: "message.read", name: "message.read", description: "Mensagem lida pelo destinatário" },
      { id: "message.received", name: "message.received", description: "Mensagem recebida" },
      { id: "message.failed", name: "message.failed", description: "Falha no envio da mensagem" },
    ],
  },
  {
    id: "instance",
    name: "Instância",
    description: "Eventos de status e conexão da instância WhatsApp",
    defaultUrl: "https://n8n-n8n.nuwfic.easypanel.host/webhook/zapi_generate_qrcode",
    actions: [
      { id: "instance.connected", name: "instance.connected", description: "Instância conectada" },
      { id: "instance.disconnected", name: "instance.disconnected", description: "Instância desconectada" },
      { id: "instance.qr_updated", name: "instance.qr_updated", description: "QR Code atualizado" },
      { id: "instance.status_changed", name: "instance.status_changed", description: "Status da instância alterado" },
    ],
  },
  {
    id: "contacts",
    name: "Contatos",
    description: "Eventos relacionados a contatos e números",
    defaultUrl: "",
    actions: [
      { id: "contact.created", name: "contact.created", description: "Novo contato criado" },
      { id: "contact.updated", name: "contact.updated", description: "Contato atualizado" },
      { id: "contact.deleted", name: "contact.deleted", description: "Contato removido" },
    ],
  },
  {
    id: "groups",
    name: "Grupos",
    description: "Eventos de grupos do WhatsApp",
    defaultUrl: "https://n8n-n8n.nuwfic.easypanel.host/webhook/zapi_get_groups",
    actions: [
      { id: "group.created", name: "group.created", description: "Grupo criado" },
      { id: "group.member_joined", name: "group.member_joined", description: "Membro entrou no grupo" },
      { id: "group.member_left", name: "group.member_left", description: "Membro saiu do grupo" },
      { id: "group.message_received", name: "group.message_received", description: "Mensagem recebida no grupo" },
    ],
  },
  {
    id: "campaigns",
    name: "Campanhas",
    description: "Eventos de campanhas de disparo",
    defaultUrl: "",
    actions: [
      { id: "campaign.started", name: "campaign.started", description: "Campanha iniciada" },
      { id: "campaign.completed", name: "campaign.completed", description: "Campanha concluída" },
      { id: "campaign.failed", name: "campaign.failed", description: "Campanha falhou" },
      { id: "campaign.paused", name: "campaign.paused", description: "Campanha pausada" },
    ],
  },
  {
    id: "sequences",
    name: "Sequências",
    description: "Eventos de sequências automatizadas",
    defaultUrl: "",
    actions: [
      { id: "sequence.triggered", name: "sequence.triggered", description: "Sequência disparada" },
      { id: "sequence.step_executed", name: "sequence.step_executed", description: "Etapa da sequência executada" },
      { id: "sequence.completed", name: "sequence.completed", description: "Sequência concluída" },
      { id: "sequence.failed", name: "sequence.failed", description: "Sequência falhou" },
    ],
  },
  {
    id: "moderation",
    name: "Moderação",
    description: "Eventos de moderação de grupos",
    defaultUrl: "",
    actions: [
      { id: "moderation.warning_issued", name: "moderation.warning_issued", description: "Aviso emitido" },
      { id: "moderation.member_banned", name: "moderation.member_banned", description: "Membro banido" },
      { id: "moderation.message_deleted", name: "moderation.message_deleted", description: "Mensagem deletada" },
    ],
  },
  {
    id: "billing",
    name: "Faturamento",
    description: "Eventos de uso e cobrança",
    defaultUrl: "",
    actions: [
      { id: "billing.limit_reached", name: "billing.limit_reached", description: "Limite atingido" },
      { id: "billing.usage_warning", name: "billing.usage_warning", description: "Aviso de uso" },
      { id: "billing.invoice_created", name: "billing.invoice_created", description: "Fatura criada" },
    ],
  },
];
