import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { playNotificationSound } from "@/utils/notificationSound";

export interface SolicitudVenta {
  id: string;
  folio: string;
  status: string;
  productos_solicitados: Array<{
    producto_id: string;
    nombre: string;
    cantidad: number;
    precio_unitario?: number;
  }>;
  factura_id: string | null;
  total: number | null;
  forma_pago: string | null;
  referencia_pago: string | null;
  solicitante_id: string | null;
  procesado_por: string | null;
  fecha_solicitud: string;
  fecha_procesado: string | null;
  fecha_pagado: string | null;
  fecha_entregado: string | null;
  notas: string | null;
  created_at: string;
  // Joined data
  solicitante?: { nombre_completo: string } | null;
  procesador?: { nombre_completo: string } | null;
  factura?: { folio: string; cfdi_uuid: string } | null;
}

interface UseSolicitudesVentaOptions {
  filterStatus?: string[];
  onNewSolicitud?: () => void;
  onStatusChange?: (solicitud: SolicitudVenta) => void;
}

export const useSolicitudesVenta = (options: UseSolicitudesVentaOptions = {}) => {
  const [solicitudes, setSolicitudes] = useState<SolicitudVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  const loadSolicitudes = useCallback(async () => {
    try {
      let query = supabase
        .from("solicitudes_venta_mostrador")
        .select(`
          *,
          solicitante:empleados!solicitudes_venta_mostrador_solicitante_id_fkey(nombre_completo),
          procesador:empleados!solicitudes_venta_mostrador_procesado_por_fkey(nombre_completo),
          factura:facturas(folio, cfdi_uuid)
        `)
        .order("fecha_solicitud", { ascending: false });

      if (options.filterStatus && options.filterStatus.length > 0) {
        query = query.in("status", options.filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Parse JSONB products
      const parsed = (data || []).map((s: any) => ({
        ...s,
        productos_solicitados: typeof s.productos_solicitados === 'string' 
          ? JSON.parse(s.productos_solicitados) 
          : s.productos_solicitados || []
      }));

      setSolicitudes(parsed);
      setPendingCount(parsed.filter((s: SolicitudVenta) => s.status === 'pendiente').length);
    } catch (error: any) {
      console.error("Error loading solicitudes:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [options.filterStatus, toast]);

  // Setup realtime subscription
  useEffect(() => {
    loadSolicitudes();

    const channel = supabase
      .channel('solicitudes-venta-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_venta_mostrador'
        },
        (payload) => {
          console.log('Solicitud change:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New solicitud created
            playNotificationSound();
            options.onNewSolicitud?.();
            toast({
              title: "Nueva solicitud de venta",
              description: `Se ha recibido una nueva solicitud`,
            });
          } else if (payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            options.onStatusChange?.(newData);
            
            // Notify status changes
            if (newData.status === 'lista') {
              playNotificationSound();
              toast({
                title: "Solicitud procesada",
                description: `Total: $${Number(newData.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
              });
            } else if (newData.status === 'pagada') {
              toast({
                title: "Pago confirmado",
                description: `Solicitud ${newData.folio} marcada como pagada`,
              });
            }
          }
          
          // Reload all solicitudes
          loadSolicitudes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSolicitudes, options, toast]);

  // Create new solicitud
  const crearSolicitud = async (productos: Array<{ producto_id: string; nombre: string; cantidad: number }>, solicitanteId: string | null, notas?: string) => {
    try {
      // Generate folio
      const { data: folioData, error: folioError } = await supabase.rpc('generar_folio_venta_mostrador');
      if (folioError) throw folioError;

      const { data, error } = await supabase
        .from("solicitudes_venta_mostrador")
        .insert({
          folio: folioData,
          productos_solicitados: productos,
          solicitante_id: solicitanteId,
          notas,
          status: 'pendiente'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Solicitud enviada",
        description: `Folio: ${folioData}. Esperando que oficina procese.`,
      });

      return data;
    } catch (error: any) {
      console.error("Error creating solicitud:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la solicitud",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update status
  const actualizarStatus = async (
    solicitudId: string, 
    status: string, 
    extraData?: Partial<SolicitudVenta>
  ) => {
    try {
      const updateData: any = { status, ...extraData };
      
      // Set timestamps based on status
      if (status === 'procesando') {
        updateData.fecha_procesado = new Date().toISOString();
      } else if (status === 'pagada') {
        updateData.fecha_pagado = new Date().toISOString();
      } else if (status === 'entregada') {
        updateData.fecha_entregado = new Date().toISOString();
      }

      const { error } = await supabase
        .from("solicitudes_venta_mostrador")
        .update(updateData)
        .eq("id", solicitudId);

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error("Error updating solicitud:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la solicitud",
        variant: "destructive",
      });
      return false;
    }
  };

  // Mark as paid
  const confirmarPago = async (
    solicitudId: string, 
    formaPago: 'efectivo' | 'transferencia', 
    referencia?: string
  ) => {
    return actualizarStatus(solicitudId, 'pagada', {
      forma_pago: formaPago,
      referencia_pago: referencia || null
    });
  };

  // Mark as delivered
  const marcarEntregada = async (solicitudId: string) => {
    return actualizarStatus(solicitudId, 'entregada');
  };

  // Link factura to solicitud
  const vincularFactura = async (
    solicitudId: string, 
    facturaId: string, 
    total: number,
    procesadoPor: string | null
  ) => {
    return actualizarStatus(solicitudId, 'lista', {
      factura_id: facturaId,
      total,
      procesado_por: procesadoPor
    });
  };

  return {
    solicitudes,
    loading,
    pendingCount,
    refresh: loadSolicitudes,
    crearSolicitud,
    actualizarStatus,
    confirmarPago,
    marcarEntregada,
    vincularFactura
  };
};
