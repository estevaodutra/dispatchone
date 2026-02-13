

# Adicionar Suporte a Variaveis Dinamicas no Dispatch

## Problema

A edge function `execute-dispatch-sequence` envia mensagens ao webhook sem substituir variaveis dinamicas como `{nome}`, `{telefone}`, `{campanha}` etc. O conteudo da mensagem chega ao webhook exatamente como foi salvo no editor, com os placeholders sem substituicao.

## Solucao

Adicionar uma funcao `replaceVariables` na edge function `execute-dispatch-sequence` que substitui placeholders nos campos de texto antes de enviar ao webhook. Seguira o mesmo padrao ja usado no `execute-message` (campanhas de grupo).

### Variaveis suportadas

| Variavel | Valor |
|---|---|
| `{{nome}}` / `{{name}}` | Nome do contato |
| `{{telefone}}` / `{{phone}}` | Telefone do contato |
| `{{campanha}}` / `{{campaign}}` | Nome da campanha |
| Campos customizados (`{{qualquer_campo}}`) | Valor do `customFields` passado na requisicao |

### Arquivo modificado

**`supabase/functions/execute-dispatch-sequence/index.ts`**

1. Adicionar funcao `replaceVariables` apos os helpers existentes (antes do main handler), que recebe o texto e os dados do contato/campanha e substitui todos os placeholders
2. Aplicar `replaceVariables` nos campos de texto do `config` gerado por `buildStepConfig` -- campos: `text`, `caption`, `url`, `filename`
3. Tambem aplicar nos labels de botoes, caso existam

### Detalhes tecnicos

```text
Fluxo atual:
  buildStepConfig(step) --> config --> payload --> webhook

Fluxo novo:
  buildStepConfig(step) --> config --> replaceVariables(config) --> payload --> webhook
```

A funcao `replaceVariables` sera aplicada no bloco de MESSAGE steps (linha ~265-340), logo apos o `buildStepConfig` e antes de montar o payload. Os campos processados serao:

- `config.text` (mensagens de texto)
- `config.caption` (legendas de midia)
- `config.url` (URLs dinamicas)
- `config.filename` (nomes de arquivo dinamicos)
- Labels de botoes dentro de `config.buttons`

Os dados de substituicao virao dos parametros ja recebidos pela funcao: `contactName`, `contactPhone`, `customFields`, e `typedCampaign.name`.

