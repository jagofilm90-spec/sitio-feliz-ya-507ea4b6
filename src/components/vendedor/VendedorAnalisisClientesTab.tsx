import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { Phone, ShoppingCart, Building2, Clock, TrendingDown, Star, Package } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

interface ClienteInactivo {
  id: string;
  nombre: string;
  codigo: string;
  telefono: string | null;
  saldo_pendiente: number | null;
  ultimo_pedido: string | null;
  dias_inactivo: number;
}

interface ProductoFrecuente {
  producto_id: string;
  nombre: string;
  codigo: string;
  veces_pedido: number;
  cantidad_total: number;
  cliente_nombre: string;
}

interface Props {
  onNavigateNuevoPedido?: (clienteId?: string) => void;
}

export function VendedorAnalisisClientesTab({ onNavigateNuevoPedido }: Props) {
  const [loadingInactivos, setLoadingInactivos] = useState(false);
  const [loadingFrecuentes, setLoadingFrecuentes] = useState(false);
  const [clientesInactivos, setClientesInactivos] = useState<ClienteInactivo[]>([]);
  const [topProductos, setTopProductos] = useState<ProductoFrecuente[]>([]);
  const [diasFiltro, setDiasFiltro] = useState<30 | 60 | 90>(30);

  useEffect(() => {
    fetchClientesInactivos();
  }, [diasFiltro]);

  useEffect(() => {
    fetchTopProductos();
  }, []);

  const fetchClientesInactivos = async () => {
    setLoadingInactivos(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener clientes del vendedor
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nombre, codigo, telefono, saldo_pendiente")
        .eq("vendedor_asignado", user.id)
        .eq("activo", true);

      if (!clientes || clientes.length === 0) {
        setClientesInactivos([]);
        return;
      }

      const fechaCorte = new Date();
      fechaCorte.setDate(fechaCorte.getDate() - diasFiltro);

      // Para cada cliente, obtener su último pedido
      const clientesConInactividad: ClienteInactivo[] = [];

      for (const cliente of clientes) {
        const { data: ultimoPedido } = await supabase
          .from("pedidos")
          .select("fecha_pedido")
          .eq("cliente_id", cliente.id)
          .not("status", "eq", "cancelado")
          .order("fecha_pedido", { ascending: false })
          .limit(1)
          .maybeSingle();

        const fechaUltimoPedido = ultimoPedido?.fecha_pedido
          ? new Date(ultimoPedido.fecha_pedido)
          : null;

        const diasInactivo = fechaUltimoPedido
          ? Math.floor((new Date().getTime() - fechaUltimoPedido.getTime()) / (1000 * 60 * 60 * 24))
          : 9999;

        if (diasInactivo >= diasFiltro) {
          clientesConInactividad.push({
            id: cliente.id,
            nombre: cliente.nombre,
            codigo: cliente.codigo,
            telefono: cliente.telefono,
            saldo_pendiente: cliente.saldo_pendiente,
            ultimo_pedido: ultimoPedido?.fecha_pedido || null,
            dias_inactivo: diasInactivo === 9999 ? diasInactivo : diasInactivo,
          });
        }
      }

      // Ordenar de más inactivo a menos
      clientesConInactividad.sort((a, b) => b.dias_inactivo - a.dias_inactivo);
      setClientesInactivos(clientesConInactividad);
    } catch (error) {
      console.error("Error fetchClientesInactivos:", error);
    } finally {
      setLoadingInactivos(false);
    }
  };

  const fetchTopProductos = async () => {
    setLoadingFrecuentes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener pedidos del vendedor
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("id, cliente_id, clientes(nombre)")
        .eq("vendedor_id", user.id)
        .not("status", "eq", "cancelado");

      if (!pedidos || pedidos.length === 0) {
        setTopProductos([]);
        return;
      }

      const pedidoIds = pedidos.map(p => p.id);

      // Obtener detalles de pedidos con productos
      const { data: detalles } = await supabase
        .from("pedidos_detalles")
        .select(`
          pedido_id,
          cantidad,
          productos(id, nombre, codigo)
        `)
        .in("pedido_id", pedidoIds);

      if (!detalles) {
        setTopProductos([]);
        return;
      }

      // Agrupar por producto
      const mapaProductos: Record<string, {
        producto_id: string;
        nombre: string;
        codigo: string;
        veces_pedido: number;
        cantidad_total: number;
      }> = {};

      for (const det of detalles) {
        const prod = det.productos as { id: string; nombre: string; codigo: string } | null;
        if (!prod) continue;

        if (!mapaProductos[prod.id]) {
          mapaProductos[prod.id] = {
            producto_id: prod.id,
            nombre: prod.nombre,
            codigo: prod.codigo,
            veces_pedido: 0,
            cantidad_total: 0,
          };
        }
        mapaProductos[prod.id].veces_pedido += 1;
        mapaProductos[prod.id].cantidad_total += det.cantidad || 0;
      }

      const top = Object.values(mapaProductos)
        .sort((a, b) => b.veces_pedido - a.veces_pedido)
        .slice(0, 15)
        .map(p => ({ ...p, cliente_nombre: "" }));

      setTopProductos(top);
    } catch (error) {
      console.error("Error fetchTopProductos:", error);
    } finally {
      setLoadingFrecuentes(false);
    }
  };

  const handleLlamar = (telefono: string) => {
    window.open(`tel:${telefono}`, "_self");
  };

  const handleWhatsApp = (telefono: string) => {
    const tel = telefono.replace(/\D/g, "");
    window.open(`https://wa.me/52${tel}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Análisis."
        lead="Métricas y tendencias de venta"
      />

      <Tabs defaultValue="inactivos">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inactivos">
            <Clock className="h-4 w-4 mr-2" />
            Inactivos
          </TabsTrigger>
          <TabsTrigger value="frecuentes">
            <Star className="h-4 w-4 mr-2" />
            Top Productos
          </TabsTrigger>
        </TabsList>

        {/* Tab Inactivos */}
        <TabsContent value="inactivos" className="mt-4 space-y-4">
          {/* Filtro de días */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sin pedido en:</span>
            {([30, 60, 90] as const).map(dias => (
              <Button
                key={dias}
                variant={diasFiltro === dias ? "default" : "outline"}
                size="sm"
                onClick={() => setDiasFiltro(dias)}
              >
                {dias}d
              </Button>
            ))}
          </div>

          {loadingInactivos ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : clientesInactivos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">¡Excelente!</p>
              <p className="text-sm">Todos tus clientes han comprado en los últimos {diasFiltro} días</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {clientesInactivos.length} cliente{clientesInactivos.length !== 1 ? "s" : ""} sin comprar en {diasFiltro}+ días
              </p>
              {clientesInactivos.map(cliente => (
                <Card
                  key={cliente.id}
                  className={`border-l-4 ${
                    cliente.dias_inactivo >= 90
                      ? "border-l-destructive"
                      : cliente.dias_inactivo >= 60
                      ? "border-l-amber-500"
                      : "border-l-yellow-400"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold truncate">{cliente.nombre}</span>
                          <Badge variant="outline" className="text-xs shrink-0">{cliente.codigo}</Badge>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                          <span className={`font-medium flex items-center gap-1 ${
                            cliente.dias_inactivo >= 90 ? "text-destructive" :
                            cliente.dias_inactivo >= 60 ? "text-amber-600" : "text-yellow-600"
                          }`}>
                            <Clock className="h-3.5 w-3.5" />
                            {cliente.dias_inactivo >= 9999 ? "Sin historial" : `${cliente.dias_inactivo} días sin comprar`}
                          </span>
                        </div>

                        {(cliente.saldo_pendiente || 0) > 0 && (
                          <p className="text-xs text-destructive mt-1 font-medium">
                            Saldo pendiente: {formatCurrency(cliente.saldo_pendiente || 0)}
                          </p>
                        )}

                        {cliente.ultimo_pedido && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Último pedido: {new Date(cliente.ultimo_pedido).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {cliente.telefono && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleLlamar(cliente.telefono!)}
                          >
                            <Phone className="h-3.5 w-3.5 mr-1" />
                            Llamar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleWhatsApp(cliente.telefono!)}
                          >
                            WhatsApp
                          </Button>
                        </>
                      )}
                      {onNavigateNuevoPedido && (
                        <Button
                          size="sm"
                          className="h-8 text-xs ml-auto"
                          onClick={() => onNavigateNuevoPedido(cliente.id)}
                        >
                          <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                          Levantar Pedido
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab Top Productos */}
        <TabsContent value="frecuentes" className="mt-4 space-y-3">
          {loadingFrecuentes ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : topProductos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Sin datos de productos</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Productos más frecuentes en tus pedidos</p>
              {topProductos.map((prod, index) => (
                <Card key={prod.producto_id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        index === 0 ? "bg-yellow-100 text-yellow-700" :
                        index === 1 ? "bg-slate-100 text-slate-700" :
                        index === 2 ? "bg-amber-100 text-amber-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{prod.nombre}</p>
                        <p className="text-xs text-muted-foreground">{prod.codigo}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{prod.veces_pedido} pedidos</p>
                        <p className="text-xs text-muted-foreground">
                          {prod.cantidad_total % 1 === 0
                            ? prod.cantidad_total.toLocaleString()
                            : prod.cantidad_total.toFixed(1)} unid. total
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
