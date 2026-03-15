

## Corrigir QR Code não gerado na conexão

### Problema

Quando o usuário clica em "Conectar com QR Code", o webhook é chamado com `method: "qr"` e a resposta vem no formato:

```json
[{ "instance": {...}, "Client-Token": "...", "connection": { "code": "Y7F9JDYN" } }]
```

O código na **linha 780** faz `setConnectionStep("qr")` incondicionalmente, mas a resposta não contém nenhum campo de imagem QR (`qrcode_image`, `value`, `qrCode`, `qrCodeUrl`). Resultado: o dialog mostra o ícone estático de QR em vez de um QR real.

A resposta contém um **código de pareamento** (`connection.code`), que já foi corrigido para ser extraído, mas o fluxo não redireciona para a tela de código.

### Solução

No handler do botão QR (linha 777-783), após receber a resposta do webhook, verificar se há imagem QR ou código de pareamento e redirecionar para o step correto:

```typescript
// Linha 777-783 — handler do botão QR
onClick={async () => {
  try {
    const response = await triggerConnectionWebhook("qr");
    // Se a resposta contém QR image, mostra QR; senão se tem code, mostra code
    if (response?.qrcode_image || response?.value || response?.qrCode || response?.qrCodeUrl) {
      setConnectionStep("qr");
    } else if (response?.code) {
      setConnectionStep("code");
    } else {
      setConnectionStep("qr"); // fallback
    }
  } catch {
    // Error already handled
  }
}}
```

### Arquivo alterado
- `src/pages/Instances.tsx` — alterar handler do botão QR (~5 linhas)

