import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EstadoOperaciones {
  autorizaciones: {
    descuentos: number;
    cotizaciones: number;
    ordenesCompra: number;
    total: number;
  };
  recepciones: {
    programadas: number;
    enDescarga: number;
    completadas: number;
    total: number;
  };
  rutas: {
    activas: number;
    programadas: number;
    completadas: number;
    entregasCompletadas: number;
    entregasTotales: number;
    progresoPromedio: number;
  };
  alertas: {
    licenciasVencer: number;
    stockBajo: number;
    caducidadProxima: number;
    vehiculosCheckup: number;
    total: number;
  };
  lastUpdate: Date;
  loading: boolean;
}

const initialState: EstadoOperaciones = {
  autorizaciones: { descuentos: 0, cotizaciones: 0, ordenesCompra: 0, total: 0 },
  recepciones: { programadas: 0, enDescarga: 0, completadas: 0, total: 0 },
  rutas: { activas: 0, programadas: 0, completadas: 0, entregasCompletadas: 0, entregasTotales: 0, progresoPromedio: 0 },
  alertas: { licenciasVencer: 0, stockBajo: 0, caducidadProxima: 0, vehiculosCheckup: 0, total: 0 },
  lastUpdate: new Date(),
  loading: true,
};

export const useEstadoOperaciones = () => {
  const [estado, setEstado] = useState<EstadoOperaciones>(initialState);

  const cargarAutorizaciones = useCallback(async () => {
    try {
      // Descuentos pendientes
      const { count: descuentos } = await supabase
        .from("solicitudes_descuento")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendiente");

      // Cotizaciones por autorizar
      const { count: cotizaciones } = await supabase
        .from("cotizaciones")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendiente_autorizacion");

      // OC por autorizar
      const { count: ordenesCompra } = await supabase
        .from("ordenes_compra")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendiente_autorizacion");

      return {
        descuentos: descuentos || 0,
        cotizaciones: cotizaciones || 0,
        ordenesCompra: ordenesCompra || 0,
        total: (descuentos || 0) + (cotizaciones || 0) + (ordenesCompra || 0),
      };
    } catch (error) {
      console.error("Error cargando autorizaciones:", error);
      return initialState.autorizaciones;
    }
  }, []);

  const cargarRecepciones = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data } = await supabase
        .from("ordenes_compra_entregas")
        .select("status")
        .eq("fecha_programada", today);

      if (!data) return initialState.recepciones;

      const programadas = data.filter((e) => e.status === "programada").length;
      const enDescarga = data.filter((e) => 
        ["llegada_registrada", "en_descarga", "trabajando"].includes(e.status)
      ).length;
      const completadas = data.filter((e) => e.status === "completada").length;

      return {
        programadas,
        enDescarga,
        completadas,
        total: data.length,
      };
    } catch (error) {
      console.error("Error cargando recepciones:", error);
      return initialState.recepciones;
    }
  }, []);

  const cargarRutas = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Rutas del día
      const { data: rutasData } = await supabase
        .from("rutas")
        .select("id, status")
        .eq("fecha_ruta", today)
        .neq("status", "cancelada");

      if (!rutasData) return initialState.rutas;

      const activas = rutasData.filter((r) => r.status === "en_curso").length;
      const programadas = rutasData.filter((r) => r.status === "programada").length;
      const completadas = rutasData.filter((r) => r.status === "completada").length;

      // Entregas de rutas activas
      const rutasActivasIds = rutasData
        .filter((r) => r.status === "en_curso")
        .map((r) => r.id);

      let entregasCompletadas = 0;
      let entregasTotales = 0;

      if (rutasActivasIds.length > 0) {
        const { data: entregasData } = await supabase
          .from("entregas")
          .select("status_entrega")
          .in("ruta_id", rutasActivasIds);

        if (entregasData) {
          entregasTotales = entregasData.length;
          entregasCompletadas = entregasData.filter((e) =>
            ["entregado", "completo", "entrega_parcial"].includes(e.status_entrega || "")
          ).length;
        }
      }

      const progresoPromedio = entregasTotales > 0 
        ? Math.round((entregasCompletadas / entregasTotales) * 100) 
        : 0;

      return {
        activas,
        programadas,
        completadas,
        entregasCompletadas,
        entregasTotales,
        progresoPromedio,
      };
    } catch (error) {
      console.error("Error cargando rutas:", error);
      return initialState.rutas;
    }
  }, []);

  const cargarAlertas = useCallback(async () => {
    try {
      // Stock bajo
      const { count: stockBajo } = await supabase
        .from("productos")
        .select("*", { count: "exact", head: true })
        .eq("activo", true)
        .gt("stock_minimo", 0)
        .filter("stock_actual", "lt", "stock_minimo");

      // Productos próximos a caducar (lotes)
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 30);
      
      const { count: caducidadProxima } = await supabase
        .from("inventario_lotes")
        .select("*", { count: "exact", head: true })
        .gt("cantidad_disponible", 0)
        .not("fecha_caducidad", "is", null)
        .lte("fecha_caducidad", fechaLimite.toISOString().split("T")[0]);

      // Checkups de vehículos pendientes de resolución
      const { count: vehiculosCheckup } = await supabase
        .from("vehiculos_checkups")
        .select("*", { count: "exact", head: true })
        .eq("requiere_reparacion", true)
        .eq("resuelto", false);

      // Verificaciones vehiculares por vencer
      const fechaVerificacion = new Date();
      fechaVerificacion.setDate(fechaVerificacion.getDate() + 30);
      
      const { count: licenciasVencer } = await supabase
        .from("vehiculos_verificaciones")
        .select("*", { count: "exact", head: true })
        .not("proximo_periodo_fin", "is", null)
        .lte("proximo_periodo_fin", fechaVerificacion.toISOString().split("T")[0])
        .gte("proximo_periodo_fin", new Date().toISOString().split("T")[0]);

      return {
        licenciasVencer: licenciasVencer || 0,
        stockBajo: stockBajo || 0,
        caducidadProxima: caducidadProxima || 0,
        vehiculosCheckup: vehiculosCheckup || 0,
        total: (licenciasVencer || 0) + (stockBajo || 0) + (caducidadProxima || 0) + (vehiculosCheckup || 0),
      };
    } catch (error) {
      console.error("Error cargando alertas:", error);
      return initialState.alertas;
    }
  }, []);

  const cargarTodo = useCallback(async () => {
    setEstado((prev) => ({ ...prev, loading: true }));

    const [autorizaciones, recepciones, rutas, alertas] = await Promise.all([
      cargarAutorizaciones(),
      cargarRecepciones(),
      cargarRutas(),
      cargarAlertas(),
    ]);

    setEstado({
      autorizaciones,
      recepciones,
      rutas,
      alertas,
      lastUpdate: new Date(),
      loading: false,
    });
  }, [cargarAutorizaciones, cargarRecepciones, cargarRutas, cargarAlertas]);

  // Carga inicial y suscripciones realtime
  useEffect(() => {
    cargarTodo();

    // Suscripción a cambios en solicitudes de descuento
    const descuentosChannel = supabase
      .channel("estado-ops-descuentos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitudes_descuento" },
        () => cargarAutorizaciones().then((a) => 
          setEstado((prev) => ({ ...prev, autorizaciones: a, lastUpdate: new Date() }))
        )
      )
      .subscribe();

    // Suscripción a cambios en cotizaciones
    const cotizacionesChannel = supabase
      .channel("estado-ops-cotizaciones")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cotizaciones" },
        () => cargarAutorizaciones().then((a) => 
          setEstado((prev) => ({ ...prev, autorizaciones: a, lastUpdate: new Date() }))
        )
      )
      .subscribe();

    // Suscripción a cambios en recepciones
    const recepcionesChannel = supabase
      .channel("estado-ops-recepciones")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ordenes_compra_entregas" },
        () => cargarRecepciones().then((r) => 
          setEstado((prev) => ({ ...prev, recepciones: r, lastUpdate: new Date() }))
        )
      )
      .subscribe();

    // Suscripción a cambios en rutas
    const rutasChannel = supabase
      .channel("estado-ops-rutas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rutas" },
        () => cargarRutas().then((r) => 
          setEstado((prev) => ({ ...prev, rutas: r, lastUpdate: new Date() }))
        )
      )
      .subscribe();

    // Suscripción a cambios en entregas
    const entregasChannel = supabase
      .channel("estado-ops-entregas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entregas" },
        () => cargarRutas().then((r) => 
          setEstado((prev) => ({ ...prev, rutas: r, lastUpdate: new Date() }))
        )
      )
      .subscribe();

    // Polling para alertas (cada 60 segundos)
    const alertasInterval = setInterval(() => {
      cargarAlertas().then((a) => 
        setEstado((prev) => ({ ...prev, alertas: a, lastUpdate: new Date() }))
      );
    }, 60000);

    return () => {
      supabase.removeChannel(descuentosChannel);
      supabase.removeChannel(cotizacionesChannel);
      supabase.removeChannel(recepcionesChannel);
      supabase.removeChannel(rutasChannel);
      supabase.removeChannel(entregasChannel);
      clearInterval(alertasInterval);
    };
  }, [cargarTodo, cargarAutorizaciones, cargarRecepciones, cargarRutas, cargarAlertas]);

  return { ...estado, refetch: cargarTodo };
};
