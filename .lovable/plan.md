
# Ajustar Timer e Adicionar Checkbox para Acoes em Massa

## Resumo

Duas alteracoes no Painel de Ligacoes:
1. O timer so sera regressivo (countdown) para ligacoes com status "agendada". Todos os outros status mostrarao "—".
2. Adicionar uma coluna de checkbox na tabela para selecao de linhas e uma barra de acoes em massa.

## Mudancas

### 1. Timer somente regressivo para agendadas

No componente `TimerCell`, remover o timer crescente para ligacoes "em ligacao" (in_progress). Apenas ligacoes com status "scheduled" que ainda tem tempo restante mostrarao o countdown. Todos os demais status (in_progress, completed, cancelled, failed, no_answer) mostrarao "—".

**Antes:**
- in_progress: tempo crescente desde startedAt
- scheduled com timer > 0: countdown
- demais: "—"

**Depois:**
- scheduled com timer > 0: countdown regressivo
- todos os demais (incluindo in_progress): "—"

### 2. Checkbox para acoes em massa

Adicionar na primeira coluna da tabela um `Checkbox` para selecao individual e no header um checkbox "selecionar todos" (da pagina atual).

**Estado:**
- `selectedIds: Set<string>` — IDs das ligacoes selecionadas
- Checkbox no header: seleciona/deseleciona todos da pagina
- Checkbox em cada linha: seleciona/deseleciona individual

**Barra de acoes em massa:**
Quando houver itens selecionados, exibir uma barra fixa acima da tabela com:
- Contador: "X selecionadas"
- Botao "Cancelar selecionadas" (vermelho) — cancela todas as ligacoes selecionadas que estao em status agendada/ready
- Botao "Reagendar selecionadas" — abre dialog de reagendamento que aplica para todas
- Botao "Limpar selecao"

### Detalhes Tecnicos

**Arquivo:** `src/pages/CallPanel.tsx`

- Importar `Checkbox` de `@/components/ui/checkbox`
- Adicionar estado `const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())`
- Limpar selecao ao mudar filtros ou pagina
- Nova coluna `<TableHead className="w-[40px]">` antes de "Entrada"
- Nova `<TableCell>` com `<Checkbox>` em cada linha
- Componente `BulkActionsBar` renderizado condicionalmente acima da tabela quando `selectedIds.size > 0`
- Acoes em massa utilizam as mutations existentes (`cancelCall`, `rescheduleCall`) em loop
