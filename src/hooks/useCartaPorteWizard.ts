import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface RutaConEntregas {
  id: string;
  folio: string;
  fecha_ruta: string;
  vehiculo_id: string | null;
  chofer_id: string | null;
  peso_total_kg: number | null;
  vehiculos: { id: string; nombre: string; placa: string; anio: number | null; peso_vehicular_ton: number | null; numero_serie: string | null } | null;
  empleados: { id: string; nombre_completo: string; rfc: string | null; licencia_numero: string | null; licencia_tipo: string | null } | null;
  entregas: EntregaConPedido[];
}

export interface EntregaConPedido {
  id: string;
  pedido_id: string;
  orden_entrega: number;
  pedidos: {
    id: string;
    folio: string;
    cliente_id: string;
    clientes: { id: string; nombre: string; rfc: string | null; direccion: string | null; razon_social: string | null };
    pedidos_detalles: PedidoDetalle[];
  };
}

export interface PedidoDetalle {
  id: string;
  producto_id: string;
  cantidad: number;
  productos: {
    id: string;
    nombre: string;
    codigo: string;
    unidad: string;
    unidad_sat: string | null;
    peso_kg: number | null;
  };
}

export interface PermisoSICT {
  id: string;
  vehiculo_id: string;
  tipo_permiso: string;
  numero_permiso: string;
  fecha_vencimiento: string | null;
  estado: string;
}

export interface CpUbicacion {
  id?: string;
  carta_porte_id?: string;
  tipo: "Origen" | "Destino";
  orden_secuencia: number;
  rfc: string;
  nombre_remitente_destinatario: string;
  calle: string;
  numero_exterior: string;
  numero_interior: string;
  colonia: string;
  localidad: string;
  municipio: string;
  estado: string;
  pais: string;
  codigo_postal: string;
  fecha_hora_estimada: string;
  distancia_recorrida: number | null;
}

export interface CpMercancia {
  id?: string;
  carta_porte_id?: string;
  pedido_detalle_id: string | null;
  bienes_transp: string;
  descripcion: string;
  cantidad: number;
  clave_unidad: string;
  unidad: string;
  peso_en_kg: number;
  material_peligroso: boolean;
  cve_material_peligroso: string;
  embalaje: string;
  descrip_embalaje: string;
}

export interface CpAutotransporte {
  id?: string;
  carta_porte_id?: string;
  perm_sct: string;
  num_permiso_sct: string;
  config_vehicular: string;
  placa_vm: string;
  anio_modelo_vm: number;
  asegura_resp_civil: string;
  poliza_resp_civil: string;
  asegura_med_ambiente: string;
  poliza_med_ambiente: string;
  asegura_carga: string;
  poliza_carga: string;
  prima_seguro: number | null;
  peso_bruto_vehicular: number | null;
}

export interface CpFigura {
  id?: string;
  carta_porte_id?: string;
  tipo_figura: string;
  rfc_figura: string;
  num_licencia: string;
  nombre_figura: string;
  residencia_fiscal: string;
}

// ─── Hook: Fetch Ruta con Entregas completas ────────────────────────────────────

export function useRutaConEntregas(rutaId: string | null | undefined) {
  return useQuery({
    queryKey: ["ruta-carta-porte", rutaId],
    queryFn: async () => {
      if (!rutaId) return null;
      const { data, error } = await (supabase as any)
        .from("rutas")
        .select(`
          id, folio, fecha_ruta, vehiculo_id, chofer_id, peso_total_kg,
          vehiculos:vehiculo_id(id, nombre, placa, anio, peso_vehicular_ton, numero_serie),
          empleados:chofer_id(id, nombre_completo, rfc, licencia_numero, licencia_tipo),
          entregas(
            id, pedido_id, orden_entrega,
            pedidos:pedido_id(
              id, folio, cliente_id,
              clientes:cliente_id(id, nombre, rfc, direccion, razon_social),
              pedidos_detalles(
                id, producto_id, cantidad,
                productos:producto_id(id, nombre, codigo, unidad, unidad_sat, peso_kg)
              )
            )
          )
        `)
        .eq("id", rutaId)
        .single();
      if (error) throw error;
      return data as RutaConEntregas;
    },
    enabled: !!rutaId,
  });
}

// ─── Hook: Fetch Permiso SICT del vehículo ──────────────────────────────────────

export function usePermisoSICT(vehiculoId: string | null | undefined) {
  return useQuery({
    queryKey: ["permiso-sict", vehiculoId],
    queryFn: async () => {
      if (!vehiculoId) return null;
      const { data, error } = await (supabase as any)
        .from("permisos_sict")
        .select("*")
        .eq("vehiculo_id", vehiculoId)
        .eq("estado", "vigente")
        .order("fecha_vencimiento", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PermisoSICT | null;
    },
    enabled: !!vehiculoId,
  });
}

// ─── Hook: Fetch sub-documentos existentes de una Carta Porte ────────────────────

export function useCartaPorteSubDocs(cartaPorteId: string | undefined) {
  return useQuery({
    queryKey: ["carta-porte-subdocs", cartaPorteId],
    queryFn: async () => {
      if (!cartaPorteId) return null;

      const [ubicaciones, mercancias, autotransporte, figuras] = await Promise.all([
        (supabase as any).from("cp_ubicaciones").select("*").eq("carta_porte_id", cartaPorteId).order("orden_secuencia"),
        (supabase as any).from("cp_mercancias").select("*").eq("carta_porte_id", cartaPorteId),
        (supabase as any).from("cp_autotransporte").select("*").eq("carta_porte_id", cartaPorteId).maybeSingle(),
        (supabase as any).from("cp_figura_transporte").select("*").eq("carta_porte_id", cartaPorteId),
      ]);

      return {
        ubicaciones: (ubicaciones.data || []) as CpUbicacion[],
        mercancias: (mercancias.data || []) as CpMercancia[],
        autotransporte: autotransporte.data as CpAutotransporte | null,
        figuras: (figuras.data || []) as CpFigura[],
      };
    },
    enabled: !!cartaPorteId,
  });
}

// ─── Hook: Upsert Autotransporte ─────────────────────────────────────────────────

export function useUpsertAutotransporte() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CpAutotransporte & { carta_porte_id: string }) => {
      const { id, ...payload } = data;
      if (id) {
        const { data: result, error } = await (supabase as any)
          .from("cp_autotransporte")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await (supabase as any)
          .from("cp_autotransporte")
          .upsert(payload, { onConflict: "carta_porte_id" })
          .select()
          .single();
        if (error) throw error;
        return result;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["carta-porte-subdocs", vars.carta_porte_id] });
    },
    onError: (error: any) => {
      toast({ title: "Error autotransporte", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Hook: Upsert Figura Transporte ──────────────────────────────────────────────

export function useUpsertFigura() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CpFigura & { carta_porte_id: string }) => {
      const { id, ...payload } = data;
      if (id) {
        const { data: result, error } = await (supabase as any)
          .from("cp_figura_transporte")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await (supabase as any)
          .from("cp_figura_transporte")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return result;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["carta-porte-subdocs", vars.carta_porte_id] });
    },
    onError: (error: any) => {
      toast({ title: "Error figura transporte", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Hook: Bulk Create/Replace Ubicaciones ───────────────────────────────────────

export function useSaveUbicaciones() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ cartaPorteId, ubicaciones }: { cartaPorteId: string; ubicaciones: Omit<CpUbicacion, "id" | "carta_porte_id">[] }) => {
      // Delete existing and re-insert (simple approach for wizard)
      await (supabase as any).from("cp_ubicaciones").delete().eq("carta_porte_id", cartaPorteId);

      if (ubicaciones.length === 0) return [];

      const rows = ubicaciones.map((u) => ({ ...u, carta_porte_id: cartaPorteId }));
      const { data, error } = await (supabase as any)
        .from("cp_ubicaciones")
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["carta-porte-subdocs", vars.cartaPorteId] });
    },
    onError: (error: any) => {
      toast({ title: "Error ubicaciones", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Hook: Bulk Create/Replace Mercancías ────────────────────────────────────────

export function useSaveMercancias() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ cartaPorteId, mercancias }: { cartaPorteId: string; mercancias: Omit<CpMercancia, "id" | "carta_porte_id">[] }) => {
      await (supabase as any).from("cp_mercancias").delete().eq("carta_porte_id", cartaPorteId);

      if (mercancias.length === 0) return [];

      const rows = mercancias.map((m) => ({ ...m, carta_porte_id: cartaPorteId }));
      const { data, error } = await (supabase as any)
        .from("cp_mercancias")
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["carta-porte-subdocs", vars.cartaPorteId] });
    },
    onError: (error: any) => {
      toast({ title: "Error mercancías", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Hook: Validar Carta Porte (edge function) ──────────────────────────────────

export function useValidateCartaPorte() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (cartaPorteId: string) => {
      const { data, error } = await supabase.functions.invoke("carta-porte-validar", {
        body: { carta_porte_id: cartaPorteId },
      });
      if (error) throw error;
      return data as { valida: boolean; errores: string[]; warnings: string[] };
    },
    onSuccess: (result, cartaPorteId) => {
      queryClient.invalidateQueries({ queryKey: ["carta-porte", cartaPorteId] });
      queryClient.invalidateQueries({ queryKey: ["cartas-porte"] });
      if (result.valida) {
        toast({ title: "Carta Porte válida", description: "Todos los campos obligatorios SAT están completos." });
      } else {
        toast({
          title: "Validación con errores",
          description: `${result.errores.length} error(es) encontrados. Revisa los detalles.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error de validación", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Hook: Registrar evento CP (auditoría LA CORONA) ─────────────────────────────

export function useRegistrarEventoCP() {
  return useMutation({
    mutationFn: async ({ cartaPorteId, tipoEvento, detalle }: { cartaPorteId: string; tipoEvento: string; detalle?: any }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await (supabase as any)
        .from("cp_eventos")
        .insert({
          carta_porte_id: cartaPorteId,
          tipo_evento: tipoEvento,
          usuario_id: user?.id,
          usuario_nombre: user?.email,
          detalle: detalle || {},
        });
      if (error) throw error;
    },
  });
}

// ─── Hook: Lista de rutas disponibles (para selector) ────────────────────────────

export function useRutasDisponibles() {
  return useQuery({
    queryKey: ["rutas-para-cp"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rutas")
        .select("id, folio, fecha_ruta, status, vehiculo_id, chofer_id")
        .in("status", ["programada", "en_curso", "completada"])
        .order("fecha_ruta", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as { id: string; folio: string; fecha_ruta: string; status: string; vehiculo_id: string | null; chofer_id: string | null }[];
    },
  });
}
