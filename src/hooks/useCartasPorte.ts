import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CartaPorte {
  id: string;
  folio: string;
  ruta_id: string | null;
  vehiculo_id: string | null;
  chofer_id: string | null;
  tipo_cfdi: string;
  estado: string;
  total_dist_recorrida: number | null;
  uuid_sat: string | null;
  errores_validacion: any[];
  created_at: string;
  updated_at: string;
  // Joins
  vehiculos?: { nombre: string; placa: string | null } | null;
  empleados?: { nombre_completo: string } | null;
  rutas?: { folio: string; fecha_ruta: string } | null;
}

export function useCartasPorteList(filtros?: { estado?: string }) {
  return useQuery({
    queryKey: ["cartas-porte", filtros],
    queryFn: async () => {
      let query = (supabase as any)
        .from("cartas_porte")
        .select(`
          *,
          vehiculos:vehiculo_id(nombre, placa),
          empleados:chofer_id(nombre_completo),
          rutas:ruta_id(folio, fecha_ruta)
        `)
        .order("created_at", { ascending: false });

      if (filtros?.estado) {
        query = query.eq("estado", filtros.estado);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CartaPorte[];
    },
  });
}

export function useCartaPorte(id: string | undefined) {
  return useQuery({
    queryKey: ["carta-porte", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("cartas_porte")
        .select(`
          *,
          vehiculos:vehiculo_id(nombre, placa, anio, numero_serie, peso_vehicular_ton, clase_federal, permiso_ruta, poliza_seguro_url, poliza_seguro_vencimiento),
          empleados:chofer_id(nombre_completo, rfc, licencia_numero, licencia_tipo),
          rutas:ruta_id(folio, fecha_ruta, fecha_hora_inicio)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as CartaPorte;
    },
    enabled: !!id,
  });
}

export function useCreateCartaPorte() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      ruta_id?: string;
      vehiculo_id?: string;
      chofer_id?: string;
      tipo_cfdi?: string;
      total_dist_recorrida?: number;
    }) => {
      const { data: cp, error } = await (supabase as any)
        .from("cartas_porte")
        .insert({
          ...data,
          tipo_cfdi: data.tipo_cfdi || "T",
          estado: "borrador",
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return cp;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cartas-porte"] });
      toast({
        title: "Carta Porte creada",
        description: `Folio ${data.folio} en modo borrador`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la carta porte",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCartaPorte() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { data: cp, error } = await (supabase as any)
        .from("cartas_porte")
        .update({
          ...data,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return cp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cartas-porte"] });
      queryClient.invalidateQueries({ queryKey: ["carta-porte"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSatCatalogos(catalogo: string) {
  return useQuery({
    queryKey: ["sat-catalogos", catalogo],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sat_catalogos")
        .select("clave, descripcion")
        .eq("catalogo", catalogo)
        .order("clave");
      if (error) throw error;
      return data as { clave: string; descripcion: string }[];
    },
  });
}

// ─── PAC Timbrado ─────────────────────────────────────────────────────────────

export function useTimbrarCartaPorte() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (cartaPorteId: string) => {
      const { data, error } = await supabase.functions.invoke("carta-porte-timbrar", {
        body: { carta_porte_id: cartaPorteId },
      });
      if (error) throw error;
      if (!data.exitoso) throw new Error(data.error || "Error de timbrado");
      return data as { exitoso: boolean; uuid: string; xmlUrl: string | null; pdfUrl: string | null };
    },
    onSuccess: (data, cartaPorteId) => {
      queryClient.invalidateQueries({ queryKey: ["carta-porte", cartaPorteId] });
      queryClient.invalidateQueries({ queryKey: ["cartas-porte"] });
      toast({
        title: "Timbrado exitoso",
        description: `UUID SAT: ${data.uuid}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error de timbrado",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ─── PAC Configuration ────────────────────────────────────────────────────────

export interface PACProviderInfo {
  id: string;
  nombre: string;
  descripcion: string | null;
  url_sandbox: string | null;
  precio_promedio_timbre: number | null;
}

export interface PACConfigData {
  id: string;
  pac_provider_id: string;
  modo: string;
  rfc_emisor: string;
  razon_social_emisor: string;
  regimen_fiscal_emisor: string;
  username: string | null;
  activo: boolean;
  ultimo_test_exitoso: boolean | null;
  ultimo_test_mensaje: string | null;
  ultimo_test_conexion: string | null;
}

export function usePACProviders() {
  return useQuery({
    queryKey: ["pac-providers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pac_providers")
        .select("id, nombre, descripcion, url_sandbox, precio_promedio_timbre")
        .eq("status", "disponible");
      if (error) throw error;
      return data as PACProviderInfo[];
    },
  });
}

export function usePACConfig() {
  return useQuery({
    queryKey: ["pac-config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pac_configurations")
        .select("*")
        .eq("activo", true)
        .maybeSingle();
      if (error) throw error;
      return data as PACConfigData | null;
    },
  });
}

export function useSavePACConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: {
      pac_provider_id: string;
      modo: string;
      rfc_emisor: string;
      razon_social_emisor: string;
      regimen_fiscal_emisor: string;
      username: string;
      password_encrypted: string;
      api_key?: string;
    }) => {
      // Deactivate existing
      await (supabase as any)
        .from("pac_configurations")
        .update({ activo: false })
        .eq("activo", true);

      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await (supabase as any)
        .from("pac_configurations")
        .insert({
          ...config,
          activo: true,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pac-config"] });
      toast({ title: "PAC configurado", description: "Configuración guardada correctamente." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useProbarConexionPAC() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pac-probar-conexion", {});
      if (error) throw error;
      return data as { exitoso: boolean; mensaje: string };
    },
    onSuccess: (data) => {
      toast({
        title: data.exitoso ? "Conexión exitosa" : "Conexión fallida",
        description: data.mensaje,
        variant: data.exitoso ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function usePACTransacciones(cartaPorteId?: string) {
  return useQuery({
    queryKey: ["pac-transacciones", cartaPorteId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("pac_transacciones_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (cartaPorteId) query = query.eq("carta_porte_id", cartaPorteId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: true,
  });
}

// ─── Cancelar Carta Porte ─────────────────────────────────────────────────────

export function useCancelarCartaPorte() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      cartaPorteId: string;
      motivo: "01" | "02" | "03" | "04";
      uuidSustituto?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("carta-porte-cancelar", {
        body: {
          carta_porte_id: params.cartaPorteId,
          motivo: params.motivo,
          uuid_sustituto: params.uuidSustituto,
        },
      });
      if (error) throw error;
      if (!data.exitoso) throw new Error(data.error || "Error de cancelación");
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ["carta-porte", params.cartaPorteId] });
      queryClient.invalidateQueries({ queryKey: ["cartas-porte"] });
      toast({ title: "Cancelado", description: "Carta Porte cancelada exitosamente ante SAT." });
    },
    onError: (error: any) => {
      toast({ title: "Error de cancelación", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Descargar PDF Borrador ───────────────────────────────────────────────────

export function useDescargarBorradorPDF() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (cartaPorteId: string) => {
      const { data, error } = await supabase.functions.invoke("carta-porte-pdf-borrador", {
        body: { carta_porte_id: cartaPorteId },
      });
      if (error) throw error;
      if (!data.exitoso) throw new Error(data.error || "Error generando PDF");
      return data.html as string;
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Eventos Auditoría (LA CORONA) ────────────────────────────────────────────

export function useCartaPorteEventos(cartaPorteId: string | undefined) {
  return useQuery({
    queryKey: ["carta-porte-eventos", cartaPorteId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cp_eventos")
        .select("*")
        .eq("carta_porte_id", cartaPorteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!cartaPorteId,
  });
}
