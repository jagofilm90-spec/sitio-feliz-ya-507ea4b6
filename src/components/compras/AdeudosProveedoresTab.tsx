import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DollarSign,
  FileText,
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  AlertTriangle,
  Clock,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { ProcesarPagoOCDialog } from "./ProcesarPagoOCDialog";

interface OrdenConAdeudo {
  id: string;
  folio: string;
  fecha_orden: string;
  total: number;
  total_ajustado: number | null;
  monto_pagado: number | null;
  status: string;
  status_pago: string;
  tipo_pago: string | null;
  proveedor_id: string | null;
  proveedor_nombre_manual: string | null;
  proveedores: {
    id: string;
    nombre: string;
    telefono: string | null;
    email: string | null;
  } | null;
  adeudo: number;
}

interface ProveedorAdeudo {
  proveedorId: string | null;
  proveedorNombre: string;
  totalAdeudo: number;
  ordenes: OrdenConAdeudo[];
  tieneAnticipado: boolean;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
};

const AdeudosProveedoresTab = () => {
  const queryClient = useQueryClient();
  const [filtroProveedor, setFiltroProveedor] = useState<string>("todos");
  const [filtroStatusPago, setFiltroStatusPago] = useState<string>("todos");
  const [filtroTipoPago, setFiltroTipoPago] = useState<string>("todos");
  const [expandedProveedores, setExpandedProveedores] = useState<Set<string>>(
    new Set()
  );
  const [selectedOC, setSelectedOC] = useState<OrdenConAdeudo | null>(null);
  const [showPagoDialog, setShowPagoDialog] = useState(false);

  // Query principal para obtener OCs con adeudos pendientes
  const { data: ordenesConAdeudo = [], isLoading } = useQuery({
    queryKey: ["ordenes-con-adeudo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select(
          `
          id, folio, fecha_orden, total, total_ajustado, 
          monto_pagado, status, status_pago, tipo_pago,
          proveedor_id, proveedor_nombre_manual,
          proveedores (id, nombre, telefono, email)
        `
        )
        .in("status_pago", ["pendiente", "parcial"])
        .or('status.in.(recibida,completada,cerrada,parcial),tipo_pago.eq.anticipado')
        .order("fecha_orden", { ascending: false });

      if (error) throw error;

      return (data || []).map((oc: any) => ({
        ...oc,
        adeudo:
          (oc.total_ajustado || oc.total) - (oc.monto_pagado || 0),
      })) as OrdenConAdeudo[];
    },
    refetchInterval: 30000,
  });

  // Agrupar por proveedor con filtros aplicados
  const adeudosPorProveedor = useMemo(() => {
    let filtered = ordenesConAdeudo;

    // Aplicar filtros
    if (filtroStatusPago !== "todos") {
      filtered = filtered.filter((oc) => oc.status_pago === filtroStatusPago);
    }
    if (filtroTipoPago !== "todos") {
      filtered = filtered.filter((oc) => oc.tipo_pago === filtroTipoPago);
    }

    const map = new Map<string, ProveedorAdeudo>();

    filtered.forEach((oc) => {
      const nombre =
        oc.proveedores?.nombre || oc.proveedor_nombre_manual || "Sin proveedor";

      if (!map.has(nombre)) {
        map.set(nombre, {
          proveedorId: oc.proveedor_id,
          proveedorNombre: nombre,
          totalAdeudo: 0,
          ordenes: [],
          tieneAnticipado: false,
        });
      }

      const entry = map.get(nombre)!;
      entry.totalAdeudo += oc.adeudo;
      entry.ordenes.push(oc);
      if (oc.tipo_pago === "anticipado") entry.tieneAnticipado = true;
    });

    let result = Array.from(map.values()).sort(
      (a, b) => b.totalAdeudo - a.totalAdeudo
    );

    // Filtrar por proveedor específico
    if (filtroProveedor !== "todos") {
      result = result.filter((p) => p.proveedorNombre === filtroProveedor);
    }

    return result;
  }, [ordenesConAdeudo, filtroProveedor, filtroStatusPago, filtroTipoPago]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const totalAdeudado = adeudosPorProveedor.reduce(
      (sum, p) => sum + p.totalAdeudo,
      0
    );
    const totalOCsPendientes = adeudosPorProveedor.reduce(
      (sum, p) => sum + p.ordenes.length,
      0
    );
    const proveedoresConAdeudo = adeudosPorProveedor.length;
    const ocsAnticipadas = adeudosPorProveedor.reduce(
      (sum, p) => sum + p.ordenes.filter((o) => o.tipo_pago === "anticipado").length,
      0
    );

    return {
      totalAdeudado,
      totalOCsPendientes,
      proveedoresConAdeudo,
      ocsAnticipadas,
    };
  }, [adeudosPorProveedor]);

  // Lista única de proveedores para el filtro
  const proveedoresUnicos = useMemo(() => {
    const nombres = new Set<string>();
    ordenesConAdeudo.forEach((oc) => {
      const nombre =
        oc.proveedores?.nombre || oc.proveedor_nombre_manual || "Sin proveedor";
      nombres.add(nombre);
    });
    return Array.from(nombres).sort();
  }, [ordenesConAdeudo]);

  // Datos para el gráfico pie
  const chartData = useMemo(() => {
    return adeudosPorProveedor.slice(0, 5).map((p, index) => ({
      name: p.proveedorNombre.length > 20 
        ? p.proveedorNombre.substring(0, 20) + "..." 
        : p.proveedorNombre,
      value: p.totalAdeudo,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [adeudosPorProveedor]);

  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
    return config;
  }, [chartData]);

  const toggleProveedor = (nombre: string) => {
    setExpandedProveedores((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nombre)) {
        newSet.delete(nombre);
      } else {
        newSet.add(nombre);
      }
      return newSet;
    });
  };

  const handleProcesarPago = (orden: OrdenConAdeudo) => {
    setSelectedOC(orden);
    setShowPagoDialog(true);
  };

  const getStatusPagoBadge = (status: string) => {
    switch (status) {
      case "pendiente":
        return <Badge variant="destructive">Pendiente</Badge>;
      case "parcial":
        return <Badge className="bg-amber-500 text-white">Parcial</Badge>;
      case "pagado":
        return <Badge className="bg-green-600 text-white">Pagado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusOCBadge = (status: string) => {
    switch (status) {
      case "borrador":
        return <Badge variant="secondary">Borrador</Badge>;
      case "pendiente":
        return <Badge variant="outline">Pendiente</Badge>;
      case "autorizada":
        return <Badge className="bg-blue-500 text-white">Autorizada</Badge>;
      case "enviada":
        return <Badge className="bg-purple-500 text-white">Enviada</Badge>;
      case "recibida":
        return <Badge className="bg-green-600 text-white">Recibida</Badge>;
      case "cerrada":
        return <Badge className="bg-gray-500 text-white">Cerrada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-amber-600" />
          Adeudos a Proveedores
        </h2>
        <p className="text-sm text-muted-foreground">
          Gestión de pagos pendientes y cuentas por pagar
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adeudado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(kpis.totalAdeudado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Suma de todos los adeudos pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OCs Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalOCsPendientes}</div>
            {kpis.ocsAnticipadas > 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {kpis.ocsAnticipadas} con pago anticipado
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Proveedores con Adeudo
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.proveedoresConAdeudo}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Proveedores únicos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Proveedor</label>
              <Select value={filtroProveedor} onValueChange={setFiltroProveedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los proveedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los proveedores</SelectItem>
                  {proveedoresUnicos.map((nombre) => (
                    <SelectItem key={nombre} value={nombre}>
                      {nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <label className="text-sm font-medium mb-1 block">Status Pago</label>
              <Select value={filtroStatusPago} onValueChange={setFiltroStatusPago}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <label className="text-sm font-medium mb-1 block">Tipo de Pago</label>
              <Select value={filtroTipoPago} onValueChange={setFiltroTipoPago}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="contra_entrega">Contra Entrega</SelectItem>
                  <SelectItem value="anticipado">Anticipado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido principal: Cards y Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cards por Proveedor */}
        <div className="lg:col-span-2 space-y-4">
          {adeudosPorProveedor.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingDown className="h-12 w-12 mx-auto text-green-500 mb-3" />
                <h3 className="text-lg font-medium">Sin adeudos pendientes</h3>
                <p className="text-sm text-muted-foreground">
                  No hay órdenes de compra con pagos pendientes
                </p>
              </CardContent>
            </Card>
          ) : (
            adeudosPorProveedor.map((proveedor) => (
              <Card key={proveedor.proveedorNombre}>
                <Collapsible
                  open={expandedProveedores.has(proveedor.proveedorNombre)}
                  onOpenChange={() => toggleProveedor(proveedor.proveedorNombre)}
                >
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between py-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {expandedProveedores.has(proveedor.proveedorNombre) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <CardTitle className="text-base flex items-center gap-2">
                            {proveedor.proveedorNombre}
                            {proveedor.tieneAnticipado && (
                              <Badge
                                variant="outline"
                                className="text-amber-600 border-amber-500"
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Anticipo req.
                              </Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {proveedor.ordenes.length} OC
                            {proveedor.ordenes.length > 1 ? "s" : ""} pendiente
                            {proveedor.ordenes.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-destructive">
                          {formatCurrency(proveedor.totalAdeudo)}
                        </p>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Folio</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Status OC</TableHead>
                            <TableHead>Status Pago</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Pagado</TableHead>
                            <TableHead className="text-right">Adeudo</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {proveedor.ordenes.map((orden) => (
                            <TableRow key={orden.id}>
                              <TableCell className="font-medium">
                                {orden.folio}
                              </TableCell>
                              <TableCell>
                                {format(new Date(orden.fecha_orden), "dd/MM/yy", {
                                  locale: es,
                                })}
                              </TableCell>
                              <TableCell>{getStatusOCBadge(orden.status)}</TableCell>
                              <TableCell>
                                {getStatusPagoBadge(orden.status_pago)}
                                {orden.tipo_pago === "anticipado" && (
                                  <Badge
                                    variant="outline"
                                    className="ml-1 text-xs border-amber-500 text-amber-600"
                                  >
                                    Ant.
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(orden.total_ajustado || orden.total)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(orden.monto_pagado || 0)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-destructive">
                                {formatCurrency(orden.adeudo)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProcesarPago(orden);
                                  }}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  Pagar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>

        {/* Gráfico Pie */}
        <div>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Distribución por Proveedor</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            formatCurrency(value as number)
                          }
                        />
                      }
                    />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sin datos para mostrar
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Procesar Pago */}
      {selectedOC && (
        <ProcesarPagoOCDialog
          open={showPagoDialog}
          onOpenChange={(open) => {
            setShowPagoDialog(open);
            if (!open) {
              setSelectedOC(null);
              queryClient.invalidateQueries({ queryKey: ["ordenes-con-adeudo"] });
            }
          }}
          orden={{
            id: selectedOC.id,
            folio: selectedOC.folio,
            proveedor_id: selectedOC.proveedor_id,
            proveedor_nombre: selectedOC.proveedores?.nombre || selectedOC.proveedor_nombre_manual || "Sin proveedor",
            total: selectedOC.total,
            total_ajustado: selectedOC.total_ajustado,
            monto_pagado: selectedOC.monto_pagado,
            monto_devoluciones: 0,
          }}
          onOpenFacturas={() => {}}
        />
      )}
    </div>
  );
};

export default AdeudosProveedoresTab;
