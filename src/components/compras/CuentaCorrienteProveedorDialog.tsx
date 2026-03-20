import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, DollarSign, CreditCard, TrendingUp, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedor: {
    id: string;
    nombre: string;
    rfc?: string | null;
    categoria?: string | null;
  } | null;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v);

const getStatusBadge = (status: string) => {
  const config: Record<string, { label: string; variant: any; className?: string }> = {
    pendiente: { label: "Pendiente", variant: "secondary" },
    pendiente_pago: { label: "Pend. Pago", variant: "outline", className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
    autorizada: { label: "Autorizada", variant: "default" },
    enviada: { label: "Enviada", variant: "default" },
    parcial: { label: "Parcial", variant: "secondary" },
    recibida: { label: "Recibida", variant: "default" },
    completada: { label: "Completada", variant: "default", className: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" },
    cancelada: { label: "Cancelada", variant: "destructive" },
  };
  const c = config[status] || { label: status, variant: "secondary" };
  return <Badge variant={c.variant} className={cn("text-[10px]", c.className)}>{c.label}</Badge>;
};

const getPagoBadge = (tipo: string, statusPago: string) => {
  if (statusPago === "pagado") return <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-0">Pagado</Badge>;
  if (statusPago === "parcial") return <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-0">Parcial</Badge>;
  if (tipo === "anticipado") return <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-0">Anticipado</Badge>;
  return <Badge variant="outline" className="text-[10px]">Contra entrega</Badge>;
};

export function CuentaCorrienteProveedorDialog({ open, onOpenChange, proveedor }: Props) {
  const proveedorId = proveedor?.id;

  // OCs activas
  const { data: ocsActivas = [], isLoading: loadingOCs } = useQuery({
    queryKey: ["cuenta-corriente-ocs", proveedorId],
    queryFn: async () => {
      if (!proveedorId) return [];
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select("id, folio, fecha_orden, total, monto_pagado, status, status_pago, tipo_pago, ordenes_compra_detalles(cantidad_ordenada, cantidad_recibida)")
        .eq("proveedor_id", proveedorId)
        .not("status", "in", "(completada,cancelada)")
        .order("fecha_orden", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!proveedorId && open,
  });

  // Créditos pendientes
  const { data: creditos = [], isLoading: loadingCreditos } = useQuery({
    queryKey: ["cuenta-corriente-creditos", proveedorId],
    queryFn: async () => {
      if (!proveedorId) return [];
      const { data, error } = await supabase
        .from("proveedor_creditos_pendientes")
        .select("id, producto_nombre, cantidad, monto_total, motivo, status, created_at")
        .eq("proveedor_id", proveedorId)
        .eq("status", "pendiente")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!proveedorId && open,
  });

  // Historial reciente (últimas 5 completadas/canceladas)
  const { data: historial = [], isLoading: loadingHistorial } = useQuery({
    queryKey: ["cuenta-corriente-historial", proveedorId],
    queryFn: async () => {
      if (!proveedorId) return [];
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select("id, folio, fecha_orden, total, status, status_pago")
        .eq("proveedor_id", proveedorId)
        .in("status", ["completada", "cancelada", "recibida"])
        .order("fecha_orden", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!proveedorId && open,
  });

  // KPIs
  const totalAdeudado = ocsActivas.reduce((sum, oc: any) => {
    const adeudo = (oc.total || 0) - (oc.monto_pagado || 0);
    return sum + Math.max(0, adeudo);
  }, 0);

  const totalCreditos = creditos.reduce((sum, c: any) => sum + (c.monto_total || 0), 0);
  const saldoNeto = totalAdeudado - totalCreditos;

  const calcRecepcion = (oc: any) => {
    const detalles = oc.ordenes_compra_detalles || [];
    if (detalles.length === 0) return 0;
    const ordenado = detalles.reduce((s: number, d: any) => s + (d.cantidad_ordenada || 0), 0);
    const recibido = detalles.reduce((s: number, d: any) => s + (d.cantidad_recibida || 0), 0);
    return ordenado > 0 ? Math.round((recibido / ordenado) * 100) : 0;
  };

  if (!proveedor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg">{proveedor.nombre}</DialogTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {proveedor.rfc && <Badge variant="outline" className="text-xs font-mono">{proveedor.rfc}</Badge>}
            {proveedor.categoria && <Badge variant="secondary" className="text-xs">{proveedor.categoria}</Badge>}
          </div>
        </DialogHeader>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-1.5 mb-1">
              <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[11px] text-blue-700 dark:text-blue-400">OCs Activas</span>
            </div>
            <p className="text-xl font-bold text-blue-800 dark:text-blue-300">{loadingOCs ? "..." : ocsActivas.length}</p>
          </div>
          <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-red-600" />
              <span className="text-[11px] text-red-700 dark:text-red-400">Total Adeudado</span>
            </div>
            <p className="text-xl font-bold text-red-800 dark:text-red-300">{loadingOCs ? "..." : formatCurrency(totalAdeudado)}</p>
          </div>
          <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-1.5 mb-1">
              <CreditCard className="h-3.5 w-3.5 text-green-600" />
              <span className="text-[11px] text-green-700 dark:text-green-400">Créditos a favor</span>
            </div>
            <p className="text-xl font-bold text-green-800 dark:text-green-300">{loadingCreditos ? "..." : formatCurrency(totalCreditos)}</p>
          </div>
          <div className={cn(
            "p-3 rounded-lg border",
            saldoNeto > 0 && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
            saldoNeto <= 0 && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
          )}>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Saldo Neto</span>
            </div>
            <p className={cn(
              "text-xl font-bold",
              saldoNeto > 0 && "text-amber-800 dark:text-amber-300",
              saldoNeto <= 0 && "text-green-800 dark:text-green-300",
            )}>
              {loadingOCs || loadingCreditos ? "..." : saldoNeto === 0 ? "✓ Al corriente" : formatCurrency(Math.abs(saldoNeto))}
            </p>
          </div>
        </div>

        <Separator />

        {/* OCs Activas */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            OCs Activas
          </h4>
          {loadingOCs ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : ocsActivas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin OCs activas ✓</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] py-2">Folio</TableHead>
                    <TableHead className="text-[10px] py-2">Fecha</TableHead>
                    <TableHead className="text-[10px] py-2 text-right">Total</TableHead>
                    <TableHead className="text-[10px] py-2 text-right">Pagado</TableHead>
                    <TableHead className="text-[10px] py-2 text-center">Recibido</TableHead>
                    <TableHead className="text-[10px] py-2">Status</TableHead>
                    <TableHead className="text-[10px] py-2">Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ocsActivas.map((oc: any) => {
                    const pctRecibido = calcRecepcion(oc);
                    return (
                      <TableRow key={oc.id} className="text-xs">
                        <TableCell className="py-1.5 font-mono">{oc.folio}</TableCell>
                        <TableCell className="py-1.5">{format(new Date(oc.fecha_orden), "dd/MM/yy")}</TableCell>
                        <TableCell className="py-1.5 text-right">{formatCurrency(oc.total)}</TableCell>
                        <TableCell className="py-1.5 text-right">{formatCurrency(oc.monto_pagado || 0)}</TableCell>
                        <TableCell className="py-1.5 text-center">
                          <span className={cn("font-medium", pctRecibido === 100 && "text-green-600", pctRecibido > 0 && pctRecibido < 100 && "text-blue-600")}>
                            {pctRecibido}%
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5">{getStatusBadge(oc.status)}</TableCell>
                        <TableCell className="py-1.5">{getPagoBadge(oc.tipo_pago, oc.status_pago)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Créditos a favor */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Créditos a tu favor
          </h4>
          {loadingCreditos ? (
            <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : creditos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin créditos pendientes ✓</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] py-2">Producto</TableHead>
                    <TableHead className="text-[10px] py-2 text-right">Cantidad</TableHead>
                    <TableHead className="text-[10px] py-2 text-right">Monto</TableHead>
                    <TableHead className="text-[10px] py-2">Motivo</TableHead>
                    <TableHead className="text-[10px] py-2">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditos.map((c: any) => (
                    <TableRow key={c.id} className="text-xs">
                      <TableCell className="py-1.5">{c.producto_nombre}</TableCell>
                      <TableCell className="py-1.5 text-right">{c.cantidad}</TableCell>
                      <TableCell className="py-1.5 text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(c.monto_total)}</TableCell>
                      <TableCell className="py-1.5"><Badge variant="outline" className="text-[10px]">{c.motivo}</Badge></TableCell>
                      <TableCell className="py-1.5">{format(new Date(c.created_at), "dd/MM/yy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Historial reciente */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Historial reciente
          </h4>
          {loadingHistorial ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : historial.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin historial</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] py-2">Folio</TableHead>
                    <TableHead className="text-[10px] py-2">Fecha</TableHead>
                    <TableHead className="text-[10px] py-2 text-right">Total</TableHead>
                    <TableHead className="text-[10px] py-2">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.map((h: any) => (
                    <TableRow key={h.id} className="text-xs">
                      <TableCell className="py-1.5 font-mono">{h.folio}</TableCell>
                      <TableCell className="py-1.5">{format(new Date(h.fecha_orden), "dd/MM/yy")}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatCurrency(h.total)}</TableCell>
                      <TableCell className="py-1.5">{getStatusBadge(h.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CuentaCorrienteProveedorDialog;
