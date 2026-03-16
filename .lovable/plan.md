

## Adicionar reprodutor de gravação de chamada no CallActionDialog

### Contexto
A coluna `audio_url` já existe na tabela `call_logs` e é preenchida pelo endpoint `call-status` quando o provedor envia a URL da gravação. O `CallPanelEntry` já carrega `audioUrl`. Porém, o `CallActionDialog` não recebe nem exibe essa informação.

### Alterações

**1. `src/components/operator/CallActionDialog.tsx`**
- Adicionar `audioUrl?: string | null` em `CallActionDialogProps` e `CallDialogData`
- Incluir `audio_url` na query de histórico (`CallLogEntry`)
- Incluir `audio_url` na query de navegação (`handleGoBack`)
- Renderizar um `<audio controls>` player entre o header e as tabs, visível quando `audioUrl` existe
- No histórico, mostrar player inline para cada entry com `audio_url`

**2. `src/pages/CallPanel.tsx`**
- Passar `audioUrl` ao `CallActionDialog` via `viewingQueueLead` (que já tem `audioUrl` do `CallPanelEntry`)

**3. `src/components/operator/CallPopup.tsx`**
- Passar `audioUrl={currentCall.audioUrl}` ao `CallActionDialog`

### UI do player
- Seção discreta abaixo do timer no header, com ícone de headphones e label "🎧 Gravação"
- Elemento `<audio>` nativo com `controls`, `preload="metadata"`
- No histórico, player compacto por entry

### Arquivos
| Arquivo | Ação |
|---------|------|
| `src/components/operator/CallActionDialog.tsx` | Adicionar prop, query, e renderização do player |
| `src/pages/CallPanel.tsx` | Passar `audioUrl` para o dialog |
| `src/components/operator/CallPopup.tsx` | Passar `audioUrl` para o dialog |

