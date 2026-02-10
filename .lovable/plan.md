

# Timer em formato HH:mm:ss no Painel do Operador

## Resumo

Alterar o timer do header do OperatorScriptView para exibir no formato `HH:mm:ss` em vez de apenas segundos, e adicionar um `setInterval` para que o timer atualize em tempo real a cada segundo.

## Alteracao

**Arquivo:** `src/components/call-campaigns/operator/OperatorScriptView.tsx`

1. Adicionar um estado `elapsed` (number) que armazena os segundos decorridos
2. Adicionar um `useEffect` com `setInterval` de 1 segundo que incrementa `elapsed`
3. Criar funcao `formatElapsed(seconds)` que converte para `HH:mm:ss`
4. Substituir o calculo inline no Badge pelo valor formatado

### Funcao de formatacao

```text
function formatElapsed(totalSeconds: number): string {
  hours   = floor(totalSeconds / 3600)
  minutes = floor((totalSeconds % 3600) / 60)
  seconds = totalSeconds % 60
  return "HH:mm:ss" com zero-padding
}
```

### Resultado visual

Antes: `916:53` (minutos:segundos sem clareza)
Depois: `00:15:16` (horas:minutos:segundos)

## Detalhes tecnicos

- Remover o calculo inline `Math.floor((new Date().getTime() - startTime.getTime()) / 1000)` do JSX
- Adicionar `const [elapsed, setElapsed] = useState(0)` 
- Adicionar `useEffect` com `setInterval(() => setElapsed(...), 1000)` e cleanup no return
- O intervalo sera limpo automaticamente ao desmontar o componente

