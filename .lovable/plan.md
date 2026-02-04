

# Plano: Adicionar Icones nas Categorias de Webhook

Adicionar icones visuais para cada categoria de webhook na secao "Configurar Webhooks" da documentacao da API, melhorando a identificacao visual.

---

## Alteracao

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/api-docs/WebhookConfigSection.tsx` | Adicionar mapeamento de icones e exibi-los antes do nome da categoria |

---

## Icones por Categoria

| Categoria | Icone (Lucide) |
|-----------|----------------|
| messages | `MessageSquare` |
| instance | `Server` |
| groups | `Users` |
| calls | `Phone` |
| contacts | `Contact` |
| chat | `MessagesSquare` |
| profile | `User` |
| webhooks | `Webhook` |
| utilities | `Wrench` |

---

## Codigo a Adicionar

1. **Importar icones do lucide-react:**
```typescript
import { Phone, MessageSquare, Server, Users, Contact, MessagesSquare, User, Wrench } from "lucide-react";
```

2. **Criar mapeamento de icones:**
```typescript
const categoryIcons: Record<string, React.ReactNode> = {
  messages: <MessageSquare className="h-4 w-4" />,
  instance: <Server className="h-4 w-4" />,
  groups: <Users className="h-4 w-4" />,
  calls: <Phone className="h-4 w-4" />,
  contacts: <Contact className="h-4 w-4" />,
  chat: <MessagesSquare className="h-4 w-4" />,
  profile: <User className="h-4 w-4" />,
  webhooks: <Webhook className="h-4 w-4" />,
  utilities: <Wrench className="h-4 w-4" />,
};
```

3. **Adicionar icone antes do nome da categoria:**
```typescript
<div className="flex items-center gap-2">
  {categoryIcons[category.id]}
  <span className="font-medium text-foreground">{category.name}</span>
  ...
</div>
```

---

## Resultado Visual

Cada categoria exibira um icone representativo ao lado esquerdo do nome:

- Mensagens (icone de mensagem)
- Instancia (icone de servidor)
- Grupos (icone de usuarios)
- **Ligacoes (icone de telefone)**
- Contatos (icone de contato)
- Conversas (icone de mensagens)
- Perfil (icone de usuario)
- Webhooks (icone de webhook)
- Utilitarios (icone de ferramenta)

