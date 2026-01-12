import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, MapPin, Phone, Mail, Users, Building2, CheckCircle2, AlertTriangle } from "lucide-react";
import { VendedorTelefonosCliente, TelefonoCliente } from "./VendedorTelefonosCliente";
import { VendedorContactosCliente, ContactoCliente } from "./VendedorContactosCliente";
import { VendedorCorreosCliente, CorreoCliente } from "./VendedorCorreosCliente";
import { GeocodificarSucursalSheet } from "./GeocodificarSucursalSheet";

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

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
}

export function EditarClienteSheet({ open, onOpenChange, clienteId, onClienteActualizado }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zonas, setZonas] = useState<Zona[]>([]);
  
  // Form fields - General
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [zonaId, setZonaId] = useState<string | null>(null);
  
  // Read-only fields for display
  const [codigo, setCodigo] = useState("");
  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");

  // Multiple phones, contacts, emails
  const [telefonos, setTelefonos] = useState<TelefonoCliente[]>([]);
  const [contactos, setContactos] = useState<ContactoCliente[]>([]);
  const [correos, setCorreos] = useState<CorreoCliente[]>([]);
  
  // Sucursales
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [geoSheetOpen, setGeoSheetOpen] = useState(false);
  const [sucursalParaGeo, setSucursalParaGeo] = useState<Sucursal | null>(null);

  useEffect(() => {
    if (open && clienteId) {
      fetchAllData();
    }
  }, [open, clienteId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        clienteRes,
        zonasRes,
        telefonosRes,
        contactosRes,
        correosRes,
        sucursalesRes
      ] = await Promise.all([
        supabase.from("clientes").select("*").eq("id", clienteId).single(),
        supabase.from("zonas").select("id, nombre").eq("activo", true).order("nombre"),
        supabase.from("cliente_telefonos").select("*").eq("cliente_id", clienteId).eq("activo", true),
        supabase.from("cliente_contactos").select("*").eq("cliente_id", clienteId).eq("activo", true),
        supabase.from("cliente_correos").select("*").eq("cliente_id", clienteId).eq("activo", true),
        supabase.from("cliente_sucursales").select("id, nombre, direccion, latitud, longitud").eq("cliente_id", clienteId).eq("activo", true).order("nombre")
      ]);

      if (clienteRes.error) throw clienteRes.error;
      const data = clienteRes.data;

      // Set client data
      setNombre(data.nombre || "");
      setTelefono(data.telefono || "");
      setEmail(data.email || "");
      setDireccion(data.direccion || "");
      setZonaId(data.zona_id || null);
      setCodigo(data.codigo || "");
      setRfc(data.rfc || "");
      setRazonSocial(data.razon_social || "");

      // Set zonas
      setZonas(zonasRes.data || []);

      // Set telefonos
      setTelefonos((telefonosRes.data || []).map(t => ({
        telefono: t.telefono,
        etiqueta: t.etiqueta || "Principal",
        esPrincipal: t.es_principal || false
      })));

      // Set contactos
      setContactos((contactosRes.data || []).map(c => ({
        nombre: c.nombre,
        puesto: c.puesto || "Contacto",
        esPrincipal: c.es_principal || false
      })));

      // Set correos
      setCorreos((correosRes.data || []).map(c => ({
        email: c.email,
        nombreContacto: c.nombre_contacto || "",
        proposito: c.proposito || "pedidos"
      })));

      // Set sucursales
      setSucursales(sucursalesRes.data || []);

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
      // 1. Update main cliente record
      const { error: clienteError } = await supabase
        .from("clientes")
        .update({
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          email: email.trim() || null,
          direccion: direccion.trim() || null,
          zona_id: zonaId || null,
        })
        .eq("id", clienteId);

      if (clienteError) throw clienteError;

      // 2. Sync telefonos - delete all and insert new
      await supabase
        .from("cliente_telefonos")
        .update({ activo: false })
        .eq("cliente_id", clienteId);

      if (telefonos.length > 0) {
        const telefonosToInsert = telefonos.map(t => ({
          cliente_id: clienteId,
          telefono: t.telefono,
          etiqueta: t.etiqueta,
          es_principal: t.esPrincipal,
          activo: true
        }));
        await supabase.from("cliente_telefonos").insert(telefonosToInsert);
      }

      // 3. Sync contactos
      await supabase
        .from("cliente_contactos")
        .update({ activo: false })
        .eq("cliente_id", clienteId);

      if (contactos.length > 0) {
        const contactosToInsert = contactos.map(c => ({
          cliente_id: clienteId,
          nombre: c.nombre,
          puesto: c.puesto,
          es_principal: c.esPrincipal,
          activo: true
        }));
        await supabase.from("cliente_contactos").insert(contactosToInsert);
      }

      // 4. Sync correos
      await supabase
        .from("cliente_correos")
        .update({ activo: false })
        .eq("cliente_id", clienteId);

      if (correos.length > 0) {
        const correosToInsert = correos.map(c => ({
          cliente_id: clienteId,
          email: c.email,
          nombre_contacto: c.nombreContacto || null,
          proposito: c.proposito,
          activo: true
        }));
        await supabase.from("cliente_correos").insert(correosToInsert);
      }

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

  const handleOpenGeoSheet = (sucursal: Sucursal) => {
    setSucursalParaGeo(sucursal);
    setGeoSheetOpen(true);
  };

  const handleGeocodificado = () => {
    // Refresh sucursales after geocoding
    supabase
      .from("cliente_sucursales")
      .select("id, nombre, direccion, latitud, longitud")
      .eq("cliente_id", clienteId)
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => {
        setSucursales(data || []);
      });
  };

  return (
    <>
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
            <div className="space-y-4 py-4">
              {/* Read-only info */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
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

              {/* Tabs */}
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-auto">
                  <TabsTrigger value="general" className="text-xs px-1 py-2 flex flex-col gap-1">
                    <Building2 className="h-4 w-4" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="telefonos" className="text-xs px-1 py-2 flex flex-col gap-1">
                    <Phone className="h-4 w-4" />
                    Tels
                  </TabsTrigger>
                  <TabsTrigger value="contactos" className="text-xs px-1 py-2 flex flex-col gap-1">
                    <Users className="h-4 w-4" />
                    Contactos
                  </TabsTrigger>
                  <TabsTrigger value="correos" className="text-xs px-1 py-2 flex flex-col gap-1">
                    <Mail className="h-4 w-4" />
                    Correos
                  </TabsTrigger>
                  <TabsTrigger value="sucursales" className="text-xs px-1 py-2 flex flex-col gap-1">
                    <MapPin className="h-4 w-4" />
                    GPS
                  </TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre comercial *</Label>
                    <Input
                      id="nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Nombre del cliente"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono principal</Label>
                    <Input
                      id="telefono"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej: 5512345678"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email principal</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Textarea
                      id="direccion"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Dirección del cliente"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Zona de entrega</Label>
                    <Select 
                      value={zonaId || "none"} 
                      onValueChange={(val) => setZonaId(val === "none" ? null : val)}
                    >
                      <SelectTrigger>
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
                </TabsContent>

                {/* Teléfonos Tab */}
                <TabsContent value="telefonos" className="mt-4">
                  <VendedorTelefonosCliente
                    telefonos={telefonos}
                    onChange={setTelefonos}
                  />
                </TabsContent>

                {/* Contactos Tab */}
                <TabsContent value="contactos" className="mt-4">
                  <VendedorContactosCliente
                    contactos={contactos}
                    onChange={setContactos}
                  />
                </TabsContent>

                {/* Correos Tab */}
                <TabsContent value="correos" className="mt-4">
                  <VendedorCorreosCliente
                    correos={correos}
                    onChange={setCorreos}
                  />
                </TabsContent>

                {/* Sucursales/GPS Tab */}
                <TabsContent value="sucursales" className="mt-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Geocodifica las sucursales para optimizar las rutas de entrega.
                    </p>
                    
                    {sucursales.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6">
                        No hay sucursales registradas
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sucursales.map((sucursal) => {
                          const tieneGps = sucursal.latitud && sucursal.longitud;
                          return (
                            <div 
                              key={sucursal.id}
                              className="flex items-center justify-between p-3 border rounded-lg bg-background"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{sucursal.nombre}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {sucursal.direccion || "Sin dirección"}
                                </p>
                                <Badge 
                                  variant={tieneGps ? "default" : "outline"} 
                                  className={`mt-1 text-xs ${tieneGps ? 'bg-green-600' : 'text-amber-600 border-amber-400'}`}
                                >
                                  {tieneGps ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Con GPS
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Sin GPS
                                    </>
                                  )}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenGeoSheet(sucursal)}
                              >
                                <MapPin className="h-4 w-4 mr-1" />
                                {tieneGps ? "Actualizar" : "Geocodificar"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Save button */}
              <Button 
                className="w-full h-12 text-base mt-4"
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

      {/* Geocodificar Sheet */}
      {sucursalParaGeo && (
        <GeocodificarSucursalSheet
          open={geoSheetOpen}
          onOpenChange={setGeoSheetOpen}
          sucursalId={sucursalParaGeo.id}
          sucursalNombre={sucursalParaGeo.nombre}
          direccionActual={sucursalParaGeo.direccion}
          latitudActual={sucursalParaGeo.latitud}
          longitudActual={sucursalParaGeo.longitud}
          onGeocodificado={handleGeocodificado}
        />
      )}
    </>
  );
}
