import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { X, Truck } from "lucide-react";

export interface PuntoEntrega {
  codigoSucursal: string;
  nombre: string;
  entregarEnFiscal: boolean;
  direccion: string;
  contacto: string;
  telefono: string;
  horarioEntrega: string;
}

interface PuntoEntregaCardProps {
  punto: PuntoEntrega;
  index: number;
  total: number;
  direccionFiscal: string;
  onChange: (index: number, field: keyof PuntoEntrega, value: string | boolean) => void;
  onRemove: (index: number) => void;
}

const LABELS = ["uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];

export function PuntoEntregaCard({ punto, index, total, direccionFiscal, onChange, onRemove }: PuntoEntregaCardProps) {
  const label = LABELS[index] || `${index + 1}`;

  const previewText = (() => {
    const code = punto.codigoSucursal?.trim();
    const name = punto.nombre?.trim();
    if (code && name) return `#${code} ${name}`;
    if (code) return `#${code}`;
    if (name) return name;
    return "(sin identificador)";
  })();

  return (
    <Card className="border border-border bg-card">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium">
            Punto <span className="italic">{label}</span>
            {index === 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                Matriz
              </span>
            )}
          </h4>
          {index > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="text-muted-foreground hover:text-destructive h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Quitar
            </Button>
          )}
        </div>

        {/* Checkbox entregar en fiscal */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <Checkbox
            checked={punto.entregarEnFiscal}
            onCheckedChange={(checked) => onChange(index, "entregarEnFiscal", !!checked)}
            className="mt-0.5"
          />
          <div>
            <span className="text-sm font-medium text-foreground">Entregar en la dirección fiscal</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              La dirección del RFC. Destildar si la entrega va a otro lado.
            </p>
          </div>
        </label>

        {/* Dirección de entrega (solo si no es fiscal) */}
        {!punto.entregarEnFiscal && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Dirección de entrega <span className="text-primary">*</span>
            </label>
            <Textarea
              value={punto.direccion}
              onChange={(e) => onChange(index, "direccion", e.target.value)}
              placeholder="Calle, número, colonia, CP, ciudad..."
              className="mt-1 min-h-[60px] resize-none"
            />
          </div>
        )}

        {/* Código + Nombre */}
        <div className="grid grid-cols-[100px_1fr] gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              # sucursal
            </label>
            <Input
              value={punto.codigoSucursal}
              onChange={(e) => onChange(index, "codigoSucursal", e.target.value)}
              placeholder="7"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nombre de la sucursal o punto
            </label>
            <Input
              value={punto.nombre}
              onChange={(e) => onChange(index, "nombre", e.target.value)}
              placeholder="BOSQUES"
              className="mt-1"
            />
          </div>
        </div>

        {/* Preview chofer */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded">
          <Truck className="h-3.5 w-3.5 shrink-0" />
          <span>Así lo verán los choferes en su ruta: <strong className="text-foreground">{previewText}</strong></span>
        </div>

        {/* Contacto + Teléfono */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Persona de contacto
            </label>
            <Input
              value={punto.contacto}
              onChange={(e) => onChange(index, "contacto", e.target.value)}
              placeholder="Sra. Lupita"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Teléfono
            </label>
            <Input
              value={punto.telefono}
              onChange={(e) => onChange(index, "telefono", e.target.value)}
              placeholder="55 1234 5678"
              className="mt-1"
            />
          </div>
        </div>

        {/* Horario */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Horario de entrega
          </label>
          <Input
            value={punto.horarioEntrega}
            onChange={(e) => onChange(index, "horarioEntrega", e.target.value)}
            placeholder="6am - 2pm"
            className="mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
