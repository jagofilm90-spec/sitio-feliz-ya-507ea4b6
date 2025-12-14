import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const useRouteNotifications = () => {
  const notifyRouteAssignment = async (params: {
    choferId: string;
    ayudanteId?: string | null;
    rutaFolio: string;
    rutaId: string;
    fechaRuta: Date | string;
  }) => {
    const fechaFormateada = format(
      typeof params.fechaRuta === "string" ? new Date(params.fechaRuta) : params.fechaRuta,
      "d 'de' MMMM",
      { locale: es }
    );

    // Notificar al chofer
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: [params.choferId],
          title: "🚚 Nueva ruta asignada",
          body: `Ruta ${params.rutaFolio} para ${fechaFormateada}`,
          data: { type: "ruta_asignada", ruta_id: params.rutaId },
        },
      });
      console.log("Notificación enviada al chofer:", params.choferId);
    } catch (error) {
      console.error("Error enviando notificación al chofer:", error);
    }

    // Notificar al ayudante si existe
    if (params.ayudanteId) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_ids: [params.ayudanteId],
            title: "👥 Asignación como ayudante",
            body: `Te han asignado como ayudante en ruta ${params.rutaFolio}`,
            data: { type: "ruta_asignada", ruta_id: params.rutaId },
          },
        });
        console.log("Notificación enviada al ayudante:", params.ayudanteId);
      } catch (error) {
        console.error("Error enviando notificación al ayudante:", error);
      }
    }
  };

  const notifyRouteChange = async (params: {
    choferId: string;
    rutaFolio: string;
    rutaId: string;
    mensaje: string;
  }) => {
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: [params.choferId],
          title: "⚠️ Cambio en tu ruta",
          body: params.mensaje,
          data: { type: "ruta_modificada", ruta_id: params.rutaId },
        },
      });
      console.log("Notificación de cambio enviada:", params.choferId);
    } catch (error) {
      console.error("Error enviando notificación de cambio:", error);
    }
  };

  const notifyRouteCancellation = async (params: {
    choferId: string;
    rutaFolio: string;
    rutaId: string;
  }) => {
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: [params.choferId],
          title: "❌ Ruta cancelada",
          body: `La ruta ${params.rutaFolio} ha sido cancelada`,
          data: { type: "ruta_cancelada", ruta_id: params.rutaId },
        },
      });
      console.log("Notificación de cancelación enviada:", params.choferId);
    } catch (error) {
      console.error("Error enviando notificación de cancelación:", error);
    }
  };

  const notifyDriverReassignment = async (params: {
    newChoferId: string;
    oldChoferId?: string;
    rutaFolio: string;
    rutaId: string;
  }) => {
    // Notificar al nuevo chofer
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: [params.newChoferId],
          title: "🔄 Te asignaron una ruta",
          body: `Ahora estás asignado a la ruta ${params.rutaFolio}`,
          data: { type: "ruta_asignada", ruta_id: params.rutaId },
        },
      });
      console.log("Notificación enviada al nuevo chofer:", params.newChoferId);
    } catch (error) {
      console.error("Error notificando nuevo chofer:", error);
    }

    // Notificar al chofer anterior que fue removido
    if (params.oldChoferId && params.oldChoferId !== params.newChoferId) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_ids: [params.oldChoferId],
            title: "🔄 Ruta reasignada",
            body: `La ruta ${params.rutaFolio} fue asignada a otro chofer`,
            data: { type: "ruta_modificada", ruta_id: params.rutaId },
          },
        });
        console.log("Notificación enviada al chofer anterior:", params.oldChoferId);
      } catch (error) {
        console.error("Error notificando chofer anterior:", error);
      }
    }
  };

  const notifyDeliveryAdded = async (params: {
    choferId: string;
    rutaFolio: string;
    rutaId: string;
    clienteNombre: string;
  }) => {
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: [params.choferId],
          title: "📦 Nueva entrega agregada",
          body: `Se agregó entrega para ${params.clienteNombre} a tu ruta ${params.rutaFolio}`,
          data: { type: "entrega_agregada", ruta_id: params.rutaId },
        },
      });
      console.log("Notificación de entrega agregada enviada:", params.choferId);
    } catch (error) {
      console.error("Error notificando entrega agregada:", error);
    }
  };

  const notifyDeliveryRemoved = async (params: {
    choferId: string;
    rutaFolio: string;
    rutaId: string;
    clienteNombre: string;
  }) => {
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: [params.choferId],
          title: "🚫 Entrega removida",
          body: `Se removió la entrega de ${params.clienteNombre} de tu ruta ${params.rutaFolio}`,
          data: { type: "entrega_removida", ruta_id: params.rutaId },
        },
      });
      console.log("Notificación de entrega removida enviada:", params.choferId);
    } catch (error) {
      console.error("Error notificando entrega removida:", error);
    }
  };

  const notifyLoadComplete = async (params: {
    choferId: string;
    rutaFolio: string;
    rutaId: string;
    totalProductos: number;
  }) => {
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: [params.choferId],
          title: "✅ Tu vehículo está listo",
          body: `Carga completa para ruta ${params.rutaFolio} (${params.totalProductos} productos)`,
          data: { type: "carga_completa", ruta_id: params.rutaId },
        },
      });
      console.log("Notificación de carga completa enviada:", params.choferId);
    } catch (error) {
      console.error("Error notificando carga completa:", error);
    }
  };

  const notifyUrgentMessage = async (params: {
    choferId: string;
    rutaFolio: string;
    rutaId: string;
    mensaje: string;
    remitente: string;
  }) => {
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: [params.choferId],
          title: `🚨 Mensaje de ${params.remitente}`,
          body: params.mensaje,
          data: { type: "mensaje_urgente", ruta_id: params.rutaId },
        },
      });
      console.log("Mensaje urgente enviado a chofer:", params.choferId);
    } catch (error) {
      console.error("Error enviando mensaje urgente:", error);
    }
  };

  const notifyAlmacenistaAssignment = async (params: {
    almacenistaId: string;
    rutaFolio: string;
    rutaId: string;
    fechaRuta: Date | string;
    horaSalida?: string | null;
    vehiculoNombre?: string;
  }) => {
    const fechaFormateada = format(
      typeof params.fechaRuta === "string" ? new Date(params.fechaRuta) : params.fechaRuta,
      "d 'de' MMMM",
      { locale: es }
    );

    const horaTexto = params.horaSalida 
      ? ` - Sale ${params.horaSalida.slice(0, 5)}`
      : "";

    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: [params.almacenistaId],
          title: "📦 Nueva ruta para cargar",
          body: `Ruta ${params.rutaFolio}${horaTexto} para ${fechaFormateada}${params.vehiculoNombre ? ` (${params.vehiculoNombre})` : ""}`,
          data: { type: "ruta_asignada_almacen", ruta_id: params.rutaId },
        },
      });
      console.log("Notificación enviada al almacenista:", params.almacenistaId);
    } catch (error) {
      console.error("Error enviando notificación al almacenista:", error);
    }
  };

  return {
    notifyRouteAssignment,
    notifyRouteChange,
    notifyRouteCancellation,
    notifyDriverReassignment,
    notifyDeliveryAdded,
    notifyDeliveryRemoved,
    notifyLoadComplete,
    notifyUrgentMessage,
    notifyAlmacenistaAssignment,
  };
};
