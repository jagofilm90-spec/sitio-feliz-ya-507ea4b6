import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Search,
  Loader2,
  Eye,
  Printer,
  FileText,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import PedidoDetalleDialog from "@/components/pedidos/PedidoDetalleDialog";
import { useNavigate } from "react-router-dom";
import { PedidoCardMobileSecretaria } from "./PedidoCardMobileSecretaria";

interface Pedido {
  id: string;
  folio: string;
  fecha_pedido: string;
  fecha_entrega_estimada: string | null;
  total: number;
  peso_total_kg: number | null;
  status: string;
  notas: string | null;
  clientes: { id: string; nombre: string; email: string | null } | null;
  cliente_sucursales: { id: string; nombre: string } | null;
  profiles: { full_name: string } | null;
  facturas: { id: string; folio: string; cfdi_uuid: string | null }[];
}

type OrderStatus = "por_autorizar" | "pendiente" | "en_ruta" | "entregado" | "cancelado";

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
    por_autorizar: { label: "Por autorizar", variant: "secondary", icon: Clock },
    pendiente: { label: "Pendiente", variant: "default", icon: Package },
    en_ruta: { label: "En ruta", variant: "outline", icon: Truck },
    entregado: { label: "Entregado", variant: "default", icon: CheckCircle2 },
    cancelado: { label: "Cancelado", variant: "destructive", icon: XCircle },
  };

  const config = statusConfig[status] || { label: status, variant: "outline", icon: Clock };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export const SecretariaPedidosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Fetch recent orders (last 7 days + all pending)
  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["secretaria-pedidos", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("pedidos")
        .select(`
          id,
          folio,
          fecha_pedido,
          fecha_entrega_estimada,
          total,
          peso_total_kg,
          status,
          notas,
          clientes (id, nombre, email),
          cliente_sucursales:sucursal_id (id, nombre),
          profiles:creado_por (full_name),
          facturas (id, folio, cfdi_uuid)
        `)
        .order("fecha_pedido", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as OrderStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Pedido[];
    },
    refetchInterval: 30000,
  });

  // Filter by search term
  const filteredPedidos = pedidos?.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      p.folio.toLowerCase().includes(searchLower) ||
      p.clientes?.nombre.toLowerCase().includes(searchLower) ||
      p.cliente_sucursales?.nombre.toLowerCase().includes(searchLower)
    );
  });

  // Group by status for summary
  const statusCounts = pedidos?.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const handleVerDetalle = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setShowDetalle(true);
  };

  // Navigate to full pedidos page for actions
  const handleIrAPedidos = () => {
    navigate("/pedidos");
  };

  const getFacturaStatus = (facturas: Pedido["facturas"]) => {
    if (!facturas || facturas.length === 0) {
      return <span className="text-muted-foreground text-xs">Sin factura</span>;
    }

    const factura = facturas[0];
    if (factura.cfdi_uuid) {
      return (
        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30">
          Timbrada
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="text-xs">
        Por timbrar
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Pedidos</h2>
          <Button variant="outline" size="sm" onClick={handleIrAPedidos}>
            Ver todo
          </Button>
        </div>

        {/* Summary Cards - horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {[
            { status: "por_autorizar", label: "Por autorizar", color: "bg-amber-100 dark:bg-amber-950/30 text-amber-700" },
            { status: "pendiente", label: "Pendientes", color: "bg-blue-100 dark:bg-blue-950/30 text-blue-700" },
            { status: "en_ruta", label: "En ruta", color: "bg-violet-100 dark:bg-violet-950/30 text-violet-700" },
            { status: "entregado", label: "Entregados", color: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700" },
          ].map((item) => (
            <Card
              key={item.status}
              className={`shrink-0 cursor-pointer transition-all ${
                statusFilter === item.status ? "ring-2 ring-primary" : ""
              } ${item.color}`}
              onClick={() => setStatusFilter(statusFilter === item.status ? "all" : item.status)}
            >
              <CardContent className="p-3 text-center min-w-[80px]">
                <p className="text-xl font-bold">{statusCounts[item.status] || 0}</p>
                <p className="text-xs font-medium whitespace-nowrap">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Cards list */}
        <div className="space-y-3">
          {filteredPedidos && filteredPedidos.length > 0 ? (
            filteredPedidos.map((pedido) => (
              <PedidoCardMobileSecretaria
                key={pedido.id}
                folio={pedido.folio}
                clienteNombre={pedido.clientes?.nombre || "Cliente"}
                sucursalNombre={pedido.cliente_sucursales?.nombre}
                fechaPedido={pedido.fecha_pedido}
                pesoKg={pedido.peso_total_kg}
                total={pedido.total}
                status={pedido.status}
                tieneFactura={pedido.facturas && pedido.facturas.length > 0}
                facturaStatus={
                  pedido.facturas?.[0]?.cfdi_uuid ? "timbrada" : pedido.facturas?.length ? "por_timbrar" : null
                }
                onVerDetalle={() => handleVerDetalle(pedido)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron pedidos
            </div>
          )}
        </div>

        {/* Dialog */}
        {selectedPedido && (
          <PedidoDetalleDialog
            open={showDetalle}
            onOpenChange={setShowDetalle}
            pedidoId={selectedPedido.id}
          />
        )}
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-4">
      {/* Header with link to full module */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Pedidos Recientes</h2>
        <Button variant="outline" onClick={handleIrAPedidos}>
          Ir a módulo completo
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { status: "por_autorizar", label: "Por autorizar", color: "bg-amber-100 dark:bg-amber-950/30 text-amber-700" },
          { status: "pendiente", label: "Pendientes", color: "bg-blue-100 dark:bg-blue-950/30 text-blue-700" },
          { status: "en_ruta", label: "En ruta", color: "bg-violet-100 dark:bg-violet-950/30 text-violet-700" },
          { status: "entregado", label: "Entregados", color: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700" },
          { status: "cancelado", label: "Cancelados", color: "bg-rose-100 dark:bg-rose-950/30 text-rose-700" },
        ].map((item) => (
          <Card
            key={item.status}
            className={`cursor-pointer transition-all hover:shadow-md ${
              statusFilter === item.status ? "ring-2 ring-primary" : ""
            } ${item.color}`}
            onClick={() => setStatusFilter(statusFilter === item.status ? "all" : item.status)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{statusCounts[item.status] || 0}</p>
              <p className="text-xs font-medium">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por folio, cliente o sucursal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los status</SelectItem>
            <SelectItem value="por_autorizar">Por autorizar</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_ruta">En ruta</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Vendedor</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Peso</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden md:table-cell">Factura</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos && filteredPedidos.length > 0 ? (
                  filteredPedidos.map((pedido) => (
                    <TableRow key={pedido.id} className="group">
                      <TableCell className="font-mono font-medium">{pedido.folio}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[150px]">
                            {pedido.clientes?.nombre || "—"}
                          </p>
                          {pedido.cliente_sucursales && (
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {pedido.cliente_sucursales.nombre}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {pedido.profiles?.full_name || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {format(new Date(pedido.fecha_pedido), "dd/MM/yy", { locale: es })}
                      </TableCell>
                      <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                      <TableCell className="text-right hidden lg:table-cell font-mono">
                        {pedido.peso_total_kg ? `${pedido.peso_total_kg.toLocaleString()} kg` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${formatCurrency(pedido.total)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getFacturaStatus(pedido.facturas)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVerDetalle(pedido)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleIrAPedidos}
                            title="Imprimir remisión"
                            disabled={pedido.status === "cancelado"}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/facturas")}
                            title="Generar factura"
                            disabled={pedido.status === "cancelado" || pedido.status === "por_autorizar"}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron pedidos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedPedido && (
        <PedidoDetalleDialog
          open={showDetalle}
          onOpenChange={setShowDetalle}
          pedidoId={selectedPedido.id}
        />
      )}
    </div>
  );
};