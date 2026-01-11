import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date 7 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    console.log(`Checking for invoices due on: ${targetDateStr}`);

    // Find unpaid invoices due in 7 days
    const { data: facturas, error: facturasError } = await supabase
      .from("facturas")
      .select(`
        id,
        folio,
        total,
        fecha_vencimiento,
        cliente_id,
        clientes (
          nombre,
          codigo
        )
      `)
      .eq("pagada", false)
      .eq("cancelada", false)
      .eq("fecha_vencimiento", targetDateStr);

    if (facturasError) {
      throw new Error(`Error fetching invoices: ${facturasError.message}`);
    }

    console.log(`Found ${facturas?.length || 0} invoices due in 7 days`);

    if (!facturas || facturas.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No invoices due in 7 days",
          notificationsSent: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for already sent reminders today to avoid duplicates
    const today = new Date().toISOString().split("T")[0];
    const { data: sentToday } = await supabase
      .from("correos_enviados")
      .select("referencia_id")
      .eq("tipo", "notificacion_vencimiento_proximo")
      .gte("fecha_envio", today);

    const alreadySentFolios = new Set(sentToday?.map(s => s.referencia_id) || []);

    // Send notifications for each invoice
    const results = [];
    for (const factura of facturas) {
      // Skip if already notified today
      if (alreadySentFolios.has(factura.folio)) {
        console.log(`Skipping ${factura.folio} - already notified today`);
        continue;
      }

      try {
        const { data: notifResult, error: notifError } = await supabase.functions.invoke(
          "send-client-notification",
          {
            body: {
              clienteId: factura.cliente_id,
              tipo: "vencimiento_proximo",
              data: {
                facturaFolio: factura.folio,
                fechaVencimiento: new Date(factura.fecha_vencimiento).toLocaleDateString("es-MX", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                diasRestantes: 7,
                total: factura.total,
              },
            },
          }
        );

        if (notifError) {
          throw notifError;
        }

        results.push({
          folio: factura.folio,
          cliente: (factura as any).clientes?.nombre,
          success: true,
          emailsSent: notifResult?.emailsSent || 0,
        });

        console.log(`Reminder sent for invoice ${factura.folio}`);
      } catch (error: any) {
        console.error(`Error sending reminder for ${factura.folio}:`, error);
        results.push({
          folio: factura.folio,
          cliente: (factura as any).clientes?.nombre,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalEmailsSent = results.reduce((sum, r) => sum + (r.emailsSent || 0), 0);

    console.log(`Completed: ${successCount}/${results.length} invoices processed, ${totalEmailsSent} emails sent`);

    return new Response(
      JSON.stringify({
        success: true,
        invoicesProcessed: results.length,
        successfulNotifications: successCount,
        totalEmailsSent,
        results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error in check-invoice-expiry-reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
