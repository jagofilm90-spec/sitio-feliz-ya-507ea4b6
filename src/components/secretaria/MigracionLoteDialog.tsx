import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Sparkles,
  Check,
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Edit2,
} from "lucide-react";
import { getDisplayName, UNIDADES_SAT, getUnidadSATDescripcion } from "@/lib/productUtils";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  especificaciones: string | null;
  peso_kg: number | null;
  unidad: string;
  contenido_empaque: string | null;
  unidad_sat: string | null;
}

interface Sugerencia {
  producto_id: string;
  codigo: string;
  nombre_actual: string;
  nombre_sugerido: string;
  especificaciones_actual: string | null;
  especificaciones_sugerida: string | null;
  marca_actual: string | null;
  marca_sugerida: string | null;
  contenido_empaque_sugerido: string | null;
  unidad_sat_sugerida: string | null;
  peso_kg_sugerido: number | null;
  cambios_detectados: boolean;
  explicacion: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'error';
  error?: string;
}

interface MigracionLoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MigracionLoteDialog = ({
  open,
  onOpenChange,
}: MigracionLoteDialogProps) => {
  const [fase, setFase] = useState<'inicio' | 'analizando' | 'revision' | 'aplicando' | 'completado'>('inicio');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [progreso, setProgreso] = useState(0);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const abortRef = useRef(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      resetState();
      loadProductos();
    }
  }, [open]);

  const resetState = () => {
    setFase('inicio');
    setProductos([]);
    setSugerencias([]);
    setProgreso(0);
    setSeleccionados(new Set());
    setIsPaused(false);
    abortRef.current = false;
  };

  const loadProductos = async () => {
    const { data, error } = await supabase
      .from("productos")
      .select("id, codigo, nombre, marca, especificaciones, peso_kg, unidad, contenido_empaque, unidad_sat")
      .eq("activo", true)
      .order("codigo");

    if (error) {
      toast({ title: "Error al cargar productos", variant: "destructive" });
      return;
    }

    // Filtrar productos que necesitan normalización
    const pendientes = (data || []).filter((p) => {
      const tienePatrones = /\d+\/\d+|jumbo|extra|grande|pequeño|h\d|deshuesad|pelad|\d+kg/i.test(p.nombre);
      const sinEspec = !p.especificaciones || p.especificaciones.trim() === "";
      const sinUnidadSAT = !p.unidad_sat;
      const sinMarca = !p.marca;
      return tienePatrones || sinEspec || sinUnidadSAT || sinMarca;
    });

    setProductos(pendientes);
  };

  const startAnalysis = async () => {
    setFase('analizando');
    setProgreso(0);
    setSugerencias([]);
    abortRef.current = false;

    const results: Sugerencia[] = [];
    
    for (let i = 0; i < productos.length; i++) {
      if (abortRef.current) break;
      
      while (isPaused && !abortRef.current) {
        await new Promise(r => setTimeout(r, 500));
      }
      
      if (abortRef.current) break;

      const producto = productos[i];
      setProgreso(((i + 1) / productos.length) * 100);

      try {
        const { data, error } = await supabase.functions.invoke("normalize-product", {
          body: {
            nombre: producto.nombre,
            especificaciones: producto.especificaciones,
            marca: producto.marca,
            peso_kg: producto.peso_kg,
            unidad: producto.unidad,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        results.push({
          producto_id: producto.id,
          codigo: producto.codigo,
          nombre_actual: producto.nombre,
          nombre_sugerido: data.nombre_sugerido || producto.nombre,
          especificaciones_actual: producto.especificaciones,
          especificaciones_sugerida: data.especificaciones_sugerida || null,
          marca_actual: producto.marca,
          marca_sugerida: data.marca_sugerida || producto.marca,
          contenido_empaque_sugerido: data.contenido_empaque_sugerido,
          unidad_sat_sugerida: data.unidad_sat_sugerida,
          peso_kg_sugerido: data.peso_kg_sugerido,
          cambios_detectados: data.cambios_detectados ?? true,
          explicacion: data.explicacion || "",
          estado: 'pendiente',
        });

        setSugerencias([...results]);

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (error: any) {
        results.push({
          producto_id: producto.id,
          codigo: producto.codigo,
          nombre_actual: producto.nombre,
          nombre_sugerido: producto.nombre,
          especificaciones_actual: producto.especificaciones,
          especificaciones_sugerida: null,
          marca_actual: producto.marca,
          marca_sugerida: null,
          contenido_empaque_sugerido: null,
          unidad_sat_sugerida: null,
          peso_kg_sugerido: null,
          cambios_detectados: false,
          explicacion: "",
          estado: 'error',
          error: error.message,
        });
        setSugerencias([...results]);
      }
    }

    if (!abortRef.current) {
      // Auto-select those with changes
      const autoSelect = new Set(
        results.filter(s => s.cambios_detectados && s.estado !== 'error').map(s => s.producto_id)
      );
      setSeleccionados(autoSelect);
      setFase('revision');
    }
  };

  const toggleSelectAll = () => {
    const selectables = sugerencias.filter(s => s.estado !== 'error').map(s => s.producto_id);
    if (seleccionados.size === selectables.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(selectables));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(seleccionados);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSeleccionados(next);
  };

  const applySelected = async () => {
    if (seleccionados.size === 0) {
      toast({ title: "Selecciona al menos un producto", variant: "destructive" });
      return;
    }

    setFase('aplicando');
    setProgreso(0);

    const toApply = sugerencias.filter(s => seleccionados.has(s.producto_id));
    let applied = 0;
    let errors = 0;

    for (let i = 0; i < toApply.length; i++) {
      const sug = toApply[i];
      setProgreso(((i + 1) / toApply.length) * 100);

      try {
        const { error } = await supabase
          .from("productos")
          .update({
            nombre: sug.nombre_sugerido,
            especificaciones: sug.especificaciones_sugerida || null,
            marca: sug.marca_sugerida || null,
            contenido_empaque: sug.contenido_empaque_sugerido || null,
            unidad_sat: sug.unidad_sat_sugerida || null,
            peso_kg: sug.peso_kg_sugerido,
          })
          .eq("id", sug.producto_id);

        if (error) throw error;

        setSugerencias(prev => prev.map(s => 
          s.producto_id === sug.producto_id ? { ...s, estado: 'aprobado' as const } : s
        ));
        applied++;
      } catch (error: any) {
        setSugerencias(prev => prev.map(s => 
          s.producto_id === sug.producto_id ? { ...s, estado: 'error' as const, error: error.message } : s
        ));
        errors++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["secretaria-productos"] });
    setFase('completado');
    toast({
      title: "Migración completada",
      description: `${applied} productos actualizados${errors > 0 ? `, ${errors} errores` : ''}`,
    });
  };

  const selectables = sugerencias.filter(s => s.estado !== 'error');
  const conCambios = sugerencias.filter(s => s.cambios_detectados && s.estado !== 'error').length;
  const sinCambios = sugerencias.filter(s => !s.cambios_detectados && s.estado !== 'error').length;
  const errores = sugerencias.filter(s => s.estado === 'error').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[720px] max-h-[90vh] overflow-x-hidden !p-0 !gap-0 !rounded-2xl shadow-[0_20px_60px_-20px_rgba(15,14,13,0.25)]">
        <DialogHeader className="px-8 pt-8 pb-6">
          <DialogTitle className="!font-serif !text-[28px] !font-medium text-ink-900 !tracking-[-0.01em] !leading-tight">
            Migración en lote.
          </DialogTitle>
          <DialogDescription className="!text-[13px] text-ink-500 italic">
            Procesa productos en bloque con IA
          </DialogDescription>
        </DialogHeader>

        {/* Fase: Inicio */}
        {fase === 'inicio' && (
          <div className="px-8 pb-8 space-y-6 py-4">
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <Sparkles className="h-12 w-12 text-crimson-500 mx-auto" />
                <div>
                  <h3 className="font-semibold text-lg">
                    {productos.length} productos pendientes de normalizar
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    La IA analizará cada producto y sugerirá mejoras para nombre, especificaciones, marca, 
                    contenido de empaque y unidad SAT.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="outline">Sin marca: ~30%</Badge>
                  <Badge variant="outline">Sin especificaciones: ~80%</Badge>
                  <Badge variant="outline" className="text-red-600 border-red-200">Sin unidad SAT: ~99%</Badge>
                </div>
                <Button onClick={startAnalysis} className="bg-crimson-500 text-white hover:bg-crimson-600">
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Análisis
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fase: Analizando */}
        {fase === 'analizando' && (
          <div className="px-8 pb-8 space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analizando productos con IA...</span>
                <span>{Math.round(progreso)}%</span>
              </div>
              <Progress value={progreso} className="h-2" />
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                {isPaused ? "Continuar" : "Pausar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { abortRef.current = true; setFase('revision'); }}
              >
                <X className="h-4 w-4 mr-2" />
                Detener y revisar
              </Button>
            </div>

            {sugerencias.length > 0 && (
              <div className="text-sm text-muted-foreground text-center">
                {sugerencias.length} de {productos.length} analizados
                {sugerencias.filter(s => s.estado === 'error').length > 0 && (
                  <span className="text-red-600 ml-2">
                    ({sugerencias.filter(s => s.estado === 'error').length} errores)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fase: Revisión */}
        {(fase === 'revision' || fase === 'completado') && (
          <div className="px-8 pb-8 space-y-4">
            {/* Stats */}
            <div className="flex gap-4 flex-wrap">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <Check className="h-3 w-3 mr-1" />
                {conCambios} con cambios
              </Badge>
              <Badge variant="secondary">
                {sinCambios} sin cambios
              </Badge>
              {errores > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {errores} errores
                </Badge>
              )}
              <Badge variant="outline" className="ml-auto">
                {seleccionados.size} seleccionados
              </Badge>
            </div>

            {/* Table */}
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={seleccionados.size === selectables.length && selectables.length > 0}
                        onCheckedChange={toggleSelectAll}
                        disabled={fase === 'completado'}
                      />
                    </TableHead>
                    <TableHead className="w-24">Código</TableHead>
                    <TableHead>Nombre Actual → Sugerido</TableHead>
                    <TableHead className="w-20">SAT</TableHead>
                    <TableHead className="w-20">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sugerencias.map((sug) => (
                    <TableRow 
                      key={sug.producto_id}
                      className={sug.estado === 'error' ? 'bg-red-50' : 
                                sug.estado === 'aprobado' ? 'bg-green-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={seleccionados.has(sug.producto_id)}
                          onCheckedChange={() => toggleSelect(sug.producto_id)}
                          disabled={sug.estado === 'error' || fase === 'completado'}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{sug.codigo}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground line-through">{sug.nombre_actual}</span>
                            {sug.cambios_detectados && (
                              <>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-medium text-crimson-600">
                                  {sug.nombre_sugerido}
                                  {sug.especificaciones_sugerida && ` ${sug.especificaciones_sugerida}`}
                                </span>
                              </>
                            )}
                          </div>
                          {sug.marca_sugerida && (
                            <span className="text-xs text-muted-foreground">Marca: {sug.marca_sugerida}</span>
                          )}
                          {sug.error && (
                            <span className="text-xs text-red-600">{sug.error}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sug.unidad_sat_sugerida ? (
                          <Badge variant="outline" className="text-xs">
                            {sug.unidad_sat_sugerida}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sug.estado === 'error' && (
                          <Badge variant="destructive" className="text-xs">Error</Badge>
                        )}
                        {sug.estado === 'aprobado' && (
                          <Badge className="bg-green-600 text-xs">
                            <Check className="h-3 w-3" />
                          </Badge>
                        )}
                        {sug.estado === 'pendiente' && sug.cambios_detectados && (
                          <Badge variant="secondary" className="text-xs">Cambios</Badge>
                        )}
                        {sug.estado === 'pendiente' && !sug.cambios_detectados && (
                          <span className="text-xs text-muted-foreground">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <div className="flex gap-2">
                {fase === 'revision' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const withChanges = sugerencias
                          .filter(s => s.cambios_detectados && s.estado !== 'error')
                          .map(s => s.producto_id);
                        setSeleccionados(new Set(withChanges));
                      }}
                    >
                      Seleccionar con cambios ({conCambios})
                    </Button>
                    <Button
                      onClick={applySelected}
                      disabled={seleccionados.size === 0}
                      className="bg-crimson-500 text-white hover:bg-crimson-600"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Aplicar {seleccionados.size} seleccionados
                    </Button>
                  </>
                )}
                {fase === 'completado' && (
                  <Button
                    variant="outline"
                    onClick={resetState}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reiniciar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fase: Aplicando */}
        {fase === 'aplicando' && (
          <div className="px-8 pb-8 space-y-4 py-8">
            <div className="text-center">
              <AlmasaLoading size={48} />
              <p>Aplicando cambios...</p>
            </div>
            <Progress value={progreso} className="h-2" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
