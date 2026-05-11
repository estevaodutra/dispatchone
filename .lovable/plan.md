## Objetivo

Permitir criar múltiplas sequências com o mesmo gatilho (não apenas webhook). A indicação "(em uso)" continua aparecendo apenas como **aviso visual** de gatilho duplicado, mas **não bloqueia** mais a seleção nem a criação.

## Alterações

**Arquivo:** `src/components/sequences/UnifiedSequenceList.tsx`

1. **Remover bloqueio na criação** (`handleCreate`, linhas 54-62):
   - Eliminar a checagem `if (form.triggerType !== "webhook" && usedTriggerTypes.has(form.triggerType))` e o `toast.error`.
   - Manter o cálculo de `usedTriggerTypes` (usado só para o badge "(em uso)").

2. **Select (linhas ~207-213):**
   - Remover `disabled={isUsed}` do `SelectItem`.
   - Manter o badge `(em uso)` ao lado do label como aviso informativo.

3. **Radio (linhas ~224-232):**
   - Remover `opacity-50 pointer-events-none` do wrapper.
   - Remover `disabled={isUsed}` do `RadioGroupItem`.
   - Manter o badge `(em uso)`.

4. **(Opcional, melhoria UX):** trocar o texto do badge para algo mais claro como `(já existe)` — manterei `(em uso)` para minimizar mudança, salvo se preferir outro rótulo.

## Observações

- O backend já suporta múltiplas sequências por gatilho (regra atual era só uma trava de UI). Nenhuma mudança em hooks, edge functions ou banco é necessária.
- Vale também atualizar a memória `Trigger Policies` para refletir que múltiplas sequências por gatilho passam a ser permitidas em todos os tipos.
