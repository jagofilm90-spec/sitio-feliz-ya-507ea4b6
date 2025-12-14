import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, ChevronDown, AlertTriangle, Calendar, Gift } from "lucide-react";

interface LoteDisponible {
  id: string;
  lote_referencia: string | null;
  cantidad_disponible: number;
  fecha_caducidad: string | null;
}

interface ProductoCarga {
  id: string;
  pedido_detalle_id: string;
  cantidad_solicitada: number;
  cantidad_cargada: number | null;
  cargado: boolean;
  lote_id: string | null;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    unidad_comercial: string;
  };
  lotes_disponibles: LoteDisponible[];
}

export interface CargaProductosChecklistProps {
  productos: ProductoCarga[];
  onToggle: (
    cargaId: string,
    cargado: boolean,
    cantidadCargada: number,
    loteId: string | null
  ) => void;
  disabled?: boolean;
  isCortesia?: boolean;
}

export const CargaProductosChecklist = ({
  productos,
  onToggle,
  disabled = false,
  isCortesia = false,
}: CargaProductosChecklistProps) => {
  return (
    <div className="space-y-2">
      {productos.map((producto) => (
        <ProductoItem
          key={producto.id}
          producto={producto}
          onToggle={onToggle}
          disabled={disabled}
          isCortesia={isCortesia}
        />
      ))}
    </div>
  );
};

const ProductoItem = ({
  producto,
  onToggle,
  disabled,
  isCortesia = false,
}: {
  producto: ProductoCarga;
  onToggle: CargaProductosChecklistProps["onToggle"];
  disabled: boolean;
  isCortesia?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cantidadCargada, setCantidadCargada] = useState(
    producto.cantidad_cargada || producto.cantidad_solicitada
  );
  const [loteSeleccionado, setLoteSeleccionado] = useState(
    producto.lote_id || (producto.lotes_disponibles[0]?.id ?? null)
  );

  // Lote sugerido por FIFO (el primero que tiene fecha de caducidad más próxima)
  const loteFIFO = producto.lotes_disponibles[0];

  const handleCheckChange = (checked: boolean) => {
    onToggle(producto.id, checked, cantidadCargada, loteSeleccionado);
  };

  const handleCantidadChange = (value: string) => {
    const cantidad = parseFloat(value) || 0;
    setCantidadCargada(cantidad);
    if (producto.cargado) {
      onToggle(producto.id, true, cantidad, loteSeleccionado);
    }
  };

  const handleLoteChange = (loteId: string) => {
    setLoteSeleccionado(loteId);
    if (producto.cargado) {
      onToggle(producto.id, true, cantidadCargada, loteId);
    }
  };

  const loteActual = producto.lotes_disponibles.find(
    (l) => l.id === loteSeleccionado
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={`border rounded-lg transition-colors ${
          producto.cargado
            ? isCortesia
              ? "bg-amber-100 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
              : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
            : isCortesia
              ? "bg-amber-50 border-amber-200"
              : "bg-card border-border"
        }`}
      >
        {/* Línea principal - optimizada para tablet */}
        <div className="flex items-center gap-4 p-5">
          <Checkbox
            checked={producto.cargado}
            onCheckedChange={handleCheckChange}
            disabled={disabled}
            className="h-8 w-8 rounded-md border-2"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isCortesia && <Gift className="w-4 h-4 text-amber-600" />}
              <span className="font-medium text-base">
                {producto.cantidad_solicitada} {producto.producto.unidad_comercial}
              </span>
              <span className="text-sm text-muted-foreground">
                {producto.producto.codigo}
              </span>
              {isCortesia && (
                <Badge className="bg-amber-500 text-white text-xs">CORTESÍA</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {producto.producto.nombre}
            </p>
          </div>

          {/* FIFO Badge */}
          {loteFIFO && (
            <Badge
              variant="outline"
              className="text-xs whitespace-nowrap flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              {loteFIFO.fecha_caducidad
                ? format(new Date(loteFIFO.fecha_caducidad), "dd/MMM/yy", {
                    locale: es,
                  })
                : "Sin cad."}
            </Badge>
          )}

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-12 w-12">
              <ChevronDown
                className={`w-6 h-6 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Detalles expandibles */}
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border/50">
            {/* Cantidad real cargada - optimizada para tablet */}
            <div className="flex items-center gap-4 mt-3">
              <label className="text-base text-muted-foreground whitespace-nowrap">
                Cantidad cargada:
              </label>
              <Input
                type="number"
                inputMode="numeric"
                value={cantidadCargada}
                onChange={(e) => handleCantidadChange(e.target.value)}
                className="w-28 h-14 text-center text-xl font-medium"
                disabled={disabled}
              />
              <span className="text-sm text-muted-foreground">
                de {producto.cantidad_solicitada} solicitados
              </span>
              {cantidadCargada !== producto.cantidad_solicitada && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Diferencia
                </Badge>
              )}
            </div>

            {/* Selector de lote FIFO */}
            {producto.lotes_disponibles.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Seleccionar lote (FIFO sugerido primero):
                </label>
                <Select
                  value={loteSeleccionado || ""}
                  onValueChange={handleLoteChange}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-14 text-base">
                    <SelectValue placeholder="Seleccionar lote" />
                  </SelectTrigger>
                  <SelectContent>
                    {producto.lotes_disponibles.map((lote, index) => (
                      <SelectItem
                        key={lote.id}
                        value={lote.id}
                        className="py-3"
                      >
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">
                              FIFO
                            </Badge>
                          )}
                          <span>{lote.lote_referencia || "Sin ref."}</span>
                          <span className="text-muted-foreground">
                            - {lote.cantidad_disponible} disponibles
                          </span>
                          {lote.fecha_caducidad && (
                            <span className="text-muted-foreground">
                              (Cad:{" "}
                              {format(
                                new Date(lote.fecha_caducidad),
                                "dd/MM/yyyy"
                              )}
                              )
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {producto.lotes_disponibles.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4" />
                No hay lotes disponibles para este producto
              </div>
            )}

            {/* Info del lote actual */}
            {loteActual && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="w-4 h-4" />
                  <span>
                    Lote: {loteActual.lote_referencia || "Sin referencia"}
                  </span>
                  <span>•</span>
                  <span>{loteActual.cantidad_disponible} disponibles</span>
                  {loteActual.fecha_caducidad && (
                    <>
                      <span>•</span>
                      <span>
                        Caduca:{" "}
                        {format(new Date(loteActual.fecha_caducidad), "dd/MM/yyyy")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
