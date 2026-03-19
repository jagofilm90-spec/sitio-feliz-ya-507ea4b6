import { supabase } from "@/integrations/supabase/client";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

/**
 * Notifica a vendedores sobre un cambio de precio.
 * Crea notificación in-app + push notification.
 */
export async function notificarCambioPrecio({
  productoNombre,
  precioAnterior,
  precioNuevo,
  roles = ["vendedor"],
}: {
  productoNombre: string;
  precioAnterior: number;
  precioNuevo: number;
  roles?: string[];
}) {
  if (precioAnterior === precioNuevo) return;

  const titulo = "💰 Precio actualizado";
  const descripcion = `${productoNombre} cambió de ${formatCurrency(precioAnterior)} a ${formatCurrency(precioNuevo)}`;

  // In-app notification
  try {
    await supabase.from("notificaciones").insert({
      tipo: "precio_actualizado",
      titulo,
      descripcion,
      leida: false,
    });
  } catch (e) {
    console.error("Error creando notificación de precio:", e);
  }

  // Push notification
  try {
    await supabase.functions.invoke("send-push-notification", {
      body: {
        roles,
        title: titulo,
        body: `${productoNombre}: ${formatCurrency(precioAnterior)} → ${formatCurrency(precioNuevo)}`,
      },
    });
  } catch (e) {
    console.error("Error enviando push de precio:", e);
  }
}

/**
 * Notifica a vendedores sobre un producto nuevo.
 */
export async function notificarProductoNuevo({
  productoNombre,
  precioVenta,
  unidad,
  roles = ["vendedor"],
}: {
  productoNombre: string;
  precioVenta: number;
  unidad: string;
  roles?: string[];
}) {
  const titulo = "🆕 Nuevo producto disponible";
  const descripcion = `${productoNombre} — ${formatCurrency(precioVenta)}/${unidad} ya disponible en el catálogo`;

  // In-app notification
  try {
    await supabase.from("notificaciones").insert({
      tipo: "producto_nuevo",
      titulo,
      descripcion,
      leida: false,
    });
  } catch (e) {
    console.error("Error creando notificación de producto nuevo:", e);
  }

  // Push notification
  try {
    await supabase.functions.invoke("send-push-notification", {
      body: {
        roles,
        title: "🆕 Nuevo producto",
        body: `${productoNombre} ya está disponible — ${formatCurrency(precioVenta)}/${unidad}`,
      },
    });
  } catch (e) {
    console.error("Error enviando push de producto nuevo:", e);
  }
}
