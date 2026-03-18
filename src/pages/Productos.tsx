import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Power, RotateCcw, ChevronDown, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LotesDesglose } from "@/components/productos/LotesDesglose";
import { NotificacionesSistema } from "@/components/NotificacionesSistema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDisplayName, UNIDADES_SAT, UNIDADES_PRODUCTO } from "@/lib/productUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import ProductoCardMobile from "@/components/productos/ProductoCardMobile";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

const Productos = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [tabActivo, setTabActivo] = useState<"activos" | "inactivos">("activos");
  const [codigoGapWarning, setCodigoGapWarning] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [similarNameSuggestion, setSimilarNameSuggestion] = useState<{ suggestedName: string; codigo: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Filter state
  const [filterMarca, setFilterMarca] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterImpuestos, setFilterImpuestos] = useState("all");
  const [filterTipoPrecio, setFilterTipoPrecio] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  const hasActiveFilters = filterMarca !== "all" || filterCategoria !== "all" || filterImpuestos !== "all" || filterTipoPrecio !== "all" || filterStock !== "all";

  const clearFilters = () => {
    setFilterMarca("all");
    setFilterCategoria("all");
    setFilterImpuestos("all");
    setFilterTipoPrecio("all");
    setFilterStock("all");
  };

  // Función para normalizar texto (quitar acentos y convertir a minúsculas)
  const normalizeText = (text: string): string => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  };

  // Función para verificar si existe un producto con nombre similar (ignorando acentos)
  const checkSimilarProductName = (nombre: string): { suggestedName: string; codigo: string } | null => {
    if (!nombre || nombre.trim().length < 3) return null;
    
    const normalizedInput = normalizeText(nombre);
    
    const similar = productos.find(p => {
      if (editingProduct && p.id === editingProduct.id) return false;
      const normalizedExisting = normalizeText(p.nombre || '');
      return normalizedExisting === normalizedInput && 
             (p.nombre || '').trim().toLowerCase() !== nombre.trim().toLowerCase();
    });

    if (similar) {
      return { suggestedName: similar.nombre, codigo: similar.codigo };
    }
    return null;
  };

  const applySuggestedName = () => {
    if (similarNameSuggestion) {
      setFormData({ ...formData, nombre: similarNameSuggestion.suggestedName });
      setSimilarNameSuggestion(null);
    }
  };

  const dismissSuggestion = () => {
    setSimilarNameSuggestion(null);
  };

  const getNextAvailableCodeForPrefix = (prefix: string): string | null => {
    if (!prefix) return null;
    const cleanPrefix = prefix.replace(/[-_\s]+$/, '');
    const separator = prefix.match(/[-_\s]+$/)?.[0] || '-';
    
    const matchingCodes = productos
      .map(p => {
        const regex = new RegExp(`^${cleanPrefix}[-_\\s]*(\\d+)$`, 'i');
        const match = p.codigo.match(regex);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(n => n !== null) as number[];
    
    if (matchingCodes.length === 0) {
      return `${cleanPrefix}${separator}001`;
    }
    
    const existingCode = productos.find(p => p.codigo.toLowerCase().startsWith(cleanPrefix.toLowerCase()));
    const numMatch = existingCode?.codigo.match(/(\d+)$/);
    const padLength = numMatch ? numMatch[1].length : 3;
    
    const sortedNumbers = [...new Set(matchingCodes)].sort((a, b) => a - b);
    
    for (let i = 1; i <= sortedNumbers[sortedNumbers.length - 1]; i++) {
      if (!sortedNumbers.includes(i)) {
        return `${cleanPrefix}${separator}${i.toString().padStart(padLength, '0')}`;
      }
    }
    
    const nextNum = Math.max(...matchingCodes) + 1;
    return `${cleanPrefix}${separator}${nextNum.toString().padStart(padLength, '0')}`;
  };

  const checkCodigoGap = (codigo: string) => {
    if (!codigo) {
      setCodigoGapWarning(null);
      return;
    }

    const numMatch = codigo.match(/(\d+)/);
    if (!numMatch) {
      setCodigoGapWarning(null);
      return;
    }

    const inputNum = parseInt(numMatch[1], 10);
    const prefix = codigo.slice(0, codigo.indexOf(numMatch[1]));
    const numLength = numMatch[1].length;

    const existingCodes = productos
      .map(p => {
        const match = p.codigo.match(new RegExp(`^${prefix}(\\d{${numLength}})$`));
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(n => n !== null) as number[];

    const missingCodes: string[] = [];
    for (let i = 1; i < inputNum; i++) {
      if (!existingCodes.includes(i)) {
        const paddedNum = i.toString().padStart(numLength, '0');
        missingCodes.push(`${prefix}${paddedNum}`);
      }
    }

    if (missingCodes.length > 0) {
      const displayCodes = missingCodes.length <= 3 
        ? missingCodes.join(", ") 
        : `${missingCodes.slice(0, 3).join(", ")}... (${missingCodes.length} códigos faltantes)`;
      setCodigoGapWarning(`Códigos faltantes: ${displayCodes}`);
    } else {
      setCodigoGapWarning(null);
    }
  };

  const checkDuplicateProduct = (nombre: string, marca: string, especificaciones: string, unidad: string): string | null => {
    const normalizedNombre = normalizeText(nombre);
    const normalizedMarca = normalizeText(marca || '');
    const normalizedEspecificaciones = (especificaciones || '').trim().toLowerCase();
    const normalizedUnidad = unidad;

    const duplicate = productos.find(p => {
      if (editingProduct && p.id === editingProduct.id) return false;

      const pNombre = normalizeText(p.nombre || '');
      const pMarca = normalizeText(p.marca || '');
      const pEspecificaciones = (p.especificaciones || '').trim().toLowerCase();
      const pUnidad = p.unidad;

      return pNombre === normalizedNombre &&
             pMarca === normalizedMarca &&
             pEspecificaciones === normalizedEspecificaciones &&
             pUnidad === normalizedUnidad;
    });

    if (duplicate) {
      return `Ya existe un producto con estas características: "${duplicate.nombre}" (${duplicate.codigo})`;
    }
    return null;
  };

  const [formData, setFormData] = useState({
    codigo: "",
    codigo_sat: "",
    nombre: "",
    marca: "",
    categoria: "",
    especificaciones: "",
    contenido_empaque: "",
    unidad_sat: "",
    peso_kg: "",
    unidad: "bulto" as "bulto" | "caja" | "churla" | "costal" | "cubeta" | "kg" | "litro" | "pieza" | "balón",
    piezas_por_unidad: "1",
    precio_compra: "",
    precio_venta: "",
    precio_por_kilo: false,
    descuento_maximo: "",
    stock_minimo: "",
    maneja_caducidad: false,
    aplica_iva: false,
    aplica_ieps: false,
    activo: true,
    requiere_fumigacion: false,
    fecha_ultima_fumigacion: "",
    fecha_caducidad_inicial: "",
    stock_inicial: "",
    proveedor_id: "",
    solo_uso_interno: false,
    es_promocion: false,
    descripcion_promocion: "",
    bloqueado_venta: false,
  });

  useEffect(() => {
    loadProductos();
    loadProveedores();
  }, []);

  const loadProveedores = async () => {
    try {
      const { data, error } = await supabase
        .from("proveedores")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setProveedores(data || []);
    } catch (error: any) {
      console.error("Error loading proveedores:", error);
    }
  };

  const loadProductos = async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select(`
          *,
          proveedores:proveedor_preferido_id (
            id,
            nombre
          )
        `)
        .order("codigo");

      if (error) throw error;
      setProductos(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    const precioVenta = parseFloat(formData.precio_venta);
    if (!precioVenta || precioVenta <= 0) {
      toast({ title: "Error", description: "El precio de venta es requerido y debe ser mayor a 0", variant: "destructive" });
      return;
    }

    if (formData.precio_por_kilo && (!formData.peso_kg || parseFloat(formData.peso_kg) <= 0)) {
      toast({ title: "Error", description: "Los productos por kilo requieren peso_kg", variant: "destructive" });
      return;
    }

    const descMax = parseFloat(formData.descuento_maximo) || 0;
    if (descMax > 0 && descMax >= precioVenta) {
      toast({ title: "Error", description: "El descuento máximo no puede ser mayor al precio de venta", variant: "destructive" });
      return;
    }

    const stockMin = parseInt(formData.stock_minimo) || 0;
    if (stockMin < 0) {
      toast({ title: "Error", description: "El stock mínimo debe ser >= 0", variant: "destructive" });
      return;
    }

    // Check unique codigo
    const codigoExiste = productos.find(p => 
      p.codigo.toLowerCase() === formData.codigo.toLowerCase() && 
      (!editingProduct || p.id !== editingProduct.id)
    );
    if (codigoExiste) {
      toast({ title: "Error", description: `El código "${formData.codigo}" ya existe`, variant: "destructive" });
      return;
    }

    // Verificar producto duplicado
    const duplicateError = checkDuplicateProduct(formData.nombre, formData.marca, formData.especificaciones, formData.unidad);
    if (duplicateError) {
      setDuplicateWarning(duplicateError);
      toast({ title: "Producto duplicado", description: duplicateError, variant: "destructive" });
      return;
    }
    
    try {
      const productData = {
        codigo: formData.codigo,
        codigo_sat: formData.codigo_sat || null,
        nombre: formData.nombre,
        marca: formData.marca || null,
        categoria: formData.categoria || null,
        especificaciones: formData.especificaciones || null,
        contenido_empaque: formData.contenido_empaque || null,
        unidad_sat: formData.unidad_sat || null,
        peso_kg: formData.peso_kg ? parseFloat(formData.peso_kg) : null,
        unidad: formData.unidad,
        piezas_por_unidad: formData.piezas_por_unidad ? parseInt(formData.piezas_por_unidad) : 1,
        precio_compra: parseFloat(formData.precio_compra) || 0,
        precio_venta: precioVenta,
        precio_por_kilo: formData.precio_por_kilo,
        descuento_maximo: descMax || null,
        stock_minimo: stockMin,
        maneja_caducidad: formData.maneja_caducidad,
        aplica_iva: formData.aplica_iva,
        aplica_ieps: formData.aplica_ieps,
        activo: formData.activo,
        requiere_fumigacion: formData.requiere_fumigacion,
        fecha_ultima_fumigacion: formData.fecha_ultima_fumigacion || null,
        solo_uso_interno: formData.solo_uso_interno,
        es_promocion: formData.es_promocion,
        descripcion_promocion: formData.es_promocion ? (formData.descripcion_promocion || null) : null,
        bloqueado_venta: formData.bloqueado_venta,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("productos")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;

        const stockAgregar = parseInt(formData.stock_inicial) || 0;
        if (stockAgregar > 0) {
          const loteData: any = {
            producto_id: editingProduct.id,
            cantidad_disponible: stockAgregar,
            precio_compra: parseFloat(formData.precio_compra) || 0,
            lote_referencia: "Carga inicial",
          };
          
          if (formData.maneja_caducidad && formData.fecha_caducidad_inicial) {
            loteData.fecha_caducidad = formData.fecha_caducidad_inicial;
          }

          const { error: loteError } = await supabase
            .from("inventario_lotes")
            .insert([loteData]);

          if (loteError) {
            console.error("Error creando lote:", loteError);
          } else {
            await supabase
              .from("productos")
              .update({ stock_actual: (editingProduct.stock_actual || 0) + stockAgregar })
              .eq("id", editingProduct.id);
          }
        }

        toast({ title: "Producto actualizado correctamente" });
      } else {
        const { data: newProduct, error } = await supabase
          .from("productos")
          .insert([productData])
          .select()
          .single();

        if (error) throw error;

        if (formData.proveedor_id && newProduct) {
          const { error: provError } = await supabase
            .from("proveedor_productos")
            .insert([{
              proveedor_id: formData.proveedor_id,
              producto_id: newProduct.id
            }]);
          
          if (provError) {
            console.error("Error asociando proveedor:", provError);
          }
        }

        const stockInicial = parseInt(formData.stock_inicial) || 0;
        if (stockInicial > 0 && newProduct) {
          const loteData: any = {
            producto_id: newProduct.id,
            cantidad_disponible: stockInicial,
            precio_compra: parseFloat(formData.precio_compra) || 0,
            lote_referencia: "Lote inicial",
          };
          
          if (formData.maneja_caducidad && formData.fecha_caducidad_inicial) {
            loteData.fecha_caducidad = formData.fecha_caducidad_inicial;
          }

          const { error: loteError } = await supabase
            .from("inventario_lotes")
            .insert([loteData]);

          if (loteError) {
            console.error("Error creando lote inicial:", loteError);
          }

          await supabase
            .from("productos")
            .update({ stock_actual: stockInicial })
            .eq("id", newProduct.id);
        }

        toast({ title: "Producto creado correctamente" });
      }

      setDialogOpen(false);
      resetForm();
      loadProductos();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      codigo: product.codigo,
      codigo_sat: product.codigo_sat || "",
      nombre: product.nombre,
      marca: product.marca || "",
      categoria: product.categoria || "",
      especificaciones: product.especificaciones || "",
      contenido_empaque: product.contenido_empaque || "",
      unidad_sat: product.unidad_sat || "",
      peso_kg: product.peso_kg?.toString() || "",
      unidad: product.unidad,
      piezas_por_unidad: product.piezas_por_unidad?.toString() || "1",
      precio_compra: product.precio_compra?.toString() || "",
      precio_venta: product.precio_venta?.toString() || "",
      precio_por_kilo: product.precio_por_kilo || false,
      descuento_maximo: product.descuento_maximo?.toString() || "",
      stock_minimo: product.stock_minimo?.toString() || "0",
      maneja_caducidad: product.maneja_caducidad,
      aplica_iva: product.aplica_iva || false,
      aplica_ieps: product.aplica_ieps || false,
      activo: product.activo !== false,
      requiere_fumigacion: product.requiere_fumigacion || false,
      fecha_ultima_fumigacion: product.fecha_ultima_fumigacion || "",
      fecha_caducidad_inicial: "",
      stock_inicial: "",
      proveedor_id: "",
      solo_uso_interno: product.solo_uso_interno || false,
      es_promocion: product.es_promocion || false,
      descripcion_promocion: product.descripcion_promocion || "",
      bloqueado_venta: product.bloqueado_venta || false,
    });
    setDialogOpen(true);
  };

  const handleDeactivate = async (producto: any) => {
    setDeleteTarget(producto);
  };

  const confirmDeactivate = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from("productos")
        .update({ activo: false })
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast({ title: `"${deleteTarget.nombre}" desactivado` });
      loadProductos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleReactivate = async (producto: any) => {
    try {
      const { error } = await supabase
        .from("productos")
        .update({ activo: true })
        .eq("id", producto.id);

      if (error) throw error;
      toast({ title: "Producto reactivado" });
      loadProductos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setCodigoGapWarning(null);
    setDuplicateWarning(null);
    setSimilarNameSuggestion(null);
    setFormData({
      codigo: "",
      codigo_sat: "",
      nombre: "",
      marca: "",
      categoria: "",
      especificaciones: "",
      contenido_empaque: "",
      unidad_sat: "",
      peso_kg: "",
      unidad: "bulto",
      piezas_por_unidad: "1",
      precio_compra: "",
      precio_venta: "",
      precio_por_kilo: false,
      descuento_maximo: "",
      stock_minimo: "",
      maneja_caducidad: false,
      aplica_iva: false,
      aplica_ieps: false,
      activo: true,
      requiere_fumigacion: false,
      fecha_ultima_fumigacion: "",
      fecha_caducidad_inicial: "",
      stock_inicial: "",
      proveedor_id: "",
      solo_uso_interno: false,
      es_promocion: false,
      descripcion_promocion: "",
      bloqueado_venta: false,
    });
  };

  // Unique values for filters
  const marcasUnicas = [...new Set(productos.filter(p => p.activo !== false && p.marca).map(p => p.marca))].sort();
  const categoriasUnicas = [...new Set(productos.filter(p => p.activo !== false && p.categoria).map(p => p.categoria))].sort();

  const filteredProductos = productos.filter((p) => {
    const pesoStr = p.peso_kg ? `${p.peso_kg} kg` : '';
    const especStr = p.especificaciones || '';
    const matchesSearch = 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.marca && p.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
      pesoStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      especStr.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActiveFilter = tabActivo === "inactivos" ? p.activo === false : p.activo !== false;
    
    // Advanced filters
    const matchesMarca = filterMarca === "all" || p.marca === filterMarca;
    const matchesCategoria = filterCategoria === "all" || p.categoria === filterCategoria;
    const matchesTipoPrecio = filterTipoPrecio === "all" || 
      (filterTipoPrecio === "kilo" ? p.precio_por_kilo === true : p.precio_por_kilo !== true);
    
    let matchesImpuestos = true;
    if (filterImpuestos === "iva") matchesImpuestos = p.aplica_iva && !p.aplica_ieps;
    else if (filterImpuestos === "iva_ieps") matchesImpuestos = p.aplica_iva && p.aplica_ieps;
    else if (filterImpuestos === "sin") matchesImpuestos = !p.aplica_iva && !p.aplica_ieps;

    let matchesStock = true;
    if (filterStock === "con_stock") matchesStock = (p.stock_actual || 0) > 0;
    else if (filterStock === "stock_bajo") matchesStock = (p.stock_actual || 0) > 0 && (p.stock_actual || 0) <= (p.stock_minimo || 0);
    else if (filterStock === "sin_stock") matchesStock = (p.stock_actual || 0) <= 0;

    return matchesSearch && matchesActiveFilter && matchesMarca && matchesCategoria && matchesTipoPrecio && matchesImpuestos && matchesStock;
  });

  const productosActivos = productos.filter(p => p.activo !== false).length;
  const productosInactivos = productos.filter(p => p.activo === false).length;

  // Warnings for form
  const precioVenta = parseFloat(formData.precio_venta) || 0;
  const precioCompra = parseFloat(formData.precio_compra) || 0;
  const pesoKg = parseFloat(formData.peso_kg) || 0;
  const margenNegativo = precioVenta > 0 && precioCompra > 0 && precioVenta < precioCompra;

  const renderFilterSelects = () => (
    <>
      <div className="space-y-1">
        <Label className="text-xs">Marca</Label>
        <Select value={filterMarca} onValueChange={setFilterMarca}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {marcasUnicas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Categoría</Label>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categoriasUnicas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Impuestos</Label>
        <Select value={filterImpuestos} onValueChange={setFilterImpuestos}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="iva">Solo IVA</SelectItem>
            <SelectItem value="iva_ieps">IVA + IEPS</SelectItem>
            <SelectItem value="sin">Sin impuestos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tipo precio</Label>
        <Select value={filterTipoPrecio} onValueChange={setFilterTipoPrecio}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="unidad">Por unidad</SelectItem>
            <SelectItem value="kilo">Por kilo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Stock</Label>
        <Select value={filterStock} onValueChange={setFilterStock}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="con_stock">Con stock</SelectItem>
            <SelectItem value="stock_bajo">Stock bajo</SelectItem>
            <SelectItem value="sin_stock">Sin stock</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <NotificacionesSistema />
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Productos</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Gestión de catálogo de productos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                </DialogTitle>
                <DialogDescription>
                  Completa la información del producto
                </DialogDescription>
              </DialogHeader>

              {/* Stock info card when editing */}
              {editingProduct && (
                <div className="p-3 rounded-lg border bg-muted/50 space-y-1 text-sm">
                  {editingProduct.precio_por_kilo ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stock:</span>
                        <span className="font-medium">
                          {editingProduct.stock_actual ?? 0} {editingProduct.unidad}s
                          {editingProduct.peso_kg ? ` (${((editingProduct.stock_actual || 0) * editingProduct.peso_kg).toFixed(0)} kg)` : ""}
                          {(editingProduct.stock_actual || 0) <= (editingProduct.stock_minimo || 0) ? (
                            <Badge variant="destructive" className="ml-2 text-[10px]">Bajo mínimo</Badge>
                          ) : (
                            <Badge className="ml-2 text-[10px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">OK</Badge>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Precio:</span>
                        <span>{formatCurrency(editingProduct.precio_venta || 0)}/kg → {formatCurrency((editingProduct.precio_venta || 0) * (editingProduct.peso_kg || 0))}/{editingProduct.unidad}</span>
                      </div>
                      {editingProduct.precio_compra > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Margen:</span>
                          <span>{formatCurrency((editingProduct.precio_venta || 0) - (editingProduct.precio_compra || 0))}/kg → {formatCurrency(((editingProduct.precio_venta || 0) - (editingProduct.precio_compra || 0)) * (editingProduct.peso_kg || 0))}/{editingProduct.unidad}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stock:</span>
                        <span className="font-medium">
                          {editingProduct.stock_actual ?? 0} {editingProduct.unidad}s
                          {(editingProduct.stock_actual || 0) <= (editingProduct.stock_minimo || 0) ? (
                            <Badge variant="destructive" className="ml-2 text-[10px]">Bajo mínimo</Badge>
                          ) : (
                            <Badge className="ml-2 text-[10px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">OK</Badge>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Costo / CPP:</span>
                        <span>{formatCurrency(editingProduct.precio_compra || 0)} / {formatCurrency(editingProduct.costo_promedio_ponderado || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Precio venta:</span>
                        <span>{formatCurrency(editingProduct.precio_venta || 0)}</span>
                      </div>
                      {editingProduct.precio_venta > 0 && editingProduct.precio_compra > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Margen:</span>
                          <span>{(((editingProduct.precio_venta - editingProduct.precio_compra) / editingProduct.precio_venta) * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="activo" className="cursor-pointer">
                    Producto activo
                  </Label>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código *</Label>
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.match(/^[a-zA-Z]+[-_\s]$/) && !editingProduct) {
                          const suggestion = getNextAvailableCodeForPrefix(value);
                          if (suggestion) {
                            setFormData({ ...formData, codigo: suggestion });
                            checkCodigoGap(suggestion);
                            return;
                          }
                        }
                        setFormData({ ...formData, codigo: value });
                        checkCodigoGap(value);
                      }}
                      required
                      autoComplete="off"
                      placeholder="Ej: NFS-001, VEL-001"
                    />
                    {codigoGapWarning && !editingProduct && (
                      <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-800">
                        ⚠️ {codigoGapWarning}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unidad">Unidad *</Label>
                    <Select
                      value={formData.unidad}
                      onValueChange={(value: typeof formData.unidad) => {
                        const newFormData = { ...formData, unidad: value };
                        setFormData(newFormData);
                        setDuplicateWarning(checkDuplicateProduct(newFormData.nombre, newFormData.marca, newFormData.especificaciones, value));
                      }}
                    >
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
                  <div className="space-y-2">
                    <Label htmlFor="peso_kg">Peso (kg) *</Label>
                    <div className="relative">
                      <Input
                        id="peso_kg"
                        type="number"
                        step="0.01"
                        value={formData.peso_kg}
                        onChange={(e) => setFormData({ ...formData, peso_kg: e.target.value })}
                        placeholder="Ej: 25, 50"
                        autoComplete="off"
                        required
                        className="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">kg</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Descripción del Producto *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => {
                      const nombre = e.target.value;
                      setFormData({ ...formData, nombre });
                      setDuplicateWarning(checkDuplicateProduct(nombre, formData.marca, formData.especificaciones, formData.unidad));
                      setSimilarNameSuggestion(checkSimilarProductName(nombre));
                    }}
                    required
                    autoComplete="off"
                    spellCheck={true}
                    lang="es-MX"
                    list="nombres-existentes"
                    placeholder="Ej: Alpiste, Azúcar, Frijol"
                  />
                  <datalist id="nombres-existentes">
                    {[...new Set(productos.map(p => p.nombre).filter(Boolean))].sort().map((nom) => (
                      <option key={nom} value={nom} />
                    ))}
                  </datalist>
                  {similarNameSuggestion && (
                    <div className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-800">
                      <span className="text-amber-700 dark:text-amber-400">
                        💡 ¿Quisiste decir "<strong>{similarNameSuggestion.suggestedName}</strong>"? ({similarNameSuggestion.codigo})
                      </span>
                      <div className="flex gap-2 ml-2">
                        <button type="button" onClick={applySuggestedName} className="text-green-600 hover:text-green-800 p-1 rounded" title="Usar esta sugerencia">✓</button>
                        <button type="button" onClick={dismissSuggestion} className="text-destructive p-1 rounded" title="Ignorar">✗</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marca">Marca</Label>
                    <Input
                      id="marca"
                      value={formData.marca}
                      onChange={(e) => {
                        const marca = e.target.value;
                        setFormData({ ...formData, marca });
                        setDuplicateWarning(checkDuplicateProduct(formData.nombre, marca, formData.especificaciones, formData.unidad));
                      }}
                      placeholder="Ej: Morelos, Purina"
                      autoComplete="off"
                      spellCheck={true}
                      lang="es-MX"
                      list="marcas-existentes"
                    />
                    <datalist id="marcas-existentes">
                      {[...new Set(productos.map(p => p.marca).filter(Boolean))].sort().map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoría (para agrupar)</Label>
                    <Input
                      id="categoria"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      placeholder="Ej: Arándano, Uva Pasa, Arroz"
                      list="categorias-existentes"
                      spellCheck={true}
                      lang="es-MX"
                    />
                    <datalist id="categorias-existentes">
                      {[...new Set(productos.map(p => p.categoria).filter(Boolean))].sort().map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                    <p className="text-xs text-muted-foreground">Agrupa productos de diferentes marcas</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="especificaciones">Presentación / Especificaciones</Label>
                    <Input
                      id="especificaciones"
                      value={formData.especificaciones}
                      onChange={(e) => {
                        const especificaciones = e.target.value;
                        setFormData({ ...formData, especificaciones });
                        setDuplicateWarning(checkDuplicateProduct(formData.nombre, formData.marca, especificaciones, formData.unidad));
                      }}
                      placeholder="Ej: 25kg, 6/2.800kg, 50/60 Deshuesada"
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">Texto que aparece en facturas y remisiones</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contenido_empaque">Contenido del empaque</Label>
                    <Input
                      id="contenido_empaque"
                      value={formData.contenido_empaque}
                      onChange={(e) => setFormData({ ...formData, contenido_empaque: e.target.value })}
                      placeholder="Ej: 24×800g, 6/2.8kg, 25kg"
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* ===== SECCIÓN PRECIOS Y VENTAS ===== */}
                <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                  <span className="text-sm font-semibold">💰 Precios y Ventas</span>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="precio_por_kilo" className="cursor-pointer">¿Se vende por kilo?</Label>
                    </div>
                    <Switch
                      id="precio_por_kilo"
                      checked={formData.precio_por_kilo}
                      onCheckedChange={(checked) => setFormData({ ...formData, precio_por_kilo: checked })}
                    />
                  </div>
                  
                  <p className="text-xs p-2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    {formData.precio_por_kilo
                      ? `El precio es por kg. Total = cantidad × peso_kg × precio/kg. Ej: 3 sacos × 25kg × $13/kg = $975`
                      : `El precio es por unidad. Total = cantidad × precio. Ej: 3 cajas × $325 = $975`}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="precio_venta">
                        {formData.precio_por_kilo ? "Precio por kg ($/kg) *" : "Precio por unidad *"}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          id="precio_venta"
                          type="number"
                          step="0.01"
                          value={formData.precio_venta}
                          onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                          placeholder="0.00"
                          required
                          className="pl-7"
                          autoComplete="off"
                        />
                      </div>
                      {/* Preview unit-equivalent */}
                      {formData.precio_por_kilo && precioVenta > 0 && pesoKg > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Precio por unidad equivalente: <strong>{formatCurrency(precioVenta * pesoKg)}/{formData.unidad}</strong>
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descuento_maximo">
                        Descuento máximo {formData.precio_por_kilo ? "($/kg)" : "($/unidad)"}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          id="descuento_maximo"
                          type="number"
                          step="0.01"
                          value={formData.descuento_maximo}
                          onChange={(e) => setFormData({ ...formData, descuento_maximo: e.target.value })}
                          placeholder="0.00"
                          className="pl-7"
                          autoComplete="off"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formData.precio_por_kilo
                          ? "Descuento en $/kg que el vendedor puede aplicar sin autorización"
                          : "Descuento en $ por unidad"}
                      </p>
                    </div>
                  </div>

                  {margenNegativo && (
                    <p className="text-xs p-2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      ⚠️ El precio de venta es menor al costo. El margen sería negativo.
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="piezas_por_unidad">Piezas por unidad</Label>
                    <Input
                      id="piezas_por_unidad"
                      type="number"
                      value={formData.piezas_por_unidad}
                      onChange={(e) => setFormData({ ...formData, piezas_por_unidad: e.target.value })}
                      placeholder="Ej: 24 para una caja de 24 piezas"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {!editingProduct && (
                    <div className="space-y-2">
                      <Label htmlFor="proveedor">Proveedor</Label>
                      <Select
                        value={formData.proveedor_id}
                        onValueChange={(value) => setFormData({ ...formData, proveedor_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proveedor (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {proveedores.map((prov) => (
                            <SelectItem key={prov.id} value={prov.id}>
                              {prov.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Se asociará automáticamente al proveedor</p>
                    </div>
                  )}
                </div>
                
                {duplicateWarning && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                    ❌ {duplicateWarning}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="precio_compra">Precio Compra</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="precio_compra"
                        type="number"
                        step="0.01"
                        value={formData.precio_compra}
                        onChange={(e) => setFormData({ ...formData, precio_compra: e.target.value })}
                        placeholder="0.00"
                        autoComplete="off"
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Se actualizará desde Compras</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock_minimo">Stock Mínimo *</Label>
                    <Input
                      id="stock_minimo"
                      type="number"
                      value={formData.stock_minimo}
                      onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                      required
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="maneja_caducidad"
                      checked={formData.maneja_caducidad}
                      onChange={(e) => setFormData({ ...formData, maneja_caducidad: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="maneja_caducidad">Maneja fecha de caducidad</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/50">
                    <div className="space-y-2">
                      <Label htmlFor="stock_inicial">
                        {editingProduct ? "Agregar stock" : "Stock inicial"}
                      </Label>
                      <Input
                        id="stock_inicial"
                        type="number"
                        value={formData.stock_inicial}
                        onChange={(e) => setFormData({ ...formData, stock_inicial: e.target.value })}
                        placeholder="0"
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">
                        {editingProduct 
                          ? "Cantidad a agregar (creará un nuevo lote)" 
                          : "Cantidad que ya tienes en bodega"}
                      </p>
                    </div>
                    {formData.maneja_caducidad && (
                      <div className="space-y-2">
                        <Label htmlFor="fecha_caducidad_inicial">Fecha de caducidad</Label>
                        <Input
                          id="fecha_caducidad_inicial"
                          type="date"
                          value={formData.fecha_caducidad_inicial}
                          onChange={(e) => setFormData({ ...formData, fecha_caducidad_inicial: e.target.value })}
                          autoComplete="off"
                        />
                        <p className="text-xs text-muted-foreground">Fecha de vencimiento del stock</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="requiere_fumigacion"
                      checked={formData.requiere_fumigacion}
                      onChange={(e) => setFormData({ ...formData, requiere_fumigacion: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="requiere_fumigacion">Requiere fumigación cada 6 meses</Label>
                  </div>
                  {formData.requiere_fumigacion && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="fecha_ultima_fumigacion">Fecha de última fumigación (opcional)</Label>
                      <Input
                        id="fecha_ultima_fumigacion"
                        type="date"
                        value={formData.fecha_ultima_fumigacion}
                        onChange={(e) => setFormData({ ...formData, fecha_ultima_fumigacion: e.target.value })}
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">Si no se sabe, se registrará al recibir el producto</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">📋 Impuestos que grava este producto</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="aplica_iva" checked={formData.aplica_iva} onChange={(e) => setFormData({ ...formData, aplica_iva: e.target.checked })} className="rounded" />
                      <Label htmlFor="aplica_iva">Grava IVA (16%)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="aplica_ieps" checked={formData.aplica_ieps} onChange={(e) => setFormData({ ...formData, aplica_ieps: e.target.checked })} className="rounded" />
                      <Label htmlFor="aplica_ieps">Grava IEPS (8%)</Label>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                    ℹ️ Los precios de venta se capturan CON impuestos incluidos. Estos mismos impuestos aplican en compras.
                  </p>
                </div>

                {/* ===== SECCIÓN FACTURACIÓN SAT (colapsable) ===== */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" className="w-full justify-between p-3 h-auto bg-muted/30 border rounded-lg">
                      <span className="text-sm font-medium">🏛️ Facturación SAT</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unidad_sat">Unidad SAT</Label>
                        <Select
                          value={formData.unidad_sat}
                          onValueChange={(value) => setFormData({ ...formData, unidad_sat: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar unidad SAT" />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIDADES_SAT.map(u => (
                              <SelectItem key={u.clave} value={u.clave}>
                                {u.clave} — {u.descripcion}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="codigo_sat">Código SAT</Label>
                        <Input
                          id="codigo_sat"
                          value={formData.codigo_sat}
                          onChange={(e) => setFormData({ ...formData, codigo_sat: e.target.value })}
                          placeholder="Ej: 10121500"
                          autoComplete="off"
                        />
                        <p className="text-xs text-muted-foreground">Para facturación CFDI</p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* ===== SECCIÓN PROMOCIÓN (colapsable) ===== */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" className="w-full justify-between p-3 h-auto bg-muted/30 border rounded-lg">
                      <span className="text-sm font-medium">🎁 Promoción</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="es_promocion" className="cursor-pointer">¿Producto en promoción?</Label>
                      <Switch id="es_promocion" checked={formData.es_promocion} onCheckedChange={(checked) => setFormData({ ...formData, es_promocion: checked })} />
                    </div>
                    {formData.es_promocion && (
                      <div className="space-y-2">
                        <Label htmlFor="descripcion_promocion">Descripción de la promoción</Label>
                        <Input
                          id="descripcion_promocion"
                          value={formData.descripcion_promocion}
                          onChange={(e) => setFormData({ ...formData, descripcion_promocion: e.target.value })}
                          placeholder="Ej: Compra 3 lleva 4"
                          autoComplete="off"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="bloqueado_venta" className="cursor-pointer">Bloquear ventas temporalmente</Label>
                        {formData.bloqueado_venta && (
                          <Badge variant="destructive" className="text-[10px]">BLOQUEADO</Badge>
                        )}
                      </div>
                      <Switch id="bloqueado_venta" checked={formData.bloqueado_venta} onCheckedChange={(checked) => setFormData({ ...formData, bloqueado_venta: checked })} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <input
                    type="checkbox"
                    id="solo_uso_interno"
                    checked={formData.solo_uso_interno}
                    onChange={(e) => setFormData({ ...formData, solo_uso_interno: e.target.checked })}
                    className="rounded"
                  />
                  <div>
                    <Label htmlFor="solo_uso_interno" className="cursor-pointer">Solo uso interno (no aparece en ventas)</Label>
                    <p className="text-xs text-muted-foreground">Productos como rollos de playo para servicio al cliente</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código o marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {isMobile ? (
              <Sheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Filter className="h-4 w-4" />
                    {hasActiveFilters && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="space-y-4">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-3">
                    {renderFilterSelects()}
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={() => { clearFilters(); setFiltersSheetOpen(false); }} className="w-full">
                        <X className="h-3 w-3 mr-1" /> Limpiar filtros
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            ) : null}
          </div>

          {/* Desktop filters */}
          {!isMobile && (
            <div className="flex gap-2 items-end flex-wrap">
              {renderFilterSelects()}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                  <X className="h-3 w-3 mr-1" /> Limpiar
                </Button>
              )}
            </div>
          )}

          {/* Counter */}
          <p className="text-xs text-muted-foreground">
            Mostrando {filteredProductos.length} de {tabActivo === "inactivos" ? productosInactivos : productosActivos} productos
            {hasActiveFilters && " (filtrados)"}
          </p>
        </div>

        <Tabs value={tabActivo} onValueChange={(value) => setTabActivo(value as "activos" | "inactivos")}>
          <TabsList>
            <TabsTrigger value="activos">Activos ({productosActivos})</TabsTrigger>
            <TabsTrigger value="inactivos">Inactivos ({productosInactivos})</TabsTrigger>
          </TabsList>

          <TabsContent value={tabActivo} className="mt-4">
            {isMobile ? (
              /* Mobile: card grid */
              <div className="space-y-3">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Cargando...</p>
                ) : filteredProductos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay productos</p>
                ) : (
                  filteredProductos.map((producto) => (
                    <ProductoCardMobile
                      key={producto.id}
                      producto={producto}
                      onEdit={handleEdit}
                      onDeactivate={handleDeactivate}
                      onReactivate={handleReactivate}
                      isInactive={tabActivo === "inactivos"}
                    />
                  ))
                )}
              </div>
            ) : (
              /* Desktop: table */
              <div className="border rounded-lg">
                <ScrollArea className="h-[calc(100vh-420px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Presentación</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-center">IVA/IEPS</TableHead>
                        <TableHead className="text-center">Stock Mín</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center">Cargando...</TableCell>
                        </TableRow>
                      ) : filteredProductos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center">No hay productos registrados</TableCell>
                        </TableRow>
                      ) : (
                        filteredProductos.map((producto) => (
                          <TableRow key={producto.id} className={producto.activo === false ? "opacity-50" : ""}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1 flex-wrap">
                                {producto.codigo}
                                {producto.activo === false && <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>}
                                {producto.es_promocion && <Badge className="text-[10px] px-1 py-0 h-4 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">PROMO</Badge>}
                                {producto.bloqueado_venta && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Bloq</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                <span>{producto.nombre}</span>
                                {producto.maneja_caducidad && <span className="ml-1">📅</span>}
                                {producto.requiere_fumigacion && <span>🦠</span>}
                              </div>
                            </TableCell>
                            <TableCell>{producto.marca || "-"}</TableCell>
                            <TableCell>{producto.peso_kg ? `${producto.peso_kg} kg` : "-"}</TableCell>
                            <TableCell className="uppercase">
                              {producto.unidad}
                              {producto.precio_por_kilo && (
                                <Badge className="ml-1 text-[10px] px-1 py-0 h-4 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">$/kg</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {producto.precio_venta ? (
                                producto.precio_por_kilo
                                  ? `${formatCurrency(producto.precio_venta)}/kg`
                                  : formatCurrency(producto.precio_venta)
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {producto.aplica_iva && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800">IVA</Badge>
                                )}
                                {producto.aplica_ieps && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">IEPS</Badge>
                                )}
                                {!producto.aplica_iva && !producto.aplica_ieps && "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {producto.stock_minimo}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(producto)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {tabActivo === "inactivos" ? (
                                  <Button variant="ghost" size="icon" onClick={() => handleReactivate(producto)} title="Reactivar">
                                    <RotateCcw className="h-4 w-4 text-green-600" />
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="icon" onClick={() => handleDeactivate(producto)} title="Desactivar">
                                    <Power className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Deactivate confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar "{deleteTarget?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Dejará de aparecer en ventas pero se conserva el historial. Podrás reactivarlo desde la pestaña "Inactivos".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Productos;
