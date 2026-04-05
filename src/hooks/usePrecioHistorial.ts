import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface HistorialPrecio {
  id: string;
  precio_anterior: number;
  precio_nuevo: number;
  created_at: string;
  usuario_id: string | null;
  usuario_nombre?: string | null;
  lote_id?: string | null;
}

export function usePrecioHistorial() {
  const [historialDialogOpen, setHistorialDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductInfo, setSelectedProductInfo] = useState<{ codigo: string; nombre: string } | null>(null);

  const { data: historialPrecios, isLoading: isLoadingHistorial } = useQuery({
    queryKey: ["historial-precios", selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];

      const { data: historial, error } = await supabase
        .from("productos_historial_precios")
        .select("id, precio_anterior, precio_nuevo, created_at, usuario_id")
        .eq("producto_id", selectedProductId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!historial || historial.length === 0) return [];

      // Fetch user names
      const userIds = [...new Set(historial.map(h => h.usuario_id).filter(Boolean))] as string[];
      let userMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profiles) {
          userMap = profiles.reduce((acc, p) => {
            acc[p.id] = p.full_name || "Usuario";
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return historial.map(h => ({
        ...h,
        usuario_nombre: h.usuario_id ? userMap[h.usuario_id] || "Usuario" : null,
      })) as HistorialPrecio[];
    },
    enabled: !!selectedProductId,
  });

  const openHistorial = (producto: { id: string; codigo: string; nombre: string }) => {
    setSelectedProductId(producto.id);
    setSelectedProductInfo({ codigo: producto.codigo, nombre: producto.nombre });
    setHistorialDialogOpen(true);
  };

  const closeHistorial = () => {
    setHistorialDialogOpen(false);
  };

  return {
    historialDialogOpen,
    setHistorialDialogOpen,
    historialPrecios: historialPrecios ?? [],
    isLoadingHistorial,
    selectedProductInfo,
    openHistorial,
    closeHistorial,
  };
}
