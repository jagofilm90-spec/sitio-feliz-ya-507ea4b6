import { useState, useCallback } from "react";
import { CameraQrScanner } from "@/components/almacen/CameraQrScanner";
import { supabase } from "@/integrations/supabase/client";
import { checkAndCompleteRoute } from "@/services/autoCompleteRoute";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QrCode, Loader2 } from "lucide-react";

interface QRScannerEntregaProps {
  entregaId: string;
  pedidoId: string;
  pedidoFolio: string;
  clienteNombre: string;
  onEntregaConfirmada: () => void;
}

export function QRScannerEntrega({ entregaId, pedidoId, pedidoFolio, clienteNombre, onEntregaConfirmada }: QRScannerEntregaProps) {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleScan = useCallback(async (decodedText: string) => {
    // Parse QR: expected format is "almasa:carga:{pedidoId}"
    const match = decodedText.match(/^almasa:carga:(.+)$/);
    if (!match) {
      toast.error("Código QR no válido", { description: "Este código no corresponde a una hoja de carga" });
      return;
    }

    const qrPedidoId = match[1];
    if (qrPedidoId !== pedidoId) {
      toast.error("QR incorrecto", { description: `Este código corresponde a otro pedido. Se esperaba ${pedidoFolio}` });
      return;
    }

    // QR matches — confirm delivery
    setScanning(false);
    setProcessing(true);

    try {
      const { error } = await supabase
        .from("entregas")
        .update({
          entregado: true,
          status_entrega: "entregado",
          hora_entrega_real: new Date().toISOString(),
          notas: "Entrega confirmada por escaneo QR",
        })
        .eq("id", entregaId);

      if (error) throw error;

      // Send delivery confirmation notifications
      try {
        await supabase.functions.invoke("send-delivery-confirmation", {
          body: { entregaId, pedidoId },
        });
      } catch {
        // Non-blocking
      }

      // Notify client
      try {
        const { data: pedido } = await supabase
          .from("pedidos")
          .select("cliente_id")
          .eq("id", pedidoId)
          .single();

        if (pedido?.cliente_id) {
          const { data: notifResponse } = await supabase.functions.invoke("send-client-notification", {
            body: {
              clienteId: pedido.cliente_id,
              tipo: "entregado",
              data: {
                pedidoFolio,
                horaEntrega: new Date().toISOString(),
                nombreReceptor: "Confirmado por QR",
              },
            },
          });

          // WhatsApp sent automatically by backend via Twilio
          if (notifResponse?.whatsapp?.sent) {
            toast.success("📱 WhatsApp enviado al cliente");
          }
        }
      } catch {
        // Non-blocking
      }

      // Auto-complete route if all deliveries are done
      const routeCompleted = await checkAndCompleteRoute(entregaId);

      toast.success("✅ Entrega confirmada", { description: `${clienteNombre} — ${pedidoFolio}` });
      if (routeCompleted) {
        toast.info("🏁 Ruta completada — todas las entregas fueron registradas");
      }
      onEntregaConfirmada();
    } catch (err: any) {
      toast.error("Error al confirmar entrega", { description: err?.message });
    } finally {
      setProcessing(false);
    }
  }, [entregaId, pedidoId, pedidoFolio, clienteNombre, onEntregaConfirmada]);

  if (processing) {
    return (
      <Button size="sm" disabled className="flex-1">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Confirmando...
      </Button>
    );
  }

  if (scanning) {
    return (
      <div className="w-full">
        <CameraQrScanner
          active={scanning}
          onScan={handleScan}
          onClose={() => setScanning(false)}
        />
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex-1"
      onClick={() => setScanning(true)}
    >
      <QrCode className="h-4 w-4 mr-2" />
      Escanear QR
    </Button>
  );
}
