

# Plano: Adicionar Icone na Categoria "Ligacoes" do Sidebar

A categoria de endpoints "Ligacoes" (id: `calls`) nao possui icone no menu lateral da documentacao da API porque o mapeamento de icones nao inclui essa categoria.

---

## Problema

O arquivo `src/components/api-docs/ApiSidebar.tsx` tem um mapeamento de icones na linha 12-20:

```typescript
const categoryIcons: Record<string, React.ReactNode> = {
  messages: <MessageSquare className="h-4 w-4" />,
  instance: <Server className="h-4 w-4" />,
  webhooks: <Webhook className="h-4 w-4" />,
  "poll-responses": <Vote className="h-4 w-4" />,
  "webhooks-inbound": <Radio className="h-4 w-4" />,
  validation: <CheckCircle className="h-4 w-4" />,
  queries: <Search className="h-4 w-4" />,
  // FALTA: calls
};
```

A categoria `calls` (Ligacoes) foi adicionada recentemente mas o icone nao foi incluido no mapeamento.

---

## Alteracao

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/api-docs/ApiSidebar.tsx` | Importar icone `Phone` e adicionar ao mapeamento |

---

## Codigo

1. **Adicionar import do icone Phone:**
```typescript
import { ..., Phone } from "lucide-react";
```

2. **Adicionar ao mapeamento de icones:**
```typescript
const categoryIcons: Record<string, React.ReactNode> = {
  messages: <MessageSquare className="h-4 w-4" />,
  instance: <Server className="h-4 w-4" />,
  webhooks: <Webhook className="h-4 w-4" />,
  "poll-responses": <Vote className="h-4 w-4" />,
  "webhooks-inbound": <Radio className="h-4 w-4" />,
  validation: <CheckCircle className="h-4 w-4" />,
  queries: <Search className="h-4 w-4" />,
  calls: <Phone className="h-4 w-4" />,  // ADICIONAR
};
```

---

## Resultado

A categoria "Ligacoes" passara a exibir o icone de telefone (Phone) no menu lateral, mantendo consistencia visual com as demais categorias.

