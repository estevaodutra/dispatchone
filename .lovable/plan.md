

# Exibir "Auto" para chamadas agendadas

## Problema

Chamadas com status "Agendada" mostram o nome do operador (ex: "Mauro") mesmo quando a atribuicao real so acontece no momento da discagem. O correto e exibir "Auto" para todas as chamadas agendadas.

## Solucao

Alterar a exibicao do operador no `src/pages/CallPanel.tsx` para que, quando o status for `scheduled`, sempre mostre "Auto" independentemente de haver um `operatorName` no registro.

## Detalhe tecnico

### Arquivo: `src/pages/CallPanel.tsx` (linhas 772-786)

Mudar a condicao de exibicao do operador de:

```
entry.operatorName ? (mostrar nome) : (mostrar Auto)
```

Para:

```
entry.operatorName && entry.callStatus !== "scheduled" ? (mostrar nome) : (mostrar Auto)
```

Isso garante que chamadas agendadas sempre exibam "Auto", enquanto chamadas em andamento ou finalizadas continuam mostrando o operador atribuido.

