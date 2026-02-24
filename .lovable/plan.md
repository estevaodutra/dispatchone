

# Plan: Operador auto-disponivel ao logar + toggle no popup

## Problema

Atualmente o operador ve o popup "Disponivel / Aguardando..." mas nao tem controle para se colocar online ou offline. O status so muda pelo painel admin (OperatorsPanel). Alem disso, ao fazer login, o operador permanece "offline" ate que um admin o coloque disponivel.

## Solucao

Duas alteracoes no hook `useOperatorCall` e no componente `CallPopup`:

### 1. Auto-disponibilizar ao carregar (useOperatorCall.ts)

Apos buscar o operador no `fetchOperator`, se o status for `offline` e `is_active = true`, atualizar automaticamente para `available`:

```text
fetchOperator() {
  // ... busca operador
  if (data.status === 'offline' && data.is_active) {
    await supabase.from('call_operators')
      .update({ status: 'available' })
      .eq('id', data.id);
    data.status = 'available';  // refletir localmente
  }
}
```

### 2. Toggle de disponibilidade no CallPopup

Adicionar um switch no popup minimizado (estado `idle`) para que o operador possa se colocar offline/online manualmente:

```text
Popup minimizado:
  [Switch Online/Offline] ● Disponivel  Aguardando...
  
Popup minimizado (offline):
  [Switch Online/Offline] ○ Offline
```

No `useOperatorCall`, expor uma funcao `toggleAvailability` que altera o status entre `available` e `offline`.

### 3. Nao renderizar popup se offline

Quando o operador estiver offline (apos desligar o toggle), o popup mostra estado "Offline" em vez de "Disponivel / Aguardando".

### Arquivos alterados

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useOperatorCall.ts` | Auto-set available ao carregar; expor `toggleAvailability` |
| `src/components/operator/CallPopup.tsx` | Adicionar switch online/offline no popup minimizado |

### Seguranca

A policy RLS ja permite que o operador atualize seu proprio registro (`user_id = auth.uid()`), entao nenhuma alteracao de banco e necessaria.

