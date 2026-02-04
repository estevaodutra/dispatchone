
# Plano: Paginação na Documentação da API

Adicionar paginação dentro de cada categoria de endpoints para evitar scroll infinito e organizar melhor a documentação.

---

## Contexto Atual

A página de documentação da API (`/api-docs`) exibe todas as categorias e seus endpoints em uma única página com scroll longo:

| Categoria | Endpoints |
|-----------|-----------|
| Mensagens | 8 endpoints |
| Instância | 3 endpoints |
| Webhooks | 4 endpoints |
| Respostas de Enquetes | 1 endpoint |
| Webhooks (Recebimento) | 1 endpoint |
| Validação | 1 endpoint |
| Consultas | 1 endpoint |
| Ligações | 2 endpoints |

---

## Solução

Criar um componente `CategorySection` que exibe os endpoints de cada categoria com paginação interna (3 endpoints por página).

---

## Alterações Necessárias

| Arquivo | Alteração |
|---------|-----------|
| `src/components/api-docs/CategorySection.tsx` | Novo componente com paginação por categoria |
| `src/pages/ApiDocs.tsx` | Usar o novo CategorySection |
| `src/components/api-docs/index.ts` | Exportar novo componente |

---

## 1. Novo Componente CategorySection

Componente que encapsula uma categoria com seus endpoints e paginação:

```typescript
// src/components/api-docs/CategorySection.tsx
interface CategorySectionProps {
  category: EndpointCategory;
  endpointsPerPage?: number; // default: 3
}

export function CategorySection({ category, endpointsPerPage = 3 }) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calcular endpoints da página atual
  const totalPages = Math.ceil(category.endpoints.length / endpointsPerPage);
  const startIndex = (currentPage - 1) * endpointsPerPage;
  const paginatedEndpoints = category.endpoints.slice(startIndex, startIndex + endpointsPerPage);
  
  return (
    <section id={category.id}>
      {/* Header da categoria */}
      <div className="border-b border-border pb-4 mb-6">
        <h2>{category.name}</h2>
        <p>{category.description}</p>
        {/* Indicador de página */}
        <span>{category.endpoints.length} endpoints</span>
      </div>
      
      {/* Endpoints paginados */}
      {paginatedEndpoints.map(endpoint => (
        <EndpointSection key={endpoint.id} endpoint={endpoint} />
      ))}
      
      {/* Paginação (se houver mais de 1 página) */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationPrevious />
          <PaginationContent>
            {/* Números das páginas */}
          </PaginationContent>
          <PaginationNext />
        </Pagination>
      )}
    </section>
  );
}
```

---

## 2. Atualizar ApiDocs.tsx

Substituir o loop atual que exibe todos os endpoints por uso do novo componente:

```typescript
// Antes (scroll infinito)
{apiEndpoints.map((category) => (
  <div key={category.id}>
    <h2>{category.name}</h2>
    {category.endpoints.map((endpoint) => (
      <EndpointSection key={endpoint.id} endpoint={endpoint} />
    ))}
  </div>
))}

// Depois (paginado)
{apiEndpoints.map((category) => (
  <CategorySection 
    key={category.id} 
    category={category} 
    endpointsPerPage={3} 
  />
))}
```

---

## 3. Comportamento da Paginação

- **3 endpoints por página** (configurável)
- Categorias com 1-3 endpoints: sem paginação
- Categorias com 4+ endpoints: paginação aparece
- Ao trocar de página, scroll suave para o topo da categoria
- Indicador visual mostrando "Página X de Y"

---

## Layout Visual

```text
┌─────────────────────────────────────────────────┐
│  Mensagens                                      │
│  Endpoints para envio de mensagens (8 total)   │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ POST /send-text                          │   │
│  │ Envia uma mensagem de texto...           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ POST /send-media                         │   │
│  │ Envia uma imagem, vídeo ou áudio...      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ POST /send-document                      │   │
│  │ Envia um documento...                    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  ◄ Anterior    1  2  3    Próximo ►     │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Resumo

| Item | Descrição |
|------|-----------|
| Endpoints por página | 3 (configurável) |
| Categorias afetadas | Mensagens (8), Webhooks (4) |
| Categorias sem paginação | Demais (1-3 endpoints) |
| Scroll | Suave para topo da categoria ao paginar |
