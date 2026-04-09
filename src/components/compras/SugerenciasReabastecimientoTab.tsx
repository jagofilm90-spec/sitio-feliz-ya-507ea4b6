import { useState, useMemo } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {
  AlertTriangle, Package, Search, ShoppingCart, TrendingDown,
  Clock, XCircle, CalendarDays, DollarSign} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───

interface Sugerencia {
  producto_id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  consumo_diario: number;
  consumo_semanal: number;
  dias_restantes: number;
  cantidad_sugerida: number;
  proveedor_id: string | null;
  proveedor_nombre: string | null;
  proveedor_dias_visita: string[] | null;
  proveedor_termino_pago: string | null;
  costo_unitario: number;
  costo_estimado: number;
  urgencia: "critico" | "urgente" | "bajo" | "planificar";
}

// ─── Helpers ───

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v);

const URGENCIA_CONFIG: Record<string, { label: string; color: string; icon: typeof XCircle }> = {
  critico: {
    label: "Sin stock",
    color: "bg-red-100 text-red-800 border-red-300",
    icon: XCircle},
  urgente: {
    label: "≤3 días",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: AlertTriangle},
  bajo: {
    label: "≤7 días",
    color: "bg-amber-100 text-amber-800 border-amber-300",
    icon: TrendingDown},
  planificar: {
    label: "Planificar",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: CalendarDays}};

const getUrgenciaBadge = (urgencia: string) => {
  const cfg = URGENCIA_CONFIG[urgencia];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.color} border text-[10px] px-1.5 py-0.5 flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
};

const DIAS_LABELS: Record<string, string> = {
  lunes: "Lun", martes: "Mar", miercoles: "Mié", jueves: "Jue", viernes: "Vie", sabado: "Sáb"};

// ─── Component ───

export const SugerenciasReabastecimientoTab = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUrgencia, setFilterUrgencia] = useState("todos");
  const [filterProveedor, setFilterProveedor] = useState("todos");
  const [filterCategoria, setFilterCategoria] = useState("todos");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── Fetch data ───

  const { data: sugerencias = [], isLoading } = useQuery({
    queryKey: ["sugerencias-reabastecimiento"],
    queryFn: async () => {
      // 1. Products with stock <= stock_minimo
      const { data: productos, error: prodError } = await supabase
        .from("productos")
        .select(`
          id, codigo, nombre, categoria, unidad, stock_actual, stock_minimo,
          costo_promedio_ponderado, ultimo_costo_compra, proveedor_preferido_id,
          proveedores:proveedor_preferido_id (id, nombre, dias_visita, termino_pago)
        `)
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .lte("stock_actual", supabase.rpc ? undefined as any : 0); // Will filter client-side

      if (prodError) throw prodError;

      // Filter: stock_actual <= stock_minimo (client-side for flexibility)
      const productosBajos = (productos || []).filter(
        (p: any) => (p.stock_minimo ?? 0) > 0 && (p.stock_actual ?? 0) <= (p.stock_minimo ?? 0)
      );

      if (productosBajos.length === 0) return [];

      const productoIds = productosBajos.map((p: any) => p.id);

      // 2. Consumption: salidas in last 28 days
      const fecha28Dias = new Date();
      fecha28Dias.setDate(fecha28Dias.getDate() - 28);

      const { data: movimientos } = await supabase
        .from("inventario_movimientos")
        .select("producto_id, cantidad")
        .in("producto_id", productoIds)
        .eq("tipo_movimiento", "salida")
        .gte("created_at", fecha28Dias.toISOString());

      // Aggregate consumption per product
      const consumoMap: Record<string, number> = {};
      (movimientos || []).forEach((m: any) => {
        consumoMap[m.producto_id] = (consumoMap[m.producto_id] || 0) + m.cantidad;
      });

      // 3. Alternative suppliers (for products without proveedor_preferido)
      const sinProveedor = productosBajos.filter((p: any) => !p.proveedor_preferido_id).map((p: any) => p.id);
      let proveedorAltMap: Record<string, { proveedor_id: string; nombre: string; costo: number; dias_visita: string[] | null; termino_pago: string | null }> = {};

      if (sinProveedor.length > 0) {
        const { data: ppData } = await supabase
          .from("proveedor_productos")
          .select(`
            producto_id, costo_proveedor,
            proveedores:proveedor_id (id, nombre, dias_visita, termino_pago)
          `)
          .in("producto_id", sinProveedor);

        (ppData || []).forEach((pp: any) => {
          if (pp.proveedores && !proveedorAltMap[pp.producto_id]) {
            proveedorAltMap[pp.producto_id] = {
              proveedor_id: pp.proveedores.id,
              nombre: pp.proveedores.nombre,
              costo: pp.costo_proveedor || 0,
              dias_visita: pp.proveedores.dias_visita,
              termino_pago: pp.proveedores.termino_pago};
          }
        });
      }

      // 4. Supplier costs for products WITH proveedor_preferido
      const conProveedor = productosBajos.filter((p: any) => p.proveedor_preferido_id);
      let costoProvMap: Record<string, number> = {};

      if (conProveedor.length > 0) {
        const pairs = conProveedor.map((p: any) => p.id);
        const { data: costoData } = await supabase
          .from("proveedor_productos")
          .select("producto_id, costo_proveedor, proveedor_id")
          .in("producto_id", pairs);

        (costoData || []).forEach((c: any) => {
          const prod = conProveedor.find((p: any) => p.id === c.producto_id && p.proveedor_preferido_id === c.proveedor_id);
          if (prod && c.costo_proveedor) {
            costoProvMap[c.producto_id] = c.costo_proveedor;
          }
        });
      }

      // 5. Build suggestions
      return productosBajos.map((p: any): Sugerencia => {
        const stockActual = p.stock_actual ?? 0;
        const stockMinimo = p.stock_minimo ?? 0;
        const totalSalidas = consumoMap[p.id] || 0;
        const consumoDiario = totalSalidas / 28;
        const consumoSemanal = consumoDiario * 7;
        const diasRestantes = consumoDiario > 0 ? stockActual / consumoDiario : 999;
        const cantidadSugerida = Math.max(1, Math.ceil(stockMinimo * 2 - stockActual));

        // Proveedor
        const provPref = p.proveedores as any;
        const provAlt = proveedorAltMap[p.id];
        const proveedorId = provPref?.id || provAlt?.proveedor_id || null;
        const proveedorNombre = provPref?.nombre || provAlt?.nombre || null;
        const proveedorDiasVisita = provPref?.dias_visita || provAlt?.dias_visita || null;
        const proveedorTerminoPago = provPref?.termino_pago || provAlt?.termino_pago || null;

        // Costo
        const costoUnitario = costoProvMap[p.id] || provAlt?.costo || p.costo_promedio_ponderado || p.ultimo_costo_compra || 0;
        const costoEstimado = costoUnitario * cantidadSugerida;

        // Urgencia
        let urgencia: Sugerencia["urgencia"] = "planificar";
        if (stockActual <= 0) urgencia = "critico";
        else if (diasRestantes <= 3) urgencia = "urgente";
        else if (diasRestantes <= 7) urgencia = "bajo";

        return {
          producto_id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          categoria: p.categoria,
          unidad: p.unidad,
          stock_actual: stockActual,
          stock_minimo: stockMinimo,
          consumo_diario: Math.round(consumoDiario * 10) / 10,
          consumo_semanal: Math.round(consumoSemanal * 10) / 10,
          dias_restantes: Math.round(diasRestantes),
          cantidad_sugerida: cantidadSugerida,
          proveedor_id: proveedorId,
          proveedor_nombre: proveedorNombre,
          proveedor_dias_visita: proveedorDiasVisita,
          proveedor_termino_pago: proveedorTerminoPago,
          costo_unitario: costoUnitario,
          costo_estimado: costoEstimado,
          urgencia};
      }).sort((a, b) => {
        const order = { critico: 0, urgente: 1, bajo: 2, planificar: 3 };
        return order[a.urgencia] - order[b.urgencia];
      });
    },
    refetchInterval: 60000});

  // ─── Derived data ───

  const filtered = useMemo(() => {
    return sugerencias.filter((s) => {
      const matchSearch = !searchTerm ||
        s.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchUrgencia = filterUrgencia === "todos" || s.urgencia === filterUrgencia;
      const matchProveedor = filterProveedor === "todos" || s.proveedor_nombre === filterProveedor;
      const matchCategoria = filterCategoria === "todos" || s.categoria === filterCategoria;
      return matchSearch && matchUrgencia && matchProveedor && matchCategoria;
    });
  }, [sugerencias, searchTerm, filterUrgencia, filterProveedor, filterCategoria]);

  const proveedoresUnicos = [...new Set(sugerencias.map(s => s.proveedor_nombre).filter(Boolean))] as string[];
  const categoriasUnicas = [...new Set(sugerencias.map(s => s.categoria).filter(Boolean))] as string[];

  const kpis = useMemo(() => ({
    total: sugerencias.length,
    criticos: sugerencias.filter(s => s.urgencia === "critico").length,
    costoTotal: sugerencias.reduce((sum, s) => sum + s.costo_estimado, 0),
    proveedores: new Set(sugerencias.map(s => s.proveedor_id).filter(Boolean)).size}), [sugerencias]);

  // ─── Selection ───

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.producto_id)));
    }
  };

  const selectedSugerencias = filtered.filter(s => selectedIds.has(s.producto_id));

  // ─── Render ───

  if (isLoading) {
    return (
      <AlmasaLoading size={48} />
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="text-xs text-muted-foreground">Productos a reabastecer</p>
          <p className="text-2xl font-bold">{kpis.total}</p>
        </div>
        <div className="p-3 rounded-lg border bg-red-50 border-red-200">
          <p className="text-xs text-red-700">Sin stock (críticos)</p>
          <p className="text-2xl font-bold text-red-600">{kpis.criticos}</p>
        </div>
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="text-xs text-muted-foreground">Costo total estimado</p>
          <p className="text-2xl font-bold">{formatCurrency(kpis.costoTotal)}</p>
        </div>
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="text-xs text-muted-foreground">Proveedores involucrados</p>
          <p className="text-2xl font-bold">{kpis.proveedores}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar producto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterUrgencia} onValueChange={setFilterUrgencia}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="Urgencia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="critico">Sin stock</SelectItem>
            <SelectItem value="urgente">≤3 días</SelectItem>
            <SelectItem value="bajo">≤7 días</SelectItem>
            <SelectItem value="planificar">Planificar</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterProveedor} onValueChange={setFilterProveedor}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs"><SelectValue placeholder="Proveedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {proveedoresUnicos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {categoriasUnicas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 mb-4 rounded-lg border bg-primary/5 border-primary/20">
          <span className="text-sm font-medium">{selectedIds.size} producto{selectedIds.size > 1 ? "s" : ""} seleccionado{selectedIds.size > 1 ? "s" : ""}</span>
          <Button
            size="sm"
            onClick={() => {
              // Group by proveedor and navigate
              const porProveedor = new Map<string, Sugerencia[]>();
              selectedSugerencias.forEach(s => {
                const key = s.proveedor_nombre || "Sin proveedor";
                if (!porProveedor.has(key)) porProveedor.set(key, []);
                porProveedor.get(key)!.push(s);
              });
              // Navigate to OC creation with first proveedor group
              const firstGroup = Array.from(porProveedor.entries())[0];
              if (firstGroup) {
                navigate("/compras?tab=ordenes");
              }
            }}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Crear OC ({selectedIds.size})
          </Button>
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-muted-foreground mb-3">
        Mostrando {filtered.length} de {sugerencias.length} sugerencias
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{sugerencias.length === 0 ? "Todos los productos tienen stock suficiente" : "No se encontraron sugerencias con esos filtros"}</p>
        </div>
      ) : isMobile ? (
        /* ─── Mobile Cards ─── */
        <div className="space-y-3">
          {filtered.map(s => (
            <div
              key={s.producto_id}
              className={cn(
                "p-3 rounded-lg border space-y-2",
                s.urgencia === "critico" && "border-red-300 bg-red-50/50",
                s.urgencia === "urgente" && "border-orange-300 bg-orange-50/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={selectedIds.has(s.producto_id)} onCheckedChange={() => toggleSelect(s.producto_id)} />
                  <div>
                    <p className="font-medium text-sm">{s.nombre}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{s.codigo}</p>
                  </div>
                </div>
                {getUrgenciaBadge(s.urgencia)}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock:</span>
                  <span className={cn("font-medium", s.stock_actual <= 0 && "text-red-600")}>{s.stock_actual} / {s.stock_minimo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consumo/sem:</span>
                  <span className="font-medium">{s.consumo_semanal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Días restantes:</span>
                  <span className={cn("font-medium", s.dias_restantes <= 3 && "text-red-600")}>{s.dias_restantes > 900 ? "∞" : s.dias_restantes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sugerido:</span>
                  <span className="font-bold">{s.cantidad_sugerida} {s.unidad}</span>
                </div>
              </div>
              {s.proveedor_nombre && (
                <div className="flex items-center justify-between pt-1 border-t text-xs">
                  <span className="text-muted-foreground">{s.proveedor_nombre}</span>
                  <span className="font-medium">{formatCurrency(s.costo_estimado)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* ─── Desktop Table ─── */
        <div className="rounded-md border overflow-auto">
          <Table className="table-fixed w-full">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-8 px-2">
                  <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead className="w-[60px] px-2 text-[10px]">Urgencia</TableHead>
                <TableHead className="px-2 text-[10px]">Producto</TableHead>
                <TableHead className="w-[80px] px-2 text-[10px] text-center">Stock</TableHead>
                <TableHead className="w-[60px] px-2 text-[10px] text-right">Cons/sem</TableHead>
                <TableHead className="w-[55px] px-2 text-[10px] text-right">Días</TableHead>
                <TableHead className="w-[70px] px-2 text-[10px] text-right">Sugerido</TableHead>
                <TableHead className="px-2 text-[10px]">Proveedor</TableHead>
                <TableHead className="w-[80px] px-2 text-[10px] text-right">Costo est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow
                  key={s.producto_id}
                  className={cn(
                    "h-9",
                    s.urgencia === "critico" && "bg-red-50",
                    s.urgencia === "urgente" && "bg-orange-50",
                  )}
                >
                  <TableCell className="px-2">
                    <Checkbox checked={selectedIds.has(s.producto_id)} onCheckedChange={() => toggleSelect(s.producto_id)} />
                  </TableCell>
                  <TableCell className="px-2">{getUrgenciaBadge(s.urgencia)}</TableCell>
                  <TableCell className="px-2">
                    <div>
                      <span className="text-xs font-medium">{s.nombre}</span>
                      <span className="block text-[10px] text-muted-foreground font-mono">{s.codigo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 text-center">
                    <span className={cn("text-xs font-medium", s.stock_actual <= 0 && "text-red-600 font-bold")}>
                      {s.stock_actual}
                    </span>
                    <span className="text-[10px] text-muted-foreground"> / {s.stock_minimo}</span>
                  </TableCell>
                  <TableCell className="px-2 text-right text-xs">{s.consumo_semanal}</TableCell>
                  <TableCell className="px-2 text-right">
                    <span className={cn("text-xs", s.dias_restantes <= 3 && "text-red-600 font-bold")}>
                      {s.dias_restantes > 900 ? "∞" : s.dias_restantes}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 text-right">
                    <span className="text-xs font-bold">{s.cantidad_sugerida}</span>
                    <span className="text-[10px] text-muted-foreground ml-0.5">{s.unidad}</span>
                  </TableCell>
                  <TableCell className="px-2">
                    {s.proveedor_nombre ? (
                      <div>
                        <span className="text-xs">{s.proveedor_nombre}</span>
                        {s.proveedor_dias_visita && s.proveedor_dias_visita.length > 0 && (
                          <span className="block text-[10px] text-muted-foreground">
                            {s.proveedor_dias_visita.map(d => DIAS_LABELS[d] || d).join(", ")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Sin proveedor</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 text-right text-xs font-medium">
                    {s.costo_estimado > 0 ? formatCurrency(s.costo_estimado) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
};

export default SugerenciasReabastecimientoTab;
