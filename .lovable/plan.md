
Objetivo: corrigir o fluxo de conexão para que, quando o webhook retornar imagem em base64, a UI renderize a imagem (QR) em vez de exibir a string no campo de código.

1) Diagnóstico confirmado no código atual
- Hoje o fluxo decide a etapa por `response.code` vs `response.qrcode_image/value/qrCode/qrCodeUrl`.
- Em alguns retornos, o valor de `code` vem como `data:image/...;base64,...` (ou base64 cru), então a tela de “código” mostra texto gigante em vez de imagem.

2) Ajuste de normalização no `src/pages/Instances.tsx`
- Criar helpers locais para:
  - detectar se um valor é imagem (`data:image/...`, URL de imagem, ou base64 cru válido);
  - limpar base64 (remover prefixo já existente e espaços);
  - montar `src` final de imagem (`data:image/png;base64,...` quando necessário).
- Na `triggerConnectionWebhook`, após normalizar array/objeto:
  - extrair candidatos de QR de todos os campos possíveis (`qrcode_image`, `value`, `qrCode`, `qrCodeUrl`, `connection.code`, `code`);
  - se `code` for imagem, mover para campo de QR e não tratar como código de pareamento;
  - manter `code` apenas quando for realmente código alfanumérico de pareamento.

3) Ajuste de roteamento de etapas (QR x Código)
- Nos handlers de conexão (`qr` e `phone`), decidir etapa com prioridade:
  1. se existe imagem QR válida => `setConnectionStep("qr")`
  2. senão, se existe código de pareamento válido => `setConnectionStep("code")`
  3. senão fallback + toast de retorno inesperado.
- Aplicar a mesma regra ao “Gerar Novo QR” / “Gerar Novo Código”.

4) Ajuste de renderização
- Na etapa QR, usar sempre `src` já normalizado (garantindo prefixo data URI quando vier base64 cru).
- Na etapa Código, renderizar apenas texto curto de pareamento; nunca exibir blob base64.
- Esconder ação “copiar código” quando não houver código válido.

5) Validação rápida após implementação
- Cenário A: webhook retorna `connection.code` alfanumérico -> tela “código” correta.
- Cenário B: webhook retorna base64 em `qrcode_image/value/qrCode/qrCodeUrl` -> QR renderizado.
- Cenário C: webhook retorna base64 dentro de `code` -> UI redireciona para QR e renderiza imagem.
- Cenário D: webhook retorna base64 cru (sem `data:image`) -> renderiza normalmente com prefixo adicionado.

Detalhes técnicos (resumo)
- Arquivo alvo: `src/pages/Instances.tsx`.
- Sem migração de banco.
- Sem mudanças em hooks globais; correção fica encapsulada no fluxo de conexão da página de instâncias.
