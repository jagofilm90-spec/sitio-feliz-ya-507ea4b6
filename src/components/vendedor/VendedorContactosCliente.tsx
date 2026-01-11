import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Plus, Trash2 } from "lucide-react";

export interface ContactoCliente {
  nombre: string;
  puesto: string;
  esPrincipal: boolean;
}

interface VendedorContactosClienteProps {
  contactos: ContactoCliente[];
  onChange: (contactos: ContactoCliente[]) => void;
}

const PUESTOS_CONTACTO = [
  "Comprador",
  "Gerente",
  "Encargado",
  "Dueño",
  "Administrador",
  "Recepción",
  "Almacén",
  "Otro"
];

export function VendedorContactosCliente({ contactos, onChange }: VendedorContactosClienteProps) {
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPuesto, setNuevoPuesto] = useState("Comprador");

  const handleAddContacto = () => {
    if (!nuevoNombre.trim()) return;
    
    const nuevo: ContactoCliente = {
      nombre: nuevoNombre.trim(),
      puesto: nuevoPuesto,
      esPrincipal: contactos.length === 0 // Primero es principal por default
    };
    
    onChange([...contactos, nuevo]);
    setNuevoNombre("");
    setNuevoPuesto("Comprador");
  };

  const handleRemoveContacto = (index: number) => {
    const nuevos = contactos.filter((_, i) => i !== index);
    // Si quitamos el principal, hacer el primero principal
    if (contactos[index].esPrincipal && nuevos.length > 0) {
      nuevos[0].esPrincipal = true;
    }
    onChange(nuevos);
  };

  const handleSetPrincipal = (index: number) => {
    const nuevos = contactos.map((c, i) => ({
      ...c,
      esPrincipal: i === index
    }));
    onChange(nuevos);
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium flex items-center gap-2">
        <User className="h-4 w-4" />
        Contactos
      </Label>

      {/* Lista de contactos existentes */}
      {contactos.length > 0 && (
        <div className="space-y-2">
          {contactos.map((contacto, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{contacto.nombre}</span>
                  <span className="text-xs px-2 py-0.5 bg-background rounded-full text-muted-foreground">
                    {contacto.puesto}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Checkbox
                    id={`contacto-principal-${index}`}
                    checked={contacto.esPrincipal}
                    onCheckedChange={() => handleSetPrincipal(index)}
                  />
                  <label 
                    htmlFor={`contacto-principal-${index}`}
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
                  onClick={() => handleRemoveContacto(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulario para agregar nuevo contacto */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Nombre del contacto"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          className="flex-1 h-12"
        />
        <Select value={nuevoPuesto} onValueChange={setNuevoPuesto}>
          <SelectTrigger className="w-32 h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PUESTOS_CONTACTO.map(puesto => (
              <SelectItem key={puesto} value={puesto}>
                {puesto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12"
          onClick={handleAddContacto}
          disabled={!nuevoNombre.trim()}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
