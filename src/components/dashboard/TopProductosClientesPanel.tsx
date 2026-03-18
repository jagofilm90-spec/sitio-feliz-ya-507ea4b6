import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Users, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/formatDashboard";
import type { TopProducto, TopCliente } from "./useDashboardData";

interface Props {
  topProductos: TopProducto[];
  topClientes: TopCliente[];
}

export const TopProductosClientesPanel = ({ topProductos, topClientes }: Props) => {
  const [showAllProductos, setShowAllProductos] = useState(false);
  const [showAllClientes, setShowAllClientes] = useState(false);

  const productosVisibles = showAllProductos ? topProductos : topProductos.slice(0, 5);
  const clientesVisibles = showAllClientes ? topClientes : topClientes.slice(0, 5);

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {/* Top Productos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Top Productos del Mes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {topProductos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin datos este mes</p>
          ) : (
            <>
              {productosVisibles.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs shrink-0">
                      {i + 1}
                    </Badge>
                    <span className="text-sm truncate">{p.nombre}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-sm font-semibold">{formatCurrencyCompact(p.montoTotal)}</div>
                    <div className="text-xs text-muted-foreground">{p.cantidadVendida} uds</div>
                  </div>
                </div>
              ))}
              {topProductos.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setShowAllProductos(!showAllProductos)}>
                  {showAllProductos ? <><ChevronUp className="h-4 w-4 mr-1" /> Ver menos</> : <><ChevronDown className="h-4 w-4 mr-1" /> Ver más ({topProductos.length - 5})</>}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Top Clientes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Top Clientes del Mes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {topClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin datos este mes</p>
          ) : (
            <>
              {clientesVisibles.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs shrink-0">
                      {i + 1}
                    </Badge>
                    <span className="text-sm truncate">{c.nombre}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-sm font-semibold">{formatCurrencyCompact(c.totalPesos)}</div>
                    <div className="text-xs text-muted-foreground">{c.numPedidos} pedidos</div>
                  </div>
                </div>
              ))}
              {topClientes.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setShowAllClientes(!showAllClientes)}>
                  {showAllClientes ? <><ChevronUp className="h-4 w-4 mr-1" /> Ver menos</> : <><ChevronDown className="h-4 w-4 mr-1" /> Ver más ({topClientes.length - 5})</>}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
