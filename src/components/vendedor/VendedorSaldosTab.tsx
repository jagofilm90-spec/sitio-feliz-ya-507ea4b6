import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Search, 
  Wallet, 
  AlertTriangle, 
  Phone, 
  MessageCircle,
  CreditCard,
  TrendingDown,
  ArrowUpDown,
  CheckCircle
} from "lucide-react";
import { RegistrarPagoDialog } from "@/components/vendedor/RegistrarPagoDialog";
import { ClienteDetalleSheet } from "@/components/vendedor/ClienteDetalleSheet";

interface ClienteSaldo {
  id: string;
  nombre: string;
  codigo: string;
  telefono: string | null;
  saldoPendiente: number;
  montoVencido: number;
  diasVencido: number;
  ultimaCompra: string | null;
  facturasVencidas: number;
}

export function VendedorSaldosTab() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<ClienteSaldo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [ordenar, setOrdenar] = useState("mayor-saldo");
  const [totales, setTotales] = useState({ total: 0, vencido: 0 });
  
  // Dialogs
  const [pagoDialog, setPagoDialog] = useState<{ open: boolean; clienteId: string; clienteNombre: string }>({
    open: false,
    clienteId: "",
    clienteNombre: ""
  });
  const [detalleSheet, setDetalleSheet] = useState<{ open: boolean; clienteId: string }>({
    open: false,
    clienteId: ""
  });

  useEffect(() => {
    fetchSaldos();
  }, []);

  const fetchSaldos = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener clientes del vendedor con saldo > 0
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nombre, codigo, telefono, saldo_pendiente")
        .eq("vendedor_asignado", user.id)
        .eq("activo", true)
        .gt("saldo_pendiente", 0)
        .order("saldo_pendiente", { ascending: false });

      if (!clientesData || clientesData.length === 0) {
        setClientes([]);
        setTotales({ total: 0, vencido: 0 });
        setLoading(false);
        return;
      }

      const hoy = new Date();
      let totalGeneral = 0;
      let totalVencido = 0;

      // Para cada cliente, obtener info de facturas
      const clientesConSaldo: ClienteSaldo[] = await Promise.all(
        clientesData.map(async (cliente) => {
          // Obtener facturas pendientes
          const { data: facturas } = await supabase
            .from("facturas")
            .select("total, fecha_vencimiento")
            .eq("cliente_id", cliente.id)
            .eq("pagada", false);

          let montoVencido = 0;
          let diasVencidoMax = 0;
          let facturasVencidas = 0;

          (facturas || []).forEach(f => {
            if (f.fecha_vencimiento) {
              const fechaVenc = new Date(f.fecha_vencimiento);
              if (fechaVenc < hoy) {
                montoVencido += f.total || 0;
                facturasVencidas++;
                const dias = Math.floor((hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24));
                if (dias > diasVencidoMax) diasVencidoMax = dias;
              }
            }
          });

          // Obtener última compra
          const { data: ultimoPedido } = await supabase
            .from("pedidos")
            .select("fecha_pedido")
            .eq("cliente_id", cliente.id)
            .order("fecha_pedido", { ascending: false })
            .limit(1)
            .maybeSingle();

          const saldo = cliente.saldo_pendiente || 0;
          totalGeneral += saldo;
          totalVencido += montoVencido;

          return {
            id: cliente.id,
            nombre: cliente.nombre,
            codigo: cliente.codigo,
            telefono: cliente.telefono,
            saldoPendiente: saldo,
            montoVencido,
            diasVencido: diasVencidoMax,
            ultimaCompra: ultimoPedido?.fecha_pedido || null,
            facturasVencidas
          };
        })
      );

      setClientes(clientesConSaldo);
      setTotales({ total: totalGeneral, vencido: totalVencido });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar saldos");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar clientes
  const clientesFiltrados = clientes
    .filter(c => 
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (ordenar) {
        case "mayor-saldo":
          return b.saldoPendiente - a.saldoPendiente;
        case "mayor-vencido":
          return b.montoVencido - a.montoVencido;
        case "nombre":
          return a.nombre.localeCompare(b.nombre);
        default:
          return 0;
      }
    });

  const handleWhatsApp = (telefono: string | null, nombre: string) => {
    if (!telefono) {
      toast.error("Cliente sin teléfono registrado");
      return;
    }
    const tel = telefono.replace(/\D/g, "");
    const mensaje = encodeURIComponent(
      `Hola, le escribo de ALMASA respecto a su saldo pendiente.`
    );
    window.open(`https://wa.me/52${tel}?text=${mensaje}`, "_blank");
  };

  const handleLlamar = (telefono: string | null) => {
    if (!telefono) {
      toast.error("Cliente sin teléfono registrado");
      return;
    }
    window.location.href = `tel:${telefono}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen totales */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Por Cobrar</p>
                <p className="text-2xl lg:text-3xl font-bold text-primary">
                  {formatCurrency(totales.total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto Vencido</p>
                <p className="text-2xl lg:text-3xl font-bold text-destructive">
                  {formatCurrency(totales.vencido)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buscador y ordenar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
        <Select value={ordenar} onValueChange={setOrdenar}>
          <SelectTrigger className="w-full sm:w-48 h-12">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mayor-saldo">Mayor saldo</SelectItem>
            <SelectItem value="mayor-vencido">Mayor vencido</SelectItem>
            <SelectItem value="nombre">Nombre A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de clientes */}
      <ScrollArea className="h-[calc(100vh-420px)] lg:h-[calc(100vh-380px)]">
        {clientesFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">¡Sin saldos pendientes!</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "No se encontraron clientes con ese criterio"
                : "Todos tus clientes están al corriente"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clientesFiltrados.map((cliente) => (
              <Card 
                key={cliente.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setDetalleSheet({ open: true, clienteId: cliente.id })}
                      >
                        <h3 className="font-semibold text-base truncate">{cliente.nombre}</h3>
                        <p className="text-sm text-muted-foreground">{cliente.codigo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(cliente.saldoPendiente)}</p>
                        {cliente.montoVencido > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {formatCurrency(cliente.montoVencido)} vencido
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            Al corriente
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Info adicional */}
                    {cliente.montoVencido > 0 && (
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span>{cliente.facturasVencidas} factura{cliente.facturasVencidas > 1 ? "s" : ""} vencida{cliente.facturasVencidas > 1 ? "s" : ""}</span>
                        <span>•</span>
                        <span>{cliente.diasVencido} días</span>
                      </div>
                    )}

                    {cliente.ultimaCompra && (
                      <p className="text-xs text-muted-foreground">
                        Última compra: {format(new Date(cliente.ultimaCompra), "d MMM yyyy", { locale: es })}
                      </p>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2 pt-1">
                      <Button 
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleLlamar(cliente.telefono)}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Llamar
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleWhatsApp(cliente.telefono, cliente.nombre)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button 
                        size="sm"
                        className="flex-1"
                        onClick={() => setPagoDialog({ 
                          open: true, 
                          clienteId: cliente.id, 
                          clienteNombre: cliente.nombre 
                        })}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pago
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Dialogs */}
      <RegistrarPagoDialog
        open={pagoDialog.open}
        onOpenChange={(open) => setPagoDialog(prev => ({ ...prev, open }))}
        clienteId={pagoDialog.clienteId}
        clienteNombre={pagoDialog.clienteNombre}
        onPagoRegistrado={fetchSaldos}
      />

      <ClienteDetalleSheet
        open={detalleSheet.open}
        onOpenChange={(open) => setDetalleSheet(prev => ({ ...prev, open }))}
        clienteId={detalleSheet.clienteId}
      />
    </div>
  );
}