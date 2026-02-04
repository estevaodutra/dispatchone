
# Plano: Sidebar com Categorias Colapsáveis Mostrando Endpoints

Adicionar a funcionalidade de expandir/recolher cada categoria na sidebar para exibir a lista de endpoints individuais dentro de cada uma.

---

## Alteração Necessária

| Arquivo | Alteração |
|---------|-----------|
| `src/components/api-docs/ApiSidebar.tsx` | Transformar categorias em itens colapsáveis que mostram os endpoints |

---

## Implementação

Cada categoria terá um `Collapsible` que, ao expandir, mostra os endpoints dessa categoria:

```typescript
// Estado para controlar quais categorias estão expandidas
const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

// Toggle para expandir/recolher
const toggleCategory = (categoryId: string) => {
  setExpandedCategories(prev =>
    prev.includes(categoryId)
      ? prev.filter(id => id !== categoryId)
      : [...prev, categoryId]
  );
};

// Para cada categoria:
<Collapsible 
  open={expandedCategories.includes(category.id)}
  onOpenChange={() => toggleCategory(category.id)}
>
  <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2">
    <ChevronRight className={cn("h-3 w-3 transition-transform", 
      expandedCategories.includes(category.id) && "rotate-90")} />
    {categoryIcons[category.id]}
    <span>{category.name}</span>
  </CollapsibleTrigger>
  
  <CollapsibleContent>
    {/* Lista de endpoints da categoria */}
    {category.endpoints.map((endpoint) => (
      <button 
        key={endpoint.id}
        onClick={() => handleEndpointClick(category.id, endpoint.id)}
        className="pl-9 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <span className="font-mono text-[10px] mr-1 text-primary">{endpoint.method}</span>
        {endpoint.path}
      </button>
    ))}
  </CollapsibleContent>
</Collapsible>
```

---

## Comportamento

- **Clicar na seta/categoria**: expande/recolhe para mostrar os endpoints
- **Clicar em um endpoint**: seleciona a categoria e navega para a página onde esse endpoint está
- **Categorias iniciam recolhidas** por padrão
- A categoria ativa fica destacada visualmente

---

## Layout Visual

```text
Quando recolhido:          Quando expandido:
┌──────────────────┐       ┌──────────────────────────────┐
│ ▸ Mensagens      │       │ ▼ Mensagens                  │
│ ▸ Instância      │       │     POST /send-text          │
│ ▸ Webhooks       │       │     POST /send-media         │
│ ...              │       │     POST /send-document      │
└──────────────────┘       │     POST /send-location      │
                           │     POST /send-contact       │
                           │     POST /send-sticker       │
                           │     POST /send-poll          │
                           │     POST /send-link          │
                           │ ▸ Instância                  │
                           │ ▸ Webhooks                   │
                           └──────────────────────────────┘
```

---

## Props Adicionais

A sidebar precisará receber uma callback para quando o usuário clicar em um endpoint específico, para navegar até a página correta (paginação):

```typescript
interface ApiSidebarProps {
  activeSection: string;
  activeCategory: string;
  onSectionClick: (sectionId: string) => void;
  onCategoryClick: (categoryId: string) => void;
  onEndpointClick?: (categoryId: string, endpointId: string) => void; // Novo
}
```

---

## Resumo

| Item | Descrição |
|------|-----------|
| Componente usado | `Collapsible` do Radix UI |
| Estado inicial | Categorias fechadas |
| Exibição | Método HTTP + path de cada endpoint |
| Interação | Clicar expande/recolhe, clicar no endpoint navega |
