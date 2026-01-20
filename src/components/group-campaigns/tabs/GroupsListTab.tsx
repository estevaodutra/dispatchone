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
    
    setIsLoading(true);
    setHasFetched(true);
    
    // TODO: Implement Edge Function to fetch groups from WhatsApp API
    // For now, simulate loading
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock data for demonstration
    setGroups([]);
    setIsLoading(false);
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
