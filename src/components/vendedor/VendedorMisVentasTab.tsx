import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Package, Calendar, TrendingUp, DollarSign } from "lucide-react";
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
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Filter */}
      <Select value={periodo} onValueChange={setPeriodo}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="semana">Esta semana</SelectItem>
          <SelectItem value="mes">Este mes</SelectItem>
          <SelectItem value="todo">Todo el historial</SelectItem>
        </SelectContent>
      </Select>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Total vendido</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(stats.totalVentas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              <span className="text-xs">Pedidos</span>
            </div>
            <p className="text-xl font-bold">{stats.totalPedidos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Ticket promedio</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(stats.ticketPromedio)}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Comisión (1%)</span>
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(stats.comisionEstimada)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mis Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-520px)]">
            <div className="space-y-3">
              {pedidos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay pedidos en este período</p>
                </div>
              ) : (
                pedidos.map((pedido) => (
                  <div 
                    key={pedido.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{pedido.folio}</span>
                        <Badge variant={statusLabels[pedido.status]?.variant || "secondary"}>
                          {statusLabels[pedido.status]?.label || pedido.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {pedido.cliente.nombre}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(pedido.fecha_pedido), "d MMM yyyy", { locale: es })}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(pedido.total)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
