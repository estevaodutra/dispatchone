

# Contador Visual de Cooldown no Card do Operador

## O que sera feito

Adicionar um contador regressivo em tempo real no card de cada operador que estiver em status `cooldown`, mostrando os segundos restantes ate ficar disponivel novamente, com uma barra de progresso visual.

## Implementacao

### Arquivo: `src/components/call-panel/OperatorsPanel.tsx`

1. **Novo componente `CooldownTimer`**:
   - Recebe `lastCallEndedAt` (timestamp) e `intervalSeconds` (duracao total do cooldown, padrao 30s)
   - Usa `useState` + `useEffect` com `setInterval` de 1s para atualizar o tempo restante
   - Calcula: `remaining = intervalSeconds - elapsed`
   - Calcula: `progress = elapsed / intervalSeconds` (0 a 1)
   - Exibe: icone de relogio + texto "Xs restantes" + barra de progresso (usando componente `Progress` do shadcn)
   - Quando `remaining <= 0`, exibe "Liberando..."

2. **Integracao no `OperatorCard`**:
   - Substituir a linha estatica "Ultima ligacao: X min atras" (linha 263-265) pelo componente `CooldownTimer` quando o operador esta em cooldown
   - O intervalo total vem de `operator.personalIntervalSeconds ?? 30` (mesma logica da RPC `resolve_cooldowns`)

### Visual

```text
[Cooldown badge]  Intervalo: 30s (padrao)
[====------] 12s restantes
```

A barra usa o componente `Progress` existente com cor amber para manter consistencia com o tema de cooldown.

### Detalhes tecnicos

- O timer usa `useEffect` com cleanup do `setInterval` para evitar memory leaks
- O `key` do componente inclui `lastCallEndedAt` para resetar automaticamente quando um novo cooldown inicia
- Nenhuma chamada ao banco -- tudo calculado localmente a partir dos dados ja disponiveis no operador
