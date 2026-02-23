
# Navegar para aba "Fila" do Painel ao iniciar execucao em fila

## Objetivo

Quando o usuario clicar em "Iniciar" (QueueControlPanel) ou "Discar todos pendente" (LeadsTab) dentro de uma campanha de ligacao, o sistema deve redirecionar automaticamente para o Painel de Ligacoes (`/painel-ligacoes`) com a aba "Fila" ja selecionada.

## Abordagem

Usar `useNavigate` do React Router com um query parameter (ex: `?tab=queue`) para comunicar ao Painel de Ligacoes qual aba deve estar ativa ao carregar.

## Alteracoes

### 1. `src/pages/CallPanel.tsx`

- Importar `useSearchParams` do `react-router-dom`
- No `useState` do `statusFilter`, verificar se existe um parametro `tab=queue` na URL
- Se existir, inicializar `statusFilter` como `"queue"` em vez de `"all"`
- Limpar o parametro da URL apos consumir (para nao persistir em navegacoes futuras)

### 2. `src/components/call-campaigns/QueueControlPanel.tsx`

- Importar `useNavigate` do `react-router-dom`
- No callback do botao "Iniciar", apos chamar `startQueue()`, navegar para `/painel-ligacoes?tab=queue`

### 3. `src/components/call-campaigns/tabs/LeadsTab.tsx`

- Importar `useNavigate` do `react-router-dom`
- No callback de confirmacao do bulk enqueue (apos `bulkEnqueueByStatus`), navegar para `/painel-ligacoes?tab=queue`

## Detalhes Tecnicos

**CallPanel.tsx** - Leitura do parametro:
```text
const [searchParams, setSearchParams] = useSearchParams();
const initialTab = searchParams.get("tab") === "queue" ? "queue" : "all";
const [statusFilter, setStatusFilter] = useState(initialTab);

useEffect(() => {
  if (searchParams.get("tab")) {
    searchParams.delete("tab");
    setSearchParams(searchParams, { replace: true });
  }
}, []);
```

**QueueControlPanel.tsx** - Navegacao apos iniciar:
```text
const navigate = useNavigate();

// No onClick do botao Iniciar:
onClick={async () => {
  await startQueue();
  navigate("/painel-ligacoes?tab=queue");
}}
```

**LeadsTab.tsx** - Navegacao apos enfileirar:
```text
const navigate = useNavigate();

// No AlertDialogAction do bulk enqueue:
onClick={async () => {
  await bulkEnqueueByStatus({ status: bulkDialStatus });
  setShowBulkConfirm(false);
  navigate("/painel-ligacoes?tab=queue");
}}
```

## Resultado

Ao iniciar a execucao ou enfileirar leads em massa, o usuario sera automaticamente levado ao Painel de Ligacoes com a aba "Fila" visivel, onde pode acompanhar o progresso em tempo real.
