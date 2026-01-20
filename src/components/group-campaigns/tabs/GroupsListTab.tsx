import { useState } from "react";
import { List, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstances } from "@/hooks/useInstances";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

interface WhatsAppGroup {
  jid: string;
  name: string;
  participantsCount: number;
  isAdmin: boolean;
}

interface GroupsListTabProps {
  campaignId?: string;
}

export function GroupsListTab({ campaignId }: GroupsListTabProps) {
  const { t } = useLanguage();
  const { instances, isLoading: instancesLoading } = useInstances();
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const connectedInstances = instances?.filter(i => i.status === "connected") || [];

  const handleListGroups = async () => {
    if (!selectedInstance) return;
    
    // Find the selected instance to get all its data
    const instance = instances?.find(i => i.id === selectedInstance);
    if (!instance) {
      toast.error("Instância não encontrada");
      return;
    }
    
    setIsLoading(true);
    setHasFetched(true);
    
    try {
      const response = await fetch(
        "https://n8n-n8n.nuwfic.easypanel.host/webhook/zapi_get_groups",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Instance information
            instanceId: instance.id,
            instanceName: instance.name,
            phone: instance.phoneNumber,
            provider: instance.provider,
            status: instance.status,
            // Provider credentials (Z-API)
            externalInstanceId: instance.idInstance,
            externalInstanceToken: instance.tokenInstance,
            // Additional context
            campaignId: campaignId,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error("Falha ao buscar grupos");
      }
      
      const data = await response.json();
      
      // Process webhook response - expecting array of groups
      setGroups(data.groups || data || []);
      
      toast.success("Grupos listados com sucesso!");
    } catch (error) {
      console.error("Erro ao listar grupos:", error);
      toast.error("Falha ao listar grupos. Tente novamente.");
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("groupCampaigns.groups.title")}
        </CardTitle>
        <CardDescription>
          {t("groupCampaigns.groups.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select 
            value={selectedInstance} 
            onValueChange={setSelectedInstance}
            disabled={instancesLoading}
          >
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder={t("groupCampaigns.groups.selectInstance")} />
            </SelectTrigger>
            <SelectContent>
              {connectedInstances.map((instance) => (
                <SelectItem key={instance.id} value={instance.id}>
                  {instance.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleListGroups} 
            disabled={!selectedInstance || isLoading}
          >
            <List className="mr-2 h-4 w-4" />
            {t("groupCampaigns.groups.listGroups")}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : hasFetched && groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("groupCampaigns.groups.noGroups")}</p>
          </div>
        ) : groups.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("groupCampaigns.groups.groupName")}</TableHead>
                  <TableHead>{t("groupCampaigns.groups.participants")}</TableHead>
                  <TableHead>{t("groupCampaigns.groups.adminStatus")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.jid}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.participantsCount}</TableCell>
                    <TableCell>
                      <Badge variant={group.isAdmin ? "default" : "secondary"}>
                        {group.isAdmin 
                          ? t("groupCampaigns.groups.isAdmin") 
                          : t("groupCampaigns.groups.notAdmin")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        {t("groupCampaigns.groups.connect")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
