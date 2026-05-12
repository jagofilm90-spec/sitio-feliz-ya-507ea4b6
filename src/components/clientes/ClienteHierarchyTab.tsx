import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Building2, MapPin, ArrowRight, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClienteHierarchy, useBalanceConsolidado, HierarchyNode } from "@/hooks/useClienteHierarchy";

const fmt = (n: number) => `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

const TIPO_BADGE: Record<string, { color: string; label: string; icon: any }> = {
  matriz: { color: "bg-blue-100 text-blue-800", label: "Matriz", icon: Building2 },
  sucursal: { color: "bg-amber-100 text-amber-800", label: "Sucursal", icon: MapPin },
  individual: { color: "bg-gray-100 text-gray-700", label: "Individual", icon: Users },
};

interface Props {
  clienteId: string;
  tipoCliente?: string;
}

export function ClienteHierarchyTab({ clienteId, tipoCliente }: Props) {
  const navigate = useNavigate();
  const { data: hierarchy, isLoading } = useClienteHierarchy(clienteId);
  const isMatriz = tipoCliente === "matriz" || hierarchy?.some((h) => h.nivel === 0 && h.cliente_id === clienteId);
  const { data: balance } = useBalanceConsolidado(isMatriz ? clienteId : undefined);

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const nodes = hierarchy || [];
  const hasHierarchy = nodes.length > 1;

  if (!hasHierarchy) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground opacity-30 mb-3" />
          <p className="text-sm text-muted-foreground">Este cliente es individual (sin jerarquía).</p>
          <p className="text-xs text-muted-foreground mt-1">
            Para crear una jerarquía, asigna este cliente como padre de otro desde la edición del cliente hijo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance consolidado (solo matriz) */}
      {isMatriz && balance && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Balance Consolidado del Grupo</span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">Clientes</p>
                <p className="text-lg font-bold font-mono">{balance.total_clientes}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Límite</p>
                <p className="text-lg font-bold font-mono">{fmt(balance.limite_consolidado)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Balance</p>
                <p className="text-lg font-bold font-mono text-amber-700">{fmt(balance.balance_consolidado)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Disponible</p>
                <p className={`text-lg font-bold font-mono ${balance.disponible_consolidado < 0 ? "text-red-700" : "text-green-700"}`}>
                  {fmt(balance.disponible_consolidado)}
                </p>
              </div>
            </div>
            {balance.clientes_en_hold > 0 && (
              <p className="text-xs text-red-700 mt-2">{balance.clientes_en_hold} cliente(s) en hold</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tree */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#c41e3a]" /> Jerarquía de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {nodes.map((node) => {
              const isCurrent = node.cliente_id === clienteId;
              const tipoCfg = TIPO_BADGE[node.tipo_cliente] || TIPO_BADGE.individual;
              const Icon = tipoCfg.icon;

              return (
                <div
                  key={node.cliente_id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    isCurrent ? "bg-[#c41e3a]/5 border border-[#c41e3a]/20" : "hover:bg-gray-50"
                  }`}
                  style={{ paddingLeft: `${12 + node.nivel * 24}px` }}
                  onClick={() => !isCurrent && navigate(`/clientes/${node.cliente_id}`)}
                >
                  {node.nivel > 0 && (
                    <span className="text-gray-300 text-xs">└─</span>
                  )}
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isCurrent ? "text-[#c41e3a]" : "text-muted-foreground"}`} />
                  <span className={`text-sm flex-1 ${isCurrent ? "font-semibold" : ""}`}>
                    {node.nombre}
                  </span>
                  <Badge variant="outline" className={`text-[9px] ${tipoCfg.color}`}>
                    {tipoCfg.label}
                  </Badge>
                  {node.hereda_credito && (
                    <Badge variant="outline" className="text-[9px]">Hereda crédito</Badge>
                  )}
                  {!isCurrent && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
