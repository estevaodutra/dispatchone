

## Plano: Corrigir Captura de Leads na Lista de Execução 24h

### Problemas Identificados

**Bug 1 — Janela expirada bloqueia leads em lista 24h**

No `webhook-inbound`, linha 367-368, existe este check:
```
if (execList.execution_schedule_type !== "immediate") {
  if (!execList.current_window_end || new Date(execList.current_window_end) <= now) continue;
}
```
A lista "Lista de Entrada 24hrs" é `immediate` então esse check é pulado. Porém, o `current_window_end` está em `2026-04-13 02:59:00 UTC` (já passou). Isso não bloqueia porque o tipo é `immediate`, mas impacta listas de janela.

**Bug 2 (PRINCIPAL) — Todos os leads têm o mesmo telefone**

O event-classifier extrai `senderPhone = connectedPhone` para eventos GROUP_PARTICIPANT_*, mas `connectedPhone` é o telefone da **instância** (5512982402981), não do participante. O Z-API envia o participante como `@lid` em `notificationParameters` (ex: `212055487447252@lid`), sem o telefone real.

Resultado: todos os leads são inseridos com o mesmo telefone da instância, e o `upsert` com `onConflict: "list_id,phone,cycle_id"` trata como duplicata. **Só 1 lead aparece** em vez de dezenas.

O mesmo bug afeta `group_members` (sync de membros).

### Solução

**1. `supabase/functions/_shared/event-classifier.ts`**

Corrigir a extração de phone para eventos GROUP_PARTICIPANT: em vez de usar `connectedPhone`, extrair o LID de `notificationParameters[0]` e convertê-lo para um formato usável. Como o LID não é um número de telefone real, armazenar o LID numérico como identificador temporário:
- Extrair `212055487447252` do `212055487447252@lid`
- Usar como `senderPhone` (identificador único por participante)
- Manter `connectedPhone` como fallback somente se não houver LID

**2. `supabase/functions/webhook-inbound/index.ts`**

- Na seção de sync de membros (linhas 276-338): após o upsert/update, tentar resolver o LID para telefone real chamando a Z-API (`zapi-proxy`) com o endpoint de participantes do grupo, e atualizar o membro se encontrar o telefone
- Na seção de execution lists (linhas 342-421): adicionar detecção de fulltime para pular check de window em listas 24h também para tipos não-immediate (segurança extra)
- Extrair o LID para campo `origin_detail` para rastreabilidade

**3. Nova lógica de resolução LID→Telefone no webhook-inbound**

Após inserir o lead/membro com o LID como phone temporário, invocar o zapi-proxy para buscar os participantes do grupo e resolver o telefone real:
- `GET /group-participants/{groupJid}` via zapi-proxy
- Encontrar o participante pelo LID
- Atualizar `group_members.phone` e `group_execution_leads.phone` com o telefone real

**4. Re-deploy das edge functions**

- `_shared/event-classifier.ts`
- `webhook-inbound/index.ts`

### Resultado Esperado
- Cada participante que entra no grupo gera um lead **único** na lista de execução
- O telefone real é resolvido via API do Z-API quando disponível
- Membros na aba Membros também terão o telefone correto
- Listas 24h cumulativas funcionam sem bloqueio de janela

