import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
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
  Package,
  Truck
} from "lucide-react";

interface ComisionPeriodo {
  periodo: string;
  fechaInicio: Date;
  fechaFin: Date;
  totalEntregas: number;
  cantidadEntregas: number;
  porcentaje: number;
  comisionCalculada: number;
  status: "pendiente" | "aprobada" | "pagada";
}

interface EntregaDetalle {
  id: string;
  folio: string;
  cliente: string;
  fechaEntrega: string;
  total: number;
  comision: number;
}

// Función para calcular el periodo quincenal
const calcularPeriodoQuincenal = (fecha: Date) => {
  const dia = fecha.getDate();
  const year = fecha.getFullYear();
  const month = fecha.getMonth();
  
  if (dia <= 15) {
    // Primera quincena: 1-15
    return {
      inicio: new Date(year, month, 1, 0, 0, 0),
      fin: new Date(year, month, 15, 23, 59, 59),
      nombre: `1ra Quincena ${format(fecha, "MMMM yyyy", { locale: es })}`,
      esSegundaQuincena: false
    };
  } else {
    // Segunda quincena: 16 al último día del mes
    return {
      inicio: new Date(year, month, 16, 0, 0, 0),
      fin: endOfMonth(fecha),
      nombre: `2da Quincena ${format(fecha, "MMMM yyyy", { locale: es })}`,
      esSegundaQuincena: true
    };
  }
};

// Función para formatear el nombre del periodo desde fechas
const formatearNombrePeriodo = (inicio: Date, fin: Date) => {
  const diaFin = fin.getDate();
  const mesYear = format(inicio, "MMMM yyyy", { locale: es });
  if (diaFin === 15) {
    return `1ra Quincena ${mesYear}`;
  } else {
    return `2da Quincena ${mesYear}`;
  }
};

export function VendedorComisionesTab() {
  const [loading, setLoading] = useState(true);
  const [periodoActual, setPeriodoActual] = useState<ComisionPeriodo | null>(null);
  const [historico, setHistorico] = useState<ComisionPeriodo[]>([]);
  const [detalleEntregas, setDetalleEntregas] = useState<EntregaDetalle[]>([]);
  const [periodoVer, setPeriodoVer] = useState("actual");
  const [porcentajeComision, setPorcentajeComision] = useState(1);
  const [diasRestantes, setDiasRestantes] = useState(0);
  const [rangoFechas, setRangoFechas] = useState("");

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
        .select("id, porcentaje_comision, periodo_comision")
        .eq("user_id", user.id)
        .maybeSingle();

      const porcentaje = empleado?.porcentaje_comision || 1;
      setPorcentajeComision(porcentaje);

      // Calcular periodo quincenal actual
      const hoy = new Date();
      const { inicio: inicioPeriodo, fin: finPeriodo, nombre: nombrePeriodo } = calcularPeriodoQuincenal(hoy);
      
      // Calcular días restantes
      const diasRestantesCalc = differenceInDays(finPeriodo, hoy);
      setDiasRestantes(Math.max(0, diasRestantesCalc));
      
      // Formato del rango de fechas
      const rangoFormat = `${format(inicioPeriodo, "d", { locale: es })} - ${format(finPeriodo, "d MMMM", { locale: es })}`;
      setRangoFechas(rangoFormat);

      // Obtener entregas del periodo actual
      // Primero obtenemos los pedidos del vendedor
      const { data: pedidosVendedor } = await supabase
        .from("pedidos")
        .select("id")
        .eq("vendedor_id", user.id);

      const pedidoIds = (pedidosVendedor || []).map(p => p.id);

      let entregasData: any[] = [];
      
      if (pedidoIds.length > 0) {
        // Obtener entregas de esos pedidos en el periodo
        const { data: entregas } = await supabase
          .from("entregas")
          .select(`
            id,
            fecha_entrega,
            entregado,
            pedido:pedidos!inner(
              id,
              folio,
              total,
              vendedor_id,
              status,
              cliente:clientes(nombre)
            )
          `)
          .in("pedido_id", pedidoIds)
          .eq("entregado", true)
          .not("fecha_entrega", "is", null)
          .gte("fecha_entrega", inicioPeriodo.toISOString())
          .lte("fecha_entrega", finPeriodo.toISOString())
          .order("fecha_entrega", { ascending: false });

        entregasData = entregas || [];
      }

      // Calcular totales
      const totalEntregas = entregasData.reduce((sum, e) => sum + (e.pedido?.total || 0), 0);
      const cantidadEntregas = entregasData.length;
      const comisionCalculada = totalEntregas * (porcentaje / 100);

      setPeriodoActual({
        periodo: nombrePeriodo,
        fechaInicio: inicioPeriodo,
        fechaFin: finPeriodo,
        totalEntregas,
        cantidadEntregas,
        porcentaje,
        comisionCalculada,
        status: "pendiente"
      });

      // Detalle de entregas
      const detalle: EntregaDetalle[] = entregasData.map((e: any) => ({
        id: e.id,
        folio: e.pedido?.folio || "",
        cliente: e.pedido?.cliente?.nombre || "Cliente",
        fechaEntrega: e.fecha_entrega,
        total: e.pedido?.total || 0,
        comision: (e.pedido?.total || 0) * (porcentaje / 100)
      }));
      setDetalleEntregas(detalle);

      // Obtener comisiones históricas de la tabla
      if (empleado?.id) {
        const { data: comisionesHistoricas } = await supabase
          .from("comisiones_vendedor")
          .select("*")
          .eq("empleado_id", empleado.id)
          .order("periodo_fin", { ascending: false })
          .limit(12);

        const historicoFormateado: ComisionPeriodo[] = (comisionesHistoricas || []).map(c => ({
          periodo: formatearNombrePeriodo(new Date(c.periodo_inicio), new Date(c.periodo_fin)),
          fechaInicio: new Date(c.periodo_inicio),
          fechaFin: new Date(c.periodo_fin),
          totalEntregas: c.total_ventas || 0,
          cantidadEntregas: 0, // No tenemos este dato en el histórico
          porcentaje: c.porcentaje_aplicado,
          comisionCalculada: c.monto_comision || 0,
          status: c.status as "pendiente" | "aprobada" | "pagada"
        }));

        setHistorico(historicoFormateado);
      }

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
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pagada
          </Badge>
        );
      case "aprobada":
        return (
          <Badge className="bg-blue-100 text-blue-800">
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
      {/* Header del periodo */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-semibold text-lg capitalize">{periodoActual?.periodo}</h3>
              <p className="text-sm text-muted-foreground">{rangoFechas}</p>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              <Clock className="h-3 w-3 mr-1" />
              {diasRestantes === 0 ? "Último día" : `Faltan ${diasRestantes} días`}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPIs del periodo actual */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entregas</p>
                <p className="text-2xl font-bold">{periodoActual?.cantidadEntregas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total entregas</p>
                <p className="text-2xl font-bold">{formatCurrency(periodoActual?.totalEntregas || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Percent className="h-6 w-6 text-amber-600" />
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
          <SelectItem value="actual">Periodo actual ({rangoFechas})</SelectItem>
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
                  <span className="capitalize">{periodoActual?.periodo}</span>
                </CardTitle>
                {getStatusBadge(periodoActual?.status || "pendiente")}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total de entregas del periodo</span>
                  <span className="font-semibold">{formatCurrency(periodoActual?.totalEntregas || 0)}</span>
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

          {/* Detalle de entregas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalle de entregas del periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {detalleEntregas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay entregas registradas en esta quincena</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detalleEntregas.map((entrega) => (
                      <div 
                        key={entrega.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{entrega.folio}</span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground truncate">
                              {entrega.cliente}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            Entregado el {format(new Date(entrega.fechaEntrega), "d MMM yyyy", { locale: es })}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(entrega.total)}</p>
                          <p className="text-sm text-primary font-medium">+{formatCurrency(entrega.comision)}</p>
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
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay comisiones anteriores registradas</p>
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
                          <p className="text-muted-foreground mb-1">Total entregas</p>
                          <p className="font-semibold">{formatCurrency(periodo.totalEntregas)}</p>
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
