/**
 * Webhook utilities for building standardized payloads
 */

export interface WebhookPayload {
  action: string;
  body: Record<string, unknown>;
  webhookUrl: string;
  executionMode: "production" | "test";
  timestamp: string;
}

/**
 * Builds a standardized webhook payload with action routing
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

/**
 * Maps node types to webhook actions
 */
export const NODE_TYPE_TO_ACTION: Record<string, string> = {
  text: "message.send_text",
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
};

/**
 * Gets the webhook action for a given node type
 */
export function getActionForNodeType(nodeType: string): string {
  return NODE_TYPE_TO_ACTION[nodeType] || `message.send_${nodeType}`;
}
