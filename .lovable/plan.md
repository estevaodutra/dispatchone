

## Corrigir: 2 botões "Parar" e sem "Retomar" no status "mixed"

### Problema
Quando `queueGlobalStatus === "mixed"` (algumas campanhas rodando, outras pausadas), o código renderiza:
- Bloco `running || mixed` (linha 860): **Pausar** + **Parar**
- Bloco `mixed` (linha 884): **outro Parar** duplicado

Resultado: 2 botões "Parar" e nenhum "Retomar".

### Solução

**Arquivo: `src/pages/CallPanel.tsx` (linhas 884-889)**

Substituir o bloco duplicado de "Parar" para `mixed` por um botão **"Retomar"** que chama `callQueue.resumeAll()`. Isso faz sentido porque "mixed" indica que existem campanhas pausadas que podem ser retomadas.

O bloco final ficará:
- `running || mixed`: Pausar + Parar
- `paused`: Retomar + Parar  
- `mixed` (adicional): Retomar (para retomar as pausadas)

