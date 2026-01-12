import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  onClienteActualizado: () => void;
}

interface Zona {
  id: string;
  nombre: string;
}

export function EditarClienteSheet({ open, onOpenChange, clienteId, onClienteActualizado }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zonas, setZonas] = useState<Zona[]>([]);
  
  // Form fields
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [zonaId, setZonaId] = useState<string | null>(null);
  
  // Read-only fields for display
  const [codigo, setCodigo] = useState("");
  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");

  useEffect(() => {
    if (open && clienteId) {
      fetchCliente();
      fetchZonas();
    }
  }, [open, clienteId]);

  const fetchZonas = async () => {
    const { data } = await supabase
      .from("zonas")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre");
    setZonas(data || []);
  };

  const fetchCliente = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", clienteId)
        .single();

      if (error) throw error;

      setNombre(data.nombre || "");
      setTelefono(data.telefono || "");
      setEmail(data.email || "");
      setDireccion(data.direccion || "");
      setZonaId(data.zona_id || null);
      setCodigo(data.codigo || "");
      setRfc(data.rfc || "");
      setRazonSocial(data.razon_social || "");
    } catch (error) {
      console.error("Error fetching cliente:", error);
      toast.error("Error al cargar datos del cliente");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("clientes")
        .update({
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          email: email.trim() || null,
          direccion: direccion.trim() || null,
          zona_id: zonaId || null,
        })
        .eq("id", clienteId);

      if (error) throw error;

      toast.success("Cliente actualizado correctamente");
      onClienteActualizado();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating cliente:", error);
      toast.error("Error al actualizar el cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Cliente</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-6">
            {/* Read-only info */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Código:</span> {codigo}
              </p>
              {rfc && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">RFC:</span> {rfc}
                </p>
              )}
              {razonSocial && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Razón Social:</span> {razonSocial}
                </p>
              )}
              <p className="text-xs text-muted-foreground italic mt-2">
                Los datos fiscales solo pueden ser modificados por administración.
              </p>
            </div>

            {/* Editable fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre comercial *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 5512345678"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Textarea
                  id="direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Dirección del cliente"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Zona de entrega</Label>
                <Select 
                  value={zonaId || "none"} 
                  onValueChange={(val) => setZonaId(val === "none" ? null : val)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Seleccionar zona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin zona asignada</SelectItem>
                    {zonas.map((zona) => (
                      <SelectItem key={zona.id} value={zona.id}>
                        {zona.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Save button */}
            <Button 
              className="w-full h-14 text-lg"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
