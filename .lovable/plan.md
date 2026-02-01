
# Plano: Sistema de Mapeamento de Campos para Webhook Externo

## Visão Geral

Atualmente, o gatilho "Webhook externo" apenas mostra uma URL para copiar. O sistema precisa ser expandido para:

1. **Criar um endpoint real** (`trigger-sequence`) que recebe webhooks externos
2. **Permitir mapeamento de campos** do payload recebido para variáveis usáveis nas mensagens
3. **Expandir a substituição de variáveis** no `execute-message` para suportar campos customizados

---

## Como Vai Funcionar

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DO WEBHOOK EXTERNO                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Sistema Externo]  ──POST──>  [trigger-sequence]  ──>  [execute-message]   │
│                                                                             │
│  Payload JSON:                 Mapeamento:              Mensagem Final:     │
│  {                             user.nome → {{nome}}     "Olá João,          │
│    "user": {                   user.email → {{email}}    seu email é        │
│      "nome": "João",           custom.codigo → {{cod}}   joao@mail.com      │
│      "email": "joao@..."                                 código: ABC123"    │
│    },                                                                       │
│    "custom": {                                                              │
│      "codigo": "ABC123"                                                     │
│    }                                                                        │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Necessárias

### 1. Criar Edge Function `trigger-sequence`

**Arquivo:** `supabase/functions/trigger-sequence/index.ts`

Endpoint que receberá webhooks externos e disparará sequências:

- **Rota:** `POST /functions/v1/trigger-sequence/{sequenceId}`
- **Autenticação:** Sem JWT (público), mas valida que a sequência existe e está ativa
- **Funcionalidades:**
  - Recebe qualquer payload JSON
  - Busca a sequência pelo ID na URL
  - Extrai os campos mapeados conforme `trigger_config.fieldMappings`
  - Chama `execute-message` com `triggerContext` contendo os dados extraídos

**Lógica de extração de campos:**
```javascript
// Para path como "user.nome", extrai rawPayload.user.nome
function extractField(payload, path) {
  return path.split('.').reduce((obj, key) => obj?.[key], payload);
}
```

---

### 2. Atualizar Interface `TriggerConfig`

**Arquivo:** `src/components/group-campaigns/sequences/TriggerConfigCard.tsx`

Adicionar campo `fieldMappings` no tipo `TriggerConfig`:

```typescript
export interface TriggerConfig {
  // ... campos existentes ...
  webhookId?: string;
  fieldMappings?: Array<{
    sourceField: string;  // Path no payload: "user.name", "data.email"
    variableName: string; // Nome da variável: "nome", "email"
  }>;
}
```

---

### 3. Criar UI de Mapeamento de Campos

**Arquivo:** `src/components/group-campaigns/sequences/TriggerConfigCard.tsx`

Expandir a seção de "Webhook externo" com:

- Lista de mapeamentos configurados
- Botão "Adicionar Campo" para criar novo mapeamento
- Cada item mostra: `Campo no Payload → Variável`
- Input para "Caminho do campo" (ex: `user.email`, `dados.nome`)
- Input para "Nome da variável" (ex: `email`, `nome`) 
- Botão remover para cada mapeamento
- Tabela de variáveis disponíveis para usar nas mensagens

**Preview da UI:**
```text
┌──────────────────────────────────────────────────────────────┐
│  Mapeamento de Campos                                        │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ user.name         →    {{nome}}                   [X]   │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ user.email        →    {{email}}                  [X]   │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ order.id          →    {{pedido}}                 [X]   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [+ Adicionar Campo]                                         │
│                                                              │
│  ℹ️ Use {{nome}}, {{email}}, {{pedido}} nas mensagens        │
└──────────────────────────────────────────────────────────────┘
```

---

### 4. Atualizar `execute-message` para Suportar Campos Customizados

**Arquivo:** `supabase/functions/execute-message/index.ts`

Expandir o `TriggerContext` e a função `replaceVariables`:

```typescript
interface TriggerContext {
  respondentPhone: string;
  respondentName: string;
  respondentJid: string;
  groupJid: string;
  pollOptionText?: string;
  sendPrivate: boolean;
  // NOVO: Campos customizados do webhook
  customFields?: Record<string, string>;
}

const replaceVariables = (text: string): string => {
  if (!text) return text;
  let result = text;
  
  // Variáveis built-in
  if (triggerContext) {
    result = result.replace(/\{\{name\}\}/g, triggerContext.respondentName || "");
    result = result.replace(/\{\{phone\}\}/g, triggerContext.respondentPhone || "");
    result = result.replace(/\{\{option\}\}/g, triggerContext.pollOptionText || "");
    
    // NOVO: Variáveis customizadas
    if (triggerContext.customFields) {
      for (const [key, value] of Object.entries(triggerContext.customFields)) {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
      }
    }
  }
  return result;
};
```

---

### 5. Atualizar URL do Webhook na UI

**Arquivo:** `src/components/group-campaigns/sequences/TriggerConfigCard.tsx`

Corrigir a URL para apontar para a Edge Function real:

```typescript
// De:
const webhookUrl = `${window.location.origin}/api/trigger-sequence/${sequenceId}`;

// Para:
const webhookUrl = sequenceId 
  ? `https://btvzspqcnzcslkdtddwl.supabase.co/functions/v1/trigger-sequence/${sequenceId}`
  : "";
```

---

### 6. Adicionar Documentação na UI

Mostrar exemplo de payload esperado:

```text
┌──────────────────────────────────────────────────────────────┐
│  📋 Exemplo de Payload                                       │
├──────────────────────────────────────────────────────────────┤
│  POST https://...supabase.co/functions/v1/trigger-sequence/  │
│       {sequence-id}                                          │
│                                                              │
│  Content-Type: application/json                              │
│                                                              │
│  {                                                           │
│    "user": {                                                 │
│      "name": "João Silva",                                   │
│      "email": "joao@exemplo.com"                             │
│    },                                                        │
│    "destination": {                                          │
│      "phone": "5511999999999"  // opcional                   │
│    }                                                         │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Resumo dos Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/trigger-sequence/index.ts` | **CRIAR** - Endpoint para receber webhooks externos |
| `supabase/config.toml` | Adicionar configuração da nova função |
| `src/components/group-campaigns/sequences/TriggerConfigCard.tsx` | Adicionar UI de mapeamento de campos e corrigir URL |
| `supabase/functions/execute-message/index.ts` | Expandir `TriggerContext` e `replaceVariables` |

---

## Funcionalidades Incluídas

1. **Recebimento de webhooks externos** - Qualquer sistema pode disparar sequências
2. **Mapeamento flexível de campos** - Suporta paths aninhados (`user.profile.name`)
3. **Variáveis customizadas nas mensagens** - Usar `{{qualquer_nome}}` definido no mapeamento
4. **Destino opcional** - Pode enviar para todos os grupos ou para um telefone específico
5. **Documentação inline** - Exemplo de payload na própria UI
6. **Compatibilidade total** - Mantém as variáveis existentes (`{{name}}`, `{{phone}}`, `{{option}}`)
