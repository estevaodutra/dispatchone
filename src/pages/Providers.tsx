import { PageHeader, StatusBadge, HealthBar, AlertBanner } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, Settings, RefreshCw, ExternalLink, CheckCircle, XCircle } from "lucide-react";

// Mock data
const providers = [
  {
    id: "1",
    name: "Z-API",
    type: "WhatsApp",
    status: "connected" as const,
    health: 98,
    dispatches: 12500,
    lastCheck: "2 min ago",
    features: ["Text", "Media", "Templates", "Webhooks"],
    documentation: "https://developer.z-api.io",
  },
  {
    id: "2",
    name: "Evolution API",
    type: "WhatsApp",
    status: "connected" as const,
    health: 95,
    dispatches: 8200,
    lastCheck: "1 min ago",
    features: ["Text", "Media", "Groups", "Status"],
    documentation: "https://doc.evolution-api.com",
  },
  {
    id: "3",
    name: "Voice/URA Provider",
    type: "Voice",
    status: "connected" as const,
    health: 100,
    dispatches: 4300,
    lastCheck: "30 sec ago",
    features: ["Outbound Calls", "IVR", "Recording", "Callbacks"],
    documentation: "#",
  },
  {
    id: "4",
    name: "Meta Business API",
    type: "WhatsApp",
    status: "disconnected" as const,
    health: 0,
    dispatches: 0,
    lastCheck: "Never",
    features: ["Official API", "Templates", "Analytics"],
    documentation: "https://developers.facebook.com/docs/whatsapp",
  },
];

export default function Providers() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Providers"
        description="Manage your WhatsApp and Voice/URA provider integrations"
        actions={
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Status
          </Button>
        }
      />

      {/* Alert for disconnected providers */}
      <AlertBanner
        variant="warning"
        title="Provider Disconnected"
        description="Meta Business API is not connected. Connect to unlock official WhatsApp API features."
        dismissible
      />

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
          <Button className="mt-4">Add Provider</Button>
        </CardContent>
      </Card>
    </div>
  );
}
