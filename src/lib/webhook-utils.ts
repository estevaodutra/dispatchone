/**
 * Webhook utilities for building standardized payloads
 */

// Standardized payload structure for all webhook calls
export interface StandardizedPayload {
  action: string;
  node: {
    id: string;
    type: string;
    order: number;
    config: Record<string, unknown>;
  };
  campaign: {
    id: string;
    name: string;
  };
  instance: {
    id: string;
    name: string;
    phone: string;
    provider: string;
    externalId: string;
    externalToken: string;
  };
  destination: {
    phone: string;
    jid: string;
    name: string;
  };
}

// Input params for building standard payload
export interface StandardPayloadParams {
  action: string;
  node: {
    id: string;
    type: string;
    order: number;
    config: Record<string, unknown>;
  };
  campaign: {
    id: string;
    name: string;
  };
  instance: {
    id: string;
    name: string;
    phone: string;
    provider: string;
    externalId: string;
    externalToken: string;
  };
  destination: {
    jid: string;
    name: string;
  };
}

/**
 * Builds a standardized webhook payload with the new unified structure.
 * This is the primary function for sending messages.
 */
export function buildStandardPayload(params: StandardPayloadParams): StandardizedPayload {
  return {
    action: params.action,
    node: {
      id: params.node.id,
      type: params.node.type,
      order: params.node.order,
      config: params.node.config,
    },
    campaign: {
      id: params.campaign.id,
      name: params.campaign.name,
    },
    instance: {
      id: params.instance.id,
      name: params.instance.name,
      phone: params.instance.phone,
      provider: params.instance.provider,
      externalId: params.instance.externalId,
      externalToken: params.instance.externalToken,
    },
    destination: {
      phone: params.destination.jid,
      jid: params.destination.jid,
      name: params.destination.name,
    },
  };
}

/**
 * Maps node types to webhook actions
 */
export const NODE_TYPE_TO_ACTION: Record<string, string> = {
  text: "message.send_text",
  message: "message.send_text",
  media: "message.send_media",
  image: "message.send_image",
  video: "message.send_video",
  audio: "message.send_audio",
  document: "message.send_document",
  buttons: "message.send_buttons",
  list: "message.send_list",
  poll: "message.send_poll",
  sticker: "message.send_sticker",
  location: "message.send_location",
  contact: "message.send_contact",
  reaction: "message.send_reaction",
};

/**
 * Gets the webhook action for a given node type
 */
export function getActionForNodeType(nodeType: string): string {
  return NODE_TYPE_TO_ACTION[nodeType] || `message.send_${nodeType}`;
}

// ============= Legacy support (can be removed after full migration) =============

export interface WebhookPayload {
  action: string;
  body: Record<string, unknown>;
  webhookUrl: string;
  executionMode: "production" | "test";
  timestamp: string;
}

/**
 * @deprecated Use buildStandardPayload instead
 * Builds a legacy webhook payload - kept for backward compatibility
 */
export function buildWebhookPayload(
  action: string,
  body: Record<string, unknown>,
  webhookUrl: string,
  mode: "production" | "test" = "production"
): WebhookPayload {
  return {
    action,
    body,
    webhookUrl,
    executionMode: mode,
    timestamp: new Date().toISOString(),
  };
}
