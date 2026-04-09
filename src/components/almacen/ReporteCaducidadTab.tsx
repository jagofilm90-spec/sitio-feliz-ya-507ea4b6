import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Timer, AlertTriangle, Download, Search, X, CheckCircle2, Clock, Trash2, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LoteCaducidad {
  id: string;
  producto_id: string;
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
  vencido: { label: "VENCIDO", badgeClass: "bg-destructive text-destructive-foreground", rowClass: "bg-destructive/10" },
  critico: { label: "CRÍTICO", badgeClass: "bg-orange-500 text-white", rowClass: "bg-orange-500/10" },
  proximo: { label: "PRÓXIMO", badgeClass: "bg-yellow-500 text-white", rowClass: "bg-yellow-500/10" },
  vigente: { label: "VIGENTE", badgeClass: "bg-primary text-primary-foreground", rowClass: "" },
};

export const ReporteCaducidadTab = ({ onStatsUpdate }: ReporteCaducidadTabProps) => {
  const isMobile = useIsMobile();
  const { isGerenteAlmacen, isAdmin } = useUserRoles();
  const canRemove = isGerenteAlmacen || isAdmin;
  const { toast } = useToast();

  const [lotes, setLotes] = useState<LoteConEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [bodegas, setBodegas] = useState<{ id: string; nombre: string }[]>([]);
  const [filtroBodega, setFiltroBodega] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");

  // Baja dialog
  const [bajaDialogOpen, setBajaDialogOpen] = useState(false);
  const [loteBaja, setLoteBaja] = useState<LoteConEstado | null>(null);
  const [tipoBaja, setTipoBaja] = useState("merma");
  const [cantidadBaja, setCantidadBaja] = useState("");
  const [notasBaja, setNotasBaja] = useState("");
  const [guardandoBaja, setGuardandoBaja] = useState(false);

  // Batch remove
  const [removerTodosOpen, setRemoverTodosOpen] = useState(false);
  const [removiendoTodos, setRemoviendoTodos] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventario_lotes")
        .select(`
          id, producto_id, lote_referencia, cantidad_disponible, fecha_caducidad, bodega_id,
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
        const diasRestantes = Math.ceil((fechaCad.getTime() - hoy.getTime()) / 86400000);
        return {
          id: item.id,
          producto_id: item.producto_id,
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
      const bodegasMap = new Map<string, string>();
      lotesConEstado.forEach(l => { if (l.bodega_id && l.bodega_nombre) bodegasMap.set(l.bodega_id, l.bodega_nombre); });
      setBodegas(Array.from(bodegasMap, ([id, nombre]) => ({ id, nombre })));
      onStatsUpdate?.({
        vencidos: lotesConEstado.filter(l => l.estado === "vencido").length,
        criticos: lotesConEstado.filter(l => l.estado === "critico").length,
      });
    } catch (err) {
      console.error("Error cargando reporte FEFO:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const resumen = useMemo(() => ({
    vencidos: lotes.filter(l => l.estado === "vencido").length,
    criticos: lotes.filter(l => l.estado === "critico").length,
    proximos: lotes.filter(l => l.estado === "proximo").length,
    vigentes: lotes.filter(l => l.estado === "vigente").length,
  }), [lotes]);

  const lotesFiltrados = useMemo(() => lotes.filter(l => {
    if (filtroBodega !== "todas" && l.bodega_id !== filtroBodega) return false;
    if (filtroEstado !== "todos" && l.estado !== filtroEstado) return false;
    if (filtroBusqueda) {
      const q = filtroBusqueda.toLowerCase();
      if (!l.producto_nombre.toLowerCase().includes(q) && !l.producto_codigo.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [lotes, filtroBodega, filtroEstado, filtroBusqueda]);

  const lotesVencidos = lotes.filter(l => l.estado === "vencido");
  const hayFiltrosActivos = filtroBodega !== "todas" || filtroEstado !== "todos" || filtroBusqueda !== "";

  const exportarCSV = () => {
    const headers = ["Fecha Caducidad", "Días Restantes", "Estado", "Código", "Producto", "Lote", "Bodega", "Stock"];
    const rows = lotesFiltrados.map(l => [l.fecha_caducidad, l.diasRestantes, estadoConfig[l.estado].label, l.producto_codigo, l.producto_nombre, l.lote_referencia || "", l.bodega_nombre || "", l.cantidad_disponible]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-fefo-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Single lot removal
  const openBaja = (lote: LoteConEstado) => {
    setLoteBaja(lote);
    setTipoBaja("merma");
    setCantidadBaja(lote.cantidad_disponible.toString());
    setNotasBaja("");
    setBajaDialogOpen(true);
  };

  const handleBaja = async () => {
    if (!loteBaja || !notasBaja.trim()) {
      toast({ title: "Motivo requerido", variant: "destructive" });
      return;
    }
    const cant = parseInt(cantidadBaja) || 0;
    if (cant <= 0 || cant > loteBaja.cantidad_disponible) {
      toast({ title: "Cantidad inválida", variant: "destructive" });
      return;
    }

    setGuardandoBaja(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("inventario_lotes").update({ cantidad_disponible: loteBaja.cantidad_disponible - cant }).eq("id", loteBaja.id);
      await supabase.from("inventario_movimientos").insert({
        producto_id: loteBaja.producto_id,
        cantidad: cant,
        tipo_movimiento: tipoBaja,
        referencia: "BAJA-CADUCIDAD",
        notas: notasBaja.trim(),
        usuario_id: user?.id || "",
      });
      toast({ title: "Lote dado de baja", description: `${cant} ${loteBaja.producto_unidad} de ${loteBaja.producto_nombre}` });
      setBajaDialogOpen(false);
      cargarDatos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGuardandoBaja(false);
    }
  };

  // Batch removal of all expired
  const handleRemoverTodos = async () => {
    setRemoviendoTodos(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      for (const lote of lotesVencidos) {
        await supabase.from("inventario_lotes").update({ cantidad_disponible: 0 }).eq("id", lote.id);
        await supabase.from("inventario_movimientos").insert({
          producto_id: lote.producto_id,
          cantidad: lote.cantidad_disponible,
          tipo_movimiento: "merma",
          referencia: "BAJA-CADUCIDAD",
          notas: "Baja masiva — caducidad vencida",
          usuario_id: user?.id || "",
        });
      }
      toast({ title: `${lotesVencidos.length} lotes dados de baja` });
      setRemoverTodosOpen(false);
      cargarDatos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setRemoviendoTodos(false);
    }
  };

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-4">
      {/* Expired alert banner */}
      {canRemove && lotesVencidos.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">{lotesVencidos.length} lote(s) vencido(s) requieren acción</p>
              <p className="text-xs text-muted-foreground">Estos productos no deben entregarse a clientes</p>
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setRemoverTodosOpen(true)}>Remover todos</Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-destructive/30"><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-destructive/10"><AlertTriangle className="w-6 h-6 text-destructive" /></div><div><p className="text-2xl font-bold">{resumen.vencidos}</p><p className="text-sm text-muted-foreground">🔴 Vencidos</p></div></CardContent></Card>
        <Card className="border-orange-500/30"><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-orange-500/10"><Timer className="w-6 h-6 text-orange-500" /></div><div><p className="text-2xl font-bold">{resumen.criticos}</p><p className="text-sm text-muted-foreground">🟠 Críticos (≤7d)</p></div></CardContent></Card>
        <Card className="border-yellow-500/30"><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-yellow-500/10"><Clock className="w-6 h-6 text-yellow-500" /></div><div><p className="text-2xl font-bold">{resumen.proximos}</p><p className="text-sm text-muted-foreground">🟡 Próximos (8-30d)</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-primary/10"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">{resumen.vigentes}</p><p className="text-sm text-muted-foreground">🟢 Vigentes (&gt;30d)</p></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className={cn("flex gap-2 flex-wrap items-center", isMobile && "flex-col items-stretch")}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar producto..." value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroBodega} onValueChange={setFiltroBodega}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Bodega" /></SelectTrigger>
          <SelectContent><SelectItem value="todas">Todas las bodegas</SelectItem>{bodegas.map(b => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="vencido">🔴 Vencidos</SelectItem><SelectItem value="critico">🟠 Críticos</SelectItem><SelectItem value="proximo">🟡 Próximos</SelectItem><SelectItem value="vigente">🟢 Vigentes</SelectItem></SelectContent>
        </Select>
        {hayFiltrosActivos && <Button variant="ghost" size="sm" onClick={() => { setFiltroBodega("todas"); setFiltroEstado("todos"); setFiltroBusqueda(""); }}><X className="h-4 w-4 mr-1" />Limpiar</Button>}
        <Button variant="outline" size="sm" onClick={exportarCSV}><Download className="h-4 w-4 mr-1" />Exportar</Button>
      </div>

      <p className="text-sm text-muted-foreground">Mostrando {lotesFiltrados.length} de {lotes.length} lotes</p>

      {/* Table / Cards */}
      {lotesFiltrados.length === 0 ? (
        <Card className="p-8 text-center"><Timer className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" /><p className="text-muted-foreground">No hay lotes con caducidad registrada</p></Card>
      ) : isMobile ? (
        <div className="space-y-2">
          {lotesFiltrados.map(lote => {
            const cfg = estadoConfig[lote.estado];
            const showAction = canRemove && lote.diasRestantes <= 7;
            return (
              <Card key={lote.id} className={cn("border", cfg.rowClass)}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground">{lote.diasRestantes < 0 ? `${Math.abs(lote.diasRestantes)}d vencido` : `${lote.diasRestantes}d`}</span>
                      {showAction && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => openBaja(lote)}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium">{lote.producto_codigo} — {lote.producto_nombre}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Lote: {lote.lote_referencia || "—"}</span><span>{lote.bodega_nombre || "Sin bodega"}</span>
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
                {canRemove && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotesFiltrados.map(lote => {
                const cfg = estadoConfig[lote.estado];
                const showAction = canRemove && lote.diasRestantes <= 7;
                return (
                  <TableRow key={lote.id} className={cfg.rowClass}>
                    <TableCell className="font-mono text-sm">{new Date(lote.fecha_caducidad).toLocaleDateString("es-MX")}</TableCell>
                    <TableCell className={cn("font-bold", lote.diasRestantes < 0 && "text-destructive")}>{lote.diasRestantes}</TableCell>
                    <TableCell><span className="font-mono text-xs text-muted-foreground">{lote.producto_codigo}</span><br /><span className="text-sm">{lote.producto_nombre}</span></TableCell>
                    <TableCell className="text-sm">{lote.lote_referencia || "—"}</TableCell>
                    <TableCell className="text-sm">{lote.bodega_nombre || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{lote.cantidad_disponible} {lote.producto_unidad}</TableCell>
                    <TableCell><Badge className={cfg.badgeClass}>{cfg.label}</Badge></TableCell>
                    {canRemove && (
                      <TableCell>
                        {showAction && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Dar de baja" onClick={() => openBaja(lote)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Single lot removal dialog */}
      <Dialog open={bajaDialogOpen} onOpenChange={setBajaDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Dar de baja</DialogTitle>
          </DialogHeader>
          {loteBaja && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="font-medium">{loteBaja.producto_nombre}</p>
                <p className="text-sm text-muted-foreground">Lote: {loteBaja.lote_referencia || "—"} · {loteBaja.cantidad_disponible} {loteBaja.producto_unidad} · Vencido hace {Math.abs(loteBaja.diasRestantes)} días</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[{ value: "merma", label: "Merma", emoji: "🗑️" }, { value: "consumo_interno", label: "Donación", emoji: "🤝" }, { value: "ajuste", label: "Devolución", emoji: "↩️" }].map(t => (
                  <button key={t.value} className={cn("p-3 rounded-lg border-2 text-center transition-all", tipoBaja === t.value ? "border-primary bg-primary/10" : "border-border")} onClick={() => setTipoBaja(t.value)}>
                    <span className="text-xl block mb-1">{t.emoji}</span>
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Cantidad a dar de baja</Label>
                <Input type="number" min="1" max={loteBaja.cantidad_disponible} value={cantidadBaja} onChange={e => setCantidadBaja(e.target.value)} className="h-12 text-lg text-center font-bold" />
              </div>

              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Textarea placeholder="Ej: Producto vencido, destrucción por norma sanitaria..." value={notasBaja} onChange={e => setNotasBaja(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col items-stretch gap-2">
            <Button className="h-12" variant="destructive" disabled={guardandoBaja || !notasBaja.trim()} onClick={handleBaja}>
              {guardandoBaja ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Procesando...</> : "Confirmar Baja"}
            </Button>
            <Button variant="outline" onClick={() => setBajaDialogOpen(false)} disabled={guardandoBaja}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch removal dialog */}
      <AlertDialog open={removerTodosOpen} onOpenChange={setRemoverTodosOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Remover {lotesVencidos.length} lotes vencidos?</AlertDialogTitle>
            <AlertDialogDescription>Se registrarán como merma en el inventario. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removiendoTodos}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoverTodos} disabled={removiendoTodos} className="bg-destructive text-destructive-foreground">
              {removiendoTodos ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Removiendo...</> : `Remover ${lotesVencidos.length} lotes`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
