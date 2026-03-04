

## Duplicar Campanha de Ligação (com ações e roteiro)

### O que será feito
Adicionar um botão "Duplicar" no dropdown de cada campanha na lista. Ao clicar, a campanha será clonada junto com todos os dados relacionados: configurações, ações (call_script_actions) e roteiro (call_scripts). A nova campanha terá o nome "Cópia de [nome original]" e status "draft".

### Implementação

**1. `src/hooks/useCallCampaigns.ts` -- Adicionar mutation `duplicateCampaign`**
- Recebe o `id` da campanha original
- Busca a campanha original, suas `call_script_actions` e `call_scripts`
- Insere nova campanha com os mesmos campos (exceto id, status=draft, nome com prefixo "Cópia de")
- Insere cópia das `call_script_actions` vinculadas à nova campanha (com novos IDs, mapeando `retry_exceeded_action_id` se necessário)
- Insere cópia do `call_scripts` com nodes/edges vinculados à nova campanha (atualizando `actionId` nos nodes de pergunta para os novos IDs de ações)
- Invalida query e mostra toast de sucesso

**2. `src/components/call-campaigns/CallCampaignList.tsx` -- Adicionar item "Duplicar" no dropdown**
- Adicionar ícone `Copy` do lucide-react
- Novo `DropdownMenuItem` "Duplicar" que chama `onDuplicate(campaign.id)`
- Adicionar estado de loading para feedback visual

**3. `src/pages/campaigns/CallCampaigns.tsx` -- Passar `onDuplicate` para o componente**
- Conectar o novo `duplicateCampaign` do hook ao componente de lista

### Dados duplicados
- `call_campaigns`: todas as configurações (delay, retry, priority, api4com_config, etc.)
- `call_script_actions`: todas as ações com cores, tipos e configurações
- `call_scripts`: roteiro completo com nodes e edges (atualizando referências de actionId)
- **Não duplica**: leads, histórico de ligações, fila

