

# Adicionar botao "Sincronizar" na pagina Leads

## Resumo

Adicionar um botao "Sincronizar" na pagina de Leads que busca todos os membros de grupos (`group_members`) do usuario e faz upsert na tabela `leads`, garantindo que todos os contatos de todas as campanhas de grupo aparecam como leads.

## Arquivo modificado

### `src/pages/Leads.tsx`

1. Importar `RefreshCw` do lucide-react
2. Importar `supabase` do client
3. Importar `useAuth` do AuthContext
4. Importar `toast` do sonner
5. Adicionar estado `isSyncing` para controle de loading
6. Criar funcao `handleSync` que:
   - Busca todos os `group_members` do usuario autenticado
   - Para cada membro (filtrando phones com `-group`), faz upsert na tabela `leads` com tag "grupo", vinculando ao `group_campaign_id`
   - Invalida queries de leads e leads-stats
   - Mostra toast com contagem de leads sincronizados
7. Adicionar botao "Sincronizar" ao lado do botao "Novo Lead" no header, com icone `RefreshCw` animando durante o sync

### Detalhes tecnicos

```text
const handleSync = async () => {
  setIsSyncing(true);
  try {
    // Busca todos os group_members do usuario
    const { data: allMembers } = await supabase
      .from("group_members")
      .select("phone, name, group_campaign_id")
      .eq("status", "active");

    // Filtra JIDs de grupo
    const validMembers = allMembers?.filter(m => !m.phone.includes("-group")) || [];

    // Upsert em lotes na tabela leads
    const leadRecords = validMembers.map(m => ({
      user_id: user.id,
      phone: m.phone,
      name: m.name || null,
      tags: ["grupo"],
      active_campaign_id: m.group_campaign_id,
      active_campaign_type: "grupos",
      status: "active",
    }));

    // Upsert em batches de 500
    for (let i = 0; i < leadRecords.length; i += 500) {
      const batch = leadRecords.slice(i, i + 500);
      await supabase.from("leads").upsert(batch, {
        onConflict: "phone,user_id",
        ignoreDuplicates: false,
      });
    }

    // Invalida queries
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["leads-stats"] });

    toast({ title: "Sincronizado", description: `${validMembers.length} leads sincronizados.` });
  } catch (err) {
    toast({ title: "Erro ao sincronizar", variant: "destructive" });
  } finally {
    setIsSyncing(false);
  }
};
```

O botao ficara no header ao lado de "Novo Lead":
```text
<div className="flex gap-2">
  <Button variant="outline" onClick={handleSync} disabled={isSyncing} className="gap-2">
    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
    Sincronizar
  </Button>
  <Button onClick={() => setCreateOpen(true)} className="gap-2">
    <Plus className="h-4 w-4" /> Novo Lead
  </Button>
</div>
```

