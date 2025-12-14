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

  return {
    notifyRouteAssignment,
    notifyRouteChange,
    notifyRouteCancellation,
  };
};
