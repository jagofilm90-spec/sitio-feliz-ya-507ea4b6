import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Package, Calendar, FileText, Printer } from "lucide-react";
import { getDisplayName } from "@/lib/productUtils";
import { CREDITO_LABELS } from "@/lib/creditoUtils";
import { ImprimirPedidoDialog } from "@/components/pedidos/ImprimirPedidoDialog";
import { DatosPedidoPrint } from "@/components/pedidos/PedidoPrintTemplate";
import { CargaEvidenciasVendedorSection } from "./CargaEvidenciasVendedorSection";
import { ComprobanteCargaPDFDialog } from "./ComprobanteCargaPDFDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
}

interface PedidoDetalle {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto: {
    nombre: string;
    marca: string | null;
    especificaciones: string | null;
    contenido_empaque: string | null;
    unidad: string;
    peso_kg: number | null;
    precio_por_kilo: boolean;
    aplica_iva: boolean;
    aplica_ieps: boolean;
  };
}

interface Pedido {
  id: string;
  folio: string;
  fecha_pedido: string;
  subtotal: number;
  impuestos: number;
  total: number;
  status: string;
  notas: string | null;
  termino_credito: string;
  cliente: {
    nombre: string;
    razon_social?: string | null;
    rfc?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    nombre_vialidad?: string | null;
    numero_exterior?: string | null;
    numero_interior?: string | null;
    nombre_colonia?: string | null;
    nombre_municipio?: string | null;
    codigo_postal?: string | null;
    nombre_entidad_federativa?: string | null;
  };
  sucursal?: {
    nombre: string;
    direccion?: string | null;
  } | null;
  vendedor?: {
    full_name: string;
  } | null;
  detalles: PedidoDetalle[];
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  por_autorizar: { label: "Por autorizar", variant: "secondary" },
  pendiente: { label: "Pendiente", variant: "secondary" },
  autorizado: { label: "Autorizado", variant: "default" },
  en_ruta: { label: "En ruta", variant: "default" },
  entregado: { label: "Entregado", variant: "outline" },
  facturado: { label: "Facturado", variant: "outline" },
  cancelado: { label: "Cancelado", variant: "destructive" }
};

export function PedidoDetalleVendedorDialog({ open, onOpenChange, pedidoId }: Props) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrint, setShowPrint] = useState(false);
  const [showComprobante, setShowComprobante] = useState(false);
  const [comprobanteRutaId, setComprobanteRutaId] = useState<string>("");

  useEffect(() => {
    if (open && pedidoId) {
      fetchPedido();

      // Realtime: refresh when this pedido or its details change
      const channel = supabase
        .channel(`pedido-detalle-rt-${pedidoId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoId}` }, () => fetchPedido())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_detalles', filter: `pedido_id=eq.${pedidoId}` }, () => fetchPedido())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [open, pedidoId]);

  const fetchPedido = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id, folio, fecha_pedido, subtotal, impuestos, total, status, notas, termino_credito,
          cliente:clientes(nombre, razon_social, rfc, direccion, telefono, nombre_vialidad, numero_exterior, numero_interior, nombre_colonia, nombre_municipio, codigo_postal, nombre_entidad_federativa),
          sucursal:cliente_sucursales(nombre, direccion),
          vendedor:profiles!pedidos_vendedor_id_fkey(full_name),
          detalles:pedidos_detalles(
            id, cantidad, precio_unitario, subtotal,
            producto:productos(nombre, marca, especificaciones, contenido_empaque, unidad, peso_kg, precio_por_kilo, aplica_iva, aplica_ieps)
          )
        `)
        .eq("id", pedidoId)
        .single();

      if (error) throw error;

      setPedido({
        ...data,
        cliente: data.cliente || { nombre: "Sin cliente" },
        vendedor: data.vendedor as any,
        detalles: (data.detalles || []).map((d: any) => ({
          ...d,
          producto: d.producto || { nombre: "Producto", marca: null, especificaciones: null, contenido_empaque: null, unidad: "", peso_kg: null, precio_por_kilo: false, aplica_iva: true, aplica_ieps: false }
        }))
      } as Pedido);
    } catch (error) {
      console.error("Error fetching pedido:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatearDireccionFiscal = (c: any): string => {
    if (!c) return "";
    const partes = [];
    if (c.nombre_vialidad) {
      let linea = c.nombre_vialidad;
      if (c.numero_exterior) linea += ` No. ${c.numero_exterior}`;
      if (c.numero_interior) linea += ` Int. ${c.numero_interior}`;
      partes.push(linea);
    }
    if (c.nombre_colonia) partes.push(`Col. ${c.nombre_colonia}`);
    if (c.nombre_municipio || c.codigo_postal) partes.push(`${c.nombre_municipio || ""} C.P. ${c.codigo_postal || ""}`);
    if (c.nombre_entidad_federativa) partes.push(c.nombre_entidad_federativa);
    return partes.join(", ") || c.direccion || "";
  };

  const buildPrintData = (): DatosPedidoPrint | null => {
    if (!pedido) return null;

    // Calcular impuestos desglosados
    let subtotalConIvaYIeps = 0;
    let subtotalConIva = 0;
    let subtotalSinImpuestos = 0;

    pedido.detalles.forEach((d) => {
      if (d.producto.aplica_iva && d.producto.aplica_ieps) subtotalConIvaYIeps += d.subtotal;
      else if (d.producto.aplica_iva) subtotalConIva += d.subtotal;
      else subtotalSinImpuestos += d.subtotal;
    });

    const baseConIvaYIeps = subtotalConIvaYIeps / 1.24;
    const iepsCalc = baseConIvaYIeps * 0.08;
    const ivaDeIeps = baseConIvaYIeps * 0.16;
    const baseConIva = subtotalConIva / 1.16;
    const ivaSolo = subtotalConIva - baseConIva;
    const subtotalReal = baseConIvaYIeps + baseConIva + subtotalSinImpuestos;
    const ivaTotal = ivaSolo + ivaDeIeps;

    let pesoTotalKg = 0;

    const productos = pedido.detalles.map((d) => {
      const prod = d.producto;
      const pesoKg = prod.peso_kg || 0;
      const pesoTotal = pesoKg > 0 ? d.cantidad * pesoKg : null;

      if (pesoTotal) pesoTotalKg += pesoTotal;

      // Importe: si precio_por_kilo → pesoTotal × precioUnitario, sino → cantidad × precioUnitario
      const importe = prod.precio_por_kilo && pesoTotal
        ? pesoTotal * d.precio_unitario
        : d.subtotal; // subtotal ya tiene cantidad × precio

      return {
        cantidad: d.cantidad,
        descripcion: getDisplayName(prod),
        pesoTotal,
        precioUnitario: d.precio_unitario,
        importe,
        precioPorKilo: prod.precio_por_kilo,
      };
    });

    return {
      pedidoId: pedido.id,
      folio: pedido.folio,
      fecha: pedido.fecha_pedido,
      vendedor: pedido.vendedor?.full_name || "Sin asignar",
      terminoCredito: CREDITO_LABELS[pedido.termino_credito] || pedido.termino_credito,
      cliente: {
        nombre: pedido.cliente.nombre,
        razonSocial: pedido.cliente.razon_social || undefined,
        rfc: pedido.cliente.rfc || undefined,
        direccionFiscal: formatearDireccionFiscal(pedido.cliente),
        telefono: pedido.cliente.telefono || undefined,
      },
      direccionEntrega: pedido.cliente.direccion || undefined,
      sucursal: pedido.sucursal ? {
        nombre: pedido.sucursal.nombre,
        direccion: pedido.sucursal.direccion || undefined,
      } : undefined,
      productos,
      subtotal: subtotalReal,
      iva: ivaTotal,
      ieps: iepsCalc,
      total: pedido.total,
      pesoTotalKg,
      notas: pedido.notas || undefined,
    };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalle del Pedido
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : pedido ? (
            <div className="space-y-4">
              {/* Header info */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-bold">{pedido.folio}</span>
                    <Badge variant={statusLabels[pedido.status]?.variant || "secondary"}>
                      {statusLabels[pedido.status]?.label || pedido.status}
                    </Badge>
                  </div>
                  <p className="text-base text-muted-foreground">{pedido.cliente.nombre}</p>
                  {pedido.sucursal && (
                    <p className="text-sm text-muted-foreground">→ {pedido.sucursal.nombre}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatCurrency(pedido.total)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(pedido.fecha_pedido), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
              </div>

              {/* Products */}
              <div>
                <h4 className="font-medium mb-2">Productos ({pedido.detalles.length})</h4>
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-3 space-y-3">
                    {pedido.detalles.map((detalle) => (
                      <div key={detalle.id} className="flex justify-between items-start text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{getDisplayName(detalle.producto)}</p>
                          <p className="text-xs text-muted-foreground">
                            {detalle.cantidad} × {formatCurrency(detalle.precio_unitario)}
                            {detalle.producto.precio_por_kilo && "/kg"}
                          </p>
                        </div>
                        <p className="font-medium">{formatCurrency(detalle.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(pedido.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Impuestos</span>
                  <span>{formatCurrency(pedido.impuestos)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(pedido.total)}</span>
                </div>
              </div>

              {/* Notes */}
              {pedido.notas && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <FileText className="h-4 w-4" />
                    Notas
                  </div>
                  <p className="text-sm text-muted-foreground">{pedido.notas}</p>
                </div>
              )}

              {/* Carga evidencias - only for en_ruta, entregado, facturado */}
              {["en_ruta", "entregado", "facturado", "en_carga", "cargada"].includes(pedido.status) && (
                <CargaEvidenciasVendedorSection
                  pedidoId={pedido.id}
                  onDescargarComprobante={(rutaId) => {
                    setComprobanteRutaId(rutaId);
                    setShowComprobante(true);
                  }}
                />
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setShowPrint(true)}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir / PDF
                </Button>
                <Button className="flex-1" onClick={() => onOpenChange(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No se encontró el pedido
            </p>
          )}
        </DialogContent>
      </Dialog>

      <ImprimirPedidoDialog
        open={showPrint}
        onOpenChange={setShowPrint}
        datos={buildPrintData()}
      />

      {comprobanteRutaId && pedido && (
        <ComprobanteCargaPDFDialog
          open={showComprobante}
          onOpenChange={setShowComprobante}
          rutaId={comprobanteRutaId}
          pedidoId={pedido.id}
        />
      )}
    </>
  );
}
