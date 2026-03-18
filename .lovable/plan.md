

## Plano: Corrigir importação CSV para atribuir campanha automaticamente

### Problema identificado

Dois bugs na importação:

1. **Parser CSV ingênuo** — O código faz `line.split(",")` que quebra em campos com vírgulas dentro de aspas (ex: `"Club Fisio Paulista: Fisioterapia, Reabilitação, Treinamento Funcional"`). Isso desalinha as colunas, fazendo com que a coluna "campanha" não seja lida corretamente para essas linhas.

2. **Match de campanha por nome exato** — O `findCampaignByName` faz match exato (`c.name.toLowerCase() === lower`). Se não existir uma campanha chamada exatamente "Prospecção Fria | Video de IA", o `campaignId` fica `undefined` e o lead é salvo sem campanha. Além disso, o `|` no CSV pode indicar que são **duas campanhas separadas** — o sistema não suporta isso.

### Correções

**Arquivo:** `src/components/leads/ImportLeadsDialog.tsx`

#### 1. Substituir parser CSV por um que respeite aspas

Trocar o `line.split(",")` por uma função que parse campos quoted corretamente (RFC 4180):

```typescript
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current.trim()); current = ""; }
      else current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
```

Aplicar tanto no parse dos headers quanto das linhas de dados.

#### 2. Match de campanha com busca parcial

Trocar o match exato por busca que inclua correspondência parcial (`includes`) e que suporte o separador `|` como múltiplas tentativas de nome:

```typescript
const findCampaignByName = (name: string): CampaignOption | undefined => {
  // Tenta match exato primeiro
  const lower = name.toLowerCase().trim();
  const exact = campaigns.find(c => c.name.toLowerCase() === lower);
  if (exact) return exact;
  // Tenta cada parte separada por |
  const parts = lower.split("|").map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    const match = campaigns.find(c => c.name.toLowerCase() === part);
    if (match) return match;
  }
  // Tenta match parcial (contém)
  return campaigns.find(c => lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(lower));
};
```

### Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `src/components/leads/ImportLeadsDialog.tsx` | Corrigir parser CSV + match de campanha |

