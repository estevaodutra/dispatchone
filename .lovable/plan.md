

## Plano: Exibir ciclo da janela (reabertura automática)

### Problema
Quando a janela expira, o frontend mostra apenas "Expirada" sem indicar que ela reabrirá automaticamente no próximo horário configurado. O usuário precisa ver que a janela é cíclica.

### Alterações

**`src/components/group-campaigns/tabs/ExecutionListTab.tsx`**

1. Atualizar o countdown para mostrar informação do próximo ciclo quando a janela expira:
   - Para janela fixa: mostrar "Reabre às HH:MM" em vez de apenas "Expirada"
   - Para janela de duração: mostrar "Próximo ciclo em Xh"
2. Adicionar um indicador visual (badge ou texto) mostrando que a janela é cíclica (ex: ícone de refresh ao lado do label "Janela fecha em")

**Lógica do countdown atualizada:**
```typescript
// Quando diff <= 0 (janela expirada):
if (list.window_type === "fixed" && list.window_start_time) {
  setCountdown(`Reabre às ${list.window_start_time.slice(0, 5)}`);
} else if (list.window_type === "duration") {
  setCountdown(`Próximo ciclo: ${list.window_duration_hours}h`);
} else {
  setCountdown("Expirada");
}
```

3. Alterar o label do card de "Janela fecha em" para refletir o estado:
   - Janela aberta → "Janela fecha em"
   - Janela expirada → "Próxima janela"

### Arquivos
- `src/components/group-campaigns/tabs/ExecutionListTab.tsx`

