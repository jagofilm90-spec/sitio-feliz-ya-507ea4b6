import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playNotificationSound } from "@/utils/notificationSound";

// Cart item snapshot for discount request context
export interface CarritoItem {
  productoId: string;
  productoNombre: string;
  productoCodigo: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  tieneDescuentoPendiente: boolean;
}

export interface SolicitudDescuento {
  id: string;
  pedido_id: string | null;
  producto_id: string;
  vendedor_id: string;
  cliente_id: string;
  sucursal_id: string | null;
  precio_lista: number;
  precio_solicitado: number;
  descuento_solicitado: number;
  descuento_maximo: number;
  cantidad_solicitada: number;
  motivo: string | null;
  status: "pendiente" | "aprobado" | "rechazado" | "expirado";
  precio_aprobado: number | null;
  respondido_por: string | null;
  respondido_at: string | null;
  respuesta_notas: string | null;
  created_at: string;
  updated_at: string;
  // New fields for order context
  carrito_snapshot: CarritoItem[] | null;
  total_pedido_estimado: number | null;
  es_urgente: boolean;
  // Joined data
  producto?: {
    id: string;
    codigo: string;
    nombre: string;
  };
  vendedor?: {
    id: string;
    full_name: string;
  };
  cliente?: {
    id: string;
    codigo: string;
    nombre: string;
    saldo_pendiente?: number | null;
  };
  sucursal?: {
    id: string;
    nombre: string;
  };
}

interface UseSolicitudesDescuentoOptions {
  onlyPending?: boolean;
  vendedorId?: string;
  enableRealtime?: boolean;
}

export function useSolicitudesDescuento(options: UseSolicitudesDescuentoOptions = {}) {
  const { onlyPending = false, vendedorId, enableRealtime = true } = options;
  const [solicitudes, setSolicitudes] = useState<SolicitudDescuento[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchSolicitudes = useCallback(async () => {
    try {
      let query = supabase
        .from("solicitudes_descuento")
        .select(`
          *,
          producto:productos(id, codigo, nombre),
          vendedor:profiles!vendedor_id(id, full_name),
          cliente:clientes(id, codigo, nombre, saldo_pendiente),
          sucursal:cliente_sucursales(id, nombre)
        `)
        .order("created_at", { ascending: false });

      if (onlyPending) {
        query = query.eq("status", "pendiente");
      }

      if (vendedorId) {
        query = query.eq("vendedor_id", vendedorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setSolicitudes(data as unknown as SolicitudDescuento[]);
      setPendingCount(data?.filter(s => s.status === "pendiente").length || 0);
    } catch (error) {
      console.error("Error fetching solicitudes:", error);
    } finally {
      setLoading(false);
    }
  }, [onlyPending, vendedorId]);

  // Initial fetch
  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  // Realtime subscription
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel("solicitudes_descuento_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "solicitudes_descuento",
        },
        async (payload) => {
          console.log("Solicitud descuento change:", payload);
          
          if (payload.eventType === "INSERT") {
            // Fetch the new record with joined data
            const { data } = await supabase
              .from("solicitudes_descuento")
              .select(`
                *,
                producto:productos(id, codigo, nombre),
                vendedor:profiles!vendedor_id(id, full_name),
                cliente:clientes(id, codigo, nombre),
                sucursal:cliente_sucursales(id, nombre)
              `)
              .eq("id", payload.new.id)
              .single();

            if (data) {
              setSolicitudes(prev => [data as unknown as SolicitudDescuento, ...prev]);
              setPendingCount(prev => prev + 1);
              
              // Show notification for admin with URGENT sound
              const { data: { user } } = await supabase.auth.getUser();
              if (user && payload.new.vendedor_id !== user.id) {
                // Play urgent notification sound
                playNotificationSound('urgent');
                
                toast.info("🔔 Nueva solicitud de descuento", {
                  description: "Un vendedor solicita autorización de descuento",
                  duration: 10000, // Keep visible longer
                  action: {
                    label: "Ver",
                    onClick: () => {
                      // Navigate to panel - handled by component
                    },
                  },
                });
              }
            }
          } else if (payload.eventType === "UPDATE") {
            setSolicitudes(prev =>
              prev.map(s =>
                s.id === payload.new.id
                  ? { ...s, ...payload.new }
                  : s
              )
            );
            
            // Update pending count
            if (payload.old.status === "pendiente" && payload.new.status !== "pendiente") {
              setPendingCount(prev => Math.max(0, prev - 1));
            }
            
            // Notify vendedor about response with appropriate sound
            const { data: { user } } = await supabase.auth.getUser();
            if (user && payload.new.vendedor_id === user.id && payload.old.status === "pendiente") {
              if (payload.new.status === "aprobado") {
                playNotificationSound('success');
                toast.success("¡Descuento aprobado!", {
                  description: `Precio autorizado: $${payload.new.precio_aprobado}`,
                  duration: 8000,
                });
              } else if (payload.new.status === "rechazado") {
                playNotificationSound('error');
                toast.error("Descuento rechazado", {
                  description: payload.new.respuesta_notas || "El administrador rechazó la solicitud",
                  duration: 8000,
                });
              }
            }
          } else if (payload.eventType === "DELETE") {
            setSolicitudes(prev => prev.filter(s => s.id !== payload.old.id));
            if (payload.old.status === "pendiente") {
              setPendingCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime]);

  const crearSolicitud = async (solicitud: {
    producto_id: string;
    cliente_id: string;
    sucursal_id?: string | null;
    precio_lista: number;
    precio_solicitado: number;
    descuento_solicitado: number;
    descuento_maximo: number;
    cantidad_solicitada?: number;
    motivo?: string;
    vendedor_nombre?: string;
    producto_nombre?: string;
    // New fields for order context
    carrito_snapshot?: CarritoItem[];
    total_pedido_estimado?: number;
    es_urgente?: boolean;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { vendedor_nombre, producto_nombre, carrito_snapshot, total_pedido_estimado, es_urgente, ...solicitudData } = solicitud;

    const { data, error } = await supabase
      .from("solicitudes_descuento")
      .insert({
        ...solicitudData,
        vendedor_id: user.id,
        carrito_snapshot: carrito_snapshot ? JSON.stringify(carrito_snapshot) : null,
        total_pedido_estimado: total_pedido_estimado || null,
        es_urgente: es_urgente ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    // Send push notification to Admin
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          roles: ['Admin'],
          title: '🔔 Autoriza precio',
          body: `${vendedor_nombre || 'Vendedor'} solicita descuento para ${producto_nombre || 'producto'}`,
          data: {
            type: 'solicitud_descuento',
            solicitud_id: data.id,
          }
        }
      });
    } catch (pushError) {
      console.error("Error sending push notification:", pushError);
      // Don't fail the main operation if push fails
    }

    return data;
  };

  const responderSolicitud = async (
    solicitudId: string,
    aprobado: boolean,
    precioAprobado?: number,
    notas?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { error } = await supabase
      .from("solicitudes_descuento")
      .update({
        status: aprobado ? "aprobado" : "rechazado",
        precio_aprobado: aprobado ? precioAprobado : null,
        respondido_por: user.id,
        respondido_at: new Date().toISOString(),
        respuesta_notas: notas || null,
      })
      .eq("id", solicitudId);

    if (error) throw error;
  };

  return {
    solicitudes,
    loading,
    pendingCount,
    refetch: fetchSolicitudes,
    crearSolicitud,
    responderSolicitud,
  };
}

// Hook for vendedor to track a specific solicitud
export function useSolicitudStatus(solicitudId: string | null) {
  const [status, setStatus] = useState<SolicitudDescuento["status"] | null>(null);
  const [precioAprobado, setPrecioAprobado] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!solicitudId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("solicitudes_descuento")
        .select("status, precio_aprobado")
        .eq("id", solicitudId)
        .single();

      if (data) {
        setStatus(data.status as SolicitudDescuento["status"]);
        setPrecioAprobado(data.precio_aprobado);
      }
      setLoading(false);
    };

    fetchStatus();

    // Subscribe to changes
    const channel = supabase
      .channel(`solicitud_${solicitudId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "solicitudes_descuento",
          filter: `id=eq.${solicitudId}`,
        },
        (payload) => {
          setStatus(payload.new.status as SolicitudDescuento["status"]);
          setPrecioAprobado(payload.new.precio_aprobado);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [solicitudId]);

  return { status, precioAprobado, loading };
}
