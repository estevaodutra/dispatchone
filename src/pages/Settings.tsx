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
import { useLanguage } from "@/i18n";

export default function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  
  // Form state
  const [settings, setSettings] = useState({
    companyName: "Acme Corp",
    timezone: "america_sao_paulo",
    emailNotifications: true,
    webhookNotifications: false,
    highFailureAlerts: true,
    providerOutageAlerts: true,
    sessionTimeout: "60",
    compactMode: false,
  });

  const handleSaveChanges = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: t("settings.settingsSaved"),
      description: t("settings.settingsSaved"),
    });
  };

  const handleEnable2FA = () => {
    setShow2FADialog(true);
  };

  const confirm2FA = () => {
    setShow2FADialog(false);
    toast({
      title: t("settings.twoFactorEnabled"),
      description: t("settings.twoFactorEnabled"),
    });
  };

  const handleManageApiKeys = () => {
    setShowApiKeyDialog(true);
  };

  const handleToggleChange = (key: keyof typeof settings) => (checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked }));
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value as "en" | "pt" | "es");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
        actions={
          <Button className="gap-2" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? t("settings.saving") : t("settings.saveChanges")}
          </Button>
        }
      />

      <div className="grid gap-6">
        {/* General Settings */}
        <Card className="shadow-elevation-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("settings.general")}</CardTitle>
            </div>
            <CardDescription>{t("settings.generalDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">{t("settings.companyName")}</Label>
                <Input
                  id="company"
                  value={settings.companyName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))}
                  placeholder={t("settings.companyNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">{t("settings.timezone")}</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => setSettings((prev) => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("settings.selectTimezone")} />
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
              <Label htmlFor="language">{t("settings.language")}</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("settings.selectLanguage")} />
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
              <CardTitle className="text-base">{t("settings.notifications")}</CardTitle>
            </div>
            <CardDescription>{t("settings.notificationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.emailNotifications")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.emailNotificationsDescription")}
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
                <Label>{t("settings.smsAlerts")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.smsAlertsDescription")}
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
                <Label>{t("settings.slackIntegration")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.slackIntegrationDescription")}
                </p>
              </div>
              <Switch
                checked={settings.highFailureAlerts}
                onCheckedChange={handleToggleChange("highFailureAlerts")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-elevation-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("settings.security")}</CardTitle>
            </div>
            <CardDescription>{t("settings.securityDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.twoFactorAuth")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.twoFactorDescription")}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleEnable2FA}>
                {t("settings.enable2FA")}
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.apiKeys")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.apiKeysDescription")}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleManageApiKeys}>
                {t("settings.manageKeys")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="shadow-elevation-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("settings.appearance")}</CardTitle>
            </div>
            <CardDescription>{t("settings.appearanceDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.darkMode")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.darkModeDescription")}
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => {
                  setTheme(checked ? "dark" : "light");
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2FA Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.enable2FATitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.scanQRCode")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="h-48 w-48 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">QR Code</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verify-code">{t("settings.verificationCode")}</Label>
            <Input id="verify-code" placeholder={t("settings.verificationCodePlaceholder")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow2FADialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirm2FA} className="gap-2">
              <Check className="h-4 w-4" />
              {t("settings.verify")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Keys Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("settings.manageAPIKeys")}</DialogTitle>
            <DialogDescription>
              {t("settings.existingKeys")}
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
              {t("common.close")}
            </Button>
            <Button onClick={() => {
              toast({
                title: t("settings.keyGenerated"),
                description: t("settings.keyGenerated"),
              });
            }}>
              {t("settings.generateNewKey")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
