import { useState, useEffect } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { supabase } from "@/integrations/supabase/client";
import { format, subHours, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secretariaNombre: string;
  onNavigate: (tab: string) => void;
}

interface Alertas {
  pedidosPorAutorizar: number;
  facturasPorTimbrar: number;
  ocPorEnviar: number;
  correosNoLeidos: number;
  solicitudesMostrador: number;
  mensajesChat: number;
}

interface EntregaHoy {
  id: string;
  proveedorNombre: string;
  productoNombre: string;
  cantidad: number;
}

interface ProductoNuevo {
  id: string;
  codigo: string;
  nombre: string;
}

interface CambioPrecio {
  producto_id: string;
  codigo: string;
  nombre: string;
  precio_anterior: number;
  precio_nuevo: number;
}

interface ProductoInhabilitado {
  producto_id: string;
  codigo: string;
  nombre: string;
}

export const SecretariaBienvenidaDialog = ({
  open,
  onOpenChange,
  secretariaNombre,
  onNavigate}: Props) => {
  const [loading, setLoading] = useState(true);
  const [esCumpleanos, setEsCumpleanos] = useState(false);
  const [alertas, setAlertas] = useState<Alertas>({
    pedidosPorAutorizar: 0,
    facturasPorTimbrar: 0,
    ocPorEnviar: 0,
    correosNoLeidos: 0,
    solicitudesMostrador: 0,
    mensajesChat: 0});
  const [entregasHoy, setEntregasHoy] = useState<EntregaHoy[]>([]);
  const [productosNuevos, setProductosNuevos] = useState<ProductoNuevo[]>([]);
  const [cambiosPrecios, setCambiosPrecios] = useState<CambioPrecio[]>([]);
  const [productosInhabilitados, setProductosInhabilitados] = useState<ProductoInhabilitado[]>([]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Buenos días,";
    if (hour >= 12 && hour < 19) return "Buenas tardes,";
    return "Buenas noches,";
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const hace48Horas = subHours(new Date(), 48);
      const hoy = format(new Date(), "yyyy-MM-dd");

      // Fetch birthday info
      const { data: empleadoData } = await supabase
        .from("empleados")
        .select("fecha_nacimiento")
        .eq("user_id", user.id)
        .maybeSingle();

      // Parallel count queries
      const [pedidosResult, facturasResult, ocResult, mostradorResult] = await Promise.all([
        supabase.from("pedidos").select("*", { count: "exact", head: true }).eq("status", "por_autorizar"),
        supabase.from("facturas").select("*", { count: "exact", head: true }).is("cfdi_uuid", null),
        supabase.from("ordenes_compra").select("*", { count: "exact", head: true }).eq("status", "autorizada"),
        supabase.from("solicitudes_venta_mostrador").select("*", { count: "exact", head: true }).eq("status", "pendiente"),
      ]);

      // Fetch entregas separately
      const { data: entregasData } = await supabase
        .from("ordenes_compra_entregas")
        .select("id, cantidad_bultos, orden_compra_id")
        .eq("fecha_programada", hoy)
        .neq("status", "completada")
        .limit(5);

      // Fetch products data
      const [productosNuevosResult, preciosResult, estadoResult] = await Promise.all([
        supabase
          .from("productos")
          .select("id, codigo, nombre")
          .eq("activo", true)
          .gte("created_at", hace48Horas.toISOString())
          .limit(5),
        supabase
          .from("productos_historial_precios")
          .select("producto_id, precio_anterior, precio_nuevo")
          .gte("created_at", hace48Horas.toISOString())
          .limit(5),
        supabase
          .from("productos_historial_estado")
          .select("producto_id")
          .eq("activo_nuevo", false)
          .gte("created_at", hace48Horas.toISOString())
          .limit(5),
      ]);

      // Check birthday
      if (empleadoData?.fecha_nacimiento) {
        const cumple = parseISO(empleadoData.fecha_nacimiento);
        const today = new Date();
        setEsCumpleanos(
          cumple.getMonth() === today.getMonth() &&
          cumple.getDate() === today.getDate()
        );
      }

      // Set alerts
      setAlertas({
        pedidosPorAutorizar: pedidosResult.count || 0,
        facturasPorTimbrar: facturasResult.count || 0,
        ocPorEnviar: ocResult.count || 0,
        correosNoLeidos: 0, // Will be updated from parent
        solicitudesMostrador: mostradorResult.count || 0,
        mensajesChat: 0, // Will be updated from parent
      });

      // Process deliveries
      if (entregasData && entregasData.length > 0) {
        const entregas: EntregaHoy[] = entregasData.map((e) => ({
          id: e.id,
          proveedorNombre: "Proveedor",
          productoNombre: "Productos varios",
          cantidad: e.cantidad_bultos || 0}));
        setEntregasHoy(entregas.slice(0, 3));
      }

      // Process new products
      if (productosNuevosResult.data) {
        setProductosNuevos(productosNuevosResult.data as ProductoNuevo[]);
      }

      // Process price changes
      if (preciosResult.data) {
        const cambios: CambioPrecio[] = preciosResult.data.map((p) => ({
          producto_id: p.producto_id,
          codigo: "",
          nombre: "",
          precio_anterior: p.precio_anterior,
          precio_nuevo: p.precio_nuevo}));
        setCambiosPrecios(cambios);
      }

      // Process disabled products
      if (estadoResult.data) {
        const inhabilitados: ProductoInhabilitado[] = estadoResult.data.map((p) => ({
          producto_id: p.producto_id,
          codigo: "",
          nombre: ""}));
        setProductosInhabilitados(inhabilitados);
      }
    } catch (error) {
      console.error("Error loading welcome data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (tab: string) => {
    onNavigate(tab);
    onOpenChange(false);
  };

  const totalPendientes =
    alertas.pedidosPorAutorizar +
    alertas.facturasPorTimbrar +
    alertas.ocPorEnviar +
    alertas.solicitudesMostrador;

  const pendientesItems = [
    { count: alertas.pedidosPorAutorizar, label: "Pedidos por autorizar", tab: "pedidos" },
    { count: alertas.facturasPorTimbrar, label: "Facturas por timbrar", tab: "facturacion" },
    { count: alertas.ocPorEnviar, label: "Órdenes por enviar", tab: "compras" },
    { count: alertas.solicitudesMostrador, label: "Solicitudes mostrador", tab: "mostrador" },
  ].filter(i => i.count > 0);

  const novedadesItems = [
    ...(productosNuevos.length > 0 ? [{ count: productosNuevos.length, label: `producto${productosNuevos.length !== 1 ? "s" : ""} nuevo${productosNuevos.length !== 1 ? "s" : ""}` }] : []),
    ...(cambiosPrecios.length > 0 ? [{ count: cambiosPrecios.length, label: `cambio${cambiosPrecios.length !== 1 ? "s" : ""} de precio` }] : []),
    ...(productosInhabilitados.length > 0 ? [{ count: productosInhabilitados.length, label: `producto${productosInhabilitados.length !== 1 ? "s" : ""} descontinuado${productosInhabilitados.length !== 1 ? "s" : ""}` }] : []),
  ];

  const firstName = secretariaNombre.split(" ")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[480px] max-h-[90vh] overflow-hidden overflow-x-hidden !p-0 !gap-0 !rounded-2xl shadow-[0_20px_60px_-20px_rgba(15,14,13,0.25)]">
        {/* Header */}
        <DialogHeader className="px-8 pt-8 pb-6">
          <DialogDescription className="!text-[15px] text-ink-500 italic !mt-0">
            {getGreeting()}
          </DialogDescription>
          <DialogTitle className="!font-serif !text-[32px] !font-medium text-ink-900 !leading-tight !tracking-[-0.01em]">
            {firstName}.
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="px-8 py-8">
            <AlmasaLoading size={48} />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-220px)]">
            <div className="px-8 py-4">
              {/* Birthday — editorial */}
              {esCumpleanos && (
                <p className="font-serif italic text-[18px] text-crimson-500 mb-6">
                  Feliz cumpleaños, {firstName}. Todo el equipo te desea un excelente día.
                </p>
              )}

              {/* Pendientes list */}
              {pendientesItems.length > 0 ? (
                <div>
                  <p className="font-serif italic text-[15px] text-ink-500 mb-3">Resumen del día.</p>
                  <div className="divide-y divide-ink-100">
                    {pendientesItems.map((item) => (
                      <button
                        key={item.tab}
                        onClick={() => handleNavigate(item.tab)}
                        className="flex items-center w-full py-3 group hover:bg-ink-50/50 -mx-2 px-2 rounded transition-colors"
                      >
                        <span className="font-serif text-[24px] font-medium text-ink-900 tabular-nums w-10 text-left">
                          {item.count}
                        </span>
                        <span className="text-[14px] text-ink-700 flex-1 text-left">
                          {item.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-ink-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="font-serif italic text-[18px] text-ink-400">
                    Hoy no tienes pendientes.
                  </p>
                </div>
              )}

              {/* Entregas hoy */}
              {entregasHoy.length > 0 && (
                <div className="mt-6">
                  <p className="font-serif italic text-[15px] text-ink-500 mb-3">Entregas esperadas hoy.</p>
                  <div className="divide-y divide-ink-100">
                    {entregasHoy.map((entrega) => (
                      <div key={entrega.id} className="flex items-center py-2.5">
                        <span className="font-serif text-[18px] font-medium text-ink-900 tabular-nums w-10 text-left">
                          {entrega.cantidad}
                        </span>
                        <span className="text-[13px] text-ink-600">
                          {entrega.proveedorNombre}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Novedades productos */}
              {novedadesItems.length > 0 && (
                <div className="mt-6">
                  <p className="font-serif italic text-[15px] text-ink-500 mb-3">Novedades en productos.</p>
                  <div className="divide-y divide-ink-100">
                    {novedadesItems.map((item, i) => (
                      <div key={i} className="flex items-center py-2.5">
                        <span className="font-serif text-[18px] font-medium text-ink-900 tabular-nums w-10 text-left">
                          {item.count}
                        </span>
                        <span className="text-[13px] text-ink-600">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="px-8 pb-8 pt-6">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-crimson-500 text-white hover:bg-crimson-600"
          >
            <span className="font-serif italic text-[15px]">Comenzar.</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
