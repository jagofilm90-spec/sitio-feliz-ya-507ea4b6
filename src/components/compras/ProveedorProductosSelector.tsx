import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, Package, Truck, Settings2, ChevronDown, ChevronUp, Plus, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UNIDADES_PRODUCTO } from "@/lib/productUtils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProveedorProductosSelectorProps {
  proveedorId: string;
  proveedorNombre: string;
}

interface TransportConfig {
  tipo_vehiculo_estandar: string | null;
  capacidad_vehiculo_bultos: number | null;
  capacidad_vehiculo_kg: number | null;
  permite_combinacion: boolean;
  es_capacidad_fija: boolean;
  dividir_en_lotes_recepcion: boolean;
  cantidad_lotes_default: number | null;
  unidades_por_lote_default: number | null;
}

interface ProveedorProductoRow {
  id: string;
  producto_id: string;
  tipo_vehiculo_estandar: string | null;
  capacidad_vehiculo_bultos: number | null;
  capacidad_vehiculo_kg: number | null;
  permite_combinacion: boolean | null;
  es_capacidad_fija: boolean | null;
  dividir_en_lotes_recepcion: boolean | null;
  cantidad_lotes_default: number | null;
  unidades_por_lote_default: number | null;
  precio_por_kilo_compra: boolean | null;
  costo_proveedor: number | null;
  codigo_proveedor: string | null;
}

const TIPOS_VEHICULO = [
  { value: "trailer", label: "Tráiler", capacidadDefault: 20000 },
  { value: "torton", label: "Tortón", capacidadDefault: 10000 },
  { value: "rabon", label: "Rabón", capacidadDefault: 5000 },
  { value: "camioneta", label: "Camioneta", capacidadDefault: 3500 },
];

const ProveedorProductosSelector = ({ proveedorId, proveedorNombre }: ProveedorProductosSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [showCrearProducto, setShowCrearProducto] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all products
  const { data: productos = [] } = useQuery({
    queryKey: ["productos-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, nombre, codigo, marca, peso_kg")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  // Fetch products associated with this supplier WITH transport config and costo
  const { data: productosProveedor = [] } = useQuery({
    queryKey: ["proveedor-productos-config", proveedorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proveedor_productos")
        .select("id, producto_id, tipo_vehiculo_estandar, capacidad_vehiculo_bultos, capacidad_vehiculo_kg, permite_combinacion, es_capacidad_fija, dividir_en_lotes_recepcion, cantidad_lotes_default, unidades_por_lote_default, precio_por_kilo_compra, costo_proveedor, codigo_proveedor")
        .eq("proveedor_id", proveedorId);
      if (error) throw error;
      return data as ProveedorProductoRow[];
    },
    enabled: !!proveedorId,
  });

  const productosProveedorIds = productosProveedor.map(p => p.producto_id);

  const toggleProducto = useMutation({
    mutationFn: async ({ productoId, isSelected }: { productoId: string; isSelected: boolean }) => {
      if (isSelected) {
        const { error } = await supabase
          .from("proveedor_productos")
          .delete()
          .eq("proveedor_id", proveedorId)
          .eq("producto_id", productoId);
        if (error) throw error;
        setExpandedProducts(prev => {
          const next = new Set(prev);
          next.delete(productoId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from("proveedor_productos")
          .insert({ proveedor_id: proveedorId, producto_id: productoId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedor-productos-config", proveedorId] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateTransportConfig = useMutation({
    mutationFn: async ({ productoId, config }: { productoId: string; config: Partial<TransportConfig> }) => {
      const { error } = await supabase
        .from("proveedor_productos")
        .update({
          ...config,
          updated_at: new Date().toISOString(),
        })
        .eq("proveedor_id", proveedorId)
        .eq("producto_id", productoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedor-productos-config", proveedorId] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al guardar configuración",
        description: error.message,
      });
    },
  });

  const updateCostoProveedor = useMutation({
    mutationFn: async ({ productoId, costo }: { productoId: string; costo: number | null }) => {
      const { error } = await supabase
        .from("proveedor_productos")
        .update({
          costo_proveedor: costo,
          updated_at: new Date().toISOString(),
        })
        .eq("proveedor_id", proveedorId)
        .eq("producto_id", productoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedor-productos-config", proveedorId] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al guardar costo",
        description: error.message,
      });
    },
  });

  const updateCodigoProveedor = useMutation({
    mutationFn: async ({ productoId, codigo }: { productoId: string; codigo: string | null }) => {
      const { error } = await supabase
        .from("proveedor_productos")
        .update({
          codigo_proveedor: codigo,
          updated_at: new Date().toISOString(),
        })
        .eq("proveedor_id", proveedorId)
        .eq("producto_id", productoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedor-productos-config", proveedorId] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al guardar código",
        description: error.message,
      });
    },
  });

  const toggleExpanded = (productoId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productoId)) {
        next.delete(productoId);
      } else {
        next.add(productoId);
      }
      return next;
    });
  };

  const getProductConfig = (productoId: string): ProveedorProductoRow | undefined => {
    return productosProveedor.find(p => p.producto_id === productoId);
  };

  const hasTransportConfig = (productoId: string): boolean => {
    const config = getProductConfig(productoId);
    return !!(config?.tipo_vehiculo_estandar || config?.capacidad_vehiculo_bultos || config?.capacidad_vehiculo_kg || config?.dividir_en_lotes_recepcion || config?.precio_por_kilo_compra !== null);
  };

  const filteredProductos = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.marca && p.marca.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const productosConConfig = productosProveedor.filter(p => 
    p.tipo_vehiculo_estandar || p.capacidad_vehiculo_bultos || p.capacidad_vehiculo_kg
  ).length;

  const productosConCosto = productosProveedor.filter(p => p.costo_proveedor).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">
            Productos que vende {proveedorNombre}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{productosProveedorIds.length} productos</Badge>
          {productosConCosto > 0 && (
            <Badge variant="default" className="bg-green-600">
              <DollarSign className="h-3 w-3 mr-1" />
              {productosConCosto} con precio
            </Badge>
          )}
          {productosConConfig > 0 && (
            <Badge variant="outline">
              <Truck className="h-3 w-3 mr-1" />
              {productosConConfig} configurados
            </Badge>
          )}
        </div>
      </div>

      {/* Botón crear producto + buscador */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCrearProducto(true)}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Crear producto
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="space-y-2">
          {filteredProductos.map((producto) => {
            const isSelected = productosProveedorIds.includes(producto.id);
            const isExpanded = expandedProducts.has(producto.id);
            const config = getProductConfig(producto.id);
            const hasConfig = hasTransportConfig(producto.id);

            return (
              <div
                key={producto.id}
                className={`rounded-lg border transition-colors ${
                  isSelected ? "border-primary/50 bg-primary/5" : "border-transparent hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center space-x-3 p-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleProducto.mutate({ productoId: producto.id, isSelected })}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{producto.nombre}</span>
                      {producto.marca && (
                        <Badge variant="outline" className="text-xs">
                          {producto.marca}
                        </Badge>
                      )}
                      {config?.costo_proveedor && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          ${config.costo_proveedor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Badge>
                      )}
                      {hasConfig && (
                        <Badge variant="secondary" className="text-xs">
                          <Truck className="h-3 w-3 mr-1" />
                          Configurado
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{producto.codigo}</span>
                      {config?.codigo_proveedor && (
                        <Badge variant="outline" className="text-xs font-mono">
                          SKU: {config.codigo_proveedor}
                        </Badge>
                      )}
                      {producto.peso_kg && <span>• {producto.peso_kg}kg</span>}
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="flex items-center gap-2">
                      {/* Input de código proveedor inline */}
                      <Input
                        type="text"
                        placeholder="SKU Prov."
                        className="w-24 h-8 text-sm font-mono"
                        defaultValue={config?.codigo_proveedor || ""}
                        onBlur={(e) => {
                          const value = e.target.value.trim() || null;
                          if (value !== config?.codigo_proveedor) {
                            updateCodigoProveedor.mutate({ productoId: producto.id, codigo: value });
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {/* Input de costo inline */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Costo"
                          className="w-24 h-8 text-sm"
                          defaultValue={config?.costo_proveedor || ""}
                          onBlur={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : null;
                            if (value !== config?.costo_proveedor) {
                              updateCostoProveedor.mutate({ productoId: producto.id, costo: value });
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(producto.id);
                        }}
                      >
                        <Settings2 className="h-4 w-4 mr-1" />
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>

                {isSelected && isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-dashed ml-8">
                    <TransportConfigPanel
                      productoId={producto.id}
                      unidadComercial="bultos"
                      config={config}
                      onUpdate={(updates) => updateTransportConfig.mutate({ productoId: producto.id, config: updates })}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {filteredProductos.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No se encontraron productos
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
        <span>{filteredProductos.length} productos mostrados</span>
        <span className="font-medium text-foreground">{productosProveedorIds.length} productos asociados</span>
      </div>

      {/* Dialog para crear nuevo producto */}
      <CrearProductoDialog
        open={showCrearProducto}
        onOpenChange={setShowCrearProducto}
        proveedorId={proveedorId}
        proveedorNombre={proveedorNombre}
        onProductoCreado={() => {
          queryClient.invalidateQueries({ queryKey: ["productos-activos"] });
          queryClient.invalidateQueries({ queryKey: ["proveedor-productos-config", proveedorId] });
        }}
      />
    </div>
  );
};

// Dialog para crear nuevo producto
interface CrearProductoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedorId: string;
  proveedorNombre: string;
  onProductoCreado: () => void;
}

const CrearProductoDialog = ({ open, onOpenChange, proveedorId, proveedorNombre, onProductoCreado }: CrearProductoDialogProps) => {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [unidad, setUnidad] = useState<"bulto" | "kg" | "caja" | "pieza" | "costal" | "cubeta">("bulto");
  const [presentacion, setPresentacion] = useState("");
  const [aplica_iva, setAplicaIva] = useState(true);
  const [aplica_ieps, setAplicaIeps] = useState(false);
  const [costoProveedor, setCostoProveedor] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setNombre("");
    setCodigo("");
    setUnidad("bulto");
    setPresentacion("");
    setAplicaIva(true);
    setAplicaIeps(false);
    setCostoProveedor("");
    setPrecioVenta("");
  };

  const handleCreate = async () => {
    if (!nombre.trim() || !costoProveedor || !precioVenta) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Nombre, costo del proveedor y precio de venta son obligatorios",
      });
      return;
    }

    setSaving(true);
    try {
      // Generate codigo if empty
      let codigoFinal = codigo.trim();
      if (!codigoFinal) {
        const { data: maxCodigo } = await supabase
          .from("productos")
          .select("codigo")
          .like("codigo", "PROD-%")
          .order("codigo", { ascending: false })
          .limit(1);
        
        const nextNum = maxCodigo && maxCodigo[0] 
          ? parseInt(maxCodigo[0].codigo.replace("PROD-", "")) + 1 
          : 1;
        codigoFinal = `PROD-${nextNum.toString().padStart(4, "0")}`;
      }

      // Create product
      const { data: producto, error: productoError } = await supabase
        .from("productos")
        .insert([{
          nombre: nombre.trim(),
          codigo: codigoFinal,
          unidad,
          presentacion: presentacion ? parseFloat(presentacion) : null,
          aplica_iva,
          aplica_ieps,
          precio_venta: parseFloat(precioVenta),
          ultimo_costo_compra: parseFloat(costoProveedor),
          activo: true,
        }])
        .select()
        .single();

      if (productoError) throw productoError;

      // Associate with supplier and set costo
      const { error: asociarError } = await supabase
        .from("proveedor_productos")
        .insert({
          proveedor_id: proveedorId,
          producto_id: producto.id,
          costo_proveedor: parseFloat(costoProveedor),
        });

      if (asociarError) throw asociarError;

      toast({
        title: "Producto creado",
        description: `${nombre} ha sido creado y asociado a ${proveedorNombre}`,
      });

      resetForm();
      onOpenChange(false);
      onProductoCreado();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al crear producto",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculate margin
  const margen = costoProveedor && precioVenta 
    ? (((parseFloat(precioVenta) - parseFloat(costoProveedor)) / parseFloat(precioVenta)) * 100).toFixed(1)
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear producto nuevo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Este producto se asociará automáticamente a <strong>{proveedorNombre}</strong>
          </p>

          <div className="space-y-2">
            <Label>Nombre del producto *</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Almendra Natural"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Código (opcional)</Label>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Auto-generado"
              />
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Select value={unidad} onValueChange={(v) => setUnidad(v as typeof unidad)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES_PRODUCTO.map(unidad => (
                    <SelectItem key={unidad.value} value={unidad.value}>
                      {unidad.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Presentación (kg por unidad)</Label>
            <Input
              type="number"
              step="0.01"
              value={presentacion}
              onChange={(e) => setPresentacion(e.target.value)}
              placeholder="Ej: 22.68"
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <Checkbox checked={aplica_iva} onCheckedChange={(c) => setAplicaIva(!!c)} />
              <span className="text-sm">Grava IVA (16%)</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={aplica_ieps} onCheckedChange={(c) => setAplicaIeps(!!c)} />
              <span className="text-sm">Grava IEPS (8%)</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Costo proveedor (con IVA) *</Label>
              <Input
                type="number"
                step="0.01"
                value={costoProveedor}
                onChange={(e) => setCostoProveedor(e.target.value)}
                placeholder="$0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio venta (con IVA) *</Label>
              <Input
                type="number"
                step="0.01"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                placeholder="$0.00"
              />
            </div>
          </div>

          {margen && parseFloat(margen) > 0 && (
            <div className={`p-2 rounded text-sm ${
              parseFloat(margen) >= 15 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            }`}>
              Margen estimado: <strong>{margen}%</strong>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Guardando..." : "Crear producto"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Sub-component for transport configuration
interface TransportConfigPanelProps {
  productoId: string;
  unidadComercial: string;
  config: ProveedorProductoRow | undefined;
  onUpdate: (updates: Partial<TransportConfig>) => void;
}

const TransportConfigPanel = ({ productoId, unidadComercial, config, onUpdate }: TransportConfigPanelProps) => {
  const [localConfig, setLocalConfig] = useState<TransportConfig & { precio_por_kilo_compra?: boolean | null }>({
    tipo_vehiculo_estandar: config?.tipo_vehiculo_estandar || null,
    capacidad_vehiculo_bultos: config?.capacidad_vehiculo_bultos || null,
    capacidad_vehiculo_kg: config?.capacidad_vehiculo_kg || null,
    permite_combinacion: config?.permite_combinacion ?? false,
    es_capacidad_fija: config?.es_capacidad_fija ?? true,
    dividir_en_lotes_recepcion: config?.dividir_en_lotes_recepcion ?? false,
    cantidad_lotes_default: config?.cantidad_lotes_default || null,
    unidades_por_lote_default: config?.unidades_por_lote_default || null,
    precio_por_kilo_compra: config?.precio_por_kilo_compra ?? null,
  });

  const handleVehiculoChange = (value: string) => {
    const vehiculo = TIPOS_VEHICULO.find(v => v.value === value);
    const updates = {
      tipo_vehiculo_estandar: value,
      capacidad_vehiculo_kg: vehiculo?.capacidadDefault || null,
    };
    setLocalConfig(prev => ({ ...prev, ...updates }));
    onUpdate(updates);
  };

  const handleCapacidadBultosChange = (value: string) => {
    const numValue = value ? parseInt(value) : null;
    setLocalConfig(prev => ({ ...prev, capacidad_vehiculo_bultos: numValue }));
    onUpdate({ capacidad_vehiculo_bultos: numValue });
  };

  const handleCapacidadKgChange = (value: string) => {
    const numValue = value ? parseFloat(value) : null;
    setLocalConfig(prev => ({ ...prev, capacidad_vehiculo_kg: numValue }));
    onUpdate({ capacidad_vehiculo_kg: numValue });
  };

  const handleCombinacionChange = (checked: boolean) => {
    setLocalConfig(prev => ({ ...prev, permite_combinacion: checked }));
    onUpdate({ permite_combinacion: checked });
  };

  const handleCapacidadFijaChange = (checked: boolean) => {
    setLocalConfig(prev => ({ ...prev, es_capacidad_fija: checked }));
    onUpdate({ es_capacidad_fija: checked });
  };

  const handleDividirLotesChange = (checked: boolean) => {
    setLocalConfig(prev => ({ ...prev, dividir_en_lotes_recepcion: checked }));
    onUpdate({ dividir_en_lotes_recepcion: checked });
  };

  const handleCantidadLotesChange = (value: string) => {
    const numValue = value ? parseInt(value) : null;
    setLocalConfig(prev => ({ ...prev, cantidad_lotes_default: numValue }));
    onUpdate({ cantidad_lotes_default: numValue });
  };

  const handleUnidadesPorLoteChange = (value: string) => {
    const numValue = value ? parseInt(value) : null;
    setLocalConfig(prev => ({ ...prev, unidades_por_lote_default: numValue }));
    onUpdate({ unidades_por_lote_default: numValue });
  };

  const totalCalculado = (localConfig.cantidad_lotes_default || 0) * (localConfig.unidades_por_lote_default || 0);
  const coincideConCapacidad = localConfig.capacidad_vehiculo_bultos && totalCalculado === localConfig.capacidad_vehiculo_bultos;

  const handlePrecioPorKiloCompraChange = (value: string) => {
    const boolValue = value === 'true' ? true : value === 'false' ? false : null;
    setLocalConfig(prev => ({ ...prev, precio_por_kilo_compra: boolValue }));
    onUpdate({ precio_por_kilo_compra: boolValue } as any);
  };

  return (
    <div className="mt-3 space-y-4 p-3 bg-muted/30 rounded-lg">
      {/* Unidad de Compra - First and most important */}
      <div className="space-y-2 pb-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
          💰 Unidad de Compra
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          ¿Cómo te cobra el proveedor este producto?
        </p>
        <div className="flex gap-2">
          <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
            (config?.precio_por_kilo_compra as any) === true ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/50'
          }`}>
            <input
              type="radio"
              name={`precio-compra-${productoId}`}
              checked={(config?.precio_por_kilo_compra as any) === true}
              onChange={() => handlePrecioPorKiloCompraChange('true')}
              className="sr-only"
            />
            <span className="text-sm">Por kilo</span>
          </label>
          <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
            (config?.precio_por_kilo_compra as any) === false ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/50'
          }`}>
            <input
              type="radio"
              name={`precio-compra-${productoId}`}
              checked={(config?.precio_por_kilo_compra as any) === false}
              onChange={() => handlePrecioPorKiloCompraChange('false')}
              className="sr-only"
            />
            <span className="text-sm">Por bulto/caja</span>
          </label>
          <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
            config?.precio_por_kilo_compra === null || config?.precio_por_kilo_compra === undefined ? 'border-muted-foreground/30 bg-muted/50' : 'border-border hover:border-muted-foreground/50'
          }`}>
            <input
              type="radio"
              name={`precio-compra-${productoId}`}
              checked={config?.precio_por_kilo_compra === null || config?.precio_por_kilo_compra === undefined}
              onChange={() => handlePrecioPorKiloCompraChange('null')}
              className="sr-only"
            />
            <span className="text-sm text-muted-foreground">Sin definir</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Truck className="h-4 w-4" />
        Configuración de Transporte
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Tipo de Vehículo</Label>
          <Select
            value={localConfig.tipo_vehiculo_estandar || ""}
            onValueChange={handleVehiculoChange}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_VEHICULO.map(tipo => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Capacidad ({unidadComercial})</Label>
          <Input
            type="number"
            placeholder="Ej: 1200"
            className="h-9"
            value={localConfig.capacidad_vehiculo_bultos || ""}
            onChange={(e) => handleCapacidadBultosChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Capacidad en kg (opcional)</Label>
        <Input
          type="number"
          placeholder="Ej: 20000"
          className="h-9"
          value={localConfig.capacidad_vehiculo_kg || ""}
          onChange={(e) => handleCapacidadKgChange(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-xs">Permite combinación</Label>
            <p className="text-xs text-muted-foreground">
              Puede mezclarse con otros productos en el mismo vehículo
            </p>
          </div>
          <Switch
            checked={localConfig.permite_combinacion}
            onCheckedChange={handleCombinacionChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-xs">Capacidad fija</Label>
            <p className="text-xs text-muted-foreground">
              Siempre viene en esta cantidad exacta
            </p>
          </div>
          <Switch
            checked={localConfig.es_capacidad_fija}
            onCheckedChange={handleCapacidadFijaChange}
          />
        </div>
      </div>

      {/* Configuración de Lotes */}
      <div className="pt-3 border-t space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Package className="h-4 w-4" />
          Configuración de Lotes en Recepción
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-xs">Dividir en lotes al recibir</Label>
            <p className="text-xs text-muted-foreground">
              El producto viene dividido en múltiples lotes
            </p>
          </div>
          <Switch
            checked={localConfig.dividir_en_lotes_recepcion}
            onCheckedChange={handleDividirLotesChange}
          />
        </div>

        {localConfig.dividir_en_lotes_recepcion && (
          <div className="space-y-3 p-3 bg-primary/5 rounded-md border border-primary/20">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cantidad de lotes</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Ej: 4"
                  className="h-9"
                  value={localConfig.cantidad_lotes_default || ""}
                  onChange={(e) => handleCantidadLotesChange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unidades por lote</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Ej: 700"
                  className="h-9"
                  value={localConfig.unidades_por_lote_default || ""}
                  onChange={(e) => handleUnidadesPorLoteChange(e.target.value)}
                />
              </div>
            </div>

            {localConfig.cantidad_lotes_default && localConfig.unidades_por_lote_default && (
              <div className={`p-2 rounded text-sm ${
                coincideConCapacidad 
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
              }`}>
                <span className="font-medium">Total calculado: </span>
                {localConfig.cantidad_lotes_default} lotes × {localConfig.unidades_por_lote_default} = {totalCalculado.toLocaleString()} {unidadComercial}
                {localConfig.capacidad_vehiculo_bultos && !coincideConCapacidad && (
                  <span className="block text-xs mt-1">
                    ⚠️ No coincide con capacidad del vehículo ({localConfig.capacidad_vehiculo_bultos.toLocaleString()})
                  </span>
                )}
                {coincideConCapacidad && (
                  <span className="block text-xs mt-1">
                    ✓ Coincide con capacidad del vehículo
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {localConfig.tipo_vehiculo_estandar && localConfig.capacidad_vehiculo_bultos && (
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Resumen:</span>{" "}
            {TIPOS_VEHICULO.find(v => v.value === localConfig.tipo_vehiculo_estandar)?.label} de{" "}
            {localConfig.capacidad_vehiculo_bultos.toLocaleString()} {unidadComercial}
            {localConfig.es_capacidad_fija && " (capacidad fija)"}
            {localConfig.permite_combinacion && " • Combinable"}
            {localConfig.dividir_en_lotes_recepcion && localConfig.cantidad_lotes_default && (
              <> • {localConfig.cantidad_lotes_default} lotes</>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProveedorProductosSelector;
