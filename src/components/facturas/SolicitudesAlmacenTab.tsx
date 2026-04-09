import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSolicitudesVenta, SolicitudVenta } from "@/hooks/useSolicitudesVenta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, Clock, CheckCircle2, AlertCircle, Loader2, 
  Package, FileText, Eye, Banknote, Building2, Truck
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ProcesarSolicitudDialog } from "./ProcesarSolicitudDialog";

export const SolicitudesAlmacenTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudVenta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { solicitudes, loading, pendingCount, refresh } = useSolicitudesVenta();

  // Filter solicitudes
  const filteredSolicitudes = solicitudes.filter(s =>
    s.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.productos_solicitados.some(p => 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Group by status
  const pendientes = filteredSolicitudes.filter(s => s.status === 'pendiente' || s.status === 'procesando');
  const listas = filteredSolicitudes.filter(s => s.status === 'lista');
  const pagadas = filteredSolicitudes.filter(s => s.status === 'pagada');
  const entregadas = filteredSolicitudes.filter(s => s.status === 'entregada');

  // Open dialog to process
  const handleProcesar = (solicitud: SolicitudVenta) => {
    setSelectedSolicitud(solicitud);
    setDialogOpen(true);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      case 'procesando':
        return <Badge className="bg-blue-500 text-white"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Procesando</Badge>;
      case 'lista':
        return <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" /> Lista</Badge>;
      case 'pagada':
        return <Badge className="bg-primary text-primary-foreground"><Banknote className="w-3 h-3 mr-1" /> Pagada</Badge>;
      case 'entregada':
        return <Badge variant="outline"><Truck className="w-3 h-3 mr-1" /> Entregada</Badge>;
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Render solicitud card
  const SolicitudCard = ({ solicitud, showActions = true }: { solicitud: SolicitudVenta; showActions?: boolean }) => (
    <Card className={`overflow-hidden ${solicitud.status === 'pendiente' ? 'border-yellow-500 border-2' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="font-mono font-bold text-lg">{solicitud.folio}</span>
            <p className="text-sm text-muted-foreground">
              {format(new Date(solicitud.fecha_solicitud), "dd/MM/yyyy HH:mm", { locale: es })}
            </p>
          </div>
          {getStatusBadge(solicitud.status)}
        </div>

        {/* Solicitante */}
        {solicitud.solicitante && (
          <p className="text-sm text-muted-foreground mb-2">
            Solicitó: {solicitud.solicitante.nombre_completo}
          </p>
        )}

        {/* Products */}
        <div className="space-y-1 mb-3">
          {solicitud.productos_solicitados.map((producto, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="truncate max-w-[70%]">{producto.cantidad}x {producto.nombre}</span>
              {producto.precio_unitario && (
                <span className="text-muted-foreground">
                  ${(producto.cantidad * producto.precio_unitario).toLocaleString('es-MX')}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        {solicitud.total && (
          <div className="text-lg font-bold text-primary border-t pt-2">
            Total: ${Number(solicitud.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
        )}

        {/* Factura info */}
        {solicitud.factura && (
          <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Factura: {solicitud.factura.folio}
          </div>
        )}

        {/* Payment info */}
        {solicitud.forma_pago && (
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            {solicitud.forma_pago === 'efectivo' ? (
              <Banknote className="w-3 h-3" />
            ) : (
              <Building2 className="w-3 h-3" />
            )}
            {solicitud.forma_pago === 'efectivo' ? 'Efectivo' : `Transferencia: ${solicitud.referencia_pago || ''}`}
          </div>
        )}

        {/* Actions */}
        {showActions && solicitud.status === 'pendiente' && (
          <Button 
            className="w-full mt-3"
            onClick={() => handleProcesar(solicitud)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Procesar y Facturar
          </Button>
        )}

        {showActions && solicitud.status === 'procesando' && (
          <Button 
            className="w-full mt-3"
            variant="secondary"
            onClick={() => handleProcesar(solicitud)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Continuar Procesando
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with pending count */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800">
              {pendingCount} solicitud{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-yellow-600">
              Almacén está esperando que proceses estas ventas
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por folio o producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Pendientes */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              Pendientes
              {pendientes.length > 0 && (
                <Badge variant="secondary">{pendientes.length}</Badge>
              )}
            </h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-2">
                {pendientes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin solicitudes pendientes
                  </p>
                ) : (
                  pendientes.map(s => <SolicitudCard key={s.id} solicitud={s} />)
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Listas (esperando pago) */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Listas
              {listas.length > 0 && (
                <Badge variant="secondary">{listas.length}</Badge>
              )}
            </h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-2">
                {listas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin solicitudes listas
                  </p>
                ) : (
                  listas.map(s => <SolicitudCard key={s.id} solicitud={s} showActions={false} />)
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Pagadas */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-primary" />
              Pagadas
              {pagadas.length > 0 && (
                <Badge variant="secondary">{pagadas.length}</Badge>
              )}
            </h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-2">
                {pagadas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin solicitudes pagadas
                  </p>
                ) : (
                  pagadas.map(s => <SolicitudCard key={s.id} solicitud={s} showActions={false} />)
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Entregadas (últimas 10) */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Entregadas
              {entregadas.length > 0 && (
                <Badge variant="outline">{entregadas.length}</Badge>
              )}
            </h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-2">
                {entregadas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin entregas hoy
                  </p>
                ) : (
                  entregadas.slice(0, 10).map(s => <SolicitudCard key={s.id} solicitud={s} showActions={false} />)
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Process Dialog */}
      <ProcesarSolicitudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        solicitud={selectedSolicitud}
        onSuccess={() => {
          setDialogOpen(false);
          refresh();
        }}
      />
    </div>
  );
};
