

## Plano: Corrigir status "Removido" indevido em membros de grupo

### Diagnóstico

O lead `5512983195531` no grupo "Maestria" tem o seguinte histórico no banco:

```
23:19:02 — join (status=active)
23:21:36 — leave (webhook recebido)
23:23:13 — sync marcou status=left, left_at=23:23:13
```

A UI exibe "Removido" porque o `status=left` é renderizado com o mesmo badge de `removed`. Se o lead voltou ao grupo depois das 23:23, há dois caminhos possíveis para a inconsistência:

1. **n8n não retornou o telefone na lista de membros** quando o sync foi disparado pelo webhook ou pelo botão "Listar Membros". Isso pode acontecer por cache, eventual consistency da Z-API, ou o membro entrou depois da última sync.
2. **Não houve webhook `group_join` posterior** após o retorno (entrou via convite que a instância não viu, ou o webhook foi perdido).

### Causa raiz

Em `sync-group-members/index.ts` o diff só considera membros com `status='active'` no DB (linha 75). Quando um membro volta, ele é detectado como "entered" e o upsert reativa para `status='active'` — isso funciona **se** o n8n retornar o telefone. Se não retornar, o membro fica preso em `left` para sempre, mesmo estando no grupo.

Não há um botão claro de "Re-sincronizar agora" na UI — o usuário precisa adivinhar que "Listar Membros" faz isso. Também não há ação manual para marcar um membro específico como `active` quando o usuário **sabe** que está no grupo.

### Correções propostas

#### 1. Botão "Forçar Re-sincronização" mais explícito (UI)

Em `MembersTab.tsx`, renomear/destacar a ação que dispara `sync-group-members`. Hoje existe o botão "Listar Membros" (`handleFetchMembers`) — vou trocar o label para "Sincronizar com WhatsApp" e adicionar tooltip explicando que ele puxa a lista atual e atualiza status (entradas + saídas).

#### 2. Reativar membro manualmente

Adicionar item no menu de ações (`...`) por linha:
- Se `status='active'` → "Marcar como removido" (já existe)
- Se `status='left'` ou `status='removed'` → **novo** "Marcar como ativo" → atualiza `status='active'`, `left_at=null` e insere registro `join` em `group_member_history` (com nota `manual`).

#### 3. Distinguir visualmente "Saiu" vs "Removido"

No `MembersTab` a coluna Status atualmente trata `left` e `removed` como o mesmo badge "Removido". Vou separar:
- `active` → badge verde "Ativo"
- `left` → badge cinza "Saiu" (saída detectada por sync ou webhook)
- `removed` → badge vermelho "Removido" (ação manual do admin)
- `muted` → badge amarelo "Silenciado"

Isso já ajuda o usuário a entender a diferença entre uma saída detectada pelo sync e uma remoção manual.

#### 4. Corrigir caso específico no banco (one-shot)

Para o lead `5512983195531` na campanha `66908102-3000-4231-a48a-c6431be4d3be`, fazer um UPDATE direto restaurando para `active` + `left_at=null`, e inserir um registro `join` em `group_member_history` com timestamp atual.

### Arquivos afetados

- `src/components/group-campaigns/tabs/MembersTab.tsx` — novo item de menu, novos badges, label do botão
- `src/hooks/useGroupMembers.ts` — nova mutation `reactivateMember(id)` que faz UPDATE + insert no history
- Migration de dados (insert tool) — corrige o registro específico

### Comportamento final

- O usuário consegue distinguir "Saiu" de "Removido" na lista
- Pode marcar um membro como ativo manualmente quando o sync está atrasado/incorreto
- O botão de sincronização fica mais óbvio
- O lead `5512983195531` volta a aparecer como "Ativo" imediatamente

### Fora deste escopo

- Corrigir cache/eventual-consistency do lado do n8n/Z-API (fora do nosso controle)
- Mecanismo automático de "auto-recuperação" — manter ação manual evita falsos positivos

