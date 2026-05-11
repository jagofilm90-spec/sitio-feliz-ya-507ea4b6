import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Lista pedidos pendientes surtido ────────────────────────────────────────

export function usePedidosSurtido(filtros?: { estado?: string }) {
  return useQuery({
    queryKey: ["pedidos-surtido", filtros],
    queryFn: async () => {
      let query = (supabase as any)
        .from("pedidos")
        .select(`
          id, folio, status, estado_surtido, fecha_pedido, total,
          clientes:cliente_id(id, nombre, razon_social, direccion),
          entregas:id(id, ruta_id, orden_entrega,
            rutas:ruta_id(id, folio, fecha_ruta, vehiculo_id,
              vehiculos:vehiculo_id(nombre, placa)
            )
          )
        `)
        .in("status", ["aprobado", "en_proceso", "programado"])
        .order("fecha_pedido", { ascending: true })
        .limit(50);

      if (filtros?.estado && filtros.estado !== "todos") {
        query = query.eq("estado_surtido", filtros.estado);
      } else {
        query = query.in("estado_surtido", ["pendiente", "en_surtido"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30000,
  });
}

// ─── Pedidos ya surtidos ─────────────────────────────────────────────────────

export function usePedidosSurtidos() {
  return useQuery({
    queryKey: ["pedidos-surtidos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pedidos")
        .select(`
          id, folio, estado_surtido, surtido_fin_at,
          clientes:cliente_id(nombre, razon_social)
        `)
        .eq("estado_surtido", "surtido")
        .order("surtido_fin_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Pedido con líneas para surtido ──────────────────────────────────────────

export function usePedidoSurtido(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ["pedido-surtido", pedidoId],
    queryFn: async () => {
      if (!pedidoId) return null;
      const { data, error } = await (supabase as any)
        .from("pedidos")
        .select(`
          *,
          clientes:cliente_id(id, nombre, razon_social, direccion, telefono),
          pedidos_detalles(
            id, cantidad, precio_unitario, estado_surtido, cantidad_surtida_real, notas_surtido,
            productos:producto_id(id, codigo, nombre, unidad, peso_kg)
          )
        `)
        .eq("id", pedidoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!pedidoId,
  });
}

// ─── Entrega del pedido (para generar hoja salida) ───────────────────────────

export function useEntregaDePedido(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ["entrega-pedido", pedidoId],
    queryFn: async () => {
      if (!pedidoId) return null;
      const { data, error } = await (supabase as any)
        .from("entregas")
        .select("id, ruta_id, orden_entrega")
        .eq("pedido_id", pedidoId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; ruta_id: string; orden_entrega: number } | null;
    },
    enabled: !!pedidoId,
  });
}

// ─── Marcar línea surtida ────────────────────────────────────────────────────

export function useMarcarLineaSurtida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      pedido_detalle_id: string;
      estado: "completo" | "parcial" | "sin_stock" | "sustituido";
      cantidad_real?: number;
      notas?: string;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const updates: any = {
        estado_surtido: params.estado,
        surtido_at: new Date().toISOString(),
        surtido_por: user?.id,
      };
      if (params.cantidad_real !== undefined) updates.cantidad_surtida_real = params.cantidad_real;
      if (params.notas) updates.notas_surtido = params.notas;

      const { error } = await (supabase as any)
        .from("pedidos_detalles")
        .update(updates)
        .eq("id", params.pedido_detalle_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedido-surtido"] });
    },
  });
}

// ─── Iniciar surtido ─────────────────────────────────────────────────────────

export function useIniciarSurtido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedidoId: string) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await (supabase as any)
        .from("pedidos")
        .update({
          estado_surtido: "en_surtido",
          surtido_inicio_at: new Date().toISOString(),
          surtido_por: user?.id,
        })
        .eq("id", pedidoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos-surtido"] });
    },
  });
}

// ─── Terminar surtido + generar hoja salida ──────────────────────────────────

export function useTerminarSurtido() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      pedido_id: string;
      entrega_id: string;
      cuadrilla: { empleado_id: string; rol: "chofer" | "ayudante"; orden_ayudante?: number }[];
    }) => {
      // 1. Mark pedido as surtido
      await (supabase as any)
        .from("pedidos")
        .update({ estado_surtido: "surtido", surtido_fin_at: new Date().toISOString() })
        .eq("id", params.pedido_id);

      // 2. Generate hoja salida
      const { data, error } = await supabase.functions.invoke("generar-hoja-salida", {
        body: { entrega_id: params.entrega_id, cuadrilla: params.cuadrilla },
      });
      if (error) throw error;
      if (!data.exitoso) throw new Error(data.error || "Error generando hoja");
      return data as { hoja_salida_id: string; folio: string; pdf_url: string; html: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pedidos-surtido"] });
      qc.invalidateQueries({ queryKey: ["pedidos-surtidos"] });
      qc.invalidateQueries({ queryKey: ["hojas-salida"] });
      toast({ title: "Hoja de Salida generada", description: `Folio: ${data.folio}` });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

// ─── Empleados por puesto ────────────────────────────────────────────────────

export function useEmpleadosPorPuesto(puesto?: string) {
  return useQuery({
    queryKey: ["empleados-puesto", puesto],
    queryFn: async () => {
      let query = (supabase as any)
        .from("empleados")
        .select("id, nombre_completo, puesto")
        .eq("activo", true)
        .order("nombre_completo");
      if (puesto) query = query.ilike("puesto", `%${puesto}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; nombre_completo: string; puesto: string }[];
    },
  });
}
