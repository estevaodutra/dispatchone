
# Correção: Permitir Quebra de Linha na Pergunta da Enquete

## Problema Identificado

O campo "Pergunta" da enquete está usando o componente `<Input>`, que é um campo de texto de linha única e não aceita quebras de linha (Enter).

**Código atual (linha 375-379):**
```tsx
<Input
  placeholder="Qual sua preferência?"
  value={(node.config.question as string) || ""}
  onChange={(e) => updateConfig("question", e.target.value)}
  maxLength={255}
/>
```

## Solução

Substituir o `<Input>` por `<Textarea>` para o campo da pergunta, permitindo que o usuário digite textos com múltiplas linhas.

---

## Mudanças Necessárias

### Arquivo: `src/components/group-campaigns/sequences/NodeConfigPanel.tsx`

1. **Adicionar import do Textarea** (se não existir):
   ```tsx
   import { Textarea } from "@/components/ui/textarea";
   ```

2. **Substituir Input por Textarea** (linhas 375-380):
   ```tsx
   // DE:
   <Input
     placeholder="Qual sua preferência?"
     value={(node.config.question as string) || ""}
     onChange={(e) => updateConfig("question", e.target.value)}
     maxLength={255}
   />

   // PARA:
   <Textarea
     placeholder="Qual sua preferência?"
     value={(node.config.question as string) || ""}
     onChange={(e) => updateConfig("question", e.target.value)}
     maxLength={255}
     rows={3}
     className="resize-none"
   />
   ```

---

## Resumo Técnico

| Item | Arquivo | Alteração |
|------|---------|-----------|
| 1 | `NodeConfigPanel.tsx` | Adicionar import do `Textarea` |
| 2 | `NodeConfigPanel.tsx` | Substituir `<Input>` por `<Textarea>` no campo "Pergunta" da enquete |

---

## Resultado Esperado

Após a mudança, o campo "Pergunta" terá 3 linhas de altura e aceitará quebras de linha quando o usuário pressionar Enter. O texto poderá incluir formatação como:

```
⚠ *NOVO PEDIDO* - {{fileName}}

Selecione o status:
```
