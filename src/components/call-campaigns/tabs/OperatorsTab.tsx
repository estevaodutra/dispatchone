import { useState } from "react";
import { useCallOperators, CallOperator } from "@/hooks/useCallOperators";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface OperatorsTabProps {
  campaignId: string;
}

export function OperatorsTab({ campaignId }: OperatorsTabProps) {
  const { operators, isLoading, addOperator, removeOperator, toggleActive, isAdding } =
    useCallOperators(campaignId);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newOperatorName, setNewOperatorName] = useState("");
  const [newExtension, setNewExtension] = useState("");

  const handleAddOperator = async () => {
    if (!newOperatorName.trim()) return;
    await addOperator({
      operatorName: newOperatorName.trim(),
      extension: newExtension.trim() || undefined,
    });
    setNewOperatorName("");
    setNewExtension("");
    setShowAddDialog(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Operador
        </Button>
      </div>

      {operators.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhum operador cadastrado</h3>
          <p className="text-muted-foreground mb-4">
            Adicione operadores para realizar as ligações desta campanha.
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Operador
          </Button>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Operadores ({operators.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ramal</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operators.map((operator) => (
                  <TableRow key={operator.id}>
                    <TableCell className="font-medium">{operator.operatorName}</TableCell>
                    <TableCell>{operator.extension || "-"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={operator.isActive}
                        onCheckedChange={(checked) =>
                          toggleActive({ id: operator.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeOperator(operator.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Operador</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="operatorName">Nome do Operador</Label>
              <Input
                id="operatorName"
                value={newOperatorName}
                onChange={(e) => setNewOperatorName(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="extension">Ramal (opcional)</Label>
              <Input
                id="extension"
                value={newExtension}
                onChange={(e) => setNewExtension(e.target.value)}
                placeholder="Ex: 1001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddOperator} disabled={!newOperatorName.trim() || isAdding}>
              {isAdding ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
