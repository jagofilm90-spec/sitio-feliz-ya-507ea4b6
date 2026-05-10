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
