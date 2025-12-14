import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  MapPin, 
  Package, 
  Phone, 
  Clock,
  ChevronDown,
  ChevronUp,
  Navigation,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Gift
} from "lucide-react";
import { RegistrarEntregaSheet } from "./RegistrarEntregaSheet";

interface EntregaCardProps {
  entrega: {
    id: string;
    orden_entrega: number;
    entregado: boolean | null;
    status_entrega: string | null;
    nombre_receptor: string | null;
    firma_recibido: string | null;
    hora_entrega_real: string | null;
    notas: string | null;
    pedido: {
      id: string;
      folio: string;
      peso_total_kg: number;
      notas: string | null;
      cliente: {
        id: string;
        nombre: string;
      };
      sucursal: {
        id: string;
        nombre: string;
        direccion: string | null;
        latitud: number | null;
        longitud: number | null;
        telefono: string | null;
        contacto: string | null;
        horario_entrega: string | null;
      } | null;
      detalles: Array<{
        id: string;
        cantidad: number;
        es_cortesia: boolean | null;
        producto: {
          id: string;
          nombre: string;
          unidad_comercial: string;
        };
      }>;
    };
  };
  onEntregaActualizada: () => void;
}

export function EntregaCard({ entrega, onEntregaActualizada }: EntregaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRegistro, setShowRegistro] = useState(false);

  const { pedido } = entrega;
  const sucursal = pedido.sucursal;
  const productos = pedido.detalles.filter(d => !d.es_cortesia);
  const cortesias = pedido.detalles.filter(d => d.es_cortesia);

  const getStatusColor = () => {
    switch (entrega.status_entrega) {
      case "entregado":
        return "bg-green-500/10 border-green-500/30";
      case "rechazado":
        return "bg-destructive/10 border-destructive/30";
      case "parcial":
        return "bg-yellow-500/10 border-yellow-500/30";
      default:
        return "bg-card border-border";
    }
  };

  const getStatusBadge = () => {
    switch (entrega.status_entrega) {
      case "entregado":
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Entregado</Badge>;
      case "rechazado":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rechazado</Badge>;
      case "parcial":
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><AlertCircle className="h-3 w-3 mr-1" /> Parcial</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pendiente</Badge>;
    }
  };

  const handleNavegar = () => {
    if (!sucursal) return;

    const destino = sucursal.latitud && sucursal.longitud
      ? `${sucursal.latitud},${sucursal.longitud}`
      : encodeURIComponent(sucursal.direccion || "");

    // Detectar plataforma
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // Intentar abrir Google Maps primero, luego Apple Maps
      window.location.href = `comgooglemaps://?daddr=${destino}&directionsmode=driving`;
      setTimeout(() => {
        window.location.href = `maps://maps.apple.com/?daddr=${destino}&dirflg=d`;
      }, 500);
    } else {
      // Android y otros
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`, "_blank");
    }
  };

  const isCompletada = entrega.status_entrega && entrega.status_entrega !== "pendiente";

  return (
    <>
      <Card className={`transition-all ${getStatusColor()}`}>
        <CardContent className="p-4">
          {/* Header con número y status */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {entrega.orden_entrega}
              </div>
              <div>
                <h3 className="font-semibold text-base leading-tight">
                  {sucursal?.nombre || pedido.cliente.nombre}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {pedido.cliente.nombre}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Dirección */}
          {sucursal?.direccion && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{sucursal.direccion}</span>
            </div>
          )}

          {/* Info adicional */}
          <div className="flex flex-wrap gap-3 text-sm mb-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{productos.length} productos</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>{pedido.peso_total_kg?.toLocaleString() || 0} kg</span>
            </div>
            {sucursal?.horario_entrega && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{sucursal.horario_entrega}</span>
              </div>
            )}
          </div>

          {/* Detalles expandibles */}
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full mb-3">
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Ocultar productos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Ver productos ({productos.length})
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mb-3">
              {/* Productos normales */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                {productos.map((detalle) => (
                  <div key={detalle.id} className="flex justify-between text-sm">
                    <span className="truncate pr-2">{detalle.producto.nombre}</span>
                    <span className="font-medium whitespace-nowrap">
                      {detalle.cantidad} {detalle.producto.unidad_comercial}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cortesías */}
              {cortesias.length > 0 && (
                <div className="bg-green-500/10 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                    <Gift className="h-4 w-4" />
                    Cortesías
                  </div>
                  {cortesias.map((detalle) => (
                    <div key={detalle.id} className="flex justify-between text-sm">
                      <span className="truncate pr-2">{detalle.producto.nombre}</span>
                      <span className="font-medium whitespace-nowrap">
                        {detalle.cantidad} {detalle.producto.unidad_comercial}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Contacto */}
              {sucursal?.telefono && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${sucursal.telefono}`} className="text-primary hover:underline">
                    {sucursal.telefono}
                  </a>
                  {sucursal.contacto && (
                    <span className="text-muted-foreground">({sucursal.contacto})</span>
                  )}
                </div>
              )}

              {/* Notas */}
              {(pedido.notas || entrega.notas) && (
                <div className="text-sm text-muted-foreground bg-yellow-500/10 p-2 rounded">
                  <strong>Notas:</strong> {pedido.notas || entrega.notas}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleNavegar}
              disabled={!sucursal?.direccion && !sucursal?.latitud}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Navegar
            </Button>
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => setShowRegistro(true)}
              disabled={isCompletada}
              variant={isCompletada ? "secondary" : "default"}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isCompletada ? "Registrado" : "Entregar"}
            </Button>
          </div>

          {/* Info de entrega completada */}
          {isCompletada && entrega.nombre_receptor && (
            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
              <p>Recibió: <span className="font-medium text-foreground">{entrega.nombre_receptor}</span></p>
              {entrega.hora_entrega_real && (
                <p>Hora: {new Date(entrega.hora_entrega_real).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <RegistrarEntregaSheet
        open={showRegistro}
        onOpenChange={setShowRegistro}
        entrega={entrega}
        onSuccess={onEntregaActualizada}
      />
    </>
  );
}
