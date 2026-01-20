import { useState } from "react";
import { List, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useInstances } from "@/hooks/useInstances";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

interface WhatsAppGroup {
  phone: string;
  name: string;
  isGroup: boolean;
  pinned: string;
  archived: string;
  messagesUnread: string;
  isMuted: string;
  communityId: string;
  lastMessageTime: string;
  isGroupAnnouncement?: boolean;
  ephemeralExpiration?: number;
}

interface GroupsListTabProps {
  campaignId?: string;
}

export function GroupsListTab({ campaignId }: GroupsListTabProps) {
  const { t } = useLanguage();
  const { instances, isLoading: instancesLoading } = useInstances();
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const connectedInstances = instances?.filter(i => i.status === "connected") || [];

  const toggleGroupSelection = (phone: string) => {
    setSelectedGroups(prev => 
      prev.includes(phone) 
        ? prev.filter(p => p !== phone)
        : [...prev, phone]
    );
  };

  const toggleSelectAll = () => {
    if (selectedGroups.length === groups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(groups.map(g => g.phone));
    }
  };

  const handleListGroups = async () => {
    if (!selectedInstance) return;
    
    const instance = instances?.find(i => i.id === selectedInstance);
    if (!instance) {
      toast.error("Instância não encontrada");
      return;
    }
    
    setIsLoading(true);
    setHasFetched(true);
    setSelectedGroups([]);
    
    try {
      const response = await fetch(
        "https://n8n-n8n.nuwfic.easypanel.host/webhook/zapi_get_groups",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instanceId: instance.id,
            instanceName: instance.name,
            phone: instance.phoneNumber,
            provider: instance.provider,
            status: instance.status,
            externalInstanceId: instance.idInstance,
            externalInstanceToken: instance.tokenInstance,
            campaignId: campaignId,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error("Falha ao buscar grupos");
      }
      
      const data = await response.json();
      
      // Filter only groups (isGroup === true)
      const rawGroups = data.groups || data || [];
      const groupsOnly = rawGroups.filter((item: WhatsAppGroup) => item.isGroup === true);
      
      setGroups(groupsOnly);
      
      toast.success(`${groupsOnly.length} grupo(s) encontrado(s)!`);
    } catch (error) {
      console.error("Erro ao listar grupos:", error);
      toast.error("Falha ao listar grupos. Tente novamente.");
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCampaign = async () => {
    if (selectedGroups.length === 0 || !campaignId) return;
    
    // TODO: Implement saving to database
    const selectedGroupsData = groups.filter(g => 
      selectedGroups.includes(g.phone)
    );
    
    toast.success(`${selectedGroups.length} grupo(s) adicionado(s) à campanha!`);
    
    // Clear selection
    setSelectedGroups([]);
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
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : hasFetched && groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("groupCampaigns.groups.noGroups")}</p>
          </div>
        ) : groups.length > 0 ? (
          <div className="space-y-4">
            {/* Header with "Select all" and action button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedGroups.length === groups.length && groups.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Selecionar todos
                </label>
              </div>
              
              <Button 
                disabled={selectedGroups.length === 0}
                onClick={handleAddToCampaign}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar à Campanha ({selectedGroups.length})
              </Button>
            </div>

            {/* Groups list */}
            <div className="rounded-md border divide-y">
              {groups.map((group) => (
                <div 
                  key={group.phone}
                  className="flex items-center space-x-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleGroupSelection(group.phone)}
                >
                  <Checkbox
                    id={group.phone}
                    checked={selectedGroups.includes(group.phone)}
                    onCheckedChange={() => toggleGroupSelection(group.phone)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {group.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.archived === "true" && (
                      <Badge variant="secondary">Arquivado</Badge>
                    )}
                    {group.pinned === "true" && (
                      <Badge variant="outline">Fixado</Badge>
                    )}
                    {group.messagesUnread !== "0" && (
                      <Badge variant="default">{group.messagesUnread} não lidas</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Selection counter */}
            <p className="text-sm text-muted-foreground">
              {selectedGroups.length} de {groups.length} grupo(s) selecionado(s)
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
