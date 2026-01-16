import { useState } from "react";
import { PageHeader } from "@/components/dispatch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";
import { 
  Copy, 
  Check, 
  Send, 
  MessageSquare, 
  Wifi, 
  WifiOff, 
  Activity, 
  User,
  Code2,
  ExternalLink
} from "lucide-react";

const BASE_URL = "https://btvzspqcnzcslkdtddwl.supabase.co/functions/v1";

const eventTypes = [
  { 
    id: "message_sent", 
    icon: Send, 
    color: "text-green-500",
    example: {
      event_type: "message_sent",
      instance_id: "instance-abc123",
      provider: "Z-API",
      data: {
        message_id: "msg_12345",
        to: "5511999999999",
        content: "Olá! Como posso ajudar?",
        timestamp: "2024-01-15T10:30:00Z"
      }
    }
  },
  { 
    id: "message_received", 
    icon: MessageSquare, 
    color: "text-blue-500",
    example: {
      event_type: "message_received",
      instance_id: "instance-abc123",
      provider: "Z-API",
      data: {
        message_id: "msg_67890",
        from: "5511888888888",
        content: "Preciso de suporte",
        timestamp: "2024-01-15T10:31:00Z"
      }
    }
  },
  { 
    id: "connected", 
    icon: Wifi, 
    color: "text-emerald-500",
    example: {
      event_type: "connected",
      instance_id: "instance-abc123",
      provider: "Evolution API",
      data: {
        phone_number: "5511999999999",
        connected_at: "2024-01-15T08:00:00Z"
      }
    }
  },
  { 
    id: "disconnected", 
    icon: WifiOff, 
    color: "text-red-500",
    example: {
      event_type: "disconnected",
      instance_id: "instance-abc123",
      provider: "Evolution API",
      data: {
        reason: "session_expired",
        disconnected_at: "2024-01-15T20:00:00Z"
      }
    }
  },
  { 
    id: "message_status", 
    icon: Activity, 
    color: "text-orange-500",
    example: {
      event_type: "message_status",
      instance_id: "instance-abc123",
      provider: "Z-API",
      data: {
        message_id: "msg_12345",
        status: "delivered",
        updated_at: "2024-01-15T10:30:05Z"
      }
    }
  },
  { 
    id: "chat_presence", 
    icon: User, 
    color: "text-purple-500",
    example: {
      event_type: "chat_presence",
      instance_id: "instance-abc123",
      provider: "Z-API",
      data: {
        contact: "5511888888888",
        presence: "typing",
        timestamp: "2024-01-15T10:32:00Z"
      }
    }
  },
];

export default function ApiDocs() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    toast({
      title: t("apiDocs.copied"),
      description: text.length > 50 ? text.substring(0, 50) + "..." : text,
    });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const webhookUrl = `${BASE_URL}/webhook-provider`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("apiDocs.title")}
        description={t("apiDocs.description")}
      />

      {/* Base URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            {t("apiDocs.baseUrl")}
          </CardTitle>
          <CardDescription>
            {t("apiDocs.baseUrlDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
            <code className="flex-1 break-all">{BASE_URL}</code>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(BASE_URL, "base")}
            >
              {copiedUrl === "base" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Endpoint Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            {t("apiDocs.endpoints")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600">POST</Badge>
              <code className="font-mono text-sm">/webhook-provider</code>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("apiDocs.webhookDescription")}
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
              <code className="flex-1 break-all">{webhookUrl}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(webhookUrl, "webhook")}
              >
                {copiedUrl === "webhook" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tipos de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle>{t("apiDocs.eventTypes")}</CardTitle>
          <CardDescription>
            {t("apiDocs.eventTypesDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {eventTypes.map((event) => (
              <div
                key={event.id}
                className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <event.icon className={`h-6 w-6 ${event.color}`} />
                <code className="text-xs font-mono text-center">{event.id}</code>
                <span className="text-xs text-muted-foreground text-center">
                  {t(`apiDocs.${event.id}`)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exemplos de Payload */}
      <Card>
        <CardHeader>
          <CardTitle>{t("apiDocs.payloadExamples")}</CardTitle>
          <CardDescription>
            {t("apiDocs.payloadExamplesDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="message_sent">
            <TabsList className="flex flex-wrap h-auto gap-1">
              {eventTypes.map((event) => (
                <TabsTrigger key={event.id} value={event.id} className="text-xs">
                  {event.id}
                </TabsTrigger>
              ))}
            </TabsList>
            {eventTypes.map((event) => (
              <TabsContent key={event.id} value={event.id}>
                <div className="relative">
                  <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                    <code>{JSON.stringify(event.example, null, 2)}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(JSON.stringify(event.example, null, 2), event.id)}
                  >
                    {copiedUrl === event.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Autenticação */}
      <Card>
        <CardHeader>
          <CardTitle>{t("apiDocs.authentication")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("apiDocs.authDescription")}
          </p>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">{t("apiDocs.headerExample")}:</p>
            <pre className="text-sm font-mono">
{`Headers:
  Content-Type: application/json
  x-api-secret: YOUR_API_SECRET`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
