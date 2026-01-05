import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import GoogleMapsAddressAutocomplete from "@/components/GoogleMapsAddressAutocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClienteCreado: () => void;
}

interface Zona {
  id: string;
  nombre: string;
}

export function VendedorNuevoClienteSheet({ open, onOpenChange, onClienteCreado }: Props) {
  const [loading, setLoading] = useState(false);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    latitud: null as number | null,
    longitud: null as number | null,
    zona_id: "",
    notas: ""
  });

  // Load zones when sheet opens
  const handleOpenChange = async (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && zonas.length === 0) {
      const { data } = await supabase
        .from("zonas")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");
      setZonas(data || []);
    }
  };

  const handleAddressChange = async (address: string, placeId?: string) => {
    setFormData(prev => ({
      ...prev,
      direccion: address,
      latitud: null,
      longitud: null
    }));

    // If we have a placeId, fetch coordinates
    if (placeId) {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-place-details?place_id=${encodeURIComponent(placeId)}`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.lat && data.lng) {
            setFormData(prev => ({
              ...prev,
              latitud: data.lat,
              longitud: data.lng
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
      }
    }
  };

  const generarCodigo = async (): Promise<string> => {
    const { count } = await supabase
      .from("clientes")
      .select("id", { count: "exact", head: true });
    
    const numero = (count || 0) + 1;
    return `CLI${numero.toString().padStart(4, '0')}`;
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    if (!formData.direccion.trim()) {
      toast.error("La dirección es requerida");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const codigo = await generarCodigo();

      // Create client
      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .insert({
          codigo,
          nombre: formData.nombre.trim(),
          telefono: formData.telefono.trim() || null,
          direccion: formData.direccion.trim(),
          zona_id: formData.zona_id || null,
          vendedor_asignado: user.id,
          activo: true,
          termino_credito: "contado"
        })
        .select()
        .single();

      if (clienteError) throw clienteError;

      // Create default branch with geocoding
      const { error: sucursalError } = await supabase
        .from("cliente_sucursales")
        .insert({
          cliente_id: cliente.id,
          nombre: "Principal",
          direccion: formData.direccion.trim(),
          latitud: formData.latitud,
          longitud: formData.longitud,
          telefono: formData.telefono.trim() || null,
          zona_id: formData.zona_id || null,
          notas: formData.notas.trim() || null,
          activo: true
        });

      if (sucursalError) throw sucursalError;

      toast.success(`Cliente ${formData.nombre} creado correctamente`);
      
      // Reset form
      setFormData({
        nombre: "",
        telefono: "",
        direccion: "",
        latitud: null,
        longitud: null,
        zona_id: "",
        notas: ""
      });

      onClienteCreado();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader>
          <SheetTitle>Nuevo Cliente</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4 overflow-y-auto pb-24">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre comercial *</Label>
            <Input
              id="nombre"
              placeholder="Ej: Restaurante El Buen Sabor"
              value={formData.nombre}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              type="tel"
              placeholder="55 1234 5678"
              value={formData.telefono}
              onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Dirección de entrega *</Label>
            <GoogleMapsAddressAutocomplete
              value={formData.direccion}
              onChange={handleAddressChange}
              placeholder="Buscar dirección..."
            />
            {formData.latitud && formData.longitud && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <MapPin className="h-3 w-3" />
                <span>Ubicación exacta guardada</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Zona</Label>
            <Select
              value={formData.zona_id}
              onValueChange={(val) => setFormData(prev => ({ ...prev, zona_id: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar zona" />
              </SelectTrigger>
              <SelectContent>
                {zonas.map((zona) => (
                  <SelectItem key={zona.id} value={zona.id}>
                    {zona.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas de entrega</Label>
            <Textarea
              id="notas"
              placeholder="Instrucciones especiales, horarios, etc."
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
            <Button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Cliente
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
