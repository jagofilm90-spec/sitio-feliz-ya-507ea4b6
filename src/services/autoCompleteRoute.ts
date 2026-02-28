import { supabase } from "@/integrations/supabase/client";

/**
 * Check if all deliveries for a route are completed (entregado, parcial, or rechazado).
 * If so, automatically mark the route as 'completada'.
 */
export async function checkAndCompleteRoute(entregaId: string): Promise<boolean> {
  try {
    // Get the ruta_id for this entrega
    const { data: entrega } = await supabase
      .from("entregas")
      .select("ruta_id")
      .eq("id", entregaId)
      .single();

    if (!entrega?.ruta_id) return false;

    // Check if there are any pending deliveries for this route
    const { data: pendientes, error } = await supabase
      .from("entregas")
      .select("id")
      .eq("ruta_id", entrega.ruta_id)
      .is("status_entrega", null);

    if (error) {
      console.error("Error checking pending deliveries:", error);
      return false;
    }

    // If no pending deliveries remain, auto-complete the route
    if (!pendientes || pendientes.length === 0) {
      const { error: updateError } = await supabase
        .from("rutas")
        .update({
          status: "completada",
          fecha_hora_fin: new Date().toISOString(),
        })
        .eq("id", entrega.ruta_id)
        .eq("status", "en_curso");

      if (updateError) {
        console.error("Error auto-completing route:", updateError);
        return false;
      }

      console.log("Route auto-completed:", entrega.ruta_id);
      return true;
    }

    return false;
  } catch (err) {
    console.error("Error in checkAndCompleteRoute:", err);
    return false;
  }
}
