import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SeccionDatosBasicos } from "./SeccionDatosBasicos";
import { SeccionFiscal } from "./SeccionFiscal";
import { SeccionContactos } from "./SeccionContactos";
import { SeccionCondiciones } from "./SeccionCondiciones";
import {
  emptyProveedor,
  validateProveedor,
  type ProveedorForm,
} from "@/lib/proveedor-form-utils";
import {
  useProveedorParaEditar,
  useCreateProveedor,
  useUpdateProveedor,
} from "@/hooks/useProveedorForm";

interface Props {
  mode: "create" | "edit";
  proveedorId?: string;
  onClose: () => void;
  onSuccess?: (id: string) => void;
}

export const ProveedorFormModal = ({ mode, proveedorId, onClose, onSuccess }: Props) => {
  const [form, setForm] = useState<ProveedorForm>(emptyProveedor());
  const [touched, setTouched] = useState(false);

  const { data: existing, isLoading: loadingEdit, error: errEdit } =
    useProveedorParaEditar(mode === "edit" ? proveedorId : undefined);

  const createMut = useCreateProveedor((id) => {
    onSuccess?.(id);
    onClose();
  });
  const updateMut = useUpdateProveedor(() => {
    if (proveedorId) onSuccess?.(proveedorId);
    onClose();
  });

  useEffect(() => {
    if (mode === "edit" && existing) setForm(existing);
  }, [mode, existing]);

  const onChange = (patch: Partial<ProveedorForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const validation = useMemo(() => validateProveedor(form), [form]);
  const errors = touched ? validation.errors : {};

  const handleSubmit = () => {
    setTouched(true);
    if (!validation.valid) return;
    if (mode === "create") createMut.mutate(form);
    else if (proveedorId) updateMut.mutate({ id: proveedorId, form });
  };

  const isLoading = mode === "edit" && loadingEdit;
  const isSubmitting = createMut.isPending || updateMut.isPending;
  const tituloNombre = mode === "edit" ? existing?.nombre || "proveedor" : null;

  return (
    <Dialog open onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="max-w-[920px] w-[calc(100%-2rem)] p-0 max-h-[85vh] overflow-hidden flex flex-col gap-0">
        {/* Header */}
        <div className="px-8 pt-7 pb-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500 font-medium">
            COMPRAS · PROVEEDORES
          </div>
          <h2 className="font-serif text-3xl text-ink-900 font-medium mt-1">
            {mode === "create" ? (
              <>Nuevo <em className="italic">proveedor</em>.</>
            ) : (
              <>Editar <em className="italic">{tituloNombre}</em>.</>
            )}
          </h2>
          <p className="font-serif italic text-ink-500 mt-1">
            {mode === "create"
              ? "Registra los datos básicos. Todo es editable después."
              : "Modifica la información del proveedor."}
          </p>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="px-8 py-6 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : errEdit ? (
            <div className="px-8 py-12 text-center">
              <p className="font-serif italic text-ink-500 mb-4">
                No se pudo cargar el proveedor
              </p>
              <Button variant="outline" onClick={onClose}>Cerrar</Button>
            </div>
          ) : (
            <>
              <SeccionDatosBasicos form={form} errors={errors} onChange={onChange} />
              <SeccionFiscal form={form} errors={errors} onChange={onChange} />
              <SeccionContactos form={form} errors={errors} onChange={onChange} />
              <SeccionCondiciones form={form} errors={errors} onChange={onChange} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-ink-100 bg-bg-warm flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="font-serif italic text-xs text-ink-500">
            {mode === "create"
              ? "Después de guardar podrás asociar productos."
              : "Los cambios afectan inmediatamente al directorio."}
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || isLoading}>
              {isSubmitting ? "Guardando…" : "Guardar proveedor"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
