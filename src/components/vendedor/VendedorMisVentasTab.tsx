import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Package, Calendar, TrendingUp, DollarSign, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Pedido {
  id: string;
  folio: string;
  fecha_pedido: string;
  total: number;
  status: string;
  cliente: {
    nombre: string;
  };
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  por_autorizar: { label: "Por autorizar", variant: "secondary" },
  autorizado: { label: "Autorizado", variant: "default" },
  en_ruta: { label: "En ruta", variant: "default" },
  entregado: { label: "Entregado", variant: "outline" },
  facturado: { label: "Facturado", variant: "outline" },
  cancelado: { label: "Cancelado", variant: "destructive" }
};

export function VendedorMisVentasTab() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("mes");
  const [stats, setStats] = useState({
    totalVentas: 0,
    totalPedidos: 0,
    ticketPromedio: 0,
    comisionEstimada: 0
  });

  useEffect(() => {
    fetchPedidos();
  }, [periodo]);

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      let fechaInicio: Date;
      let fechaFin: Date;

      switch (periodo) {
        case "semana":
          fechaInicio = startOfWeek(now, { weekStartsOn: 1 });
          fechaFin = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "mes":
          fechaInicio = startOfMonth(now);
          fechaFin = endOfMonth(now);
          break;
        case "todo":
          fechaInicio = new Date(2020, 0, 1);
          fechaFin = new Date(2030, 11, 31);
          break;
        default:
          fechaInicio = startOfMonth(now);
          fechaFin = endOfMonth(now);
      }

      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id, folio, fecha_pedido, total, status,
          cliente:clientes(nombre)
        `)
        .eq("vendedor_id", user.id)
        .gte("fecha_pedido", fechaInicio.toISOString())
        .lte("fecha_pedido", fechaFin.toISOString())
        .order("fecha_pedido", { ascending: false });

      if (error) throw error;

      const pedidosData = (data || []).map((p: any) => ({
        ...p,
        cliente: p.cliente || { nombre: "Sin cliente" }
      }));

      setPedidos(pedidosData);

      // Calculate stats (exclude cancelled)
      const pedidosValidos = pedidosData.filter(p => p.status !== "cancelado");
      const totalVentas = pedidosValidos.reduce((sum, p) => sum + (p.total || 0), 0);
      const totalPedidos = pedidosValidos.length;
      const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;
      const comisionEstimada = totalVentas * 0.01; // 1% commission

      setStats({
        totalVentas,
        totalPedidos,
        ticketPromedio,
        comisionEstimada
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Filter - Larger */}
      <Select value={periodo} onValueChange={setPeriodo}>
        <SelectTrigger className="h-14 text-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="semana" className="text-base py-3">Esta semana</SelectItem>
          <SelectItem value="mes" className="text-base py-3">Este mes</SelectItem>
          <SelectItem value="todo" className="text-base py-3">Todo el historial</SelectItem>
        </SelectContent>
      </Select>

      {/* Stats - Larger Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total vendido</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalVentas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pedidos</p>
                <p className="text-2xl font-bold">{stats.totalPedidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket promedio</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.ticketPromedio)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-green-200 dark:bg-green-900/50 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-400">Comisión (1%)</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.comisionEstimada)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List - Larger Items */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Mis Pedidos</h3>
        <ScrollArea className="h-[calc(100vh-520px)] lg:h-[calc(100vh-480px)]">
          <div className="space-y-3">
            {pedidos.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No hay pedidos</h3>
                  <p className="text-muted-foreground">
                    No tienes pedidos registrados en este período
                  </p>
                </CardContent>
              </Card>
            ) : (
              pedidos.map((pedido) => (
                <Card 
                  key={pedido.id} 
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-semibold text-lg">{pedido.folio}</span>
                          <Badge 
                            variant={statusLabels[pedido.status]?.variant || "secondary"}
                            className="text-xs"
                          >
                            {statusLabels[pedido.status]?.label || pedido.status}
                          </Badge>
                        </div>
                        <p className="text-base text-muted-foreground truncate mb-1">
                          {pedido.cliente.nombre}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(pedido.fecha_pedido), "d 'de' MMMM yyyy", { locale: es })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold">{formatCurrency(pedido.total)}</p>
                        <p className="text-xs text-green-600">
                          +{formatCurrency(pedido.total * 0.01)} comisión
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
