import { useState, useEffect } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { supabase } from "@/integrations/supabase/client";
import { format, subHours, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Cake,
  ClipboardList,
  FileText,
  ShoppingCart,
  Mail,
  MessageSquare,
  Store,
  Package,
  Truck,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  Sunset} from "lucide-react";

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
    if (hour < 12) return { text: "¡Buenos días", icon: Sun };
    if (hour < 19) return { text: "¡Buenas tardes", icon: Sunset };
    return { text: "¡Buenas noches", icon: Moon };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

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

  const TaskCard = ({
    icon: Icon,
    label,
    count,
    tab,
    color}: {
    icon: any;
    label: string;
    count: number;
    tab: string;
    color: string;
  }) => (
    <button
      onClick={() => handleNavigate(tab)}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md ${
        count > 0 ? "bg-pink-50 border-pink-200" : "bg-muted/50 border-border"
      }`}
    >
      <div className={`p-2 rounded-full ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium">{label}</p>
        <p className={`text-xs ${count > 0 ? "text-pink-600" : "text-muted-foreground"}`}>
          {count} pendiente{count !== 1 ? "s" : ""}
        </p>
      </div>
      {count > 0 && (
        <Badge variant="destructive" className="bg-pink-600">
          {count}
        </Badge>
      )}
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );

  const totalPendientes =
    alertas.pedidosPorAutorizar +
    alertas.facturasPorTimbrar +
    alertas.ocPorEnviar +
    alertas.solicitudesMostrador;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-hidden overflow-x-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GreetingIcon className="h-6 w-6 text-pink-500" />
            <span>
              {greeting.text}, {secretariaNombre.split(" ")[0]}!
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <AlmasaLoading size={48} />
        ) : (
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <div className="space-y-4">
              {/* Birthday Banner */}
              {esCumpleanos && (
                <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-lg flex items-center gap-3">
                  <Cake className="h-8 w-8" />
                  <div>
                    <p className="font-semibold">¡Feliz Cumpleaños! 🎂</p>
                    <p className="text-sm opacity-90">
                      Todo el equipo de ALMASA te desea un excelente día
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Banner */}
              <div className="bg-gradient-to-r from-pink-100 to-rose-100 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="h-5 w-5 text-pink-600" />
                  <span className="font-medium text-pink-900">
                    Resumen del día
                  </span>
                </div>
                <p className="text-sm text-pink-700">
                  {totalPendientes > 0
                    ? `Tienes ${totalPendientes} tarea${totalPendientes !== 1 ? "s" : ""} pendiente${totalPendientes !== 1 ? "s" : ""}`
                    : "¡No tienes tareas pendientes! 🎉"}
                </p>
              </div>

              {/* Task Cards Grid */}
              <div className="grid grid-cols-1 gap-2">
                <TaskCard
                  icon={ClipboardList}
                  label="Pedidos por Autorizar"
                  count={alertas.pedidosPorAutorizar}
                  tab="pedidos"
                  color="bg-amber-500"
                />
                <TaskCard
                  icon={FileText}
                  label="Facturas por Timbrar"
                  count={alertas.facturasPorTimbrar}
                  tab="facturacion"
                  color="bg-blue-500"
                />
                <TaskCard
                  icon={ShoppingCart}
                  label="Órdenes por Enviar"
                  count={alertas.ocPorEnviar}
                  tab="compras"
                  color="bg-purple-500"
                />
                <TaskCard
                  icon={Store}
                  label="Solicitudes Mostrador"
                  count={alertas.solicitudesMostrador}
                  tab="mostrador"
                  color="bg-emerald-500"
                />
              </div>

              {/* Deliveries Today */}
              {entregasHoy.length > 0 && (
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-pink-600" />
                    <span className="font-medium text-sm">
                      Entregas esperadas hoy ({entregasHoy.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {entregasHoy.map((entrega) => (
                      <div
                        key={entrega.id}
                        className="text-xs text-muted-foreground flex items-center gap-2"
                      >
                        <Package className="h-3 w-3" />
                        <span className="font-medium">{entrega.proveedorNombre}</span>
                        <span>- {entrega.cantidad} unidades</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Updates */}
              {(productosNuevos.length > 0 ||
                cambiosPrecios.length > 0 ||
                productosInhabilitados.length > 0) && (
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-pink-600" />
                    <span className="font-medium text-sm">
                      Novedades en productos (últimas 48h)
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {productosNuevos.length > 0 && (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>{productosNuevos.length} producto{productosNuevos.length !== 1 ? "s" : ""} nuevo{productosNuevos.length !== 1 ? "s" : ""}</span>
                      </div>
                    )}
                    {cambiosPrecios.length > 0 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>{cambiosPrecios.length} cambio{cambiosPrecios.length !== 1 ? "s" : ""} de precio</span>
                      </div>
                    )}
                    {productosInhabilitados.length > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <TrendingDown className="h-3 w-3" />
                        <span>{productosInhabilitados.length} producto{productosInhabilitados.length !== 1 ? "s" : ""} descontinuado{productosInhabilitados.length !== 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CTA Button */}
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
              >
                Comenzar a trabajar
              </Button>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
