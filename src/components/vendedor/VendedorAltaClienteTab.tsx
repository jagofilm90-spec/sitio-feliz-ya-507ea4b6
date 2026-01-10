import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, MapPin, Phone, Building2, Loader2, CheckCircle, Mail } from "lucide-react";
import GoogleMapsAddressAutocomplete from "@/components/GoogleMapsAddressAutocomplete";

interface Props {
  onClienteCreado: () => void;
}

interface Zona {
  id: string;
  nombre: string;
}

export function VendedorAltaClienteTab({ onClienteCreado }: Props) {
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    latitud: null as number | null,
    longitud: null as number | null,
    zonaId: "",
    notas: ""
  });

  useEffect(() => {
    fetchZonas();
  }, []);

  const fetchZonas = async () => {
    const { data } = await supabase
      .from("zonas")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre");
    setZonas(data || []);
  };

  const handleAddressChange = async (address: string, placeId?: string) => {
    setFormData(prev => ({ ...prev, direccion: address }));
    
    if (placeId) {
      try {
        const { data, error } = await supabase.functions.invoke("get-place-details", {
          body: { placeId }
        });
        if (!error && data?.location) {
          setFormData(prev => ({
            ...prev,
            latitud: data.location.lat,
            longitud: data.location.lng
          }));
        }
      } catch (e) {
        console.error("Error getting coordinates:", e);
      }
    }
  };

  const generarCodigo = async (): Promise<string> => {
    const { count } = await supabase
      .from("clientes")
      .select("id", { count: "exact", head: true });
    
    const numero = (count || 0) + 1;
    return `CLI-${numero.toString().padStart(4, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      toast.error("El nombre del cliente es requerido");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const codigo = await generarCodigo();

      // Crear cliente
      const clienteData = {
        codigo,
        nombre: formData.nombre.trim(),
        telefono: formData.telefono || null,
        email: formData.email.trim() || null,
        direccion: formData.direccion || null,
        zona_id: formData.zonaId || null,
        vendedor_asignado: user.id,
        activo: true,
        termino_credito: "contado" as const,
        preferencia_facturacion: "variable" as const
      };

      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .insert([clienteData])
        .select("id")
        .single();

      if (clienteError) throw clienteError;

      // Crear sucursal principal
      if (cliente) {
        await supabase
          .from("cliente_sucursales")
          .insert({
            cliente_id: cliente.id,
            nombre: "Principal",
            direccion: formData.direccion || null,
            telefono: formData.telefono || null,
            latitud: formData.latitud,
            longitud: formData.longitud,
            zona_id: formData.zonaId || null,
            notas: formData.notas || null,
            activo: true
          });
      }

      setExito(true);
      toast.success("Cliente registrado exitosamente");
      
      // Reset form after 2 seconds
        setTimeout(() => {
          setFormData({
            nombre: "",
            telefono: "",
            email: "",
            direccion: "",
            latitud: null,
            longitud: null,
            zonaId: "",
            notas: ""
          });
        setExito(false);
        onClienteCreado();
      }, 2000);

    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al registrar cliente");
    } finally {
      setLoading(false);
    }
  };

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">¡Cliente Registrado!</h2>
        <p className="text-muted-foreground text-center">
          El cliente ha sido agregado a tu cartera exitosamente.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Alta de Nuevo Cliente
        </CardTitle>
        <CardDescription>
          Registra un nuevo cliente en tu cartera. El cliente quedará asignado automáticamente a ti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Nombre del cliente / negocio *
            </Label>
            <Input
              id="nombre"
              placeholder="Ej: Restaurante El Buen Sabor"
              value={formData.nombre}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              className="h-12"
              required
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="telefono" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Teléfono
            </Label>
            <Input
              id="telefono"
              type="tel"
              placeholder="Ej: 8123456789"
              value={formData.telefono}
              onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
              className="h-12"
            />
          </div>

          {/* Correo electrónico */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Ej: contacto@restaurante.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="h-12"
            />
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Dirección de entrega
            </Label>
            <GoogleMapsAddressAutocomplete
              value={formData.direccion}
              onChange={handleAddressChange}
              placeholder="Buscar dirección..."
              className="h-12"
            />
          </div>

          {/* Zona */}
          <div className="space-y-2">
            <Label>Zona de reparto</Label>
            <Select 
              value={formData.zonaId} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, zonaId: v }))}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Seleccionar zona" />
              </SelectTrigger>
              <SelectContent>
                {zonas.map(zona => (
                  <SelectItem key={zona.id} value={zona.id}>
                    {zona.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas adicionales</Label>
            <Textarea
              placeholder="Instrucciones de entrega, horarios, etc."
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Registrar Cliente
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}