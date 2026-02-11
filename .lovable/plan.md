

# Reorganizar Lista de Ligacoes: Cards para Tabela Compacta

## Resumo

Substituir o layout de cards espacados por uma tabela compacta e funcional no Painel de Ligacoes, com colunas especificas, ordenacao por prioridade, timers dinamicos e botoes de acao contextuais.

## Mudancas

### 1. Refatorar `src/pages/CallPanel.tsx`

**Remover** o componente `CallCard` e substituir por um componente `CallTable` que renderiza os dados em formato de tabela usando os componentes `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` ja existentes em `src/components/ui/table.tsx`.

**Colunas da tabela:**

| Coluna | Conteudo | Responsividade |
|--------|----------|----------------|
| Entrada | Hora `createdAt` formatada HH:mm | Sempre visivel |
| Status | Badge colorido conforme status | Sempre visivel |
| Lead | Nome do lead | Sempre visivel |
| Telefone | Numero formatado sem +55 | Oculto em mobile |
| Campanha | Nome truncado | Oculto em tablet/mobile |
| Operador | Nome ou "Auto" com icone de robo | Oculto em mobile |
| Timer | Countdown/duracao monoespaçado | Oculto em mobile |
| Acoes | Botoes contextuais | Sempre visivel |

### 2. Ordenacao por Prioridade

Implementar funcao `sortByPriority(entries)` que ordena:

1. **Em ligacao** (`in_progress`) -- mais recente primeiro (por `startedAt`)
2. **AGORA!** (`scheduled`/`ready` com timer <= 0) -- mais antigo primeiro (por `createdAt`)
3. **Agendada** (`scheduled` com timer > 0) -- menor timer primeiro (por `scheduledFor`)
4. **Finalizadas** (`completed`, `cancelled`, `failed`, `no_answer`, `busy`) -- mais recente primeiro (por `endedAt` ou `createdAt`)

### 3. Timers Dinamicos

- **Em ligacao**: contador crescente desde `startedAt` (formato mm:ss ou HH:mm:ss)
- **Agendada**: countdown decrescente ate `scheduledFor`
- **AGORA! / Concluida / Cancelada / Falha**: exibir traco "—"

O tick de 1 segundo ja existe no componente.

### 4. Status Badges

| Status DB | Badge | Cor |
|-----------|-------|-----|
| ready (timer<=0) | AGORA! | Vermelho, fundo vermelho/10% |
| scheduled | Agendada | Amarelo |
| dialing/ringing | Discando | Verde |
| answered/in_progress | Em ligacao | Verde |
| completed | Concluida | Verde claro |
| no_answer | N/Atendeu | Cinza |
| busy | Ocupado | Laranja |
| failed | Falha | Laranja |
| cancelled | Cancelada | Cinza |

### 5. Coluna Operador

- Com operador atribuido: nome do operador
- Sem operador: icone de robo + "Auto" com tooltip "Operador sera atribuido automaticamente"

### 6. Coluna Acoes (botoes contextuais)

| Status | Botao principal | Botao secundario |
|--------|----------------|------------------|
| AGORA! / Agendada | Ligar (verde, icone telefone) | Menu (engrenagem) |
| Em ligacao | Acao (azul, icone alvo) | Menu (engrenagem) |
| Concluida | Ver (cinza, icone olho) | Menu (engrenagem) |
| Cancelada / Falha | Ver (cinza, icone olho) | Menu (engrenagem) |
| N/Atendeu | Religar (amarelo, icone refresh) | Menu (engrenagem) |

### 7. Dropdown Menu (botao engrenagem)

Usar `DropdownMenu` do shadcn para o botao "Mais":
- Ver detalhes
- Reagendar
- +10 min / +30 min
- Separador
- Cancelar ligacao
- Trocar operador (apenas para agendadas)

### 8. Destaque Visual nas Linhas

- Linha AGORA!: `bg-red-500/5 border-l-3 border-l-red-500`
- Linha em ligacao: `bg-green-500/5 border-l-3 border-l-green-500`
- Linhas normais: sem destaque

### 9. Polling

Alterar `refetchInterval` no hook `useCallPanel` de 30000ms para 5000ms para atualizacao mais frequente.

### 10. Paginacao

Manter a paginacao existente abaixo da tabela, com 20 itens por pagina.

## Detalhes Tecnicos

- Reutilizar os componentes `Table*` de `src/components/ui/table.tsx`
- Importar `DropdownMenu` de `@/components/ui/dropdown-menu`
- Importar `Tooltip` de `@/components/ui/tooltip` para "Auto"
- Classes responsivas com `hidden md:table-cell` e `hidden lg:table-cell`
- Timer com `font-mono` para alinhamento
- Funcao `getElapsedTime(startedAt)` para ligacoes em andamento
- Manter todos os dialogs existentes (reschedule, cancel, action, edit operator) sem alteracao
- O componente `QueueCard` permanece como esta (aba Fila)
- O `CallCard` sera removido e substituido pelo `CallTable`

### Arquivos modificados

1. `src/pages/CallPanel.tsx` -- refatoracao principal (substituir CallCard por CallTable, adicionar sortByPriority, dropdown menu)
2. `src/hooks/useCallPanel.ts` -- alterar refetchInterval para 5000ms

