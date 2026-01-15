import { useState } from "react";
import { PageHeader, StatusBadge, HealthBar, AlertBanner } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plug, Settings, RefreshCw, ExternalLink, CheckCircle, XCircle, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data
interface Provider {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected" | "degraded";
  health: number;
  dispatches: number;
  lastCheck: string;
  features: string[];
  documentation: string;
  apiKey?: string;
}

const initialProviders: Provider[] = [
  {
    id: "1",
    name: "Z-API",
    type: "WhatsApp",
    status: "connected",
    health: 98,
    dispatches: 12500,
    lastCheck: "2 min ago",
    features: ["Text", "Media", "Templates", "Webhooks"],
    documentation: "https://developer.z-api.io",
    apiKey: "zapi_****************************1234",
  },
  {
    id: "2",
    name: "Evolution API",
    type: "WhatsApp",
    status: "connected",
    health: 95,
    dispatches: 8200,
    lastCheck: "1 min ago",
    features: ["Text", "Media", "Groups", "Status"],
    documentation: "https://doc.evolution-api.com",
    apiKey: "evo_****************************5678",
  },
  {
    id: "3",
    name: "Voice/URA Provider",
    type: "Voice",
    status: "connected",
    health: 100,
    dispatches: 4300,
    lastCheck: "30 sec ago",
    features: ["Outbound Calls", "IVR", "Recording", "Callbacks"],
    documentation: "#",
    apiKey: "voice_****************************9012",
  },
  {
    id: "4",
    name: "Meta Business API",
    type: "WhatsApp",
    status: "disconnected",
    health: 0,
    dispatches: 0,
    lastCheck: "Never",
    features: ["Official API", "Templates", "Analytics"],
    documentation: "https://developers.facebook.com/docs/whatsapp",
  },
];

export default function Providers() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>(initialProviders);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDisconnectedAlert, setShowDisconnectedAlert] = useState(true);
  const [configForm, setConfigForm] = useState({
    apiKey: "",
    webhookUrl: "",
    instanceId: "",
  });
  const [newProvider, setNewProvider] = useState({
    name: "",
    type: "WhatsApp",
    apiKey: "",
  });

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
    toast({
      title: "Status refreshed",
      description: "All provider statuses have been updated.",
    });
  };

  const handleConfigure = (provider: Provider) => {
    setSelectedProvider(provider);
    setConfigForm({
      apiKey: provider.apiKey || "",
      webhookUrl: "",
      instanceId: "",
    });
    setShowConfigDialog(true);
  };

  const handleConnect = (provider: Provider) => {
    setSelectedProvider(provider);
    setConfigForm({ apiKey: "", webhookUrl: "", instanceId: "" });
    setShowConfigDialog(true);
  };

  const handleSaveConfig = async () => {
    if (!configForm.apiKey) {
      toast({
        title: "Error",
        description: "API Key is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (selectedProvider) {
      setProviders((prev) =>
        prev.map((p) =>
          p.id === selectedProvider.id
            ? {
                ...p,
                status: "connected" as const,
                health: 100,
                apiKey: configForm.apiKey.slice(0, 4) + "_" + "*".repeat(28) + configForm.apiKey.slice(-4),
                lastCheck: "Just now",
              }
            : p
        )
      );
    }

    setIsSaving(false);
    setShowConfigDialog(false);
    toast({
      title: selectedProvider?.status === "connected" ? "Configuration updated" : "Provider connected",
      description: `${selectedProvider?.name} has been ${selectedProvider?.status === "connected" ? "updated" : "connected"} successfully.`,
    });
  };

  const handleAddProvider = async () => {
    if (!newProvider.name || !newProvider.apiKey) {
      toast({
        title: "Error",
        description: "Provider name and API Key are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const provider: Provider = {
      id: String(Date.now()),
      name: newProvider.name,
      type: newProvider.type,
      status: "connected",
      health: 100,
      dispatches: 0,
      lastCheck: "Just now",
      features: ["Text", "Media"],
      documentation: "#",
      apiKey: newProvider.apiKey.slice(0, 4) + "_" + "*".repeat(28) + newProvider.apiKey.slice(-4),
    };

    setProviders((prev) => [...prev, provider]);
    setIsSaving(false);
    setShowAddDialog(false);
    setNewProvider({ name: "", type: "WhatsApp", apiKey: "" });

    toast({
      title: "Provider added",
      description: `${provider.name} has been connected successfully.`,
    });
  };

  const disconnectedProviders = providers.filter((p) => p.status === "disconnected");

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Providers"
        description="Manage your WhatsApp and Voice/URA provider integrations"
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Status"}
          </Button>
        }
      />

      {/* Alert for disconnected providers */}
      {disconnectedProviders.length > 0 && showDisconnectedAlert && (
        <AlertBanner
          variant="warning"
          title="Provider Disconnected"
          description={`${disconnectedProviders[0].name} is not connected. Connect to unlock its features.`}
          dismissible
          onDismiss={() => setShowDisconnectedAlert(false)}
        />
      )}

      {/* Provider Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.id} className="shadow-elevation-sm hover:shadow-elevation-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    provider.status === "connected" ? "bg-success/15" : "bg-muted"
                  }`}
                >
                  {provider.status === "connected" ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">{provider.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {provider.type}
                  </Badge>
                </div>
              </div>
              <StatusBadge status={provider.status} />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Health & Stats */}
              {provider.status === "connected" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Health</p>
                      <HealthBar value={provider.health} size="sm" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Dispatches</p>
                      <p className="font-mono text-sm font-semibold">
                        {provider.dispatches.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Last checked: {provider.lastCheck}
                  </div>
                </>
              )}

              {/* Features */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Features</p>
                <div className="flex flex-wrap gap-1">
                  {provider.features.map((feature) => (
                    <Badge key={feature} variant="outline" className="text-xs font-normal">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant={provider.status === "connected" ? "outline" : "default"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() =>
                    provider.status === "connected"
                      ? handleConfigure(provider)
                      : handleConnect(provider)
                  }
                >
                  <Settings className="h-4 w-4" />
                  {provider.status === "connected" ? "Configure" : "Connect"}
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={provider.documentation} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Provider */}
      <Card className="border-dashed shadow-elevation-sm">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="mb-4 rounded-full bg-muted p-3">
            <Plug className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Add New Provider</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect additional WhatsApp or Voice providers
          </p>
          <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
            Add Provider
          </Button>
        </CardContent>
      </Card>

      {/* Configure/Connect Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedProvider?.status === "connected" ? "Configure" : "Connect"}{" "}
              {selectedProvider?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedProvider?.status === "connected"
                ? "Update your provider configuration."
                : "Enter your API credentials to connect this provider."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
                value={configForm.apiKey}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instanceId">Instance ID (Optional)</Label>
              <Input
                id="instanceId"
                placeholder="Enter instance ID"
                value={configForm.instanceId}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, instanceId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
              <Input
                id="webhookUrl"
                placeholder="https://your-domain.com/webhook"
                value={configForm.webhookUrl}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, webhookUrl: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {selectedProvider?.status === "connected" ? "Saving..." : "Connecting..."}
                </>
              ) : selectedProvider?.status === "connected" ? (
                "Save Changes"
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Provider Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Provider</DialogTitle>
            <DialogDescription>
              Connect a custom WhatsApp or Voice provider.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="providerName">Provider Name</Label>
              <Input
                id="providerName"
                placeholder="e.g., My Custom Provider"
                value={newProvider.name}
                onChange={(e) => setNewProvider((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerType">Provider Type</Label>
              <Select
                value={newProvider.type}
                onValueChange={(value) => setNewProvider((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Voice">Voice/URA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newApiKey">API Key</Label>
              <Input
                id="newApiKey"
                type="password"
                placeholder="Enter API key"
                value={newProvider.apiKey}
                onChange={(e) => setNewProvider((prev) => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProvider} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
