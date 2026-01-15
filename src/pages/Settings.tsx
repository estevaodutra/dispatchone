import { useState } from "react";
import { PageHeader } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, Globe, Bell, Shield, Palette, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

export default function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  
  // Form state
  const [settings, setSettings] = useState({
    companyName: "Acme Corp",
    timezone: "america_sao_paulo",
    language: "en",
    emailNotifications: true,
    webhookNotifications: false,
    highFailureAlerts: true,
    providerOutageAlerts: true,
    sessionTimeout: "60",
    compactMode: false,
  });

  const handleSaveChanges = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: "Settings saved",
      description: "Your configuration has been updated successfully.",
    });
  };

  const handleEnable2FA = () => {
    setShow2FADialog(true);
  };

  const confirm2FA = () => {
    setShow2FADialog(false);
    toast({
      title: "2FA Enabled",
      description: "Two-factor authentication is now active on your account.",
    });
  };

  const handleManageApiKeys = () => {
    setShowApiKeyDialog(true);
  };

  const handleToggleChange = (key: keyof typeof settings) => (checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked }));
    toast({
      title: "Setting updated",
      description: `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} has been ${checked ? 'enabled' : 'disabled'}.`,
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Configure your DispatchOne platform"
        actions={
          <Button className="gap-2" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      <div className="grid gap-6">
        {/* General Settings */}
        <Card className="shadow-elevation-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">General</CardTitle>
            </div>
            <CardDescription>Basic platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={settings.companyName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => setSettings((prev) => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america_sao_paulo">America/Sao_Paulo (BRT)</SelectItem>
                    <SelectItem value="america_new_york">America/New_York (EST)</SelectItem>
                    <SelectItem value="europe_london">Europe/London (GMT)</SelectItem>
                    <SelectItem value="asia_tokyo">Asia/Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, language: value }))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="shadow-elevation-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
            <CardDescription>Configure how you receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive critical alerts via email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={handleToggleChange("emailNotifications")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Webhook Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts to external systems
                </p>
              </div>
              <Switch
                checked={settings.webhookNotifications}
                onCheckedChange={handleToggleChange("webhookNotifications")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>High Failure Rate Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when campaign failure rate exceeds threshold
                </p>
              </div>
              <Switch
                checked={settings.highFailureAlerts}
                onCheckedChange={handleToggleChange("highFailureAlerts")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Provider Outage Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when a provider becomes unavailable
                </p>
              </div>
              <Switch
                checked={settings.providerOutageAlerts}
                onCheckedChange={handleToggleChange("providerOutageAlerts")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-elevation-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Security</CardTitle>
            </div>
            <CardDescription>Account and access security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleEnable2FA}>
                Enable
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Session Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically log out after inactivity
                </p>
              </div>
              <Select
                value={settings.sessionTimeout}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, sessionTimeout: value }))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>API Key Management</Label>
                <p className="text-sm text-muted-foreground">
                  Manage API keys for external integrations
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleManageApiKeys}>
                Manage Keys
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="shadow-elevation-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Appearance</CardTitle>
            </div>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark themes
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => {
                  setTheme(checked ? "dark" : "light");
                  toast({
                    title: `${checked ? "Dark" : "Light"} mode enabled`,
                    description: "Theme has been updated.",
                  });
                }}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compact Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Reduce spacing for denser information display
                </p>
              </div>
              <Switch
                checked={settings.compactMode}
                onCheckedChange={handleToggleChange("compactMode")}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2FA Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan this QR code with your authenticator app to enable 2FA.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="h-48 w-48 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">QR Code Placeholder</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verify-code">Verification Code</Label>
            <Input id="verify-code" placeholder="Enter 6-digit code" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow2FADialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirm2FA} className="gap-2">
              <Check className="h-4 w-4" />
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Keys Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>API Key Management</DialogTitle>
            <DialogDescription>
              Create and manage API keys for external integrations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Production Key</p>
                  <p className="text-sm text-muted-foreground font-mono">pk_live_****************************1234</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  toast({
                    title: "API Key copied",
                    description: "The API key has been copied to your clipboard.",
                  });
                }}>
                  Copy
                </Button>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Test Key</p>
                  <p className="text-sm text-muted-foreground font-mono">pk_test_****************************5678</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  toast({
                    title: "API Key copied",
                    description: "The API key has been copied to your clipboard.",
                  });
                }}>
                  Copy
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              toast({
                title: "New API key generated",
                description: "A new API key has been created.",
              });
            }}>
              Generate New Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
