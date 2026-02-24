import { Store, ChevronRight, Users, MapPin, Loader2 } from "lucide-react";
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
import { Cliente, Sucursal } from "./types";

// Regions that belong to Valle de México (metropolitan area)
const VALLE_MEXICO_REGIONS = [
  'cdmx_norte', 'cdmx_centro', 'cdmx_sur', 
  'cdmx_oriente', 'cdmx_poniente',
  'edomex_norte', 'edomex_oriente'
];

// Foráneas region labels for grouping
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

interface PasoClienteProps {
  clientes: Cliente[];
  sucursales: Sucursal[];
  selectedClienteId: string;
  selectedSucursalId: string;
  loading: boolean;
  onClienteChange: (clienteId: string) => void;
  onSucursalChange: (sucursalId: string) => void;
  onNext: () => void;
}

export function PasoCliente({
  clientes,
  sucursales,
  selectedClienteId,
  selectedSucursalId,
  loading,
  onClienteChange,
  onSucursalChange,
  onNext,
}: PasoClienteProps) {
  const selectedCliente = clientes.find(c => c.id === selectedClienteId);
  const canContinue = selectedClienteId && (sucursales.length === 0 || selectedSucursalId);

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
  
  // Define order for regions
  const regionOrder = ['valle_mexico', 'toluca', 'morelos', 'puebla', 'hidalgo', 'queretaro', 'tlaxcala', 'sin_zona'];
  const sortedRegions = Object.keys(clientesPorRegion).sort((a, b) => {
    const indexA = regionOrder.indexOf(a);
    const indexB = regionOrder.indexOf(b);
    return (indexA === -1 ? 100 : indexA) - (indexB === -1 ? 100 : indexB);
  });

  const formatCreditTerm = (term: string) => {
    if (term === 'contado') return 'Contado';
    return term.replace('_', ' ');
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

          {/* Selected Client Info */}
          {selectedCliente && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Users className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{selectedCliente.nombre}</p>
              </div>
            </div>
          )}

          {/* Branch Selection */}
          {loading && selectedClienteId && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando sucursales...</span>
            </div>
          )}

          {sucursales.length > 0 && !loading && (
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Sucursal de entrega
              </Label>
              {sucursales.length === 1 ? (
                // Auto-select and show prominently when only one branch
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
