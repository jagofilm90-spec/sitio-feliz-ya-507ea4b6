import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Periodo = 'hoy' | 'semana' | 'mes' | 'anio';

export interface DashboardKPIs {
  // Fila 1 - Dinero
  ventasDia: number;
  ventasMes: number;
  ventasMesAnterior: number;
  variacionMes: number;
  porCobrar: number;
  totalVencido: number;
  cobrosHoy: number;
  // Fila 2 - Operación
  pedidosEnCalle: number;
  entregasCompletadasHoy: number;
  entregasPendientesHoy: number;
  pedidosPorSurtir: number;
  // Fila 3 - Alertas
  creditoExcedido: number;
  stockBajo: number;
  pedidosSinAutorizar24h: number;
  facturasVencenSemana: number;
  pagosPorValidar: number;
  preciosRevisionPendientes: number;
}

export interface AlertaUrgente {
  tipo: 'pedidos_sin_autorizar' | 'chofer_sin_gps' | 'stock_cero' | 'credito_excedido' | 'pagos_por_validar' | 'precios_por_revisar';
  cantidad: number;
  detalle?: string;
  ruta: string;
  botonTexto: string;
}

export interface TopProducto {
  id: string;
  nombre: string;
  cantidadVendida: number;
  montoTotal: number;
}

export interface TopCliente {
  id: string;
  nombre: string;
  totalPesos: number;
  numPedidos: number;
}

export interface ResumenFinanciero {
  ticketPromedio: number;
  clientesNuevosMes: number;
  clientesInactivos: number;
  tasaEntregasExitosas: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  alertas: AlertaUrgente[];
  topProductos: TopProducto[];
  topClientes: TopCliente[];
  resumenFinanciero: ResumenFinanciero;
}

const EMPTY_KPIS: DashboardKPIs = {
  ventasDia: 0, ventasMes: 0, ventasMesAnterior: 0, variacionMes: 0,
  porCobrar: 0, totalVencido: 0, cobrosHoy: 0, pedidosEnCalle: 0,
  entregasCompletadasHoy: 0, entregasPendientesHoy: 0, pedidosPorSurtir: 0,
  creditoExcedido: 0, stockBajo: 0, pedidosSinAutorizar24h: 0, facturasVencenSemana: 0, pagosPorValidar: 0, preciosRevisionPendientes: 0,
};

export function useDashboardData(periodo: Periodo = 'mes') {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const now = new Date();
      const hoy = now.toISOString().split('T')[0];
      const inicioHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const finMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
      const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const finSemana = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Batch all independent queries
      const [
        ventasDiaRes, ventasMesRes, ventasMesAntRes,
        clientesSaldoRes,
        facturasVencidasRes,
        pedidosEnCalleRes,
        pedidosPorSurtirRes,
        pedidosSinAutRes,
        stockBajoRes, stockCeroRes,
        facturasVencenSemanaRes,
        clientesNuevosRes,
        topProductosRes,
        topClientesRes,
        entregasHoyRes,
        cobrosHoyRes,
        pagosPorValidarRes,
        preciosRevisionRes,
      ] = await Promise.all([
        // Ventas del día
        supabase.from("pedidos").select("total").gte("created_at", inicioHoy).in("status", ["entregado", "en_ruta"]),
        // Ventas del mes
        supabase.from("pedidos").select("total").gte("created_at", inicioMes).in("status", ["entregado", "en_ruta"]),
        // Ventas mes anterior
        supabase.from("pedidos").select("total").gte("created_at", inicioMesAnterior).lte("created_at", finMesAnterior).in("status", ["entregado", "en_ruta"]),
        // Clientes con saldo
        supabase.from("clientes").select("id, saldo_pendiente, limite_credito").gt("saldo_pendiente", 0),
        // Facturas vencidas
        (supabase as any).from("facturas").select("total, fecha_vencimiento").lt("fecha_vencimiento", hoy).eq("status", "vigente"),
        // Pedidos en calle
        supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("status", "en_ruta"),
        // Pedidos por surtir
        supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
        // Pedidos sin autorizar > 24h
        supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("status", "por_autorizar").lt("created_at", hace24h),
        // Stock bajo
        supabase.from("productos").select("id", { count: "exact", head: true }).filter("stock_actual", "lte", "stock_minimo").eq("activo", true),
        // Stock = 0
        supabase.from("productos").select("id", { count: "exact", head: true }).eq("stock_actual", 0).eq("activo", true),
        // Facturas que vencen esta semana
        (supabase as any).from("facturas").select("id", { count: "exact", head: true }).gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", finSemana).eq("status", "vigente"),
        // Clientes nuevos del mes
        supabase.from("clientes").select("id", { count: "exact", head: true }).gte("created_at", inicioMes),
        // Top 10 productos del mes - get details from pedidos_detalles
        supabase.from("pedidos_detalles").select("producto_id, cantidad, subtotal, productos(nombre), pedidos!inner(status, created_at)").gte("pedidos.created_at", inicioMes).in("pedidos.status", ["entregado", "en_ruta"]),
        // Top 10 clientes del mes
        supabase.from("pedidos").select("cliente_id, total, clientes(nombre)").gte("created_at", inicioMes).in("status", ["entregado", "en_ruta"]),
        // Entregas de hoy
        supabase.from("rutas").select("id, status, entregas(id, status_entrega)").eq("fecha_ruta", hoy),
        // Cobros de hoy
        supabase.from("pagos_cliente").select("monto_total").gte("fecha_registro", inicioHoy).neq("status", "rechazado"),
        // Pagos por validar
        supabase.from("pagos_cliente").select("id", { count: "exact", head: true }).eq("status", "pendiente").eq("requiere_validacion", true),
        // Precios revision pendientes
        (supabase as any).from("productos_revision_precio").select("id", { count: "exact", head: true }).in("status", ["pendiente", "parcial"]),
      ]);

      // KPIs calculations
      const ventasDia = ventasDiaRes.data?.reduce((s, p) => s + (p.total || 0), 0) || 0;
      const ventasMes = ventasMesRes.data?.reduce((s, p) => s + (p.total || 0), 0) || 0;
      const ventasMesAnterior = ventasMesAntRes.data?.reduce((s, p) => s + (p.total || 0), 0) || 0;
      const variacionMes = ventasMesAnterior > 0 ? ((ventasMes - ventasMesAnterior) / ventasMesAnterior) * 100 : 0;
      const porCobrar = clientesSaldoRes.data?.reduce((s, c) => s + (c.saldo_pendiente || 0), 0) || 0;
      const totalVencido = facturasVencidasRes.data?.reduce((s: number, f: any) => s + (f.total || 0), 0) || 0;
      const creditoExcedido = clientesSaldoRes.data?.filter((c: any) => c.limite_credito && c.saldo_pendiente > c.limite_credito).length || 0;

      // Entregas hoy
      let entregasCompletadasHoy = 0;
      let entregasPendientesHoy = 0;
      entregasHoyRes.data?.forEach((ruta: any) => {
        ruta.entregas?.forEach((e: any) => {
          if (e.status_entrega === 'entregado' || e.status_entrega === 'completo') {
            entregasCompletadasHoy++;
          } else {
            entregasPendientesHoy++;
          }
        });
      });

      const cobrosHoy = cobrosHoyRes.data?.reduce((s: number, p: any) => s + (Number(p.monto_total) || 0), 0) || 0;

      const kpis: DashboardKPIs = {
        ventasDia, ventasMes, ventasMesAnterior, variacionMes,
        porCobrar, totalVencido, cobrosHoy,
        pedidosEnCalle: pedidosEnCalleRes.count || 0,
        entregasCompletadasHoy, entregasPendientesHoy,
        pedidosPorSurtir: pedidosPorSurtirRes.count || 0,
        creditoExcedido,
        stockBajo: stockBajoRes.count || 0,
        pedidosSinAutorizar24h: pedidosSinAutRes.count || 0,
        facturasVencenSemana: facturasVencenSemanaRes.count || 0,
        pagosPorValidar: pagosPorValidarRes.count || 0,
        preciosRevisionPendientes: (preciosRevisionRes as any)?.count || 0,
      };

      // Alertas urgentes
      const alertas: AlertaUrgente[] = [];
      if ((pedidosSinAutRes.count || 0) > 0) {
        alertas.push({ tipo: 'pedidos_sin_autorizar', cantidad: pedidosSinAutRes.count || 0, ruta: '/pedidos?tab=por-autorizar', botonTexto: 'Ir a autorizar' });
      }
      if ((stockCeroRes.count || 0) > 0) {
        alertas.push({ tipo: 'stock_cero', cantidad: stockCeroRes.count || 0, ruta: '/inventario', botonTexto: 'Ver inventario' });
      }
      if (creditoExcedido > 0) {
        alertas.push({ tipo: 'credito_excedido', cantidad: creditoExcedido, ruta: '/clientes', botonTexto: 'Ver cobranza' });
      }
      if ((pagosPorValidarRes.count || 0) > 0) {
        alertas.push({ tipo: 'pagos_por_validar', cantidad: pagosPorValidarRes.count || 0, ruta: '/secretaria', botonTexto: 'Validar pagos' });
      }
      const preciosCount = (preciosRevisionRes as any)?.count || 0;
      if (preciosCount > 0) {
        alertas.push({ tipo: 'precios_por_revisar', cantidad: preciosCount, ruta: '/precios', botonTexto: 'Revisar ahora' });
      }

      const prodMap = new Map<string, TopProducto>();
      topProductosRes.data?.forEach((d: any) => {
        const pid = d.producto_id;
        const existing = prodMap.get(pid);
        if (existing) {
          existing.cantidadVendida += d.cantidad || 0;
          existing.montoTotal += d.subtotal || 0;
        } else {
          prodMap.set(pid, {
            id: pid,
            nombre: (d.productos as any)?.nombre || 'Producto',
            cantidadVendida: d.cantidad || 0,
            montoTotal: d.subtotal || 0,
          });
        }
      });
      const topProductos = Array.from(prodMap.values()).sort((a, b) => b.montoTotal - a.montoTotal).slice(0, 10);

      // Top clientes aggregation
      const cliMap = new Map<string, TopCliente>();
      topClientesRes.data?.forEach((p: any) => {
        const cid = p.cliente_id;
        const existing = cliMap.get(cid);
        if (existing) {
          existing.totalPesos += p.total || 0;
          existing.numPedidos++;
        } else {
          cliMap.set(cid, {
            id: cid,
            nombre: (p.clientes as any)?.nombre || 'Cliente',
            totalPesos: p.total || 0,
            numPedidos: 1,
          });
        }
      });
      const topClientes = Array.from(cliMap.values()).sort((a, b) => b.totalPesos - a.totalPesos).slice(0, 10);

      // Resumen financiero
      const numPedidosMes = ventasMesRes.data?.length || 0;
      const ticketPromedio = numPedidosMes > 0 ? ventasMes / numPedidosMes : 0;

      // Clientes inactivos: have orders but none in last 30 days
      // We'll use a simpler approach: count clients with saldo but no recent orders
      const { count: totalClientesActivos } = await supabase
        .from("clientes").select("id", { count: "exact", head: true }).eq("activo", true);
      const { data: clientesConPedidosRecientes } = await supabase
        .from("pedidos").select("cliente_id").gte("created_at", hace30Dias).in("status", ["entregado", "en_ruta", "pendiente", "por_autorizar"]);
      const clientesActivosRecientes = new Set(clientesConPedidosRecientes?.map(p => p.cliente_id)).size;
      const clientesInactivos = Math.max((totalClientesActivos || 0) - clientesActivosRecientes, 0);

      const totalEntregasHoy = entregasCompletadasHoy + entregasPendientesHoy;
      const tasaEntregasExitosas = totalEntregasHoy > 0 ? (entregasCompletadasHoy / totalEntregasHoy) * 100 : 0;

      setData({
        kpis,
        alertas,
        topProductos,
        topClientes,
        resumenFinanciero: {
          ticketPromedio,
          clientesNuevosMes: clientesNuevosRes.count || 0,
          clientesInactivos,
          tasaEntregasExitosas,
        },
      });
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    intervalRef.current = setInterval(fetchData, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, loading, lastRefresh, refresh: fetchData };
}
