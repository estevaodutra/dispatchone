

## Problema

O botão "Upload Foto" na ConfigTab está hardcoded como `disabled` (linha 163), então não faz nada ao clicar.

## Solução

Integrar o hook `useMediaUpload("image")` que já existe no projeto para permitir upload da foto do grupo, e salvar a URL no campo `groupPhotoUrl` da campanha via `onUpdate`.

## Alterações

### `src/components/group-campaigns/tabs/ConfigTab.tsx`

1. Importar `useMediaUpload` e adicionar um `useRef<HTMLInputElement>` para o input de arquivo oculto
2. Criar handler `handlePhotoUpload` que:
   - Recebe o arquivo do input
   - Chama `upload(file)` do hook
   - Se sucesso, chama `onUpdate(campaign.id, { groupPhotoUrl: result.url })`
3. Substituir o botão `disabled` por um botão funcional que dispara o click no input oculto
4. Mostrar indicador de progresso durante upload
5. Adicionar botão de remover foto quando já houver uma

```
Fluxo:
[Botão Upload] → click → <input type="file" hidden> → onChange
  → useMediaUpload.upload(file) → Supabase Storage
  → onUpdate(id, { groupPhotoUrl: url }) → DB
```

| Arquivo | Alteração |
|---------|-----------|
| `src/components/group-campaigns/tabs/ConfigTab.tsx` | Integrar `useMediaUpload("image")`, adicionar input file oculto, habilitar botão, salvar URL no campo `groupPhotoUrl` |

Nenhuma alteração de banco de dados necessária — o campo `group_photo_url` já existe na tabela e o bucket `sequence-media` já está configurado.

