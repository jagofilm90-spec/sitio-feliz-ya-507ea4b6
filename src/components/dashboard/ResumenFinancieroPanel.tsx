import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, UserPlus, UserX, Target } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/formatDashboard";
import type { ResumenFinanciero } from "./useDashboardData";

interface Props {
  data: ResumenFinanciero;
}

export const ResumenFinancieroPanel = ({ data }: Props) => {
  const stats = [
    {
      label: "Ticket Promedio",
      value: formatCurrencyCompact(data.ticketPromedio),
      icon: BarChart3,
      color: "text-primary",
    },
    {
      label: "Clientes Nuevos",
      value: data.clientesNuevosMes.toString(),
      icon: UserPlus,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Clientes Inactivos",
      value: data.clientesInactivos.toString(),
      icon: UserX,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Tasa Entregas",
      value: `${data.tasaEntregasExitosas.toFixed(0)}%`,
      icon: Target,
      color: data.tasaEntregasExitosas >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Resumen Financiero del Mes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="text-center p-3 rounded-lg bg-muted/50">
                <Icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
