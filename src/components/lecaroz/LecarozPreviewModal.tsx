import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { ParseResult, ParsedSucursal } from "@/lib/lecarozParser";

const GRUPO_LECAROZ_ID = "aaaaaaaa-1eca-4047-aaaa-aaaaaaaaaaaa";

interface MatchedProducto {
  codigo_lecaroz: number;
  nombre: string;
  cantidad: number;
  presentacion: string;
  cantidad_kilos: number;
  // Match results
  status: "ok" | "warning" | "error";
  cotizacion_linea_id?: string;
  nombre_almasa?: string;
  sku_almasa?: string;
  precio?: number;
  matchNote?: string;
}

interface MatchedSucursal {
  numero: number;
  nombre: string;
  sucursal_id?: string;
  codigo_sucursal?: string;
  productos: MatchedProducto[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  parseResult: ParseResult;
  emailLogId: string;
  tandas: { id: string; numero: number; nombre: string | null }[];
  mes: number;
  anio: number;
  onProcessed: () => void;
}

const LecarozPreviewModal = ({ open, onClose, parseResult, emailLogId, tandas, mes, anio, onProcessed }: Props) => {
  const [matched, setMatched] = useState<MatchedSucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [targetTanda, setTargetTanda] = useState<string>(tandas[0]?.id || "");

  useEffect(() => {
    if (!open) return;
    matchData();
  }, [open]);

  const matchData = async () => {
    setLoading(true);

    // 1. Get vigente cotización for this type/month
    const { data: cotData } = await supabase
      .from("cotizaciones_lecaroz")
      .select("id")
      .eq("cliente_grupo_id", GRUPO_LECAROZ_ID)
      .eq("mes", mes)
      .eq("anio", anio)
      .eq("tipo", parseResult.tipo_cotizacion)
      .eq("estado", "vigente")
      .limit(1);

    let cotizacionId = cotData?.[0]?.id;
    let cotLineas: any[] = [];

    if (cotizacionId) {
      const { data } = await supabase
        .from("cotizacion_lecaroz_lineas")
        .select("*")
        .eq("cotizacion_id", cotizacionId);
      cotLineas = data || [];
    }

    // 2. Get sucursales of Lecaroz group
    const { data: sucursalesData } = await supabase
      .from("cliente_sucursales")
      .select("id, codigo_sucursal, nombre, cliente_id")
      .eq("activo", true);

    // Filter sucursales belonging to Lecaroz group
    const { data: clientesLecaroz } = await supabase
      .from("clientes")
      .select("id")
      .or(`id.eq.${GRUPO_LECAROZ_ID},grupo_cliente_id.eq.${GRUPO_LECAROZ_ID}`);

    const lecarozClientIds = new Set((clientesLecaroz || []).map(c => c.id));
    const lecarozSucursales = (sucursalesData || []).filter(s => lecarozClientIds.has(s.cliente_id));

    // 3. Match each parsed sucursal
    const result: MatchedSucursal[] = parseResult.sucursales.map(parsedSuc => {
      // Match sucursal by codigo_sucursal = numero
      const dbSuc = lecarozSucursales.find(s => s.codigo_sucursal === String(parsedSuc.numero));

      const matchedProds: MatchedProducto[] = parsedSuc.productos.map(prod => {
        // Match product in cotizacion by codigo_lecaroz
        const cotLinea = cotLineas.find(l => l.codigo_lecaroz === prod.codigo_lecaroz);

        if (!cotLinea) {
          return {
            ...prod,
            status: "error" as const,
            matchNote: "Producto no encontrado en cotización vigente",
          };
        }

        if (cotLinea.precio === null || cotLinea.precio_pendiente) {
          return {
            ...prod,
            status: "warning" as const,
            cotizacion_linea_id: cotLinea.id,
            nombre_almasa: cotLinea.nombre_almasa,
            sku_almasa: cotLinea.sku_almasa,
            matchNote: "Precio pendiente en cotización",
          };
        }

        return {
          ...prod,
          status: "ok" as const,
          cotizacion_linea_id: cotLinea.id,
          nombre_almasa: cotLinea.nombre_almasa,
          sku_almasa: cotLinea.sku_almasa,
          precio: cotLinea.precio,
        };
      });

      return {
        numero: parsedSuc.numero,
        nombre: parsedSuc.nombre,
        sucursal_id: dbSuc?.id,
        codigo_sucursal: dbSuc?.codigo_sucursal,
        productos: matchedProds,
      };
    });

    setMatched(result);
    setLoading(false);
  };

  const countsByStatus = {
    ok: matched.flatMap(s => s.productos).filter(p => p.status === "ok").length,
    warning: matched.flatMap(s => s.productos).filter(p => p.status === "warning").length,
    error: matched.flatMap(s => s.productos).filter(p => p.status === "error").length,
  };

  const totalEstimado = matched
    .flatMap(s => s.productos)
    .filter(p => p.precio)
    .reduce((sum, p) => sum + (p.precio! * p.cantidad), 0);

  const handleProcess = async () => {
    if (!targetTanda) {
      toast.error("Selecciona una tanda destino");
      return;
    }

    setProcessing(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Get vigente cotización ID
      const { data: cotData } = await supabase
        .from("cotizaciones_lecaroz")
        .select("id")
        .eq("cliente_grupo_id", GRUPO_LECAROZ_ID)
        .eq("mes", mes).eq("anio", anio)
        .eq("tipo", parseResult.tipo_cotizacion)
        .eq("estado", "vigente")
        .limit(1);
      const cotizacionId = cotData?.[0]?.id;

      let pedidosCreados = 0;
      let pedidosActualizados = 0;

      for (const suc of matched) {
        if (!suc.sucursal_id) continue; // Skip unmatched sucursales

        // Get the cliente_id for this sucursal
        const { data: sucData } = await supabase
          .from("cliente_sucursales")
          .select("cliente_id")
          .eq("id", suc.sucursal_id)
          .single();

        if (!sucData) continue;

        // Check if pedido already exists for this sucursal in the tanda
        const { data: existingPedidos } = await supabase
          .from("pedidos")
          .select("id")
          .eq("tanda_id", targetTanda)
          .eq("sucursal_id", suc.sucursal_id)
          .limit(1);

        let pedidoId: string;

        if (existingPedidos && existingPedidos.length > 0) {
          pedidoId = existingPedidos[0].id;
          pedidosActualizados++;
        } else {
          // Generate folio for new pedido
          const now = new Date();
          const folio = `LEC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}-${suc.numero}`;

          // Create new pedido
          const { data: newPedido, error: pedErr } = await supabase
            .from("pedidos")
            .insert({
              folio,
              cliente_id: sucData.cliente_id,
              vendedor_id: user?.id || "",
              sucursal_id: suc.sucursal_id,
              status: "borrador" as const,
              tanda_id: targetTanda,
              email_origen_id: emailLogId,
              cotizacion_aplicada_id: cotizacionId || null,
              fecha_pedido: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (pedErr || !newPedido) {
            console.error("Error creating pedido for", suc.nombre, pedErr);
            continue;
          }
          pedidoId = newPedido.id;
          pedidosCreados++;
        }

        // Add product lines
        for (const prod of suc.productos) {
          if (!prod.sku_almasa) continue;

          // Find the producto in ALMASA
          const { data: prodData } = await supabase
            .from("productos")
            .select("id, precio_venta")
            .eq("codigo", prod.sku_almasa)
            .limit(1);

          const productoId = prodData?.[0]?.id;
          if (!productoId) continue;

          const precioUnit = prod.precio || prodData?.[0]?.precio_venta || 0;

          await supabase.from("pedidos_detalles").insert({
            pedido_id: pedidoId,
            producto_id: productoId,
            cantidad: prod.cantidad,
            precio_unitario: precioUnit,
            subtotal: precioUnit * prod.cantidad,
          });
        }
      }

      // Update email log
      await supabase.from("email_log_lecaroz").update({
        estado: "procesado",
        tanda_id: targetTanda,
        procesado_en: new Date().toISOString(),
        procesado_por: user?.id,
      }).eq("id", emailLogId);

      // Update tanda totals
      const { data: tandaPedidos } = await supabase
        .from("pedidos")
        .select("id, total")
        .eq("tanda_id", targetTanda);

      await supabase.from("tandas_lecaroz").update({
        total_pedidos: tandaPedidos?.length || 0,
        total_monto: tandaPedidos?.reduce((s, p) => s + (p.total || 0), 0) || 0,
      }).eq("id", targetTanda);

      toast.success(`✅ ${pedidosCreados} pedidos creados, ${pedidosActualizados} actualizados en tanda`);
      onProcessed();
    } catch (err) {
      console.error(err);
      toast.error("Error procesando pedidos");
    }

    setProcessing(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "ok": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview — {parseResult.tipo_cotizacion.replace(/_/g, " ").toUpperCase()}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4 flex-wrap">
              <Badge className="bg-green-600 text-white px-3 py-1">
                <CheckCircle className="h-4 w-4 mr-1" /> {countsByStatus.ok} OK
              </Badge>
              <Badge className="bg-yellow-500 text-black px-3 py-1">
                <AlertTriangle className="h-4 w-4 mr-1" /> {countsByStatus.warning} Warnings
              </Badge>
              <Badge className="bg-red-600 text-white px-3 py-1">
                <XCircle className="h-4 w-4 mr-1" /> {countsByStatus.error} Errores
              </Badge>
              <span className="text-sm text-muted-foreground ml-auto">
                Total estimado: <strong>${totalEstimado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>

            {/* Sucursales */}
            {matched.map(suc => (
              <div key={suc.numero} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">#{suc.numero}</span>
                  <span className="font-bold">{suc.nombre}</span>
                  {suc.sucursal_id ? (
                    <Badge variant="outline" className="text-green-600 border-green-600 text-xs">Sucursal encontrada</Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-500 border-red-500 text-xs">Sucursal no encontrada</Badge>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="text-left p-1">Estado</th>
                      <th className="text-left p-1">Código</th>
                      <th className="text-left p-1">Producto</th>
                      <th className="text-right p-1">Cant</th>
                      <th className="text-left p-1">Presentación</th>
                      <th className="text-right p-1">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suc.productos.map((prod, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-1">{statusIcon(prod.status)}</td>
                        <td className="p-1 font-mono text-xs">{prod.codigo_lecaroz}</td>
                        <td className="p-1">
                          <div>{prod.nombre}</div>
                          {prod.nombre_almasa && (
                            <div className="text-xs text-muted-foreground">→ {prod.nombre_almasa}</div>
                          )}
                          {prod.matchNote && (
                            <div className="text-xs text-amber-600">{prod.matchNote}</div>
                          )}
                        </td>
                        <td className="p-1 text-right">{prod.cantidad}</td>
                        <td className="p-1 text-xs">{prod.presentacion}</td>
                        <td className="p-1 text-right">
                          {prod.precio ? `$${prod.precio.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={targetTanda} onValueChange={setTargetTanda}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Seleccionar tanda destino" />
              </SelectTrigger>
              <SelectContent>
                {tandas.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    Tanda {t.numero} {t.nombre ? `— ${t.nombre}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleProcess}
            disabled={processing || !targetTanda}
            className="bg-[#C41E3A] hover:bg-[#a01830]"
          >
            {processing ? "Procesando..." : `Procesar a Tanda`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LecarozPreviewModal;
