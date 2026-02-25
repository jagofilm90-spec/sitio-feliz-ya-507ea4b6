import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

interface ProximasEntregasTabProps {
  onEntregaReprogramada: () => void;
}

export const ProximasEntregasTab = ({ onEntregaReprogramada }: ProximasEntregasTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [entregasFuturas, setEntregasFuturas] = useState<EntregaFutura[]>([]);
  const [loading, setLoading] = useState(true);
  const [forzandoId, setForzandoId] = useState<string | null>(null);
  const [confirmandoEntrega, setConfirmandoEntrega] = useState<EntregaFutura | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEntregasFuturas();
  }, []);

  const loadEntregasFuturas = async () => {
    setLoading(true);
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      // Avanzar 7 días laborales (lunes a sábado, excluyendo domingo)
      let diasLaboralesContados = 0;
      const fechaLimite = new Date(hoy);
      while (diasLaboralesContados < 7) {
        fechaLimite.setDate(fechaLimite.getDate() + 1);
        if (fechaLimite.getDay() !== 0) {
          diasLaboralesContados++;
        }
      }

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
        .gt("fecha_programada", hoy.toISOString().split('T')[0])
        .lte("fecha_programada", fechaLimite.toISOString().split('T')[0])
        .order("fecha_programada", { ascending: true });

      if (error) throw error;
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
        description: `La entrega ahora aparece en "Hoy" para registrar llegada.`
      });
      
      // Remover de la lista local y notificar al padre
      setEntregasFuturas(prev => prev.filter(e => e.id !== entrega.id));
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

  // Agrupar por fecha
  const entregasPorFecha = entregasFiltradas.reduce<Record<string, EntregaFutura[]>>((acc, entrega) => {
    const fecha = entrega.fecha_programada;
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(entrega);
    return acc;
  }, {});

  const fechasOrdenadas = Object.keys(entregasPorFecha).sort();

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por folio o proveedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Cargando próximas entregas...
        </div>
      ) : fechasOrdenadas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground px-4">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No hay entregas programadas</p>
          <p className="text-sm mt-1">Para los próximos 7 días laborales</p>
          {searchQuery && (
            <p className="text-sm mt-2">Intenta con otra búsqueda</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-left">
                <th className="px-3 py-2 font-medium text-muted-foreground">Fecha</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Proveedor</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Folio</th>
                <th className="px-3 py-2 font-medium text-muted-foreground text-center">Ent.</th>
                <th className="px-3 py-2 font-medium text-muted-foreground text-center">Bultos</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Productos</th>
                <th className="px-3 py-2 font-medium text-muted-foreground text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {fechasOrdenadas.map(fecha => {
                const entregas = entregasPorFecha[fecha];
                const fechaDate = new Date(fecha + "T12:00:00");
                const hoy = new Date();
                hoy.setHours(12, 0, 0, 0);
                const manana = new Date(hoy);
                manana.setDate(manana.getDate() + 1);
                const esMañana = fechaDate.toDateString() === manana.toDateString();
                const fechaCorta = format(fechaDate, "EEE d MMM", { locale: es });

                return entregas.map((entrega, idx) => {
                  const proveedorNombre = entrega.orden_compra?.proveedor_id 
                    ? (entrega.orden_compra?.proveedor?.nombre || "Sin proveedor")
                    : (entrega.orden_compra?.proveedor_nombre_manual || "Sin proveedor");
                  const esForzando = forzandoId === entrega.id;

                  return (
                    <tr 
                      key={entrega.id} 
                      className={`border-b transition-colors hover:bg-muted/30 ${esMañana ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}`}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {idx === 0 ? (
                          <span className={`capitalize font-medium ${esMañana ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                            {esMañana ? '🔶 Mañana' : fechaCorta}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 font-medium truncate max-w-[200px]">
                        {proveedorNombre}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {entrega.orden_compra?.folio}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        #{entrega.numero_entrega}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium">
                        {entrega.cantidad_bultos}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[250px]">
                        {(() => {
                          const detalles = entrega.orden_compra?.detalles || [];
                          const pendientes = detalles.filter(d => {
                            const ordenada = d.cantidad_ordenada || 0;
                            const recibida = d.cantidad_recibida || 0;
                            return ordenada > recibida;
                          });
                          const items = pendientes.length > 0 ? pendientes : detalles;
                          if (items.length === 0) return <span className="italic">—</span>;
                          if (items.length === 1) {
                            const p = items[0];
                            return <span>{p.producto?.nombre || p.producto?.codigo || "?"}</span>;
                          }
                          return (
                            <span title={items.map(i => i.producto?.nombre).join(", ")}>
                              {items[0].producto?.nombre || items[0].producto?.codigo}
                              <span className="ml-1 text-muted-foreground/70">+{items.length - 1} más</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 h-8 text-xs touch-manipulation"
                          onClick={() => setConfirmandoEntrega(entrega)}
                          disabled={esForzando}
                        >
                          {esForzando ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Truck className="w-3.5 h-3.5" />
                          )}
                          {esForzando ? "..." : "Llegó antes"}
                        </Button>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}

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
                      ? format(new Date(confirmandoEntrega.fecha_programada + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })
                      : "fecha desconocida"}
                  </strong>.
                </p>
                <p>Al confirmar:</p>
                <ul className="list-disc ml-4 space-y-1 text-sm">
                  <li>La fecha se actualizará a hoy</li>
                  <li>Se guardará una nota con la fecha original</li>
                  <li>Aparecerá en la pestaña "Hoy" para registrar llegada</li>
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
