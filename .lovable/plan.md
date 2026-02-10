
# Reagendamento imediato em 2 horas para falhas antes das 20h

## Resumo

Atualmente, ligacoes que falham antes das 20h BRT nao sao reagendadas imediatamente -- ficam esperando o cron noturno. A alteracao faz com que **todas as falhas**, independente do horario, sejam reagendadas imediatamente:

- **Antes das 20h**: reagenda para **2 horas depois**, no mesmo dia (desde que o novo horario nao ultrapasse 19h; se ultrapassar, agenda para o proximo dia util entre 9h-19h)
- **Apos as 20h**: mantem a logica atual (proximo dia util, horario aleatorio 9h-19h)

O limite de 3 tentativas continua valendo em ambos os casos.

## Alteracao

**Arquivo:** `supabase/functions/call-status/index.ts`

Modificar o bloco de reagendamento imediato (linhas 519-610):

1. Remover a condicao `if (hourBRT >= 20)` que restringe o reagendamento apenas ao horario noturno
2. Manter a verificacao de status de falha e limite de 3 tentativas
3. Adicionar logica condicional para calcular o `scheduled_for`:
   - Se `hourBRT < 20`: agendar para **agora + 2 horas**
     - Se o horario resultante for >= 19h BRT: agendar para o proximo dia util (9h-19h aleatorio)
   - Se `hourBRT >= 20`: manter logica atual (proximo dia util, 9h-19h aleatorio)

## Logica de calculo do horario

```text
Falha recebida -> horario BRT atual?
  -> Antes das 20h:
     -> now + 2h < 19h? -> Agenda para now + 2h (mesmo dia)
     -> now + 2h >= 19h? -> Agenda para proximo dia util (9h-19h)
  -> Apos as 20h:
     -> Agenda para proximo dia util (9h-19h) [logica existente]
```

## Exemplo pratico

- Falha as 14:00 -> reagenda para 16:00 do mesmo dia
- Falha as 17:30 -> now + 2h = 19:30, ultrapassa 19h -> reagenda proximo dia util
- Falha as 21:00 -> reagenda proximo dia util (logica atual)

## Detalhes tecnicos

- O bloco `if (hourBRT >= 20)` sera substituido por um bloco que sempre executa (sem condicao de horario)
- Dentro dele, a diferenca sera apenas no calculo do `scheduledFor`
- Operador aleatorio e limite de 3 tentativas permanecem iguais
- O cron noturno (`reschedule-failed-calls`) continua como fallback para casos que nao passaram pelo `call-status`

## Arquivo modificado

- `supabase/functions/call-status/index.ts`
