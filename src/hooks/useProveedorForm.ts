import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProveedorForm, ContactoForm } from "@/lib/proveedor-form-utils";

export const useProveedorParaEditar = (id?: string) => {
  return useQuery({
    queryKey: ["proveedor-form", id],
    enabled: !!id,
    queryFn: async (): Promise<ProveedorForm | null> => {
      if (!id) return null;
      const { data: prov, error } = await supabase
        .from("proveedores")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!prov) return null;

      const { data: contactos, error: errC } = await supabase
        .from("proveedor_contactos")
        .select("id, nombre, puesto, telefono, email, es_principal")
        .eq("proveedor_id", id)
        .eq("activo", true)
        .order("es_principal", { ascending: false });
      if (errC) throw errC;

      const lista: ContactoForm[] =
        (contactos || []).length > 0
          ? contactos!.map((c) => ({
              id: c.id,
              nombre: c.nombre || "",
              puesto: c.puesto || "",
              telefono: c.telefono || "",
              email: c.email || "",
              es_principal: !!c.es_principal,
            }))
          : [
              {
                nombre: "",
                puesto: "",
                telefono: "",
                email: "",
                es_principal: true,
                _isNew: true,
              },
            ];

      return {
        nombre: prov.nombre || "",
        nombre_comercial: prov.nombre_comercial || "",
        categoria: prov.categoria || "",
        rfc: prov.rfc || "",
        regimen_fiscal: prov.regimen_fiscal || "",
        direccion: prov.direccion || "",
        municipio: prov.municipio || "",
        estado: prov.estado || "",
        termino_pago: prov.termino_pago || "15_dias",
        metodos_pago_aceptados: prov.metodos_pago_aceptados || [],
        notas_operativas: prov.notas_operativas || "",
        contactos: lista,
      };
    },
  });
};


const buildProveedorPayload = (form: ProveedorForm) => ({
  nombre: form.nombre.trim(),
  nombre_comercial: form.nombre_comercial.trim() || null,
  categoria: form.categoria.trim() || null,
  rfc: form.rfc.trim().toUpperCase() || null,
  regimen_fiscal: form.regimen_fiscal || null,
  direccion: form.direccion.trim() || null,
  municipio: form.municipio.trim() || null,
  estado: form.estado.trim() || null,
  termino_pago: form.termino_pago || null,
  metodos_pago_aceptados:
    form.metodos_pago_aceptados.length > 0 ? form.metodos_pago_aceptados : null,
  notas_operativas: form.notas_operativas.trim() || null,
});

const insertContactos = async (proveedorId: string, contactos: ContactoForm[]) => {
  const vivos = contactos.filter((c) => !c._toDelete && c.nombre.trim());
  if (vivos.length === 0) return;
  const rows = vivos.map((c) => ({
    proveedor_id: proveedorId,
    nombre: c.nombre.trim(),
    puesto: c.puesto.trim() || null,
    telefono: c.telefono.trim(),
    email: c.email.trim() || null,
    es_principal: c.es_principal,
    activo: true,
  }));
  const { error } = await supabase.from("proveedor_contactos").insert(rows);
  if (error) throw error;
};

export const useCreateProveedor = (onSuccess?: (id: string) => void) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: ProveedorForm) => {
      const { data, error } = await supabase
        .from("proveedores")
        .insert({ ...buildProveedorPayload(form), activo: true, pais: "México" })
        .select("id")
        .single();
      if (error) throw error;
      await insertContactos(data.id, form.contactos);
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Proveedor creado");
      qc.invalidateQueries({ queryKey: ["proveedores-v3"] });
      onSuccess?.(id);
    },
    onError: (e: any) =>
      toast.error("Error al guardar", {
        description: e?.message || "Intenta de nuevo",
        duration: 6000,
      }),
  });
};

export const useUpdateProveedor = (onSuccess?: () => void) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, form }: { id: string; form: ProveedorForm }) => {
      const { error } = await supabase
        .from("proveedores")
        .update(buildProveedorPayload(form))
        .eq("id", id);
      if (error) throw error;

      // Sync contactos: delete removed, update existing, insert new
      const aEliminar = form.contactos.filter((c) => c._toDelete && c.id);
      const aInsertar = form.contactos.filter((c) => !c._toDelete && !c.id);
      const aActualizar = form.contactos.filter((c) => !c._toDelete && c.id);

      for (const c of aEliminar) {
        await supabase
          .from("proveedor_contactos")
          .update({ activo: false })
          .eq("id", c.id!);
      }
      for (const c of aActualizar) {
        await supabase
          .from("proveedor_contactos")
          .update({
            nombre: c.nombre.trim(),
            puesto: c.puesto.trim() || null,
            telefono: c.telefono.trim(),
            email: c.email.trim() || null,
            es_principal: c.es_principal,
          })
          .eq("id", c.id!);
      }
      if (aInsertar.length > 0) {
        await insertContactos(id, aInsertar);
      }
      return id;
    },
    onSuccess: (id) => {
      toast.success("Proveedor actualizado");
      qc.invalidateQueries({ queryKey: ["proveedores-v3"] });
      qc.invalidateQueries({ queryKey: ["proveedor-form", id] });
      qc.invalidateQueries({ queryKey: ["proveedor-detalle", id] });
      onSuccess?.();
    },
    onError: (e: any) =>
      toast.error("Error al actualizar", {
        description: e?.message || "Intenta de nuevo",
        duration: 6000,
      }),
  });
};
