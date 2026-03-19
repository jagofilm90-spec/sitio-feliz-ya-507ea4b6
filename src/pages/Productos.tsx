import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Power, RotateCcw, ChevronDown, ChevronUp, Filter, X,
  ArrowUpDown, Info, Package, Tag, FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotificacionesSistema } from "@/components/NotificacionesSistema";
import { UNIDADES_SAT, UNIDADES_PRODUCTO, UNIDADES_LEGACY } from "@/lib/productUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import ProductoCardMobile from "@/components/productos/ProductoCardMobile";
import { useUserRoles } from "@/hooks/useUserRoles";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

type SortColumn = "codigo" | "nombre" | "precio" | "stock" | null;
type SortDirection = "asc" | "desc";

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
  const { isAdmin, isSecretaria, isContadora } = useUserRoles();
  const canSeeCosts = isAdmin || isSecretaria || isContadora;

  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [filterMarca, setFilterMarca] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterTipoPrecio, setFilterTipoPrecio] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  const hasActiveFilters = filterMarca !== "all" || filterCategoria !== "all" || filterTipoPrecio !== "all" || filterStock !== "all";

  const clearFilters = () => {
    setFilterMarca("all");
    setFilterCategoria("all");
    setFilterTipoPrecio("all");
    setFilterStock("all");
  };

  // ─── Helpers for code suggestions & duplicate detection ───
  const normalizeText = (text: string): string =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const checkSimilarProductName = (nombre: string): { suggestedName: string; codigo: string } | null => {
    if (!nombre || nombre.trim().length < 3) return null;
    const normalizedInput = normalizeText(nombre);
    const similar = productos.find(p => {
      if (editingProduct && p.id === editingProduct.id) return false;
      const normalizedExisting = normalizeText(p.nombre || '');
      return normalizedExisting === normalizedInput &&
        (p.nombre || '').trim().toLowerCase() !== nombre.trim().toLowerCase();
    });
    if (similar) return { suggestedName: similar.nombre, codigo: similar.codigo };
    return null;
  };

  const applySuggestedName = () => {
    if (similarNameSuggestion) {
      setFormData({ ...formData, nombre: similarNameSuggestion.suggestedName });
      setSimilarNameSuggestion(null);
    }
  };
  const dismissSuggestion = () => setSimilarNameSuggestion(null);

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
    if (matchingCodes.length === 0) return `${cleanPrefix}${separator}001`;
    const existingCode = productos.find(p => p.codigo.toLowerCase().startsWith(cleanPrefix.toLowerCase()));
    const numMatch = existingCode?.codigo.match(/(\d+)$/);
    const padLength = numMatch ? numMatch[1].length : 3;
    const sortedNumbers = [...new Set(matchingCodes)].sort((a, b) => a - b);
    for (let i = 1; i <= sortedNumbers[sortedNumbers.length - 1]; i++) {
      if (!sortedNumbers.includes(i)) return `${cleanPrefix}${separator}${i.toString().padStart(padLength, '0')}`;
    }
    const nextNum = Math.max(...matchingCodes) + 1;
    return `${cleanPrefix}${separator}${nextNum.toString().padStart(padLength, '0')}`;
  };

  const checkCodigoGap = (codigo: string) => {
    if (!codigo) { setCodigoGapWarning(null); return; }
    const numMatch = codigo.match(/(\d+)/);
    if (!numMatch) { setCodigoGapWarning(null); return; }
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
      if (!existingCodes.includes(i)) missingCodes.push(`${prefix}${i.toString().padStart(numLength, '0')}`);
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
    const duplicate = productos.find(p => {
      if (editingProduct && p.id === editingProduct.id) return false;
      return normalizeText(p.nombre || '') === normalizedNombre &&
        normalizeText(p.marca || '') === normalizedMarca &&
        (p.especificaciones || '').trim().toLowerCase() === normalizedEspecificaciones &&
        p.unidad === unidad;
    });
    if (duplicate) return `Ya existe un producto con estas características: "${duplicate.nombre}" (${duplicate.codigo})`;
    return null;
  };

  // ─── Form state ───
  const [formData, setFormData] = useState({
    codigo: "", codigo_sat: "", nombre: "", marca: "", categoria: "",
    especificaciones: "", contenido_empaque: "", unidad_sat: "", peso_kg: "",
    unidad: "bulto" as "bulto" | "balon" | "caja" | "churla" | "costal" | "cubeta" | "paquete" | "pieza" | "balón",
    piezas_por_unidad: "1", precio_compra: "", precio_venta: "",
    precio_por_kilo: false, descuento_maximo: "", stock_minimo: "",
    maneja_caducidad: false, aplica_iva: false, aplica_ieps: false, activo: true,
    requiere_fumigacion: false, fecha_ultima_fumigacion: "", fecha_caducidad_inicial: "",
    stock_inicial: "", proveedor_id: "", solo_uso_interno: false, es_promocion: false,
    descripcion_promocion: "", bloqueado_venta: false,
  });

  useEffect(() => { loadProductos(); loadProveedores(); }, []);

  const loadProveedores = async () => {
    try {
      const { data, error } = await supabase.from("proveedores").select("id, nombre").eq("activo", true).order("nombre");
      if (error) throw error;
      setProveedores(data || []);
    } catch (error: any) { console.error("Error loading proveedores:", error); }
  };

  const loadProductos = async () => {
    try {
      const { data, error } = await supabase.from("productos").select(`*, proveedores:proveedor_preferido_id ( id, nombre )`).order("codigo");
      if (error) throw error;
      setProductos(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: "No se pudieron cargar los productos", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const codigoExiste = productos.find(p =>
      p.codigo.toLowerCase() === formData.codigo.toLowerCase() &&
      (!editingProduct || p.id !== editingProduct.id)
    );
    if (codigoExiste) {
      toast({ title: "Error", description: `El código "${formData.codigo}" ya existe`, variant: "destructive" });
      return;
    }
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
        unidad: formData.unidad as any,
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
        const { error } = await supabase.from("productos").update(productData).eq("id", editingProduct.id);
        if (error) throw error;
        const stockAgregar = parseInt(formData.stock_inicial) || 0;
        if (stockAgregar > 0) {
          const loteData: any = {
            producto_id: editingProduct.id, cantidad_disponible: stockAgregar,
            precio_compra: parseFloat(formData.precio_compra) || 0, lote_referencia: "Carga inicial",
          };
          if (formData.maneja_caducidad && formData.fecha_caducidad_inicial) loteData.fecha_caducidad = formData.fecha_caducidad_inicial;
          const { error: loteError } = await supabase.from("inventario_lotes").insert([loteData]);
          if (loteError) console.error("Error creando lote:", loteError);
          else await supabase.from("productos").update({ stock_actual: (editingProduct.stock_actual || 0) + stockAgregar }).eq("id", editingProduct.id);
        }
        toast({ title: "Producto actualizado correctamente" });
      } else {
        const { data: newProduct, error } = await supabase.from("productos").insert([productData]).select().single();
        if (error) throw error;
        if (formData.proveedor_id && newProduct) {
          const { error: provError } = await supabase.from("proveedor_productos").insert([{ proveedor_id: formData.proveedor_id, producto_id: newProduct.id }]);
          if (provError) console.error("Error asociando proveedor:", provError);
        }
        const stockInicial = parseInt(formData.stock_inicial) || 0;
        if (stockInicial > 0 && newProduct) {
          const loteData: any = {
            producto_id: newProduct.id, cantidad_disponible: stockInicial,
            precio_compra: parseFloat(formData.precio_compra) || 0, lote_referencia: "Lote inicial",
          };
          if (formData.maneja_caducidad && formData.fecha_caducidad_inicial) loteData.fecha_caducidad = formData.fecha_caducidad_inicial;
          const { error: loteError } = await supabase.from("inventario_lotes").insert([loteData]);
          if (loteError) console.error("Error creando lote inicial:", loteError);
          await supabase.from("productos").update({ stock_actual: stockInicial }).eq("id", newProduct.id);
        }
        toast({ title: "Producto creado correctamente" });
      }
      setDialogOpen(false);
      resetForm();
      loadProductos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      codigo: product.codigo, codigo_sat: product.codigo_sat || "", nombre: product.nombre,
      marca: product.marca || "", categoria: product.categoria || "",
      especificaciones: product.especificaciones || "", contenido_empaque: product.contenido_empaque || "",
      unidad_sat: product.unidad_sat || "", peso_kg: product.peso_kg?.toString() || "",
      unidad: product.unidad, piezas_por_unidad: product.piezas_por_unidad?.toString() || "1",
      precio_compra: product.precio_compra?.toString() || "", precio_venta: product.precio_venta?.toString() || "",
      precio_por_kilo: product.precio_por_kilo || false, descuento_maximo: product.descuento_maximo?.toString() || "",
      stock_minimo: product.stock_minimo?.toString() || "0", maneja_caducidad: product.maneja_caducidad,
      aplica_iva: product.aplica_iva || false, aplica_ieps: product.aplica_ieps || false,
      activo: product.activo !== false, requiere_fumigacion: product.requiere_fumigacion || false,
      fecha_ultima_fumigacion: product.fecha_ultima_fumigacion || "", fecha_caducidad_inicial: "",
      stock_inicial: "", proveedor_id: "", solo_uso_interno: product.solo_uso_interno || false,
      es_promocion: product.es_promocion || false, descripcion_promocion: product.descripcion_promocion || "",
      bloqueado_venta: product.bloqueado_venta || false,
    });
    setDialogOpen(true);
  };

  const handleDeactivate = async (producto: any) => setDeleteTarget(producto);

  const confirmDeactivate = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("productos").update({ activo: false }).eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: `"${deleteTarget.nombre}" desactivado` });
      loadProductos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setDeleteTarget(null); }
  };

  const handleReactivate = async (producto: any) => {
    try {
      const { error } = await supabase.from("productos").update({ activo: true }).eq("id", producto.id);
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
      codigo: "", codigo_sat: "", nombre: "", marca: "", categoria: "",
      especificaciones: "", contenido_empaque: "", unidad_sat: "", peso_kg: "",
      unidad: "bulto", piezas_por_unidad: "1", precio_compra: "", precio_venta: "",
      precio_por_kilo: false, descuento_maximo: "", stock_minimo: "",
      maneja_caducidad: false, aplica_iva: false, aplica_ieps: false, activo: true,
      requiere_fumigacion: false, fecha_ultima_fumigacion: "", fecha_caducidad_inicial: "",
      stock_inicial: "", proveedor_id: "", solo_uso_interno: false, es_promocion: false,
      descripcion_promocion: "", bloqueado_venta: false,
    });
  };

  // ─── Derived filter values ───
  const marcasUnicas = [...new Set(productos.filter(p => p.activo !== false && p.marca).map(p => p.marca))].sort();
  const categoriasUnicas = [...new Set(productos.filter(p => p.activo !== false && p.categoria).map(p => p.categoria))].sort();

  const filteredProductos = (() => {
    let filtered = productos.filter((p) => {
      const pesoStr = p.peso_kg ? `${p.peso_kg} kg` : '';
      const especStr = p.especificaciones || '';
      const matchesSearch =
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.marca && p.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
        pesoStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        especStr.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesActiveFilter = tabActivo === "inactivos" ? p.activo === false : p.activo !== false;
      const matchesMarca = filterMarca === "all" || p.marca === filterMarca;
      const matchesCategoria = filterCategoria === "all" || p.categoria === filterCategoria;
      const matchesTipoPrecio = filterTipoPrecio === "all" ||
        (filterTipoPrecio === "kilo" ? p.precio_por_kilo === true : p.precio_por_kilo !== true);

      let matchesStock = true;
      if (filterStock === "con_stock") matchesStock = (p.stock_actual || 0) > 0;
      else if (filterStock === "stock_bajo") matchesStock = (p.stock_actual || 0) > 0 && (p.stock_actual || 0) <= (p.stock_minimo || 0);
      else if (filterStock === "sin_stock") matchesStock = (p.stock_actual || 0) <= 0;

      return matchesSearch && matchesActiveFilter && matchesMarca && matchesCategoria && matchesTipoPrecio && matchesStock;
    });

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let cmp = 0;
        switch (sortColumn) {
          case "codigo": cmp = (a.codigo || "").localeCompare(b.codigo || ""); break;
          case "nombre": cmp = (a.nombre || "").localeCompare(b.nombre || ""); break;
          case "precio": cmp = (a.precio_venta || 0) - (b.precio_venta || 0); break;
          case "stock": cmp = (a.stock_actual || 0) - (b.stock_actual || 0); break;
        }
        return sortDirection === "desc" ? -cmp : cmp;
      });
    }
    return filtered;
  })();

  const productosActivos = productos.filter(p => p.activo !== false).length;
  const productosInactivos = productos.filter(p => p.activo === false).length;

  // Form-level computed warnings
  const precioVenta = parseFloat(formData.precio_venta) || 0;
  const precioCompra = parseFloat(formData.precio_compra) || 0;
  const pesoKg = parseFloat(formData.peso_kg) || 0;
  const descMaxForm = parseFloat(formData.descuento_maximo) || 0;
  const margenNegativo = precioVenta > 0 && precioCompra > 0 && precioVenta < precioCompra;
  const descuentoExcesivo = descMaxForm > 0 && precioVenta > 0 && descMaxForm >= precioVenta;
  const kiloPesoError = formData.precio_por_kilo && pesoKg <= 0;

  const specialConfigCount = [formData.requiere_fumigacion, formData.solo_uso_interno, formData.bloqueado_venta, formData.es_promocion].filter(Boolean).length;

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    else { setSortColumn(col); setSortDirection("asc"); }
  };

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortColumn !== col) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    return sortDirection === "asc"
      ? <ChevronUp className="ml-1 h-3 w-3 text-foreground" />
      : <ChevronDown className="ml-1 h-3 w-3 text-foreground" />;
  };

  const SortableHeader = ({ col, children, className = "" }: { col: SortColumn; children: React.ReactNode; className?: string }) => (
    <Button variant="ghost" size="sm" className={`h-auto p-0 font-medium text-muted-foreground hover:text-foreground -ml-1 ${className}`} onClick={() => handleSort(col)}>
      {children}
      <SortIcon col={col} />
    </Button>
  );

  const renderFilterSelects = () => (
    <>
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

  // ─── RENDER ───
  return (
    <Layout>
      <TooltipProvider>
        <div className="flex flex-col h-[calc(100vh-4rem-3rem)] overflow-hidden">
          <NotificacionesSistema />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 flex-shrink-0 mb-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Productos</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Gestión de catálogo de productos</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />Nuevo Producto</Button>
              </DialogTrigger>

              {/* ═══════════════════════════════════════════════════
                  FORMULARIO COMPLETO
                  ═══════════════════════════════════════════════════ */}
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                  <DialogDescription>Completa la información del producto</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-5">
                  {/* ── SECCIÓN 1: Información básica ── */}
                  <div className="space-y-3">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-muted-foreground" /> Información básica
                    </span>

                    {/* Nombre (full width, PRIMERO) */}
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre del producto *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => {
                          const nombre = e.target.value;
                          setFormData({ ...formData, nombre });
                          setDuplicateWarning(checkDuplicateProduct(nombre, formData.marca, formData.especificaciones, formData.unidad));
                          setSimilarNameSuggestion(checkSimilarProductName(nombre));
                        }}
                        required autoComplete="off" spellCheck={true} lang="es-MX"
                        list="nombres-existentes"
                        placeholder="Ej: Azúcar refinada, Frijol bayo, Arroz"
                        className="text-base"
                      />
                      <datalist id="nombres-existentes">
                        {[...new Set(productos.map(p => p.nombre).filter(Boolean))].sort().map(nom => (
                          <option key={nom} value={nom} />
                        ))}
                      </datalist>
                      {similarNameSuggestion && (
                        <div className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-800">
                          <span className="text-amber-700 dark:text-amber-400">
                            ¿Quisiste decir "<strong>{similarNameSuggestion.suggestedName}</strong>"? ({similarNameSuggestion.codigo})
                          </span>
                          <div className="flex gap-2 ml-2">
                            <button type="button" onClick={applySuggestedName} className="text-green-600 hover:text-green-800 p-1 rounded" title="Usar esta sugerencia">✓</button>
                            <button type="button" onClick={dismissSuggestion} className="text-destructive p-1 rounded" title="Ignorar">✗</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Código + Marca + Categoría (3 cols) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Label htmlFor="codigo">Código *</Label>
                          <Tooltip>
                            <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                            <TooltipContent><p className="text-xs max-w-[200px]">Escribe un prefijo + guión (ej: AZU-) y el sistema sugiere el siguiente número</p></TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="codigo"
                          value={formData.codigo}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.match(/^[a-zA-Z]+[-_\s]$/) && !editingProduct) {
                              const suggestion = getNextAvailableCodeForPrefix(value);
                              if (suggestion) { setFormData({ ...formData, codigo: suggestion }); checkCodigoGap(suggestion); return; }
                            }
                            setFormData({ ...formData, codigo: value });
                            checkCodigoGap(value);
                          }}
                          required autoComplete="off" placeholder="Ej: AZU-001"
                        />
                        {codigoGapWarning && !editingProduct && (
                          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-800">
                            ⚠️ {codigoGapWarning}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="marca">Marca</Label>
                        <Input
                          id="marca" value={formData.marca}
                          onChange={(e) => {
                            const marca = e.target.value;
                            setFormData({ ...formData, marca });
                            setDuplicateWarning(checkDuplicateProduct(formData.nombre, marca, formData.especificaciones, formData.unidad));
                          }}
                          placeholder="Ej: Nestlé, Potrero" autoComplete="off" spellCheck={true} lang="es-MX" list="marcas-existentes"
                        />
                        <datalist id="marcas-existentes">
                          {[...new Set(productos.map(p => p.marca).filter(Boolean))].sort().map(m => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="categoria">Categoría</Label>
                        <Input
                          id="categoria" value={formData.categoria}
                          onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                          placeholder="Ej: Azúcar, Frijol, Aceite" list="categorias-existentes" spellCheck={true} lang="es-MX"
                        />
                        <datalist id="categorias-existentes">
                          {[...new Set(productos.map(p => p.categoria).filter(Boolean))].sort().map(cat => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Especificaciones (full width) */}
                    <div className="space-y-1">
                      <Label htmlFor="especificaciones">Presentación / Especificaciones</Label>
                      <Input
                        id="especificaciones" value={formData.especificaciones}
                        onChange={(e) => {
                          const especificaciones = e.target.value;
                          setFormData({ ...formData, especificaciones });
                          setDuplicateWarning(checkDuplicateProduct(formData.nombre, formData.marca, especificaciones, formData.unidad));
                        }}
                        placeholder="Ej: 25kg, 6/2.8kg, 30/40" autoComplete="off"
                      />
                      <p className="text-[11px] text-muted-foreground">Aparece en facturas y pedidos</p>
                    </div>
                  </div>

                  {duplicateWarning && (
                    <p className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">{duplicateWarning}</p>
                  )}

                  {/* ── SECCIÓN 2: Presentación y precio ── */}
                  <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Tag className="h-4 w-4 text-muted-foreground" /> Presentación y precio
                    </span>

                    {/* Fila 1: Unidad + Peso + Contenido */}
                    <div className="grid grid-cols-3 gap-3">
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
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {UNIDADES_PRODUCTO.map(u => (
                              <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                            ))}
                            {editingProduct && formData.unidad && !UNIDADES_PRODUCTO.find(u => u.value === formData.unidad) && (
                              <SelectItem value={formData.unidad}>
                                {UNIDADES_LEGACY.find(u => u.value === formData.unidad)?.label || formData.unidad} (legacy)
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="peso_kg">Peso (kg)</Label>
                        <div className="relative">
                          <Input
                            id="peso_kg" type="number" step="0.01" value={formData.peso_kg}
                            onChange={(e) => setFormData({ ...formData, peso_kg: e.target.value })}
                            placeholder="Ej: 25" autoComplete="off" className="pr-10"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">kg</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Label htmlFor="contenido_empaque">Contenido</Label>
                          <Tooltip>
                            <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                            <TooltipContent><p className="text-xs">Contenido interno del empaque</p></TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="contenido_empaque" value={formData.contenido_empaque}
                          onChange={(e) => setFormData({ ...formData, contenido_empaque: e.target.value })}
                          placeholder="Ej: 24×800g, 6×3kg" autoComplete="off"
                        />
                      </div>
                    </div>

                    {/* Fila 2: Toggle precio por kilo */}
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                      <div className="space-y-0.5">
                        <Label htmlFor="precio_por_kilo" className="cursor-pointer font-medium">¿Se vende por kilo?</Label>
                        <p className="text-xs text-muted-foreground">
                          {formData.precio_por_kilo
                            ? "Precio en $/kg · Total = cantidad × peso × precio/kg"
                            : "Precio por unidad · Total = cantidad × precio"}
                        </p>
                      </div>
                      <Switch
                        id="precio_por_kilo" checked={formData.precio_por_kilo}
                        onCheckedChange={(v) => setFormData({ ...formData, precio_por_kilo: v })}
                      />
                    </div>
                    {kiloPesoError && (
                      <p className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                        Ingresa el peso para productos vendidos por kilo
                      </p>
                    )}

                    {/* Fila 3: Precio venta + Descuento máximo */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="precio_venta">
                          {formData.precio_por_kilo ? "Precio por kg ($/kg) *" : "Precio por unidad *"}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            id="precio_venta" type="number" step="0.01" value={formData.precio_venta}
                            onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                            placeholder="0.00" required className="pl-7" autoComplete="off"
                          />
                        </div>
                        {formData.precio_por_kilo && precioVenta > 0 && pesoKg > 0 && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            = {formatCurrency(precioVenta * pesoKg)} por {formData.unidad}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Label htmlFor="descuento_maximo">
                            {formData.precio_por_kilo ? "Descuento máximo ($/kg)" : "Descuento máximo"}
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                            <TooltipContent><p className="text-xs max-w-[200px]">El vendedor puede dar hasta este descuento sin pedir autorización</p></TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            id="descuento_maximo" type="number" step="0.01" value={formData.descuento_maximo}
                            onChange={(e) => setFormData({ ...formData, descuento_maximo: e.target.value })}
                            placeholder="0.00" className="pl-7" autoComplete="off"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Warnings */}
                    {margenNegativo && canSeeCosts && (
                      <p className="text-xs p-2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        ⚠ El precio de venta es menor al costo. El margen sería negativo.
                      </p>
                    )}
                    {descuentoExcesivo && (
                      <p className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                        El descuento no puede ser mayor al precio
                      </p>
                    )}
                  </div>

                  {/* ── SECCIÓN 3: Inventario ── */}
                  <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-muted-foreground" /> Inventario
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Label htmlFor="stock_minimo">Stock mínimo de alerta</Label>
                          <Tooltip>
                            <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                            <TooltipContent><p className="text-xs">El sistema alertará cuando el stock baje de este número</p></TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="stock_minimo" type="number" value={formData.stock_minimo}
                          onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                          autoComplete="off" placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Label htmlFor="stock_inicial">{editingProduct ? "Agregar stock" : "Stock inicial"}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                            <TooltipContent><p className="text-xs">{editingProduct ? "Se sumará al stock actual (crea nuevo lote)" : "Cantidad que ya tienes en bodega"}</p></TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="stock_inicial" type="number" value={formData.stock_inicial}
                          onChange={(e) => setFormData({ ...formData, stock_inicial: e.target.value })}
                          placeholder="0" autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                      <div className="space-y-0.5">
                        <Label htmlFor="maneja_caducidad" className="cursor-pointer font-medium">¿Maneja fecha de caducidad?</Label>
                        <p className="text-xs text-muted-foreground">El almacén registrará la fecha al recibir cada lote de mercancía</p>
                      </div>
                      <Switch
                        id="maneja_caducidad" checked={formData.maneja_caducidad}
                        onCheckedChange={(checked) => setFormData({ ...formData, maneja_caducidad: checked })}
                      />
                    </div>
                  </div>

                  {/* ── SECCIÓN 4: Proveedor ── */}
                  <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-2">
                      <Label htmlFor="proveedor">Proveedor principal</Label>
                      <p className="text-xs text-muted-foreground -mt-1">¿De quién compras este producto?</p>
                      <Select value={formData.proveedor_id} onValueChange={(value) => setFormData({ ...formData, proveedor_id: value })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar proveedor (opcional)" /></SelectTrigger>
                        <SelectContent>
                          {proveedores.map(prov => (
                            <SelectItem key={prov.id} value={prov.id}>{prov.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* ── SECCIÓN 5: Configuración especial (Collapsible) ── */}
                  <Collapsible defaultOpen={specialConfigCount > 0}>
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="ghost" className="w-full justify-between p-3 h-auto bg-muted/30 border rounded-lg">
                        <div className="text-left">
                          <span className="text-sm font-medium">Configuración especial</span>
                          <p className="text-xs text-muted-foreground font-normal">
                            {specialConfigCount > 0 ? `${specialConfigCount} opción${specialConfigCount > 1 ? 'es' : ''} activa${specialConfigCount > 1 ? 's' : ''}` : "Sin configuración especial"}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-3">
                      {/* Requiere fumigación */}
                      <div className="flex items-center justify-between p-2 rounded border bg-background">
                        <div>
                          <Label htmlFor="requiere_fumigacion" className="cursor-pointer text-sm">Requiere fumigación</Label>
                          <p className="text-xs text-muted-foreground">El sistema alertará cada 6 meses</p>
                        </div>
                        <Switch id="requiere_fumigacion" checked={formData.requiere_fumigacion} onCheckedChange={(checked) => setFormData({ ...formData, requiere_fumigacion: checked })} />
                      </div>
                      {formData.requiere_fumigacion && (
                        <div className="space-y-2 ml-4">
                          <Label htmlFor="fecha_ultima_fumigacion">Fecha de última fumigación</Label>
                          <Input id="fecha_ultima_fumigacion" type="date" value={formData.fecha_ultima_fumigacion} onChange={(e) => setFormData({ ...formData, fecha_ultima_fumigacion: e.target.value })} />
                        </div>
                      )}

                      {/* Solo uso interno */}
                      <div className="flex items-center justify-between p-2 rounded border bg-background">
                        <div>
                          <Label htmlFor="solo_uso_interno" className="cursor-pointer text-sm">Solo uso interno</Label>
                          <p className="text-xs text-muted-foreground">No aparece en pedidos de clientes</p>
                        </div>
                        <Switch id="solo_uso_interno" checked={formData.solo_uso_interno} onCheckedChange={(checked) => setFormData({ ...formData, solo_uso_interno: checked })} />
                      </div>

                      {/* Bloqueado ventas */}
                      <div className={`flex items-center justify-between p-2 rounded border ${formData.bloqueado_venta ? 'bg-destructive/10 border-destructive/30' : 'bg-background'}`}>
                        <div>
                          <Label htmlFor="bloqueado_venta" className="cursor-pointer text-sm">Ventas bloqueadas</Label>
                          <p className="text-xs text-muted-foreground">Nadie puede venderlo temporalmente</p>
                        </div>
                        <Switch id="bloqueado_venta" checked={formData.bloqueado_venta} onCheckedChange={(checked) => setFormData({ ...formData, bloqueado_venta: checked })} />
                      </div>

                      {/* En promoción */}
                      <div className="flex items-center justify-between p-2 rounded border bg-background">
                        <div>
                          <Label htmlFor="es_promocion" className="cursor-pointer text-sm">En promoción</Label>
                        </div>
                        <Switch id="es_promocion" checked={formData.es_promocion} onCheckedChange={(checked) => setFormData({ ...formData, es_promocion: checked })} />
                      </div>
                      {formData.es_promocion && (
                        <div className="space-y-2 ml-4">
                          <Label htmlFor="descripcion_promocion">Descripción de la promoción</Label>
                          <Input id="descripcion_promocion" value={formData.descripcion_promocion} onChange={(e) => setFormData({ ...formData, descripcion_promocion: e.target.value })} placeholder="Ej: Compra 3 lleva 4" autoComplete="off" />
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* ── SECCIÓN 6: Datos fiscales (Collapsible) ── */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="ghost" className="w-full justify-between p-3 h-auto bg-muted/30 border rounded-lg">
                        <div className="text-left">
                          <span className="text-sm font-medium flex items-center gap-1.5"><FileText className="h-4 w-4 text-muted-foreground" /> Datos fiscales (CFDI)</span>
                          <p className="text-xs text-muted-foreground font-normal">Necesario para facturación electrónica</p>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-2 rounded border bg-background">
                          <Label htmlFor="aplica_iva" className="cursor-pointer text-sm">Grava IVA (16%)</Label>
                          <Switch id="aplica_iva" checked={formData.aplica_iva} onCheckedChange={(checked) => setFormData({ ...formData, aplica_iva: checked })} />
                        </div>
                        <div className="flex items-center justify-between p-2 rounded border bg-background">
                          <Label htmlFor="aplica_ieps" className="cursor-pointer text-sm">Grava IEPS (8%)</Label>
                          <Switch id="aplica_ieps" checked={formData.aplica_ieps} onCheckedChange={(checked) => setFormData({ ...formData, aplica_ieps: checked })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="codigo_sat">Clave SAT</Label>
                          <Input id="codigo_sat" value={formData.codigo_sat} onChange={(e) => setFormData({ ...formData, codigo_sat: e.target.value })} placeholder="Ej: 50201502" autoComplete="off" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="unidad_sat">Unidad SAT</Label>
                          <Select value={formData.unidad_sat} onValueChange={(value) => setFormData({ ...formData, unidad_sat: value })}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>
                              {UNIDADES_SAT.map(u => (
                                <SelectItem key={u.clave} value={u.clave}>{u.clave} — {u.descripcion}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="piezas_por_unidad">Piezas por unidad</Label>
                        <Input id="piezas_por_unidad" type="number" value={formData.piezas_por_unidad} onChange={(e) => setFormData({ ...formData, piezas_por_unidad: e.target.value })} placeholder="Ej: 24 piezas por caja" autoComplete="off" />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* ── Card informativo (solo al EDITAR) ── */}
                  {editingProduct && (
                    <div className="p-3 rounded-lg border bg-muted/50 space-y-1.5 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Stock actual:</span>
                        <span className="font-medium">
                          {editingProduct.stock_actual ?? 0} {editingProduct.unidad}
                          {editingProduct.peso_kg ? ` (${((editingProduct.stock_actual || 0) * editingProduct.peso_kg).toFixed(0)} kg)` : ""}
                          {(editingProduct.stock_actual || 0) <= (editingProduct.stock_minimo || 0) ? (
                            <Badge variant="destructive" className="ml-2 text-[10px]">Bajo mínimo</Badge>
                          ) : (
                            <Badge className="ml-2 text-[10px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">OK</Badge>
                          )}
                        </span>
                      </div>
                      {canSeeCosts && editingProduct.precio_compra > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Último costo:</span>
                          <span>{formatCurrency(editingProduct.precio_compra)}{editingProduct.precio_por_kilo ? "/kg" : `/${editingProduct.unidad}`}</span>
                        </div>
                      )}
                      {canSeeCosts && editingProduct.costo_promedio_ponderado > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CPP:</span>
                          <span>{formatCurrency(editingProduct.costo_promedio_ponderado)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Toggle activo (discreto) */}
                  <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
                    <Label htmlFor="activo" className="cursor-pointer text-sm text-muted-foreground">Producto activo</Label>
                    <Switch id="activo" checked={formData.activo} onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })} />
                  </div>

                  {/* Botones */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">{editingProduct ? "Guardar cambios" : "Crear producto"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* ═══════════════════════════════════════════════════
              BÚSQUEDA Y FILTROS
              ═══════════════════════════════════════════════════ */}
          <div className="space-y-3 flex-shrink-0 mb-2">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, código o marca..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"
                />
              </div>
              {isMobile && (
                <Sheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="relative">
                      <Filter className="h-4 w-4" />
                      {hasActiveFilters && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="space-y-4">
                    <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
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
              )}
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

            <p className="text-xs text-muted-foreground">
              Mostrando {filteredProductos.length} de {tabActivo === "inactivos" ? productosInactivos : productosActivos} productos
              {hasActiveFilters && " (filtrados)"}
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════
              TABS + TABLA / CARDS
              ═══════════════════════════════════════════════════ */}
          <Tabs value={tabActivo} onValueChange={(value) => setTabActivo(value as "activos" | "inactivos")} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="activos">Activos ({productosActivos})</TabsTrigger>
              <TabsTrigger value="inactivos">Inactivos ({productosInactivos})</TabsTrigger>
            </TabsList>

            <TabsContent value={tabActivo} className="mt-2 flex-1 min-h-0 overflow-hidden">
              {isMobile ? (
                <div className="space-y-3 overflow-y-auto h-full pb-4">
                  {loading ? (
                    <p className="text-center text-muted-foreground py-8">Cargando...</p>
                  ) : filteredProductos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No hay productos</p>
                  ) : (
                    filteredProductos.map(producto => (
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
                /* ═══ TABLA DESKTOP (8 columnas) ═══ */
                <div className="border rounded-lg overflow-hidden h-full flex flex-col">
                  <div className="overflow-y-auto flex-1">
                    <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                      <colgroup>
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '32%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '9%' }} />
                      </colgroup>
                      <TableHeader className="sticky top-0 z-10 bg-background">
                        <TableRow>
                          <TableHead className="px-2 py-1.5"><SortableHeader col="codigo">Código</SortableHeader></TableHead>
                          <TableHead className="px-2 py-1.5"><SortableHeader col="nombre">Producto</SortableHeader></TableHead>
                          <TableHead className="px-2 py-1.5">Unidad</TableHead>
                          <TableHead className="px-2 py-1.5">Tipo</TableHead>
                          <TableHead className="px-2 py-1.5 text-right"><SortableHeader col="precio" className="justify-end">Precio</SortableHeader></TableHead>
                          <TableHead className="px-2 py-1.5 text-center"><SortableHeader col="stock">Stock</SortableHeader></TableHead>
                          <TableHead className="px-2 py-1.5 text-center">IVA/IEPS</TableHead>
                          <TableHead className="px-2 py-1.5"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-8">Cargando...</TableCell></TableRow>
                        ) : filteredProductos.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-8">No hay productos</TableCell></TableRow>
                        ) : (
                          filteredProductos.map(p => {
                            const details = [p.marca, p.especificaciones].filter(Boolean).join(' · ');
                            const stock = p.stock_actual ?? 0;
                            const stockBajo = stock <= (p.stock_minimo || 0);
                            const sinStock = stock <= 0;

                            return (
                              <TableRow key={p.id} className={p.activo === false ? "opacity-50" : ""}>
                                {/* 1. Código */}
                                <TableCell className="px-2 py-1.5">
                                  <span className="font-mono text-xs font-medium">{p.codigo}</span>
                                  {p.activo === false && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 ml-1">Inactivo</Badge>}
                                </TableCell>

                                {/* 2. Producto */}
                                <TableCell className="px-2 py-1.5">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{p.nombre}</p>
                                    {details && <p className="text-xs text-muted-foreground truncate">{details}</p>}
                                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                      {p.bloqueado_venta && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">🔒 Bloqueado</Badge>}
                                      {p.es_promocion && <Badge className="text-[9px] px-1 py-0 h-3.5 bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800">🎁 Promo</Badge>}
                                      {p.solo_uso_interno && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">🔬 Interno</Badge>}
                                      {p.maneja_caducidad && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800">📅 Caduca</Badge>}
                                    </div>
                                  </div>
                                </TableCell>

                                {/* 3. Unidad */}
                                <TableCell className="px-2 py-1.5 capitalize text-xs">{p.unidad}</TableCell>

                                {/* 4. Tipo */}
                                <TableCell className="px-2 py-1.5">
                                  {p.precio_por_kilo ? (
                                    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">/kilo</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">/unidad</Badge>
                                  )}
                                </TableCell>

                                {/* 5. Precio */}
                                <TableCell className="px-2 py-1.5 text-right">
                                  {p.precio_venta ? (
                                    p.precio_por_kilo ? (
                                      <div>
                                        <span className="font-medium text-sm">{formatCurrency(p.precio_venta)}/kg</span>
                                        {p.peso_kg > 0 && (
                                          <p className="text-[11px] text-muted-foreground">={formatCurrency(p.precio_venta * p.peso_kg)}/{p.unidad}</p>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="font-medium text-sm">{formatCurrency(p.precio_venta)}</span>
                                    )
                                  ) : "-"}
                                </TableCell>

                                {/* 6. Stock */}
                                <TableCell className="px-2 py-1.5 text-center">
                                  {sinStock ? (
                                    <Badge variant="destructive" className="text-[10px]">Sin stock</Badge>
                                  ) : (
                                    <span className={`font-medium text-sm ${stockBajo ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>{stock}</span>
                                  )}
                                </TableCell>

                                {/* 7. IVA/IEPS */}
                                <TableCell className="px-2 py-1.5 text-center">
                                  <div className="flex items-center justify-center gap-0.5">
                                    {p.aplica_iva && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800">IVA</Badge>}
                                    {p.aplica_ieps && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">IEPS</Badge>}
                                    {!p.aplica_iva && !p.aplica_ieps && <span className="text-muted-foreground text-xs">-</span>}
                                  </div>
                                </TableCell>

                                {/* 8. Acciones */}
                                <TableCell className="px-2 py-1.5">
                                  <div className="flex gap-0.5">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(p)} title="Editar">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    {tabActivo === "inactivos" ? (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReactivate(p)} title="Reactivar">
                                        <RotateCcw className="h-3.5 w-3.5 text-green-600" />
                                      </Button>
                                    ) : (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeactivate(p)} title="Desactivar">
                                        <Power className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Deactivate confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desactivar "{deleteTarget?.nombre}"?</AlertDialogTitle>
              <AlertDialogDescription>
                El producto dejará de aparecer en ventas pero se conservará su historial.
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
      </TooltipProvider>
    </Layout>
  );
};

export default Productos;
