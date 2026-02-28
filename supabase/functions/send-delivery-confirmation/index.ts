import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entregaId, pedidoId } = await req.json();
    console.log("Delivery confirmation for entregaId:", entregaId, "pedidoId:", pedidoId);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get pedido info including vendedor
    const { data: pedido } = await supabaseAdmin
      .from("pedidos")
      .select("folio, vendedor_id, cliente:clientes(nombre)")
      .eq("id", pedidoId)
      .single();

    if (!pedido) throw new Error("Pedido not found");

    // Get entrega info including ruta/chofer
    const { data: entrega } = await supabaseAdmin
      .from("entregas")
      .select("ruta_id, hora_entrega_real, ruta:rutas(chofer_id, almacenista_id, chofer:empleados!rutas_chofer_id_fkey(nombre_completo))")
      .eq("id", entregaId)
      .single();

    const ruta = (entrega as any)?.ruta;
    const choferNombre = ruta?.chofer?.nombre_completo || "Chofer";
    const clienteNombre = (pedido.cliente as any)?.nombre || "Cliente";
    const horaEntrega = entrega?.hora_entrega_real 
      ? new Date(entrega.hora_entrega_real).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

    // Collect user IDs to notify: vendedor, almacenista, admins, secretarias
    const userIdsToNotify = new Set<string>();

    // Vendedor
    if (pedido.vendedor_id) userIdsToNotify.add(pedido.vendedor_id);

    // Almacenista
    if (ruta?.almacenista_id) userIdsToNotify.add(ruta.almacenista_id);

    // Admins and secretarias
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "secretaria"]);

    for (const r of adminRoles || []) {
      userIdsToNotify.add(r.user_id);
    }

    console.log("Notifying users:", Array.from(userIdsToNotify));

    // Send push notifications to all
    const notificationTitle = `✅ Entrega confirmada — ${pedido.folio}`;
    const notificationBody = `${clienteNombre} — Entregado por ${choferNombre} a las ${horaEntrega}`;

    for (const userId of userIdsToNotify) {
      // Get device tokens
      const { data: tokens } = await supabaseAdmin
        .from("device_tokens")
        .select("token, platform")
        .eq("user_id", userId);

      if (tokens && tokens.length > 0) {
        try {
          await supabaseAdmin.functions.invoke("send-push-notification", {
            body: {
              tokens: tokens.map(t => t.token),
              title: notificationTitle,
              body: notificationBody,
              data: { type: "delivery_confirmed", pedidoId, entregaId },
            },
          });
        } catch (e) {
          console.error("Push notification error for user", userId, e);
        }
      }
    }

    // Create in-app notification
    await supabaseAdmin.from("notificaciones").insert({
      tipo: "entrega_confirmada",
      titulo: notificationTitle,
      descripcion: notificationBody,
      leida: false,
    });

    return new Response(
      JSON.stringify({ success: true, notified: userIdsToNotify.size }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-delivery-confirmation:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
