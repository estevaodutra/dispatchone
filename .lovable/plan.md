
# Plano: Exibir Uma Categoria por Vez na Documentação da API

Modificar a estrutura da documentação para exibir apenas a categoria selecionada, eliminando o scroll longo entre múltiplas categorias.

---

## Problema Atual

A página exibe **todas as 8 categorias** verticalmente, causando scroll excessivo mesmo com paginação interna:

| Categoria | Endpoints |
|-----------|-----------|
| Mensagens | 8 |
| Instância | 3 |
| Webhooks | 4 |
| Respostas de Enquetes | 1 |
| Webhooks (Recebimento) | 1 |
| Validação | 1 |
| Consultas | 1 |
| Ligações | 2 |

**Total**: ~21 endpoints visíveis simultaneamente (com paginação = 8 categorias × ~3 endpoints)

---

## Solução Proposta

Implementar navegação por tabs onde o usuário vê **apenas uma categoria por vez**:

1. **Seções fixas** (sempre visíveis no topo): Introdução, Autenticação, Configurar Webhooks
2. **Tabs de categorias**: Mensagens | Instância | Webhooks | Enquetes | Inbound | Validação | Consultas | Ligações
3. **Seção fixa no final**: Erros e Tipos de Eventos

---

## Alterações Necessárias

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ApiDocs.tsx` | Adicionar estado para categoria ativa e usar Tabs |
| `src/components/api-docs/ApiSidebar.tsx` | Sincronizar com categoria selecionada |
| (opcional) Remover scroll listener para categorias

---

## Layout Visual Proposto

```text
┌─────────────────────────────────────────────────────────────┐
│  [Sidebar]     │  API Reference                             │
│                │                                             │
│  ● Introdução  │  ┌─────────────────────────────────────┐   │
│  ● Autenticação│  │ Introdução                          │   │
│  ● Webhooks    │  │ Bem-vindo à API...                  │   │
│                │  └─────────────────────────────────────┘   │
│  ─ Endpoints ─ │                                             │
│  ▸ Mensagens   │  ┌─────────────────────────────────────┐   │
│    Instância   │  │ Autenticação                        │   │
│    Webhooks    │  │ Bearer token...                     │   │
│    ...         │  └─────────────────────────────────────┘   │
│                │                                             │
│  ● Erros       │  ┌─────────────────────────────────────┐   │
│  ● Eventos     │  │ Endpoints                           │   │
│                │  ├─────────────────────────────────────┤   │
│                │  │ [Mensagens][Instância][Webhooks]... │   │
│                │  ├─────────────────────────────────────┤   │
│                │  │                                     │   │
│                │  │  POST /send-text                    │   │
│                │  │  ...                                │   │
│                │  │                                     │   │
│                │  │  ◄ Anterior    1  2  3    ►         │   │
│                │  │                                     │   │
│                │  └─────────────────────────────────────┘   │
│                │                                             │
│                │  ┌─────────────────────────────────────┐   │
│                │  │ Erros / Eventos                     │   │
│                │  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementação Técnica

### 1. Estado para Categoria Ativa

```typescript
// ApiDocs.tsx
const [activeCategory, setActiveCategory] = useState(apiEndpoints[0].id);
```

### 2. Componente de Tabs para Categorias

Usar o componente `Tabs` existente do shadcn/ui para alternar entre categorias:

```typescript
<Tabs value={activeCategory} onValueChange={setActiveCategory}>
  <TabsList className="flex flex-wrap gap-1 h-auto p-1">
    {apiEndpoints.map((category) => (
      <TabsTrigger key={category.id} value={category.id}>
        {category.name}
      </TabsTrigger>
    ))}
  </TabsList>
  
  {apiEndpoints.map((category) => (
    <TabsContent key={category.id} value={category.id}>
      <CategorySection category={category} endpointsPerPage={3} />
    </TabsContent>
  ))}
</Tabs>
```

### 3. Sincronizar Sidebar

Atualizar a sidebar para destacar a categoria ativa e permitir navegação direta:

```typescript
// Quando clicar em uma categoria na sidebar
const handleCategoryClick = (categoryId: string) => {
  setActiveCategory(categoryId);
  // Scroll para a seção de endpoints
};
```

---

## Benefícios

| Antes | Depois |
|-------|--------|
| Scroll de ~12.000px | Scroll de ~2.000px |
| 8 categorias visíveis | 1 categoria por vez |
| Difícil navegação | Tabs claras e intuitivas |
| Paginação + scroll entre categorias | Apenas paginação interna |

---

## Resumo das Mudanças

1. **Manter** seções fixas (Introdução, Autenticação, Webhook Config, Erros, Eventos)
2. **Substituir** loop de categorias por componente `Tabs`
3. **Exibir** apenas a categoria selecionada com sua paginação interna
4. **Sincronizar** sidebar com a tab ativa
