import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BuscadorProductos, type ProductoBuscado } from "./BuscadorProductos";
import { CamposAsociacion } from "./CamposAsociacion";
import {
  useAsociacionParaEditar,
  useCreateAsociacion,
  useUpdateAsociacion,
  type AsociacionFormData,
} from "@/hooks/useAsociarProducto";

interface Props {
  mode: "create" | "edit";
  proveedorId: string;
  asociacionId?: string;
  productoIdInicial?: string;
  onClose: () => void;
  onSuccess?: (id: string) => void;
}

const emptyForm: AsociacionFormData = {
  producto_id: "",
  costo_proveedor: null,
  codigo_proveedor: null,
  tipo_carga_default: "libre",
  precio_por_kilo_compra: false,
  tipo_vehiculo_estandar: null,
  capacidad_vehiculo_bultos: null,
  capacidad_vehiculo_kg: null,
  permite_combinacion: false,
  es_capacidad_fija: true,
  dividir_en_lotes_recepcion: false,
  cantidad_lotes_default: null,
  unidades_por_lote_default: null,
};

export const ModalAsociarProducto = ({
  mode,
  proveedorId,
  asociacionId,
  productoIdInicial,
  onClose,
  onSuccess,
}: Props) => {
  const [selected, setSelected] = useState<ProductoBuscado | null>(null);
  const [form, setForm] = useState<AsociacionFormData>(emptyForm);

  const { data: proveedor } = useQuery({
    queryKey: ["proveedor-nombre", proveedorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("proveedores")
        .select("nombre, nombre_comercial")
        .eq("id", proveedorId)
        .maybeSingle();
      return data;
    },
  });

  const { data: editData, isLoading: loadingEdit } = useAsociacionParaEditar(
    mode === "edit" ? asociacionId : undefined
  );

  const createMut = useCreateAsociacion(proveedorId);
  const updateMut = useUpdateAsociacion(proveedorId);

  // Pre-load initial product (from comparator)
  useEffect(() => {
    if (mode === "create" && productoIdInicial && !selected) {
      (async () => {
        const { data } = await supabase
          .from("productos")
          .select(
            "id, nombre, marca, especificaciones, codigo, peso_kg, precio_por_kilo, aplica_iva, aplica_ieps"
          )
          .eq("id", productoIdInicial)
          .maybeSingle();
        if (data) {
          setSelected(data as any);
          setForm((f) => ({
            ...f,
            producto_id: data.id,
            precio_por_kilo_compra: !!data.precio_por_kilo,
          }));
        }
      })();
    }
  }, [mode, productoIdInicial, selected]);

  // Sync selected -> form producto_id (create mode)
  useEffect(() => {
    if (mode === "create" && selected) {
      setForm((f) => ({
        ...f,
        producto_id: selected.id,
        precio_por_kilo_compra: f.producto_id === selected.id ? f.precio_por_kilo_compra : !!selected.precio_por_kilo,
      }));
    } else if (mode === "create" && !selected) {
      setForm((f) => ({ ...f, producto_id: "" }));
    }
  }, [selected, mode]);

  // Load edit data
  useEffect(() => {
    if (mode === "edit" && editData) {
      setForm({
        producto_id: editData.producto_id,
        costo_proveedor: editData.costo_proveedor,
        codigo_proveedor: editData.codigo_proveedor,
        tipo_carga_default: editData.tipo_carga_default,
        precio_por_kilo_compra: editData.precio_por_kilo_compra,
        tipo_vehiculo_estandar: editData.tipo_vehiculo_estandar,
        capacidad_vehiculo_bultos: editData.capacidad_vehiculo_bultos,
        capacidad_vehiculo_kg: editData.capacidad_vehiculo_kg,
        permite_combinacion: editData.permite_combinacion,
        es_capacidad_fija: editData.es_capacidad_fija,
        dividir_en_lotes_recepcion: editData.dividir_en_lotes_recepcion,
        cantidad_lotes_default: editData.cantidad_lotes_default,
        unidades_por_lote_default: editData.unidades_por_lote_default,
      });
    }
  }, [mode, editData]);

  const handleChange = (patch: Partial<AsociacionFormData>) =>
    setForm((f) => ({ ...f, ...patch }));

  const productoNombre =
    mode === "edit" ? editData?.producto_nombre : selected?.nombre;
  const porKilo =
    mode === "edit"
      ? editData?.por_kilo ?? null
      : selected?.precio_por_kilo ?? null;

  const isValid =
    !!form.producto_id &&
    form.costo_proveedor !== null &&
    form.costo_proveedor > 0 &&
    !!form.tipo_carga_default;

  const isSubmitting = createMut.isPending || updateMut.isPending;

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      let id: string;
      if (mode === "create") {
        id = await createMut.mutateAsync(form);
      } else {
        id = await updateMut.mutateAsync({ id: asociacionId!, form });
      }
      onSuccess?.(id);
      onClose();
    } catch {
      // toast handled in hook
    }
  };

  const proveedorNombre =
    proveedor?.nombre_comercial || proveedor?.nombre || "este proveedor";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[720px] w-[calc(100%-2rem)] p-0 gap-0 max-h-[85vh] overflow-hidden flex flex-col bg-white">
        <DialogTitle className="sr-only">
          {mode === "create" ? "Asociar producto" : "Editar asociación"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {mode === "create"
            ? `Asocia un producto existente al proveedor ${proveedorNombre}`
            : "Modifica los términos de esta asociación"}
        </DialogDescription>

        {/* HEADER */}
        <div className="px-8 pt-7 pb-5 border-b border-ink-100">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 font-medium mb-2">
            PROVEEDOR · PRODUCTOS
          </div>
          <h2 className="font-serif text-[28px] leading-tight text-ink-900 font-medium">
            {mode === "create" ? (
              <>
                Asociar <em className="italic text-ink-700">producto</em>.
              </>
            ) : (
              <>
                Editar <em className="italic text-ink-700">asociación</em>.
              </>
            )}
          </h2>
          <p className="font-serif italic text-sm text-ink-500 mt-1">
            {mode === "create"
              ? `Asocia un producto existente al proveedor ${proveedorNombre}`
              : "Modifica los términos de esta asociación"}
          </p>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {mode === "create" && (
            <BuscadorProductos
              proveedorId={proveedorId}
              selected={selected}
              onSelect={setSelected}
            />
          )}

          {mode === "edit" && loadingEdit && (
            <div className="text-center py-8 text-sm text-ink-500">Cargando…</div>
          )}

          {mode === "edit" && editData && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-ink-500 font-medium mb-2">
                Producto asociado
              </label>
              <div className="bg-bg-warm border border-ink-100 rounded-lg px-4 py-3.5">
                <div className="font-medium text-ink-900">{editData.producto_nombre}</div>
                <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-ink-500">
                  {editData.marca && <span>{editData.marca}</span>}
                  {editData.especificaciones && <span>· {editData.especificaciones}</span>}
                  <span className="inline-flex items-center px-1.5 py-px rounded bg-ink-50 text-ink-700 font-medium">
                    {editData.por_kilo ? "/ kg" : "/ bulto"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {(mode === "edit" ? !!editData : !!selected) && (
            <CamposAsociacion form={form} onChange={handleChange} porKilo={porKilo} />
          )}
        </div>

        {/* FOOTER */}
        <div className="px-8 py-4 border-t border-ink-100 bg-bg-warm flex items-center justify-between gap-3">
          <div className="text-[11px] italic text-ink-500">
            {mode === "edit" && editData?.updated_at
              ? `Última edición: hace ${formatDistanceToNowStrict(new Date(editData.updated_at), { locale: es })}`
              : "Esta asociación define los costos de compra"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting
                ? mode === "create"
                  ? "Asociando…"
                  : "Guardando…"
                : mode === "create"
                  ? "Asociar producto"
                  : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
