import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductoCaducidad {
  id: string;
  producto_nombre: string;
  producto_codigo: string;
  fecha_caducidad: string;
  lote: string | null;
  dias_restantes: number;
}

export const NotificacionesCaducidad = () => {
  const [alertas, setAlertas] = useState<ProductoCaducidad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarAlertasCaducidad();
    
    // Recargar alertas cada 5 minutos
    const interval = setInterval(cargarAlertasCaducidad, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const cargarAlertasCaducidad = async () => {
    try {
      const fechaActual = new Date();
      const fecha30Dias = new Date();
      fecha30Dias.setDate(fecha30Dias.getDate() + 30);

      // Query directa a inventario_lotes con inner join a productos
      // Mismo patrón validado en ReporteCaducidadTab.tsx
      const { data: lotes, error } = await supabase
        .from("inventario_lotes")
        .select(`
          id, producto_id, lote_referencia, cantidad_disponible, fecha_caducidad,
          productos!inner(codigo, nombre, maneja_caducidad)
        `)
        .eq("productos.maneja_caducidad", true)
        .gt("cantidad_disponible", 0)
        .not("fecha_caducidad", "is", null)
        .lte("fecha_caducidad", fecha30Dias.toISOString().split("T")[0])
        .order("fecha_caducidad", { ascending: true });

      if (error) throw error;

      const alertasFormateadas: ProductoCaducidad[] = (lotes || []).map((lote: any) => {
        const fechaCad = new Date(lote.fecha_caducidad);
        const diasRestantes = Math.ceil(
          (fechaCad.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: lote.id,
          producto_nombre: lote.productos?.nombre || "",
          producto_codigo: lote.productos?.codigo || "",
          fecha_caducidad: lote.fecha_caducidad,
          lote: lote.lote_referencia,
          dias_restantes: diasRestantes,
        };
      });

      setAlertas(alertasFormateadas);
    } catch (error) {
      console.error("Error cargando alertas de caducidad:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || alertas.length === 0) return null;

  return (
    <div className="space-y-3">
      {alertas.map((alerta) => (
        <Alert key={alerta.id} variant={alerta.dias_restantes <= 7 ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Producto próximo a caducar
            <Badge variant={alerta.dias_restantes <= 7 ? "destructive" : "secondary"}>
              {alerta.dias_restantes} {alerta.dias_restantes === 1 ? "día" : "días"}
            </Badge>
          </AlertTitle>
          <AlertDescription>
            <strong>{alerta.producto_codigo} - {alerta.producto_nombre}</strong>
            {alerta.lote && ` (Lote: ${alerta.lote})`}
            <br />
            Caduca: {new Date(alerta.fecha_caducidad).toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "long",
              year: "numeric"
            })}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
