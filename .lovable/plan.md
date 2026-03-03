

## Diagnóstico

O operador **Mauro Dutra** aparece como "Disponível" na interface, mas **nunca recebe chamadas**. O banco mostra:

- Mauro: `status = 'available'`, **mas** `current_call_id = f8e8be82` (uma chamada "dialing" de 1h atrás)
- A RPC `reserve_operator_for_call` exige `current_call_id IS NULL` para selecionar o operador → Mauro é sempre ignorado

### Causa raiz

Existem **múltiplos caminhos** no código que alteram o status do operador para `'available'` sem limpar o `current_call_id`:

1. **`resolve_cooldowns` (RPC)** — transiciona de cooldown → available, mas **não limpa** `current_call_id`
2. **`CooldownOverlay.handleSkip`** — faz `.update({ status: 'available' })` sem `current_call_id: null`
3. **`OperatorsPanel.handleToggle`** (linha 241-248) — quando toggle on durante cooldown, seta `status: 'available'` sem limpar `current_call_id`

Qualquer um desses caminhos deixa o operador num estado "fantasma": parece disponível mas está bloqueado.

## Correção (3 partes)

### 1. RPC `resolve_cooldowns` — limpar current_call_id

Adicionar `current_call_id = NULL, current_campaign_id = NULL` no UPDATE, garantindo que a transição cooldown → available sempre limpe o estado da chamada.

### 2. RPC `heal_stuck_operators` — novo caso para status != on_call com current_call_id

Adicionar um segundo CTE que capture operadores onde `status != 'on_call' AND current_call_id IS NOT NULL` e limpe o current_call_id. Isso é a rede de segurança para qualquer path que esqueça de limpar.

### 3. Frontend — CooldownOverlay.handleSkip e OperatorsPanel.handleToggle

- **`CooldownOverlay.handleSkip`**: Adicionar `current_call_id: null, current_campaign_id: null` ao update
- **`OperatorsPanel.handleToggle`** (linha 242-246): Adicionar `current_call_id: null, current_campaign_id: null` ao update de cooldown → available

### Dados atuais (fix imediato)

O `heal_stuck_operators` corrigido vai automaticamente limpar o Mauro na próxima execução do tick (que roda a cada 10s).

