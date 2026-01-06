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
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageCircle,
  ExternalLink
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
  status: string;
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
  const [showRegistrarPago, setShowRegistrarPago] = useState(false);

  useEffect(() => {
    if (open && clienteId) {
      fetchClienteCompleto();
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

      // Fetch pagos
      const { data: pagosData } = await supabase
        .from("pagos_cliente")
        .select("id, fecha_registro, monto_total, forma_pago, status")
        .eq("cliente_id", clienteId)
        .order("fecha_registro", { ascending: false })
        .limit(20);

      setPagos(pagosData || []);

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos del cliente");
    } finally {
      setLoading(false);
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
                <TabsTrigger value="facturas">Facturas</TabsTrigger>
                <TabsTrigger value="pagos">Pagos</TabsTrigger>
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
