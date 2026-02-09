
# Plano: Selecionar Campanha e Sequencia no tipo "Iniciar Sequencia"

Substituir o campo de texto "ID da Sequencia" por dois selects encadeados: primeiro o usuario escolhe a Campanha de Grupo, depois escolhe a Sequencia dessa campanha.

---

## Alteracao

| Arquivo | O que muda |
|---------|-----------|
| `src/components/call-campaigns/tabs/ActionsTab.tsx` | Substituir input de UUID por dois Selects (Campanha -> Sequencia) |

---

## Implementacao

### 1. Importar hooks necessarios

```typescript
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { useSequences } from "@/hooks/useSequences";
```

### 2. Adicionar estados e dados

Dentro do componente `ActionsTab`:
- Usar `useGroupCampaigns()` para listar todas as campanhas de grupo
- Usar `useSequences(selectedCampaignId)` para listar sequencias da campanha selecionada
- O `selectedCampaignId` vem de `formData.actionConfig.campaignId`

### 3. Substituir o bloco `start_sequence`

O campo atual (input de UUID) sera substituido por:

```typescript
{formData.actionType === "start_sequence" && (
  <>
    <div className="grid gap-2">
      <Label>Campanha de Grupo</Label>
      <Select
        value={(formData.actionConfig.campaignId as string) || ""}
        onValueChange={(v) =>
          setFormData({
            ...formData,
            actionConfig: { campaignId: v, sequenceId: "" },
          })
        }
      >
        <SelectTrigger><SelectValue placeholder="Selecione a campanha" /></SelectTrigger>
        <SelectContent>
          {groupCampaigns.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {formData.actionConfig.campaignId && (
      <div className="grid gap-2">
        <Label>Sequencia</Label>
        <Select
          value={(formData.actionConfig.sequenceId as string) || ""}
          onValueChange={(v) =>
            setFormData({
              ...formData,
              actionConfig: { ...formData.actionConfig, sequenceId: v },
            })
          }
        >
          <SelectTrigger><SelectValue placeholder="Selecione a sequencia" /></SelectTrigger>
          <SelectContent>
            {campaignSequences.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}
  </>
)}
```

### 4. Atualizar resumo na lista

O `getConfigSummary` para `start_sequence` passara a mostrar o nome da sequencia (se disponivel) em vez do UUID truncado.

---

## Comportamento

1. Ao selecionar "Iniciar Sequencia", aparece o select de **Campanha de Grupo**
2. Ao escolher uma campanha, aparece o select de **Sequencia** com as sequencias daquela campanha
3. Trocar a campanha limpa a sequencia selecionada
4. Ambos os valores (`campaignId` e `sequenceId`) sao salvos no `actionConfig`

---

## Dados salvos no actionConfig

```typescript
{
  campaignId: "uuid-da-campanha-de-grupo",
  sequenceId: "uuid-da-sequencia"
}
```

A logica de execucao em `useCallLeads.ts` ja usa `actionConfig.sequenceId`, entao continuara funcionando sem alteracoes.
