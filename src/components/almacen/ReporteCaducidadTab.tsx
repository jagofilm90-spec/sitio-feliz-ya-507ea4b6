import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer, AlertTriangle, Download, Search, X, CheckCircle2, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface LoteCaducidad {
  id: string;
  producto_codigo: string;
  producto_nombre: string;
  producto_marca: string | null;
  producto_unidad: string;
  lote_referencia: string | null;
  cantidad_disponible: number;
  fecha_caducidad: string;
  bodega_nombre: string | null;
  bodega_id: string | null;
}

type EstadoCaducidad = "vencido" | "critico" | "proximo" | "vigente";

interface LoteConEstado extends LoteCaducidad {
  diasRestantes: number;
  estado: EstadoCaducidad;
}

interface ReporteCaducidadTabProps {
  onStatsUpdate?: (stats: { vencidos: number; criticos: number }) => void;
}

function getEstado(diasRestantes: number): EstadoCaducidad {
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes <= 7) return "critico";
  if (diasRestantes <= 30) return "proximo";
  return "vigente";
}

const estadoConfig: Record<EstadoCaducidad, { label: string; badgeClass: string; rowClass: string }> = {
  vencido: { label: "VENCIDO", badgeClass: "bg-destructive text-destructive-foreground", rowClass: "bg-destructive/10 dark:bg-destructive/20" },
  critico: { label: "CRÍTICO", badgeClass: "bg-orange-500 text-white", rowClass: "bg-orange-500/10 dark:bg-orange-500/20" },
  proximo: { label: "PRÓXIMO", badgeClass: "bg-yellow-500 text-white", rowClass: "bg-yellow-500/10 dark:bg-yellow-500/15" },
  vigente: { label: "VIGENTE", badgeClass: "bg-primary text-primary-foreground", rowClass: "" },
};

export const ReporteCaducidadTab = ({ onStatsUpdate }: ReporteCaducidadTabProps) => {
  const isMobile = useIsMobile();
  const [lotes, setLotes] = useState<LoteConEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [bodegas, setBodegas] = useState<{ id: string; nombre: string }[]>([]);

  // Filters
  const [filtroBodega, setFiltroBodega] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventario_lotes")
        .select(`
          id, lote_referencia, cantidad_disponible, fecha_caducidad, bodega_id,
          productos!inner(codigo, nombre, marca, unidad, maneja_caducidad),
          bodegas(nombre)
        `)
        .eq("productos.maneja_caducidad", true)
        .gt("cantidad_disponible", 0)
        .not("fecha_caducidad", "is", null)
        .order("fecha_caducidad", { ascending: true });

      if (error) throw error;

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const lotesConEstado: LoteConEstado[] = (data || []).map((item: any) => {
        const fechaCad = new Date(item.fecha_caducidad);
        fechaCad.setHours(0, 0, 0, 0);
        const diasRestantes = Math.ceil((fechaCad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: item.id,
          producto_codigo: item.productos?.codigo || "",
          producto_nombre: item.productos?.nombre || "",
          producto_marca: item.productos?.marca || null,
          producto_unidad: item.productos?.unidad || "pza",
          lote_referencia: item.lote_referencia,
          cantidad_disponible: item.cantidad_disponible,
          fecha_caducidad: item.fecha_caducidad,
          bodega_nombre: item.bodegas?.nombre || null,
          bodega_id: item.bodega_id,
          diasRestantes,
          estado: getEstado(diasRestantes),
        };
      });

      setLotes(lotesConEstado);

      // Extract unique bodegas
      const bodegasMap = new Map<string, string>();
      lotesConEstado.forEach(l => {
        if (l.bodega_id && l.bodega_nombre) bodegasMap.set(l.bodega_id, l.bodega_nombre);
      });
      setBodegas(Array.from(bodegasMap, ([id, nombre]) => ({ id, nombre })));

      // Stats callback
      const vencidos = lotesConEstado.filter(l => l.estado === "vencido").length;
      const criticos = lotesConEstado.filter(l => l.estado === "critico").length;
      onStatsUpdate?.({ vencidos, criticos });
    } catch (err) {
      console.error("Error cargando reporte FEFO:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Summary counts
  const resumen = useMemo(() => ({
    vencidos: lotes.filter(l => l.estado === "vencido").length,
    criticos: lotes.filter(l => l.estado === "critico").length,
    proximos: lotes.filter(l => l.estado === "proximo").length,
    vigentes: lotes.filter(l => l.estado === "vigente").length,
  }), [lotes]);

  // Filtered data
  const lotesFiltrados = useMemo(() => {
    return lotes.filter(l => {
      if (filtroBodega !== "todas" && l.bodega_id !== filtroBodega) return false;
      if (filtroEstado !== "todos" && l.estado !== filtroEstado) return false;
      if (filtroBusqueda) {
        const q = filtroBusqueda.toLowerCase();
        if (!l.producto_nombre.toLowerCase().includes(q) && !l.producto_codigo.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [lotes, filtroBodega, filtroEstado, filtroBusqueda]);

  const hayFiltrosActivos = filtroBodega !== "todas" || filtroEstado !== "todos" || filtroBusqueda !== "";

  const limpiarFiltros = () => {
    setFiltroBodega("todas");
    setFiltroEstado("todos");
    setFiltroBusqueda("");
  };

  const exportarCSV = () => {
    const headers = ["Fecha Caducidad", "Días Restantes", "Estado", "Código", "Producto", "Lote", "Bodega", "Stock"];
    const rows = lotesFiltrados.map(l => [
      l.fecha_caducidad,
      l.diasRestantes,
      estadoConfig[l.estado].label,
      l.producto_codigo,
      l.producto_nombre,
      l.lote_referencia || "",
      l.bodega_nombre || "",
      l.cantidad_disponible,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-fefo-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resumen.vencidos}</p>
              <p className="text-sm text-muted-foreground">🔴 Vencidos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-orange-500/10">
              <Timer className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resumen.criticos}</p>
              <p className="text-sm text-muted-foreground">🟠 Críticos (≤7d)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-yellow-500/10">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resumen.proximos}</p>
              <p className="text-sm text-muted-foreground">🟡 Próximos (8-30d)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resumen.vigentes}</p>
              <p className="text-sm text-muted-foreground">🟢 Vigentes (&gt;30d)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className={cn("flex gap-2 flex-wrap items-center", isMobile && "flex-col items-stretch")}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={filtroBusqueda}
            onChange={e => setFiltroBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroBodega} onValueChange={setFiltroBodega}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Bodega" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las bodegas</SelectItem>
            {bodegas.map(b => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="vencido">🔴 Vencidos</SelectItem>
            <SelectItem value="critico">🟠 Críticos</SelectItem>
            <SelectItem value="proximo">🟡 Próximos</SelectItem>
            <SelectItem value="vigente">🟢 Vigentes</SelectItem>
          </SelectContent>
        </Select>
        {hayFiltrosActivos && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
            <X className="h-4 w-4 mr-1" /> Limpiar
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={exportarCSV}>
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Mostrando {lotesFiltrados.length} de {lotes.length} lotes
      </p>

      {/* Table (desktop) or Cards (mobile) */}
      {lotesFiltrados.length === 0 ? (
        <Card className="p-8 text-center">
          <Timer className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground">No hay lotes con caducidad registrada</p>
        </Card>
      ) : isMobile ? (
        <div className="space-y-2">
          {lotesFiltrados.map(lote => {
            const cfg = estadoConfig[lote.estado];
            return (
              <Card key={lote.id} className={cn("border", cfg.rowClass)}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
                    <span className="text-sm font-mono text-muted-foreground">
                      {lote.diasRestantes < 0 ? `${Math.abs(lote.diasRestantes)}d vencido` : `${lote.diasRestantes}d`}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{lote.producto_codigo} — {lote.producto_nombre}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Lote: {lote.lote_referencia || "—"}</span>
                    <span>{lote.bodega_nombre || "Sin bodega"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Caduca: {new Date(lote.fecha_caducidad).toLocaleDateString("es-MX")}</span>
                    <Badge variant="outline">{lote.cantidad_disponible} {lote.producto_unidad}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha Caducidad</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Bodega</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotesFiltrados.map(lote => {
                const cfg = estadoConfig[lote.estado];
                return (
                  <TableRow key={lote.id} className={cfg.rowClass}>
                    <TableCell className="font-mono text-sm">
                      {new Date(lote.fecha_caducidad).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell className={cn("font-bold", lote.diasRestantes < 0 && "text-destructive")}>
                      {lote.diasRestantes}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{lote.producto_codigo}</span>
                      <br />
                      <span className="text-sm">{lote.producto_nombre}</span>
                    </TableCell>
                    <TableCell className="text-sm">{lote.lote_referencia || "—"}</TableCell>
                    <TableCell className="text-sm">{lote.bodega_nombre || "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {lote.cantidad_disponible} {lote.producto_unidad}
                    </TableCell>
                    <TableCell>
                      <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
