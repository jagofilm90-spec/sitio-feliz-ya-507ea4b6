import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AsociacionFormData {
  producto_id: string;
  costo_proveedor: number | null;
  codigo_proveedor: string | null;
  tipo_carga_default: "libre" | "fija";
  precio_por_kilo_compra: boolean;
  tipo_vehiculo_estandar: string | null;
  capacidad_vehiculo_bultos: number | null;
  capacidad_vehiculo_kg: number | null;
  permite_combinacion: boolean;
  es_capacidad_fija: boolean;
  dividir_en_lotes_recepcion: boolean;
  cantidad_lotes_default: number | null;
  unidades_por_lote_default: number | null;
}

export interface AsociacionEditData extends AsociacionFormData {
  id: string;
  producto_nombre: string;
  marca: string | null;
  especificaciones: string | null;
  por_kilo: boolean | null;
  aplica_iva: boolean | null;
  aplica_ieps: boolean | null;
  updated_at: string | null;
}

export function useAsociacionParaEditar(asociacionId: string | undefined) {
  return useQuery({
    queryKey: ["asociacion-edit", asociacionId],
    queryFn: async (): Promise<AsociacionEditData | null> => {
      if (!asociacionId) return null;
      const { data, error } = await supabase
        .from("proveedor_productos")
        .select(
          "*, productos:producto_id(nombre, marca, especificaciones, precio_por_kilo, aplica_iva, aplica_ieps)"
        )
        .eq("id", asociacionId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const p: any = data;
      return {
        id: p.id,
        producto_id: p.producto_id,
        costo_proveedor: p.costo_proveedor,
        codigo_proveedor: p.codigo_proveedor,
        tipo_carga_default: (p.tipo_carga_default || "libre") as "libre" | "fija",
        precio_por_kilo_compra: !!p.precio_por_kilo_compra,
        tipo_vehiculo_estandar: p.tipo_vehiculo_estandar,
        capacidad_vehiculo_bultos: p.capacidad_vehiculo_bultos,
        capacidad_vehiculo_kg: p.capacidad_vehiculo_kg,
        permite_combinacion: !!p.permite_combinacion,
        es_capacidad_fija: p.es_capacidad_fija ?? true,
        dividir_en_lotes_recepcion: !!p.dividir_en_lotes_recepcion,
        cantidad_lotes_default: p.cantidad_lotes_default,
        unidades_por_lote_default: p.unidades_por_lote_default,
        producto_nombre: p.productos?.nombre || "—",
        marca: p.productos?.marca ?? null,
        especificaciones: p.productos?.especificaciones ?? null,
        por_kilo: p.productos?.precio_por_kilo ?? null,
        aplica_iva: p.productos?.aplica_iva ?? null,
        aplica_ieps: p.productos?.aplica_ieps ?? null,
        updated_at: p.updated_at,
      };
    },
    enabled: !!asociacionId,
  });
}

function buildPayload(form: AsociacionFormData) {
  return {
    producto_id: form.producto_id,
    costo_proveedor: form.costo_proveedor,
    codigo_proveedor: form.codigo_proveedor || null,
    tipo_carga_default: form.tipo_carga_default,
    precio_por_kilo_compra: form.precio_por_kilo_compra,
    tipo_vehiculo_estandar:
      form.tipo_carga_default === "fija" ? form.tipo_vehiculo_estandar || null : null,
    capacidad_vehiculo_bultos:
      form.tipo_carga_default === "fija" ? form.capacidad_vehiculo_bultos : null,
    capacidad_vehiculo_kg:
      form.tipo_carga_default === "fija" ? form.capacidad_vehiculo_kg : null,
    permite_combinacion:
      form.tipo_carga_default === "fija" ? form.permite_combinacion : false,
    es_capacidad_fija: form.es_capacidad_fija,
    dividir_en_lotes_recepcion: form.dividir_en_lotes_recepcion,
    cantidad_lotes_default: form.dividir_en_lotes_recepcion
      ? form.cantidad_lotes_default
      : null,
    unidades_por_lote_default: form.dividir_en_lotes_recepcion
      ? form.unidades_por_lote_default
      : null,
    activo: true,
  };
}

export function useCreateAsociacion(proveedorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: AsociacionFormData) => {
      // Check if existing (incl. soft-deleted) - reactivate if so
      const { data: existing } = await supabase
        .from("proveedor_productos")
        .select("id")
        .eq("proveedor_id", proveedorId)
        .eq("producto_id", form.producto_id)
        .maybeSingle();

      const payload = { ...buildPayload(form), proveedor_id: proveedorId };

      if (existing) {
        const { error } = await supabase
          .from("proveedor_productos")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
        return existing.id;
      } else {
        const { data, error } = await supabase
          .from("proveedor_productos")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => {
      toast.success("Producto asociado");
      qc.invalidateQueries({ queryKey: ["proveedor-productos-tab", proveedorId] });
      qc.invalidateQueries({ queryKey: ["proveedor-detalle", proveedorId] });
      qc.invalidateQueries({ queryKey: ["proveedores-v3"] });
    },
    onError: (err: any) => {
      toast.error("No se pudo asociar el producto", {
        description: err?.message ?? "Error desconocido",
        duration: 6000,
      });
    },
  });
}

export function useUpdateAsociacion(proveedorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, form }: { id: string; form: AsociacionFormData }) => {
      const payload = buildPayload(form);
      const { error } = await supabase
        .from("proveedor_productos")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast.success("Asociación actualizada");
      qc.invalidateQueries({ queryKey: ["proveedor-productos-tab", proveedorId] });
      qc.invalidateQueries({ queryKey: ["asociacion-edit"] });
    },
    onError: (err: any) => {
      toast.error("No se pudo actualizar la asociación", {
        description: err?.message ?? "Error desconocido",
        duration: 6000,
      });
    },
  });
}

export function useDesasociarProducto(proveedorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (asociacionId: string) => {
      const { error } = await supabase
        .from("proveedor_productos")
        .update({ activo: false })
        .eq("id", asociacionId);
      if (error) throw error;
      return asociacionId;
    },
    onSuccess: () => {
      toast.success("Producto desasociado");
      qc.invalidateQueries({ queryKey: ["proveedor-productos-tab", proveedorId] });
      qc.invalidateQueries({ queryKey: ["proveedor-detalle", proveedorId] });
      qc.invalidateQueries({ queryKey: ["proveedores-v3"] });
    },
    onError: (err: any) => {
      toast.error("No se pudo desasociar", {
        description: err?.message ?? "Error desconocido",
        duration: 6000,
      });
    },
  });
}
