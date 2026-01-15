import { useState, useEffect } from "react";
import { PageHeader, StatusBadge, HealthBar, AlertBanner } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Settings, RefreshCw, ExternalLink, CheckCircle, XCircle, Plus, Loader2, Trash2, Radio, Shield, Eye, GitBranch, Pencil, QrCode, Phone, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";

// Mock data
type InstanceFunction = "dispatcher" | "admin" | "spy" | "funnel";

interface Instance {
  id: string;
  name: string;
  provider: "Z-API" | "Evolution API" | "Meta Business API";
  function: InstanceFunction;
  status: "connected" | "disconnected" | "qrPending";
  health: number;
  dispatches: number;
  lastCheck: string;
  connectedNumber?: string;
  features: string[];
  documentation: string;
  phoneNumber?: string;
}

const initialInstances: Instance[] = [
  {
    id: "1",
    name: "Vendas Principal",
    provider: "Z-API",
    function: "dispatcher",
    status: "connected",
    health: 98,
    dispatches: 12500,
    lastCheck: "2 min ago",
    connectedNumber: "+55 11 99999-1234",
    features: ["Text", "Media", "Templates", "Webhooks"],
    documentation: "https://developer.z-api.io",
  },
  {
    id: "2",
    name: "Suporte",
    provider: "Evolution API",
    function: "funnel",
    status: "connected",
    health: 95,
    dispatches: 8200,
    lastCheck: "1 min ago",
    connectedNumber: "+55 11 98888-5678",
    features: ["Text", "Media", "Groups", "Status"],
    documentation: "https://doc.evolution-api.com",
  },
  {
    id: "3",
    name: "Marketing",
    provider: "Z-API",
    function: "admin",
    status: "qrPending",
    health: 0,
    dispatches: 0,
    lastCheck: "Never",
    features: ["Text", "Media", "Templates"],
    documentation: "https://developer.z-api.io",
  },
  {
    id: "4",
    name: "Meta Oficial",
    provider: "Meta Business API",
    function: "spy",
    status: "disconnected",
    health: 0,
    dispatches: 0,
    lastCheck: "Never",
    features: ["Official API", "Templates", "Analytics"],
    documentation: "https://developers.facebook.com/docs/whatsapp",
  },
];

// Função para formatar número de telefone brasileiro
const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  const limited = numbers.slice(0, 13);
  
  if (limited.length === 0) return "";
  if (limited.length <= 2) return `+${limited}`;
  if (limited.length <= 4) return `+${limited.slice(0, 2)} (${limited.slice(2)}`;
  if (limited.length <= 9) return `+${limited.slice(0, 2)} (${limited.slice(2, 4)}) ${limited.slice(4)}`;
  return `+${limited.slice(0, 2)} (${limited.slice(2, 4)}) ${limited.slice(4, 9)}-${limited.slice(9)}`;
};

const STORAGE_KEY = "whatsapp-instances";

const getInitialInstances = (): Instance[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return initialInstances;
    }
  }
  return initialInstances;
};

export default function Instances() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [instances, setInstances] = useState<Instance[]>(getInitialInstances);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [instanceToDelete, setInstanceToDelete] = useState<Instance | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDisconnectedAlert, setShowDisconnectedAlert] = useState(true);
  const [configForm, setConfigForm] = useState({
    apiKey: "",
    webhookUrl: "",
    instanceId: "",
  });
  const [newInstance, setNewInstance] = useState({
    name: "",
    provider: "Z-API" as Instance["provider"],
    function: "dispatcher" as InstanceFunction,
    phoneNumber: "",
  });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editInstance, setEditInstance] = useState<{
    id: string;
    name: string;
    provider: Instance["provider"];
    function: InstanceFunction;
    phoneNumber: string;
  } | null>(null);
  const [connectionStep, setConnectionStep] = useState<"select" | "qr" | "phone">("select");
  const [phoneForConnection, setPhoneForConnection] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<{
    value?: string;      // Base64 do QR Code (formato real da API)
    qrCode?: string;
    qrCodeUrl?: string;
    sessionId?: string;
    expiresAt?: string;
    message?: string;
  } | null>(null);

  const triggerConnectionWebhook = async (method: "qr" | "phone") => {
    if (!selectedInstance) return;

    const webhookUrl = "https://n8n-n8n.nuwfic.easypanel.host/webhook/zapi_generate_qrcode";

    setIsConnecting(true);
    setWebhookResponse(null);
    
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceId: selectedInstance.id,
          instanceName: selectedInstance.name,
          provider: selectedInstance.provider,
          function: selectedInstance.function,
          connectionMethod: method,
          timestamp: new Date().toISOString(),
          origin: window.location.origin,
          phoneNumber: method === "phone" ? phoneForConnection : undefined,
        }),
      });

      const data = await response.json();
      console.log("Webhook response:", data);
      
      // Normalizar resposta - pode ser array ou objeto
      let normalizedData = data;
      if (Array.isArray(data) && data.length > 0) {
        normalizedData = data[0];
      }
      
      setWebhookResponse(normalizedData);
      return normalizedData;
    } catch (error) {
      console.error("Error triggering webhook:", error);
      toast({
        title: t("common.error"),
        description: "Falha ao conectar com o servidor. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  // Persist instances to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
  }, [instances]);

  const getFunctionIcon = (fn: InstanceFunction) => {
    switch (fn) {
      case "dispatcher": return <Radio className="h-3.5 w-3.5" />;
      case "admin": return <Shield className="h-3.5 w-3.5" />;
      case "spy": return <Eye className="h-3.5 w-3.5" />;
      case "funnel": return <GitBranch className="h-3.5 w-3.5" />;
    }
  };

  const getFunctionLabel = (fn: InstanceFunction) => {
    switch (fn) {
      case "dispatcher": return t("instances.functionDispatcher");
      case "admin": return t("instances.functionAdmin");
      case "spy": return t("instances.functionSpy");
      case "funnel": return t("instances.functionFunnel");
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
    toast({
      title: t("instances.statusRefreshed"),
      description: t("instances.statusRefreshed"),
    });
  };

  const handleConfigure = (instance: Instance) => {
    setSelectedInstance(instance);
    setConfigForm({
      apiKey: "",
      webhookUrl: "",
      instanceId: "",
    });
    setShowConfigDialog(true);
  };

  const handleConnect = (instance: Instance) => {
    setSelectedInstance(instance);
    setConnectionStep("select");
    setPhoneForConnection("");
    setShowConfigDialog(true);
  };

  const handleCloseConnectionDialog = () => {
    setShowConfigDialog(false);
    setConnectionStep("select");
    setPhoneForConnection("");
    setWebhookResponse(null);
  };

  const handleConnectWithPhone = async () => {
    if (!phoneForConnection) {
      toast({
        title: t("common.error"),
        description: t("instances.phoneNumber") + " " + t("common.required").toLowerCase(),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (selectedInstance) {
      setInstances((prev) =>
        prev.map((inst) =>
          inst.id === selectedInstance.id
            ? {
                ...inst,
                status: "connected" as const,
                health: 100,
                lastCheck: "Just now",
                connectedNumber: phoneForConnection,
              }
            : inst
        )
      );
    }

    setIsSaving(false);
    handleCloseConnectionDialog();
    toast({
      title: t("instances.instanceConnected"),
      description: `${selectedInstance?.name} ${t("instances.instanceConnected").toLowerCase()}.`,
    });
  };

  const handleSaveConfig = async () => {
    if (!configForm.apiKey) {
      toast({
        title: t("common.error"),
        description: t("instances.apiKey") + " " + t("common.required").toLowerCase(),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (selectedInstance) {
      setInstances((prev) =>
        prev.map((inst) =>
          inst.id === selectedInstance.id
            ? {
                ...inst,
                status: "connected" as const,
                health: 100,
                lastCheck: "Just now",
                connectedNumber: "+55 11 97777-0000",
              }
            : inst
        )
      );
    }

    setIsSaving(false);
    setShowConfigDialog(false);
    toast({
      title: selectedInstance?.status === "connected" ? t("instances.configSaved") : t("instances.instanceConnected"),
      description: `${selectedInstance?.name} ${selectedInstance?.status === "connected" ? t("instances.configSaved").toLowerCase() : t("instances.instanceConnected").toLowerCase()}.`,
    });
  };

  const handleAddInstance = async () => {
    if (!newInstance.name) {
      toast({
        title: t("common.error"),
        description: t("instances.instanceName") + " " + t("common.required").toLowerCase(),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const instance: Instance = {
      id: String(Date.now()),
      name: newInstance.name,
      provider: newInstance.provider,
      function: newInstance.function,
      status: "qrPending",
      health: 0,
      dispatches: 0,
      lastCheck: "Just now",
      features: ["Text", "Media"],
      documentation: newInstance.provider === "Z-API" ? "https://developer.z-api.io" : "https://doc.evolution-api.com",
      phoneNumber: newInstance.provider === "Z-API" ? newInstance.phoneNumber : undefined,
    };

    setInstances((prev) => [...prev, instance]);
    setIsSaving(false);
    setShowAddDialog(false);
    setNewInstance({ name: "", provider: "Z-API", function: "dispatcher", phoneNumber: "" });

    toast({
      title: t("instances.instanceAdded"),
      description: `${instance.name} - ${t("instances.scanQR")}`,
    });
  };

  const handleDeleteInstance = () => {
    if (instanceToDelete) {
      setInstances((prev) => prev.filter((inst) => inst.id !== instanceToDelete.id));
      setShowDeleteDialog(false);
      toast({
        title: t("instances.instanceDeleted"),
        description: `${instanceToDelete.name} ${t("instances.instanceDeletedDescription")}`,
      });
      setInstanceToDelete(null);
    }
  };

  const handleEditClick = (instance: Instance) => {
    setEditInstance({
      id: instance.id,
      name: instance.name,
      provider: instance.provider,
      function: instance.function,
      phoneNumber: (instance as any).phoneNumber || "",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editInstance?.name) {
      toast({
        title: t("common.error"),
        description: t("instances.instanceName") + " " + t("common.required").toLowerCase(),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === editInstance.id
          ? {
              ...inst,
              name: editInstance.name,
              provider: editInstance.provider,
              function: editInstance.function,
              ...(editInstance.provider === "Z-API" ? { phoneNumber: editInstance.phoneNumber } : {}),
            }
          : inst
      )
    );

    setIsSaving(false);
    setShowEditDialog(false);
    toast({
      title: t("instances.instanceUpdated"),
      description: `${editInstance.name} ${t("instances.instanceUpdatedDescription")}`,
    });
    setEditInstance(null);
  };

  const disconnectedInstances = instances.filter((inst) => inst.status === "disconnected");

  const getStatusDisplay = (status: Instance["status"]) => {
    switch (status) {
      case "connected":
        return "connected";
      case "disconnected":
        return "disconnected";
      case "qrPending":
        return "pending";
      default:
        return "pending";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={t("instances.title")}
        description={t("instances.description")}
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? t("instances.refreshing") : t("instances.refreshStatus")}
          </Button>
        }
      />

      <Tabs defaultValue="whatsapp" className="space-y-6">
        <TabsList>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            {t("instances.whatsapp")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            {t("instances.settings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-6">
          {/* Alert for disconnected instances */}
          {disconnectedInstances.length > 0 && showDisconnectedAlert && (
            <AlertBanner
              variant="warning"
              title={t("instances.instanceDisconnected")}
              description={`${disconnectedInstances[0].name} ${t("instances.instanceDisconnectedDescription")}`}
              dismissible
              onDismiss={() => setShowDisconnectedAlert(false)}
            />
          )}

          {/* Instance Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {instances.map((instance) => (
              <Card key={instance.id} className="shadow-elevation-sm hover:shadow-elevation-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        instance.status === "connected" ? "bg-success/15" : instance.status === "qrPending" ? "bg-warning/15" : "bg-muted"
                      }`}
                    >
                      {instance.status === "connected" ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : instance.status === "qrPending" ? (
                        <MessageSquare className="h-5 w-5 text-warning" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{instance.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {instance.provider}
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          {getFunctionIcon(instance.function)}
                          {getFunctionLabel(instance.function)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={getStatusDisplay(instance.status)} />
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Connected Number */}
                  {instance.connectedNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("instances.connectedNumber")}</p>
                      <p className="font-mono text-sm font-medium">{instance.connectedNumber}</p>
                    </div>
                  )}

                  {/* Health & Stats */}
                  {instance.status === "connected" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t("instances.health")}</p>
                          <HealthBar value={instance.health} size="sm" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t("instances.dispatches")}</p>
                          <p className="font-mono text-sm font-semibold">
                            {instance.dispatches.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {t("instances.lastCheck")}: {instance.lastCheck}
                      </div>
                    </>
                  )}

                  {/* QR Pending Message */}
                  {instance.status === "qrPending" && (
                    <div className="rounded-lg bg-warning/10 p-3 text-center">
                      <p className="text-sm text-warning font-medium">{t("instances.scanQR")}</p>
                    </div>
                  )}

                  {/* Features */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t("instances.features")}</p>
                    <div className="flex flex-wrap gap-1">
                      {instance.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs font-normal">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    {instance.status === "qrPending" ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleConfigure(instance)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        {t("instances.viewQR")}
                      </Button>
                    ) : (
                      <Button
                        variant={instance.status === "connected" ? "outline" : "default"}
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() =>
                          instance.status === "connected"
                            ? handleConfigure(instance)
                            : handleConnect(instance)
                        }
                      >
                        <Settings className="h-4 w-4" />
                        {instance.status === "connected" ? t("instances.configure") : t("instances.connect")}
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditClick(instance)}
                      title={t("instances.edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={instance.documentation} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setInstanceToDelete(instance);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Instance */}
          <Card className="border-dashed shadow-elevation-sm">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 rounded-full bg-muted p-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium">{t("instances.addNewInstance")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("instances.connectNewInstance")}
              </p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                {t("instances.addInstance")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("instances.settings")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t("settings.description")}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configure/Connect Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={handleCloseConnectionDialog}>
        <DialogContent>
          <DialogHeader>
            {connectionStep !== "select" && selectedInstance?.status !== "connected" && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-4 p-0 h-auto"
                onClick={() => setConnectionStep("select")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("common.back")}
              </Button>
            )}
            <DialogTitle>
              {selectedInstance?.status === "connected" 
                ? `${t("instances.configureInstance")} - ${selectedInstance?.name}`
                : connectionStep === "select"
                  ? `${t("instances.connectInstance")} - ${selectedInstance?.name}`
                  : connectionStep === "qr"
                    ? t("instances.connectWithQR")
                    : t("instances.connectWithPhone")}
            </DialogTitle>
            <DialogDescription>
              {selectedInstance?.status === "connected"
                ? t("instances.updateConfiguration")
                : connectionStep === "select"
                  ? t("instances.howToConnect")
                  : connectionStep === "qr"
                    ? t("instances.connectWithQRDesc")
                    : t("instances.connectWithPhoneDesc")}
            </DialogDescription>
          </DialogHeader>

          {/* Configure Mode - Show technical fields */}
          {selectedInstance?.status === "connected" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">{t("instances.apiKey")}</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={t("instances.apiKeyPlaceholder")}
                  value={configForm.apiKey}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instanceId">{t("instances.instanceIdOptional")}</Label>
                <Input
                  id="instanceId"
                  placeholder={t("instances.instanceId")}
                  value={configForm.instanceId}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, instanceId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">{t("instances.webhookUrl")} ({t("common.optional")})</Label>
                <Input
                  id="webhookUrl"
                  placeholder="https://your-domain.com/webhook"
                  value={configForm.webhookUrl}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Connect Mode - Step 1: Select Method */}
          {selectedInstance?.status !== "connected" && connectionStep === "select" && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  disabled={isConnecting}
                  onClick={async () => {
                    try {
                      await triggerConnectionWebhook("qr");
                      setConnectionStep("qr");
                    } catch {
                      // Error already handled in triggerConnectionWebhook
                    }
                  }}
                >
                  {isConnecting ? (
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  ) : (
                    <QrCode className="h-5 w-5 mr-3" />
                  )}
                  <div className="text-left">
                    <p className="font-medium">{t("instances.connectWithQR")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("instances.connectWithQRDesc")}
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  disabled={isConnecting}
                  onClick={async () => {
                    try {
                      await triggerConnectionWebhook("phone");
                      setConnectionStep("phone");
                    } catch {
                      // Error already handled in triggerConnectionWebhook
                    }
                  }}
                >
                  {isConnecting ? (
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  ) : (
                    <Phone className="h-5 w-5 mr-3" />
                  )}
                  <div className="text-left">
                    <p className="font-medium">{t("instances.connectWithPhone")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("instances.connectWithPhoneDesc")}
                    </p>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Connect Mode - Step 2A: QR Code */}
          {selectedInstance?.status !== "connected" && connectionStep === "qr" && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/30">
                <div className="w-48 h-48 bg-background border rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  {isConnecting ? (
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                  ) : webhookResponse?.value ? (
                    <img 
                      src={webhookResponse.value} 
                      alt="QR Code" 
                      className="w-full h-full object-contain"
                    />
                  ) : webhookResponse?.qrCode ? (
                    <img 
                      src={webhookResponse.qrCode} 
                      alt="QR Code" 
                      className="w-full h-full object-contain"
                    />
                  ) : webhookResponse?.qrCodeUrl ? (
                    <img 
                      src={webhookResponse.qrCodeUrl} 
                      alt="QR Code" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <QrCode className="h-24 w-24 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {isConnecting 
                    ? "Gerando QR Code..." 
                    : webhookResponse?.message || t("instances.waitingForScan")
                  }
                </p>
              </div>
            </div>
          )}

          {/* Connect Mode - Step 2B: Phone Number */}
          {selectedInstance?.status !== "connected" && connectionStep === "phone" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="connectionPhone">{t("instances.phoneNumber")}</Label>
                <Input
                  id="connectionPhone"
                  placeholder="+55 (11) 99999-9999"
                  value={phoneForConnection}
                  onChange={(e) => setPhoneForConnection(formatPhoneNumber(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {t("instances.phoneNumberHint")}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseConnectionDialog}>
              {t("common.cancel")}
            </Button>
            {selectedInstance?.status === "connected" && (
              <Button onClick={handleSaveConfig} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("instances.saving")}
                  </>
                ) : (
                  t("instances.saveChanges")
                )}
              </Button>
            )}
            {selectedInstance?.status !== "connected" && connectionStep === "qr" && (
              <Button 
                variant="outline" 
                onClick={async () => {
                  try {
                    await triggerConnectionWebhook("qr");
                  } catch {
                    // Error handled
                  }
                }}
                disabled={isConnecting}
              >
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("instances.generateNewQR")}
              </Button>
            )}
            {selectedInstance?.status !== "connected" && connectionStep === "phone" && (
              <Button onClick={handleConnectWithPhone} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("instances.connecting")}
                  </>
                ) : (
                  t("instances.connect")
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Instance Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("instances.addNewInstance")}</DialogTitle>
            <DialogDescription>
              {t("instances.connectNewInstance")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instanceName">{t("instances.instanceName")}</Label>
              <Input
                id="instanceName"
                placeholder={t("instances.instanceNamePlaceholder")}
                value={newInstance.name}
                onChange={(e) => setNewInstance((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">{t("instances.provider")}</Label>
              <Select
                value={newInstance.provider}
                onValueChange={(value) => setNewInstance((prev) => ({ ...prev, provider: value as Instance["provider"] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("instances.selectProvider")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Z-API">Z-API</SelectItem>
                  <SelectItem value="Evolution API">Evolution API</SelectItem>
                  <SelectItem value="Meta Business API">Meta Business API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newInstance.provider === "Z-API" && (
              <div className="space-y-2">
                <Label htmlFor="newPhoneNumber">
                  {t("instances.phoneNumber")}
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({t("instances.optional")})
                  </span>
                </Label>
                <Input
                  id="newPhoneNumber"
                  placeholder="+55 (11) 99999-9999"
                  value={newInstance.phoneNumber}
                  onChange={(e) => setNewInstance((prev) => ({ ...prev, phoneNumber: formatPhoneNumber(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t("instances.phoneNumberHint")}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("instances.function")}</Label>
              <Select
                value={newInstance.function}
                onValueChange={(value: InstanceFunction) =>
                  setNewInstance((prev) => ({ ...prev, function: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("instances.selectFunction")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dispatcher">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionDispatcher")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionDispatcherDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionAdmin")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionAdminDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="spy">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionSpy")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionSpyDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="funnel">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionFunnel")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionFunnelDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddInstance} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("instances.adding")}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("instances.addInstance")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Instance Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("instances.editInstance")}</DialogTitle>
            <DialogDescription>
              {t("instances.editInstanceDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editInstanceName">{t("instances.instanceName")}</Label>
              <Input
                id="editInstanceName"
                placeholder={t("instances.instanceNamePlaceholder")}
                value={editInstance?.name || ""}
                onChange={(e) => setEditInstance((prev) => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editProvider">{t("instances.provider")}</Label>
              <Select
                value={editInstance?.provider || "Z-API"}
                onValueChange={(value) => setEditInstance((prev) => prev ? { ...prev, provider: value as Instance["provider"] } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("instances.selectProvider")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Z-API">Z-API</SelectItem>
                  <SelectItem value="Evolution API">Evolution API</SelectItem>
                  <SelectItem value="Meta Business API">Meta Business API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editInstance?.provider === "Z-API" && (
              <div className="space-y-2">
                <Label htmlFor="editPhoneNumber">
                  {t("instances.phoneNumber")} ({t("instances.optional")})
                </Label>
                <Input
                  id="editPhoneNumber"
                  placeholder="+55 (11) 99999-9999"
                  value={editInstance?.phoneNumber || ""}
                  onChange={(e) => setEditInstance((prev) => prev ? { ...prev, phoneNumber: formatPhoneNumber(e.target.value) } : null)}
                />
                <p className="text-xs text-muted-foreground">{t("instances.phoneNumberHint")}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("instances.function")}</Label>
              <Select
                value={editInstance?.function || "dispatcher"}
                onValueChange={(value: InstanceFunction) =>
                  setEditInstance((prev) => prev ? { ...prev, function: value } : null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("instances.selectFunction")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dispatcher">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionDispatcher")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionDispatcherDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionAdmin")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionAdminDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="spy">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionSpy")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionSpyDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="funnel">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionFunnel")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionFunnelDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("instances.saving")}
                </>
              ) : (
                t("instances.saveChanges")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("instances.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("instances.deleteConfirmDescription")}
              {instanceToDelete && (
                <span className="block mt-2 font-medium text-foreground">
                  {instanceToDelete.name} ({instanceToDelete.provider})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInstanceToDelete(null)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInstance}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
