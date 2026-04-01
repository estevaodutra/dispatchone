

## Plano: Popup com autosave, nome nos componentes, e ordenação por agendamento

### O que será feito

1. **Config panel vira Dialog (popup)** — Substituir o painel lateral (`Card w-80`) por um `Dialog` centralizado que abre ao clicar no nó no canvas
2. **Autosave** — Cada alteração no config do nó salva automaticamente (debounce de 800ms) sem necessidade de clicar "Salvar"
3. **Nome customizado por componente** — Campo "Nome" no topo do popup e exibido no canvas junto ao tipo
4. **Agendamento organiza a ordem** — Ao salvar/fechar, nós com schedule ativo são reordenados automaticamente pelo primeiro horário configurado (dias + hora mais cedo)

### Alterações

**1. `src/components/sequences/UnifiedNodeConfigPanel.tsx`**
- Envolver todo o conteúdo em `<Dialog>` ao invés de `<Card>`
- Adicionar campo `<Input>` para nome do nó no topo (`node.config.label`)
- O popup abre via prop `open` e fecha via `onClose`
- Largura máxima maior (~md) com scroll interno

**2. `src/components/sequences/UnifiedSequenceBuilder.tsx`**
- Substituir o painel lateral pelo Dialog (renderConfigPanel agora recebe `open` boolean)
- Implementar autosave com `useEffect` + `useRef` (debounce 800ms) que chama `onSave` automaticamente quando `localNodes` mudam
- Exibir `node.config.label` no canvas (fallback para `nodeInfo.label`)
- Adicionar função `autoSortBySchedule()`: ao fechar o popup, reordena nós que têm `schedule.enabled` pelo horário mais cedo, mantendo nós sem schedule na posição relativa original
- Remover o layout 3-panel para 2-panel (paleta + canvas), já que o config é popup

**3. `src/components/sequences/shared-types.ts`**
- Sem alteração — `label` fica dentro de `config: Record<string, unknown>`

### Lógica de auto-ordenação por agendamento
```text
Para cada nó com schedule.enabled:
  - Extrair menor dia (0-6) e menor horário
  - Gerar score: dia * 1440 + horaEmMinutos
Nós sem schedule ficam no final, na ordem original.
Reordenar localNodes por score crescente.
```

### Lógica de autosave
```text
useEffect com debounce:
  - A cada mudança em localNodes, resetar timer de 800ms
  - Ao expirar, chamar onSave(sequenceName, localNodes, localConnections)
  - Indicador visual sutil ("Salvo ✓" / "Salvando...")
```

### Fluxo do usuário
1. Clica no nó no canvas → popup abre centralizado
2. Digita nome, edita conteúdo, configura agendamento
3. Cada mudança salva automaticamente (feedback visual)
4. Ao fechar popup, nós são reordenados pelo agendamento
5. No canvas, cada nó mostra o nome customizado

