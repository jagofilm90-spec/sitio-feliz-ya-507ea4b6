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
  Loader2, MapPin, User, FileText, Upload, Save,
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
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";

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

interface PostalCodeData {
  codigo_postal: string;
  municipio: string;
  estado: string;
  ciudad: string;
  colonias: string[];
  colonia_sugerida: string | null;
}

interface SucursalData {
  id: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  horario_entrega: string | null;
  dias_sin_entrega: string | null;
  notas: string | null;
}

const DIAS_SEMANA = [
  { key: "lunes", label: "Lun" },
  { key: "martes", label: "Mar" },
  { key: "miercoles", label: "Mié" },
  { key: "jueves", label: "Jue" },
  { key: "viernes", label: "Vie" },
  { key: "sabado", label: "Sáb" },
];

export function EditarClienteSheet({ open, onOpenChange, clienteId, onClienteActualizado }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zonas, setZonas] = useState<Zona[]>([]);

  // Contacto
  const [correos, setCorreos] = useState<CorreoCliente[]>([]);
  const [telefonos, setTelefonos] = useState<TelefonoCliente[]>([]);
  const [contactos, setContactos] = useState<ContactoCliente[]>([]);

  // Datos básicos
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");

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

  // Sucursal principal
  const [sucursalPrincipalId, setSucursalPrincipalId] = useState<string | null>(null);
  const [entregaMismaDireccion, setEntregaMismaDireccion] = useState(true);
  const [direccionEntregaGPS, setDireccionEntregaGPS] = useState("");
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);

  // Restricciones de entrega
  const [horarioInicio, setHorarioInicio] = useState("08:00");
  const [horarioFin, setHorarioFin] = useState("18:00");
  const [diasSinEntrega, setDiasSinEntrega] = useState<string[]>([]);

  // CSF
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

  useEffect(() => {
    if (open && clienteId) {
      fetchAllData();
    }
  }, [open, clienteId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [clienteRes, zonasRes, telefonosRes, contactosRes, correosRes, sucursalesRes] = await Promise.all([
        supabase.from("clientes").select("*").eq("id", clienteId).single(),
        supabase.from("zonas").select("id, nombre").eq("activo", true).order("nombre"),
        supabase.from("cliente_telefonos").select("*").eq("cliente_id", clienteId).eq("activo", true),
        supabase.from("cliente_contactos").select("*").eq("cliente_id", clienteId).eq("activo", true),
        supabase.from("cliente_correos").select("*").eq("cliente_id", clienteId).eq("activo", true),
        supabase.from("cliente_sucursales").select("id, nombre, direccion, latitud, longitud, horario_entrega, dias_sin_entrega, notas").eq("cliente_id", clienteId).eq("activo", true).order("nombre"),
      ]);

      if (clienteRes.error) throw clienteRes.error;
      const data = clienteRes.data;

      // Set basic data
      setNombre(data.nombre || "");
      setCodigo(data.codigo || "");
      setZonas(zonasRes.data || []);

      // Dirección estructurada
      setCalle(data.nombre_vialidad || "");
      setNumeroExterior(data.numero_exterior || "");
      setNumeroInterior(data.numero_interior || "");
      setColonia(data.nombre_colonia || "");
      setAlcaldia(data.nombre_municipio || "");
      setCodigoPostal(data.codigo_postal || "");
      setZonaId(data.zona_id || "");

      // Si tiene CP, intentar cargar colonias disponibles
      if (data.codigo_postal && data.codigo_postal.length === 5) {
        setCpAutocompletado(true);
        // Cargar colonias para el CP
        try {
          const { data: cpData } = await supabase.functions.invoke("lookup-postal-code", {
            body: { codigo_postal: data.codigo_postal },
          });
          if (cpData && !cpData.error) {
            setColoniasDisponibles(cpData.colonias || []);
          }
        } catch { /* silencioso */ }
      }

      // Datos fiscales
      setRfc(data.rfc || "");
      setRazonSocial(data.razon_social || "");
      setRegimenCapital(data.regimen_capital || "");
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
      setCsfProcessed(!!(data.rfc && data.rfc.trim()));
      setCodigoPostalFiscal(data.codigo_postal || "");

      // Build domicilio fiscal string
      if (data.rfc) {
        const domParts = [
          data.tipo_vialidad, data.nombre_vialidad,
          data.numero_exterior && `No. ${data.numero_exterior}`,
          data.numero_interior && `Int. ${data.numero_interior}`,
          data.nombre_colonia && `Col. ${data.nombre_colonia}`,
          data.nombre_municipio, data.nombre_entidad_federativa,
          data.codigo_postal && `C.P. ${data.codigo_postal}`,
        ].filter(Boolean).join(", ");
        setDomicilioFiscal(domParts);
      }

      // Sucursal principal
      const sucursales: SucursalData[] = sucursalesRes.data || [];
      const principal = sucursales.find(s => s.nombre === "Principal") || sucursales[0];
      if (principal) {
        setSucursalPrincipalId(principal.id);
        // Check if delivery is at a different address
        const clienteDireccion = data.direccion || "";
        const sucursalDireccion = principal.direccion || "";
        const misma = !sucursalDireccion || sucursalDireccion === clienteDireccion;
        setEntregaMismaDireccion(misma);
        if (!misma) {
          setDireccionEntregaGPS(sucursalDireccion);
        }
        setLatitud(principal.latitud);
        setLongitud(principal.longitud);

        // Horarios
        if (principal.horario_entrega) {
          const parts = principal.horario_entrega.split(" - ");
          if (parts.length === 2) {
            setHorarioInicio(parts[0].trim());
            setHorarioFin(parts[1].trim());
          }
        }
        if (principal.dias_sin_entrega) {
          setDiasSinEntrega(principal.dias_sin_entrega.split(", ").filter(Boolean));
        }
        setNotas(principal.notas || "");
      }

      // Telefonos, contactos, correos
      setTelefonos((telefonosRes.data || []).map(t => ({
        telefono: t.telefono,
        etiqueta: t.etiqueta || "Principal",
        esPrincipal: t.es_principal || false,
      })));
      setContactos((contactosRes.data || []).map(c => ({
        nombre: c.nombre,
        puesto: c.puesto || "Contacto",
        esPrincipal: c.es_principal || false,
      })));
      setCorreos((correosRes.data || []).map(c => ({
        email: c.email,
        nombreContacto: c.nombre_contacto || "",
        proposito: c.proposito || "pedidos",
      })));

    } catch (error) {
      console.error("Error fetching cliente:", error);
      toast.error("Error al cargar datos del cliente");
    } finally {
      setLoading(false);
    }
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
        if (cpData.colonia_sugerida && !colonia) setColonia(cpData.colonia_sugerida);
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
      // silencioso
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
          csfData.tipo_vialidad, csfData.nombre_vialidad,
          csfData.numero_exterior && `No. ${csfData.numero_exterior}`,
          csfData.numero_interior && `Int. ${csfData.numero_interior}`,
          csfData.nombre_colonia && `Col. ${csfData.nombre_colonia}`,
          csfData.nombre_municipio, csfData.nombre_entidad_federativa,
          csfData.codigo_postal && `C.P. ${csfData.codigo_postal}`,
        ].filter(Boolean).join(", ");
        setDomicilioFiscal(domicilioParts);
        setCsfProcessed(true);

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

  const handleSave = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!calle.trim() || !numeroExterior.trim() || !alcaldia.trim() || !codigoPostal.trim()) {
      toast.error("Completa los campos obligatorios de dirección: Calle, No. Ext., Alcaldía y CP");
      return;
    }

    setSaving(true);
    try {
      const emailPrincipal =
        correos.find(c => c.proposito === "todo")?.email ||
        (correos.length > 0 ? correos[0].email : null);
      const telefonoPrincipal =
        telefonos.find(t => t.esPrincipal)?.telefono ||
        (telefonos.length > 0 ? telefonos[0].telefono : null);

      const direccionNegocio = construirDireccionNegocio();
      const preferencia = csfProcessed ? "siempre_factura" : "siempre_remision";

      // 1. Update main cliente record
      const clienteUpdate: any = {
        nombre: nombre.trim(),
        telefono: telefonoPrincipal,
        email: emailPrincipal,
        direccion: direccionNegocio || null,
        nombre_vialidad: calle || null,
        numero_exterior: numeroExterior || null,
        numero_interior: numeroInterior || null,
        nombre_colonia: colonia || null,
        nombre_municipio: alcaldia || null,
        codigo_postal: codigoPostal || null,
        zona_id: zonaId || null,
        preferencia_facturacion: preferencia,
      };

      if (csfProcessed) {
        clienteUpdate.rfc = rfc.trim() || null;
        clienteUpdate.razon_social = razonSocial.trim() || null;
        clienteUpdate.regimen_capital = regimenCapital.trim() || null;
        clienteUpdate.tipo_vialidad = tipoVialidad || null;
        clienteUpdate.nombre_localidad = nombreLocalidad || null;
        clienteUpdate.nombre_entidad_federativa = nombreEntidadFederativa || null;
        clienteUpdate.entre_calle = entreCalle || null;
        clienteUpdate.y_calle = yCalle || null;
      }

      const { error: clienteError } = await supabase
        .from("clientes")
        .update(clienteUpdate)
        .eq("id", clienteId);

      if (clienteError) throw clienteError;

      // 2. Update sucursal principal
      if (sucursalPrincipalId) {
        let direccionSucursal: string;
        let latSuc: number | null = null;
        let lngSuc: number | null = null;

        if (entregaMismaDireccion) {
          direccionSucursal = direccionNegocio;
        } else {
          direccionSucursal = direccionEntregaGPS;
          latSuc = latitud;
          lngSuc = longitud;
        }

        await supabase
          .from("cliente_sucursales")
          .update({
            direccion: direccionSucursal,
            latitud: latSuc,
            longitud: lngSuc,
            telefono: telefonoPrincipal,
            zona_id: zonaId || null,
            horario_entrega: `${horarioInicio} - ${horarioFin}`,
            dias_sin_entrega: diasSinEntrega.length > 0 ? diasSinEntrega.join(", ") : null,
            notas: notas.trim() || null,
          })
          .eq("id", sucursalPrincipalId);
      }

      // 3. Upload new CSF if provided
      if (csfFile) {
        try {
          const extension = csfFile.name.endsWith(".pdf") ? "pdf" : "jpg";
          const storagePath = `${clienteId}/csf.${extension}`;
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
              .eq("id", clienteId);
          }
        } catch (uploadErr) {
          console.warn("Error subiendo CSF:", uploadErr);
        }
      }

      // 4. Sync telefonos
      await supabase.from("cliente_telefonos").update({ activo: false }).eq("cliente_id", clienteId);
      if (telefonos.length > 0) {
        await supabase.from("cliente_telefonos").insert(
          telefonos.map(t => ({
            cliente_id: clienteId,
            telefono: t.telefono,
            etiqueta: t.etiqueta,
            es_principal: t.esPrincipal,
            activo: true,
          }))
        );
      }

      // 5. Sync contactos
      await supabase.from("cliente_contactos").update({ activo: false }).eq("cliente_id", clienteId);
      if (contactos.length > 0) {
        await supabase.from("cliente_contactos").insert(
          contactos.map(c => ({
            cliente_id: clienteId,
            nombre: c.nombre,
            puesto: c.puesto,
            es_principal: c.esPrincipal,
            activo: true,
          }))
        );
      }

      // 6. Sync correos
      await supabase.from("cliente_correos").update({ activo: false }).eq("cliente_id", clienteId);
      if (correos.length > 0) {
        await supabase.from("cliente_correos").insert(
          correos.map(c => ({
            cliente_id: clienteId,
            email: c.email,
            nombre_contacto: c.nombreContacto || null,
            proposito: c.proposito,
            activo: true,
          }))
        );
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

  const puedeGuardar =
    nombre.trim().length > 0 &&
    calle.trim().length > 0 &&
    numeroExterior.trim().length > 0 &&
    alcaldia.trim().length > 0 &&
    codigoPostal.trim().length === 5;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] flex flex-col p-0 gap-0">
        {/* Header fijo */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <SheetTitle className="text-xl">Editar Cliente — {codigo}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <AlmasaLoading size={48} />
          </div>
        ) : (
          <>
            {/* Cuerpo scrolleable */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 max-w-2xl mx-auto px-4 py-4 pb-24">

                {/* 1. NOMBRE */}
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

                {/* 2. TELÉFONOS */}
                <VendedorTelefonosCliente telefonos={telefonos} onChange={setTelefonos} />

                {/* 3. CORREOS */}
                <VendedorCorreosCliente correos={correos} onChange={setCorreos} />

                {/* 4. DIRECCIÓN DEL NEGOCIO */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm font-semibold text-muted-foreground px-2">
                      Dirección del negocio
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-2">
                    <Label>Calle *</Label>
                    <Input
                      placeholder="Nombre de la calle o avenida"
                      value={calle}
                      onChange={e => setCalle(e.target.value)}
                      className="h-12"
                    />
                  </div>

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

                {/* 5. UBICACIÓN DE ENTREGA */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm font-semibold text-muted-foreground px-2 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Ubicación de entrega
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border">
                    <Checkbox
                      id="misma-dir-edit"
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
                    <label htmlFor="misma-dir-edit" className="text-sm cursor-pointer flex-1 leading-snug">
                      La entrega es en esta misma dirección del negocio
                    </label>
                  </div>

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
                    </div>
                  )}

                  {entregaMismaDireccion && latitud && longitud && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-md border border-green-200">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>GPS actual: {latitud.toFixed(5)}, {longitud.toFixed(5)}</span>
                    </div>
                  )}

                  {entregaMismaDireccion && !latitud && !longitud && (
                    <p className="text-xs text-muted-foreground px-1">
                      💡 El GPS se puede capturar desde Mis Clientes → Geocodificar
                    </p>
                  )}
                </div>

                {/* 6. RESTRICCIONES DE ENTREGA */}
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

                {/* 7. CSF */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm font-semibold text-muted-foreground px-2">
                      Facturación / CSF
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {!csfProcessed && !parsingCsf && (
                    <div className="p-4 border-2 border-dashed rounded-lg space-y-3 text-center">
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Sin datos fiscales — cliente solo remisión</p>
                        <p className="text-xs mt-1">Si el cliente requiere factura, sube su CSF</p>
                      </div>
                      <label htmlFor="csf-upload-edit" className="cursor-pointer">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/50 text-primary hover:bg-primary/5 transition-colors text-sm font-medium">
                          <Upload className="h-4 w-4" />
                          Subir CSF
                        </div>
                        <input
                          id="csf-upload-edit"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleCsfUpload}
                          className="sr-only"
                          disabled={parsingCsf}
                        />
                      </label>
                    </div>
                  )}

                  {parsingCsf && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">Procesando con IA…</p>
                      <p className="text-xs text-muted-foreground">Extrayendo datos fiscales del documento</p>
                    </div>
                  )}

                  {csfProcessed && !parsingCsf && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              Datos fiscales configurados
                            </p>
                            <p className="text-xs text-green-600">
                              Cliente facturará automáticamente
                            </p>
                          </div>
                        </div>
                        <label htmlFor="csf-upload-edit-replace" className="cursor-pointer">
                          <span className="text-xs text-primary underline">Cambiar CSF</span>
                          <input
                            id="csf-upload-edit-replace"
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
                          Datos Fiscales
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

                {/* 8. NOTAS */}
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

            {/* FOOTER FIJO */}
            <div className="shrink-0 px-4 py-3 border-t bg-background">
              <Button
                onClick={handleSave}
                disabled={saving || !puedeGuardar}
                className="w-full h-14 text-base font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
              {!puedeGuardar && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Completa el nombre y dirección para continuar
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
