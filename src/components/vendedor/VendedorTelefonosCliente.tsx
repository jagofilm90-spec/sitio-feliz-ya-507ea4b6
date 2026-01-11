import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Plus, Trash2 } from "lucide-react";

export interface TelefonoCliente {
  telefono: string;
  etiqueta: string;
  esPrincipal: boolean;
}

interface VendedorTelefonosClienteProps {
  telefonos: TelefonoCliente[];
  onChange: (telefonos: TelefonoCliente[]) => void;
}

const ETIQUETAS_TELEFONO = [
  "Principal",
  "WhatsApp",
  "Oficina",
  "Celular",
  "Casa",
  "Otro"
];

export function VendedorTelefonosCliente({ telefonos, onChange }: VendedorTelefonosClienteProps) {
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("Principal");

  const handleAddTelefono = () => {
    if (!nuevoTelefono.trim()) return;
    
    const nuevo: TelefonoCliente = {
      telefono: nuevoTelefono.trim(),
      etiqueta: nuevaEtiqueta,
      esPrincipal: telefonos.length === 0 // Primero es principal por default
    };
    
    onChange([...telefonos, nuevo]);
    setNuevoTelefono("");
    setNuevaEtiqueta("Principal");
  };

  const handleRemoveTelefono = (index: number) => {
    const nuevos = telefonos.filter((_, i) => i !== index);
    // Si quitamos el principal, hacer el primero principal
    if (telefonos[index].esPrincipal && nuevos.length > 0) {
      nuevos[0].esPrincipal = true;
    }
    onChange(nuevos);
  };

  const handleSetPrincipal = (index: number) => {
    const nuevos = telefonos.map((t, i) => ({
      ...t,
      esPrincipal: i === index
    }));
    onChange(nuevos);
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium flex items-center gap-2">
        <Phone className="h-4 w-4" />
        Teléfonos
      </Label>

      {/* Lista de teléfonos existentes */}
      {telefonos.length > 0 && (
        <div className="space-y-2">
          {telefonos.map((tel, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tel.telefono}</span>
                  <span className="text-xs px-2 py-0.5 bg-background rounded-full text-muted-foreground">
                    {tel.etiqueta}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Checkbox
                    id={`principal-${index}`}
                    checked={tel.esPrincipal}
                    onCheckedChange={() => handleSetPrincipal(index)}
                  />
                  <label 
                    htmlFor={`principal-${index}`}
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Principal
                  </label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveTelefono(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulario para agregar nuevo teléfono */}
      <div className="flex gap-2">
        <Input
          type="tel"
          placeholder="Número de teléfono"
          value={nuevoTelefono}
          onChange={(e) => setNuevoTelefono(e.target.value)}
          className="flex-1 h-12"
        />
        <Select value={nuevaEtiqueta} onValueChange={setNuevaEtiqueta}>
          <SelectTrigger className="w-32 h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ETIQUETAS_TELEFONO.map(etiqueta => (
              <SelectItem key={etiqueta} value={etiqueta}>
                {etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12"
          onClick={handleAddTelefono}
          disabled={!nuevoTelefono.trim()}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
