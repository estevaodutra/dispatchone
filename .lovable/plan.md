

# Corrigir formato do timer no Painel de Ligacoes (CallPanel)

## Resumo

O timer "Em 912:02" exibido nos cards de ligacao esta no formato `minutos:segundos`. Precisa ser alterado para `HH:mm:ss`.

## Alteracao

**Arquivo:** `src/pages/CallPanel.tsx`

Modificar a funcao `getTimeRemaining` (linhas 67-79) para formatar o tempo restante como `HH:mm:ss`:

- Calcular horas, minutos e segundos a partir de `totalSec`
- Retornar string no formato `HH:mm:ss` com zero-padding

### Antes

```text
912:02  (minutos:segundos)
```

### Depois

```text
15:12:02  (horas:minutos:segundos)
```

## Detalhe tecnico

A funcao `getTimeRemaining` sera alterada de:

```text
min = floor(totalSec / 60)
sec = totalSec % 60
text = "min:sec"
```

Para:

```text
h = floor(totalSec / 3600)
m = floor((totalSec % 3600) / 60)
s = totalSec % 60
text = "HH:mm:ss"
```

## Arquivo modificado

- `src/pages/CallPanel.tsx` (funcao `getTimeRemaining`, linhas 67-79)

