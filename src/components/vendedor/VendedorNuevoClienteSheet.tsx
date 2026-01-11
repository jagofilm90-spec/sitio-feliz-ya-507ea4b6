import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Loader2, MapPin, User, FileText, Upload, Sparkles, 
  Building2, CheckCircle2, Clock, Search
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

interface PostalCodeData {
  codigo_postal: string;
  municipio: string;
  estado: string;
  ciudad: string;
  colonias: string[];
  colonia_sugerida: string | null;
}

type ModoEntrada = "csf" | "manual" | null;

const DIAS_SEMANA = [
  { key: "lunes", label: "Lun" },
  { key: "martes", label: "Mar" },
  { key: "miercoles", label: "Mié" },
  { key: "jueves", label: "Jue" },
  { key: "viernes", label: "Vie" },
  { key: "sabado", label: "Sáb" },
];

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
  
  // Datos del cliente (CSF)
  const [nombre, setNombre] = useState("");
  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [regimenCapital, setRegimenCapital] = useState("");
  const [domicilioFiscal, setDomicilioFiscal] = useState("");
  const [codigoPostalFiscal, setCodigoPostalFiscal] = useState("");
  
  // CSF address components
  const [tipoVialidad, setTipoVialidad] = useState("");
  const [nombreVialidad, setNombreVialidad] = useState("");
  const [numExtFiscal, setNumExtFiscal] = useState("");
  const [numIntFiscal, setNumIntFiscal] = useState("");
  const [nombreColonia, setNombreColonia] = useState("");
  const [nombreLocalidad, setNombreLocalidad] = useState("");
  const [nombreMunicipio, setNombreMunicipio] = useState("");
  const [nombreEntidadFederativa, setNombreEntidadFederativa] = useState("");
  const [entreCalle, setEntreCalle] = useState("");
  const [yCalle, setYCalle] = useState("");

  // Dirección de entrega (manual = estructurada)
  const [usarDireccionFiscal, setUsarDireccionFiscal] = useState(true);
  const [calle, setCalle] = useState("");
  const [numeroExterior, setNumeroExterior] = useState("");
  const [numeroInterior, setNumeroInterior] = useState("");
  const [colonia, setColonia] = useState("");
  const [alcaldia, setAlcaldia] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [direccionBusqueda, setDireccionBusqueda] = useState("");
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [zonaId, setZonaId] = useState("");

  // Postal code lookup
  const [buscandoCP, setBuscandoCP] = useState(false);
  const [coloniasDisponibles, setColoniasDisponibles] = useState<string[]>([]);
  const [cpAutocompletado, setCpAutocompletado] = useState(false);
  const [zonaAutoAsignada, setZonaAutoAsignada] = useState(false);

  // Restricciones de entrega
  const [horarioInicio, setHorarioInicio] = useState("08:00");
  const [horarioFin, setHorarioFin] = useState("18:00");
  const [diasSinEntrega, setDiasSinEntrega] = useState<string[]>([]);

  // Notas
  const [notas, setNotas] = useState("");

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
    setNombre("");
    setRfc("");
    setRazonSocial("");
    setRegimenCapital("");
    setDomicilioFiscal("");
    setCodigoPostalFiscal("");
    setTipoVialidad("");
    setNombreVialidad("");
    setNumExtFiscal("");
    setNumIntFiscal("");
    setNombreColonia("");
    setNombreLocalidad("");
    setNombreMunicipio("");
    setNombreEntidadFederativa("");
    setEntreCalle("");
    setYCalle("");
    setUsarDireccionFiscal(true);
    setCalle("");
    setNumeroExterior("");
    setNumeroInterior("");
    setColonia("");
    setAlcaldia("");
    setCodigoPostal("");
    setDireccionBusqueda("");
    setLatitud(null);
    setLongitud(null);
    setZonaId("");
    setBuscandoCP(false);
    setColoniasDisponibles([]);
    setCpAutocompletado(false);
    setZonaAutoAsignada(false);
    setHorarioInicio("08:00");
    setHorarioFin("18:00");
    setDiasSinEntrega([]);
    setNotas("");
  };

  // Función para buscar datos de código postal
  const buscarCodigoPostal = async (cp: string) => {
    if (cp.length !== 5) return;
    
    setBuscandoCP(true);
    setCpAutocompletado(false);
    setZonaAutoAsignada(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('lookup-postal-code', {
        body: { codigo_postal: cp }
      });

      if (error) throw error;

      if (data && !data.error) {
        const cpData = data as PostalCodeData;
        
        // Auto-completar alcaldía/municipio
        setAlcaldia(cpData.municipio);
        
        // Guardar colonias disponibles
        setColoniasDisponibles(cpData.colonias);
        
        // Si solo hay una colonia, auto-seleccionarla
        if (cpData.colonia_sugerida) {
          setColonia(cpData.colonia_sugerida);
        }
        
        setCpAutocompletado(true);
        
        // Intentar auto-asignar zona basándose en el municipio
        const zonaMatch = zonas.find(z => 
          z.nombre.toLowerCase().includes(cpData.municipio.toLowerCase()) ||
          cpData.municipio.toLowerCase().includes(z.nombre.toLowerCase())
        );
        
        if (zonaMatch) {
          setZonaId(zonaMatch.id);
          setZonaAutoAsignada(true);
          toast.success(`Alcaldía y zona asignadas: ${cpData.municipio}`);
        } else {
          toast.success(`Alcaldía encontrada: ${cpData.municipio}`);
        }
      }
    } catch (error) {
      console.error("Error buscando CP:", error);
      // No mostrar error, permitir captura manual
    } finally {
      setBuscandoCP(false);
    }
  };

  const handleCodigoPostalChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 5);
    setCodigoPostal(cleaned);
    setCpAutocompletado(false);
    setZonaAutoAsignada(false);
    
    if (cleaned.length === 5) {
      buscarCodigoPostal(cleaned);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Función para normalizar texto (quitar acentos y minúsculas)
  const normalizarTexto = (texto: string): string => {
    return texto.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // Función para buscar zona por municipio
  const buscarZonaPorMunicipio = (municipio: string): Zona | undefined => {
    if (!municipio || zonas.length === 0) return undefined;
    
    const municipioNorm = normalizarTexto(municipio);
    
    return zonas.find(z => {
      const zonaNorm = normalizarTexto(z.nombre);
      return zonaNorm === municipioNorm ||
             zonaNorm.includes(municipioNorm) ||
             municipioNorm.includes(zonaNorm);
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
        setRfc(data.rfc || "");
        setRazonSocial(data.razon_social || "");
        setRegimenCapital(data.regimen_capital || "");
        setCodigoPostalFiscal(data.codigo_postal || "");
        setNombre(data.razon_social || "");
        
        // Store CSF address components
        setTipoVialidad(data.tipo_vialidad || "");
        setNombreVialidad(data.nombre_vialidad || "");
        setNumExtFiscal(data.numero_exterior || "");
        setNumIntFiscal(data.numero_interior || "");
        setNombreColonia(data.nombre_colonia || "");
        setNombreLocalidad(data.nombre_localidad || "");
        setNombreMunicipio(data.nombre_municipio || "");
        setNombreEntidadFederativa(data.nombre_entidad_federativa || "");
        setEntreCalle(data.entre_calle || "");
        setYCalle(data.y_calle || "");

        // Build domicilio fiscal string
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
        
        setDomicilioFiscal(domicilioParts);
        setCsfProcessed(true);

        // Auto-asignar zona basándose en el municipio de la CSF
        if (data.nombre_municipio && zonas.length > 0) {
          const zonaMatch = buscarZonaPorMunicipio(data.nombre_municipio);
          
          if (zonaMatch) {
            setZonaId(zonaMatch.id);
            setZonaAutoAsignada(true);
            toast.success(`Datos extraídos • Zona: ${zonaMatch.nombre}`);
          } else {
            toast.success("Datos fiscales extraídos correctamente");
          }
        } else {
          toast.success("Datos fiscales extraídos correctamente");
        }

        // Auto-completar código postal y buscar colonias disponibles
        if (data.codigo_postal) {
          setCodigoPostal(data.codigo_postal);
          // Buscar datos del CP para obtener colonias disponibles
          buscarCodigoPostal(data.codigo_postal);
        }
      }
    } catch (error: any) {
      console.error("Error parsing CSF:", error);
      toast.error("Error al procesar el CSF. Intente de nuevo.");
      setModoEntrada(null);
    } finally {
      setParsingCsf(false);
    }
  };

  const handleAddressSelect = async (address: string, placeId?: string) => {
    setDireccionBusqueda(address);

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
            setLatitud(data.lat);
            setLongitud(data.lng);
            toast.success("Coordenadas obtenidas");
          }
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
      }
    }
  };

  const toggleDiaSinEntrega = (dia: string) => {
    setDiasSinEntrega(prev => 
      prev.includes(dia) 
        ? prev.filter(d => d !== dia)
        : [...prev, dia]
    );
  };

  const generarCodigo = async (): Promise<string> => {
    const { count } = await supabase
      .from("clientes")
      .select("id", { count: "exact", head: true });
    
    const numero = (count || 0) + 1;
    return `CLI${numero.toString().padStart(4, '0')}`;
  };

  const construirDireccionEntrega = (): string => {
    if (modoEntrada === "csf" && usarDireccionFiscal) {
      return domicilioFiscal;
    }

    if (modoEntrada === "manual") {
      const partes = [
        calle,
        numeroExterior ? `No. ${numeroExterior}` : null,
        numeroInterior ? `Int. ${numeroInterior}` : null,
        colonia ? `Col. ${colonia}` : null,
        alcaldia,
        codigoPostal ? `CP ${codigoPostal}` : null,
      ].filter(Boolean);
      return partes.join(", ");
    }

    // CSF with different address
    return direccionBusqueda;
  };

  const handleSubmit = async () => {
    // Validations
    if (!nombre.trim()) {
      toast.error("El nombre del cliente es requerido");
      return;
    }

    if (modoEntrada === "csf" && !rfc) {
      toast.error("El RFC es requerido para clientes con factura");
      return;
    }

    if (modoEntrada === "manual") {
      if (!calle.trim() || !numeroExterior.trim() || !alcaldia.trim() || !codigoPostal.trim()) {
        toast.error("Completa todos los campos obligatorios de la dirección");
        return;
      }
    }

    const direccionEntrega = construirDireccionEntrega();
    if (!direccionEntrega) {
      toast.error("La dirección de entrega es requerida");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const codigo = await generarCodigo();
      const preferencia = modoEntrada === "csf" ? "siempre_factura" : "siempre_remision";

      // Get primary email/phone
      const emailPrincipal = correos.find(c => c.proposito === "todo")?.email || 
                            (correos.length > 0 ? correos[0].email : null);
      const telefonoPrincipal = telefonos.find(t => t.esPrincipal)?.telefono || 
                               (telefonos.length > 0 ? telefonos[0].telefono : null);

      // Build client data
      const clienteData: any = {
        codigo,
        nombre: nombre.trim(),
        preferencia_facturacion: preferencia,
        vendedor_asignado: user.id,
        activo: true,
        termino_credito: "contado",
        email: emailPrincipal,
        telefono: telefonoPrincipal,
        zona_id: zonaId || null,
      };

      // Add fiscal data only for CSF mode
      if (modoEntrada === "csf") {
        clienteData.rfc = rfc.trim();
        clienteData.razon_social = razonSocial.trim() || null;
        clienteData.regimen_capital = regimenCapital.trim() || null;
        clienteData.direccion = domicilioFiscal.trim() || null;
        clienteData.codigo_postal = codigoPostalFiscal.trim() || null;
        clienteData.tipo_vialidad = tipoVialidad || null;
        clienteData.nombre_vialidad = nombreVialidad || null;
        clienteData.numero_exterior = numExtFiscal || null;
        clienteData.numero_interior = numIntFiscal || null;
        clienteData.nombre_colonia = nombreColonia || null;
        clienteData.nombre_localidad = nombreLocalidad || null;
        clienteData.nombre_municipio = nombreMunicipio || null;
        clienteData.nombre_entidad_federativa = nombreEntidadFederativa || null;
        clienteData.entre_calle = entreCalle || null;
        clienteData.y_calle = yCalle || null;
      }

      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .insert(clienteData)
        .select()
        .single();

      if (clienteError) throw clienteError;

      // Create default branch with delivery restrictions
      const horarioEntrega = `${horarioInicio} - ${horarioFin}`;
      
      const { error: sucursalError } = await supabase
        .from("cliente_sucursales")
        .insert({
          cliente_id: cliente.id,
          nombre: "Principal",
          direccion: direccionEntrega,
          latitud: (modoEntrada === "csf" && usarDireccionFiscal) ? null : latitud,
          longitud: (modoEntrada === "csf" && usarDireccionFiscal) ? null : longitud,
          telefono: telefonoPrincipal,
          zona_id: zonaId || null,
          horario_entrega: horarioEntrega,
          dias_sin_entrega: diasSinEntrega.length > 0 ? diasSinEntrega.join(", ") : null,
          notas: notas.trim() || null,
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

      toast.success(`Cliente ${nombre} creado correctamente`);
      resetForm();
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
                        <p className="font-semibold text-lg">Subir CSF (Cliente con Factura)</p>
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

                {/* Manual Entry Option - Solo Remisión */}
                <Button
                  variant="outline"
                  className="w-full h-auto py-6 text-base"
                  onClick={() => setModoEntrada("manual")}
                >
                  <div className="flex flex-col items-center gap-2">
                    <User className="h-8 w-8" />
                    <span className="font-semibold">Agregar Manualmente (Solo Remisión)</span>
                    <span className="text-sm text-muted-foreground">No requiere datos fiscales</span>
                  </div>
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

            {/* ========== FORMULARIO CSF ========== */}
            {modoEntrada === "csf" && csfProcessed && !parsingCsf && (
              <>
                {/* CSF Success Message */}
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">Datos fiscales extraídos</p>
                    <p className="text-sm text-green-600 dark:text-green-400">Cliente se facturará automáticamente</p>
                  </div>
                </div>

                {/* Datos Fiscales del CSF */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 text-base font-medium">
                    <Building2 className="h-5 w-5" />
                    Datos Fiscales (del CSF)
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>RFC</Label>
                      <Input value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} className="h-12 font-mono" maxLength={13} />
                    </div>
                    <div className="space-y-2">
                      <Label>Código Postal</Label>
                      <Input value={codigoPostalFiscal} onChange={(e) => setCodigoPostalFiscal(e.target.value)} className="h-12" maxLength={5} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Razón Social</Label>
                    <Input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className="h-12" />
                  </div>

                  <div className="space-y-2">
                    <Label>Domicilio Fiscal</Label>
                    <Textarea value={domicilioFiscal} onChange={(e) => setDomicilioFiscal(e.target.value)} rows={2} className="resize-none" />
                  </div>
                </div>

                {/* Nombre Comercial */}
                <div className="space-y-2">
                  <Label className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nombre Comercial *
                  </Label>
                  <Input
                    placeholder="Nombre con el que conoces al cliente"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>

                {/* Dirección de Entrega - CSF */}
                <div className="space-y-4">
                  <Label className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Dirección de Entrega
                  </Label>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="usar-fiscal"
                      checked={usarDireccionFiscal}
                      onCheckedChange={(checked) => setUsarDireccionFiscal(checked as boolean)}
                    />
                    <label htmlFor="usar-fiscal" className="text-sm cursor-pointer flex-1">
                      La dirección de entrega es la misma que el domicilio fiscal
                    </label>
                  </div>

                  {!usarDireccionFiscal && (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <GoogleMapsAddressAutocomplete
                        value={direccionBusqueda}
                        onChange={handleAddressSelect}
                        placeholder="Buscar dirección de entrega..."
                      />

                      {latitud && longitud && (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>GPS: {latitud.toFixed(6)}, {longitud.toFixed(6)}</span>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        💡 Las coordenadas GPS exactas se pueden capturar después cuando visites físicamente al cliente
                      </p>
                    </div>
                  )}
                </div>

                {/* Zona */}
                <div className="space-y-2">
                  <Label>Zona de Entrega</Label>
                  <Select value={zonaId} onValueChange={setZonaId}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Seleccionar zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {zonas.map((zona) => (
                        <SelectItem key={zona.id} value={zona.id}>{zona.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Restricciones de Entrega */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 font-medium">
                    <Clock className="h-4 w-4" />
                    Restricciones de Entrega
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Horario desde</Label>
                      <Input type="time" value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Horario hasta</Label>
                      <Input type="time" value={horarioFin} onChange={(e) => setHorarioFin(e.target.value)} className="h-12" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Días sin entrega (marcar días que NO se entrega)</Label>
                    <div className="flex flex-wrap gap-2">
                      {DIAS_SEMANA.map(dia => (
                        <Button
                          key={dia.key}
                          type="button"
                          variant={diasSinEntrega.includes(dia.key) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDiaSinEntrega(dia.key)}
                        >
                          {dia.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Correos */}
                <VendedorCorreosCliente correos={correos} onChange={setCorreos} />

                {/* Teléfonos */}
                <VendedorTelefonosCliente telefonos={telefonos} onChange={setTelefonos} />

                {/* Contactos */}
                <VendedorContactosCliente contactos={contactos} onChange={setContactos} />

                {/* Notas */}
                <div className="space-y-2">
                  <Label className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas de Entrega
                  </Label>
                  <Textarea
                    placeholder="Instrucciones especiales, referencias..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </>
            )}

            {/* ========== FORMULARIO MANUAL (Solo Remisión) ========== */}
            {modoEntrada === "manual" && (
              <>
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  📝 Cliente solo remisión - No requiere datos fiscales
                </div>

                {/* Nombre del Cliente */}
                <div className="space-y-2">
                  <Label className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nombre del Cliente *
                  </Label>
                  <Input
                    placeholder="Nombre del negocio o cliente"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>

                {/* Dirección Estructurada */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4" />
                    Dirección de Entrega *
                  </div>

                  <div className="space-y-2">
                    <Label>Calle *</Label>
                    <Input
                      placeholder="Nombre de la calle o avenida"
                      value={calle}
                      onChange={(e) => setCalle(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>No. Exterior *</Label>
                      <Input
                        placeholder="123"
                        value={numeroExterior}
                        onChange={(e) => setNumeroExterior(e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>No. Interior</Label>
                      <Input
                        placeholder="A, 5-B, etc."
                        value={numeroInterior}
                        onChange={(e) => setNumeroInterior(e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>

                  {/* Código Postal y Alcaldía con auto-completado */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Código Postal *
                        {buscandoCP && <Loader2 className="h-3 w-3 animate-spin" />}
                      </Label>
                      <div className="relative">
                        <Input
                          placeholder="01234"
                          value={codigoPostal}
                          onChange={(e) => handleCodigoPostalChange(e.target.value)}
                          className="h-12"
                          maxLength={5}
                        />
                        {cpAutocompletado && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Alcaldía/Municipio *
                        {cpAutocompletado && <span className="text-xs text-green-600">(auto)</span>}
                      </Label>
                      <Input
                        placeholder="Delegación o municipio"
                        value={alcaldia}
                        onChange={(e) => setAlcaldia(e.target.value)}
                        className={`h-12 ${cpAutocompletado ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Colonia con selector si hay múltiples */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Colonia
                      {coloniasDisponibles.length > 1 && (
                        <span className="text-xs text-muted-foreground">({coloniasDisponibles.length} opciones)</span>
                      )}
                    </Label>
                    {coloniasDisponibles.length > 1 ? (
                      <Select value={colonia} onValueChange={setColonia}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Seleccionar colonia..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {coloniasDisponibles.map((col) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Nombre de la colonia"
                        value={colonia}
                        onChange={(e) => setColonia(e.target.value)}
                        className={`h-12 ${cpAutocompletado && colonia ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : ''}`}
                      />
                    )}
                  </div>

                  {/* Nota sobre geocodificación */}
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      💡 Las coordenadas GPS exactas se pueden capturar después desde "Mis Clientes" cuando visites físicamente al cliente
                    </p>
                  </div>
                </div>

                {/* Zona - mostrar si fue auto-asignada */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Zona de Entrega
                    {zonaAutoAsignada && <span className="text-xs text-green-600">(auto-asignada)</span>}
                  </Label>
                  <Select value={zonaId} onValueChange={(value) => { setZonaId(value); setZonaAutoAsignada(false); }}>
                    <SelectTrigger className={`h-12 ${zonaAutoAsignada ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : ''}`}>
                      <SelectValue placeholder="Seleccionar zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {zonas.map((zona) => (
                        <SelectItem key={zona.id} value={zona.id}>{zona.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Restricciones de Entrega */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 font-medium">
                    <Clock className="h-4 w-4" />
                    Restricciones de Entrega
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Horario desde</Label>
                      <Input type="time" value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Horario hasta</Label>
                      <Input type="time" value={horarioFin} onChange={(e) => setHorarioFin(e.target.value)} className="h-12" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Días sin entrega (marcar días que NO se entrega)</Label>
                    <div className="flex flex-wrap gap-2">
                      {DIAS_SEMANA.map(dia => (
                        <Button
                          key={dia.key}
                          type="button"
                          variant={diasSinEntrega.includes(dia.key) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDiaSinEntrega(dia.key)}
                        >
                          {dia.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Correos */}
                <VendedorCorreosCliente correos={correos} onChange={setCorreos} />

                {/* Teléfonos */}
                <VendedorTelefonosCliente telefonos={telefonos} onChange={setTelefonos} />

                {/* Contactos */}
                <VendedorContactosCliente contactos={contactos} onChange={setContactos} />

                {/* Notas */}
                <div className="space-y-2">
                  <Label className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas de Entrega
                  </Label>
                  <Textarea
                    placeholder="Instrucciones especiales, referencias..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fixed Submit Button */}
        {((modoEntrada === "csf" && csfProcessed) || modoEntrada === "manual") && !parsingCsf && (
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
