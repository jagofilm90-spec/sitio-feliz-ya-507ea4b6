import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  CheckCircle, 
  Clock, 
  Truck, 
  XCircle, 
  AlertTriangle,
  Package,
  Loader2,
  FileText
} from "lucide-react";

interface EntregasDetallePopoverProps {
  ordenId: string;
  entregasResumen: {
    total: number;
    pendientes: number;
    enProceso: number;
    completadas: number;
    rechazadas: number;
  } | undefined;
}

interface Entrega {
  id: string;
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string | null;
  status: string;
  llegada_registrada_en: string | null;
  recepcion_finalizada_en: string | null;
  motivo_rechazo: string | null;
  comprobante_recepcion_url: string | null;
}

interface Devolucion {
  id: string;
  orden_compra_entrega_id: string | null;
  cantidad_devuelta: number;
  motivo: string;
  status: string;
  productos: { nombre: string } | null;
}

// Helper para parsear fechas localmente
const parseDateLocal = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const EntregasDetallePopover = ({ ordenId, entregasResumen }: EntregasDetallePopoverProps) => {
  // Fetch entregas for this order
  const { data: entregas = [], isLoading: loadingEntregas } = useQuery({
    queryKey: ["entregas-detalle-orden", ordenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select("*")
        .eq("orden_compra_id", ordenId)
        .order("numero_entrega");
      
      if (error) throw error;
      return data as Entrega[];
    },
    enabled: !!ordenId,
  });

  // Fetch devoluciones for this order
  const { data: devoluciones = [] } = useQuery({
    queryKey: ["devoluciones-orden", ordenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devoluciones_proveedor")
        .select("*, productos(nombre)")
        .eq("orden_compra_id", ordenId);
      
      if (error) throw error;
      return data as Devolucion[];
    },
    enabled: !!ordenId,
  });

  if (!entregasResumen || entregasResumen.total === 0) {
    return null;
  }

  const getStatusIcon = (entrega: Entrega) => {
    if (entrega.status === "rechazada") {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (entrega.status === "recibida" || entrega.recepcion_finalizada_en) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (entrega.llegada_registrada_en) {
      return <Package className="h-4 w-4 text-blue-600" />;
    }
    if (entrega.fecha_programada) {
      return <Clock className="h-4 w-4 text-amber-500" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusLabel = (entrega: Entrega) => {
    if (entrega.status === "rechazada") return "Rechazada";
    if (entrega.status === "recibida" || entrega.recepcion_finalizada_en) return "Recibida";
    if (entrega.llegada_registrada_en) return "En proceso";
    if (entrega.fecha_programada) return "Programada";
    return "Pendiente fecha";
  };

  const getStatusColor = (entrega: Entrega) => {
    if (entrega.status === "rechazada") return "text-destructive";
    if (entrega.status === "recibida" || entrega.recepcion_finalizada_en) return "text-green-600";
    if (entrega.llegada_registrada_en) return "text-blue-600";
    if (entrega.fecha_programada) return "text-amber-600";
    return "text-muted-foreground";
  };

  // Compute summary badge
  const { completadas, total, rechazadas, pendientes } = entregasResumen;
  let summaryVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let summaryText = `${completadas}/${total}`;
  
  if (rechazadas > 0) {
    summaryVariant = "destructive";
  } else if (completadas === total) {
    summaryVariant = "default";
  }

  const devolucionesPendientes = devoluciones.filter(d => d.status === "pendiente");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-auto p-1 text-xs gap-1.5"
        >
          <Truck className="h-3.5 w-3.5" />
          <Badge variant={summaryVariant} className="text-xs px-1.5 py-0">
            {summaryText}
          </Badge>
          {devolucionesPendientes.length > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0 animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {devolucionesPendientes.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Estado de Entregas</h4>
            <div className="flex gap-1">
              {completadas > 0 && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                  {completadas} recibidas
                </Badge>
              )}
              {rechazadas > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {rechazadas} rechazadas
                </Badge>
              )}
            </div>
          </div>

          {loadingEntregas ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {entregas.map((entrega) => {
                const devolucionesEntrega = devoluciones.filter(
                  d => d.orden_compra_entrega_id === entrega.id
                );
                
                return (
                  <div 
                    key={entrega.id}
                    className="p-2 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(entrega)}
                        <span className="font-medium text-sm">
                          Entrega #{entrega.numero_entrega}
                        </span>
                      </div>
                      <span className={`text-xs ${getStatusColor(entrega)}`}>
                        {getStatusLabel(entrega)}
                      </span>
                    </div>
                    
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-3">
                      <span>{entrega.cantidad_bultos} bultos</span>
                      {entrega.fecha_programada && (
                        <span>
                          {format(parseDateLocal(entrega.fecha_programada), "dd MMM yyyy", { locale: es })}
                        </span>
                      )}
                    </div>

                    {entrega.motivo_rechazo && (
                      <p className="mt-1 text-xs text-destructive">
                        {entrega.motivo_rechazo}
                      </p>
                    )}

                    {entrega.status === "recibida" && entrega.comprobante_recepcion_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs gap-1 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(entrega.comprobante_recepcion_url!, "_blank");
                        }}
                      >
                        <FileText className="h-3 w-3" />
                        Ver comprobante PDF
                      </Button>
                    )}

                    {devolucionesEntrega.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed">
                        {devolucionesEntrega.map((dev) => (
                          <div 
                            key={dev.id}
                            className={`text-xs p-1.5 rounded ${
                              dev.status === "pendiente" 
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" 
                                : "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="font-medium">{dev.cantidad_devuelta} uds devueltas</span>
                              {dev.status === "resuelta" && (
                                <CheckCircle className="h-3 w-3 ml-auto" />
                              )}
                            </div>
                            <p className="truncate" title={dev.motivo}>{dev.motivo}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {devolucionesPendientes.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {devolucionesPendientes.length} devolución(es) pendiente(s) de resolución
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EntregasDetallePopover;
