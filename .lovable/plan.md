## Objetivo

Tornar o painel do superadmin acessível via `/admin/*`, conectando as páginas já criadas ao roteador e protegendo tudo com `ProtectedRoute` (login) + `AdminRoute` (verificação de superadmin) + `AdminLayout` (sidebar e header próprios).

## Mudanças

### 1. `src/App.tsx`

Adicionar imports:
- `AdminRoute` de `@/components/auth/AdminRoute`
- `AdminLayout` de `@/components/admin/AdminLayout`
- Páginas: `AdminDashboard`, `AdminCompanies`, `AdminUsers`, `AdminTransactions` de `@/pages/admin/*`

Registrar um grupo de rotas aninhadas em `/admin` usando `Outlet`, com a seguinte estrutura de proteção (de fora pra dentro): `ProtectedRoute requireCompany={false}` → `AdminRoute` → `AdminLayout`. O `requireCompany={false}` é importante para que um superadmin sem vínculo com empresa não seja redirecionado para `/aguardando-acesso`.

Rotas filhas:
- `index` → `AdminDashboard`
- `empresas` → `AdminCompanies`
- `usuarios` → `AdminUsers`
- `financeiro/transacoes` → `AdminTransactions`

As demais entradas do `AdminSidebar` (Recargas, Consumo, Preços, Provedores, Relatórios, Configurações) ainda não têm página implementada e ficarão para uma próxima fase — por enquanto não serão registradas (cairão em `NotFound`, comportamento aceitável até a Fase 3/4).

Trecho aproximado:

```tsx
<Route
  path="/admin"
  element={
    <ProtectedRoute requireCompany={false}>
      <AdminRoute>
        <AdminLayout>
          <Outlet />
        </AdminLayout>
      </AdminRoute>
    </ProtectedRoute>
  }
>
  <Route index element={<AdminDashboard />} />
  <Route path="empresas" element={<AdminCompanies />} />
  <Route path="usuarios" element={<AdminUsers />} />
  <Route path="financeiro/transacoes" element={<AdminTransactions />} />
</Route>
```

### 2. Nada mais precisa mudar

- `AdminRoute` já redireciona não-superadmins para `/` e não-autenticados para `/auth`.
- `AdminLayout` já renderiza sidebar/header próprios e usa `children`, compatível com `<Outlet />`.
- `NotFound` já está como catch-all (`*`), então `/admin/qualquer-coisa-inexistente` cairá nele.

## Pendência (fora do escopo desta tarefa)

Para um superadmin conseguir efetivamente entrar em `/admin`, é necessário inserir manualmente uma linha em `user_roles` com `role = 'superadmin'` para o usuário desejado. Após aprovação, posso pedir o e-mail e rodar a migration de seed.