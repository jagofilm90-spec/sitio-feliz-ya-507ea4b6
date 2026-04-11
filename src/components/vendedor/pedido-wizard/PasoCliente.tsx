import { useState, useEffect } from "react";
import { Store, ChevronRight, Users, MapPin, Loader2, AlertTriangle, CheckCircle, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { Cliente, Sucursal } from "./types";

const CREDIT_OPTIONS = [
  { value: "contado", label: "Contado" },
  { value: "8_dias", label: "8 días" },
  { value: "15_dias", label: "15 días" },
  { value: "30_dias", label: "30 días" },
  { value: "60_dias", label: "60 días" },
];

// Regions that belong to Valle de México (metropolitan area)
const VALLE_MEXICO_REGIONS = [
  'cdmx_norte', 'cdmx_centro', 'cdmx_sur', 
  'cdmx_oriente', 'cdmx_poniente',
  'edomex_norte', 'edomex_oriente'
];

const REGION_LABELS: Record<string, string> = {
  'valle_mexico': 'Valle de México',
  'toluca': 'Toluca',
  'morelos': 'Morelos',
  'puebla': 'Puebla',
  'hidalgo': 'Hidalgo',
  'queretaro': 'Querétaro',
  'tlaxcala': 'Tlaxcala',
  'sin_zona': 'Sin zona asignada',
};

type SemaforoColor = 'verde' | 'amarillo' | 'rojo';

interface SemaforoData {
  color: SemaforoColor;
  label: string;
  mensaje: string;
  saldoPendiente: number;
  limiteCredito: number | null;
  creditoDisponible: number | null;
  facturasVencidas: number;
  facturasPorVencer: number;
}

interface PasoClienteProps {
  clientes: Cliente[];
  sucursales: Sucursal[];
  selectedClienteId: string;
  selectedSucursalId: string;
  terminoCredito: string;
  loading: boolean;
  onClienteChange: (clienteId: string) => void;
  onSucursalChange: (sucursalId: string) => void;
  onTerminoCreditoChange: (term: string) => void;
  onNext: () => void;
}

export function PasoCliente({
  clientes,
  sucursales,
  selectedClienteId,
  selectedSucursalId,
  terminoCredito,
  loading,
  onClienteChange,
  onSucursalChange,
  onTerminoCreditoChange,
  onNext,
}: PasoClienteProps) {
  const selectedCliente = clientes.find(c => c.id === selectedClienteId);
  const selectedSucursal = sucursales.find(s => s.id === selectedSucursalId);
  const canContinue = selectedClienteId && (sucursales.length === 0 || selectedSucursalId) && !!terminoCredito;
  const direccionEntrega = selectedSucursal?.direccion || selectedCliente?.direccion || null;

  const [semaforo, setSemaforo] = useState<SemaforoData | null>(null);
  const [loadingSemaforo, setLoadingSemaforo] = useState(false);

  // Fetch semaphore data when client changes
  useEffect(() => {
    if (!selectedClienteId) {
      setSemaforo(null);
      return;
    }
    
    const fetchSemaforo = async () => {
      setLoadingSemaforo(true);
      try {
        const hoy = new Date().toISOString().split('T')[0];
        const en7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Parallel queries
        const [clienteRes, vencidasRes, porVencerRes] = await Promise.all([
          supabase
            .from("clientes")
            .select("saldo_pendiente, limite_credito")
            .eq("id", selectedClienteId)
            .single(),
          supabase
            .from("facturas")
            .select("id", { count: "exact", head: true })
            .eq("cliente_id", selectedClienteId)
            .eq("pagada", false)
            .lt("fecha_vencimiento", hoy),
          supabase
            .from("facturas")
            .select("id", { count: "exact", head: true })
            .eq("cliente_id", selectedClienteId)
            .eq("pagada", false)
            .gte("fecha_vencimiento", hoy)
            .lte("fecha_vencimiento", en7Dias),
        ]);

        const saldoPendiente = clienteRes.data?.saldo_pendiente || 0;
        const limiteCredito = clienteRes.data?.limite_credito || null;
        const facturasVencidas = vencidasRes.count || 0;
        const facturasPorVencer = porVencerRes.count || 0;

        let color: SemaforoColor = 'verde';
        let label = 'Buen pagador';
        let mensaje = 'Todos sus pagos al corriente';

        if (facturasVencidas > 0) {
          color = 'rojo';
          label = 'Saldo vencido';
          mensaje = `${facturasVencidas} factura${facturasVencidas > 1 ? 's' : ''} vencida${facturasVencidas > 1 ? 's' : ''}`;
        } else if (facturasPorVencer > 0) {
          color = 'amarillo';
          label = 'Revisar';
          mensaje = `${facturasPorVencer} factura${facturasPorVencer > 1 ? 's' : ''} por vencer en 7 días`;
        }

        setSemaforo({
          color,
          label,
          mensaje,
          saldoPendiente,
          limiteCredito,
          creditoDisponible: limiteCredito ? Math.max(0, limiteCredito - saldoPendiente) : null,
          facturasVencidas,
          facturasPorVencer,
        });
      } catch (err) {
        console.error("Error fetching semaforo:", err);
      } finally {
        setLoadingSemaforo(false);
      }
    };

    fetchSemaforo();
  }, [selectedClienteId]);

  // Group clients by region
  const clientesPorRegion: Record<string, Cliente[]> = {};
  clientes.forEach(cliente => {
    const region = cliente.zona?.region;
    let groupKey: string;
    
    if (!region) {
      groupKey = 'sin_zona';
    } else if (VALLE_MEXICO_REGIONS.includes(region)) {
      groupKey = 'valle_mexico';
    } else {
      groupKey = region;
    }
    
    if (!clientesPorRegion[groupKey]) {
      clientesPorRegion[groupKey] = [];
    }
    clientesPorRegion[groupKey].push(cliente);
  });
  
  const regionOrder = ['valle_mexico', 'toluca', 'morelos', 'puebla', 'hidalgo', 'queretaro', 'tlaxcala', 'sin_zona'];
  const sortedRegions = Object.keys(clientesPorRegion).sort((a, b) => {
    const indexA = regionOrder.indexOf(a);
    const indexB = regionOrder.indexOf(b);
    return (indexA === -1 ? 100 : indexA) - (indexB === -1 ? 100 : indexB);
  });

  const getSemaforoStyles = (color: SemaforoColor) => {
    switch (color) {
      case 'verde':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          icon: <CheckCircle className="h-5 w-5" />,
          dot: '🟢',
        };
      case 'amarillo':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          icon: <Clock className="h-5 w-5" />,
          dot: '🟡',
        };
      case 'rojo':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: <AlertTriangle className="h-5 w-5" />,
          dot: '🔴',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          ¿Quién compra?
        </h2>
        <p className="text-muted-foreground">
          Selecciona el cliente y la sucursal de entrega
        </p>
      </div>

      {/* Client Selection */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium flex items-center gap-2">
              <Store className="h-4 w-4" />
              Cliente
            </Label>
            <Select value={selectedClienteId} onValueChange={onClienteChange}>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {clientes.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No tienes clientes asignados
                  </div>
                ) : (
                  sortedRegions.map(regionKey => (
                    <SelectGroup key={regionKey}>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2 bg-muted/50">
                        {REGION_LABELS[regionKey] || regionKey}
                      </SelectLabel>
                      {clientesPorRegion[regionKey].map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id} className="text-base py-3">
                          <span>{cliente.nombre}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Client Info + Semaphore */}
          {selectedCliente && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <Users className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{selectedCliente.nombre}</p>
                </div>
              </div>

              {/* Payment Semaphore */}
              {loadingSemaforo ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                  <span className="text-sm text-muted-foreground">Consultando estado de pago...</span>
                </div>
              ) : semaforo && (
                <div className={`p-4 rounded-lg border ${getSemaforoStyles(semaforo.color).bg} ${getSemaforoStyles(semaforo.color).border}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-lg">{getSemaforoStyles(semaforo.color).dot}</span>
                    <div className={`flex-1 ${getSemaforoStyles(semaforo.color).text}`}>
                      <p className="font-semibold">{semaforo.label}</p>
                      <p className="text-sm">{semaforo.mensaje}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Saldo pendiente</p>
                      <p className={`font-semibold ${semaforo.saldoPendiente > 0 ? getSemaforoStyles(semaforo.color).text : ''}`}>
                        {formatCurrency(semaforo.saldoPendiente)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Crédito disponible</p>
                      <p className="font-semibold">
                        {semaforo.creditoDisponible !== null 
                          ? formatCurrency(semaforo.creditoDisponible)
                          : "Sin límite"}
                      </p>
                    </div>
                  </div>

                  {semaforo.color === 'rojo' && (
                    <div className="mt-3 p-2 rounded bg-red-100 text-red-800 text-sm flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Este cliente tiene saldo vencido. Considera solicitar pago antes de continuar.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Branch Selection */}
          {loading && selectedClienteId && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando sucursales...</span>
            </div>
          )}

          {/* Plazo de pago */}
          {selectedClienteId && (
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Plazo de pago
              </Label>
              <Select value={terminoCredito} onValueChange={onTerminoCreditoChange}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Seleccionar plazo..." />
                </SelectTrigger>
                <SelectContent>
                  {CREDIT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-base py-2">
                      {opt.label}
                      {selectedCliente?.termino_credito === opt.value && (
                        <span className="text-xs text-muted-foreground ml-2">(default del cliente)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Delivery address (visible confirmation) */}
          {selectedClienteId && direccionEntrega && (
            <div className="rounded-lg border border-ink-100 bg-ink-50/50 p-3">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-ink-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-ink-400 font-medium mb-0.5">
                    Dirección de entrega
                  </p>
                  <p className="text-ink-800">{direccionEntrega}</p>
                </div>
              </div>
            </div>
          )}

          {sucursales.length > 0 && !loading && (
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Sucursal de entrega
              </Label>
              {sucursales.length === 1 ? (
                <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                  <p className="font-semibold text-lg">{sucursales[0].nombre}</p>
                  {sucursales[0].direccion && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {sucursales[0].direccion}
                    </p>
                  )}
                </div>
              ) : (
                <Select value={selectedSucursalId} onValueChange={onSucursalChange}>
                  <SelectTrigger className="h-auto min-h-[3.5rem] text-base py-3">
                    <SelectValue placeholder="Seleccionar sucursal...">
                      {selectedSucursalId && (() => {
                        const sel = sucursales.find(s => s.id === selectedSucursalId);
                        if (!sel) return null;
                        return (
                          <div className="text-left">
                            <span className="font-medium">{sel.nombre}</span>
                            {sel.direccion && (
                              <span className="text-muted-foreground text-sm block">{sel.direccion}</span>
                            )}
                          </div>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales.map((sucursal) => (
                      <SelectItem key={sucursal.id} value={sucursal.id} className="text-base py-3">
                        <div>
                          <span className="font-medium">{sucursal.nombre}</span>
                          {sucursal.direccion && (
                            <span className="text-muted-foreground text-sm block">
                              {sucursal.direccion}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Continue Button */}
      <Button 
        onClick={onNext} 
        disabled={!canContinue}
        size="lg"
        className="w-full h-14 text-lg font-semibold"
      >
        Continuar
        <ChevronRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );
}
