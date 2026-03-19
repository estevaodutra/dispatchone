

## Plano: Notificação pop-up quando todas as instâncias estiverem desconectadas/vencidas

### Objetivo
Exibir um banner/pop-up persistente no topo do layout quando **todas** as instâncias do usuário estiverem desconectadas ou com pagamento vencido (EXPIRED), com botão para ir à página de instâncias.

### Mudanças

**Novo componente:** `src/components/layout/InstanceStatusBanner.tsx`

1. Usar `useInstances()` para obter a lista de instâncias
2. Verificar se `instances.length > 0` e **todas** têm `status !== "connected"` ou `paymentStatus === "EXPIRED"`
3. Se sim, renderizar um banner fixo (usando AlertBanner ou componente customizado) com:
   - Ícone de alerta
   - Texto: "Nenhuma instância conectada. Conecte uma instância para enviar mensagens."
   - Botão "Conectar Instância" que navega para `/instances`
   - Botão de dismiss (salva no sessionStorage para não reaparecer na sessão)
4. Não exibir enquanto `isLoading` ou se não há instâncias cadastradas

**Arquivo:** `src/components/layout/AppLayout.tsx`

5. Importar e renderizar `<InstanceStatusBanner />` acima do `<main>`, dentro do layout protegido

### Detalhes Técnicos

```text
┌──────────────────────────────────────┐
│  AppHeader                           │
├──────────────────────────────────────┤
│  ⚠ Nenhuma instância conectada...   │  ← Banner (condicional)
│  [Conectar Instância]  [✕]          │
├──────────────────────────────────────┤
│  main content                        │
└──────────────────────────────────────┘
```

- Lógica: `const allDown = instances.length > 0 && instances.every(i => i.status !== "connected")`
- Dismiss via `sessionStorage.setItem("instance-banner-dismissed", "true")`
- Usa `useNavigate()` para redirecionar ao clicar

