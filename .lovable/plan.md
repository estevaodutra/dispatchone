

## Refatoração: Consolidar Mensagens em Sequências

### Visão Geral

A aba "Mensagens" será removida e toda a funcionalidade de automação será consolidada na aba "Sequências". Cada sequência terá um **componente de gatilho fixo** (Trigger) no topo que define quando a sequência é executada.

---

### Tipos de Gatilho (Triggers)

| Gatilho | Descrição | Configuração |
|---------|-----------|--------------|
| **Membro entrar no grupo** | Dispara quando um novo membro entra | Opção: Enviar no privado |
| **Membro sair do grupo** | Dispara quando um membro sai | Opção: Enviar no privado |
| **Agendado** | Dispara em horários programados | Dias da semana + Horários (manual ou intervalo) |
| **Palavra-chave** | Dispara quando uma palavra/frase é detectada | Palavra-chave + Match exato/contém |
| **Webhook externo** | Dispara por outra automação/API | URL única para receber POST |
| **Manual** | Disparado apenas pelo usuário | Botão de teste/envio |

---

### Arquitetura de Componentes

```text
SequencesTab (existente)
├── SequenceList (atualizado)
│   └── Cards com preview do trigger
│
└── SequenceBuilder (atualizado)
    ├── TriggerConfigCard [NOVO - fixo no topo]
    │   ├── Seletor de tipo de gatilho
    │   └── Configurações específicas do gatilho
    │
    └── NodeList (existente)
        └── Nodes de ação (mensagem, delay, etc.)
```

---

### Mudanças por Arquivo

#### 1. Remover Aba "Mensagens"

| Arquivo | Ação |
|---------|------|
| `src/components/group-campaigns/GroupCampaignDetails.tsx` | Remover import e TabContent de MessagesTab; reduzir grid-cols de 7 para 6 |
| `src/components/group-campaigns/tabs/MessagesTab.tsx` | **DELETAR** arquivo |
| `src/components/group-campaigns/index.ts` | Remover export da MessagesTab |

#### 2. Criar Componente TriggerConfigCard

**Novo arquivo:** `src/components/group-campaigns/sequences/TriggerConfigCard.tsx`

- Card fixo que aparece sempre no topo do SequenceBuilder
- Não é arrastável/deletável (é obrigatório)
- Contém configurações específicas por tipo de trigger:
  - **member_join/member_leave**: Switch "Enviar no privado"
  - **scheduled**: Seletor de dias + horários (reutilizar lógica do MessagesTab)
  - **keyword**: Input para palavra-chave + tipo de match
  - **webhook**: Exibe URL única para receber eventos
  - **manual**: Apenas informativo

#### 3. Atualizar SequenceBuilder

| Arquivo | Alteração |
|---------|-----------|
| `src/components/group-campaigns/sequences/SequenceBuilder.tsx` | Adicionar TriggerConfigCard acima da lista de nodes |

#### 4. Atualizar SequenceList

| Arquivo | Alteração |
|---------|-----------|
| `src/components/group-campaigns/sequences/SequenceList.tsx` | Mostrar preview da configuração do trigger no card (ex: "Seg-Sex às 10:00, 14:00") |

#### 5. Atualizar useSequences

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useSequences.ts` | Garantir que `triggerConfig` aceita todas as configurações necessárias (schedule, keyword, sendPrivate, etc.) |

---

### Estrutura do triggerConfig no Banco

A coluna `trigger_config` (JSONB) na tabela `message_sequences` armazenará:

```typescript
// member_join ou member_leave
{
  sendPrivate: boolean;
}

// scheduled
{
  days: number[];           // [0-6] para dom-sáb
  times: string[];          // ["10:00", "14:00"]
  mode: "manual" | "interval";
  intervalConfig?: {
    start: string;
    end: string;
    minutes: number;
  };
}

// keyword
{
  keyword: string;
  matchType: "exact" | "contains" | "startsWith";
  caseSensitive: boolean;
}

// webhook
{
  webhookId: string;        // ID único para construir URL
}

// manual
{} // vazio
```

---

### Fluxo de Usuário Atualizado

1. Usuário clica em "Nova Sequência" na aba Sequências
2. Modal pede nome e tipo de gatilho
3. Ao criar, SequenceBuilder abre com o TriggerConfigCard no topo
4. Usuário configura o gatilho e adiciona nodes de ação
5. Ao salvar, trigger_type e trigger_config são salvos junto com os nodes

---

### Migração de Dados

A tabela `group_messages` será mantida inicialmente para compatibilidade com sequências agendadas existentes. O `process-scheduled-messages` Edge Function já busca pelo `sequence_id`, então continuará funcionando. Em uma fase futura, os dados podem ser migrados completamente.

---

### Arquivos Novos

| Arquivo | Descrição |
|---------|-----------|
| `src/components/group-campaigns/sequences/TriggerConfigCard.tsx` | Componente de configuração do gatilho |
| `src/components/group-campaigns/sequences/triggers/ScheduleTriggerConfig.tsx` | Configuração específica para agendamento |
| `src/components/group-campaigns/sequences/triggers/KeywordTriggerConfig.tsx` | Configuração específica para palavra-chave |

---

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/group-campaigns/GroupCampaignDetails.tsx` | Remover aba Mensagens |
| `src/components/group-campaigns/sequences/SequenceBuilder.tsx` | Adicionar TriggerConfigCard no header |
| `src/components/group-campaigns/sequences/SequenceList.tsx` | Melhorar preview do trigger |
| `src/hooks/useSequences.ts` | Tipagem para triggerConfig |
| `src/components/group-campaigns/index.ts` | Remover export MessagesTab |

---

### Arquivos a Deletar

| Arquivo | Motivo |
|---------|--------|
| `src/components/group-campaigns/tabs/MessagesTab.tsx` | Funcionalidade movida para Sequências |

---

### Resultado Esperado

- Interface simplificada com uma única aba de automação
- Gatilhos configurados diretamente na sequência (sem duplicação)
- Lógica de agendamento, palavra-chave, etc. centralizada
- Melhor UX com fluxo visual claro (trigger → ações)

