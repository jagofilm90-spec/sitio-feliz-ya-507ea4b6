import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getDisplayName } from "@/lib/productUtils";
import { analizarMargen } from "@/lib/calculos";
import { useCategorias } from "@/hooks/useCategorias";

// ==================== TYPES ====================

export interface ProductoPrecio {
  id: string;
  codigo: string;
  nombre: string;
  especificaciones: string | null;
  marca: string | null;
  categoria: string | null;
  peso_kg: number | null;
  contenido_empaque: string | null;
  unidad: string;
  precio_venta: number;
  precio_por_kilo: boolean;
  descuento_maximo: number | null;
  activo: boolean;
  ultimo_costo_compra: number | null;
  costo_promedio_ponderado: number | null;
  aplica_iva: boolean | null;
  aplica_ieps: boolean | null;
  es_promocion: boolean | null;
  descripcion_promocion: string | null;
  bloqueado_venta: boolean | null;
}

export interface AnalisisMargenResult {
  costo_referencia: number;
  precio_venta: number;
  piso_minimo: number;
  margen_bruto: number;
  margen_porcentaje: number;
  espacio_negociacion: number;
  estado_margen: 'perdida' | 'critico' | 'bajo' | 'saludable';
  puede_dar_descuento_maximo: boolean;
}

export interface ProductoConAnalisis extends ProductoPrecio {
  analisis: AnalisisMargenResult;
}

export type SortField = 'codigo' | 'nombre' | 'costo' | 'precio' | 'margen' | 'estado';
export type SortOrder = 'asc' | 'desc';
export type TaxFilter = "todos" | "iva" | "ieps" | "sin_impuesto";
export type PriceFilter = "todos" | "con_precio" | "sin_precio";

// ==================== HELPERS ====================

const formatCurrencyMXN = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

export const getProductDisplayName = (producto: ProductoPrecio) =>
  getDisplayName({
    nombre: producto.nombre,
    marca: producto.marca,
    especificaciones: producto.especificaciones,
    unidad: producto.unidad,
    contenido_empaque: producto.contenido_empaque,
    peso_kg: producto.peso_kg,
    es_promocion: producto.es_promocion ?? false,
    descripcion_promocion: producto.descripcion_promocion,
  });

export const formatPrecio = (producto: ProductoPrecio) => {
  const price = formatCurrencyMXN(producto.precio_venta || 0);
  return producto.precio_por_kilo ? `${price}/kg` : price;
};

export { formatCurrencyMXN as formatCurrency };

// ==================== HOOK ====================

interface UseListaPreciosOptions {
  includeAnalisis?: boolean;
}

export function useListaPrecios(options: UseListaPreciosOptions = {}) {
  const { includeAnalisis = false } = options;
  const { data: categoriasCanon } = useCategorias();

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [taxFilter, setTaxFilter] = useState<TaxFilter>("todos");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("todos");
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Query
  const { data: productos, isLoading, refetch } = useQuery({
    queryKey: ["lista-precios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, codigo, nombre, especificaciones, marca, categoria, peso_kg, contenido_empaque, unidad, precio_venta, precio_por_kilo, descuento_maximo, activo, ultimo_costo_compra, costo_promedio_ponderado, aplica_iva, aplica_ieps, es_promocion, descripcion_promocion, bloqueado_venta")
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .order("categoria")
        .order("nombre");

      if (error) throw error;
      return data as ProductoPrecio[];
    },
  });

  // Enrich with margin analysis
  const productosConAnalisis = useMemo(() => {
    if (!productos) return [];
    if (!includeAnalisis) return productos as any as ProductoConAnalisis[];

    return productos.map(p => {
      const analisis = analizarMargen({
        costo_promedio: p.costo_promedio_ponderado || 0,
        costo_ultimo: p.ultimo_costo_compra || 0,
        precio_venta: p.precio_venta,
        descuento_maximo: p.descuento_maximo || 0,
      });
      return { ...p, analisis } as ProductoConAnalisis;
    });
  }, [productos, includeAnalisis]);

  // Unique categories from canonical table
  const categorias = useMemo(() => {
    return (categoriasCanon || []).map(c => c.nombre);
  }, [categoriasCanon]);

  // Filter + sort
  const filteredProductos = useMemo(() => {
    let result = productosConAnalisis;

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.codigo?.toLowerCase().includes(term) ||
        p.nombre?.toLowerCase().includes(term) ||
        (p.especificaciones?.toLowerCase() || "").includes(term) ||
        (p.marca?.toLowerCase() || "").includes(term)
      );
    }

    // Category
    if (categoriaFilter !== "all" && categoriaFilter !== "todas") {
      result = result.filter(p => (p.categoria || "Sin categoría") === categoriaFilter);
    }

    // Estado (margin) - only with analisis
    if (includeAnalisis && estadoFilter !== "all") {
      result = result.filter(p => (p as ProductoConAnalisis).analisis?.estado_margen === estadoFilter);
    }

    // Tax
    if (taxFilter === "iva") result = result.filter(p => p.aplica_iva);
    else if (taxFilter === "ieps") result = result.filter(p => p.aplica_ieps);
    else if (taxFilter === "sin_impuesto") result = result.filter(p => !p.aplica_iva && !p.aplica_ieps);

    // Price
    if (priceFilter === "con_precio") result = result.filter(p => p.precio_venta && p.precio_venta > 0);
    else if (priceFilter === "sin_precio") result = result.filter(p => !p.precio_venta || p.precio_venta === 0);

    // Sort
    if (includeAnalisis) {
      result = [...result].sort((a, b) => {
        const aa = a as ProductoConAnalisis;
        const bb = b as ProductoConAnalisis;
        let comparison = 0;
        switch (sortField) {
          case 'codigo': comparison = aa.codigo.localeCompare(bb.codigo); break;
          case 'nombre': comparison = aa.nombre.localeCompare(bb.nombre); break;
          case 'costo': comparison = (aa.analisis?.costo_referencia || 0) - (bb.analisis?.costo_referencia || 0); break;
          case 'precio': comparison = aa.precio_venta - bb.precio_venta; break;
          case 'margen': comparison = (aa.analisis?.margen_porcentaje || 0) - (bb.analisis?.margen_porcentaje || 0); break;
          case 'estado': {
            const order = { perdida: 0, critico: 1, bajo: 2, saludable: 3 };
            comparison = (order[aa.analisis?.estado_margen] ?? 3) - (order[bb.analisis?.estado_margen] ?? 3);
            break;
          }
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [productosConAnalisis, searchTerm, categoriaFilter, estadoFilter, taxFilter, priceFilter, sortField, sortOrder, includeAnalisis]);

  // Group by category
  const productosPorCategoria = useMemo(() => {
    const grupos: Record<string, typeof filteredProductos> = {};
    for (const p of filteredProductos) {
      const cat = p.categoria || "Sin categoría";
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(p);
    }
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProductos]);

  // Stats (only meaningful with analisis)
  const stats = useMemo(() => {
    if (!includeAnalisis) return { total: productos?.length ?? 0, perdida: 0, critico: 0, bajo: 0, saludable: 0, sinPrecio: 0 };
    const all = productosConAnalisis as ProductoConAnalisis[];
    return {
      total: all.length,
      perdida: all.filter(p => p.analisis?.estado_margen === 'perdida').length,
      critico: all.filter(p => p.analisis?.estado_margen === 'critico').length,
      bajo: all.filter(p => p.analisis?.estado_margen === 'bajo').length,
      saludable: all.filter(p => p.analisis?.estado_margen === 'saludable').length,
      sinPrecio: all.filter(p => !p.precio_venta || p.precio_venta === 0).length,
    };
  }, [productosConAnalisis, includeAnalisis, productos]);

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return {
    // Data
    productos: productos ?? [],
    productosConAnalisis,
    filteredProductos,
    productosPorCategoria,
    categorias,
    stats,
    isLoading,
    refetch,

    // Filter state + setters
    searchTerm, setSearchTerm,
    categoriaFilter, setCategoriaFilter,
    estadoFilter, setEstadoFilter,
    taxFilter, setTaxFilter,
    priceFilter, setPriceFilter,
    sortField, sortOrder,
    handleSort,
  };
}
