

# Fix: Botao "Ativar Notificacoes" nao funciona

## Problema

O `Notification.requestPermission()` e bloqueado pelo navegador quando executado dentro de um iframe (como o preview do Lovable). A chamada retorna silenciosamente `"denied"` sem exibir o prompt de permissao ao usuario.

Alem disso, se o usuario ja negou a permissao anteriormente, o botao continua visivel mas nao faz nada.

## Solucao

1. Detectar quando a permissao e negada (seja por iframe ou pelo usuario) e mostrar feedback visual
2. Adicionar fallback com som via Web Audio API (que funciona em qualquer contexto, sem precisar de permissao)
3. Separar "notificacoes do navegador" de "alertas sonoros" -- o som deve funcionar independentemente

## Alteracoes

### Arquivo: `src/pages/CallPanel.tsx`

**1. Estado do botao de notificacoes:**
- Adicionar estado `soundEnabled` separado de `notificationsEnabled`
- O som (Web Audio API) funciona sempre apos interacao do usuario -- usar o clique no botao como ativacao
- Notificacoes do navegador sao um bonus que pode ou nao funcionar

**2. Logica do botao:**
```text
Ao clicar "Ativar Notificacoes":
  1. Marcar soundEnabled = true (som via Web Audio ja vai funcionar)
  2. Tentar Notification.requestPermission()
  3. Se "granted" -> mostrar "Notificacoes e som ativos"
  4. Se "denied" ou erro -> mostrar toast "Notificacoes bloqueadas, mas alertas sonoros estao ativos"
  5. Trocar botao para estado ativo (verde) indicando que pelo menos o som esta ativo
```

**3. Atualizar logica de alerta (useEffect de 60s):**
- Tocar som se `soundEnabled` (nao depende de Notification API)
- Enviar Notification apenas se `notificationsEnabled`

**4. Botao visual atualizado:**
- Antes de ativar: botao "Ativar Alertas" com icone Bell
- Apos ativar: Badge verde "Alertas ativos" (com ou sem notificacoes do navegador)
- Se notificacoes do navegador estiverem bloqueadas: tooltip ou texto menor explicando

## Detalhes Tecnicos

Mudancas no componente `CallPanel`:

- Novo estado: `const [soundEnabled, setSoundEnabled] = useState(false)`
- Refatorar `requestNotifications` para:
  - Sempre ativar `soundEnabled = true` 
  - Tentar `Notification.requestPermission()` com try/catch
  - Mostrar toast de feedback adequado
- Condicao do alerta: `if (soundEnabled && ...)` para som, `if (notificationsEnabled && ...)` para browser notification
- Condicao do botao: mostrar quando `!soundEnabled` (em vez de checar `Notification.permission`)

