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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertTriangle,
  FolderTree,
  GitMerge,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  direccion: string | null;
  telefono: string | null;
  grupo_cliente_id: string | null;
  es_grupo: boolean;
  activo: boolean;
}

interface GrupoDetectado {
  nombre: string;
  clientes: Cliente[];
  rfcUnificado: boolean;
  rfcValor: string | null;
}

interface DetectarGruposDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DetectarGruposDialog({
  open,
  onOpenChange,
  onSuccess,
}: DetectarGruposDialogProps) {
  const [loading, setLoading] = useState(false);
  const [grupos, setGrupos] = useState<GrupoDetectado[]>([]);
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set());
  const [selectedGrupos, setSelectedGrupos] = useState<Set<string>>(new Set());
  const [processingAction, setProcessingAction] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "agrupar" | "convertir";
    gruposCount: number;
  }>({ open: false, action: "agrupar", gruposCount: 0 });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      detectarGrupos();
    } else {
      setGrupos([]);
      setExpandedGrupos(new Set());
      setSelectedGrupos(new Set());
    }
  }, [open]);

  const detectarGrupos = async () => {
    setLoading(true);
    try {
      // Fetch all active clients not already in a group
      const { data: clientes, error } = await supabase
        .from("clientes")
        .select("id, codigo, nombre, rfc, direccion, telefono, grupo_cliente_id, es_grupo, activo")
        .eq("activo", true)
        .is("grupo_cliente_id", null)
        .eq("es_grupo", false)
        .order("nombre");

      if (error) throw error;

      // Group by normalized name
      const gruposPorNombre: Map<string, Cliente[]> = new Map();
      
      (clientes || []).forEach((cliente) => {
        // Normalize name: trim, uppercase, remove extra spaces
        const nombreNormalizado = cliente.nombre
          .trim()
          .toUpperCase()
          .replace(/\s+/g, " ");
        
        if (!gruposPorNombre.has(nombreNormalizado)) {
          gruposPorNombre.set(nombreNormalizado, []);
        }
        gruposPorNombre.get(nombreNormalizado)!.push(cliente);
      });

      // Filter groups with more than 1 client
      const gruposDetectados: GrupoDetectado[] = [];
      
      gruposPorNombre.forEach((clientesDelGrupo, nombre) => {
        if (clientesDelGrupo.length > 1) {
          // Check if all have same RFC
          const rfcs = clientesDelGrupo
            .map((c) => c.rfc?.trim().toUpperCase())
            .filter(Boolean);
          const rfcUnificado = rfcs.length > 0 && new Set(rfcs).size === 1;
          
          gruposDetectados.push({
            nombre,
            clientes: clientesDelGrupo.sort((a, b) => a.codigo.localeCompare(b.codigo)),
            rfcUnificado,
            rfcValor: rfcUnificado ? rfcs[0]! : null,
          });
        }
      });

      // Sort by number of clients (descending)
      gruposDetectados.sort((a, b) => b.clientes.length - a.clientes.length);
      
      setGrupos(gruposDetectados);
    } catch (error: any) {
      console.error("Error detecting groups:", error);
      toast({
        title: "Error",
        description: "No se pudieron detectar los grupos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (nombre: string) => {
    setExpandedGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) {
        next.delete(nombre);
      } else {
        next.add(nombre);
      }
      return next;
    });
  };

  const toggleSelectGrupo = (nombre: string) => {
    setSelectedGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) {
        next.delete(nombre);
      } else {
        next.add(nombre);
      }
      return next;
    });
  };

  const selectAllGrupos = () => {
    if (selectedGrupos.size === grupos.length) {
      setSelectedGrupos(new Set());
    } else {
      setSelectedGrupos(new Set(grupos.map((g) => g.nombre)));
    }
  };

  const handleAgrupar = async () => {
    setProcessingAction(true);
    try {
      const gruposSeleccionados = grupos.filter((g) => selectedGrupos.has(g.nombre));
      let procesados = 0;

      for (const grupo of gruposSeleccionados) {
        // Use the client with the lowest code as the parent
        const [padre, ...miembros] = grupo.clientes;

        // Mark parent as group
        await supabase
          .from("clientes")
          .update({ es_grupo: true })
          .eq("id", padre.id);

        // Link members to parent
        if (miembros.length > 0) {
          await supabase
            .from("clientes")
            .update({ grupo_cliente_id: padre.id })
            .in("id", miembros.map((m) => m.id));
        }

        procesados++;
      }

      toast({
        title: "Grupos creados",
        description: `Se agruparon ${procesados} grupos correctamente`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error agrupando:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron crear los grupos",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  const handleConvertir = async () => {
    setProcessingAction(true);
    try {
      const gruposSeleccionados = grupos.filter((g) => selectedGrupos.has(g.nombre));
      let procesados = 0;

      for (const grupo of gruposSeleccionados) {
        // Use the client with the lowest code as the parent
        const [padre, ...miembros] = grupo.clientes;

        // Mark parent as group
        await supabase
          .from("clientes")
          .update({ es_grupo: true })
          .eq("id", padre.id);

        // Create sucursales from members and mark them inactive
        for (const miembro of miembros) {
          // Create sucursal
          await supabase.from("cliente_sucursales").insert({
            cliente_id: padre.id,
            nombre: `${miembro.nombre} (${miembro.codigo})`,
            direccion: miembro.direccion,
            telefono: miembro.telefono,
            rfc: miembro.rfc,
            codigo_sucursal: miembro.codigo,
            activo: true,
          });

          // Mark original client as inactive
          await supabase
            .from("clientes")
            .update({ activo: false })
            .eq("id", miembro.id);
        }

        procesados++;
      }

      toast({
        title: "Conversión exitosa",
        description: `Se convirtieron ${procesados} grupos a sucursales`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error convirtiendo:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron convertir los grupos",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  const gruposConRfcUnificado = grupos.filter((g) => g.rfcUnificado);
  const gruposSinRfcUnificado = grupos.filter((g) => !g.rfcUnificado);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[85vh] overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Detectar Grupos Automáticamente
            </DialogTitle>
            <DialogDescription>
              Clientes con el mismo nombre pero diferente código detectados automáticamente
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <AlmasaLoading size={48} />
          ) : grupos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Check className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">No hay duplicados</p>
              <p className="text-sm text-muted-foreground">
                No se detectaron clientes con nombres repetidos
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{grupos.length} grupos detectados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {grupos.reduce((acc, g) => acc + g.clientes.length, 0)} clientes involucrados
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectedGrupos.size === grupos.length && grupos.length > 0}
                    onCheckedChange={selectAllGrupos}
                  />
                  <label htmlFor="selectAll" className="text-sm cursor-pointer">
                    Seleccionar todos
                  </label>
                </div>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {/* Groups with unified RFC */}
                  {gruposConRfcUnificado.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Mismo RFC
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {gruposConRfcUnificado.length} grupos - Seguros para fusionar
                        </span>
                      </div>
                      {gruposConRfcUnificado.map((grupo) => (
                        <GrupoCard
                          key={grupo.nombre}
                          grupo={grupo}
                          expanded={expandedGrupos.has(grupo.nombre)}
                          selected={selectedGrupos.has(grupo.nombre)}
                          onToggleExpand={() => toggleExpand(grupo.nombre)}
                          onToggleSelect={() => toggleSelectGrupo(grupo.nombre)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Groups without unified RFC */}
                  {gruposSinRfcUnificado.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          RFC Diferente/Vacío
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {gruposSinRfcUnificado.length} grupos - Revisar antes de fusionar
                        </span>
                      </div>
                      {gruposSinRfcUnificado.map((grupo) => (
                        <GrupoCard
                          key={grupo.nombre}
                          grupo={grupo}
                          expanded={expandedGrupos.has(grupo.nombre)}
                          selected={selectedGrupos.has(grupo.nombre)}
                          onToggleExpand={() => toggleExpand(grupo.nombre)}
                          onToggleSelect={() => toggleSelectGrupo(grupo.nombre)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        disabled={selectedGrupos.size === 0 || processingAction}
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            action: "agrupar",
                            gruposCount: selectedGrupos.size,
                          })
                        }
                      >
                        <FolderTree className="h-4 w-4 mr-2" />
                        Agrupar ({selectedGrupos.size})
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Vincula clientes bajo el de código más antiguo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        disabled={selectedGrupos.size === 0 || processingAction}
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            action: "convertir",
                            gruposCount: selectedGrupos.size,
                          })
                        }
                      >
                        <GitMerge className="h-4 w-4 mr-2" />
                        Convertir a Sucursales ({selectedGrupos.size})
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Crea sucursales y desactiva clientes originales</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "agrupar"
                ? "Confirmar Agrupación"
                : "Confirmar Conversión a Sucursales"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "agrupar" ? (
                <>
                  Se vincularán <strong>{confirmDialog.gruposCount} grupos</strong> de clientes.
                  El cliente con el código más antiguo será el padre del grupo.
                  <br /><br />
                  Los clientes permanecerán activos y visibles individualmente.
                </>
              ) : (
                <>
                  Se convertirán <strong>{confirmDialog.gruposCount} grupos</strong> a sucursales.
                  <br /><br />
                  <strong className="text-destructive">Atención:</strong> Los clientes originales
                  (excepto el padre) serán marcados como <strong>inactivos</strong> y sus datos
                  se migrarán como sucursales del cliente padre.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingAction}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.action === "agrupar" ? handleAgrupar : handleConvertir}
              disabled={processingAction}
            >
              {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {confirmDialog.action === "agrupar" ? "Agrupar" : "Convertir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface GrupoCardProps {
  grupo: GrupoDetectado;
  expanded: boolean;
  selected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
}

function GrupoCard({
  grupo,
  expanded,
  selected,
  onToggleExpand,
  onToggleSelect,
}: GrupoCardProps) {
  return (
    <Collapsible open={expanded} onOpenChange={onToggleExpand}>
      <div
        className={`border rounded-lg mb-2 transition-colors ${
          selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
        }`}
      >
        <div className="flex items-center gap-3 p-3">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
          />
          <CollapsibleTrigger asChild>
            <button className="flex-1 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-sm">{grupo.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {grupo.clientes.length} clientes • Códigos:{" "}
                    {grupo.clientes.map((c) => c.codigo).join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {grupo.rfcUnificado ? (
                  <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                    RFC: {grupo.rfcValor}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                    RFC mixto
                  </Badge>
                )}
              </div>
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="border-t px-3 py-2 space-y-2">
            {grupo.clientes.map((cliente, idx) => (
              <div
                key={cliente.id}
                className={`flex items-center justify-between p-2 rounded text-sm ${
                  idx === 0 ? "bg-primary/10 border border-primary/20" : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <Badge variant="default" className="text-xs">
                      Padre
                    </Badge>
                  )}
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {cliente.codigo}
                  </span>
                  <span className="truncate max-w-[200px]">{cliente.nombre}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {cliente.rfc && <span>RFC: {cliente.rfc}</span>}
                  {cliente.direccion && (
                    <span className="truncate max-w-[150px]">{cliente.direccion}</span>
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground italic pt-1">
              El cliente con código más antiguo ({grupo.clientes[0].codigo}) será el padre del grupo
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
