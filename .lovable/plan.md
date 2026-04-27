## Diagnóstico

A importação do CSV `Planilha_sem_título_-_leads_acesse-o-catalogo` (282 linhas, 277 telefones únicos) na campanha `FN | Prospecção Ativa da Base` (`abbdb4ea-...`) resultou em:

- **`leads`**: 277 leads inseridos com `active_campaign_id` correto ✅
- **`call_leads`** (fila da campanha): apenas **81** linhas ❌

### Causa raiz

Os 81 leads que entraram em `call_leads` correspondem **exatamente ao 2º batch em diante** do upsert:
- Batch 1 (linhas CSV 1–200, telefones `5511…` a `5554…`) → **NÃO entrou**
- Batch 2 (linhas 201–277, telefones `5555…` em diante) → entrou (77 leads), somados a 4 leads de imports anteriores = 81

No `useLeads.ts` (linhas 412–427), o loop faz:
```ts
for (let i = 0; i < campaignLeads.length; i += 200) {
  const batch = campaignLeads.slice(i, i + 200);
  const rows = batch.map(...);
  await supabase.from("call_leads").upsert(rows, { onConflict: "phone,campaign_id" });
}
```

O resultado de `.upsert()` **não é verificado**. O 1º batch falhou silenciosamente (provavelmente timeout/payload — 200 rows em uma única requisição é grande, ou alguma row violou RLS/constraint), o erro foi engolido e o loop continuou normalmente para o batch 2.

A mesma falha cega existe nos outros 3 caminhos de sync:
- `useLeads.ts` linha 300 (sync no `bulkAddToCampaign`)
- `useLeads.ts` linha 423 (sync `call_leads` no import) — **este é o que falhou agora**
- `useLeads.ts` linha 463 (sync `dispatch_campaign_contacts` no import)

Além disso o loop principal de inserção em `leads` (linhas 356–396) faz **277 inserts sequenciais await-ados** — extremamente lento (~30–60s) e sem feedback de progresso, o que aumenta a chance de o usuário fechar o diálogo no meio.

## Plano de correção

### 1. Reduzir tamanho do batch e capturar erros (`src/hooks/useLeads.ts`)

No loop de sync para `call_leads` (linhas 412–427):
- Reduzir batch de **200 → 50** (mais robusto contra timeout / payload)
- Capturar `error` do upsert e contabilizar `syncFailed` por batch
- Em caso de erro do batch, fazer **fallback row-a-row** (insertar individualmente os 50 para isolar quais falharam) e contar sucessos
- Aplicar o mesmo padrão (batch 50 + checagem de erro) para o sync de `dispatch_campaign_contacts` (linhas 445–466) e para o sync dentro de `bulkAddToCampaign` (linhas 277–328)

### 2. Acelerar o loop principal de inserção em `leads`

Substituir o for-loop de 277 inserts sequenciais (linhas 356–396) por:
- Tentar **insert em batch de 100** com `.insert(rows)` 
- Em caso de erro de duplicidade no batch, fazer fallback row-a-row para preservar a lógica de `updateExisting`
- Reduz de ~30–60s para ~3–5s e diminui a chance de o usuário cancelar

### 3. Retornar contadores reais e mostrar no toast

A mutation `importLeads` hoje retorna `{ imported, updated, skipped }`. Adicionar:
```ts
return {
  imported, updated, skipped,
  callLeadsSynced,    // novo
  callLeadsFailed,    // novo
  dispatchSynced,     // novo
  dispatchFailed,     // novo
};
```

No `Leads.tsx` (callback `onSuccess` da `importLeads.mutate`) exibir toast diferenciado quando `callLeadsFailed > 0` ou `dispatchFailed > 0`, com botão "Tentar novamente" que reexecuta apenas o sync para os telefones faltantes.

### 4. Recuperação imediata para o caso atual

Após o deploy do fix, oferecer ao usuário um caminho para "ressincronizar" os 196 leads faltantes da campanha `FN | Prospecção Ativa da Base`. Duas opções:

**Opção A (recomendada):** Adicionar um botão **"Sincronizar leads da base"** na aba Leads da campanha de ligação, que lê todos os `leads` com `active_campaign_id = <esta campanha>` e insere em `call_leads` os que ainda não estão lá (em batches de 50 com checagem de erro). Resolve o problema atual e fica disponível para o futuro.

**Opção B (one-shot):** Fazer um migration SQL que detecta a defasagem e insere as 196 linhas faltantes:
```sql
INSERT INTO call_leads (campaign_id, user_id, phone, name, email, status)
SELECT 'abbdb4ea-...', l.user_id, l.phone, l.name, l.email, 'pending'
FROM leads l
WHERE l.active_campaign_id = 'abbdb4ea-...'
  AND NOT EXISTS (
    SELECT 1 FROM call_leads cl
    WHERE cl.campaign_id = 'abbdb4ea-...' AND cl.phone = l.phone
  );
```

Vou implementar **A + B** — A porque é a forma sustentável e B porque resolve o caso concreto agora.

## Arquivos afetados

- `src/hooks/useLeads.ts` — batches de 50, captura de erro, fallback row-a-row, novos contadores
- `src/pages/Leads.tsx` — toast melhorado com avisos de sync parcial
- `src/components/call-campaigns/tabs/LeadsTab.tsx` — botão "Sincronizar leads da base"
- `supabase/migrations/<new>.sql` — backfill imediato dos 196 leads faltantes da campanha atual

## Comportamento final

1. Importação de CSVs grandes (200+ leads) sem perda silenciosa
2. Toast informa quantos leads foram sincronizados na campanha e quantos falharam
3. Botão de ressincronização disponível na aba Leads de cada campanha de ligação
4. Os 196 leads faltantes da campanha `FN | Prospecção Ativa da Base` aparecem na fila imediatamente após o deploy

## Fora do escopo

- Mudar a importação para uma Edge Function (ganho marginal vs complexidade) — mantemos client-side
- Permitir mapeamento de coluna "campanha" por UUID (hoje só por nome) — é outro problema separado; o usuário compensou usando "Campanha padrão para todos"
- Progress bar visual durante a importação — pode vir depois
