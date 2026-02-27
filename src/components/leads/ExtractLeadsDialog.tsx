import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Download, Check, X, AlertTriangle, Loader2 } from "lucide-react";

interface GroupWithCount {
  campaignId: string;
  campaignName: string;
  groupJid: string;
  groupName: string;
  memberCount: number;
  lastSync: string | null;
}

interface ExtractionResult {
  groupName: string;
  total: number;
  extracted: number;
  ignored: number;
  invalid: number;
}

type Step = "select" | "configure" | "executing" | "done";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ExtractLeadsDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Step state
  const [step, setStep] = useState<Step>("select");
  const [search, setSearch] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  // Config
  const [campaignId, setCampaignId] = useState("");
  const [campaignType, setCampaignType] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [ignoreExisting, setIgnoreExisting] = useState(true);
  const [ignoreInvalid, setIgnoreInvalid] = useState(true);
  const [ignoreAdmins, setIgnoreAdmins] = useState(false);
  const [keepReference, setKeepReference] = useState(true);

  // Execution
  const [progress, setProgress] = useState(0);
  const [currentGroup, setCurrentGroup] = useState("");
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [results, setResults] = useState<ExtractionResult[]>([]);

  // Campaigns
  const { campaigns: callCampaigns } = useCallCampaigns();
  const { campaigns: dispatchCampaigns } = useDispatchCampaigns();
  const { campaigns: groupCampaigns } = useGroupCampaigns();

  // Fetch groups with member counts
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["extract-groups-list"],
    queryFn: async () => {
      const { data: cGroups } = await supabase
        .from("campaign_groups")
        .select("campaign_id, group_jid, group_name, added_at")
        .order("group_name");

      if (!cGroups?.length) return [];

      // Get campaign names
      const campaignIds = [...new Set(cGroups.map(g => g.campaign_id))];
      const { data: campaigns } = await supabase
        .from("group_campaigns")
        .select("id, name")
        .in("id", campaignIds);
      const campaignMap = new Map((campaigns || []).map(c => [c.id, c.name]));

      // Get member counts per group_campaign_id
      const { data: members } = await supabase
        .from("group_members")
        .select("group_campaign_id, phone")
        .eq("status", "active");

      const countMap = new Map<string, number>();
      (members || []).forEach(m => {
        if (!m.phone.includes("-group")) {
          countMap.set(m.group_campaign_id, (countMap.get(m.group_campaign_id) || 0) + 1);
        }
      });

      return cGroups.map(g => ({
        campaignId: g.campaign_id,
        campaignName: campaignMap.get(g.campaign_id) || "—",
        groupJid: g.group_jid,
        groupName: g.group_name,
        memberCount: countMap.get(g.campaign_id) || 0,
        lastSync: g.added_at,
      })) as GroupWithCount[];
    },
    enabled: open,
  });

  const filteredGroups = useMemo(() =>
    groups.filter(g => g.groupName.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );

  const selectedTotal = useMemo(() =>
    groups.filter(g => selectedGroups.has(g.campaignId)).reduce((s, g) => s + g.memberCount, 0),
    [groups, selectedGroups]
  );

  const toggleGroup = (id: string) => {
    const next = new Set(selectedGroups);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedGroups(next);
  };

  const toggleAll = () => {
    if (selectedGroups.size === groups.length) setSelectedGroups(new Set());
    else setSelectedGroups(new Set(groups.map(g => g.campaignId)));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleCampaignChange = (val: string) => {
    // format: type::id
    const [type, id] = val.split("::");
    setCampaignType(type);
    setCampaignId(id);
  };

  const resetState = () => {
    setStep("select");
    setSearch("");
    setSelectedGroups(new Set());
    setCampaignId("");
    setCampaignType("");
    setTags([]);
    setTagInput("");
    setIgnoreExisting(true);
    setIgnoreInvalid(true);
    setIgnoreAdmins(false);
    setKeepReference(true);
    setProgress(0);
    setResults([]);
  };

  const handleClose = (o: boolean) => {
    if (!o) resetState();
    onOpenChange(o);
  };

  const execute = useCallback(async () => {
    if (!user) return;
    setStep("executing");
    const selected = groups.filter(g => selectedGroups.has(g.campaignId));
    const allResults: ExtractionResult[] = [];
    let totalExtracted = 0;

    for (let gi = 0; gi < selected.length; gi++) {
      const group = selected[gi];
      setCurrentGroup(group.groupName);
      setCurrentGroupIndex(gi);
      setProgress(0);

      const result: ExtractionResult = {
        groupName: group.groupName,
        total: 0,
        extracted: 0,
        ignored: 0,
        invalid: 0,
      };

      // Fetch members
      let query = supabase
        .from("group_members")
        .select("phone, name, is_admin")
        .eq("group_campaign_id", group.campaignId)
        .eq("status", "active");

      const { data: members } = await query;
      const validMembers = (members || []).filter(m => !m.phone.includes("-group"));
      
      if (ignoreAdmins) {
        const filtered = validMembers.filter(m => !m.is_admin);
        result.total = validMembers.length;
        const adminsRemoved = validMembers.length - filtered.length;
        // We'll process filtered only
        validMembers.length = 0;
        validMembers.push(...filtered);
      } else {
        result.total = validMembers.length;
      }

      // Get existing phones if ignoring
      let existingPhones = new Set<string>();
      if (ignoreExisting && campaignId) {
        const { data: existing } = await supabase
          .from("leads")
          .select("phone")
          .eq("active_campaign_id", campaignId)
          .eq("user_id", user.id);
        existingPhones = new Set((existing || []).map(e => e.phone));
      }

      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < validMembers.length; i += batchSize) {
        const batch = validMembers.slice(i, i + batchSize);
        const toInsert: any[] = [];

        for (const member of batch) {
          const phone = member.phone.replace(/\D/g, "");

          if (ignoreInvalid && phone.length < 10) {
            result.invalid++;
            continue;
          }

          if (existingPhones.has(phone)) {
            result.ignored++;
            continue;
          }

          const leadData: any = {
            user_id: user.id,
            phone,
            name: member.name || null,
            status: "active",
            source_type: "whatsapp_group",
            tags: tags.length > 0 ? tags : [],
          };

          if (campaignId) {
            leadData.active_campaign_id = campaignId;
            leadData.active_campaign_type = campaignType;
          }

          if (keepReference) {
            leadData.source_group_id = group.campaignId;
            leadData.source_group_name = group.groupName;
            leadData.source_name = group.campaignName;
          }

          toInsert.push(leadData);
          existingPhones.add(phone); // prevent duplicates within same extraction
        }

        if (toInsert.length > 0) {
          const { data: upserted, error } = await supabase
            .from("leads")
            .upsert(toInsert, { onConflict: "phone,user_id", ignoreDuplicates: false })
            .select("id, phone");

          if (!error && upserted) {
            result.extracted += upserted.length;

            // Sync to campaign-specific tables
            if (campaignType === "ligacao" && campaignId) {
              const rows = upserted.map(l => ({
                campaign_id: campaignId,
                user_id: user.id,
                phone: l.phone,
                status: "pending",
              }));
              await supabase.from("call_leads").upsert(rows as any, { onConflict: "phone,campaign_id" });
            }

            if (campaignType === "despacho" && campaignId) {
              const rows = upserted.map(l => ({
                campaign_id: campaignId,
                user_id: user.id,
                lead_id: l.id,
                status: "active",
              }));
              await supabase.from("dispatch_campaign_contacts").upsert(rows as any, { onConflict: "campaign_id,lead_id" });
            }
          } else if (error) {
            // If upsert fails, count as ignored
            result.ignored += toInsert.length;
          }
        }

        setProgress(Math.round(((i + batch.length) / validMembers.length) * 100));
      }

      // Members that were admins and skipped
      if (ignoreAdmins) {
        const adminsCount = result.total - validMembers.length;
        // already accounted in total but not processed
      }

      allResults.push(result);
      totalExtracted += result.extracted;
    }

    setResults(allResults);
    setStep("done");

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
    queryClient.invalidateQueries({ queryKey: ["call-leads"] });
    queryClient.invalidateQueries({ queryKey: ["dispatch_contacts"] });

    toast.success(`${totalExtracted} leads extraídos com sucesso!`);
  }, [user, groups, selectedGroups, campaignId, campaignType, tags, ignoreExisting, ignoreInvalid, ignoreAdmins, keepReference, queryClient]);

  const totalResults = useMemo(() =>
    results.reduce((acc, r) => ({
      total: acc.total + r.total,
      extracted: acc.extracted + r.extracted,
      ignored: acc.ignored + r.ignored,
      invalid: acc.invalid + r.invalid,
    }), { total: 0, extracted: 0, ignored: 0, invalid: 0 }),
    [results]
  );

  const selectedCampaignLabel = useMemo(() => {
    if (!campaignId) return "";
    const all = [
      ...callCampaigns.map((c: any) => ({ id: c.id, name: c.name })),
      ...dispatchCampaigns.map((c: any) => ({ id: c.id, name: c.name })),
      ...groupCampaigns.map((c: any) => ({ id: c.id, name: c.name })),
    ];
    return all.find(c => c.id === campaignId)?.name || "";
  }, [campaignId, callCampaigns, dispatchCampaigns, groupCampaigns]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {step === "done" ? "✅ Extração Concluída!" : step === "executing" ? "Extraindo Leads..." : "Extrair Leads de Grupos"}
          </DialogTitle>
          {step === "select" && (
            <DialogDescription>
              Extraia membros de grupos do WhatsApp e transforme em leads para suas campanhas.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* STEP: SELECT */}
        {step === "select" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Passo 1 — Selecionar Grupos</h3>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar grupo..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
              {groupsLoading ? (
                <p className="text-center text-sm text-muted-foreground py-4">Carregando grupos...</p>
              ) : filteredGroups.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">Nenhum grupo encontrado.</p>
              ) : (
                filteredGroups.map(g => (
                  <div
                    key={g.campaignId}
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleGroup(g.campaignId)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selectedGroups.has(g.campaignId)} />
                      <div>
                        <p className="font-medium text-sm">{g.groupName}</p>
                        <p className="text-xs text-muted-foreground">{g.campaignName}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">👥 {g.memberCount} membros</Badge>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={groups.length > 0 && selectedGroups.size === groups.length}
                  onCheckedChange={toggleAll}
                />
                Selecionar todos ({groups.length} grupos)
              </label>
              <p className="text-sm text-muted-foreground">
                📊 {selectedGroups.size} grupos │ {selectedTotal} membros
              </p>
            </div>
          </div>
        )}

        {/* STEP: CONFIGURE */}
        {step === "configure" && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Passo 2 — Configurar Extração</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">Atribuir à Campanha *</label>
              <Select value={campaignId ? `${campaignType}::${campaignId}` : ""} onValueChange={handleCampaignChange}>
                <SelectTrigger><SelectValue placeholder="Selecione uma campanha..." /></SelectTrigger>
                <SelectContent>
                  {callCampaigns.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>📞 Campanhas de Ligação</SelectLabel>
                      {callCampaigns.map((c: any) => (
                        <SelectItem key={c.id} value={`ligacao::${c.id}`}>
                          {c.name}
                          <span className="ml-2 text-xs text-muted-foreground">[{c.status}]</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {dispatchCampaigns.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>📱 Campanhas de Despacho</SelectLabel>
                      {dispatchCampaigns.map((c: any) => (
                        <SelectItem key={c.id} value={`despacho::${c.id}`}>
                          {c.name}
                          <span className="ml-2 text-xs text-muted-foreground">[{c.status}]</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {groupCampaigns.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>👥 Campanhas de Grupo</SelectLabel>
                      {groupCampaigns.map((c: any) => (
                        <SelectItem key={c.id} value={`grupos::${c.id}`}>
                          {c.name}
                          <span className="ml-2 text-xs text-muted-foreground">[{c.status}]</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Adicionar Tags (opcional)</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map(t => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setTags(tags.filter(x => x !== t))} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma tag..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button variant="outline" size="sm" onClick={addTag}>Adicionar</Button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Opções de Extração</label>
              <div className="space-y-2">
                {[
                  { checked: ignoreExisting, set: setIgnoreExisting, label: "Ignorar leads que já existem na campanha" },
                  { checked: ignoreInvalid, set: setIgnoreInvalid, label: "Ignorar números inválidos (menos de 10 dígitos)" },
                  { checked: ignoreAdmins, set: setIgnoreAdmins, label: "Ignorar administradores dos grupos" },
                  { checked: keepReference, set: setKeepReference, label: "Manter referência do grupo de origem" },
                ].map(opt => (
                  <label key={opt.label} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={opt.checked} onCheckedChange={(v) => opt.set(!!v)} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-sm font-medium mb-2">📊 Prévia</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Grupos:</span> {selectedGroups.size}</div>
                <div><span className="text-muted-foreground">Membros:</span> {selectedTotal}</div>
                <div><span className="text-muted-foreground">Campanha:</span> {selectedCampaignLabel || "—"}</div>
                <div><span className="text-muted-foreground">Tags:</span> {tags.length > 0 ? tags.join(", ") : "—"}</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP: EXECUTING */}
        {step === "executing" && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Processando grupo {currentGroupIndex + 1} de {selectedGroups.size}...
              </p>
              <p className="font-medium">{currentGroup}</p>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* STEP: DONE */}
        {step === "done" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold">{totalResults.extracted} leads extraídos com sucesso!</p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: "👥", value: totalResults.total, label: "Total" },
                { icon: "✅", value: totalResults.extracted, label: "Extraídos" },
                { icon: "⚠️", value: totalResults.ignored, label: "Ignorados" },
                { icon: "❌", value: totalResults.invalid, label: "Inválidos" },
              ].map(m => (
                <div key={m.label} className="text-center p-3 border rounded-lg">
                  <p className="text-lg font-bold">{m.icon} {m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>

            {results.length > 1 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grupo</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Extraídos</TableHead>
                      <TableHead className="text-right">Ignorados</TableHead>
                      <TableHead className="text-right">Inválidos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map(r => (
                      <TableRow key={r.groupName}>
                        <TableCell className="font-medium">{r.groupName}</TableCell>
                        <TableCell className="text-right">{r.total}</TableCell>
                        <TableCell className="text-right">{r.extracted}</TableCell>
                        <TableCell className="text-right">{r.ignored}</TableCell>
                        <TableCell className="text-right">{r.invalid}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="text-sm text-muted-foreground space-y-1">
              <p>📁 Campanha: {selectedCampaignLabel || "—"}</p>
              {tags.length > 0 && <p>🏷️ Tags: {tags.join(", ")}</p>}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "select" && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button disabled={selectedGroups.size === 0} onClick={() => setStep("configure")}>
                Continuar
              </Button>
            </>
          )}
          {step === "configure" && (
            <>
              <Button variant="outline" onClick={() => setStep("select")}>Voltar</Button>
              <Button disabled={!campaignId} onClick={execute}>
                <Download className="h-4 w-4 mr-2" />
                Extrair {selectedTotal} Leads
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
