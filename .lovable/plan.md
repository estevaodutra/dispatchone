

# Plano: Adicionar Opção de Alterar Tipo no Dialog de Detalhes do Evento

## Problema Identificado

Na tela de "Detalhes do Evento", o tipo do evento é exibido apenas como um badge informativo. O usuário não consegue alterar o tipo diretamente, exceto se o evento estiver com `classification === "pending"`.

No exemplo do usuário, o evento foi classificado incorretamente como "message_received" quando deveria ser "poll_vote" (o payload contém `pollVote`).

## Solução

Transformar o campo "Tipo" em um select editável inline, permitindo que o usuário altere o tipo do evento diretamente no dialog de detalhes, independente da classificação atual.

---

## Mudanças Necessárias

### Arquivo: `src/pages/WebhookEvents.tsx`

**1. Adicionar estado para controlar edição do tipo:**

```typescript
const [isEditingEventType, setIsEditingEventType] = useState(false);
const [editedEventType, setEditedEventType] = useState("");
```

**2. Substituir o badge estático por um componente editável:**

Na seção "Informações Gerais" (linhas 432-438), alterar o campo "Tipo" de:

```tsx
<div>
  <span className="text-muted-foreground">Tipo:</span>
  <div className="mt-1">
    <EventTypeBadge eventType={selectedEvent.eventType} />
  </div>
</div>
```

Para:

```tsx
<div>
  <span className="text-muted-foreground">Tipo:</span>
  <div className="mt-1 flex items-center gap-2">
    {isEditingEventType ? (
      <div className="flex items-center gap-2">
        <Select value={editedEventType} onValueChange={setEditedEventType}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.filter((t) => t !== "unknown").map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={handleSaveEventType}
          disabled={classifyMutation.isPending}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => setIsEditingEventType(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      <>
        <EventTypeBadge eventType={selectedEvent.eventType} />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            setEditedEventType(selectedEvent.eventType);
            setIsEditingEventType(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </>
    )}
  </div>
</div>
```

**3. Adicionar função para salvar o novo tipo:**

```typescript
const handleSaveEventType = async () => {
  if (selectedEvent && editedEventType && editedEventType !== selectedEvent.eventType) {
    await classifyMutation.mutateAsync({ id: selectedEvent.id, eventType: editedEventType });
    toast({ title: "Tipo alterado", description: `Evento reclassificado para "${editedEventType.replace(/_/g, " ")}"` });
    setIsEditingEventType(false);
    // Update local state to reflect change
    setSelectedEvent({ ...selectedEvent, eventType: editedEventType, classification: "identified" });
  } else {
    setIsEditingEventType(false);
  }
};
```

**4. Resetar estado ao fechar o dialog:**

Atualizar o handler do dialog para resetar o estado de edição:

```tsx
<Dialog 
  open={!!selectedEvent && !showClassifyDialog} 
  onOpenChange={(open) => {
    if (!open) {
      setSelectedEvent(null);
      setIsEditingEventType(false);
    }
  }}
>
```

**5. Adicionar imports necessários:**

```typescript
import { Check, X, Pencil } from "lucide-react";
```

---

## Resumo Técnico

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/WebhookEvents.tsx` | Adicionar estados `isEditingEventType` e `editedEventType` |
| `src/pages/WebhookEvents.tsx` | Substituir badge estático por select editável inline |
| `src/pages/WebhookEvents.tsx` | Adicionar função `handleSaveEventType` |
| `src/pages/WebhookEvents.tsx` | Resetar estado ao fechar dialog |
| `src/pages/WebhookEvents.tsx` | Adicionar imports `Check`, `X`, `Pencil` |

---

## Resultado Esperado

Antes:
```
Tipo: [message received]  (badge estático)
```

Depois:
```
Tipo: [message received] [✏️]  (badge + ícone de editar)
      ↓ (ao clicar no ícone)
Tipo: [▼ poll vote      ] [✓] [✗]  (select + salvar + cancelar)
```

O usuário poderá:
1. Ver o tipo atual como badge
2. Clicar no ícone de lápis para editar
3. Selecionar o novo tipo no dropdown
4. Salvar ou cancelar a alteração
5. Ver a atualização imediata na tela

