import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Truck, 
  Clock,
  
  Package,
  Loader2,
} from "lucide-react";

interface ProductoOC {
  cantidad_ordenada: number;
  cantidad_recibida: number | null;
  producto: {
    codigo: string;
    nombre: string;
    unidad: string;
  } | null;
}

interface EntregaFutura {
  id: string;
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string;
  status: string;
  notas: string | null;
  orden_compra: {
    id: string;
    folio: string;
    status: string;
    proveedor_id: string | null;
    proveedor_nombre_manual: string | null;
    proveedor: {
      id: string;
      nombre: string;
    } | null;
    detalles: ProductoOC[];
  };
}

interface BusquedaLlegadaAnticipadaProps {
  onEntregaReprogramada: () => void;
  defaultOpen?: boolean;
}

export const BusquedaLlegadaAnticipada = ({ 
  onEntregaReprogramada, 
  defaultOpen = false 
}: BusquedaLlegadaAnticipadaProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const [entregasFuturas, setEntregasFuturas] = useState<EntregaFutura[]>([]);
  const [loading, setLoading] = useState(false);
  const [forzandoId, setForzandoId] = useState<string | null>(null);
  const [confirmandoEntrega, setConfirmandoEntrega] = useState<EntregaFutura | null>(null);
  const { toast } = useToast();

  // Cargar entregas futuras cuando se abre el panel
  useEffect(() => {
    if (isOpen) {
      loadEntregasFuturas();
    }
  }, [isOpen]);

  const loadEntregasFuturas = async () => {
    setLoading(true);
    try {
      // Calcular fechas: desde mañana hasta 7 días laborales (lun-sáb) adelante
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      
      // Avanzar 7 días laborales (lunes a sábado, excluyendo domingo)
      let diasLaboralesContados = 0;
      const fechaLimite = new Date(hoy);
      while (diasLaboralesContados < 7) {
        fechaLimite.setDate(fechaLimite.getDate() + 1);
        // 0 = domingo, se salta
        if (fechaLimite.getDay() !== 0) {
          diasLaboralesContados++;
        }
      }
      const en7Dias = fechaLimite;

      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select(`
          id,
          numero_entrega,
          cantidad_bultos,
          fecha_programada,
          status,
          notas,
          orden_compra:ordenes_compra(
            id,
            folio,
            status,
            proveedor_id,
            proveedor_nombre_manual,
            proveedor:proveedores(id, nombre),
            detalles:ordenes_compra_detalles(
              cantidad_ordenada,
              cantidad_recibida,
              producto:productos(codigo, nombre, unidad)
            )
          )
        `)
        .eq("status", "programada")
        // Nota: El filtro de pendiente_pago se aplica post-query
        .gt("fecha_programada", hoy.toISOString().split('T')[0])
        .lte("fecha_programada", en7Dias.toISOString().split('T')[0])
        .order("fecha_programada", { ascending: true });

      if (error) throw error;
      // Filtrar OCs que están pendientes de pago (no deben aparecer)
      const entregasFiltradas = (data as unknown as EntregaFutura[] || []).filter(
        entrega => entrega.orden_compra?.status !== "pendiente_pago"
      );
      setEntregasFuturas(entregasFiltradas);
    } catch (error) {
      console.error("Error cargando entregas futuras:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las entregas futuras",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForzarLlegadaAnticipada = async (entrega: EntregaFutura) => {
    if (!entrega.fecha_programada) return;
    
    setForzandoId(entrega.id);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const fechaOriginal = entrega.fecha_programada;
      
      // Crear nota con la fecha original
      const notaAnterior = entrega.notas || "";
      const nuevaNota = `Llegada anticipada - originalmente para ${format(new Date(fechaOriginal + "T12:00:00"), "dd/MM/yyyy", { locale: es })}${notaAnterior ? `. ${notaAnterior}` : ""}`;
      
      const { error } = await supabase
        .from("ordenes_compra_entregas")
        .update({ 
          fecha_programada: hoy,
          notas: nuevaNota
        })
        .eq("id", entrega.id);
      
      if (error) throw error;
      
      toast({
        title: "✅ Entrega reprogramada",
        description: `La entrega ahora aparece en la lista principal para registrar llegada.`
      });
      
      // Cerrar panel y recargar lista principal
      setIsOpen(false);
      onEntregaReprogramada();
    } catch (error) {
      console.error("Error reprogramando entrega:", error);
      toast({
        title: "Error",
        description: "No se pudo reprogramar la entrega",
        variant: "destructive"
      });
    } finally {
      setForzandoId(null);
    }
  };

  // Filtrar entregas por búsqueda
  const entregasFiltradas = entregasFuturas.filter(entrega => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const proveedorNombre = entrega.orden_compra?.proveedor_id 
      ? (entrega.orden_compra?.proveedor?.nombre || "")
      : (entrega.orden_compra?.proveedor_nombre_manual || "");
    
    return (
      proveedorNombre.toLowerCase().includes(query) ||
      entrega.orden_compra?.folio?.toLowerCase().includes(query)
    );
  });


  return (
    <div className="border-t border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors touch-manipulation">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-left">
              <span className="font-medium text-base">¿Llegó una entrega antes de tiempo?</span>
              <p className="text-sm text-muted-foreground">
                Buscar y registrar llegadas anticipadas
              </p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Campo de búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por folio o proveedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            {/* Lista de entregas futuras */}
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Cargando entregas...
              </div>
            ) : entregasFiltradas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No hay entregas programadas para los próximos 7 días laborales</p>
                {searchQuery && (
                  <p className="text-sm mt-1">Intenta con otra búsqueda</p>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {entregasFiltradas.map(entrega => {
                  const proveedorNombre = entrega.orden_compra?.proveedor_id 
                    ? (entrega.orden_compra?.proveedor?.nombre || "Sin proveedor")
                    : (entrega.orden_compra?.proveedor_nombre_manual || "Sin proveedor");
                  
                  
                  const esForzando = forzandoId === entrega.id;

                  const fechaCompleta = format(
                    new Date(entrega.fecha_programada + "T12:00:00"), 
                    "EEEE d 'de' MMMM 'del' yyyy", 
                    { locale: es }
                  );
                  const productos = entrega.orden_compra?.detalles || [];

                  return (
                    <div 
                      key={entrega.id}
                      className="p-4 border rounded-lg bg-muted/30 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg truncate">
                            {proveedorNombre}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>{entrega.orden_compra?.folio}</span>
                            <span>•</span>
                            <span>Entrega #{entrega.numero_entrega}</span>
                            <span>•</span>
                            <span className="font-medium">{entrega.cantidad_bultos} bultos</span>
                          </div>
                        </div>
                      </div>

                      {/* Productos de la OC */}
                      {productos.length > 0 && (
                        <div className="bg-background/60 rounded-md border p-2 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Productos:</p>
                          {productos.map((prod, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="truncate flex-1 min-w-0">
                                <span className="text-muted-foreground text-xs mr-1">{prod.producto?.codigo}</span>
                                {prod.producto?.nombre || "Producto"}
                              </span>
                              <span className="font-medium text-right shrink-0 ml-2">
                                {prod.cantidad_ordenada} {prod.producto?.unidad || "u"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Fecha completa y botón */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span className="text-sm font-medium">
                            Esta entrega está contemplada para el {fechaCompleta}
                          </span>
                        </div>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="lg"
                                className="gap-2 h-11 touch-manipulation w-full"
                                onClick={() => setConfirmandoEntrega(entrega)}
                                disabled={esForzando}
                              >
                                {esForzando ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Truck className="w-4 h-4" />
                                )}
                                {esForzando ? "Reprogramando..." : "Llegó antes, registrar"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Reprograma la entrega a hoy y permite registrar la llegada</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Nota explicativa */}
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <strong>Nota:</strong> Al registrar una llegada anticipada, la fecha programada 
              se actualizará a hoy y se guardará una nota con la fecha original.
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Diálogo de confirmación */}
      <AlertDialog open={!!confirmandoEntrega} onOpenChange={(open) => !open && setConfirmandoEntrega(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Confirmar llegada anticipada
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Esta entrega de{" "}
                  <strong>
                    {confirmandoEntrega?.orden_compra?.proveedor_id
                      ? confirmandoEntrega?.orden_compra?.proveedor?.nombre
                      : confirmandoEntrega?.orden_compra?.proveedor_nombre_manual || "Proveedor"}
                  </strong>{" "}
                  estaba programada para el{" "}
                  <strong>
                    {confirmandoEntrega?.fecha_programada
                      ? format(new Date(confirmandoEntrega.fecha_programada + "T12:00:00"), "dd 'de' MMMM", { locale: es })
                      : "fecha desconocida"}
                  </strong>.
                </p>
                <p>Al confirmar:</p>
                <ul className="list-disc ml-4 space-y-1 text-sm">
                  <li>La fecha se actualizará a hoy</li>
                  <li>Se guardará una nota con la fecha original</li>
                  <li>Aparecerá en la lista principal para registrar llegada</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (confirmandoEntrega) {
                  handleForzarLlegadaAnticipada(confirmandoEntrega);
                }
                setConfirmandoEntrega(null);
              }}
            >
              Sí, llegó antes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
