import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Calendar,
  CheckCircle,
  Clock,
  BarChart3,
  CreditCard
} from "lucide-react";

interface ComisionPeriodo {
  periodo: string;
  fechaInicio: Date;
  fechaFin: Date;
  totalVentas: number;
  totalCobrado: number;
  baseComision: number;
  porcentaje: number;
  comisionCalculada: number;
  status: "pendiente" | "aprobada" | "pagada";
}

interface VentaDetalle {
  id: string;
  folio: string;
  cliente: string;
  fecha: string;
  total: number;
  comision: number;
}

export function VendedorComisionesTab() {
  const [loading, setLoading] = useState(true);
  const [periodoActual, setPeriodoActual] = useState<ComisionPeriodo | null>(null);
  const [historico, setHistorico] = useState<ComisionPeriodo[]>([]);
  const [detalleVentas, setDetalleVentas] = useState<VentaDetalle[]>([]);
  const [periodoVer, setPeriodoVer] = useState("actual");
  const [porcentajeComision, setPorcentajeComision] = useState(1);

  useEffect(() => {
    fetchComisiones();
  }, []);

  const fetchComisiones = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener configuración del empleado
      const { data: empleado } = await supabase
        .from("empleados")
        .select("porcentaje_comision, periodo_comision")
        .eq("user_id", user.id)
        .maybeSingle();

      const porcentaje = empleado?.porcentaje_comision || 1;
      setPorcentajeComision(porcentaje);

      // Calcular periodo actual (mes)
      const hoy = new Date();
      const inicioMes = startOfMonth(hoy);
      const finMes = endOfMonth(hoy);

      // Obtener ventas del mes actual
      const { data: ventasMes } = await supabase
        .from("pedidos")
        .select(`
          id, folio, total, fecha_pedido,
          cliente:clientes(nombre)
        `)
        .eq("vendedor_id", user.id)
        .gte("fecha_pedido", inicioMes.toISOString())
        .lte("fecha_pedido", finMes.toISOString())
        .not("status", "in", "(cancelado,por_autorizar)")
        .order("fecha_pedido", { ascending: false });

      const totalVentas = (ventasMes || []).reduce((sum, p) => sum + (p.total || 0), 0);
      const comisionCalculada = totalVentas * (porcentaje / 100);

      // Obtener cobros del mes (para base de comisión si aplica)
      const { data: clientesIds } = await supabase
        .from("clientes")
        .select("id")
        .eq("vendedor_asignado", user.id);

      let totalCobrado = 0;
      if (clientesIds && clientesIds.length > 0) {
        const ids = clientesIds.map(c => c.id);
        
        const { data: pagos } = await supabase
          .from("pagos_cliente")
          .select("monto_aplicado")
          .in("cliente_id", ids)
          .eq("status", "validado")
          .gte("fecha_registro", inicioMes.toISOString())
          .lte("fecha_registro", finMes.toISOString());

        totalCobrado = (pagos || []).reduce((sum, p) => sum + (p.monto_aplicado || 0), 0);
      }

      setPeriodoActual({
        periodo: format(hoy, "MMMM yyyy", { locale: es }),
        fechaInicio: inicioMes,
        fechaFin: finMes,
        totalVentas,
        totalCobrado,
        baseComision: totalVentas, // Puede cambiar según configuración
        porcentaje,
        comisionCalculada,
        status: "pendiente"
      });

      // Detalle de ventas
      const detalle: VentaDetalle[] = (ventasMes || []).map((v: any) => ({
        id: v.id,
        folio: v.folio,
        cliente: v.cliente?.nombre || "Cliente",
        fecha: v.fecha_pedido,
        total: v.total || 0,
        comision: (v.total || 0) * (porcentaje / 100)
      }));
      setDetalleVentas(detalle);

      // Obtener comisiones históricas de la tabla
      const { data: comisionesHistoricas } = await supabase
        .from("comisiones_vendedor")
        .select("*")
        .eq("empleado_id", user.id)
        .order("periodo_fin", { ascending: false })
        .limit(6);

      const historicoFormateado: ComisionPeriodo[] = (comisionesHistoricas || []).map(c => ({
        periodo: format(new Date(c.periodo_inicio), "MMMM yyyy", { locale: es }),
        fechaInicio: new Date(c.periodo_inicio),
        fechaFin: new Date(c.periodo_fin),
        totalVentas: c.total_ventas || 0,
        totalCobrado: 0,
        baseComision: c.total_ventas || 0,
        porcentaje: c.porcentaje_aplicado,
        comisionCalculada: c.monto_comision || 0,
        status: c.status as "pendiente" | "aprobada" | "pagada"
      }));

      setHistorico(historicoFormateado);

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar comisiones");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pagada":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pagada
          </Badge>
        );
      case "aprobada":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobada
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs del periodo actual */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas del mes</p>
                <p className="text-2xl font-bold">{formatCurrency(periodoActual?.totalVentas || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cobrado</p>
                <p className="text-2xl font-bold">{formatCurrency(periodoActual?.totalCobrado || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Percent className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">% Comisión</p>
                <p className="text-2xl font-bold">{porcentajeComision}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow bg-primary/5 border-primary/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comisión estimada</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(periodoActual?.comisionCalculada || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Periodo selector */}
      <Select value={periodoVer} onValueChange={setPeriodoVer}>
        <SelectTrigger className="w-full lg:w-64 h-12">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="actual">Periodo actual ({periodoActual?.periodo})</SelectItem>
          <SelectItem value="historico">Historial de comisiones</SelectItem>
        </SelectContent>
      </Select>

      {periodoVer === "actual" ? (
        <>
          {/* Información del periodo */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  {periodoActual?.periodo}
                </CardTitle>
                {getStatusBadge(periodoActual?.status || "pendiente")}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Base de comisión (ventas)</span>
                  <span className="font-semibold">{formatCurrency(periodoActual?.baseComision || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Porcentaje aplicado</span>
                  <span className="font-semibold">{porcentajeComision}%</span>
                </div>
                <hr />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Comisión a recibir</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(periodoActual?.comisionCalculada || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalle de ventas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalle de ventas del periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {detalleVentas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay ventas registradas en este periodo
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detalleVentas.map((venta) => (
                      <div 
                        key={venta.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{venta.folio}</span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground truncate">
                              {venta.cliente}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(venta.fecha), "d MMM yyyy", { locale: es })}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(venta.total)}</p>
                          <p className="text-sm text-primary">+{formatCurrency(venta.comision)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Historial de comisiones */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial de comisiones</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {historico.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay comisiones anteriores registradas
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.map((periodo, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold capitalize">{periodo.periodo}</span>
                        </div>
                        {getStatusBadge(periodo.status)}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Ventas</p>
                          <p className="font-semibold">{formatCurrency(periodo.totalVentas)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">% Comisión</p>
                          <p className="font-semibold">{periodo.porcentaje}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Comisión</p>
                          <p className="font-semibold text-primary">{formatCurrency(periodo.comisionCalculada)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
