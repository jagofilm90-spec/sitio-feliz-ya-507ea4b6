import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2, Loader2, Scale, Trash2, Timer, Package, ArrowDown, ArrowUp, Truck, User,
  Camera, PenTool, ArrowRight, AlertTriangle, X, Pencil,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getCompactDisplayName } from "@/lib/productUtils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CargaEvidenciasSection } from "./CargaEvidenciasSection";
import { SellosSection } from "./SellosSection";
import { FirmaChoferDialog } from "./FirmaChoferDialog";

interface PedidoEnCola {
  pedidoId: string;
  folio: string;
  clienteNombre: string;
  clienteId: string;
}

interface ProductoHoja {
  cargaProductoId: string;
  pedidoDetalleId: string;
  pedidoFolio: string;
  clienteNombre: string;
  entregaId: string;
  productoId: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  especificaciones: string | null;
  contenido_empaque: string | null;
  unidad: string;
  pesoKgUnit: number | null;
  precioPorKilo: boolean;
  cantidadSolicitada: number;
  cantidadACargar: number;
  pesoRealKg: number | null;
  loteId: string | null;
  lotesDisponibles: {
    id: string;
    lote_referencia: string | null;
    cantidad_disponible: number;
    bodega_nombre: string | null;
  }[];
  eliminado: boolean;
  confirmado: boolean;
  movimientoInventarioId: string | null;
}

interface PersonalInfo {
  choferNombre: string;
  ayudantesNombres: string[];
  vehiculoNombre: string;
  vehiculoPlaca: string;
}

interface CargaHojaInteractivaProps {
  rutaId: string;
  rutaFolio: string;
  pedidos: PedidoEnCola[];
  tiempoSeg: number;
  formatTiempo: (s: number) => string;
  onFinalizar: () => void;
  onCancelar: () => void;
  onClose?: () => void;
  cancelling: boolean;
  personal?: PersonalInfo;
}

export const CargaHojaInteractiva = ({
  rutaId, rutaFolio, pedidos, tiempoSeg, formatTiempo, onFinalizar, onCancelar, onClose, cancelling, personal,
}: CargaHojaInteractivaProps) => {
  const [productos, setProductos] = useState<ProductoHoja[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Ayudantes editing
  const [ayudantesEditNombres, setAyudantesEditNombres] = useState<string[]>(personal?.ayudantesNombres || []);
  const [ayudantesEditIds, setAyudantesEditIds] = useState<string[]>([]);
  const [allAyudantes, setAllAyudantes] = useState<{ id: string; nombre_completo: string }[]>([]);
  const [ayudantesPopoverOpen, setAyudantesPopoverOpen] = useState(false);
  const [loadingAyudantes, setLoadingAyudantes] = useState(false);

  // Post-carga flow phases: checklist → evidencias → firma
  const [fase, setFase] = useState<"checklist" | "evidencias" | "firma">("checklist");
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [llevaSellos, setLlevaSellos] = useState(true);
  const [numeroSello, setNumeroSello] = useState("");
  const [showFirma, setShowFirma] = useState(false);
  const [firmaLoading, setFirmaLoading] = useState(false);

  // Load current ayudantes_ids from ruta when popover opens
  const handleOpenAyudantesEdit = async () => {
    setAyudantesPopoverOpen(true);
    setLoadingAyudantes(true);
    try {
      const fechaHoy = format(new Date(), "yyyy-MM-dd");
      const [rutaRes, empRes, otrasRutasRes] = await Promise.all([
        supabase.from("rutas").select("ayudantes_ids").eq("id", rutaId).single(),
        supabase.from("empleados").select("id, nombre_completo").eq("puesto", "Ayudante de Chofer").eq("activo", true).order("nombre_completo"),
        supabase.from("rutas").select("ayudantes_ids").eq("fecha_ruta", fechaHoy).not("status", "eq", "cancelada").neq("id", rutaId),
      ]);
      const currentIds: string[] = rutaRes.data?.ayudantes_ids || [];
      const ayudantesEnOtrasRutas = new Set((otrasRutasRes.data || []).flatMap(r => r.ayudantes_ids || []).filter(Boolean));
      setAyudantesEditIds(currentIds);
      // Show ayudantes not in other routes, plus the ones already on this route
      setAllAyudantes((empRes.data || []).filter(a => !ayudantesEnOtrasRutas.has(a.id) || currentIds.includes(a.id)));
    } catch { }
    setLoadingAyudantes(false);
  };

  const handleToggleAyudante = (id: string) => {
    setAyudantesEditIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleGuardarAyudantes = async () => {
    try {
      await supabase.from("rutas").update({ ayudantes_ids: ayudantesEditIds.length > 0 ? ayudantesEditIds : null }).eq("id", rutaId);
      const nombres = ayudantesEditIds.map(id => allAyudantes.find(a => a.id === id)?.nombre_completo || "").filter(Boolean);
      setAyudantesEditNombres(nombres);
      setAyudantesPopoverOpen(false);
      toast.success("Ayudantes actualizados");
    } catch {
      toast.error("Error al guardar ayudantes");
    }
  };

  // Load all products for all pedidos
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const allProducts: ProductoHoja[] = [];

      for (const ped of pedidos) {
        // Get or create entrega
        let { data: entrega } = await supabase
          .from("entregas").select("id").eq("pedido_id", ped.pedidoId).eq("ruta_id", rutaId).limit(1).maybeSingle();

        if (!entrega) {
          const { data: newE } = await supabase.from("entregas")
            .insert({ pedido_id: ped.pedidoId, ruta_id: rutaId, orden_entrega: pedidos.indexOf(ped) + 1 })
            .select("id").single();
          entrega = newE;
        }
        if (!entrega) continue;

        // Get or create carga_productos
        let { data: cargaProds } = await supabase
          .from("carga_productos")
          .select("id, pedido_detalle_id, cantidad_solicitada, cantidad_cargada, cargado, lote_id, peso_real_kg, movimiento_inventario_id")
          .eq("entrega_id", entrega.id);

        if (!cargaProds || cargaProds.length === 0) {
          const { data: detalles } = await supabase
            .from("pedidos_detalles").select("id, cantidad").eq("pedido_id", ped.pedidoId);

          if (detalles && detalles.length > 0) {
            const { data: insertados } = await supabase.from("carga_productos")
              .insert(detalles.map(d => ({
                entrega_id: entrega!.id, pedido_detalle_id: d.id,
                cantidad_solicitada: d.cantidad, cantidad_cargada: 0, cargado: false,
              })))
              .select("id, pedido_detalle_id, cantidad_solicitada, cantidad_cargada, cargado, lote_id, peso_real_kg, movimiento_inventario_id");
            cargaProds = insertados;
          }
        }

        // Enrich with product info
        for (const cp of cargaProds || []) {
          const { data: detalle } = await supabase
            .from("pedidos_detalles")
            .select("producto:productos(id, codigo, nombre, marca, especificaciones, contenido_empaque, peso_kg, unidad, precio_por_kilo)")
            .eq("id", cp.pedido_detalle_id).single();

          const prod = (detalle?.producto as any) || { id: "", codigo: "N/A", nombre: "N/A", marca: null, especificaciones: null, contenido_empaque: null, peso_kg: null, unidad: "unidad", precio_por_kilo: false };

          const { data: lotes } = await supabase
            .from("inventario_lotes")
            .select("id, lote_referencia, cantidad_disponible, bodega_id, bodega:bodegas(nombre)")
            .eq("producto_id", prod.id).gt("cantidad_disponible", 0)
            .order("fecha_caducidad", { ascending: true, nullsFirst: false });

          allProducts.push({
            cargaProductoId: cp.id,
            pedidoDetalleId: cp.pedido_detalle_id,
            pedidoFolio: ped.folio,
            clienteNombre: ped.clienteNombre,
            entregaId: entrega.id,
            productoId: prod.id,
            codigo: prod.codigo,
            nombre: prod.nombre,
            marca: prod.marca,
            especificaciones: prod.especificaciones,
            contenido_empaque: prod.contenido_empaque,
            unidad: prod.unidad,
            pesoKgUnit: prod.peso_kg,
            precioPorKilo: prod.precio_por_kilo,
            cantidadSolicitada: cp.cantidad_solicitada,
            cantidadACargar: cp.cantidad_cargada || cp.cantidad_solicitada,
            pesoRealKg: cp.peso_real_kg,
            loteId: cp.lote_id || (lotes && lotes.length > 0 ? lotes[0].id : null),
            lotesDisponibles: (lotes || []).map(l => ({
              id: l.id, lote_referencia: l.lote_referencia,
              cantidad_disponible: l.cantidad_disponible,
              bodega_nombre: (l.bodega as any)?.nombre || null,
            })),
            eliminado: false,
            confirmado: cp.cargado || false,
            movimientoInventarioId: cp.movimiento_inventario_id || null,
          });
        }
      }

      setProductos(allProducts);

      // Restore fase if carga was already confirmed
      if (allProducts.length > 0 && allProducts.every(p => !!p.movimientoInventarioId)) {
        // Check if we should go to evidencias or firma
        const { data: rutaData } = await supabase.from("rutas").select("lleva_sellos, numero_sello_salida").eq("id", rutaId).single();
        // If already confirmed, go to evidencias phase
        setFase("evidencias");
        if (rutaData) {
          setLlevaSellos(rutaData.lleva_sellos ?? true);
          setNumeroSello(rutaData.numero_sello_salida || "");
        }
      }

      setLoading(false);
    };
    load();
  }, [rutaId, pedidos]);

  // Weight calculations
  const productosActivos = productos.filter(p => !p.eliminado);
  const pesoTeorico = productosActivos.reduce((sum, p) => {
    if (p.pesoKgUnit) return sum + p.cantidadACargar * p.pesoKgUnit;
    return sum;
  }, 0);
  const pesoReal = productosActivos.reduce((sum, p) => {
    if (p.pesoRealKg != null) return sum + p.pesoRealKg;
    if (p.pesoKgUnit) return sum + p.cantidadACargar * p.pesoKgUnit;
    return sum;
  }, 0);
  const diferenciaPeso = pesoReal - pesoTeorico;

  const updateProducto = (idx: number, updates: Partial<ProductoHoja>) => {
    setProductos(prev => {
      const updated = prev.map((p, i) => i === idx ? { ...p, ...updates } : p);
      // Auto-save to DB so progress persists
      const item = updated[idx];
      const dbUpdates: Record<string, any> = {};
      if ('confirmado' in updates) dbUpdates.cargado = updates.confirmado;
      if ('cantidadACargar' in updates) dbUpdates.cantidad_cargada = updates.cantidadACargar;
      if ('pesoRealKg' in updates) dbUpdates.peso_real_kg = updates.pesoRealKg;
      if ('loteId' in updates) dbUpdates.lote_id = updates.loteId;
      if (Object.keys(dbUpdates).length > 0) {
        supabase.from("carga_productos").update(dbUpdates).eq("id", item.cargaProductoId).then();
      }
      return updated;
    });
  };

  // Load evidencias
  const loadEvidencias = useCallback(async () => {
    const { data } = await supabase
      .from("carga_evidencias")
      .select("id, tipo_evidencia, ruta_storage, nombre_archivo, created_at")
      .eq("ruta_id", rutaId);
    setEvidencias(data || []);
  }, [rutaId]);

  useEffect(() => {
    if (fase === "evidencias") loadEvidencias();
  }, [fase, loadEvidencias]);

  // Confirm checklist and move to evidencias phase
  const handleConfirmarCarga = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const prod of productosActivos) {
        if (!prod.loteId) {
          toast.error(`Selecciona lote para ${prod.codigo}`);
          setSaving(false);
          return;
        }

        // Skip inventory decrement if already processed (has movimiento_inventario_id)
        if (!prod.movimientoInventarioId) {
          await supabase.rpc("decrementar_lote", { p_lote_id: prod.loteId, p_cantidad: prod.cantidadACargar });

          const { data: movimiento } = await supabase.from("inventario_movimientos").insert({
            producto_id: prod.productoId,
            tipo_movimiento: "salida",
            cantidad: prod.cantidadACargar,
            motivo: "Carga de pedido",
            lote_id: prod.loteId,
            referencia_id: prod.entregaId,
            usuario_id: user?.id,
          }).select("id").single();

          // Link movimiento to carga_producto to prevent double-decrement
          if (movimiento) {
            await supabase.from("carga_productos").update({ movimiento_inventario_id: movimiento.id }).eq("id", prod.cargaProductoId);
          }
        }

        await supabase.from("carga_productos").update({
          cargado: true,
          cantidad_cargada: prod.cantidadACargar,
          lote_id: prod.loteId,
          peso_real_kg: prod.pesoRealKg,
          cargado_en: new Date().toISOString(),
          cargado_por: user?.id,
        }).eq("id", prod.cargaProductoId);
      }

      const eliminados = productos.filter(p => p.eliminado);
      for (const del of eliminados) {
        await supabase.from("carga_productos").delete().eq("id", del.cargaProductoId);
      }

      const entregaIds = [...new Set(productosActivos.map(p => p.entregaId))];
      for (const eId of entregaIds) {
        await supabase.from("entregas").update({
          carga_confirmada: true,
          carga_confirmada_por: user?.id,
          carga_confirmada_en: new Date().toISOString(),
        }).eq("id", eId);
      }

      toast.success("Carga confirmada — ahora captura evidencias");
      setFase("evidencias");
    } catch (err: any) {
      console.error(err);
      toast.error("Error al confirmar carga: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  // Save sellos info and move to firma
  const handleIrAFirma = async () => {
    // Save sellos info to ruta
    await supabase.from("rutas").update({
      lleva_sellos: llevaSellos,
      numero_sello_salida: llevaSellos ? numeroSello : null,
    }).eq("id", rutaId);

    setFase("firma");
  };

  // Handle firma and finalize
  const handleFirmaConfirmada = async (firmaBase64: string) => {
    setFirmaLoading(true);
    try {
      await supabase.from("rutas").update({
        firma_chofer_carga: firmaBase64,
      }).eq("id", rutaId);

      setShowFirma(false);
      await onFinalizar();
    } catch (err: any) {
      toast.error("Error al guardar firma: " + (err?.message || ""));
    } finally {
      setFirmaLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group by pedido
  const pedidoGroups = pedidos.map(ped => ({
    ...ped,
    items: productos.map((p, idx) => ({ ...p, originalIdx: idx })).filter(p => p.pedidoFolio === ped.folio),
  }));

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* ─── Close (X) button ─── */}
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-[60] h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
      {/* ─── Document-style Header ─── */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Top bar: Logo + Title + Folio */}
        <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-almasa-header.png" alt="ALMASA" className="h-7 w-auto brightness-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <h1 className="text-base font-black uppercase tracking-tight">HOJA DE CARGA</h1>
              <p className="text-[10px] text-gray-400 uppercase">{format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black">{rutaFolio}</p>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Timer className="h-3 w-3" />
              <span>{formatTiempo(tiempoSeg)}</span>
            </div>
          </div>
        </div>

        {/* Info grid: Chofer, Ayudantes, Vehículo, Pedidos, Pesos */}
        <div className="grid grid-cols-3 md:grid-cols-7 text-sm divide-x divide-y divide-border">
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />Chofer
            </p>
            <p className="font-semibold truncate">{personal?.choferNombre || "—"}</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />Ayudantes
              <Popover open={ayudantesPopoverOpen} onOpenChange={(open) => { if (open) handleOpenAyudantesEdit(); else setAyudantesPopoverOpen(false); }}>
                <PopoverTrigger asChild>
                  <button className="ml-1 p-0.5 rounded hover:bg-muted"><Pencil className="h-3 w-3" /></button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <p className="text-xs font-semibold mb-2">Editar ayudantes</p>
                  {loadingAyudantes ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {allAyudantes.map(a => (
                        <label key={a.id} className="flex items-center gap-2 text-sm py-1 px-1 rounded hover:bg-muted cursor-pointer">
                          <Checkbox checked={ayudantesEditIds.includes(a.id)} onCheckedChange={() => handleToggleAyudante(a.id)} className="h-4 w-4" />
                          {a.nombre_completo}
                        </label>
                      ))}
                      {allAyudantes.length === 0 && <p className="text-xs text-muted-foreground">No hay ayudantes disponibles</p>}
                    </div>
                  )}
                  <Button size="sm" className="w-full mt-2" onClick={handleGuardarAyudantes}>Guardar</Button>
                </PopoverContent>
              </Popover>
            </p>
            {ayudantesEditNombres.length > 0 ? (
              <div className="font-semibold text-xs leading-snug">{ayudantesEditNombres.join(", ")}</div>
            ) : (
              <p className="text-muted-foreground text-xs">Sin ayudantes</p>
            )}
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" />Vehículo
            </p>
            <p className="font-semibold truncate">
              {personal?.vehiculoNombre || "—"}
              {personal?.vehiculoPlaca && <span className="text-muted-foreground ml-1">({personal.vehiculoPlaca})</span>}
            </p>
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />Productos
            </p>
            <p className="font-semibold">{productosActivos.length} · {pedidos.length} ped.</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Scale className="h-3 w-3" />P. Teórico
            </p>
            <p className="font-semibold">{pesoTeorico.toFixed(1)} kg</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Scale className="h-3 w-3" />P. Real
            </p>
            <p className="font-semibold">{pesoReal.toFixed(1)} kg</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              {diferenciaPeso > 0 ? <ArrowUp className="h-3 w-3" /> : diferenciaPeso < 0 ? <ArrowDown className="h-3 w-3" /> : <Scale className="h-3 w-3" />}
              Diferencia
            </p>
            <p className={`font-semibold ${diferenciaPeso > 0 ? "text-green-600" : diferenciaPeso < 0 ? "text-destructive" : ""}`}>
              {diferenciaPeso > 0 ? "+" : ""}{diferenciaPeso.toFixed(1)} kg
            </p>
          </div>
        </div>
      </div>

      {/* Cancel button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={fase === "checklist" ? "default" : "secondary"} className="gap-1">
            <Package className="h-3 w-3" />1. Checklist
          </Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge variant={fase === "evidencias" ? "default" : "secondary"} className="gap-1">
            <Camera className="h-3 w-3" />2. Evidencias
          </Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge variant={fase === "firma" ? "default" : "secondary"} className="gap-1">
            <PenTool className="h-3 w-3" />3. Firma
          </Badge>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={cancelling}>
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Cancelar Ruta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar ruta {rutaFolio}?</AlertDialogTitle>
              <AlertDialogDescription>Se eliminará todo el progreso.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No</AlertDialogCancel>
              <AlertDialogAction onClick={onCancelar} className="bg-destructive text-destructive-foreground">Sí, eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* ═══ FASE 1: Checklist de productos ═══ */}
      {fase === "checklist" && (
        <>
          {/* Product tables by pedido */}
          <div>
            <div className="space-y-6">
              {pedidoGroups.map(group => (
                <div key={group.pedidoId}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-sm font-bold">{group.folio}</Badge>
                    <span className="text-sm text-muted-foreground">{group.clienteNombre}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {group.items.filter(i => !i.eliminado).length} productos
                    </span>
                  </div>
                  {/* Table header */}
                  <div className="grid grid-cols-[auto_90px_1fr_90px_36px] gap-1 px-2 py-1.5 bg-muted/60 rounded-t-md text-[10px] font-bold uppercase text-muted-foreground items-center">
                    <span className="w-6"></span>
                    <span className="text-center">Cant.</span>
                    <span>Descripción</span>
                    <span className="text-center">Peso kg</span>
                    <span></span>
                  </div>
                  {/* Rows */}
                  <div className="divide-y divide-border border rounded-b-md">
                    {group.items.map(item => {
                      if (item.eliminado) return (
                        <div key={item.cargaProductoId} className="grid grid-cols-[auto_1fr_36px] gap-2 px-2 py-2 items-center opacity-40 line-through">
                          <span className="w-6" />
                          <span className="text-sm">{item.codigo} — {item.nombre}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                            onClick={() => updateProducto(item.originalIdx, { eliminado: false })}>
                            ↩
                          </Button>
                        </div>
                      );

                      const pesoTeoricoItem = item.pesoKgUnit ? item.cantidadACargar * item.pesoKgUnit : null;
                      const cantidadDifiere = item.cantidadACargar !== item.cantidadSolicitada;
                      const esVentaPorKg = item.precioPorKilo;
                      const tienePeso = !!item.pesoKgUnit;
                      const displayName = getCompactDisplayName({
                        nombre: item.nombre,
                        marca: item.marca,
                        especificaciones: item.especificaciones,
                        contenido_empaque: item.contenido_empaque,
                        peso_kg: item.pesoKgUnit,
                      });

                      return (
                        <div key={item.cargaProductoId}
                          className={`grid grid-cols-[auto_90px_1fr_90px_36px] gap-1 px-2 py-2 items-center ${
                            item.confirmado ? "bg-green-50/50 dark:bg-green-950/20" : ""
                          }`}>
                          {/* Col 1: Checkbox */}
                          <Checkbox
                            checked={item.confirmado}
                            onCheckedChange={(checked) => updateProducto(item.originalIdx, { confirmado: !!checked })}
                            className="h-5 w-5 rounded border-2 shrink-0"
                          />

                          {/* Col 2: Cantidad */}
                          <div className="flex flex-col items-center">
                            <Input
                              type="number" inputMode="numeric"
                              value={item.cantidadACargar || ""}
                              onChange={e => {
                                const raw = e.target.value;
                                const newCant = raw === "" ? 0 : parseFloat(raw);
                                if (isNaN(newCant)) return;
                                const updates: Partial<ProductoHoja> = { cantidadACargar: newCant };
                                if (tienePeso && !esVentaPorKg) {
                                  updates.pesoRealKg = newCant * (item.pesoKgUnit || 0);
                                }
                                updateProducto(item.originalIdx, updates);
                              }}
                              className={`h-8 w-full text-center text-sm font-semibold ${
                                cantidadDifiere ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : ""
                              }`}
                              disabled={item.confirmado}
                            />
                            {cantidadDifiere && (
                              <span className="text-[9px] text-amber-600 flex items-center gap-0.5 mt-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                ≠{item.cantidadSolicitada}
                              </span>
                            )}
                          </div>

                          {/* Col 3: Descripción completa */}
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug">{displayName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground font-mono">{item.codigo}</span>
                              {item.confirmado && (
                                <Badge className="bg-green-600 text-white text-[9px] px-1 py-0">✓</Badge>
                              )}
                            </div>
                          </div>

                          {/* Col 4: Peso kg */}
                          {tienePeso ? (
                            esVentaPorKg ? (
                              <Input
                                type="number" inputMode="decimal" step="0.1"
                                value={item.pesoRealKg ?? (pesoTeoricoItem?.toFixed(1) || "")}
                                onChange={e => updateProducto(item.originalIdx, { pesoRealKg: e.target.value ? parseFloat(e.target.value) : null })}
                                placeholder={pesoTeoricoItem?.toFixed(1) || ""}
                                className="h-8 w-full text-center text-sm font-semibold"
                                disabled={item.confirmado}
                              />
                            ) : (
                              <div className="h-8 flex items-center justify-center rounded-md border bg-muted text-sm font-medium text-muted-foreground">
                                {(item.pesoRealKg ?? pesoTeoricoItem)?.toLocaleString("es-MX", { maximumFractionDigits: 1 }) || "—"}
                              </div>
                            )
                          ) : (
                            <span className="text-center text-xs text-muted-foreground">—</span>
                          )}


                          {/* Col 6: Delete */}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => updateProducto(item.originalIdx, { eliminado: true })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm checklist button */}
          {(() => {
            const confirmados = productosActivos.filter(p => p.confirmado).length;
            const todosConfirmados = confirmados === productosActivos.length && productosActivos.length > 0;
            return (
              <Button onClick={handleConfirmarCarga} disabled={saving || !todosConfirmados}
                size="lg" className="w-full h-14 text-lg font-bold">
                {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                Confirmar Carga ({confirmados}/{productosActivos.length})
              </Button>
            );
          })()}
        </>
      )}

      {/* ═══ FASE 2: Evidencias fotográficas y sellos ═══ */}
      {fase === "evidencias" && (
        <div className="space-y-4">
          <CargaEvidenciasSection
            rutaId={rutaId}
            evidencias={evidencias.filter(e => !e.tipo_evidencia.startsWith("sello_"))}
            onEvidenciaAdded={loadEvidencias}
          />

          <SellosSection
            rutaId={rutaId}
            evidencias={evidencias}
            onEvidenciaAdded={loadEvidencias}
            llevaSellos={llevaSellos}
            onLlevaSellosChange={setLlevaSellos}
            numeroSello={numeroSello}
            onNumeroSelloChange={setNumeroSello}
          />

          <Button onClick={handleIrAFirma} size="lg" className="w-full h-14 text-lg font-bold">
            <PenTool className="h-5 w-5 mr-2" />
            Continuar a Firma del Chofer
          </Button>
        </div>
      )}

      {/* ═══ FASE 3: Firma del chofer ═══ */}
      {fase === "firma" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-6 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <div>
                <h3 className="text-lg font-bold">Carga verificada</h3>
                <p className="text-sm text-muted-foreground">
                  {productosActivos.length} productos confirmados · Evidencias capturadas
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Solo falta la firma del chofer para completar la carga
              </p>
              <Button onClick={() => setShowFirma(true)} size="lg" className="w-full h-14 text-lg font-bold">
                <PenTool className="h-5 w-5 mr-2" />
                Firma del Chofer — {personal?.choferNombre || "Chofer"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Firma dialog */}
      <FirmaChoferDialog
        open={showFirma}
        onOpenChange={setShowFirma}
        onConfirm={handleFirmaConfirmada}
        choferNombre={personal?.choferNombre || "Chofer"}
        rutaFolio={rutaFolio}
        loading={firmaLoading}
      />
        </div>
      </ScrollArea>
    </div>
  );
};
