
# Adicionar status padrao "Atendeu / Nao Atendeu" no no de Inicio

## Problema

No Passo 1 (no de "Inicio"), o operador ve apenas o botao "Proximo" sem nenhuma indicacao de status da ligacao. O usuario quer que o operador registre imediatamente se o contato atendeu ou nao antes de prosseguir.

## Solucao

Substituir o botao "Proximo" no no de tipo `start` por dois botoes de status: **Atendeu** (verde) e **Nao Atendeu** (vermelho). 

- "Atendeu" avanca para o proximo no do roteiro (comportamento atual do "Proximo").
- "Nao Atendeu" pula direto para o no de fim e aciona o callback `onReachEnd`, levando o operador para a aba de acoes.

## Alteracoes

### `src/components/call-campaigns/operator/InlineScriptRunner.tsx`

- Importar icones `Phone` e `PhoneOff` do lucide-react.
- No bloco que renderiza o botao "Proximo" (linhas 151-156), adicionar condicao especifica para `currentNode.type === "start"`:
  - Renderizar dois botoes lado a lado em vez do "Proximo":
    - **Atendeu**: icone `Phone`, fundo verde, chama `handleNext()` (avanca normalmente).
    - **Nao Atendeu**: icone `PhoneOff`, variante destructive/outline vermelha, navega direto para o no `end` e dispara `onReachEnd`.
- Para os demais tipos (`speech`, `note`), manter o botao "Proximo" como esta.

### Detalhes tecnicos

```text
-- No de Inicio (atual) --
[Proximo]

-- No de Inicio (novo) --
[Atendeu]  [Nao Atendeu]
```

- Para "Nao Atendeu", localizar o no de tipo `end` no array de nos e navegar diretamente para ele.
- Se nao existir no `end`, chamar `onReachEnd` diretamente.
