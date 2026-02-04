
# Plano: Categorias da Documentacao Fechadas por Padrao

Alterar o estado inicial do sidebar da documentacao da API para que todas as categorias de endpoints fiquem fechadas por padrao.

---

## Alteracao

| Arquivo | Linha | De | Para |
|---------|-------|----|------|
| `src/components/api-docs/ApiSidebar.tsx` | 23-25 | `useState<string[]>(apiEndpoints.map(cat => cat.id))` | `useState<string[]>([])` |

---

## Resultado

- Ao abrir a pagina `/api-docs`, todas as categorias de endpoints (Mensagens, Instancia, Webhooks, etc.) estarao fechadas
- Usuario pode clicar em cada categoria para expandir e ver os endpoints
- Interface mais limpa e organizada, similar a screenshot de referencia
