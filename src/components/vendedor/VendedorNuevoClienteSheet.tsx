import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { 
  Loader2, MapPin, User, FileText, MapPinned, Upload, Sparkles, 
  Building2, Receipt, AlertTriangle, CheckCircle2
} from "lucide-react";
import GoogleMapsAddressAutocomplete from "@/components/GoogleMapsAddressAutocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VendedorCorreosCliente, CorreoCliente } from "./VendedorCorreosCliente";
import { VendedorTelefonosCliente, TelefonoCliente } from "./VendedorTelefonosCliente";
import { VendedorContactosCliente, ContactoCliente } from "./VendedorContactosCliente";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClienteCreado: () => void;
}

interface Zona {
  id: string;
  nombre: string;
}

type ModoEntrada = "csf" | "manual" | null;
type PreferenciaFacturacion = "siempre_factura" | "siempre_remision" | "variable";

export function VendedorNuevoClienteSheet({ open, onOpenChange, onClienteCreado }: Props) {
  const [loading, setLoading] = useState(false);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [modoEntrada, setModoEntrada] = useState<ModoEntrada>(null);
  const [parsingCsf, setParsingCsf] = useState(false);
  const [csfProcessed, setCsfProcessed] = useState(false);
  
  // Listas
  const [correos, setCorreos] = useState<CorreoCliente[]>([]);
  const [telefonos, setTelefonos] = useState<TelefonoCliente[]>([]);
  const [contactos, setContactos] = useState<ContactoCliente[]>([]);
  
  // Datos del cliente
  const [formData, setFormData] = useState({
    nombre: "",
    rfc: "",
    razon_social: "",
    regimen_capital: "",
    domicilio_fiscal: "",
    codigo_postal: "",
    // Address components from CSF
    tipo_vialidad: "",
    nombre_vialidad: "",
    numero_exterior: "",
    numero_interior: "",
    nombre_colonia: "",
    nombre_localidad: "",
    nombre_municipio: "",
    nombre_entidad_federativa: "",
    entre_calle: "",
    y_calle: "",
    notas: ""
  });

  // Dirección de entrega
  const [mismaQueDomicilioFiscal, setMismaQueDomicilioFiscal] = useState(true);
  const [direccionEntrega, setDireccionEntrega] = useState({
    direccion: "",
    latitud: null as number | null,
    longitud: null as number | null,
    zona_id: ""
  });

  // Preferencia de facturación
  const [preferenciaFacturacion, setPreferenciaFacturacion] = useState<PreferenciaFacturacion>("variable");

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
    // Reset form when closing
    if (!isOpen) {
      resetForm();
    }
  };

  const resetForm = () => {
    setModoEntrada(null);
    setParsingCsf(false);
    setCsfProcessed(false);
    setCorreos([]);
    setTelefonos([]);
    setContactos([]);
    setFormData({
      nombre: "",
      rfc: "",
      razon_social: "",
      regimen_capital: "",
      domicilio_fiscal: "",
      codigo_postal: "",
      tipo_vialidad: "",
      nombre_vialidad: "",
      numero_exterior: "",
      numero_interior: "",
      nombre_colonia: "",
      nombre_localidad: "",
      nombre_municipio: "",
      nombre_entidad_federativa: "",
      entre_calle: "",
      y_calle: "",
      notas: ""
    });
    setMismaQueDomicilioFiscal(true);
    setDireccionEntrega({
      direccion: "",
      latitud: null,
      longitud: null,
      zona_id: ""
    });
    setPreferenciaFacturacion("variable");
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleCsfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingCsf(true);
    setModoEntrada("csf");

    try {
      const base64 = await fileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke('parse-csf', {
        body: { pdfBase64: base64 }
      });

      if (error) throw error;

      if (data) {
        // Build domicilio fiscal string from components
        const domicilioParts = [
          data.tipo_vialidad,
          data.nombre_vialidad,
          data.numero_exterior && `No. ${data.numero_exterior}`,
          data.numero_interior && `Int. ${data.numero_interior}`,
          data.nombre_colonia && `Col. ${data.nombre_colonia}`,
          data.nombre_municipio,
          data.nombre_entidad_federativa,
          data.codigo_postal && `C.P. ${data.codigo_postal}`
        ].filter(Boolean).join(", ");

        setFormData(prev => ({
          ...prev,
          rfc: data.rfc || prev.rfc,
          razon_social: data.razon_social || prev.razon_social,
          regimen_capital: data.regimen_capital || prev.regimen_capital,
          domicilio_fiscal: domicilioParts || prev.domicilio_fiscal,
          codigo_postal: data.codigo_postal || prev.codigo_postal,
          tipo_vialidad: data.tipo_vialidad || "",
          nombre_vialidad: data.nombre_vialidad || "",
          numero_exterior: data.numero_exterior || "",
          numero_interior: data.numero_interior || "",
          nombre_colonia: data.nombre_colonia || "",
          nombre_localidad: data.nombre_localidad || "",
          nombre_municipio: data.nombre_municipio || "",
          nombre_entidad_federativa: data.nombre_entidad_federativa || "",
          entre_calle: data.entre_calle || "",
          y_calle: data.y_calle || ""
        }));

        // Auto-set to siempre_factura if CSF was uploaded
        setPreferenciaFacturacion("siempre_factura");
        setCsfProcessed(true);
        toast.success("Datos fiscales extraídos correctamente");
      }
    } catch (error: any) {
      console.error("Error parsing CSF:", error);
      toast.error("Error al procesar el CSF. Intente de nuevo o capture manualmente.");
      setModoEntrada(null);
    } finally {
      setParsingCsf(false);
    }
  };

  const handleAddressChange = async (address: string, placeId?: string) => {
    setDireccionEntrega(prev => ({
      ...prev,
      direccion: address,
      latitud: null,
      longitud: null
    }));

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
            setDireccionEntrega(prev => ({
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
    // Validations
    if (!formData.nombre.trim()) {
      toast.error("El nombre comercial es requerido");
      return;
    }

    // If siempre_factura, require fiscal data
    if (preferenciaFacturacion === "siempre_factura") {
      if (!formData.rfc.trim()) {
        toast.error("El RFC es requerido para clientes que siempre requieren factura");
        return;
      }
      if (!formData.razon_social.trim()) {
        toast.error("La Razón Social es requerida para clientes que siempre requieren factura");
        return;
      }
    }

    // Require delivery address
    const direccionFinal = mismaQueDomicilioFiscal 
      ? formData.domicilio_fiscal 
      : direccionEntrega.direccion;
    
    if (!direccionFinal.trim()) {
      toast.error("La dirección de entrega es requerida");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const codigo = await generarCodigo();

      // Get primary email
      const emailPrincipal = correos.find(c => c.proposito === "general")?.email || 
                            (correos.length > 0 ? correos[0].email : null);

      // Get primary phone
      const telefonoPrincipal = telefonos.find(t => t.esPrincipal)?.telefono || 
                               (telefonos.length > 0 ? telefonos[0].telefono : null);

      // Create client
      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .insert({
          codigo,
          nombre: formData.nombre.trim(),
          rfc: formData.rfc.trim() || null,
          razon_social: formData.razon_social.trim() || null,
          regimen_capital: formData.regimen_capital.trim() || null,
          direccion: formData.domicilio_fiscal.trim() || null,
          codigo_postal: formData.codigo_postal.trim() || null,
          tipo_vialidad: formData.tipo_vialidad.trim() || null,
          nombre_vialidad: formData.nombre_vialidad.trim() || null,
          numero_exterior: formData.numero_exterior.trim() || null,
          numero_interior: formData.numero_interior.trim() || null,
          nombre_colonia: formData.nombre_colonia.trim() || null,
          nombre_localidad: formData.nombre_localidad.trim() || null,
          nombre_municipio: formData.nombre_municipio.trim() || null,
          nombre_entidad_federativa: formData.nombre_entidad_federativa.trim() || null,
          entre_calle: formData.entre_calle.trim() || null,
          y_calle: formData.y_calle.trim() || null,
          telefono: telefonoPrincipal,
          email: emailPrincipal,
          zona_id: direccionEntrega.zona_id || null,
          vendedor_asignado: user.id,
          activo: true,
          termino_credito: "contado",
          preferencia_facturacion: preferenciaFacturacion
        })
        .select()
        .single();

      if (clienteError) throw clienteError;

      // Create default branch
      const { error: sucursalError } = await supabase
        .from("cliente_sucursales")
        .insert({
          cliente_id: cliente.id,
          nombre: "Principal",
          direccion: direccionFinal,
          latitud: mismaQueDomicilioFiscal ? null : direccionEntrega.latitud,
          longitud: mismaQueDomicilioFiscal ? null : direccionEntrega.longitud,
          telefono: telefonoPrincipal,
          zona_id: direccionEntrega.zona_id || null,
          notas: formData.notas.trim() || null,
          activo: true
        });

      if (sucursalError) throw sucursalError;

      // Insert emails
      if (correos.length > 0) {
        const correosData = correos.map((correo, index) => ({
          cliente_id: cliente.id,
          email: correo.email,
          nombre_contacto: correo.nombreContacto || null,
          proposito: correo.proposito,
          es_principal: index === 0,
        }));
        await supabase.from("cliente_correos").insert(correosData);
      }

      // Insert phones
      if (telefonos.length > 0) {
        const telefonosData = telefonos.map(tel => ({
          cliente_id: cliente.id,
          telefono: tel.telefono,
          etiqueta: tel.etiqueta,
          es_principal: tel.esPrincipal,
        }));
        await supabase.from("cliente_telefonos").insert(telefonosData);
      }

      // Insert contacts
      if (contactos.length > 0) {
        const contactosData = contactos.map(c => ({
          cliente_id: cliente.id,
          nombre: c.nombre,
          puesto: c.puesto,
          es_principal: c.esPrincipal,
        }));
        await supabase.from("cliente_contactos").insert(contactosData);
      }

      toast.success(`Cliente ${formData.nombre} creado correctamente`);
      resetForm();
      onClienteCreado();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  const showFiscalFields = preferenciaFacturacion !== "siempre_remision";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] sm:h-[85vh] overflow-hidden">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Nuevo Cliente</SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-140px)] pb-8">
          <div className="space-y-6 max-w-2xl mx-auto">
            
            {/* ========== MODO DE ENTRADA ========== */}
            {modoEntrada === null && (
              <div className="space-y-4">
                {/* CSF Upload Option */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleCsfUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={parsingCsf}
                  />
                  <div className="border-2 border-dashed border-primary/50 rounded-xl p-6 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">Subir CSF para llenado automático</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          La IA extraerá RFC, Razón Social y Domicilio Fiscal
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Upload className="h-4 w-4" />
                        <span>PDF o imagen de la Constancia de Situación Fiscal</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t"></div>
                  </div>
                  <div className="relative bg-background px-4 text-sm text-muted-foreground">
                    o
                  </div>
                </div>

                {/* Manual Entry Option */}
                <Button
                  variant="outline"
                  className="w-full h-16 text-base"
                  onClick={() => setModoEntrada("manual")}
                >
                  <User className="h-5 w-5 mr-3" />
                  Agregar datos manualmente
                </Button>
              </div>
            )}

            {/* ========== PROCESANDO CSF ========== */}
            {parsingCsf && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Procesando con IA...</p>
                <p className="text-sm text-muted-foreground">Extrayendo datos fiscales del documento</p>
              </div>
            )}

            {/* ========== FORMULARIO PRINCIPAL ========== */}
            {(modoEntrada === "manual" || csfProcessed) && !parsingCsf && (
              <>
                {/* CSF Success Message */}
                {csfProcessed && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">Datos fiscales extraídos</p>
                      <p className="text-sm text-green-600 dark:text-green-400">Revise y complete la información</p>
                    </div>
                  </div>
                )}

                {/* Nombre Comercial */}
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nombre comercial *
                  </Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Restaurante El Buen Sabor"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    className="h-14 text-lg"
                  />
                </div>

                {/* ========== DATOS FISCALES ========== */}
                {showFiscalFields && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 text-base font-medium">
                      <Building2 className="h-5 w-5" />
                      Datos Fiscales
                      {preferenciaFacturacion === "siempre_factura" && (
                        <span className="text-xs text-destructive ml-2">* Requeridos</span>
                      )}
                    </div>

                    {/* RFC */}
                    <div className="space-y-2">
                      <Label htmlFor="rfc">RFC {preferenciaFacturacion === "siempre_factura" && "*"}</Label>
                      <Input
                        id="rfc"
                        placeholder="XAXX010101000"
                        value={formData.rfc}
                        onChange={(e) => setFormData(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                        className="h-12 font-mono"
                        maxLength={13}
                      />
                    </div>

                    {/* Razón Social */}
                    <div className="space-y-2">
                      <Label htmlFor="razon_social">Razón Social {preferenciaFacturacion === "siempre_factura" && "*"}</Label>
                      <Input
                        id="razon_social"
                        placeholder="Empresa Ejemplo S.A. de C.V."
                        value={formData.razon_social}
                        onChange={(e) => setFormData(prev => ({ ...prev, razon_social: e.target.value }))}
                        className="h-12"
                      />
                    </div>

                    {/* Domicilio Fiscal */}
                    <div className="space-y-2">
                      <Label htmlFor="domicilio_fiscal">Domicilio Fiscal</Label>
                      <Textarea
                        id="domicilio_fiscal"
                        placeholder="Dirección completa del domicilio fiscal"
                        value={formData.domicilio_fiscal}
                        onChange={(e) => setFormData(prev => ({ ...prev, domicilio_fiscal: e.target.value }))}
                        rows={2}
                        className="resize-none"
                      />
                    </div>

                    {/* Código Postal */}
                    <div className="space-y-2 max-w-[150px]">
                      <Label htmlFor="codigo_postal">Código Postal</Label>
                      <Input
                        id="codigo_postal"
                        placeholder="06600"
                        value={formData.codigo_postal}
                        onChange={(e) => setFormData(prev => ({ ...prev, codigo_postal: e.target.value }))}
                        className="h-12"
                        maxLength={5}
                      />
                    </div>

                    {/* Upload CSF if in manual mode */}
                    {modoEntrada === "manual" && !csfProcessed && (
                      <div className="pt-2">
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          ¿Tienes el CSF? Súbelo para llenar automáticamente
                        </Label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleCsfUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <Button variant="outline" className="w-full" type="button">
                            <Upload className="h-4 w-4 mr-2" />
                            Subir CSF
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ========== DIRECCIÓN DE ENTREGA ========== */}
                <div className="space-y-4">
                  <Label className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Dirección de Entrega *
                  </Label>

                  {/* Checkbox: misma que domicilio fiscal */}
                  {formData.domicilio_fiscal && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Checkbox
                        id="misma-direccion"
                        checked={mismaQueDomicilioFiscal}
                        onCheckedChange={(checked) => setMismaQueDomicilioFiscal(checked as boolean)}
                      />
                      <label htmlFor="misma-direccion" className="text-sm cursor-pointer flex-1">
                        Misma que el domicilio fiscal
                      </label>
                    </div>
                  )}

                  {/* Different address input */}
                  {(!mismaQueDomicilioFiscal || !formData.domicilio_fiscal) && (
                    <div className="space-y-4">
                      <GoogleMapsAddressAutocomplete
                        value={direccionEntrega.direccion}
                        onChange={handleAddressChange}
                        placeholder="Buscar dirección de entrega..."
                      />
                      {direccionEntrega.latitud && direccionEntrega.longitud && (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
                          <MapPinned className="h-4 w-4" />
                          <span>Ubicación exacta guardada para rutas</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Zone Selection */}
                  <Select
                    value={direccionEntrega.zona_id}
                    onValueChange={(val) => setDireccionEntrega(prev => ({ ...prev, zona_id: val }))}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Seleccionar zona de entrega" />
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

                {/* ========== CORREOS ========== */}
                <VendedorCorreosCliente correos={correos} onChange={setCorreos} />

                {/* ========== TELÉFONOS ========== */}
                <VendedorTelefonosCliente telefonos={telefonos} onChange={setTelefonos} />

                {/* ========== CONTACTOS ========== */}
                <VendedorContactosCliente contactos={contactos} onChange={setContactos} />

                {/* ========== PREFERENCIA DE FACTURACIÓN ========== */}
                <div className="space-y-4">
                  <Label className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Preferencia de Facturación *
                  </Label>
                  
                  <RadioGroup
                    value={preferenciaFacturacion}
                    onValueChange={(val) => setPreferenciaFacturacion(val as PreferenciaFacturacion)}
                    className="space-y-3"
                  >
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
                      <RadioGroupItem value="siempre_factura" id="siempre_factura" className="mt-1" />
                      <label htmlFor="siempre_factura" className="cursor-pointer flex-1">
                        <span className="font-medium">Siempre factura</span>
                        <p className="text-sm text-muted-foreground">Requiere CSF y datos fiscales completos</p>
                      </label>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
                      <RadioGroupItem value="variable" id="variable" className="mt-1" />
                      <label htmlFor="variable" className="cursor-pointer flex-1">
                        <span className="font-medium">Variable</span>
                        <p className="text-sm text-muted-foreground">A veces factura, a veces remisión</p>
                      </label>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
                      <RadioGroupItem value="siempre_remision" id="siempre_remision" className="mt-1" />
                      <label htmlFor="siempre_remision" className="cursor-pointer flex-1">
                        <span className="font-medium">Solo remisión</span>
                        <p className="text-sm text-muted-foreground">No requiere datos fiscales</p>
                      </label>
                    </div>
                  </RadioGroup>

                  {preferenciaFacturacion === "siempre_factura" && !formData.rfc && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">Para facturar, debe subir el CSF o capturar los datos fiscales</span>
                    </div>
                  )}
                </div>

                {/* ========== NOTAS ========== */}
                <div className="space-y-2">
                  <Label htmlFor="notas" className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas de entrega
                  </Label>
                  <Textarea
                    id="notas"
                    placeholder="Instrucciones especiales, horarios preferidos, referencias..."
                    value={formData.notas}
                    onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fixed Submit Button */}
        {(modoEntrada === "manual" || csfProcessed) && !parsingCsf && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
            <div className="max-w-2xl mx-auto">
              <Button 
                onClick={handleSubmit} 
                disabled={loading} 
                className="w-full h-14 text-lg font-semibold"
                size="lg"
              >
                {loading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                Crear Cliente
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
