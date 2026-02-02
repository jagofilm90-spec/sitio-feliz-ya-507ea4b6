import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Building2, ArrowRight, Loader2, AlertTriangle, FolderTree, GitMerge } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  direccion: string | null;
  telefono: string | null;
  grupo_cliente_id: string | null;
  es_grupo: boolean;
}

interface AgruparClientesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientes: Cliente[];
  onSuccess: () => void;
}

export function AgruparClientesDialog({
  open,
  onOpenChange,
  clientes,
  onSuccess,
}: AgruparClientesDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrupo, setSelectedGrupo] = useState<Cliente | null>(null);
  const [selectedMiembros, setSelectedMiembros] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"agrupar" | "convertir">("agrupar");
  const [confirmConvertirOpen, setConfirmConvertirOpen] = useState(false);
  const [convertirLoading, setConvertirLoading] = useState(false);
  const { toast } = useToast();

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSelectedGrupo(null);
      setSelectedMiembros([]);
      setActiveTab("agrupar");
    }
  }, [open]);

  // Filter clients based on search
  const filteredClientes = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.rfc && c.rfc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get available clients for selection (not already in a group, not the selected grupo)
  const availableMiembros = filteredClientes.filter(
    (c) =>
      c.id !== selectedGrupo?.id &&
      !c.grupo_cliente_id &&
      !c.es_grupo
  );

  // Get existing groups
  const gruposExistentes = clientes.filter((c) => c.es_grupo);

  // Get members of selected group for convertir tab
  const miembrosDelGrupo = selectedGrupo
    ? clientes.filter((c) => c.grupo_cliente_id === selectedGrupo.id)
    : [];

  const handleToggleMiembro = (clienteId: string) => {
    setSelectedMiembros((prev) =>
      prev.includes(clienteId)
        ? prev.filter((id) => id !== clienteId)
        : [...prev, clienteId]
    );
  };

  const handleAgrupar = async () => {
    if (!selectedGrupo || selectedMiembros.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona un grupo padre y al menos un cliente miembro",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Mark the parent as a group
      const { error: grupoError } = await supabase
        .from("clientes")
        .update({ es_grupo: true })
        .eq("id", selectedGrupo.id);

      if (grupoError) throw grupoError;

      // Link members to the group
      const { error: miembrosError } = await supabase
        .from("clientes")
        .update({ grupo_cliente_id: selectedGrupo.id })
        .in("id", selectedMiembros);

      if (miembrosError) throw miembrosError;

      toast({
        title: "Clientes agrupados",
        description: `${selectedMiembros.length} clientes vinculados a "${selectedGrupo.nombre}"`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error agrupando clientes:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron agrupar los clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConvertirASucursales = async () => {
    if (!selectedGrupo || miembrosDelGrupo.length === 0) {
      toast({
        title: "Error",
        description: "El grupo no tiene miembros para convertir",
        variant: "destructive",
      });
      return;
    }

    setConvertirLoading(true);
    try {
      // Create sucursales from each member
      for (const miembro of miembrosDelGrupo) {
        // Check if sucursal already exists with same name
        const { data: existingSuc } = await supabase
          .from("cliente_sucursales")
          .select("id")
          .eq("cliente_id", selectedGrupo.id)
          .eq("nombre", miembro.nombre)
          .single();

        if (!existingSuc) {
          // Create sucursal from member data
          await supabase.from("cliente_sucursales").insert({
            cliente_id: selectedGrupo.id,
            nombre: miembro.nombre,
            direccion: miembro.direccion,
            telefono: miembro.telefono,
            rfc: miembro.rfc,
            activo: true,
          });
        }

        // Mark the original client as inactive
        await supabase
          .from("clientes")
          .update({ 
            activo: false,
            grupo_cliente_id: null 
          })
          .eq("id", miembro.id);
      }

      toast({
        title: "Conversión exitosa",
        description: `${miembrosDelGrupo.length} clientes convertidos a sucursales de "${selectedGrupo.nombre}"`,
      });

      onSuccess();
      onOpenChange(false);
      setConfirmConvertirOpen(false);
    } catch (error: any) {
      console.error("Error convirtiendo a sucursales:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron convertir los clientes",
        variant: "destructive",
      });
    } finally {
      setConvertirLoading(false);
    }
  };

  const handleDesagrupar = async (clienteId: string) => {
    try {
      await supabase
        .from("clientes")
        .update({ grupo_cliente_id: null })
        .eq("id", clienteId);

      // Check if group still has members
      const { count } = await supabase
        .from("clientes")
        .select("id", { count: "exact" })
        .eq("grupo_cliente_id", selectedGrupo?.id);

      // If no more members, remove group flag
      if (count === 0 && selectedGrupo) {
        await supabase
          .from("clientes")
          .update({ es_grupo: false })
          .eq("id", selectedGrupo.id);
      }

      toast({
        title: "Cliente desagrupado",
        description: "El cliente ha sido removido del grupo",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo desagrupar el cliente",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[85vh] overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agrupar Clientes
            </DialogTitle>
            <DialogDescription>
              Agrupa clientes relacionados bajo un grupo padre o conviértelos en sucursales
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="agrupar" className="flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Agrupar
              </TabsTrigger>
              <TabsTrigger value="convertir" className="flex items-center gap-2">
                <GitMerge className="h-4 w-4" />
                Convertir a Sucursales
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agrupar" className="space-y-4 mt-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Select Parent Group */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Grupo Padre
                  </Label>
                  <ScrollArea className="h-[300px] border rounded-md p-2">
                    {gruposExistentes.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground mb-1">Grupos existentes:</p>
                        {gruposExistentes.map((grupo) => (
                          <div
                            key={grupo.id}
                            onClick={() => setSelectedGrupo(grupo)}
                            className={`p-2 rounded-md cursor-pointer transition-colors mb-1 ${
                              selectedGrupo?.id === grupo.id
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span className="font-medium text-sm">{grupo.nombre}</span>
                            </div>
                            <p className="text-xs opacity-70">{grupo.codigo}</p>
                          </div>
                        ))}
                        <div className="border-t my-2" />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mb-1">Seleccionar nuevo padre:</p>
                    {filteredClientes
                      .filter((c) => !c.grupo_cliente_id)
                      .map((cliente) => (
                        <div
                          key={cliente.id}
                          onClick={() => setSelectedGrupo(cliente)}
                          className={`p-2 rounded-md cursor-pointer transition-colors mb-1 ${
                            selectedGrupo?.id === cliente.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">{cliente.nombre}</span>
                            {cliente.es_grupo && (
                              <Badge variant="secondary" className="text-xs">Grupo</Badge>
                            )}
                          </div>
                          <p className="text-xs opacity-70">{cliente.codigo}</p>
                        </div>
                      ))}
                  </ScrollArea>
                </div>

                {/* Select Members */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Clientes a Agrupar ({selectedMiembros.length})
                  </Label>
                  <ScrollArea className="h-[300px] border rounded-md p-2">
                    {availableMiembros.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay clientes disponibles para agrupar
                      </p>
                    ) : (
                      availableMiembros.map((cliente) => (
                        <div
                          key={cliente.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md"
                        >
                          <Checkbox
                            id={cliente.id}
                            checked={selectedMiembros.includes(cliente.id)}
                            onCheckedChange={() => handleToggleMiembro(cliente.id)}
                          />
                          <label
                            htmlFor={cliente.id}
                            className="flex-1 cursor-pointer"
                          >
                            <p className="font-medium text-sm">{cliente.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {cliente.codigo} {cliente.rfc && `• ${cliente.rfc}`}
                            </p>
                          </label>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              </div>

              {/* Preview */}
              {selectedGrupo && selectedMiembros.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Vista previa:</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {selectedGrupo.nombre}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {selectedMiembros.length} clientes vinculados
                    </span>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAgrupar}
                  disabled={!selectedGrupo || selectedMiembros.length === 0 || loading}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Agrupar Clientes
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="convertir" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Select Group */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Seleccionar Grupo
                  </Label>
                  <ScrollArea className="h-[300px] border rounded-md p-2">
                    {gruposExistentes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay grupos existentes
                      </p>
                    ) : (
                      gruposExistentes.map((grupo) => (
                        <div
                          key={grupo.id}
                          onClick={() => setSelectedGrupo(grupo)}
                          className={`p-2 rounded-md cursor-pointer transition-colors mb-1 ${
                            selectedGrupo?.id === grupo.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="font-medium text-sm">{grupo.nombre}</span>
                          </div>
                          <p className="text-xs opacity-70">{grupo.codigo}</p>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>

                {/* Group Members */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Miembros del Grupo ({miembrosDelGrupo.length})
                  </Label>
                  <ScrollArea className="h-[300px] border rounded-md p-2">
                    {!selectedGrupo ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Selecciona un grupo para ver sus miembros
                      </p>
                    ) : miembrosDelGrupo.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Este grupo no tiene miembros
                      </p>
                    ) : (
                      miembrosDelGrupo.map((cliente) => (
                        <div
                          key={cliente.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded-md"
                        >
                          <div>
                            <p className="font-medium text-sm">{cliente.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {cliente.codigo} {cliente.rfc && `• ${cliente.rfc}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDesagrupar(cliente.id)}
                          >
                            Desagrupar
                          </Button>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              </div>

              {selectedGrupo && miembrosDelGrupo.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Convertir a Sucursales</p>
                      <p className="text-xs text-muted-foreground">
                        Los {miembrosDelGrupo.length} clientes miembros serán convertidos en sucursales 
                        de "{selectedGrupo.nombre}" y marcados como inactivos como clientes independientes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmConvertirOpen(true)}
                  disabled={!selectedGrupo || miembrosDelGrupo.length === 0}
                >
                  <GitMerge className="h-4 w-4 mr-2" />
                  Convertir a Sucursales
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirm Convert Dialog */}
      <AlertDialog open={confirmConvertirOpen} onOpenChange={setConfirmConvertirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar conversión?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción convertirá {miembrosDelGrupo.length} clientes en sucursales 
              de "{selectedGrupo?.nombre}". Los clientes originales serán marcados como inactivos.
              Esta acción no se puede deshacer fácilmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={convertirLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvertirASucursales}
              disabled={convertirLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {convertirLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sí, Convertir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
