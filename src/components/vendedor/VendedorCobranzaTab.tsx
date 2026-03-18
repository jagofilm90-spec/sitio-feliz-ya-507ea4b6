import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { CreditCard, Phone, Calendar, AlertTriangle, CheckCircle, Clock, MessageCircle, Truck, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { calcularEstadoCredito, CREDITO_LABELS, getCreditoColorClasses } from "@/lib/creditoUtils";
import { RegistrarPagoDialog } from "./RegistrarPagoDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PedidoPendiente {
  id: string;
  folio: string;
  total: number;
  fecha_pedido: string;
  termino_credito: string;
  fecha_entrega_real: string | null;
  pagado: boolean;
  cliente: {
    id: string;
    nombre: string;
    telefono: string | null;
  };
}

export function VendedorCobranzaTab() {
  const [pedidos, setPedidos] = useState<PedidoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [cobrosHoy, setCobrosHoy] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    vencido: 0,
    porVencer: 0,
    sinEntregar: 0,
    alCorriente: 0
  });

  // Dialog state for registrar pago
  const [showPagoDialog, setShowPagoDialog] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<{ id: string; nombre: string } | null>(null);

  useEffect(() => {
    fetchPedidos();
    fetchCobrosHoy();
  }, []);

  const fetchCobrosHoy = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const hoy = new Date();
      const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();

      const { data } = await supabase
        .from("pagos_cliente")
        .select("monto_total")
        .eq("registrado_por", user.id)
        .gte("fecha_registro", inicioHoy)
        .neq("status", "rechazado");

      setCobrosHoy((data || []).reduce((sum, p) => sum + Number(p.monto_total), 0));
    } catch (err) {
      console.error("Error fetching cobros hoy:", err);
    }
  };

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const clientesResult = await supabase
        .from("clientes")
        .select("id, nombre, telefono")
        .eq("vendedor_asignado", user.id);

      const clientesData = clientesResult.data;
      if (!clientesData || clientesData.length === 0) {
        setPedidos([]);
        setLoading(false);
        return;
      }

      const clienteIds = clientesData.map(c => c.id);
      const clientesMap = new Map(clientesData.map(c => [c.id, c]));

      const pedidosResult = await supabase
        .from("pedidos")
        .select("id, folio, total, fecha_pedido, termino_credito, cliente_id, status");

      if (pedidosResult.error) throw pedidosResult.error;

      const pedidosFiltradosPorCliente = (pedidosResult.data || []).filter(
        (p) => clienteIds.includes(p.cliente_id) && p.status !== 'cancelado'
      );

      const pedidosConCliente: PedidoPendiente[] = pedidosFiltradosPorCliente.map((p) => {
        const cliente = clientesMap.get(p.cliente_id);
        return {
          id: p.id,
          folio: p.folio,
          total: p.total,
          fecha_pedido: p.fecha_pedido,
          termino_credito: p.termino_credito,
          fecha_entrega_real: (p as any).fecha_entrega_real || null,
          pagado: (p as any).pagado || false,
          cliente: cliente || { id: "", nombre: "Sin cliente", telefono: null }
        };
      });

      setPedidos(pedidosConCliente);

      let total = 0, vencido = 0, porVencer = 0, sinEntregar = 0, alCorriente = 0;
      
      pedidosConCliente.forEach(p => {
        total += p.total;
        const estado = calcularEstadoCredito({
          terminoCredito: p.termino_credito,
          fechaCreacion: new Date(p.fecha_pedido),
          fechaEntregaReal: p.fecha_entrega_real ? new Date(p.fecha_entrega_real) : null,
          pagado: p.pagado
        });

        if (estado.tipo === 'no_entregado') sinEntregar += p.total;
        else if (estado.tipo === 'vencido') vencido += p.total;
        else if (estado.tipo === 'por_vencer' || estado.tipo === 'contado') porVencer += p.total;
        else alCorriente += p.total;
      });

      setStats({ total, vencido, porVencer, sinEntregar, alCorriente });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar pedidos pendientes");
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarCobro = (clienteId: string, clienteNombre: string) => {
    setSelectedCliente({ id: clienteId, nombre: clienteNombre });
    setShowPagoDialog(true);
  };

  const handlePagoRegistrado = () => {
    fetchPedidos();
    fetchCobrosHoy();
  };

  const pedidosFiltrados = pedidos.filter(p => {
    const estado = calcularEstadoCredito({
      terminoCredito: p.termino_credito,
      fechaCreacion: new Date(p.fecha_pedido),
      fechaEntregaReal: p.fecha_entrega_real ? new Date(p.fecha_entrega_real) : null,
      pagado: p.pagado
    });

    switch (filtro) {
      case "vencidos": return estado.tipo === 'vencido';
      case "por_vencer": return estado.tipo === 'por_vencer' || estado.tipo === 'contado';
      case "sin_entregar": return estado.tipo === 'no_entregado';
      case "al_corriente": return estado.tipo === 'vigente';
      default: return true;
    }
  });

  const getEstadoBadge = (pedido: PedidoPendiente) => {
    const estado = calcularEstadoCredito({
      terminoCredito: pedido.termino_credito,
      fechaCreacion: new Date(pedido.fecha_pedido),
      fechaEntregaReal: pedido.fecha_entrega_real ? new Date(pedido.fecha_entrega_real) : null,
      pagado: pedido.pagado
    });

    const iconMap = {
      vencido: <AlertTriangle className="h-3 w-3" />,
      por_vencer: <Clock className="h-3 w-3" />,
      no_entregado: <Truck className="h-3 w-3" />,
      contado: <CreditCard className="h-3 w-3" />,
      vigente: <CheckCircle className="h-3 w-3" />,
      pagado: <CheckCircle className="h-3 w-3" />,
    };

    return (
      <Badge variant="outline" className={`${getCreditoColorClasses(estado.color)} flex items-center gap-1`}>
        {iconMap[estado.tipo]}
        {estado.mensaje}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Por cobrar</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencido</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.vencido)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-amber-500/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Por vencer</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.porVencer)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Truck className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sin entregar</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.sinEntregar)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-500/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Al corriente</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.alCorriente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cobros de hoy KPI */}
        <Card className="border-emerald-500/50 hover:shadow-md transition-shadow bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cobros hoy</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(cobrosHoy)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Select value={filtro} onValueChange={setFiltro}>
        <SelectTrigger className="h-14 text-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas" className="text-base py-3">Todos los pedidos pendientes</SelectItem>
          <SelectItem value="vencidos" className="text-base py-3">Solo vencidos</SelectItem>
          <SelectItem value="por_vencer" className="text-base py-3">Por vencer (próximos 3 días)</SelectItem>
          <SelectItem value="sin_entregar" className="text-base py-3">Sin entregar</SelectItem>
          <SelectItem value="al_corriente" className="text-base py-3">Al corriente</SelectItem>
        </SelectContent>
      </Select>

      {/* Pedidos List */}
      <ScrollArea className="h-[calc(100vh-580px)] lg:h-[calc(100vh-540px)]">
        <div className="space-y-4">
          {pedidosFiltrados.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Sin pedidos pendientes</h3>
                <p className="text-muted-foreground">
                  {filtro === "todas" ? "No tienes pedidos pendientes de cobro" : "No hay pedidos con este filtro"}
                </p>
              </CardContent>
            </Card>
          ) : (
            pedidosFiltrados.map((pedido) => {
              const estado = calcularEstadoCredito({
                terminoCredito: pedido.termino_credito,
                fechaCreacion: new Date(pedido.fecha_pedido),
                fechaEntregaReal: pedido.fecha_entrega_real ? new Date(pedido.fecha_entrega_real) : null,
                pagado: pedido.pagado
              });
              
              return (
                <Card 
                  key={pedido.id} 
                  className={`hover:shadow-md transition-shadow ${
                    estado.tipo === 'vencido' ? "border-destructive/50 bg-destructive/5" : ""
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-semibold text-lg">{pedido.folio}</span>
                          {getEstadoBadge(pedido)}
                        </div>
                        <p className="text-base font-medium truncate">{pedido.cliente.nombre}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {CREDITO_LABELS[pedido.termino_credito] || pedido.termino_credito}
                        </p>
                      </div>
                      <p className="text-2xl font-bold shrink-0">{formatCurrency(pedido.total)}</p>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {estado.fechaVencimiento 
                            ? `Vence: ${format(estado.fechaVencimiento, "d 'de' MMMM yyyy", { locale: es })}`
                            : `Creado: ${format(new Date(pedido.fecha_pedido), "d 'de' MMMM yyyy", { locale: es })}`
                          }
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {pedido.cliente.telefono && (
                          <>
                            <Button
                              size="default"
                              variant="outline"
                              className="h-11 gap-2"
                              onClick={() => window.open(`tel:${pedido.cliente.telefono}`, '_blank')}
                            >
                              <Phone className="h-4 w-4" />
                              <span className="hidden sm:inline">Llamar</span>
                            </Button>
                            <Button
                              size="default"
                              variant="default"
                              className="h-11 gap-2"
                              onClick={() => {
                                const tel = pedido.cliente.telefono?.replace(/\D/g, '');
                                const mensaje = `Hola, le escribo respecto al pedido ${pedido.folio} por ${formatCurrency(pedido.total)}. ¿Podría ayudarme con el cobro?`;
                                window.open(`https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`, '_blank');
                              }}
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
                          </>
                        )}
                        <Button
                          size="default"
                          variant="secondary"
                          className="h-11 gap-2"
                          onClick={() => handleRegistrarCobro(pedido.cliente.id, pedido.cliente.nombre)}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span className="hidden sm:inline">Registrar cobro</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Registrar Pago Dialog */}
      {selectedCliente && (
        <RegistrarPagoDialog
          open={showPagoDialog}
          onOpenChange={setShowPagoDialog}
          clienteId={selectedCliente.id}
          clienteNombre={selectedCliente.nombre}
          onPagoRegistrado={handlePagoRegistrado}
        />
      )}
    </div>
  );
}
