import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail,
  CreditCard,
  ShoppingCart,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageCircle,
  Send,
  XCircle,
  BarChart3,
  Package,
  History
} from "lucide-react";
import { RegistrarPagoDialog } from "./RegistrarPagoDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string | null;
  onPagoRegistrado?: () => void;
}

interface ClienteCompleto {
  id: string;
  codigo: string;
  nombre: string;
  razon_social: string | null;
  rfc: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  termino_credito: string;
  limite_credito: number | null;
  saldo_pendiente: number | null;
  sucursales: Array<{
    id: string;
    nombre: string;
    direccion: string | null;
    telefono: string | null;
  }>;
}

interface Pedido {
  id: string;
  folio: string;
  fecha_pedido: string;
  total: number;
  status: string;
}

interface Factura {
  id: string;
  folio: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  total: number;
  pagada: boolean;
  dias_vencido: number;
}

interface Pago {
  id: string;
  fecha_registro: string;
  monto_total: number;
  forma_pago: string;
  referencia: string | null;
  status: string;
  registrado_por_nombre: string;
}

interface NotificacionEnviada {
  id: string;
  tipo: string;
  destinatario: string;
  asunto: string;
  fecha_envio: string | null;
  error: string | null;
}

// Sub-componente para historial de precios por pedido y producto
function HistorialPreciosPedidos({ clienteId }: { clienteId: string }) {
  const [historial, setHistorial] = useState<Array<{
    folio: string;
    fecha: string;
    producto: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistorial = async () => {
      setLoading(true);
      try {
        const { data: pedidos } = await supabase
          .from("pedidos")
          .select("id, folio, fecha_pedido")
          .eq("cliente_id", clienteId)
          .not("status", "eq", "cancelado")
          .order("fecha_pedido", { ascending: false })
          .limit(20);

        if (!pedidos || pedidos.length === 0) { setHistorial([]); return; }

        const pedidoIds = pedidos.map(p => p.id);
        const { data: detalles } = await supabase
          .from("pedidos_detalles")
          .select("pedido_id, cantidad, precio_unitario, subtotal, productos(nombre)")
          .in("pedido_id", pedidoIds);

        const rows = (detalles || []).map(d => {
          const ped = pedidos.find(p => p.id === d.pedido_id);
          const prod = d.productos as { nombre: string } | null;
          return {
            folio: ped?.folio || "",
            fecha: ped?.fecha_pedido || "",
            producto: prod?.nombre || "—",
            cantidad: d.cantidad || 0,
            precio: d.precio_unitario || 0,
            subtotal: d.subtotal || 0,
          };
        });
        setHistorial(rows);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (clienteId) fetchHistorial();
  }, [clienteId]);

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>;
  if (historial.length === 0) return (
    <div className="text-center py-8 text-muted-foreground">
      <History className="h-12 w-12 mx-auto mb-3 opacity-40" />
      <p>Sin historial de precios</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Últimos 20 pedidos — precios aplicados por producto</p>
      {historial.map((row, i) => (
        <Card key={i} className="hover:bg-muted/30 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{row.producto}</p>
                <p className="text-xs text-muted-foreground">
                  {row.folio} · {new Date(row.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{formatCurrency(row.precio)}/u</p>
                <p className="text-xs text-muted-foreground">{row.cantidad} × = {formatCurrency(row.subtotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ClienteDetalleSheet({ 
  open, 
  onOpenChange, 
  clienteId,
  onPagoRegistrado
}: Props) {
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState<ClienteCompleto | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionEnviada[]>([]);
  const [showRegistrarPago, setShowRegistrarPago] = useState(false);
  const [productosFrequentes, setProductosFrecuentes] = useState<Array<{
    producto_id: string;
    nombre: string;
    codigo: string;
    veces_pedido: number;
    cantidad_total: number;
  }>>([]);
  const [loadingFrecuentes, setLoadingFrecuentes] = useState(false);

  useEffect(() => {
    if (open && clienteId) {
      fetchClienteCompleto();
      fetchProductosFrecuentes(clienteId);
    }
  }, [open, clienteId]);

  const fetchClienteCompleto = async () => {
    if (!clienteId) return;

    try {
      setLoading(true);

      // Fetch cliente con sucursales
      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .select(`
          id, codigo, nombre, razon_social, rfc, direccion, telefono, email,
          termino_credito, limite_credito, saldo_pendiente,
          sucursales:cliente_sucursales(id, nombre, direccion, telefono)
        `)
        .eq("id", clienteId)
        .single();

      if (clienteError) throw clienteError;
      setCliente(clienteData);

      // Fetch pedidos recientes
      const { data: pedidosData } = await supabase
        .from("pedidos")
        .select("id, folio, fecha_pedido, total, status")
        .eq("cliente_id", clienteId)
        .order("fecha_pedido", { ascending: false })
        .limit(10);

      setPedidos(pedidosData || []);

      // Fetch facturas
      const { data: facturasData } = await supabase
        .from("facturas")
        .select("id, folio, fecha_emision, fecha_vencimiento, total, pagada")
        .eq("cliente_id", clienteId)
        .order("fecha_emision", { ascending: false })
        .limit(20);

      const hoy = new Date();
      const facturasFormateadas: Factura[] = (facturasData || []).map(f => {
        const vencimiento = f.fecha_vencimiento ? new Date(f.fecha_vencimiento) : null;
        const diasVencido = vencimiento && !f.pagada
          ? Math.floor((hoy.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return { ...f, dias_vencido: diasVencido };
      });
      setFacturas(facturasFormateadas);

      // Fetch pagos with registrado_por name
      const { data: pagosData } = await supabase
        .from("pagos_cliente")
        .select("id, fecha_registro, monto_total, forma_pago, referencia, status, registrado_por")
        .eq("cliente_id", clienteId)
        .order("fecha_registro", { ascending: false })
        .limit(50);

      // Get profile names for registrado_por
      const regIds = [...new Set((pagosData || []).map(p => p.registrado_por).filter(Boolean))];
      let regMap = new Map<string, string>();
      if (regIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", regIds as string[]);
        regMap = new Map((profiles || []).map(p => [p.id, p.full_name || "Usuario"]));
      }

      setPagos((pagosData || []).map(p => ({
        ...p,
        registrado_por_nombre: p.registrado_por ? (regMap.get(p.registrado_por) || "Usuario") : "Sistema",
      })));

      // Fetch emails del cliente para buscar notificaciones
      const { data: emailsCliente } = await supabase
        .from("cliente_correos")
        .select("email")
        .eq("cliente_id", clienteId);

      if (emailsCliente && emailsCliente.length > 0) {
        const emails = emailsCliente.map(e => e.email);
        const { data: correosData } = await supabase
          .from("correos_enviados")
          .select("id, tipo, destinatario, asunto, fecha_envio, error")
          .in("destinatario", emails)
          .order("fecha_envio", { ascending: false })
          .limit(50);

        setNotificaciones(correosData || []);
      } else {
        setNotificaciones([]);
      }

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos del cliente");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductosFrecuentes = async (cid: string) => {
    setLoadingFrecuentes(true);
    try {
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("id")
        .eq("cliente_id", cid)
        .not("status", "eq", "cancelado");

      if (!pedidos || pedidos.length === 0) {
        setProductosFrecuentes([]);
        return;
      }

      const pedidoIds = pedidos.map(p => p.id);
      const { data: detalles } = await supabase
        .from("pedidos_detalles")
        .select("pedido_id, cantidad, productos(id, nombre, codigo)")
        .in("pedido_id", pedidoIds);

      if (!detalles) {
        setProductosFrecuentes([]);
        return;
      }

      const mapa: Record<string, { producto_id: string; nombre: string; codigo: string; veces_pedido: number; cantidad_total: number }> = {};
      for (const d of detalles) {
        const prod = d.productos as { id: string; nombre: string; codigo: string } | null;
        if (!prod) continue;
        if (!mapa[prod.id]) {
          mapa[prod.id] = { producto_id: prod.id, nombre: prod.nombre, codigo: prod.codigo, veces_pedido: 0, cantidad_total: 0 };
        }
        mapa[prod.id].veces_pedido += 1;
        mapa[prod.id].cantidad_total += d.cantidad || 0;
      }

      const sorted = Object.values(mapa).sort((a, b) => b.veces_pedido - a.veces_pedido).slice(0, 10);
      setProductosFrecuentes(sorted);
    } catch (err) {
      console.error("Error fetchProductosFrecuentes:", err);
    } finally {
      setLoadingFrecuentes(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pendiente: { label: "Pendiente", variant: "secondary" },
      confirmado: { label: "Confirmado", variant: "default" },
      en_proceso: { label: "En proceso", variant: "default" },
      entregado: { label: "Entregado", variant: "outline" },
      cancelado: { label: "Cancelado", variant: "destructive" },
    };
    const config = statusMap[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTerminoCreditoLabel = (termino: string) => {
    const map: Record<string, string> = {
      contado: "Contado",
      "8_dias": "8 días",
      "15_dias": "15 días",
      "30_dias": "30 días",
      "45_dias": "45 días",
      "60_dias": "60 días",
    };
    return map[termino] || termino;
  };

  const handlePagoRegistrado = () => {
    fetchClienteCompleto();
    onPagoRegistrado?.();
  };

  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden">
          <SheetHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!cliente) return null;

  const facturasPendientes = facturas.filter(f => !f.pagada);
  const totalPendiente = facturasPendientes.reduce((sum, f) => sum + f.total, 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {cliente.nombre}
            </SheetTitle>
            <SheetDescription className="flex items-center gap-2">
              <Badge variant="outline">{cliente.codigo}</Badge>
              {cliente.rfc && <Badge variant="secondary">{cliente.rfc}</Badge>}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 mt-4">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-7 text-xs">
                <TabsTrigger value="info" className="text-xs px-1">Info</TabsTrigger>
                <TabsTrigger value="pedidos" className="text-xs px-1">Pedidos</TabsTrigger>
                <TabsTrigger value="frecuencia" className="text-xs px-1 flex items-center gap-0.5">
                  <BarChart3 className="h-3 w-3" />
                  Freq.
                </TabsTrigger>
                <TabsTrigger value="historial" className="text-xs px-1 flex items-center gap-0.5">
                  <History className="h-3 w-3" />
                  Hist.
                </TabsTrigger>
                <TabsTrigger value="facturas" className="text-xs px-1">Facturas</TabsTrigger>
                <TabsTrigger value="pagos" className="text-xs px-1">Pagos</TabsTrigger>
                <TabsTrigger value="emails" className="text-xs px-1 flex items-center gap-0.5">
                  <Send className="h-3 w-3" />
                  Emails
                </TabsTrigger>
              </TabsList>

              {/* Info Tab */}
              <TabsContent value="info" className="space-y-4 mt-4">
                {/* Datos de contacto */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    {cliente.razon_social && (
                      <div>
                        <p className="text-sm text-muted-foreground">Razón Social</p>
                        <p className="font-medium">{cliente.razon_social}</p>
                      </div>
                    )}
                    
                    {cliente.direccion && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm">{cliente.direccion}</p>
                      </div>
                    )}
                    
                    {cliente.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${cliente.telefono}`} className="text-sm text-primary hover:underline">
                          {cliente.telefono}
                        </a>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => {
                            const tel = cliente.telefono?.replace(/\D/g, '');
                            window.open(`https://wa.me/52${tel}`, '_blank');
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {cliente.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${cliente.email}`} className="text-sm text-primary hover:underline">
                          {cliente.email}
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Condiciones de crédito */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Condiciones de crédito
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Plazo</p>
                        <p className="font-medium">{getTerminoCreditoLabel(cliente.termino_credito)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Límite</p>
                        <p className="font-medium">
                          {cliente.limite_credito 
                            ? formatCurrency(cliente.limite_credito) 
                            : "Sin límite"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Saldo pendiente</p>
                        <p className={`font-medium ${(cliente.saldo_pendiente || 0) > 0 ? "text-destructive" : "text-green-600"}`}>
                          {formatCurrency(cliente.saldo_pendiente || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Disponible</p>
                        <p className="font-medium">
                          {cliente.limite_credito 
                            ? formatCurrency(Math.max(0, cliente.limite_credito - (cliente.saldo_pendiente || 0)))
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sucursales */}
                {cliente.sucursales && cliente.sucursales.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3">
                        Sucursales ({cliente.sucursales.length})
                      </h4>
                      <div className="space-y-3">
                        {cliente.sucursales.map((suc) => (
                          <div key={suc.id} className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">{suc.nombre}</p>
                            {suc.direccion && (
                              <p className="text-sm text-muted-foreground mt-1">{suc.direccion}</p>
                            )}
                            {suc.telefono && (
                              <p className="text-sm text-primary mt-1">{suc.telefono}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Botón registrar pago */}
                {facturasPendientes.length > 0 && (
                  <Button 
                    className="w-full h-12" 
                    onClick={() => setShowRegistrarPago(true)}
                  >
                    <DollarSign className="h-5 w-5 mr-2" />
                    Registrar Cobro ({formatCurrency(totalPendiente)} pendiente)
                  </Button>
                )}
              </TabsContent>

              {/* Pedidos Tab */}
              <TabsContent value="pedidos" className="mt-4">
                {pedidos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Sin pedidos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pedidos.map((pedido) => (
                      <Card key={pedido.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{pedido.folio}</span>
                                {getStatusBadge(pedido.status)}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(pedido.fecha_pedido), "d MMM yyyy", { locale: es })}
                              </span>
                            </div>
                            <p className="font-semibold">{formatCurrency(pedido.total)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Frecuencia Tab */}
              <TabsContent value="frecuencia" className="mt-4 space-y-3">
                {loadingFrecuentes ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : productosFrequentes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p>Sin historial de compras</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Top 10 productos más comprados</p>
                    {productosFrequentes.map((prod, index) => (
                      <Card key={prod.producto_id} className="hover:bg-muted/30 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              index === 0 ? "bg-yellow-100 text-yellow-700" :
                              index === 1 ? "bg-slate-100 text-slate-600" :
                              index === 2 ? "bg-amber-100 text-amber-700" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{prod.nombre}</p>
                              <p className="text-xs text-muted-foreground">{prod.codigo}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold">{prod.veces_pedido} pedidos</p>
                              <p className="text-xs text-muted-foreground">{prod.cantidad_total.toFixed(prod.cantidad_total % 1 === 0 ? 0 : 1)} unid.</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </TabsContent>

              {/* Historial Tab */}
              <TabsContent value="historial" className="mt-4">
                <HistorialPreciosPedidos clienteId={clienteId!} />
              </TabsContent>

              {/* Facturas Tab */}
              <TabsContent value="facturas" className="mt-4">
                {facturas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Sin facturas registradas</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {facturas.map((factura) => (
                      <Card 
                        key={factura.id} 
                        className={`hover:bg-muted/50 transition-colors ${
                          !factura.pagada && factura.dias_vencido > 0 ? "border-destructive/50" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{factura.folio}</span>
                                {factura.pagada ? (
                                  <Badge variant="outline" className="text-green-600 border-green-300">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Pagada
                                  </Badge>
                                ) : factura.dias_vencido > 0 ? (
                                  <Badge variant="destructive">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Vencida {factura.dias_vencido}d
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pendiente
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {factura.fecha_vencimiento 
                                  ? `Vence: ${format(new Date(factura.fecha_vencimiento), "d MMM yyyy", { locale: es })}`
                                  : format(new Date(factura.fecha_emision), "d MMM yyyy", { locale: es })}
                              </span>
                            </div>
                            <p className="font-semibold">{formatCurrency(factura.total)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Pagos Tab */}
              <TabsContent value="pagos" className="mt-4">
                {pagos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Sin pagos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pagos.map((pago) => (
                      <Card key={pago.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium capitalize">{pago.forma_pago}</span>
                                <Badge variant={pago.status === "validado" ? "outline" : "secondary"}>
                                  {pago.status === "validado" ? "Validado" : "Pendiente"}
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(pago.fecha_registro), "d MMM yyyy HH:mm", { locale: es })}
                              </span>
                            </div>
                            <p className="font-semibold text-green-600">
                              +{formatCurrency(pago.monto_total)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Emails Tab */}
              <TabsContent value="emails" className="mt-4">
                {notificaciones.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Sin notificaciones enviadas</p>
                    <p className="text-xs mt-1">Los emails se envían a direcciones con propósito "pedidos" o "todo"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notificaciones.map((notif) => (
                      <Card 
                        key={notif.id} 
                        className={`hover:bg-muted/50 transition-colors ${notif.error ? "border-destructive/50" : ""}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {notif.error ? (
                                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                )}
                                <span className="font-medium truncate">{notif.asunto}</span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {notif.destinatario}
                              </p>
                              {notif.error && (
                                <p className="text-xs text-destructive mt-1 line-clamp-2">
                                  Error: {notif.error}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <Badge variant="outline" className="text-xs">
                                {notif.tipo.replace(/_/g, " ")}
                              </Badge>
                              {notif.fecha_envio && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(notif.fecha_envio), "d MMM HH:mm", { locale: es })}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Dialog para registrar pago */}
      <RegistrarPagoDialog
        open={showRegistrarPago}
        onOpenChange={setShowRegistrarPago}
        clienteId={cliente.id}
        clienteNombre={cliente.nombre}
        onPagoRegistrado={handlePagoRegistrado}
      />
    </>
  );
}
