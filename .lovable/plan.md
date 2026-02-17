

# Historico de Ligacoes por Lead no Painel

## Problema atual

Quando o mesmo lead e discado varias vezes na mesma campanha, o painel mostra multiplos cards (um por call_log). O usuario quer ver apenas **1 card por lead** (o mais recente) e ter acesso ao **historico completo** dentro do card.

## Abordagem

Em vez de impedir a criacao de novos call_logs (o que perderia o historico), a solucao e:

1. **Filtrar no painel**: mostrar apenas o call_log mais recente por lead+campanha
2. **Adicionar aba "Historico"** no dialog de detalhes/acao para exibir todas as tentativas anteriores

## Mudancas

### 1. `src/hooks/useCallPanel.ts` - Deduplicar por lead

Apos mapear os registros, agrupar por `lead_id + campaign_id` e manter apenas o mais recente (por `created_at`). Os demais ficam acessiveis via query separada no historico.

### 2. `src/pages/CallPanel.tsx` - Aba "Historico" no ActionDialog

O ActionDialog atual tem 2 abas: "Roteiro" e "Acao". Adicionar uma terceira aba **"Historico"** que:

- Busca todos os `call_logs` do mesmo `lead_id + campaign_id`
- Exibe em lista cronologica (mais recente primeiro)
- Mostra para cada entrada: data, status, duracao, operador, notas e acao registrada
- Diferencia a tentativa atual das anteriores

### 3. `supabase/functions/call-dial/index.ts` - Manter criacao de novos logs

Reverter a logica que impede duplicatas em status terminal. Quando o lead ja tem um call_log com status terminal (failed, completed, etc.), o sistema cria um **novo** call_log normalmente - isso preserva o historico. A deduplicacao visual fica no frontend.

## Detalhes tecnicos

### useCallPanel.ts - Deduplicacao

Apos o `mapEntry`, adicionar um passo de deduplicacao:

```typescript
// Group by lead_id + campaign_id, keep latest
const deduped = new Map<string, CallPanelEntry>();
for (const entry of mapped) {
  const key = `${entry.leadId}_${entry.campaignId}`;
  const existing = deduped.get(key);
  if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
    deduped.set(key, entry);
  }
}
return Array.from(deduped.values());
```

### CallPanel.tsx - Aba Historico

Na funcao `ActionDialog`, expandir as tabs de 2 para 3 colunas e adicionar a aba "Historico":

```typescript
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="script">Roteiro</TabsTrigger>
  <TabsTrigger value="action">Acao</TabsTrigger>
  <TabsTrigger value="history">Historico</TabsTrigger>
</TabsList>

<TabsContent value="history">
  <LeadCallHistory leadId={entry.leadId} campaignId={entry.campaignId} currentLogId={entry.id} />
</TabsContent>
```

O componente `LeadCallHistory` faz uma query:

```typescript
const { data } = useQuery({
  queryKey: ["call-lead-history", leadId, campaignId],
  queryFn: async () => {
    const { data } = await supabase
      .from("call_logs")
      .select("*, call_script_actions(name, color), call_operators(operator_name)")
      .eq("lead_id", leadId)
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    return data;
  },
});
```

Cada item mostra: data/hora, status badge, duracao, operador, notas e acao registrada, com destaque visual para a tentativa atual.

### call-dial - Permitir novos logs para leads terminais

Na Edge Function, a logica de busca de logs existentes deve continuar verificando apenas status **ativos** (comportamento original). Se o lead tem um log terminal, um novo log e criado normalmente. Isso garante que cada tentativa de ligacao fica registrada como um log separado.

## Resumo de arquivos

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useCallPanel.ts` | Deduplicar entries por lead+campanha (mostrar so o mais recente) |
| `src/pages/CallPanel.tsx` | Adicionar aba "Historico" no ActionDialog com lista de tentativas |
| `supabase/functions/call-dial/index.ts` | Garantir que novos logs sao criados para tentativas em status terminal |

