

# Melhorar seção de Cooldown no Configurar Operador

## Objetivo

A dialog "Configurar Operador" já possui a seção "Intervalo entre Ligações" que controla o cooldown, mas o rótulo não deixa claro que se trata do tempo de descanso (cooldown) entre chamadas. O objetivo é tornar essa seção mais descritiva e intuitiva.

## Alterações

### Arquivo: `src/components/call-panel/EditOperatorDialog.tsx`

1. **Renomear o label da seção** de "Intervalo entre Ligações" para "Cooldown (Intervalo entre Ligações)" com uma descrição explicativa abaixo.

2. **Adicionar indicador de cooldown ativo** -- se o operador estiver em status "cooldown", exibir o tempo restante calculado a partir de `lastCallEndedAt` e do intervalo configurado.

3. **Adicionar descrição contextual** explicando o que o cooldown faz: "Tempo de descanso obrigatório entre chamadas. O operador ficará indisponível durante este período após encerrar uma ligação."

## Layout atualizado da seção

```text
Cooldown (Intervalo entre Ligações)
Tempo de descanso entre chamadas. O operador fica
indisponível durante este período após cada ligação.

[Se em cooldown: Badge "Em cooldown - Xs restantes"]

○ Usar padrão das campanhas
○ Personalizado
   [Input: __ ] segundos
   [15s] [30s] [45s] [60s] [90s] [120s]
```

## Detalhes Técnicos

- Alterar o `Label` da seção de "Intervalo entre Ligações" para "Cooldown (Intervalo entre Ligações)"
- Adicionar `<p className="text-xs text-muted-foreground">` com a descrição explicativa
- Adicionar um badge condicional que aparece quando `operator.status === "cooldown"` e `operator.lastCallEndedAt` existe, calculando o tempo restante com base no intervalo configurado (personalizado ou padrão de 30s)
- Importar `Badge` de `@/components/ui/badge` e `Timer` icon de `lucide-react`
- Nenhuma alteração de banco de dados necessária -- o campo `personal_interval_seconds` já existe e é utilizado corretamente

