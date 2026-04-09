import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Sparkles,
  Check,
  SkipForward,
  Edit2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { getDisplayName, UNIDADES_SAT } from "@/lib/productUtils";

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
  nombre_sugerido: string;
  especificaciones_sugerida: string | null;
  marca_sugerida: string | null;
  contenido_empaque_sugerido: string | null;
  unidad_sat_sugerida: string | null;
  peso_kg_sugerido: number | null;
  cambios_detectados: boolean;
  explicacion: string;
}

interface MigracionProductosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MigracionProductosDialog = ({
  open,
  onOpenChange,
}: MigracionProductosDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedSugerencia, setEditedSugerencia] = useState<Sugerencia | null>(null);
  const [normalizados, setNormalizados] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cargar productos que necesitan normalización
  useEffect(() => {
    if (open) {
      loadProductos();
    }
  }, [open]);

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

    // Filtrar productos que probablemente necesitan normalización
    const pendientes = (data || []).filter((p) => {
      // Tiene calibres o formatos en el nombre
      const tienePatrones = /\d+\/\d+|jumbo|extra|grande|pequeño|h\d|deshuesad|pelad|\d+kg/i.test(p.nombre);
      // O no tiene especificaciones
      const sinEspec = !p.especificaciones || p.especificaciones.trim() === "";
      // O no tiene unidad SAT
      const sinUnidadSAT = !p.unidad_sat;
      // O no tiene marca
      const sinMarca = !p.marca;
      return tienePatrones || sinEspec || sinUnidadSAT || sinMarca;
    });

    setProductos(pendientes);
    setCurrentIndex(0);
    setNormalizados([]);
    setSkipped([]);
    
    if (pendientes.length > 0) {
      analyzeProduct(pendientes[0]);
    }
  };

  const analyzeProduct = async (producto: Producto) => {
    setIsAnalyzing(true);
    setSugerencia(null);
    setEditMode(false);
    setEditedSugerencia(null);

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

      if (data.error) {
        throw new Error(data.error);
      }

      // Ensure all fields are present
      const normalizedSugerencia: Sugerencia = {
        nombre_sugerido: data.nombre_sugerido || producto.nombre,
        especificaciones_sugerida: data.especificaciones_sugerida || null,
        marca_sugerida: data.marca_sugerida || producto.marca,
        contenido_empaque_sugerido: data.contenido_empaque_sugerido || producto.contenido_empaque,
        unidad_sat_sugerida: data.unidad_sat_sugerida || producto.unidad_sat,
        peso_kg_sugerido: data.peso_kg_sugerido ?? producto.peso_kg,
        cambios_detectados: data.cambios_detectados ?? true,
        explicacion: data.explicacion || "",
      };

      setSugerencia(normalizedSugerencia);
      setEditedSugerencia(normalizedSugerencia);
    } catch (error: any) {
      toast({
        title: "Error al analizar",
        description: error.message || "No se pudo analizar el producto",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentProduct = productos[currentIndex];

  const handleApply = async () => {
    if (!currentProduct || !editedSugerencia) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("productos")
        .update({
          nombre: editedSugerencia.nombre_sugerido,
          especificaciones: editedSugerencia.especificaciones_sugerida || null,
          marca: editedSugerencia.marca_sugerida || null,
          contenido_empaque: editedSugerencia.contenido_empaque_sugerido || null,
          unidad_sat: editedSugerencia.unidad_sat_sugerida || null,
          peso_kg: editedSugerencia.peso_kg_sugerido,
        })
        .eq("id", currentProduct.id);

      if (error) throw error;

      setNormalizados([...normalizados, currentProduct.id]);
      toast({ title: "Producto normalizado" });
      queryClient.invalidateQueries({ queryKey: ["secretaria-productos"] });
      moveToNext();
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    if (currentProduct) {
      setSkipped([...skipped, currentProduct.id]);
    }
    moveToNext();
  };

  const moveToNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < productos.length) {
      setCurrentIndex(nextIndex);
      analyzeProduct(productos[nextIndex]);
    } else {
      // Terminamos
      toast({
        title: "¡Migración completada!",
        description: `${normalizados.length} productos normalizados, ${skipped.length} omitidos`,
      });
    }
  };

  const progress = productos.length > 0 
    ? ((normalizados.length + skipped.length) / productos.length) * 100 
    : 0;

  const isComplete = currentIndex >= productos.length;

  // Check what's missing
  const getMissingFields = (product: Producto) => {
    const missing: string[] = [];
    if (!product.unidad_sat) missing.push("Unidad SAT");
    if (!product.marca) missing.push("Marca");
    if (!product.especificaciones || product.especificaciones.trim() === "") missing.push("Especificaciones");
    return missing;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[720px] max-h-[90vh] overflow-y-auto overflow-x-hidden !p-0 !gap-0 !rounded-2xl shadow-[0_20px_60px_-20px_rgba(15,14,13,0.25)]">
        <DialogHeader className="px-8 pt-8 pb-6">
          <DialogTitle className="!font-serif !text-[28px] !font-medium text-ink-900 !tracking-[-0.01em] !leading-tight">
            Normalizar con IA.
          </DialogTitle>
          <DialogDescription className="!text-[13px] text-ink-500 italic">
            Limpieza inteligente del catálogo
          </DialogDescription>
        </DialogHeader>

        {/* Progreso */}
        <div className="px-8 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Progreso: {normalizados.length + skipped.length} de {productos.length}
            </span>
            <span className="text-muted-foreground">
              <span className="text-green-600">{normalizados.length} aplicados</span>
              {skipped.length > 0 && (
                <span className="text-yellow-600 ml-2">{skipped.length} omitidos</span>
              )}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {isComplete ? (
          <Card className="border-green-200 bg-green-50 mx-8 mb-8">
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">¡Migración Completada!</h3>
                <p className="text-muted-foreground">
                  Se normalizaron {normalizados.length} productos correctamente.
                </p>
              </div>
              <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
            </CardContent>
          </Card>
        ) : currentProduct ? (
          <div className="px-8 pb-8 space-y-4">
            {/* Producto actual */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {currentProduct.codigo}
                    </Badge>
                    {/* Missing fields badges */}
                    {getMissingFields(currentProduct).map((field) => (
                      <Badge key={field} variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Sin {field}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Producto {currentIndex + 1} de {productos.length}
                  </span>
                </div>

                {/* Datos actuales */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">DATOS ACTUALES</h4>
                    <div className="grid gap-2 text-sm bg-muted/50 p-3 rounded-md">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-muted-foreground text-xs">Nombre:</span>
                        <p className="font-medium">{currentProduct.nombre}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Especificaciones:</span>
                        <p className={currentProduct.especificaciones ? "" : "text-yellow-600"}>
                          {currentProduct.especificaciones || "(vacío)"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Marca:</span>
                        <p className={currentProduct.marca ? "" : "text-yellow-600"}>
                          {currentProduct.marca || "(sin marca)"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-muted-foreground text-xs">Contenido:</span>
                        <p>{currentProduct.contenido_empaque || currentProduct.peso_kg ? `${currentProduct.peso_kg} kg` : "(vacío)"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Peso (kg):</span>
                        <p>{currentProduct.peso_kg || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Unidad SAT:</span>
                        <p className={currentProduct.unidad_sat ? "" : "text-red-600 font-medium"}>
                          {currentProduct.unidad_sat || "⚠️ FALTA"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sugerencia IA */}
                {isAnalyzing ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-crimson-500" />
                    <span className="text-muted-foreground">Analizando con IA...</span>
                  </div>
                ) : sugerencia ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-muted-foreground">SUGERENCIA IA</h4>
                      {!sugerencia.cambios_detectados && (
                        <Badge variant="secondary" className="text-xs">Sin cambios</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditMode(!editMode)}
                        className="ml-auto"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        {editMode ? "Ver sugerencia" : "Editar"}
                      </Button>
                    </div>

                    {editMode && editedSugerencia ? (
                      <div className="grid gap-3 bg-crimson-50 p-3 rounded-md border border-crimson-100">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nombre</Label>
                            <Input
                              value={editedSugerencia.nombre_sugerido}
                              onChange={(e) =>
                                setEditedSugerencia({
                                  ...editedSugerencia,
                                  nombre_sugerido: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Especificaciones</Label>
                            <Input
                              value={editedSugerencia.especificaciones_sugerida || ""}
                              onChange={(e) =>
                                setEditedSugerencia({
                                  ...editedSugerencia,
                                  especificaciones_sugerida: e.target.value || null,
                                })
                              }
                              placeholder="Calibre, formato..."
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Marca</Label>
                            <Input
                              value={editedSugerencia.marca_sugerida || ""}
                              onChange={(e) =>
                                setEditedSugerencia({
                                  ...editedSugerencia,
                                  marca_sugerida: e.target.value || null,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Contenido empaque</Label>
                            <Input
                              value={editedSugerencia.contenido_empaque_sugerido || ""}
                              onChange={(e) =>
                                setEditedSugerencia({
                                  ...editedSugerencia,
                                  contenido_empaque_sugerido: e.target.value || null,
                                })
                              }
                              placeholder="25 kg, 24×800g..."
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Peso (kg)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editedSugerencia.peso_kg_sugerido ?? ""}
                              onChange={(e) =>
                                setEditedSugerencia({
                                  ...editedSugerencia,
                                  peso_kg_sugerido: e.target.value ? parseFloat(e.target.value) : null,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unidad SAT</Label>
                            <Select
                              value={editedSugerencia.unidad_sat_sugerida || ""}
                              onValueChange={(v) =>
                                setEditedSugerencia({
                                  ...editedSugerencia,
                                  unidad_sat_sugerida: v || null,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {UNIDADES_SAT.map((u) => (
                                  <SelectItem key={u.clave} value={u.clave}>
                                    {u.clave} - {u.descripcion}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2 text-sm bg-crimson-50 p-3 rounded-md border border-crimson-100">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-muted-foreground text-xs">Nombre:</span>
                            <p className="font-medium text-crimson-600">
                              {sugerencia.nombre_sugerido}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Especificaciones:</span>
                            <p className="font-medium text-crimson-600">
                              {sugerencia.especificaciones_sugerida || "(vacío)"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Marca:</span>
                            <p className="font-medium text-crimson-600">
                              {sugerencia.marca_sugerida || "(sin marca)"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-muted-foreground text-xs">Contenido:</span>
                            <p className="font-medium text-crimson-600">
                              {sugerencia.contenido_empaque_sugerido || "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Peso (kg):</span>
                            <p className="font-medium text-crimson-600">
                              {sugerencia.peso_kg_sugerido ?? "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Unidad SAT:</span>
                            <p className="font-medium text-crimson-600">
                              {sugerencia.unidad_sat_sugerida ? (
                                <Badge variant="outline" className="text-xs">
                                  {sugerencia.unidad_sat_sugerida}
                                </Badge>
                              ) : "(vacío)"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Explicación */}
                    {sugerencia.explicacion && (
                      <div className="flex items-start gap-2 text-sm bg-blue-50 p-3 rounded-md">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <span className="text-blue-700">
                          {sugerencia.explicacion}
                        </span>
                      </div>
                    )}

                    {/* Preview del Display Name */}
                    <div className="space-y-2 p-3 bg-muted/50 rounded-md border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        Vista previa en documentos (Display Name)
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground line-through">
                          {getDisplayName({
                            nombre: currentProduct.nombre,
                            marca: currentProduct.marca,
                            especificaciones: currentProduct.especificaciones,
                            unidad: currentProduct.unidad,
                            contenido_empaque: currentProduct.contenido_empaque,
                            peso_kg: currentProduct.peso_kg,
                          })}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-green-700">
                          {getDisplayName({
                            nombre: editedSugerencia?.nombre_sugerido || sugerencia.nombre_sugerido,
                            marca: editedSugerencia?.marca_sugerida || sugerencia.marca_sugerida,
                            especificaciones: editedSugerencia?.especificaciones_sugerida || sugerencia.especificaciones_sugerida,
                            unidad: currentProduct.unidad,
                            contenido_empaque: editedSugerencia?.contenido_empaque_sugerido || sugerencia.contenido_empaque_sugerido,
                            peso_kg: editedSugerencia?.peso_kg_sugerido ?? sugerencia.peso_kg_sugerido,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Acciones */}
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkip} disabled={isAnalyzing || isSaving}>
                  <SkipForward className="h-4 w-4 mr-2" />
                  Saltar
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={isAnalyzing || isSaving || !sugerencia}
                  className="bg-crimson-500 text-white hover:bg-crimson-600"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 px-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <p>No hay productos pendientes de normalizar.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
