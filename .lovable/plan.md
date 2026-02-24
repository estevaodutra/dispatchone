
## Objetivo
Corrigir o logout que hoje mostra toast de sucesso, mas mantém o usuário dentro da aplicação.

## Diagnóstico (com base no código e logs)
1. O clique em **Sair** chama `handleSignOut` em `src/components/layout/AppHeader.tsx`.
2. Esse handler faz `await signOut()` e **sempre** exibe sucesso/navega para `/auth`, sem tratar erro.
3. No `AuthContext` (`src/contexts/AuthContext.tsx`), `signOut` chama apenas `supabase.auth.signOut()` e não faz fallback.
4. Os logs de autenticação mostram repetidamente:
   - `POST /logout` com `403 session_not_found`
   - `GET /user` com `403 session_not_found`
   - mensagem: `Session not found`
5. Isso indica sessão inválida no backend, enquanto o cliente ainda pode manter estado local inconsistente.
6. Além disso, o bootstrap de auth usa `getSession()` primeiro (sessão local), sem validação imediata via `getUser()`. Assim, pode manter usuário “logado” mesmo com sessão inválida.
7. `ProtectedRoute` permite acesso quando **user OU session** existirem (`if (!user && !session) redirect`), o que também facilita estado “falso positivo” de login.

## Causa raiz
Fluxo de logout e bootstrap de auth não são resilientes ao cenário **session_not_found**:
- logout não faz fallback local nem limpa estado explicitamente em caso de erro;
- estado inicial pode confiar em sessão local desatualizada;
- rota protegida aceita combinação que pode manter acesso com sessão inválida.

## Plano de implementação

### 1) Endurecer o `signOut` no AuthContext
**Arquivo:** `src/contexts/AuthContext.tsx`

Implementar fluxo robusto:
1. Tentar `supabase.auth.signOut()` (escopo global).
2. Se falhar com `session_not_found` (ou erro equivalente), executar fallback com `supabase.auth.signOut({ scope: "local" })`.
3. Em `finally`, limpar estado local do contexto:
   - `setUser(null)`
   - `setSession(null)`
   - `setIsLoading(false)`
4. Fazer `signOut` retornar `{ error: Error | null }` para o header decidir mensagem correta.

Resultado esperado: mesmo com sessão inválida no backend, usuário é desconectado localmente e sai da área protegida.

---

### 2) Ajustar bootstrap de autenticação para validar sessão real
**Arquivo:** `src/contexts/AuthContext.tsx`

1. Registrar `onAuthStateChange` primeiro (evitar race de inicialização).
2. Depois, no carregamento inicial:
   - obter `getSession()` para saber se há token local;
   - se houver sessão local, validar com `getUser()`; se falhar, limpar sessão local.
3. Garantir `setIsLoading(false)` em todos os caminhos.

Resultado esperado: app não permanece logado com sessão inválida.

---

### 3) Tornar o logout da UI resiliente
**Arquivo:** `src/components/layout/AppHeader.tsx`

1. Em `handleSignOut`, usar `try/catch`.
2. Consumir retorno de `signOut`.
3. Se houver erro não recuperável, mostrar toast de erro apropriado.
4. Em caso de sucesso (incluindo fallback local), manter toast de sucesso e navegar para `/auth`.

Resultado esperado: feedback correto ao usuário e sem falso sucesso silencioso.

---

### 4) Revisar a proteção de rota para evitar falso positivo
**Arquivo:** `src/components/auth/ProtectedRoute.tsx`

Ajustar regra para depender de estado confiável do contexto (preferencialmente `user` já validado), evitando aceitar apenas `session` local potencialmente inválida.

Exemplo de direção:
- manter loading enquanto valida;
- redirecionar quando `!user`.

Resultado esperado: se sessão estiver inválida, usuário é redirecionado para `/auth` consistentemente.

---

### 5) Validação E2E após correção
Executar este roteiro:
1. Login normal.
2. Clicar em **Sair** no menu do usuário.
3. Confirmar redirecionamento para `/auth`.
4. Tentar voltar para `/` manualmente: deve redirecionar para `/auth`.
5. Repetir com sessão expirada/inválida (simulada) para confirmar que logout continua funcionando.
6. Confirmar que não há loop de toasts nem travamento visual.

## Detalhes técnicos (resumo)
- **Arquivos impactados:**  
  - `src/contexts/AuthContext.tsx`  
  - `src/components/layout/AppHeader.tsx`  
  - `src/components/auth/ProtectedRoute.tsx`
- **Mudanças-chave:** fallback de logout local, limpeza explícita de estado, validação de sessão no bootstrap, tratamento de erro na UI.
- **Risco:** baixo a médio (afeta autenticação global), mitigado por teste E2E completo de login/logout e acesso a rotas protegidas.
