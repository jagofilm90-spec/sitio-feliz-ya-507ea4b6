import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Save, Check, Archive, Copy, Send } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Cotizacion {
  id: string;
  mes: number;
  anio: number;
  tipo: string;
  version: number;
  estado: string;
  notas: string | null;
  cliente_grupo_id: string;
}

interface Linea {
  id: string;
  codigo_lecaroz: number | null;
  nombre_lecaroz: string;
  presentacion_lecaroz: string | null;
  sku_almasa: string | null;
  nombre_almasa: string | null;
  es_reempaque: boolean;
  sku_padre_inventario: string | null;
  es_peso_variable: boolean;
  precio: number | null;
  precio_pendiente: boolean;
  unidad_cobro: string;
  notas: string | null;
  orden: number;
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const FILTERS = ["Todos", "Con precio", "Pendientes", "Re-empaque", "Peso variable"];

const tipoLabel: Record<string, string> = {
  avio_panaderias: "AVÍO PANADERÍAS",
  avio_rosticerias: "AVÍO ROSTICERÍAS",
  azucar: "AZÚCAR",
};

const LecarozCotizacionEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [showVigente, setShowVigente] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [cotRes, linRes] = await Promise.all([
      supabase.from("cotizaciones_lecaroz").select("*").eq("id", id).single(),
      supabase.from("cotizacion_lecaroz_lineas").select("*").eq("cotizacion_id", id).order("orden"),
    ]);

    if (cotRes.error || !cotRes.data) {
      toast.error("Cotización no encontrada");
      navigate("/lecaroz/cotizaciones");
      return;
    }

    setCotizacion(cotRes.data as unknown as Cotizacion);
    setLineas((linRes.data || []) as unknown as Linea[]);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredLineas = useMemo(() => {
    switch (filter) {
      case "Con precio": return lineas.filter(l => l.precio !== null);
      case "Pendientes": return lineas.filter(l => l.precio === null || l.precio_pendiente);
      case "Re-empaque": return lineas.filter(l => l.es_reempaque);
      case "Peso variable": return lineas.filter(l => l.es_peso_variable);
      default: return lineas;
    }
  }, [lineas, filter]);

  const conPrecio = lineas.filter(l => l.precio !== null && !l.precio_pendiente).length;
  const total = lineas.length;
  const progreso = total > 0 ? Math.round((conPrecio / total) * 100) : 0;

  const handlePriceChange = (lineaId: string, value: string) => {
    setEditedPrices(prev => ({ ...prev, [lineaId]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(editedPrices).length === 0) {
      toast.info("No hay cambios por guardar");
      return;
    }

    setSaving(true);
    const updates = Object.entries(editedPrices).map(([lineaId, priceStr]) => {
      const precio = priceStr === "" ? null : parseFloat(priceStr);
      return supabase
        .from("cotizacion_lecaroz_lineas")
        .update({ precio, precio_pendiente: precio === null })
        .eq("id", lineaId);
    });

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      toast.error(`${errors.length} errores al guardar`);
    } else {
      toast.success(`${Object.keys(editedPrices).length} precios actualizados`);
      setEditedPrices({});
      fetchData();
    }
    setSaving(false);
  };

  const handleMarcarVigente = async () => {
    if (!cotizacion) return;
    // Move existing vigente to historica
    await supabase
      .from("cotizaciones_lecaroz")
      .update({ estado: "historica" })
      .eq("cliente_grupo_id", cotizacion.cliente_grupo_id)
      .eq("mes", cotizacion.mes)
      .eq("anio", cotizacion.anio)
      .eq("tipo", cotizacion.tipo)
      .eq("estado", "vigente");

    const { error } = await supabase
      .from("cotizaciones_lecaroz")
      .update({ estado: "vigente", fecha_aprobacion: new Date().toISOString() })
      .eq("id", cotizacion.id);

    if (error) {
      toast.error("Error al marcar vigente");
    } else {
      toast.success("Cotización marcada como vigente");
      fetchData();
    }
    setShowVigente(false);
  };

  const handleArchivar = async () => {
    if (!cotizacion) return;
    const { error } = await supabase
      .from("cotizaciones_lecaroz")
      .update({ estado: "historica" })
      .eq("id", cotizacion.id);

    if (error) toast.error("Error al archivar");
    else { toast.success("Archivada"); fetchData(); }
    setShowArchive(false);
  };

  const handleCopiar = async () => {
    if (!cotizacion) return;
    const nextMes = cotizacion.mes === 12 ? 1 : cotizacion.mes + 1;
    const nextAnio = cotizacion.mes === 12 ? cotizacion.anio + 1 : cotizacion.anio;

    const { data: newCot, error: cotErr } = await supabase
      .from("cotizaciones_lecaroz")
      .insert({
        cliente_grupo_id: cotizacion.cliente_grupo_id,
        mes: nextMes,
        anio: nextAnio,
        tipo: cotizacion.tipo,
        version: 1,
        estado: "borrador",
      })
      .select("id")
      .single();

    if (cotErr || !newCot) {
      toast.error("Error al copiar");
      return;
    }

    // Copy lines without prices
    const newLines = lineas.map(l => ({
      cotizacion_id: newCot.id,
      codigo_lecaroz: l.codigo_lecaroz,
      nombre_lecaroz: l.nombre_lecaroz,
      presentacion_lecaroz: l.presentacion_lecaroz,
      sku_almasa: l.sku_almasa,
      nombre_almasa: l.nombre_almasa,
      es_reempaque: l.es_reempaque,
      sku_padre_inventario: l.sku_padre_inventario,
      es_peso_variable: l.es_peso_variable,
      precio: null,
      precio_pendiente: true,
      unidad_cobro: l.unidad_cobro,
      notas: l.notas,
      orden: l.orden,
    }));

    const { error: linErr } = await supabase.from("cotizacion_lecaroz_lineas").insert(newLines);
    if (linErr) {
      toast.error("Error copiando líneas");
    } else {
      toast.success(`Copiada a ${MESES[nextMes - 1]} ${nextAnio}`);
      navigate(`/lecaroz/cotizaciones/${newCot.id}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <AlmasaLoading size={48} />
        </div>
      </Layout>
    );
  }

  if (!cotizacion) return null;

  const estadoColors: Record<string, string> = {
    vigente: "bg-green-600", borrador: "bg-yellow-500", enviada: "bg-blue-500",
    historica: "bg-gray-500", rechazada: "bg-red-600",
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/lecaroz/cotizaciones")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">
                {tipoLabel[cotizacion.tipo]} — {MESES[cotizacion.mes - 1]} {cotizacion.anio}
              </h1>
              <Badge className={`${estadoColors[cotizacion.estado]} text-white`}>
                {cotizacion.estado.toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">v{cotizacion.version}</span>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || Object.keys(editedPrices).length === 0} className="bg-[#C41E3A] hover:bg-[#a01830]">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>

        <div className="flex gap-4">
          {/* Main table */}
          <div className="flex-1 space-y-3">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(f => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className={filter === f ? "bg-[#C41E3A] hover:bg-[#a01830]" : ""}
                >
                  {f}
                  {f === "Pendientes" && <span className="ml-1 text-xs">({total - conPrecio})</span>}
                </Button>
              ))}
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-auto max-h-[calc(100vh-260px)]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Producto Lecaroz</th>
                    <th className="text-left p-3 font-medium">Producto ALMASA</th>
                    <th className="text-right p-3 font-medium w-[140px]">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLineas.map(linea => {
                    const currentPrice = editedPrices[linea.id] !== undefined
                      ? editedPrices[linea.id]
                      : (linea.precio !== null ? String(linea.precio) : "");
                    const hasPrice = currentPrice !== "" && currentPrice !== null;

                    return (
                      <tr key={linea.id} className="border-t hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-muted-foreground text-xs font-mono">{linea.codigo_lecaroz}</span>
                            <span className="font-medium">{linea.nombre_lecaroz}</span>
                            {linea.es_reempaque && <Badge variant="outline" className="text-orange-500 border-orange-500 text-xs">re-empaque</Badge>}
                            {linea.es_peso_variable && <Badge variant="outline" className="text-purple-500 border-purple-500 text-xs">peso variable</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{linea.presentacion_lecaroz}</div>
                          {linea.notas && <div className="text-xs text-amber-600 mt-0.5">💡 {linea.notas}</div>}
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{linea.nombre_almasa || "—"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{linea.sku_almasa || "Sin SKU"}</div>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="$0.00"
                            value={currentPrice}
                            onChange={e => handlePriceChange(linea.id, e.target.value)}
                            className={`text-right w-[120px] ${hasPrice ? "border-green-500 focus:border-green-500" : "border-amber-400 focus:border-amber-400"}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-[300px] shrink-0 space-y-4 hidden lg:block">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Progreso de precios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{conPrecio}/{total}</div>
                <Progress value={progreso} className="h-2" />
                <p className="text-xs text-muted-foreground">{progreso}% completado</p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {cotizacion.estado !== "vigente" && (
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setShowVigente(true)}>
                  <Check className="h-4 w-4 mr-2" /> Marcar como vigente
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={handleCopiar}>
                <Copy className="h-4 w-4 mr-2" /> Copiar al mes siguiente
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setShowArchive(true)}>
                <Archive className="h-4 w-4 mr-2" /> Archivar como histórica
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <Send className="h-4 w-4 mr-2" /> Enviar PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm vigente */}
      <AlertDialog open={showVigente} onOpenChange={setShowVigente}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como vigente?</AlertDialogTitle>
            <AlertDialogDescription>
              Si ya existe otra cotización vigente del mismo tipo/mes/año, será movida a "histórica".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarcarVigente} className="bg-green-600 hover:bg-green-700">Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm archive */}
      <AlertDialog open={showArchive} onOpenChange={setShowArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar cotización?</AlertDialogTitle>
            <AlertDialogDescription>Se moverá a estado "histórica".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchivar}>Archivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default LecarozCotizacionEditor;
