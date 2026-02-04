
# Plano: Reorganizar Tela de Campanhas com Canais WhatsApp e Telefonia

## Visao Geral

Transformar a atual estrutura de abas (Despacho/Grupos) em uma nova interface baseada em cards organizados por canal de comunicacao, suportando 5 tipos de campanha em 2 canais.

---

## Arquitetura Atual vs Nova

```text
ATUAL:
/campaigns (CampaignsLayout com abas)
  ├── index -> Campaigns.tsx (Despacho)
  └── /groups -> GroupCampaigns.tsx

NOVA:
/campaigns (CampaignsHub - cards por canal)
  ├── /whatsapp/despacho -> DispatchCampaigns.tsx
  ├── /whatsapp/grupos -> GroupCampaigns.tsx
  ├── /whatsapp/pirata -> PirateCampaigns.tsx (placeholder)
  ├── /telefonia/ura -> URACampaigns.tsx (placeholder)
  └── /telefonia/ligacao -> CallCampaigns.tsx (placeholder)
```

---

## Mudancas Necessarias

### 1. Banco de Dados

Adicionar campos `campaign_type` na tabela `campaigns`:

```sql
ALTER TABLE campaigns 
ADD COLUMN campaign_type text NOT NULL DEFAULT 'despacho';
```

**Valores de campaign_type:**
- `despacho`
- `pirata`
- `ura`
- `ligacao`

> Nota: Campanhas de grupos ja existem em tabela separada `group_campaigns`, entao nao precisam de campo adicional.

---

### 2. Componentes Novos

#### 2.1 CampaignsHub.tsx (Nova Tela Principal)

Tela principal com cards organizados por canal:

**Estrutura:**
- Header: Titulo + Botao "Nova Campanha"
- Secao WhatsApp com 3 cards (Despacho, Grupos, Pirata)
- Secao Telefonia com 2 cards (URA, Ligacao)

**Dados de cada card:**
- Icone representativo
- Nome do tipo
- Contagem de campanhas ativas (fetch do banco)

**Cores dos cards:**
| Tipo | Cor |
|------|-----|
| Despacho | Azul (blue-500) |
| Grupos | Verde (green-500) |
| Pirata | Roxo (purple-500) |
| URA | Laranja (orange-500) |
| Ligacao | Vermelho (red-500) |

#### 2.2 CampaignTypeCard.tsx

Card reutilizavel para cada tipo de campanha:

```typescript
interface CampaignTypeCardProps {
  icon: LucideIcon;
  title: string;
  activeCount: number;
  color: string;
  href: string;
}
```

#### 2.3 NewCampaignDialog.tsx

Modal para selecao do tipo de campanha ao criar nova:

- Agrupado por canal (WhatsApp / Telefonia)
- Cards selecionaveis com icone + nome + descricao
- Ao selecionar, navega para formulario de criacao do tipo

#### 2.4 CampaignListLayout.tsx

Layout compartilhado para listas de campanhas por tipo:

- Breadcrumb: Campanhas > Canal > Tipo
- Header com titulo e botao de criacao
- Cards de metricas (Total, Em Execucao, Concluidas)
- Filtros (busca + status)
- Tabela/lista de campanhas

---

### 3. Paginas Placeholder

Criar paginas placeholder para tipos futuros:

- `src/pages/campaigns/PirateCampaigns.tsx`
- `src/pages/campaigns/URACampaigns.tsx`
- `src/pages/campaigns/CallCampaigns.tsx`

Cada uma exibe estado vazio com mensagem "Em breve" ate implementacao completa.

---

### 4. Reorganizacao de Arquivos

**Estrutura proposta:**

```text
src/pages/
├── campaigns/
│   ├── CampaignsHub.tsx (nova - tela principal)
│   ├── DispatchCampaigns.tsx (renomeado de Campaigns.tsx)
│   ├── GroupCampaigns.tsx (movido)
│   ├── PirateCampaigns.tsx (novo - placeholder)
│   ├── URACampaigns.tsx (novo - placeholder)
│   └── CallCampaigns.tsx (novo - placeholder)

src/components/campaigns/
├── CampaignTypeCard.tsx (novo)
├── NewCampaignDialog.tsx (novo)
├── CampaignListLayout.tsx (novo)
└── CampaignBreadcrumb.tsx (novo)
```

---

### 5. Rotas (App.tsx)

Atualizar sistema de rotas:

```typescript
// Campanhas
<Route path="/campaigns" element={<AppLayout><Outlet /></AppLayout>}>
  <Route index element={<CampaignsHub />} />
  
  {/* WhatsApp */}
  <Route path="whatsapp/despacho" element={<DispatchCampaigns />} />
  <Route path="whatsapp/grupos" element={<GroupCampaignsPage />} />
  <Route path="whatsapp/pirata" element={<PirateCampaigns />} />
  
  {/* Telefonia */}
  <Route path="telefonia/ura" element={<URACampaigns />} />
  <Route path="telefonia/ligacao" element={<CallCampaigns />} />
</Route>
```

---

### 6. Menu Lateral (AppSidebar.tsx)

Transformar item "Campanhas" em menu expansivel com submenus:

**Componentes necessarios:**
- Usar `Collapsible` + `SidebarMenuSub` + `SidebarMenuSubButton`
- Estado de expansao controlado

**Estrutura do menu:**

```typescript
{
  title: "Campanhas",
  url: "/campaigns",
  icon: Megaphone,
  children: [
    {
      title: "WhatsApp",
      icon: MessageSquare,
      children: [
        { title: "Despacho", url: "/campaigns/whatsapp/despacho" },
        { title: "Grupos", url: "/campaigns/whatsapp/grupos" },
        { title: "Pirata", url: "/campaigns/whatsapp/pirata" },
      ]
    },
    {
      title: "Telefonia",
      icon: Phone,
      children: [
        { title: "URA", url: "/campaigns/telefonia/ura" },
        { title: "Ligacao", url: "/campaigns/telefonia/ligacao" },
      ]
    }
  ]
}
```

**Comportamento:**
- Clicar em "Campanhas" vai para `/campaigns` (CampaignsHub)
- Seta expande/colapsa submenus
- Submenus destacam rota ativa

---

### 7. Hooks

#### 7.1 Atualizar useCampaigns.ts

Adicionar suporte a `campaign_type`:

```typescript
export interface Campaign {
  // ... existentes
  campaignType: "despacho" | "pirata" | "ura" | "ligacao";
}

// Query com filtro opcional por tipo
useCampaigns(campaignType?: string)
```

#### 7.2 useCampaignStats.ts (novo)

Hook para buscar contagens por tipo para os cards:

```typescript
export function useCampaignStats() {
  // Retorna contagem de campanhas ativas por tipo
  return {
    despacho: { active: 12, total: 45 },
    grupos: { active: 5, total: 23 },
    pirata: { active: 0, total: 0 },
    ura: { active: 0, total: 0 },
    ligacao: { active: 0, total: 0 },
  };
}
```

---

### 8. Internacionalizacao (i18n)

Adicionar novas chaves em pt.ts:

```typescript
campaigns: {
  // ... existentes
  hub: {
    title: "Campanhas",
    description: "Gerencie suas campanhas de envio",
    newCampaign: "Nova Campanha",
  },
  channels: {
    whatsapp: "WhatsApp",
    telefonia: "Telefonia",
  },
  types: {
    despacho: {
      title: "Despacho",
      description: "Disparo de mensagens em massa para lista de contatos",
    },
    grupos: {
      title: "Grupos",
      description: "Gestao de grupos com sequencias e automacoes",
    },
    pirata: {
      title: "Pirata",
      description: "Campanha especial",
    },
    ura: {
      title: "URA",
      description: "Fluxo de audio interativo com DTMF",
    },
    ligacao: {
      title: "Ligacao",
      description: "Chamadas de voz automaticas",
    },
  },
  activeCount: "{{count}} ativas",
  comingSoon: "Em breve",
}
```

---

## Resumo de Arquivos

| Acao | Arquivo | Descricao |
|------|---------|-----------|
| Migrar | SQL | Adicionar campo campaign_type |
| Criar | CampaignsHub.tsx | Tela principal com cards |
| Criar | CampaignTypeCard.tsx | Componente de card |
| Criar | NewCampaignDialog.tsx | Modal de nova campanha |
| Criar | CampaignListLayout.tsx | Layout de lista por tipo |
| Criar | CampaignBreadcrumb.tsx | Navegacao breadcrumb |
| Mover | Campaigns.tsx -> DispatchCampaigns.tsx | Renomear/mover |
| Mover | GroupCampaigns.tsx | Mover para subpasta |
| Criar | PirateCampaigns.tsx | Placeholder |
| Criar | URACampaigns.tsx | Placeholder |
| Criar | CallCampaigns.tsx | Placeholder |
| Editar | App.tsx | Novas rotas |
| Editar | AppSidebar.tsx | Menu expansivel |
| Editar | useCampaigns.ts | Suporte a tipo |
| Criar | useCampaignStats.ts | Contagens por tipo |
| Editar | pt.ts, en.ts, es.ts | Novas traducoes |

---

## Ordem de Implementacao

1. **Banco de Dados** - Migracao SQL para adicionar campo
2. **Componentes Base** - CampaignTypeCard, CampaignBreadcrumb
3. **CampaignsHub** - Nova tela principal
4. **Rotas** - Atualizar App.tsx
5. **Reorganizar Paginas** - Mover/renomear arquivos existentes
6. **Paginas Placeholder** - Pirata, URA, Ligacao
7. **Menu Lateral** - AppSidebar com submenus
8. **Hooks** - useCampaignStats e atualizar useCampaigns
9. **i18n** - Adicionar traducoes
10. **NewCampaignDialog** - Modal de criacao

---

## Compatibilidade

- Campanhas existentes na tabela `campaigns` receberao `campaign_type = 'despacho'` por default
- Campanhas de grupos continuam na tabela `group_campaigns` separada
- Nenhum dado sera perdido
