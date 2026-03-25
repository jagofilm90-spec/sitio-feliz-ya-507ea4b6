import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Package, ArrowUpDown, SlidersHorizontal, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import { getDisplayName } from "@/lib/productUtils";
import { cn } from "@/lib/utils";

interface BodegaOption {
  id: string;
  nombre: string;
}

interface Lote {
  id: string;
  producto_id: string;
  bodega_id: string | null;
  cantidad_disponible: number;
  fecha_caducidad: string | null;
  lote_referencia: string | null;
  bodega: { nombre: string } | null;
  producto: {
    codigo: string;
    nombre: string;
    marca: string | null;
    especificaciones: string | null;
    contenido_empaque: string | null;
    peso_kg: number | null;
    unidad: string;
    stock_actual: number;
    stock_minimo: number;
  };
}

export const AlmacenInventarioTab = () => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"nombre" | "stock" | "caducidad">("nombre");
  const [ajusteDialogOpen, setAjusteDialogOpen] = useState(false);
  const [loteAjuste, setLoteAjuste] = useState<Lote | null>(null);
  const [tipoAjuste, setTipoAjuste] = useState("ajuste");
  const [nuevaCantidad, setNuevaCantidad] = useState("");
  const [notasAjuste, setNotasAjuste] = useState("");
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);
  const { toast } = useToast();
  const { isGerenteAlmacen, isAdmin } = useUserRoles();
  const canAdjust = isGerenteAlmacen || isAdmin;
  const [bodegaFiltro, setBodegaFiltro] = useState<string>("todas");
  const [bodegasDisponibles, setBodegasDisponibles] = useState<BodegaOption[]>([]);

  useEffect(() => {
    supabase.from("bodegas").select("id, nombre").eq("activo", true).order("nombre").then(({ data }) => {
      setBodegasDisponibles(data || []);
    });
  }, []);

  useEffect(() => {
    loadInventario();
    const channel = supabase
      .channel('inventario-lotes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario_lotes' }, () => { loadInventario(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadInventario = async () => {
    try {
      const { data, error } = await supabase
        .from("inventario_lotes")
        .select(`
          id, producto_id, bodega_id, cantidad_disponible, fecha_caducidad, lote_referencia,
          bodega:bodega_id (nombre),
          producto:producto_id (codigo, nombre, marca, especificaciones, contenido_empaque, peso_kg, unidad, stock_actual, stock_minimo)
        `)
        .gt("cantidad_disponible", 0)
        .order("fecha_caducidad", { ascending: true });
      if (error) throw error;
      setLotes((data as unknown as Lote[]) || []);
    } catch (error) {
      console.error("Error loading inventario:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por bodega
  const lotesFiltrados = bodegaFiltro === "todas"
    ? lotes
    : lotes.filter(l => l.bodega_id === bodegaFiltro);

  // Group by product
  const productosAgrupados = lotesFiltrados.reduce((acc, lote) => {
    const key = lote.producto_id;
    if (!acc[key]) acc[key] = { producto: lote.producto, lotes: [], stockTotal: 0 };
    acc[key].lotes.push(lote);
    acc[key].stockTotal += lote.cantidad_disponible;
    return acc;
  }, {} as Record<string, { producto: Lote["producto"]; lotes: Lote[]; stockTotal: number }>);

  const filteredProductos = Object.values(productosAgrupados)
    .filter(p => p.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()));

  const sortedProductos = [...filteredProductos].sort((a, b) => {
    if (sortBy === "nombre") return a.producto.nombre.localeCompare(b.producto.nombre);
    if (sortBy === "stock") return b.stockTotal - a.stockTotal;
    if (sortBy === "caducidad") return (a.lotes[0]?.fecha_caducidad || "9999").localeCompare(b.lotes[0]?.fecha_caducidad || "9999");
    return 0;
  });

  const getStockBadge = (stockActual: number, stockMinimo: number) => {
    if (stockActual <= 0) return <Badge variant="destructive">Sin stock</Badge>;
    if (stockActual <= stockMinimo) return <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">Stock bajo</Badge>;
    return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">OK</Badge>;
  };

  const formatCaducidad = (fecha: string | null) => {
    if (!fecha) return null;
    const diffDays = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
    if (diffDays < 0) return <Badge variant="destructive">Vencido hace {Math.abs(diffDays)}d</Badge>;
    if (diffDays <= 30) return <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400">Vence en {diffDays}d</Badge>;
    return <span className="text-muted-foreground text-sm">{new Date(fecha).toLocaleDateString("es-MX")}</span>;
  };

  // Adjustment logic
  const openAjuste = (lote: Lote) => {
    setLoteAjuste(lote);
    setNuevaCantidad(lote.cantidad_disponible.toString());
    setTipoAjuste("ajuste");
    setNotasAjuste("");
    setAjusteDialogOpen(true);
  };

  const diferencia = loteAjuste ? (parseFloat(nuevaCantidad) || 0) - loteAjuste.cantidad_disponible : 0;

  const handleGuardarAjuste = async () => {
    if (!loteAjuste || diferencia === 0 || !notasAjuste.trim()) {
      if (!notasAjuste.trim()) toast({ title: "Motivo requerido", description: "Escribe el motivo del ajuste", variant: "destructive" });
      return;
    }

    setGuardandoAjuste(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const cantidadNueva = parseFloat(nuevaCantidad) || 0;

      // Update lot
      await supabase
        .from("inventario_lotes")
        .update({ cantidad_disponible: cantidadNueva })
        .eq("id", loteAjuste.id);

      // Record movement
      await supabase
        .from("inventario_movimientos")
        .insert({
          producto_id: loteAjuste.producto_id,
          cantidad: Math.abs(diferencia),
          tipo_movimiento: tipoAjuste,
          referencia: "AJUSTE-MANUAL",
          notas: notasAjuste.trim(),
          usuario_id: user.id,
        });

      toast({ title: "Ajuste registrado", description: `${diferencia > 0 ? "+" : ""}${diferencia} ${loteAjuste.producto.unidad}` });
      setAjusteDialogOpen(false);
      loadInventario();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGuardandoAjuste(false);
    }
  };

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search, bodega filter and sort */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-12 text-lg" />
        </div>
        <Select value={bodegaFiltro} onValueChange={setBodegaFiltro}>
          <SelectTrigger className="h-12 w-auto min-w-[160px]">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las bodegas</SelectItem>
            {bodegasDisponibles.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            const orders: typeof sortBy[] = ["nombre", "stock", "caducidad"];
            setSortBy(orders[(orders.indexOf(sortBy) + 1) % orders.length]);
          }}
          className="h-12 px-4"
        >
          <ArrowUpDown className="h-5 w-5 mr-2" />
          {sortBy === "nombre" ? "Nombre" : sortBy === "stock" ? "Stock" : "Caducidad"}
        </Button>
      </div>

      {/* Product list */}
      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-3">
          {sortedProductos.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron productos</p>
            </Card>
          ) : (
            sortedProductos.map(({ producto, lotes: lotesProducto, stockTotal }) => (
              <Card key={producto.codigo} className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{getDisplayName(producto)}</CardTitle>
                        <p className="text-sm text-muted-foreground">{producto.codigo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{stockTotal}</p>
                      {getStockBadge(stockTotal, producto.stock_minimo)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {lotesProducto.map(lote => (
                      <div key={lote.id} className="px-4 py-2 flex items-center justify-between bg-background">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-medium">{lote.cantidad_disponible} {producto.unidad}</span>
                          {lote.lote_referencia && <span className="text-xs text-muted-foreground">Lote: {lote.lote_referencia}</span>}
                          {lote.bodega && <Badge variant="outline" className="text-xs">{lote.bodega.nombre}</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          {formatCaducidad(lote.fecha_caducidad)}
                          {canAdjust && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Ajustar" onClick={() => openAjuste(lote)}>
                              <SlidersHorizontal className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Adjustment Dialog */}
      <Dialog open={ajusteDialogOpen} onOpenChange={setAjusteDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Ajuste de Inventario
            </DialogTitle>
            <DialogDescription>
              {loteAjuste && `${loteAjuste.producto.nombre} — Lote: ${loteAjuste.lote_referencia || "Sin ref."}`}
            </DialogDescription>
          </DialogHeader>

          {loteAjuste && (
            <div className="space-y-4 py-2">
              {/* Type */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "ajuste", label: "Corrección", emoji: "🔢" },
                  { value: "merma", label: "Merma", emoji: "💧" },
                  { value: "consumo_interno", label: "Consumo", emoji: "🏭" },
                ].map(t => (
                  <button
                    key={t.value}
                    className={cn("p-3 rounded-lg border-2 text-center transition-all", tipoAjuste === t.value ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/50")}
                    onClick={() => setTipoAjuste(t.value)}
                  >
                    <span className="text-2xl block mb-1">{t.emoji}</span>
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Current stock */}
              <div className="text-center p-4 bg-muted/50 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Stock actual en este lote</p>
                <p className="text-3xl font-bold">{loteAjuste.cantidad_disponible} <span className="text-lg text-muted-foreground">{loteAjuste.producto.unidad}</span></p>
              </div>

              {/* New quantity */}
              <div className="space-y-2">
                <Label>¿Cuántas unidades hay realmente?</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={nuevaCantidad}
                  onChange={(e) => setNuevaCantidad(e.target.value)}
                  className="h-14 text-2xl text-center font-bold"
                  autoFocus
                />
                {diferencia !== 0 && (
                  <div className={cn("text-center p-2 rounded-lg text-sm font-bold",
                    diferencia > 0 ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                  )}>
                    {diferencia > 0 ? `+${diferencia}` : diferencia} {loteAjuste.producto.unidad}
                  </div>
                )}
                {diferencia === 0 && nuevaCantidad && (
                  <p className="text-center text-sm text-muted-foreground">Sin cambio</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Motivo del ajuste *</Label>
                <Textarea
                  placeholder="Ej: Conteo físico encontró 3 menos, Producto dañado por humedad..."
                  value={notasAjuste}
                  onChange={(e) => setNotasAjuste(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col items-stretch gap-2">
            <Button
              className="h-12"
              disabled={guardandoAjuste || diferencia === 0 || !notasAjuste.trim()}
              onClick={handleGuardarAjuste}
            >
              {guardandoAjuste ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : "Confirmar Ajuste"}
            </Button>
            <Button variant="outline" onClick={() => setAjusteDialogOpen(false)} disabled={guardandoAjuste}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
