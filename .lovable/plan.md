
# Correção: Substituição de Variáveis em Campos de URL e Filename

## Problema Identificado

O payload enviado contém:
```json
{
  "document": "https://...storage.../documento.pdf",
  "fileName": "ORD-1769828426038_865529AC"
}
```

Com os mapeamentos:
- `document` → `{{document}}`
- `fileName` → `{{fileName}}`

E no nó "Documento" configurado com:
- URL: `{{document}}`
- Nome do Arquivo: `{{fileName}}`

**Porém**, a função `replaceVariables` no `execute-message` só substitui variáveis nos seguintes campos:

```typescript
const textFields = ["text", "content", "message", "caption", "title", "description", "footer", "question"];
```

Os campos `url` e `filename` **não estão incluídos** na lista de substituição!

---

## Solução

Adicionar `url` e `filename` à lista de campos onde variáveis são substituídas.

### Mudança Necessária

**Arquivo:** `supabase/functions/execute-message/index.ts`

**Linha ~648** - Adicionar `url` e `filename` ao array `textFields`:

```typescript
// ANTES:
const textFields = ["text", "content", "message", "caption", "title", "description", "footer", "question"];

// DEPOIS:
const textFields = ["text", "content", "message", "caption", "title", "description", "footer", "question", "url", "filename"];
```

---

## Por que isso resolve

1. O webhook envia `{ "document": "https://...", "fileName": "..." }`
2. O `trigger-sequence` extrai via `applyFieldMappings` e passa para `execute-message` como:
   ```javascript
   customFields: { document: "https://...", fileName: "..." }
   ```
3. O `execute-message` processa cada nó, e ao encontrar um nó de documento com:
   - `config.url = "{{document}}"`
   - `config.filename = "{{fileName}}"`
4. Com a correção, `replaceVariables` será chamado para esses campos e substituirá as variáveis

---

## Impacto

Esta mudança permite usar variáveis dinâmicas em:
- **URLs de mídia** (documentos, imagens, vídeos, áudios, stickers)
- **Nomes de arquivos** para documentos

Isso é especialmente útil para:
- Integração com sistemas externos que geram arquivos dinâmicos
- Envio de comprovantes, boletos, contratos personalizados
- Automações onde a URL do arquivo vem de outro sistema

---

## Resumo Técnico

| Item | Arquivo | Alteração |
|------|---------|-----------|
| 1 | `supabase/functions/execute-message/index.ts` | Adicionar `"url", "filename"` ao array `textFields` na linha ~648 |

---

## Validação Pós-Implementação

1. Enviar POST para `/trigger-sequence/{id}` com payload contendo `document` e `fileName`
2. Verificar nos logs que o campo `url` no payload enviado ao webhook de mensagens contém a URL real (não `{{document}}`)
3. Confirmar que o documento é enviado corretamente com o nome de arquivo correto
