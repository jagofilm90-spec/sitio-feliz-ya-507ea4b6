import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Sparkles,
  Check,
  X,
  SkipForward,
  Edit2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  especificaciones: string | null;
  peso_kg: number | null;
  unidad: string;
}

interface Sugerencia {
  nombre_sugerido: string;
  especificaciones_sugerida: string;
  marca_sugerida: string | null;
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
      .select("id, codigo, nombre, marca, especificaciones, peso_kg, unidad")
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
      return tienePatrones || sinEspec;
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

      setSugerencia(data);
      setEditedSugerencia(data);
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

  const getDescripcionCompleta = (nombre: string, espec: string | null, marca: string | null) => {
    let desc = nombre;
    if (espec) desc += ` ${espec}`;
    if (marca) desc += ` (${marca})`;
    return desc;
  };

  const progress = productos.length > 0 
    ? ((normalizados.length + skipped.length) / productos.length) * 100 
    : 0;

  const isComplete = currentIndex >= productos.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-600" />
            Normalizar Productos con IA
          </DialogTitle>
          <DialogDescription>
            La IA analiza cada producto y sugiere cómo separar nombre, especificaciones y marca.
          </DialogDescription>
        </DialogHeader>

        {/* Progreso */}
        <div className="space-y-2">
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
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
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
          <div className="space-y-4">
            {/* Producto actual */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono">
                    {currentProduct.codigo}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Producto {currentIndex + 1} de {productos.length}
                  </span>
                </div>

                {/* Datos actuales */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">ACTUAL</h4>
                  <div className="grid gap-2 text-sm bg-muted/50 p-3 rounded-md">
                    <div className="flex">
                      <span className="w-32 text-muted-foreground">Nombre:</span>
                      <span className="font-medium">{currentProduct.nombre}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-muted-foreground">Especificaciones:</span>
                      <span className={currentProduct.especificaciones ? "" : "text-yellow-600"}>
                        {currentProduct.especificaciones || "(vacío)"}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-muted-foreground">Marca:</span>
                      <span>{currentProduct.marca || "(sin marca)"}</span>
                    </div>
                  </div>
                </div>

                {/* Sugerencia IA */}
                {isAnalyzing ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-pink-600" />
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
                        {editMode ? "Cancelar edición" : "Editar"}
                      </Button>
                    </div>

                    {editMode && editedSugerencia ? (
                      <div className="grid gap-3 bg-pink-50 dark:bg-pink-950/20 p-3 rounded-md border border-pink-200">
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
                            value={editedSugerencia.especificaciones_sugerida}
                            onChange={(e) =>
                              setEditedSugerencia({
                                ...editedSugerencia,
                                especificaciones_sugerida: e.target.value,
                              })
                            }
                          />
                        </div>
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
                      </div>
                    ) : (
                      <div className="grid gap-2 text-sm bg-pink-50 dark:bg-pink-950/20 p-3 rounded-md border border-pink-200">
                        <div className="flex">
                          <span className="w-32 text-muted-foreground">Nombre:</span>
                          <span className="font-medium text-pink-700 dark:text-pink-400">
                            {sugerencia.nombre_sugerido}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="w-32 text-muted-foreground">Especificaciones:</span>
                          <span className="font-medium text-pink-700 dark:text-pink-400">
                            {sugerencia.especificaciones_sugerida || "(vacío)"}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="w-32 text-muted-foreground">Marca:</span>
                          <span className="font-medium text-pink-700 dark:text-pink-400">
                            {sugerencia.marca_sugerida || "(sin marca)"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Explicación */}
                    {sugerencia.explicacion && (
                      <div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <span className="text-blue-700 dark:text-blue-400">
                          {sugerencia.explicacion}
                        </span>
                      </div>
                    )}

                    {/* Preview en documentos */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-muted-foreground">
                        VISTA EN DOCUMENTOS
                      </h4>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground line-through">
                          {getDescripcionCompleta(
                            currentProduct.nombre,
                            currentProduct.especificaciones,
                            currentProduct.marca
                          )}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-green-700 dark:text-green-400">
                          {getDescripcionCompleta(
                            editedSugerencia?.nombre_sugerido || sugerencia.nombre_sugerido,
                            editedSugerencia?.especificaciones_sugerida || sugerencia.especificaciones_sugerida,
                            editedSugerencia?.marca_sugerida || sugerencia.marca_sugerida
                          )}
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
                <X className="h-4 w-4 mr-2" />
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
                  className="bg-pink-600 hover:bg-pink-700"
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
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <p>No hay productos pendientes de normalizar.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
