O problema ocorre porque na última atualização adicionamos a busca pelo nome da campanha (`group_campaigns(name)`) na query de sequências, para podermos mostrar sequências de outras campanhas. 

No entanto, o banco de dados da Supabase não possui uma "Foreign Key" (chave estrangeira) explicitamente definida associando a coluna `group_campaign_id` da tabela `message_sequences` à tabela `group_campaigns`. Sem essa chave, o Supabase não sabe como fazer o JOIN das duas tabelas, retornando um erro `400 Bad Request` e fazendo com que a lista fique vazia na interface.

**Plano de Ação:**
1. Criar uma migração de banco de dados (`supabase--migration`) para adicionar a *foreign key* ausente:
   - Adicionar a constraint `FOREIGN KEY (group_campaign_id) REFERENCES public.group_campaigns(id) ON DELETE CASCADE` na tabela `message_sequences`.

Assim que você aprovar este plano, eu executarei a migração no banco de dados para corrigir o erro e as sequências voltarão a aparecer imediatamente.