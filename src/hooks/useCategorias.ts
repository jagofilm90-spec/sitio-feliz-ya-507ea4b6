import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CategoriaProducto {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export function useCategorias() {
  return useQuery({
    queryKey: ["categorias-productos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_productos")
        .select("id, nombre, orden, activo")
        .eq("activo", true)
        .order("orden");
      if (error) throw error;
      return (data || []) as CategoriaProducto[];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
