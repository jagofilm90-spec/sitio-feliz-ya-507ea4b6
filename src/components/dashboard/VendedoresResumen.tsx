import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrencyCompact } from "@/lib/formatDashboard";

interface VendedorStats {
  id: string;
  nombre: string;
  ventasMes: number;
  pedidosMes: number;
  clientesActivos: number;
  carteraPorCobrar: number;
}

const medals = ['🥇', '🥈', '🥉'];

export const VendedoresResumen = () => {
  const navigate = useNavigate();
  const [vendedores, setVendedores] = useState<VendedorStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendedores();
  }, []);

  const loadVendedores = async () => {
    try {
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Get vendedores and their orders in 2 queries instead of N+1
      const [empRes, pedidosRes, clientesRes] = await Promise.all([
        supabase.from("empleados").select("id, nombre_completo, user_id").eq("puesto", "vendedor").eq("activo", true),
        supabase.from("pedidos").select("total, cliente_id, vendedor_id").gte("created_at", inicioMes).in("status", ["entregado", "en_ruta", "pendiente", "por_autorizar"]),
        supabase.from("clientes").select("id, saldo_pendiente, vendedor_asignado").gt("saldo_pendiente", 0),
      ]);

      if (empRes.error) throw empRes.error;
      const empleados = empRes.data || [];
      const pedidos = pedidosRes.data || [];
      const clientes = clientesRes.data || [];

      const stats: VendedorStats[] = empleados.map(emp => {
        const misPedidos = pedidos.filter(p => p.vendedor_id === emp.user_id);
        const misClientes = clientes.filter(c => c.vendedor_asignado === emp.user_id);
        return {
          id: emp.id,
          nombre: emp.nombre_completo,
          ventasMes: misPedidos.reduce((s, p) => s + (p.total || 0), 0),
          pedidosMes: misPedidos.length,
          clientesActivos: new Set(misPedidos.map(p => p.cliente_id)).size,
          carteraPorCobrar: misClientes.reduce((s, c) => s + (c.saldo_pendiente || 0), 0),
        };
      });

      stats.sort((a, b) => b.ventasMes - a.ventasMes);
      setVendedores(stats);
    } catch (error) {
      console.error("Error loading vendedores:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></CardHeader>
        <CardContent><div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div></CardContent>
      </Card>
    );
  }

  const maxVentas = Math.max(...vendedores.map(v => v.ventasMes), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Rendimiento Vendedores
        </CardTitle>
        <CardDescription>Ventas y cartera del mes actual</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[350px]">
          {vendedores.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Sin vendedores activos</p>
            </div>
          ) : (
            <div className="divide-y">
              {vendedores.map((vendedor, index) => {
                const porcentaje = (vendedor.ventasMes / maxVentas) * 100;
                return (
                  <div
                    key={vendedor.id}
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/empleados?id=${vendedor.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {index < 3 ? (
                          <span className="text-lg">{medals[index]}</span>
                        ) : (
                          <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                            {index + 1}
                          </Badge>
                        )}
                        <span className="font-medium">{vendedor.nombre}</span>
                      </div>
                      <span className="font-bold text-lg">{formatCurrencyCompact(vendedor.ventasMes)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${porcentaje}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>{vendedor.pedidosMes} pedidos</span>
                        <span>{vendedor.clientesActivos} clientes</span>
                      </div>
                      <span className={vendedor.carteraPorCobrar > 0 ? "text-amber-600" : ""}>
                        Cartera: {formatCurrencyCompact(vendedor.carteraPorCobrar)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
