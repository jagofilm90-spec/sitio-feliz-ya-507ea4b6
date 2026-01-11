import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Mail, ChevronDown, ChevronUp } from "lucide-react";

export interface CorreoCliente {
  email: string;
  nombreContacto: string;
  proposito: string;
}

interface VendedorCorreosClienteProps {
  correos: CorreoCliente[];
  onChange: (correos: CorreoCliente[]) => void;
}

const PROPOSITOS = [
  { value: "todo", label: "Todas las notificaciones" },
  { value: "pedidos", label: "Confirmación de pedidos" },
  { value: "en_ruta", label: "Pedido en ruta" },
  { value: "entregado", label: "Pedido entregado" },
  { value: "cobranza", label: "Recordatorios de vencimiento" },
  { value: "cotizaciones", label: "Cotizaciones" },
  { value: "facturas", label: "Facturas" },
  { value: "general", label: "General" },
];

export function VendedorCorreosCliente({ correos, onChange }: VendedorCorreosClienteProps) {
  const [expanded, setExpanded] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNombreContacto, setNewNombreContacto] = useState("");
  const [newProposito, setNewProposito] = useState("todo");

  const handleAddCorreo = () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return;
    }

    const nuevoCorreo: CorreoCliente = {
      email: newEmail.trim(),
      nombreContacto: newNombreContacto.trim(),
      proposito: newProposito,
    };

    onChange([...correos, nuevoCorreo]);
    setNewEmail("");
    setNewNombreContacto("");
    setNewProposito("todo");
    setExpanded(false);
  };

  const handleRemoveCorreo = (index: number) => {
    onChange(correos.filter((_, i) => i !== index));
  };

  const getPropositoLabel = (proposito: string) => {
    return PROPOSITOS.find(p => p.value === proposito)?.label || proposito;
  };

  const getPropositoBadgeVariant = (proposito: string) => {
    switch (proposito) {
      case "todo":
        return "default";
      case "en_ruta":
      case "entregado":
        return "secondary";
      case "cobranza":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Mail className="h-4 w-4" />
        Correos de notificación
      </Label>

      {/* Lista de correos agregados */}
      {correos.length > 0 && (
        <div className="space-y-2">
          {correos.map((correo, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{correo.email}</span>
                  <Badge variant={getPropositoBadgeVariant(correo.proposito)} className="text-xs">
                    {getPropositoLabel(correo.proposito)}
                  </Badge>
                </div>
                {correo.nombreContacto && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {correo.nombreContacto}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveCorreo(index)}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario para agregar */}
      {expanded ? (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
          <div className="space-y-2">
            <Label className="text-xs">Correo electrónico *</Label>
            <Input
              type="email"
              placeholder="correo@ejemplo.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="h-11"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Nombre del contacto (opcional)</Label>
            <Input
              placeholder="Ej: María González"
              value={newNombreContacto}
              onChange={(e) => setNewNombreContacto(e.target.value)}
              className="h-11"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">¿Qué notificaciones recibirá?</Label>
            <Select value={newProposito} onValueChange={setNewProposito}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPOSITOS.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setExpanded(false);
                setNewEmail("");
                setNewNombreContacto("");
                setNewProposito("todo");
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAddCorreo}
              disabled={!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setExpanded(true)}
          className="w-full h-11 text-muted-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          {correos.length === 0 ? "Agregar correo" : "Agregar otro correo"}
        </Button>
      )}

      {correos.length === 0 && !expanded && (
        <p className="text-xs text-muted-foreground">
          Agrega correos para que el cliente reciba notificaciones de sus pedidos
        </p>
      )}
    </div>
  );
}
