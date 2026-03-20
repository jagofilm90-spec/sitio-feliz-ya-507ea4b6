import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert, Package, CreditCard, Radio, TrendingUp, Timer, Bug, BadgeCheck } from "lucide-react";
import type { AlertaUrgente } from "./useDashboardData";

const iconMap: Record<string, any> = {
  pedidos_sin_autorizar: ShieldAlert,
  chofer_sin_gps: Radio,
  stock_cero: Package,
  credito_excedido: CreditCard,
  pagos_por_validar: CreditCard,
  precios_por_revisar: TrendingUp,
  lotes_vencidos: Timer,
  fumigaciones_vencidas: Bug,
  anticipos_pendientes: CreditCard,
  creditos_proveedores: BadgeCheck,
};

const colorMap: Record<string, string> = {
  pedidos_sin_autorizar: 'bg-destructive/10 border-destructive/30 text-destructive',
  chofer_sin_gps: 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400',
  stock_cero: 'bg-destructive/10 border-destructive/30 text-destructive',
  credito_excedido: 'bg-destructive/10 border-destructive/30 text-destructive',
  pagos_por_validar: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
  precios_por_revisar: 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400',
  lotes_vencidos: 'bg-destructive/10 border-destructive/30 text-destructive',
  fumigaciones_vencidas: 'bg-destructive/10 border-destructive/30 text-destructive',
  anticipos_pendientes: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
  creditos_proveedores: 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400',
};

interface Props {
  alertas: AlertaUrgente[];
}

export const AlertasUrgentes = ({ alertas }: Props) => {
  const navigate = useNavigate();

  if (alertas.length === 0) return null;

  return (
    <div className="space-y-2">
      {alertas.map((alerta) => {
        const Icon = iconMap[alerta.tipo];
        const colors = colorMap[alerta.tipo];
        return (
          <div
            key={alerta.tipo}
            className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${colors}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="h-4 w-4 shrink-0" />
              <Badge variant="destructive" className="shrink-0">{alerta.cantidad}</Badge>
              <span className="text-sm font-medium truncate">
                {alerta.tipo === 'pedidos_sin_autorizar' && 'Pedidos sin autorizar (>24h)'}
                {alerta.tipo === 'chofer_sin_gps' && `Choferes sin señal GPS (>30 min)`}
                {alerta.tipo === 'stock_cero' && 'Productos con stock en cero'}
                {alerta.tipo === 'credito_excedido' && 'Clientes con crédito excedido'}
                {alerta.tipo === 'pagos_por_validar' && 'Pagos pendientes de validación'}
                {alerta.tipo === 'precios_por_revisar' && 'Precios por revisar (costo subió)'}
                {alerta.tipo === 'lotes_vencidos' && 'Lotes vencidos en inventario'}
                {alerta.tipo === 'fumigaciones_vencidas' && 'Fumigaciones vencidas'}
                {alerta.tipo === 'anticipos_pendientes' && 'Anticipos pagados sin recibir mercancía'}
                {alerta.tipo === 'creditos_proveedores' && 'Créditos a favor pendientes de proveedores'}
              </span>
              {alerta.detalle && <span className="text-xs truncate opacity-75">{alerta.detalle}</span>}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-8 text-xs"
              onClick={() => navigate(alerta.ruta)}
            >
              {alerta.botonTexto}
            </Button>
          </div>
        );
      })}
    </div>
  );
};
