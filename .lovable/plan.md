

# Adicionar acao padrao "Reagendar" no dialogo de Registrar Acao

## Problema

Quando o operador abre o dialogo "Registrar Acao" para uma ligacao, ele so ve as acoes configuradas na campanha. Falta uma opcao rapida de "Reagendar" para quando a pessoa atende mas nao pode falar naquele momento.

## Solucao

Adicionar um botao fixo de "Reagendar" dentro da aba "Acao" do ActionDialog, antes das acoes configuradas da campanha. Ao clicar, fecha o dialogo de acao e abre o dialogo de reagendamento ja existente.

## Alteracoes

**Arquivo:** `src/pages/CallPanel.tsx`

### 1. ActionDialog - nova prop `onReschedule`

Adicionar uma prop `onReschedule` ao componente ActionDialog que recebe a entry e aciona o fluxo de reagendamento existente.

### 2. Botao fixo na aba "Acao"

Dentro da TabsContent de "action", antes da lista de acoes da campanha, renderizar um botao estilizado com icone `CalendarClock` e cor azul/amber:

```text
+------------------------------------------------------+
|  (icone calendario)  Reagendar                       |
|  A pessoa nao pode falar agora                       |
+------------------------------------------------------+
|  (circulo verde)  Lancamento                         |
|  Inicia sequencia automatica                         |
+------------------------------------------------------+
```

### 3. Chamada no componente pai

No CallPanel principal, passar `onReschedule` para o ActionDialog que:
1. Fecha o dialogo de acao (`setActionEntry(null)`)
2. Abre o dialogo de reagendamento (`setRescheduleEntry(entry)`) com valores pre-preenchidos

## Detalhe tecnico

- Modificar a interface do ActionDialog adicionando `onReschedule: (entry: CallPanelEntry) => void`
- No botao de Reagendar, chamar `onReschedule(entry)` ao clicar
- No CallPanel (linha ~374), passar a prop:
  ```
  onReschedule={(e) => {
    setActionEntry(null);
    setRescheduleEntry(e);
    // pre-preencher data/hora +30min
  }}
  ```
- O botao "Reagendar" fica separado visualmente das acoes da campanha com um divisor (Separator)

## Arquivo modificado

- `src/pages/CallPanel.tsx`

