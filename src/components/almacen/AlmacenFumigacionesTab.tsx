import { useState, useEffect } from "react";
import { format, differenceInDays, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Bug,
  Calendar,
  AlertTriangle,
  AlertCircle,
  FileQuestion,
  Edit2,
  CheckCircle2
} from "lucide-react";

interface ProductoFumigacion {
  id: string;
  codigo: string;
  nombre: string;
  fecha_ultima_fumigacion: string | null;
  stock_actual: number;
}

interface AlmacenFumigacionesTabProps {
  onStatsUpdate: (stats: { vencidas: number; proximas: number; vigentes: number }) => void;
}

type EstadoTipo = "sin_registro" | "proxima" | "vencida" | "vigente";

interface EstadoFumigacion {
  tipo: EstadoTipo;
  label: string;
  color: string;
  bgColor: string;
}

const DIAS_ALERTA_PROXIMA = 14; // 2 semanas antes de vencer

export const AlmacenFumigacionesTab = ({ onStatsUpdate }: AlmacenFumigacionesTabProps) => {
  const [productos, setProductos] = useState<ProductoFumigacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProducto, setEditingProducto] = useState<ProductoFumigacion | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadProductos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("id, codigo, nombre, fecha_ultima_fumigacion, stock_actual")
        .eq("requiere_fumigacion", true)
        .eq("activo", true)
        .order("fecha_ultima_fumigacion", { ascending: true, nullsFirst: true });

      if (error) throw error;

      const productosData = (data as ProductoFumigacion[]) || [];
      setProductos(productosData);
      
      // Calcular estadísticas
      let vencidas = 0;
      let proximas = 0;
      let vigentes = 0;
      
      productosData.forEach(p => {
        const estado = getEstadoFumigacion(p.fecha_ultima_fumigacion);
        if (estado.tipo === "vencida" || estado.tipo === "sin_registro") vencidas++;
        else if (estado.tipo === "proxima") proximas++;
        else vigentes++;
      });
      
      onStatsUpdate({ vencidas, proximas, vigentes });
    } catch (error) {
      console.error("Error cargando productos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductos();
  }, []);

  const getEstadoFumigacion = (fechaUltima: string | null): EstadoFumigacion => {
    if (!fechaUltima) {
      return { 
        tipo: "sin_registro", 
        label: "Sin registro", 
        color: "text-destructive", 
        bgColor: "bg-destructive/10" 
      };
    }

    const fechaProxima = addMonths(new Date(fechaUltima), 6);
    const diasRestantes = differenceInDays(fechaProxima, new Date());

    if (diasRestantes < 0) {
      return { 
        tipo: "vencida", 
        label: `Vencida hace ${Math.abs(diasRestantes)} días`, 
        color: "text-destructive", 
        bgColor: "bg-destructive/10" 
      };
    } else if (diasRestantes <= DIAS_ALERTA_PROXIMA) {
      return { 
        tipo: "proxima", 
        label: `Vence en ${diasRestantes} días`, 
        color: "text-amber-600", 
        bgColor: "bg-amber-500/10" 
      };
    } else {
      return { 
        tipo: "vigente", 
        label: `${diasRestantes} días restantes`, 
        color: "text-green-600", 
        bgColor: "bg-green-500/10" 
      };
    }
  };

  const handleEditarFecha = (producto: ProductoFumigacion) => {
    setEditingProducto(producto);
    setNuevaFecha(format(new Date(), "yyyy-MM-dd"));
  };

  const handleGuardarFecha = async () => {
    if (!editingProducto || !nuevaFecha) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("productos")
        .update({ fecha_ultima_fumigacion: nuevaFecha })
        .eq("id", editingProducto.id);

      if (error) throw error;

      toast({
        title: "Fecha actualizada",
        description: `Fumigación registrada para ${editingProducto.nombre}`
      });

      setEditingProducto(null);
      loadProductos();
    } catch (error) {
      console.error("Error actualizando fecha:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Filtrar productos por categoría
  const productosSinRegistro = productos.filter(p => p.fecha_ultima_fumigacion === null);
  const productosVigentes = productos.filter(p => {
    const estado = getEstadoFumigacion(p.fecha_ultima_fumigacion);
    return estado.tipo === "vigente";
  });
  const productosProximos = productos.filter(p => {
    const estado = getEstadoFumigacion(p.fecha_ultima_fumigacion);
    return estado.tipo === "proxima";
  });
  const productosVencidos = productos.filter(p => {
    const estado = getEstadoFumigacion(p.fecha_ultima_fumigacion);
    return estado.tipo === "vencida" && p.fecha_ultima_fumigacion !== null;
  });

  const renderProductoItem = (producto: ProductoFumigacion) => {
    const estado = getEstadoFumigacion(producto.fecha_ultima_fumigacion);

    return (
      <div
        key={producto.id}
        className={`p-4 flex items-center gap-4 border-b last:border-b-0 ${estado.bgColor}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{producto.codigo}</span>
            {producto.stock_actual > 0 && (
              <Badge variant="outline" className="text-xs">
                {producto.stock_actual} kg
              </Badge>
            )}
            {producto.stock_actual === 0 && (
              <Badge variant="secondary" className="text-xs">
                Sin stock
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {producto.nombre}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Última: {producto.fecha_ultima_fumigacion 
                ? format(new Date(producto.fecha_ultima_fumigacion), "dd/MM/yyyy", { locale: es })
                : "Sin registro"}
            </span>
            <span className={`text-xs font-medium ${estado.color}`}>
              • {estado.label}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEditarFecha(producto)}
          className="shrink-0"
        >
          <Edit2 className="w-4 h-4 mr-1" />
          Registrar
        </Button>
      </div>
    );
  };

  const renderEmptyState = (tipo: "sin_registro" | "vigente" | "proxima" | "vencida") => {
    const configs = {
      sin_registro: {
        icon: FileQuestion,
        title: "No hay productos sin registro",
        subtitle: "Todos los productos tienen fecha de fumigación",
        colorClass: "text-muted-foreground"
      },
      vigente: {
        icon: CheckCircle2,
        title: "No hay productos vigentes",
        subtitle: "Ningún producto tiene fumigación al día",
        colorClass: "text-green-600"
      },
      proxima: {
        icon: AlertTriangle,
        title: "No hay fumigaciones próximas a vencer",
        subtitle: "Ningún producto vence en los próximos 14 días",
        colorClass: "text-amber-500"
      },
      vencida: {
        icon: AlertCircle,
        title: "No hay fumigaciones vencidas",
        subtitle: "Todos los productos están al día",
        colorClass: "text-green-600"
      },
    };

    const config = configs[tipo];
    const Icon = config.icon;

    return (
      <div className="p-8 text-center text-muted-foreground">
        <Icon className={`w-10 h-10 mx-auto mb-3 opacity-50 ${config.colorClass}`} />
        <p className="font-medium">{config.title}</p>
        <p className="text-xs mt-1">{config.subtitle}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Bug className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay productos configurados para fumigación</p>
        <p className="text-xs mt-1">Marca productos con "Requiere fumigación" en el catálogo</p>
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="sin_registro" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-2">
          <TabsTrigger value="sin_registro" className="flex items-center gap-1 text-xs px-1">
            <FileQuestion className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Sin registro</span>
            <span className="sm:hidden">S/R</span>
            {productosSinRegistro.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {productosSinRegistro.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vigente" className="flex items-center gap-1 text-xs px-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Vigentes</span>
            <span className="sm:hidden">Vig</span>
            {productosVigentes.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs bg-green-600 hover:bg-green-600">
                {productosVigentes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="proxima" className="flex items-center gap-1 text-xs px-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Por vencer</span>
            <span className="sm:hidden">Próx</span>
            {productosProximos.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs bg-amber-500 hover:bg-amber-500">
                {productosProximos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vencida" className="flex items-center gap-1 text-xs px-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Vencidas</span>
            <span className="sm:hidden">Venc</span>
            {productosVencidos.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {productosVencidos.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-380px)] min-h-[250px]">
              <TabsContent value="sin_registro" className="m-0">
                {productosSinRegistro.length > 0
                  ? productosSinRegistro.map(renderProductoItem)
                  : renderEmptyState("sin_registro")}
              </TabsContent>

              <TabsContent value="vigente" className="m-0">
                {productosVigentes.length > 0
                  ? productosVigentes.map(renderProductoItem)
                  : renderEmptyState("vigente")}
              </TabsContent>

              <TabsContent value="proxima" className="m-0">
                {productosProximos.length > 0
                  ? productosProximos.map(renderProductoItem)
                  : renderEmptyState("proxima")}
              </TabsContent>

              <TabsContent value="vencida" className="m-0">
                {productosVencidos.length > 0
                  ? productosVencidos.map(renderProductoItem)
                  : renderEmptyState("vencida")}
              </TabsContent>
            </ScrollArea>
          </CardContent>
        </Card>
      </Tabs>

      {/* Dialog para editar fecha */}
      <Dialog open={!!editingProducto} onOpenChange={() => setEditingProducto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Registrar fumigación
            </DialogTitle>
          </DialogHeader>
          
          {editingProducto && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{editingProducto.codigo}</p>
                <p className="text-sm text-muted-foreground">{editingProducto.nombre}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Fecha de fumigación</Label>
                <Input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProducto(null)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarFecha} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
