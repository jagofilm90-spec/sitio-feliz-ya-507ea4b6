import { useState, useEffect } from "react";
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
  Building2, CheckCircle2, Clock, AlertCircle
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

  // Contacto
  const [correos, setCorreos] = useState<CorreoCliente[]>([]);
  const [telefonos, setTelefonos] = useState<TelefonoCliente[]>([]);
  const [contactos, setContactos] = useState<ContactoCliente[]>([]);

  // Datos básicos
  const [nombre, setNombre] = useState("");

  // Dirección del negocio (estructurada)
  const [calle, setCalle] = useState("");
  const [numeroExterior, setNumeroExterior] = useState("");
  const [numeroInterior, setNumeroInterior] = useState("");
  const [colonia, setColonia] = useState("");
  const [alcaldia, setAlcaldia] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [zonaId, setZonaId] = useState("");
  const [buscandoCP, setBuscandoCP] = useState(false);
  const [coloniasDisponibles, setColoniasDisponibles] = useState<string[]>([]);
  const [cpAutocompletado, setCpAutocompletado] = useState(false);
  const [zonaAutoAsignada, setZonaAutoAsignada] = useState(false);

  // Ubicación de entrega
  const [entregaMismaDireccion, setEntregaMismaDireccion] = useState(true);
  const [direccionEntregaGPS, setDireccionEntregaGPS] = useState("");
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);

  // Restricciones de entrega
  const [horarioInicio, setHorarioInicio] = useState("08:00");
  const [horarioFin, setHorarioFin] = useState("18:00");
  const [diasSinEntrega, setDiasSinEntrega] = useState<string[]>([]);

  // CSF (opcional)
  const [parsingCsf, setParsingCsf] = useState(false);
  const [csfProcessed, setCsfProcessed] = useState(false);
  const [csfFile, setCsfFile] = useState<File | null>(null);
  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [regimenCapital, setRegimenCapital] = useState("");
  const [domicilioFiscal, setDomicilioFiscal] = useState("");
  const [codigoPostalFiscal, setCodigoPostalFiscal] = useState("");
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

  // Notas
  const [notas, setNotas] = useState("");

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setCorreos([]);
    setTelefonos([]);
    setContactos([]);
    setNombre("");
    setCalle("");
    setNumeroExterior("");
    setNumeroInterior("");
    setColonia("");
    setAlcaldia("");
    setCodigoPostal("");
    setZonaId("");
    setBuscandoCP(false);
    setColoniasDisponibles([]);
    setCpAutocompletado(false);
    setZonaAutoAsignada(false);
    setEntregaMismaDireccion(true);
    setDireccionEntregaGPS("");
    setLatitud(null);
    setLongitud(null);
    setHorarioInicio("08:00");
    setHorarioFin("18:00");
    setDiasSinEntrega([]);
    setParsingCsf(false);
    setCsfProcessed(false);
    setCsfFile(null);
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
    setNotas("");
  };

  // Cargar zonas cuando se abre el sheet
  const fetchZonas = async () => {
    try {
      const { data, error } = await supabase
        .from("zonas")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");
      if (error) {
        console.error("Error cargando zonas:", error);
        return;
      }
      setZonas(data || []);
    } catch (err) {
      console.error("Error cargando zonas:", err);
    }
  };

  // useEffect para cargar zonas al abrir
  useEffect(() => {
    if (open && zonas.length === 0) {
      fetchZonas();
    }
  }, [open]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) resetForm();
  };

  const normalizarTexto = (texto: string): string =>
    texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const buscarZonaPorMunicipio = (municipio: string): Zona | undefined => {
    if (!municipio || zonas.length === 0) return undefined;
    const mun = normalizarTexto(municipio);
    return zonas.find(z => {
      const zn = normalizarTexto(z.nombre);
      return zn === mun || zn.includes(mun) || mun.includes(zn);
    });
  };

  const buscarCodigoPostal = async (cp: string) => {
    if (cp.length !== 5) return;
    setBuscandoCP(true);
    setCpAutocompletado(false);
    setZonaAutoAsignada(false);

    try {
      const { data, error } = await supabase.functions.invoke("lookup-postal-code", {
        body: { codigo_postal: cp },
      });
      if (error) throw error;

      if (data && !data.error) {
        const cpData = data as PostalCodeData;
        setAlcaldia(cpData.municipio);
        setColoniasDisponibles(cpData.colonias);
        if (cpData.colonia_sugerida) setColonia(cpData.colonia_sugerida);
        setCpAutocompletado(true);

        const zonaMatch = buscarZonaPorMunicipio(cpData.municipio);
        if (zonaMatch) {
          setZonaId(zonaMatch.id);
          setZonaAutoAsignada(true);
          toast.success(`Alcaldía y zona: ${cpData.municipio}`);
        } else {
          toast.success(`Alcaldía: ${cpData.municipio}`);
        }
      }
    } catch {
      // silencioso — permite captura manual
    } finally {
      setBuscandoCP(false);
    }
  };

  const handleCodigoPostalChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 5);
    setCodigoPostal(cleaned);
    setCpAutocompletado(false);
    setZonaAutoAsignada(false);
    if (cleaned.length === 5) buscarCodigoPostal(cleaned);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
    });

  const handleCsfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingCsf(true);
    setCsfFile(file);
    // Reset previous CSF data
    setCsfProcessed(false);

    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("parse-csf", {
        body: { pdfBase64: base64 },
      });
      if (error) throw error;

      const csfData = data?.data;
      if (csfData) {
        setRfc(csfData.rfc || "");
        setRazonSocial(csfData.razon_social || "");
        setRegimenCapital(csfData.regimen_capital || "");
        setCodigoPostalFiscal(csfData.codigo_postal || "");

        // Si el nombre aún no fue puesto, sugerir razón social
        if (!nombre.trim()) setNombre(csfData.razon_social || "");

        setTipoVialidad(csfData.tipo_vialidad || "");
        setNombreVialidad(csfData.nombre_vialidad || "");
        setNumExtFiscal(csfData.numero_exterior || "");
        setNumIntFiscal(csfData.numero_interior || "");
        setNombreColonia(csfData.nombre_colonia || "");
        setNombreLocalidad(csfData.nombre_localidad || "");
        setNombreMunicipio(csfData.nombre_municipio || "");
        setNombreEntidadFederativa(csfData.nombre_entidad_federativa || "");
        setEntreCalle(csfData.entre_calle || "");
        setYCalle(csfData.y_calle || "");

        const domicilioParts = [
          csfData.tipo_vialidad,
          csfData.nombre_vialidad,
          csfData.numero_exterior && `No. ${csfData.numero_exterior}`,
          csfData.numero_interior && `Int. ${csfData.numero_interior}`,
          csfData.nombre_colonia && `Col. ${csfData.nombre_colonia}`,
          csfData.nombre_municipio,
          csfData.nombre_entidad_federativa,
          csfData.codigo_postal && `C.P. ${csfData.codigo_postal}`,
        ]
          .filter(Boolean)
          .join(", ");
        setDomicilioFiscal(domicilioParts);
        setCsfProcessed(true);

        // Auto-asignar zona
        const zonaMatch =
          buscarZonaPorMunicipio(csfData.nombre_municipio || "") ||
          buscarZonaPorMunicipio(csfData.nombre_entidad_federativa || "");
        if (zonaMatch && !zonaId) {
          setZonaId(zonaMatch.id);
          setZonaAutoAsignada(true);
        }

        toast.success("Datos fiscales extraídos correctamente");

        if (csfData.codigo_postal && !codigoPostal) {
          setCodigoPostal(csfData.codigo_postal);
          buscarCodigoPostal(csfData.codigo_postal);
        }
      }
    } catch (error: any) {
      console.error("Error parsing CSF:", error);
      toast.error("Error al procesar el CSF. Intente de nuevo.");
      setCsfFile(null);
    } finally {
      setParsingCsf(false);
    }
  };

  const handleAddressGPSSelect = async (address: string, placeId?: string) => {
    setDireccionEntregaGPS(address);
    if (placeId) {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-place-details?place_id=${encodeURIComponent(placeId)}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.lat && data.lng) {
            setLatitud(data.lat);
            setLongitud(data.lng);
            toast.success("Coordenadas GPS obtenidas");
          }
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
      }
    }
  };

  const toggleDiaSinEntrega = (dia: string) => {
    setDiasSinEntrega(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const generarCodigo = async (): Promise<string> => {
    const { count } = await supabase
      .from("clientes")
      .select("id", { count: "exact", head: true });
    return `CLI${((count || 0) + 1).toString().padStart(4, "0")}`;
  };

  const construirDireccionNegocio = (): string => {
    const partes = [
      calle,
      numeroExterior ? `No. ${numeroExterior}` : null,
      numeroInterior ? `Int. ${numeroInterior}` : null,
      colonia ? `Col. ${colonia}` : null,
      alcaldia,
      codigoPostal ? `CP ${codigoPostal}` : null,
    ].filter(Boolean);
    return partes.join(", ");
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre del cliente es requerido");
      return;
    }
    if (!calle.trim() || !numeroExterior.trim() || !alcaldia.trim() || !codigoPostal.trim()) {
      toast.error("Completa los campos obligatorios de dirección: Calle, No. Ext., Alcaldía y CP");
      return;
    }
    if (!entregaMismaDireccion && !direccionEntregaGPS.trim()) {
      toast.error("Selecciona la dirección de entrega en el mapa");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const codigo = await generarCodigo();
      const preferencia = csfProcessed ? "siempre_factura" : "siempre_remision";

      const emailPrincipal =
        correos.find(c => c.proposito === "todo")?.email ||
        (correos.length > 0 ? correos[0].email : null);
      const telefonoPrincipal =
        telefonos.find(t => t.esPrincipal)?.telefono ||
        (telefonos.length > 0 ? telefonos[0].telefono : null);

      const direccionNegocio = construirDireccionNegocio();

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
        // Dirección del negocio (estructurada)
        direccion: direccionNegocio || null,
        nombre_vialidad: calle || null,
        numero_exterior: numeroExterior || null,
        numero_interior: numeroInterior || null,
        nombre_colonia: colonia || null,
        nombre_municipio: alcaldia || null,
        codigo_postal: codigoPostal || null,
      };

      // Datos fiscales (solo si se subió CSF)
      if (csfProcessed) {
        clienteData.rfc = rfc.trim() || null;
        clienteData.razon_social = razonSocial.trim() || null;
        clienteData.regimen_capital = regimenCapital.trim() || null;
        clienteData.tipo_vialidad = tipoVialidad || null;
        clienteData.nombre_localidad = nombreLocalidad || null;
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

      // Subir CSF al storage
      if (csfProcessed && csfFile) {
        try {
          const extension = csfFile.name.endsWith(".pdf") ? "pdf" : "jpg";
          const storagePath = `${cliente.id}/csf.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("clientes-csf")
            .upload(storagePath, csfFile, { upsert: true });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("clientes-csf")
              .getPublicUrl(storagePath);
            await supabase
              .from("clientes")
              .update({ csf_archivo_url: urlData.publicUrl })
              .eq("id", cliente.id);
          }
        } catch (uploadErr) {
          console.warn("Error subiendo CSF:", uploadErr);
        }
      }

      // Dirección y GPS para la sucursal Principal
      let direccionSucursal: string;
      let latSucursal: number | null = null;
      let lngSucursal: number | null = null;

      if (entregaMismaDireccion) {
        // Mismo domicilio del negocio, GPS se puede capturar después
        direccionSucursal = direccionNegocio;
      } else {
        // Dirección diferente con coordenadas GPS
        direccionSucursal = direccionEntregaGPS;
        latSucursal = latitud;
        lngSucursal = longitud;
      }

      const { error: sucursalError } = await supabase.from("cliente_sucursales").insert({
        cliente_id: cliente.id,
        nombre: "Principal",
        direccion: direccionSucursal,
        latitud: latSucursal,
        longitud: lngSucursal,
        telefono: telefonoPrincipal,
        zona_id: zonaId || null,
        horario_entrega: `${horarioInicio} - ${horarioFin}`,
        dias_sin_entrega: diasSinEntrega.length > 0 ? diasSinEntrega.join(", ") : null,
        notas: notas.trim() || null,
        activo: true,
      });

      if (sucursalError) throw sucursalError;

      if (correos.length > 0) {
        await supabase.from("cliente_correos").insert(
          correos.map((correo, index) => ({
            cliente_id: cliente.id,
            email: correo.email,
            nombre_contacto: correo.nombreContacto || null,
            proposito: correo.proposito,
            es_principal: index === 0,
          }))
        );
      }

      if (telefonos.length > 0) {
        await supabase.from("cliente_telefonos").insert(
          telefonos.map(tel => ({
            cliente_id: cliente.id,
            telefono: tel.telefono,
            etiqueta: tel.etiqueta,
            es_principal: tel.esPrincipal,
          }))
        );
      }

      if (contactos.length > 0) {
        await supabase.from("cliente_contactos").insert(
          contactos.map(c => ({
            cliente_id: cliente.id,
            nombre: c.nombre,
            puesto: c.puesto,
            es_principal: c.esPrincipal,
          }))
        );
      }

      toast.success(`Cliente "${nombre}" creado correctamente`);
      resetForm();
      onClienteCreado();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  // ─── Validación del botón de envío ────────────────────────────────────────
  const puedeEnviar =
    nombre.trim().length > 0 &&
    calle.trim().length > 0 &&
    numeroExterior.trim().length > 0 &&
    alcaldia.trim().length > 0 &&
    codigoPostal.trim().length === 5;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] flex flex-col p-0 gap-0">
        {/* Header fijo */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <SheetTitle className="text-xl">Nuevo Cliente</SheetTitle>
        </SheetHeader>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 max-w-2xl mx-auto px-4 py-4 pb-24">

            {/* ══════════════════════════════════════════════════════
                1. NOMBRE DEL CLIENTE
            ══════════════════════════════════════════════════════ */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Nombre del cliente *
              </Label>
              <Input
                placeholder="Nombre del negocio o cliente"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="h-14 text-lg"
              />
            </div>

            {/* ══════════════════════════════════════════════════════
                2. TELÉFONOS
            ══════════════════════════════════════════════════════ */}
            <VendedorTelefonosCliente telefonos={telefonos} onChange={setTelefonos} />

            {/* ══════════════════════════════════════════════════════
                3. CORREOS
            ══════════════════════════════════════════════════════ */}
            <VendedorCorreosCliente correos={correos} onChange={setCorreos} />

            {/* ══════════════════════════════════════════════════════
                4. DIRECCIÓN DEL NEGOCIO
            ══════════════════════════════════════════════════════ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-semibold text-muted-foreground px-2">
                  Dirección del negocio
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Calle */}
              <div className="space-y-2">
                <Label>Calle *</Label>
                <Input
                  placeholder="Nombre de la calle o avenida"
                  value={calle}
                  onChange={e => setCalle(e.target.value)}
                  className="h-12"
                />
              </div>

              {/* No. Ext / No. Int */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>No. Exterior *</Label>
                  <Input
                    placeholder="123"
                    value={numeroExterior}
                    onChange={e => setNumeroExterior(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>No. Interior</Label>
                  <Input
                    placeholder="A, 5-B..."
                    value={numeroInterior}
                    onChange={e => setNumeroInterior(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>

              {/* CP + Alcaldía */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Código Postal *</Label>
                  <div className="relative">
                    <Input
                      placeholder="06600"
                      value={codigoPostal}
                      onChange={e => handleCodigoPostalChange(e.target.value)}
                      className="h-12 pr-10"
                      maxLength={5}
                      inputMode="numeric"
                    />
                    {buscandoCP && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {cpAutocompletado && !buscandoCP && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Alcaldía / Municipio *</Label>
                  <Input
                    placeholder="Cuauhtémoc"
                    value={alcaldia}
                    onChange={e => setAlcaldia(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>

              {/* Colonia */}
              <div className="space-y-2">
                <Label>Colonia</Label>
                {coloniasDisponibles.length > 1 ? (
                  <Select value={colonia} onValueChange={setColonia}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Seleccionar colonia" />
                    </SelectTrigger>
                    <SelectContent>
                      {coloniasDisponibles.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Colonia"
                    value={colonia}
                    onChange={e => setColonia(e.target.value)}
                    className="h-12"
                  />
                )}
              </div>

              {/* Zona */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Zona de entrega
                  {zonaAutoAsignada && (
                    <span className="text-xs text-green-600 font-normal">(asignada automáticamente)</span>
                  )}
                </Label>
                <Select value={zonaId} onValueChange={setZonaId}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Seleccionar zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {zonas.map(zona => (
                      <SelectItem key={zona.id} value={zona.id}>{zona.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                5. UBICACIÓN DE ENTREGA
            ══════════════════════════════════════════════════════ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-semibold text-muted-foreground px-2 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Ubicación de entrega
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Checkbox */}
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border">
                <Checkbox
                  id="misma-dir"
                  checked={entregaMismaDireccion}
                  onCheckedChange={checked => {
                    setEntregaMismaDireccion(checked as boolean);
                    if (checked) {
                      setDireccionEntregaGPS("");
                      setLatitud(null);
                      setLongitud(null);
                    }
                  }}
                />
                <label htmlFor="misma-dir" className="text-sm cursor-pointer flex-1 leading-snug">
                  La entrega es en esta misma dirección del negocio
                </label>
              </div>

              {/* Dirección diferente */}
              {!entregaMismaDireccion && (
                <div className="space-y-3 p-4 border border-primary/30 rounded-lg bg-primary/5">
                  <p className="text-sm font-medium text-foreground">
                    Busca la dirección exacta donde se entregará:
                  </p>
                  <GoogleMapsAddressAutocomplete
                    value={direccionEntregaGPS}
                    onChange={handleAddressGPSSelect}
                    placeholder="Buscar dirección de entrega..."
                  />

                  {latitud && longitud ? (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-md border border-green-200">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>GPS capturado: {latitud.toFixed(5)}, {longitud.toFixed(5)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Selecciona una dirección de la lista para capturar el GPS</span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    💡 Las coordenadas exactas también se pueden actualizar después con una visita física desde Mis Clientes
                  </p>
                </div>
              )}

              {entregaMismaDireccion && (
                <p className="text-xs text-muted-foreground px-1">
                  💡 El GPS se puede capturar después con una visita física desde Mis Clientes
                </p>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════
                6. RESTRICCIONES DE ENTREGA
            ══════════════════════════════════════════════════════ */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Clock className="h-4 w-4" />
                Restricciones de entrega
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Horario desde</Label>
                  <Input
                    type="time"
                    value={horarioInicio}
                    onChange={e => setHorarioInicio(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Horario hasta</Label>
                  <Input
                    type="time"
                    value={horarioFin}
                    onChange={e => setHorarioFin(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Días sin entrega (marcar los que NO se entrega)</Label>
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

            {/* ══════════════════════════════════════════════════════
                7. CSF (OPCIONAL)
            ══════════════════════════════════════════════════════ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-semibold text-muted-foreground px-2">
                  Facturación / CSF (opcional)
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Estado actual del CSF */}
              {!csfProcessed && !parsingCsf && (
                <div className="p-4 border-2 border-dashed rounded-lg space-y-3 text-center">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Sin datos fiscales — cliente solo remisión</p>
                    <p className="text-xs mt-1">Si el cliente requiere factura, sube su Constancia de Situación Fiscal (CSF)</p>
                  </div>
                  <label htmlFor="csf-upload" className="cursor-pointer">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/50 text-primary hover:bg-primary/5 transition-colors text-sm font-medium">
                      <Upload className="h-4 w-4" />
                      Subir CSF
                    </div>
                    <input
                      id="csf-upload"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleCsfUpload}
                      className="sr-only"
                      disabled={parsingCsf}
                    />
                  </label>
                </div>
              )}

              {/* Procesando CSF */}
              {parsingCsf && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Procesando con IA…</p>
                  <p className="text-xs text-muted-foreground">Extrayendo datos fiscales del documento</p>
                </div>
              )}

              {/* CSF procesado — mostrar datos extraídos */}
              {csfProcessed && !parsingCsf && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Datos fiscales extraídos
                        </p>
                        <p className="text-xs text-green-600">
                          Cliente facturará automáticamente
                        </p>
                      </div>
                    </div>
                    {/* Opción de cambiar CSF */}
                    <label htmlFor="csf-upload-replace" className="cursor-pointer">
                      <span className="text-xs text-primary underline">Cambiar</span>
                      <input
                        id="csf-upload-replace"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleCsfUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4" />
                      Datos Fiscales (edita si hay algún error)
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">RFC</Label>
                        <Input
                          value={rfc}
                          onChange={e => setRfc(e.target.value.toUpperCase())}
                          className="h-11 font-mono"
                          maxLength={13}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">CP Fiscal</Label>
                        <Input
                          value={codigoPostalFiscal}
                          onChange={e => setCodigoPostalFiscal(e.target.value)}
                          className="h-11"
                          maxLength={5}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Razón Social</Label>
                      <Input
                        value={razonSocial}
                        onChange={e => setRazonSocial(e.target.value)}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Domicilio Fiscal</Label>
                      <Textarea
                        value={domicilioFiscal}
                        onChange={e => setDomicilioFiscal(e.target.value)}
                        rows={2}
                        className="resize-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════
                8. NOTAS
            ══════════════════════════════════════════════════════ */}
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notas de entrega
              </Label>
              <Textarea
                placeholder="Instrucciones especiales, referencias, horarios específicos..."
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Contactos adicionales */}
            <VendedorContactosCliente contactos={contactos} onChange={setContactos} />

          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            FOOTER FIJO — Botón Crear Cliente
        ══════════════════════════════════════════════════════ */}
        <div className="shrink-0 px-4 py-3 border-t bg-background">
          <Button
            onClick={handleSubmit}
            disabled={loading || !puedeEnviar}
            className="w-full h-14 text-base font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Creando cliente…
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Crear Cliente
              </>
            )}
          </Button>
          {!puedeEnviar && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Completa el nombre y dirección para continuar
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
