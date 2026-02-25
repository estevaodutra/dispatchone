

## Diagnóstico

O botão de abrir o `CallActionDialog` (ícone ExternalLink no card do lead) não funciona durante o cooldown porque o dialog só é renderizado quando `isActive` é `true`:

```jsx
{isActive && currentCall?.campaignId && currentCall.leadId && (
  <CallActionDialog ... />
)}
```

`isActive` = `["dialing", "ringing", "on_call"].includes(callStatus)`. Durante o cooldown, `callStatus` é `"ended"`, então `isActive` é `false` e o componente `CallActionDialog` nunca monta — clicar no botão seta `showCallDialog = true` mas não há nada para exibir.

## Solução

Alterar a condição de renderização do `CallActionDialog` para incluir qualquer estado onde `currentCall` ainda exista (incluindo cooldown/"ended"):

**Arquivo:** `src/components/operator/CallPopup.tsx` (linha 257)

Trocar:
```jsx
{isActive && currentCall?.campaignId && currentCall.leadId && (
```

Por:
```jsx
{currentCall?.campaignId && currentCall.leadId && (
```

Isso permite abrir o dialog durante cooldown, dialing, ringing, on_call — qualquer momento em que há dados de chamada disponíveis.

| Arquivo | Alteração |
|---------|-----------|
| `src/components/operator/CallPopup.tsx` | Remover condição `isActive` do render do `CallActionDialog` |

