
# Plano: Atualizar Tabela de Leads

Modificar a tabela de leads para incluir Data/Hora, reordenar colunas, remover Tentativas e adicionar botão de Detalhes.

---

## Alterações na Tabela

| Coluna Atual | Nova Configuração |
|--------------|-------------------|
| Telefone | Manter |
| Nome | Manter |
| Status | Manter |
| Tentativas | **Remover** |
| Ações (só delete) | Substituir por **Detalhes** + Delete |
| - | **Adicionar: Data/Hora** (createdAt) |

---

## Nova Estrutura da Tabela

| Data/Hora | Nome | Telefone | Status | Ações |
|-----------|------|----------|--------|-------|
| 04/02/2026 14:30 | Estevão | 5512982402981 | Concluído | [Detalhes] [🗑] |

---

## Implementação

### 1. Importar hook de ações e componentes necessários

```typescript
import { useCallActions } from "@/hooks/useCallActions";
import { Eye } from "lucide-react"; // Ícone para detalhes
import { format } from "date-fns"; // Para formatar data
```

### 2. Adicionar estado para dialog de detalhes

```typescript
const { actions } = useCallActions(campaignId);
const [selectedLead, setSelectedLead] = useState<CallLead | null>(null);
```

### 3. Atualizar colunas da tabela

```typescript
<TableHeader>
  <TableRow>
    <TableHead>Data/Hora</TableHead>
    <TableHead>Nome</TableHead>
    <TableHead>Telefone</TableHead>
    <TableHead>Status</TableHead>
    <TableHead className="w-[100px]">Ações</TableHead>
  </TableRow>
</TableHeader>
```

### 4. Atualizar células da tabela

```typescript
<TableCell className="text-muted-foreground text-sm">
  {format(new Date(lead.createdAt), "dd/MM/yyyy HH:mm")}
</TableCell>
<TableCell>{lead.name || "-"}</TableCell>
<TableCell className="font-medium">{lead.phone}</TableCell>
<TableCell>
  <Badge className={statusColors[lead.status]}>
    {statusLabels[lead.status]}
  </Badge>
</TableCell>
<TableCell>
  <div className="flex items-center gap-1">
    <Button variant="ghost" size="icon" onClick={() => setSelectedLead(lead)}>
      <Eye className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" onClick={() => deleteLead(lead.id)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</TableCell>
```

### 5. Dialog de Detalhes do Lead

```typescript
<Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Detalhes do Lead</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      {/* Informações do lead */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nome</Label>
          <p>{selectedLead?.name || "-"}</p>
        </div>
        <div>
          <Label>Telefone</Label>
          <p>{selectedLead?.phone}</p>
        </div>
        <div>
          <Label>Status</Label>
          <Badge>{statusLabels[selectedLead?.status]}</Badge>
        </div>
        <div>
          <Label>Data de Criação</Label>
          <p>{format(new Date(selectedLead?.createdAt), "dd/MM/yyyy HH:mm")}</p>
        </div>
      </div>

      {/* Ação selecionada (se houver) */}
      {selectedLead?.resultActionId && (
        <div>
          <Label>Resultado</Label>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: resultAction?.color }} />
            <span>{resultAction?.name}</span>
          </div>
        </div>
      )}

      {/* Notas (se houver) */}
      {selectedLead?.resultNotes && (
        <div>
          <Label>Notas</Label>
          <p>{selectedLead.resultNotes}</p>
        </div>
      )}

      {/* Lista de ações da campanha */}
      <div>
        <Label>Ações Configuradas</Label>
        <div className="space-y-2 mt-2">
          {actions.map((action) => (
            <div key={action.id} className="flex items-center gap-2 p-2 rounded border">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: action.color }} />
              <span>{action.name}</span>
              <span className="text-xs text-muted-foreground">
                ({actionTypeLabels[action.actionType]})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

## Arquivo Modificado

| Arquivo | Alteração |
|---------|-----------|
| `src/components/call-campaigns/tabs/LeadsTab.tsx` | Atualizar tabela e adicionar dialog de detalhes |

---

## Dependências

- `date-fns` (já instalado no projeto)
- `useCallActions` hook (já existente)
