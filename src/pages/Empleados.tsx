import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRoles } from "@/hooks/useUserRoles";
import { EmpleadoCardMobile } from "@/components/empleados/EmpleadoCardMobile";
import { DarAccesoSistemaDialog } from "@/components/empleados/DarAccesoSistemaDialog";
import { FirmaContratoFlow } from "@/components/empleados/FirmaContratoFlow";
import { ExpedienteDigital } from "@/components/empleados/ExpedienteDigital";
import { generarContratoPDF, generarAvisoPrivacidadPDF } from "@/lib/generarContratoPDF";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ExpedienteAnalysisDialog from "@/components/empleados/ExpedienteAnalysisDialog";
import {
  UserPlus,
  Search,
  Edit,
  FileText,
  Upload,
  Download,
  Trash2,
  Users,
  Bell,
  AlertTriangle,
  FileStack,
  CheckCircle,
  Clock,
} from "lucide-react";

interface Empleado {
  id: string;
  user_id: string | null;
  nombre_completo: string;
  nombre: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  rfc: string | null;
  curp: string | null;
  fecha_nacimiento: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  tipo_sangre: string | null;
  estado_civil: string | null;
  numero_dependientes: number | null;
  nivel_estudios: string | null;
  cuenta_bancaria: string | null;
  clabe_interbancaria: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  fecha_ingreso: string;
  puesto: string;
  activo: boolean;
  notas: string | null;
  numero_seguro_social: string | null;
  sueldo_bruto: number | null;
  periodo_pago: "semanal" | "quincenal" | null;
  beneficiario: string | null;
  premio_asistencia_semanal: number | null;
  fecha_baja: string | null;
  motivo_baja: "renuncia" | "despido" | "abandono" | null;
  created_at: string;
  updated_at: string;
}

interface EmpleadoDocumento {
  id: string;
  empleado_id: string;
  tipo_documento: 
    | "contrato_laboral"
    | "ine"
    | "carta_seguro_social"
    | "constancia_situacion_fiscal"
    | "acta_nacimiento"
    | "comprobante_domicilio"
    | "curp"
    | "rfc"
    | "carta_renuncia"
    | "carta_despido"
    | "comprobante_finiquito"
    | "licencia_conducir"
    | "otro";
  nombre_archivo: string;
  ruta_storage: string;
  fecha_vencimiento: string | null;
  created_at: string;
}

interface EmpleadoDocumentoPendiente {
  id: string;
  empleado_id: string;
  tipo_documento: EmpleadoDocumento["tipo_documento"];
  notas: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
}

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  empleado_id: string | null;
  documento_id: string | null;
  fecha_vencimiento: string | null;
  leida: boolean;
  created_at: string;
}

const Empleados = () => {
  const isMobile = useIsMobile();
  const { isAdmin } = useUserRoles();
  const [searchParams] = useSearchParams();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [documentos] = useState<Record<string, EmpleadoDocumento[]>>({});
  const [documentosPendientes] = useState<Record<string, EmpleadoDocumentoPendiente[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [selectedEmpleado, setSelectedEmpleado] = useState<string | null>(null);
  const [editingLicenseDoc, setEditingLicenseDoc] = useState<EmpleadoDocumento | null>(null);
  const [firmaFlowEmpleado, setFirmaFlowEmpleado] = useState<Empleado | null>(null);
  const [historialSueldo, setHistorialSueldo] = useState<Array<{ id: string; sueldo_anterior: number | null; sueldo_nuevo: number | null; premio_anterior: number | null; premio_nuevo: number | null; fecha_cambio: string }>>([]);
  const [activeTab, setActiveTab] = useState<string>("todos");
  const [filtroPuesto, setFiltroPuesto] = useState<"todos" | "secretaria" | "vendedor" | "chofer" | "almacenista" | "gerente de almacén">("todos");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "activos" | "inactivos">("todos");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nombre_completo: "",
    nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    rfc: "",
    curp: "",
    fecha_nacimiento: "",
    contacto_emergencia_nombre: "",
    contacto_emergencia_telefono: "",
    tipo_sangre: "",
    estado_civil: "",
    numero_dependientes: "",
    nivel_estudios: "",
    cuenta_bancaria: "",
    clabe_interbancaria: "",
    telefono: "",
    email: "",
    direccion: "",
    fecha_ingreso: new Date().toISOString().split("T")[0],
    puesto: "",
    user_id: "",
    activo: true,
    notas: "",
    numero_seguro_social: "",
    sueldo_bruto: "",
    periodo_pago: "",
    fecha_baja: "",
    motivo_baja: "",
    beneficiario: "",
    premio_asistencia_semanal: "" as string | number | null,
  });

  const [crearUsuario, setCrearUsuario] = useState(false);
  const [showDarAcceso, setShowDarAcceso] = useState(false);
  const [accesoEmpleado, setAccesoEmpleado] = useState<Empleado | null>(null);
  const [usuarioFormData, setUsuarioFormData] = useState({
    password: "",
    role: "",
  });
  const [emailCheckStatus, setEmailCheckStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [emailCheckMessage, setEmailCheckMessage] = useState("");

  const [docFormData, setDocFormData] = useState<{
    tipo_documento: EmpleadoDocumento["tipo_documento"] | "";
    file: File | null;
  }>({
    tipo_documento: "",
    file: null,
  });

  const [pendingDocFormData, setPendingDocFormData] = useState({
    tipo_documento: "contrato_laboral" as EmpleadoDocumento["tipo_documento"],
    notas: "",
  });

  const [terminationFiles, setTerminationFiles] = useState<{
    carta: File | null;
    finiquito: File | null;
  }>({
    carta: null,
    finiquito: null,
  });

  const [licenseExpiryFormData, setLicenseExpiryFormData] = useState({
    fecha_vencimiento: "",
    es_permanente: false,
  });

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false);
  const [isEditLicenseExpiryOpen, setIsEditLicenseExpiryOpen] = useState(false);

  // Estado para el análisis de expediente completo
  const [isExpedienteDialogOpen, setIsExpedienteDialogOpen] = useState(false);
  const [expedientePdfBase64, setExpedientePdfBase64] = useState<string>("");
  const [expedienteFileName, setExpedienteFileName] = useState<string>("");

  useEffect(() => {
    loadEmpleados();
    loadUsuarios();
    loadNotificaciones();

    // Read tab from URL query params
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
      // Map tab param to filtroPuesto
      const tabMap: Record<string, any> = {
        "chofer": "chofer",
        "vendedor": "vendedor",
        "secretaria": "secretaria",
        "almacenista": "almacenista",
        "gerente_almacen": "gerente de almacén",
        "todos": "todos"
      };
      if (tabMap[tabParam]) {
        setFiltroPuesto(tabMap[tabParam]);
      }
    }
  }, [searchParams]);

  const loadEmpleados = async () => {
    try {
      const { data, error } = await supabase
        .from("empleados")
        .select("*")
        .order("nombre_completo");

      if (error) throw error;
      setEmpleados((data || []) as unknown as Empleado[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone")
        .order("full_name");

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadNotificaciones = async () => {
    try {
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("leida", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotificaciones(data || []);
    } catch (error: any) {
      console.error("Error loading notifications:", error);
    }
  };

  const handleCheckEmailAvailability = async () => {
    if (!formData.email) {
      toast({
        title: "Email requerido",
        description: "Por favor ingresa un email para verificar",
        variant: "destructive",
      });
      return;
    }

    setEmailCheckStatus("checking");
    setEmailCheckMessage("");

    try {
      const { data: existingUser, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("email", formData.email)
        .maybeSingle();

      if (error) {
        setEmailCheckStatus("idle");
        toast({
          title: "Error",
          description: "Error al verificar el email",
          variant: "destructive",
        });
        return;
      }

      if (existingUser) {
        setEmailCheckStatus("unavailable");
        setEmailCheckMessage(`Email ya registrado con "${existingUser.full_name}"`);
      } else {
        setEmailCheckStatus("available");
        setEmailCheckMessage("Email disponible");
      }
    } catch (error) {
      setEmailCheckStatus("idle");
      toast({
        title: "Error",
        description: "Error al verificar el email",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validación de campos obligatorios
      const faltantes: string[] = [];
      if (!formData.nombre?.trim()) faltantes.push("Nombre");
      if (!formData.primer_apellido?.trim()) faltantes.push("Primer Apellido");
      if (!formData.puesto) faltantes.push("Puesto");
      if (!formData.fecha_ingreso) faltantes.push("Fecha de Ingreso");
      if (!formData.fecha_nacimiento) faltantes.push("Fecha de Nacimiento");
      if (!formData.sueldo_bruto) faltantes.push("Sueldo Bruto");
      if (!formData.rfc?.trim()) faltantes.push("RFC");
      if (!formData.curp?.trim()) faltantes.push("CURP");
      if (!formData.email?.trim()) faltantes.push("Email");
      if (!formData.beneficiario?.trim()) faltantes.push("Beneficiario");
      if ((formData.puesto === "Chofer" || formData.puesto === "Ayudante de Chofer") && !formData.premio_asistencia_semanal) faltantes.push("Premio de Asistencia Semanal");
      if (faltantes.length > 0) {
        toast({ title: "Campos obligatorios faltantes", description: faltantes.join(", "), variant: "destructive" });
        return;
      }

      // Construir nombre_completo a partir de los campos separados
      const nombreCompleto = `${formData.nombre} ${formData.primer_apellido} ${formData.segundo_apellido}`.trim();
      
      // Validar si ya existe un empleado con el mismo nombre completo
      const { data: existingEmpleados, error: checkError } = await supabase
        .from("empleados")
        .select("id, nombre_completo")
        .ilike("nombre_completo", nombreCompleto);

      if (checkError) throw checkError;

      // Si existe y no es el mismo que estamos editando, mostrar error
      const duplicado = existingEmpleados?.find(
        emp => !editingEmpleado || emp.id !== editingEmpleado.id
      );

      if (duplicado) {
        toast({
          title: "Empleado duplicado",
          description: `Ya existe un empleado registrado con el nombre "${nombreCompleto}".`,
          variant: "destructive",
        });
        return;
      }

      const payload = {
        ...formData,
        nombre_completo: nombreCompleto,
        user_id: formData.user_id || null,
        sueldo_bruto: formData.sueldo_bruto ? parseFloat(formData.sueldo_bruto) : null,
        periodo_pago: formData.periodo_pago || null,
        fecha_baja: formData.fecha_baja || null,
        motivo_baja: formData.motivo_baja || null,
        numero_dependientes: formData.numero_dependientes ? parseInt(formData.numero_dependientes) : null,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        rfc: formData.rfc || null,
        curp: formData.curp || null,
        contacto_emergencia_nombre: formData.contacto_emergencia_nombre || null,
        contacto_emergencia_telefono: formData.contacto_emergencia_telefono || null,
        tipo_sangre: formData.tipo_sangre || null,
        estado_civil: formData.estado_civil || null,
        nivel_estudios: formData.nivel_estudios || null,
        cuenta_bancaria: formData.cuenta_bancaria || null,
        clabe_interbancaria: formData.clabe_interbancaria || null,
        beneficiario: formData.beneficiario || null,
        premio_asistencia_semanal: formData.premio_asistencia_semanal ? Number(formData.premio_asistencia_semanal) : null,
      };

      let empleadoId: string;

      if (editingEmpleado) {
        empleadoId = editingEmpleado.id;

        // Detect salary changes for history tracking
        const sueldoAnterior = editingEmpleado.sueldo_bruto;
        const sueldoNuevo = payload.sueldo_bruto ? Number(payload.sueldo_bruto) : null;
        const premioAnterior = editingEmpleado.premio_asistencia_semanal;
        const premioNuevo = payload.premio_asistencia_semanal ? Number(payload.premio_asistencia_semanal) : null;
        const sueldoCambio = sueldoAnterior !== sueldoNuevo;
        const premioCambio = premioAnterior !== premioNuevo;

        const { error } = await supabase
          .from("empleados")
          .update(payload)
          .eq("id", empleadoId);
        if (error) throw error;

        // Record salary change in history
        if (sueldoCambio || premioCambio) {
          const { data: { user } } = await supabase.auth.getUser();
          await (supabase.from("empleados_historial_sueldo" as any).insert({
            empleado_id: empleadoId,
            sueldo_anterior: sueldoAnterior,
            sueldo_nuevo: sueldoNuevo,
            premio_anterior: premioAnterior,
            premio_nuevo: premioNuevo,
            cambiado_por: user?.id || null,
          } as any) as any).then(({ error: hErr }: any) => {
            if (hErr) console.warn("Error guardando historial sueldo:", hErr.message);
          });
        }

        // Si el empleado tiene usuario asociado, actualizar el nombre en profiles
        if (formData.user_id) {
          const nombreCompleto = `${formData.nombre} ${formData.primer_apellido} ${formData.segundo_apellido}`.trim();
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ full_name: nombreCompleto })
            .eq("id", formData.user_id);

          if (profileError) {
            console.error("Error actualizando perfil:", profileError);
          }
        }

        // Subir archivos de terminación si están presentes
        if (!formData.activo && formData.motivo_baja) {
          if (formData.motivo_baja === "renuncia" && terminationFiles.carta) {
            await uploadTerminationDocument(empleadoId, "carta_renuncia", terminationFiles.carta);
          }
          if (formData.motivo_baja === "despido" && terminationFiles.carta) {
            await uploadTerminationDocument(empleadoId, "carta_despido", terminationFiles.carta);
          }
          if (terminationFiles.finiquito) {
            await uploadTerminationDocument(empleadoId, "comprobante_finiquito", terminationFiles.finiquito);
          }
        }

        toast({
          title: "Empleado actualizado",
          description: "El empleado se actualizó correctamente",
        });
      } else {
        const { data: newEmp, error } = await supabase.from("empleados").insert([payload]).select("id").single();
        if (error) throw error;

        toast({
          title: "Empleado creado",
          description: "Para dar acceso al sistema, usa el botón 'Dar acceso' en la tabla.",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadEmpleados();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uploadTerminationDocument = async (
    empleadoId: string,
    tipoDocumento: "carta_renuncia" | "carta_despido" | "comprobante_finiquito",
    file: File
  ) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${empleadoId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("empleados-documentos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("empleados_documentos").insert([
        {
          empleado_id: empleadoId,
          tipo_documento: tipoDocumento,
          nombre_archivo: file.name,
          ruta_storage: fileName,
        },
      ]);

      if (dbError) throw dbError;
    } catch (error: any) {
      console.error("Error uploading termination document:", error);
      toast({
        title: "Error al subir documento",
        description: `No se pudo subir ${file.name}`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (empleado: Empleado) => {
    setEditingEmpleado(empleado);

    // Load salary history
    (supabase
      .from("empleados_historial_sueldo" as any)
      .select("id, sueldo_anterior, sueldo_nuevo, premio_anterior, premio_nuevo, fecha_cambio")
      .eq("empleado_id", empleado.id)
      .order("fecha_cambio", { ascending: false })
      .limit(10) as any)
      .then(({ data }: any) => setHistorialSueldo(data || []));

    const premioDefault = empleado.puesto === "Ayudante de Chofer" ? 958 : empleado.puesto === "Chofer" ? 1262 : null;

    setFormData({
      nombre_completo: empleado.nombre_completo,
      nombre: empleado.nombre || "",
      primer_apellido: empleado.primer_apellido || "",
      segundo_apellido: empleado.segundo_apellido || "",
      rfc: empleado.rfc || "",
      curp: empleado.curp || "",
      fecha_nacimiento: empleado.fecha_nacimiento || "",
      contacto_emergencia_nombre: empleado.contacto_emergencia_nombre || "",
      contacto_emergencia_telefono: empleado.contacto_emergencia_telefono || "",
      tipo_sangre: empleado.tipo_sangre || "",
      estado_civil: empleado.estado_civil || "",
      numero_dependientes: empleado.numero_dependientes?.toString() || "",
      nivel_estudios: empleado.nivel_estudios || "",
      cuenta_bancaria: empleado.cuenta_bancaria || "",
      clabe_interbancaria: empleado.clabe_interbancaria || "",
      telefono: empleado.telefono || "",
      email: empleado.email || "",
      direccion: empleado.direccion || "",
      fecha_ingreso: empleado.fecha_ingreso,
      puesto: empleado.puesto,
      user_id: empleado.user_id || "",
      activo: empleado.activo,
      notas: empleado.notas || "",
      numero_seguro_social: empleado.numero_seguro_social || "",
      sueldo_bruto: empleado.sueldo_bruto ? empleado.sueldo_bruto.toString() : "",
      periodo_pago: empleado.periodo_pago || "",
      fecha_baja: empleado.fecha_baja || "",
      motivo_baja: empleado.motivo_baja || "",
      beneficiario: empleado.beneficiario || "",
      premio_asistencia_semanal: empleado.premio_asistencia_semanal || premioDefault,
    });
    setIsDialogOpen(true);
  };

  const handleGenerarContrato = async (empleado: Empleado) => {
    if (!empleado.rfc || !empleado.curp || !empleado.sueldo_bruto) {
      toast({ title: "Datos incompletos", description: "El empleado necesita RFC, CURP y sueldo para generar el contrato", variant: "destructive" });
      return;
    }
    try {
      const premioDefault = empleado.puesto === "Ayudante de Chofer" ? 958 : empleado.puesto === "Chofer" ? 1262 : null;
      const premio = empleado.premio_asistencia_semanal || premioDefault;
      const beneficiario = empleado.beneficiario || "Por designar";
      await generarContratoPDF({
        empleado: {
          nombre_completo: empleado.nombre_completo,
          rfc: empleado.rfc,
          curp: empleado.curp,
          puesto: empleado.puesto,
          sueldo_bruto: empleado.sueldo_bruto,
          premio_asistencia: premio,
          beneficiario,
          fecha_ingreso: empleado.fecha_ingreso,
          fecha_contrato: new Date().toISOString().split("T")[0],
          direccion: empleado.direccion || null,
        },
        empresa: {
          representante_legal: "JOSE ANTONIO GOMEZ ORTEGA",
          razon_social: "ABARROTES LA MANITA, S.A. DE C.V.",
          rfc: "AMA 700701GI8",
          domicilio: "MELCHOR OCAMPO 59, MAGDALENA MIXIHUCA, VENUSTIANO CARRANZA, 15850, CIUDAD DE MEXICO",
        },
      });
      toast({ title: "Contrato generado", description: `PDF descargado para ${empleado.nombre_completo}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleGenerarAviso = async (empleado: Empleado) => {
    try {
      await generarAvisoPrivacidadPDF({
        nombre_empleado: empleado.nombre_completo,
        fecha: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
      });
      toast({ title: "Aviso de privacidad generado", description: `PDF descargado` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleGenerarTodos = async (empleado: Empleado) => {
    await handleGenerarContrato(empleado);
    await handleGenerarAviso(empleado);
  };

  const handleQuitarAcceso = async (empleado: Empleado) => {
    if (!empleado.user_id) return;
    if (!confirm(`¿Quitar acceso al sistema a ${empleado.nombre_completo}? Ya no podrá iniciar sesión.`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: empleado.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.from("empleados").update({ user_id: null }).eq("id", empleado.id);
      toast({ title: "Acceso eliminado", description: `${empleado.nombre_completo} ya no puede iniciar sesión.` });
      loadEmpleados();
      loadUsuarios();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (empleado: Empleado) => {
    if (!confirm(`¿Estás seguro de eliminar a ${empleado.nombre_completo}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      // Si tiene acceso al sistema, eliminar usuario de auth
      if (empleado.user_id) {
        const { data, error: delErr } = await supabase.functions.invoke("delete-user", {
          body: { userId: empleado.user_id },
        });
        if (delErr) console.warn("Error eliminando usuario:", delErr.message);
        else if (data?.error) console.warn("Error eliminando usuario:", data.error);
      }

      // Si es Chofer, desasignar vehículo
      if (empleado.puesto === "Chofer") {
        await supabase
          .from("vehiculos")
          .update({ chofer_asignado_id: null })
          .eq("chofer_asignado_id", empleado.id);
      }

      // Eliminar documentos del empleado del storage
      if (documentos[empleado.id]?.length > 0) {
        const filePaths = documentos[empleado.id].map(
          (doc) => `${empleado.id}/${doc.ruta_storage}`
        );
        await supabase.storage.from("empleados-documentos").remove(filePaths);
      }

      // Eliminar registros de documentos de la base de datos
      await supabase
        .from("empleados_documentos")
        .delete()
        .eq("empleado_id", empleado.id);

      // Eliminar documentos pendientes
      await supabase
        .from("empleados_documentos_pendientes")
        .delete()
        .eq("empleado_id", empleado.id);

      // Finalmente eliminar el empleado
      const { error } = await supabase
        .from("empleados")
        .delete()
        .eq("id", empleado.id);

      if (error) throw error;

      toast({
        title: "Empleado eliminado",
        description: "El empleado y sus documentos se eliminaron correctamente",
      });

      loadEmpleados();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFormData.file || !selectedEmpleado || !docFormData.tipo_documento) return;

    setUploading(true);
    try {
      const fileExt = docFormData.file.name.split(".").pop();
      const fileName = `${selectedEmpleado}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("empleados-documentos")
        .upload(fileName, docFormData.file);

      if (uploadError) throw uploadError;

      const { data: insertData, error: dbError } = await supabase.from("empleados_documentos").insert([
        {
          empleado_id: selectedEmpleado,
          tipo_documento: docFormData.tipo_documento,
          nombre_archivo: docFormData.file.name,
          ruta_storage: fileName,
        },
      ]).select();

      if (dbError) throw dbError;

      // Si es licencia de conducir, llamar al edge function para extraer fecha
      if (docFormData.tipo_documento === "licencia_conducir" && insertData?.[0]) {
        toast({
          title: "Procesando licencia",
          description: "Extrayendo fecha de vencimiento automáticamente...",
        });

        const { data: aiData, error: aiError } = await supabase.functions.invoke(
          "extract-license-expiry",
          {
            body: {
              documentoId: insertData[0].id,
              filePath: fileName,
            },
          }
        );

        if (aiError) {
          console.error("Error extracting expiry date:", aiError);
          toast({
            title: "Advertencia",
            description: "No se pudo extraer automáticamente la fecha de vencimiento. Puedes agregarla manualmente después.",
            variant: "destructive",
          });
        } else if (aiData?.fecha_vencimiento) {
          toast({
            title: "Fecha extraída",
            description: `Fecha de vencimiento detectada: ${aiData.fecha_vencimiento}`,
          });
        } else {
          toast({
            title: "No se detectó fecha",
            description: "No se pudo detectar la fecha de vencimiento automáticamente.",
          });
        }
      }

      // Eliminar de pendientes si existe
      await supabase
        .from("empleados_documentos_pendientes")
        .delete()
        .eq("empleado_id", selectedEmpleado)
        .eq("tipo_documento", docFormData.tipo_documento);

      toast({
        title: "Documento subido",
        description: "El documento se subió correctamente",
      });

      setIsDocDialogOpen(false);
      setDocFormData({ tipo_documento: "", file: null });
      loadEmpleados();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (doc: EmpleadoDocumento) => {
    try {
      const { data, error } = await supabase.storage
        .from("empleados-documentos")
        .download(doc.ruta_storage);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nombre_archivo;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (doc: EmpleadoDocumento) => {
    if (!confirm("¿Estás seguro de eliminar este documento?")) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("empleados-documentos")
        .remove([doc.ruta_storage]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("empleados_documentos")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      toast({
        title: "Documento eliminado",
        description: "El documento se eliminó correctamente",
      });

      loadEmpleados();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddPendingDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpleado) return;

    try {
      const { error } = await supabase.from("empleados_documentos_pendientes").insert([
        {
          empleado_id: selectedEmpleado,
          tipo_documento: pendingDocFormData.tipo_documento,
          notas: pendingDocFormData.notas || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Documento marcado como pendiente",
        description: "Se agregó a la lista de documentos faltantes",
      });

      setIsPendingDialogOpen(false);
      setPendingDocFormData({ tipo_documento: "contrato_laboral", notas: "" });
      loadEmpleados();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePendingDocument = async (pendingDoc: EmpleadoDocumentoPendiente) => {
    if (!confirm("¿Eliminar de la lista de pendientes?")) return;

    try {
      const { error } = await supabase
        .from("empleados_documentos_pendientes")
        .delete()
        .eq("id", pendingDoc.id);

      if (error) throw error;

      toast({
        title: "Documento eliminado de pendientes",
        description: "Ya no aparecerá como faltante",
      });

      loadEmpleados();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Función helper para calcular documentos esperados según puesto
  const getDocumentosEsperados = (puesto: string): number => {
    // Documentos base para todos los puestos:
    // contrato_laboral, ine, carta_seguro_social, constancia_situacion_fiscal, 
    // acta_nacimiento, comprobante_domicilio, curp, rfc
    const documentosBase = 8;
    
    // Choferes y vendedores necesitan licencia_conducir adicional
    if (puesto.toLowerCase() === "chofer" || puesto.toLowerCase() === "vendedor") {
      return documentosBase + 1; // 9 documentos
    }
    
    return documentosBase; // 8 documentos
  };

  // Función helper para contar documentos subidos (excluyendo terminación y "otro")
  const getDocumentosSubidos = (empleadoId: string): number => {
    const docs = documentos[empleadoId] || [];
    // Excluir documentos de terminación y "otro" del conteo
    const docsActivos = docs.filter(doc => 
      doc.tipo_documento !== "carta_renuncia" && 
      doc.tipo_documento !== "carta_despido" && 
      doc.tipo_documento !== "comprobante_finiquito" &&
      doc.tipo_documento !== "otro"
    );
    return docsActivos.length;
  };

  // Función helper para contar campos de información personal completados
  const getInformacionCompleta = (empleado: Empleado): { completos: number; total: number } => {
    const camposRequeridos = [
      empleado.nombre,
      empleado.primer_apellido,
      empleado.rfc,
      empleado.curp,
      empleado.fecha_nacimiento,
      empleado.contacto_emergencia_nombre,
      empleado.contacto_emergencia_telefono,
      empleado.telefono,
      empleado.email,
    ];
    
    const camposCompletos = camposRequeridos.filter(campo => campo && campo.trim() !== "");
    return {
      completos: camposCompletos.length,
      total: 9
    };
  };

  const resetForm = () => {
    setFormData({
      nombre_completo: "",
      nombre: "",
      primer_apellido: "",
      segundo_apellido: "",
      rfc: "",
      curp: "",
      fecha_nacimiento: "",
      contacto_emergencia_nombre: "",
      contacto_emergencia_telefono: "",
      tipo_sangre: "",
      estado_civil: "",
      numero_dependientes: "",
      nivel_estudios: "",
      cuenta_bancaria: "",
      clabe_interbancaria: "",
      telefono: "",
      email: "",
      direccion: "",
      fecha_ingreso: new Date().toISOString().split("T")[0],
      puesto: "",
      user_id: "",
      activo: true,
      notas: "",
      numero_seguro_social: "",
      sueldo_bruto: "",
      periodo_pago: "",
      fecha_baja: "",
      motivo_baja: "",
      beneficiario: "",
      premio_asistencia_semanal: "",
    });
    setCrearUsuario(false);
    setUsuarioFormData({
      password: "",
      role: "",
    });
    setEmailCheckStatus("idle");
    setEmailCheckMessage("");
    setTerminationFiles({ carta: null, finiquito: null });
    setEditingEmpleado(null);
  };

  const handleTerminationFileChange = (
    type: "carta" | "finiquito",
    file: File | null
  ) => {
    setTerminationFiles({ ...terminationFiles, [type]: file });
  };

  const handleEditLicenseExpiry = (documento: EmpleadoDocumento) => {
    setEditingLicenseDoc(documento);
    
    // Si es permanente (2099-12-31), marcar el checkbox
    const esPermanente = documento.fecha_vencimiento === "2099-12-31";
    setLicenseExpiryFormData({
      fecha_vencimiento: esPermanente ? "" : (documento.fecha_vencimiento || ""),
      es_permanente: esPermanente,
    });
    setIsEditLicenseExpiryOpen(true);
  };

  const handleSaveLicenseExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingLicenseDoc) return;

    try {
      // Determinar la fecha final
      let fechaFinal: string | null = null;
      
      if (licenseExpiryFormData.es_permanente) {
        fechaFinal = "2099-12-31";
      } else if (licenseExpiryFormData.fecha_vencimiento) {
        fechaFinal = licenseExpiryFormData.fecha_vencimiento;
      }

      // Actualizar en la base de datos
      const { error } = await supabase
        .from("empleados_documentos")
        .update({ fecha_vencimiento: fechaFinal })
        .eq("id", editingLicenseDoc.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Fecha de vencimiento actualizada correctamente",
      });

      // Recargar documentos
      await loadEmpleados();
      setIsEditLicenseExpiryOpen(false);
      setEditingLicenseDoc(null);
      setLicenseExpiryFormData({ fecha_vencimiento: "", es_permanente: false });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredEmpleados = empleados.filter((emp) => {
    const matchesSearch =
      emp.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.puesto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActivo =
      filtroActivo === "todos" ||
      (filtroActivo === "activos" && emp.activo) ||
      (filtroActivo === "inactivos" && !emp.activo);

    const matchesPuesto = 
      filtroPuesto === "todos" ||
      emp.puesto.toLowerCase() === filtroPuesto;

    return matchesSearch && matchesActivo && matchesPuesto;
  });

  const getEmpleadosPorPuesto = (puesto: string) => {
    return empleados.filter(emp => emp.puesto.toLowerCase() === puesto.toLowerCase());
  };

  const getUsuarioNombre = (userId: string | null) => {
    if (!userId) return "-";
    const usuario = usuarios.find((u) => u.id === userId);
    return usuario ? usuario.full_name : "-";
  };

  // Filtrar usuarios que ya están asignados a empleados (excepto el actual si estamos editando)
  const usuariosDisponibles = usuarios.filter((usuario) => {
    const empleadoConUsuario = empleados.find((emp) => emp.user_id === usuario.id);
    
    // Si no hay empleado con este usuario, está disponible
    if (!empleadoConUsuario) return true;
    
    // Si estamos editando y es el usuario del empleado actual, también está disponible
    if (editingEmpleado && empleadoConUsuario.id === editingEmpleado.id) return true;
    
    // En cualquier otro caso, no está disponible
    return false;
  });

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount && amount !== 0) return "-";
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Periodo de prueba: 90 días desde fecha_ingreso
  const getPeriodoPrueba = (empleado: Empleado) => {
    if (!empleado.activo) return null;
    const [y, m, d] = empleado.fecha_ingreso.split("-").map(Number);
    const ingreso = new Date(y, m - 1, d);
    const vencimiento = new Date(ingreso);
    vencimiento.setDate(vencimiento.getDate() + 90);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    const fechaStr = `${vencimiento.getDate()}/${vencimiento.getMonth() + 1 < 10 ? "0" : ""}${vencimiento.getMonth() + 1}/${vencimiento.getFullYear()}`;
    if (diasRestantes <= 0) return { tipo: "indefinido" as const, fecha: fechaStr, dias: 0 };
    if (diasRestantes <= 7) return { tipo: "urgente" as const, fecha: fechaStr, dias: diasRestantes };
    return { tipo: "prueba" as const, fecha: fechaStr, dias: diasRestantes };
  };

  const getTipoDocumentoLabel = (tipo: EmpleadoDocumento["tipo_documento"]) => {
    const labels: Record<EmpleadoDocumento["tipo_documento"], string> = {
      contrato_laboral: "Contrato Laboral",
      ine: "INE",
      carta_seguro_social: "Carta Seguro Social",
      constancia_situacion_fiscal: "Constancia Situación Fiscal",
      acta_nacimiento: "Acta de Nacimiento",
      comprobante_domicilio: "Comprobante de Domicilio",
      curp: "CURP",
      rfc: "RFC",
      carta_renuncia: "Carta de Renuncia",
      carta_despido: "Carta de Despido",
      comprobante_finiquito: "Comprobante de Finiquito",
      licencia_conducir: "Licencia de Conducir",
      otro: "Otro",
    };
    return labels[tipo];
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Notificaciones se muestran solo en la campana del header */}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Empleados</h1>
            <p className="text-muted-foreground">
              Gestión completa de empleados con documentos
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo Empleado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEmpleado ? "Editar Empleado" : "Nuevo Empleado"}
                </DialogTitle>
                <DialogDescription>
                  Registra todos los datos del empleado y vincúlalo con un usuario del
                  sistema si tiene acceso
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    required
                    placeholder="Nombre(s)"
                    autoComplete="off"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primer_apellido">Primer Apellido *</Label>
                    <Input
                      id="primer_apellido"
                      value={formData.primer_apellido}
                      onChange={(e) =>
                        setFormData({ ...formData, primer_apellido: e.target.value })
                      }
                      required
                      placeholder="Primer apellido"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="segundo_apellido">Segundo Apellido</Label>
                    <Input
                      id="segundo_apellido"
                      value={formData.segundo_apellido}
                      onChange={(e) =>
                        setFormData({ ...formData, segundo_apellido: e.target.value })
                      }
                      placeholder="Segundo apellido (opcional)"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) =>
                        setFormData({ ...formData, telefono: e.target.value })
                      }
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          setEmailCheckStatus("idle");
                          setEmailCheckMessage("");
                        }}
                        className="flex-1"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCheckEmailAvailability}
                        disabled={!formData.email || emailCheckStatus === "checking"}
                      >
                        {emailCheckStatus === "checking" ? "Verificando..." : "Verificar"}
                      </Button>
                    </div>
                    {emailCheckStatus !== "idle" && (
                      <p className={`text-sm mt-1 ${
                        emailCheckStatus === "available" 
                          ? "text-green-600" 
                          : emailCheckStatus === "unavailable"
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}>
                        {emailCheckMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fecha_ingreso">Fecha de Ingreso *</Label>
                    <Input
                      id="fecha_ingreso"
                      type="date"
                      value={formData.fecha_ingreso}
                      onChange={(e) =>
                        setFormData({ ...formData, fecha_ingreso: e.target.value })
                      }
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="puesto">Puesto *</Label>
                    <Select
                      value={formData.puesto}
                      onValueChange={(value) => {
                        const periodoPago = (value === "Chofer" || value === "Ayudante de Chofer") ? "semanal" : "quincenal";
                        const premio = value === "Ayudante de Chofer" ? 958 : value === "Chofer" ? 1262 : null;
                        setFormData({ ...formData, puesto: value, periodo_pago: periodoPago, premio_asistencia_semanal: premio } as any);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar puesto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Secretaria">Secretaria</SelectItem>
                        <SelectItem value="Almacenista">Almacenista</SelectItem>
                        <SelectItem value="Gerente de Almacén">Gerente de Almacén</SelectItem>
                        <SelectItem value="Chofer">Chofer</SelectItem>
                        <SelectItem value="Ayudante de Chofer">Ayudante de Chofer</SelectItem>
                        <SelectItem value="Vendedor">Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Campos obligatorios visibles */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rfc">RFC *</Label>
                    <Input id="rfc" value={formData.rfc} onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })} placeholder="XXXX000000XXX" maxLength={13} autoComplete="off" />
                  </div>
                  <div>
                    <Label htmlFor="curp">CURP *</Label>
                    <Input id="curp" value={formData.curp} onChange={(e) => setFormData({ ...formData, curp: e.target.value.toUpperCase() })} placeholder="XXXX000000XXXXXXXX00" maxLength={18} autoComplete="off" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
                    <Input id="fecha_nacimiento" type="date" value={formData.fecha_nacimiento} onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })} autoComplete="off" />
                  </div>
                  <div>
                    <Label htmlFor="sueldo_bruto">Sueldo Bruto Mensual *</Label>
                    <Input id="sueldo_bruto" type="number" step="0.01" value={formData.sueldo_bruto} onChange={(e) => setFormData({ ...formData, sueldo_bruto: e.target.value } as any)} placeholder="$0.00" autoComplete="off" />
                  </div>
                </div>

                {/* Historial de sueldos — solo al editar */}
                {editingEmpleado && historialSueldo.length > 0 && (
                  <details className="border rounded-md p-2 bg-muted/30">
                    <summary className="text-xs font-medium cursor-pointer text-muted-foreground">
                      Historial de sueldos ({historialSueldo.length})
                    </summary>
                    <div className="mt-2 space-y-1">
                      {historialSueldo.map((h) => {
                        const fecha = new Date(h.fecha_cambio).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
                        return (
                          <div key={h.id} className="text-xs flex gap-2 items-center py-1 border-b last:border-0">
                            <span className="text-muted-foreground">{fecha}</span>
                            {h.sueldo_anterior !== h.sueldo_nuevo && (
                              <span>Sueldo: ${h.sueldo_anterior?.toLocaleString()} → <strong>${h.sueldo_nuevo?.toLocaleString()}</strong></span>
                            )}
                            {h.premio_anterior !== h.premio_nuevo && (
                              <span>Premio: ${h.premio_anterior?.toLocaleString() || "—"} → <strong>${h.premio_nuevo?.toLocaleString() || "—"}</strong></span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}

                <div>
                  <Label htmlFor="beneficiario">Beneficiario *</Label>
                  <Input id="beneficiario" value={formData.beneficiario || ""} onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })} placeholder="Nombre completo del beneficiario" autoComplete="off" />
                </div>

                {/* Premio de asistencia — solo chofer/ayudante */}
                {(formData.puesto === "Chofer" || formData.puesto === "Ayudante de Chofer") && (
                  <div>
                    <Label htmlFor="premio_asistencia_semanal">Premio de Asistencia Semanal *</Label>
                    <Input id="premio_asistencia_semanal" type="number" step="0.01"
                      value={formData.premio_asistencia_semanal || (formData.puesto === "Ayudante de Chofer" ? 958 : 1262)}
                      onChange={(e) => setFormData({ ...formData, premio_asistencia_semanal: parseFloat(e.target.value) || 0 })}
                      autoComplete="off" />
                    <p className="text-xs text-muted-foreground mt-1">Default: {formData.puesto === "Ayudante de Chofer" ? "$958" : "$1,262"} semanales</p>
                  </div>
                )}

                {/* Datos adicionales — colapsables (solo opcionales) */}
                <details className="border rounded-lg">
                  <summary className="px-4 py-2.5 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Datos adicionales (emergencia, bancarios, dirección...)
                  </summary>
                  <div className="px-4 pb-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contacto_emergencia_nombre">Contacto Emergencia</Label>
                        <Input id="contacto_emergencia_nombre" value={formData.contacto_emergencia_nombre} onChange={(e) => setFormData({ ...formData, contacto_emergencia_nombre: e.target.value })} placeholder="Nombre" autoComplete="off" />
                      </div>
                      <div>
                        <Label htmlFor="contacto_emergencia_telefono">Tel. Emergencia</Label>
                        <Input id="contacto_emergencia_telefono" value={formData.contacto_emergencia_telefono} onChange={(e) => setFormData({ ...formData, contacto_emergencia_telefono: e.target.value })} placeholder="10 dígitos" autoComplete="off" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="direccion">Dirección</Label>
                      <Input id="direccion" value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} placeholder="Calle, número, colonia..." autoComplete="off" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cuenta_bancaria">Cuenta Bancaria</Label>
                        <Input id="cuenta_bancaria" value={formData.cuenta_bancaria} onChange={(e) => setFormData({ ...formData, cuenta_bancaria: e.target.value })} autoComplete="off" />
                      </div>
                      <div>
                        <Label htmlFor="clabe_interbancaria">CLABE</Label>
                        <Input id="clabe_interbancaria" value={formData.clabe_interbancaria} onChange={(e) => setFormData({ ...formData, clabe_interbancaria: e.target.value })} maxLength={18} autoComplete="off" />
                      </div>
                    </div>
                  </div>
                </details>

                {/* Indicador de completitud de datos personales */}
                <div className="border-t pt-4">
                  {(() => {
                    const camposRequeridos = [
                      { valor: formData.nombre, label: "Nombre" },
                      { valor: formData.primer_apellido, label: "Primer Apellido" },
                      { valor: formData.rfc, label: "RFC" },
                      { valor: formData.curp, label: "CURP" },
                      { valor: formData.fecha_nacimiento, label: "Fecha de Nacimiento" },
                      { valor: formData.contacto_emergencia_nombre, label: "Contacto de Emergencia (Nombre)" },
                      { valor: formData.contacto_emergencia_telefono, label: "Contacto de Emergencia (Teléfono)" },
                      { valor: formData.telefono, label: "Teléfono" },
                      { valor: formData.email, label: "Email" },
                    ];
                    
                    const camposCompletos = camposRequeridos.filter(c => c.valor && c.valor.trim() !== "");
                    const camposFaltantes = camposRequeridos.filter(c => !c.valor || c.valor.trim() === "");
                    const todoCompleto = camposFaltantes.length === 0;

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Datos Personales</h4>
                          <Badge variant={todoCompleto ? "default" : "secondary"}>
                            {camposCompletos.length} de {camposRequeridos.length} campos completos
                          </Badge>
                        </div>
                        {!todoCompleto && (
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2">Campos faltantes:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {camposFaltantes.map((campo, idx) => (
                                <li key={idx}>• {campo.label}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <Label htmlFor="notas">Notas</Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) =>
                      setFormData({ ...formData, notas: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Información de Nómina</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="numero_seguro_social">Número de Seguro Social</Label>
                      <Input
                        id="numero_seguro_social"
                        value={formData.numero_seguro_social}
                        onChange={(e) =>
                          setFormData({ ...formData, numero_seguro_social: e.target.value })
                        }
                        placeholder="ej: 12345678901"
                        autoComplete="off"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="periodo_pago">Periodo de Pago</Label>
                        <Select
                          value={formData.periodo_pago || undefined}
                          onValueChange={(value) =>
                            setFormData({ ...formData, periodo_pago: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar periodo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="semanal">Semanal</SelectItem>
                            <SelectItem value="quincenal">Quincenal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) =>
                      setFormData({ ...formData, activo: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="activo">Empleado activo</Label>
                </div>

                {!formData.activo && editingEmpleado && (
                  <div className="border-t pt-4 bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-medium mb-3 text-destructive">
                      Información de Baja
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fecha_baja">Fecha de Baja</Label>
                          <Input
                            id="fecha_baja"
                            type="date"
                            value={formData.fecha_baja}
                            onChange={(e) =>
                              setFormData({ ...formData, fecha_baja: e.target.value })
                            }
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <Label htmlFor="motivo_baja">Motivo de Baja</Label>
                          <Select
                            value={formData.motivo_baja || undefined}
                            onValueChange={(value) =>
                              setFormData({ ...formData, motivo_baja: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar motivo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="renuncia">Renuncia</SelectItem>
                              <SelectItem value="despido">Despido</SelectItem>
                              <SelectItem value="abandono">Abandono (No regresó)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Documentos de terminación según el motivo */}
                      {formData.motivo_baja && (formData.motivo_baja === "renuncia" || formData.motivo_baja === "despido") && (
                        <div className="border-t pt-4 space-y-4">
                          <p className="text-sm font-medium">Documentos de terminación:</p>
                          
                          {/* Carta de Renuncia/Despido */}
                          <div className="space-y-2">
                            <Label htmlFor="carta_file">
                              {formData.motivo_baja === "renuncia" ? "Carta de Renuncia (PDF)" : "Carta de Despido (PDF)"}
                            </Label>
                            
                            {/* Mostrar documento existente si ya fue subido */}
                            {editingEmpleado && documentos[editingEmpleado.id] && (() => {
                              const tipoDoc = formData.motivo_baja === "renuncia" ? "carta_renuncia" : "carta_despido";
                              const docExistente = documentos[editingEmpleado.id].find(d => d.tipo_documento === tipoDoc);
                              
                              if (docExistente) {
                                return (
                                  <div className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <p className="text-sm font-medium">{docExistente.nombre_archivo}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Subido: {new Date(docExistente.created_at).toLocaleDateString('es-MX')}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadDocument(docExistente)}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Descargar
                                    </Button>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Input para subir nuevo documento */}
                            <Input
                              id="carta_file"
                              type="file"
                              accept=".pdf"
                              onChange={(e) =>
                                handleTerminationFileChange("carta", e.target.files?.[0] || null)
                              }
                            />
                            {terminationFiles.carta && (
                              <p className="text-xs text-muted-foreground">
                                Archivo seleccionado: {terminationFiles.carta.name}
                              </p>
                            )}
                          </div>
                          
                          {/* Comprobante de Finiquito */}
                          <div className="space-y-2">
                            <Label htmlFor="finiquito_file">Comprobante de Finiquito (PDF)</Label>
                            
                            {/* Mostrar documento existente si ya fue subido */}
                            {editingEmpleado && documentos[editingEmpleado.id] && (() => {
                              const docExistente = documentos[editingEmpleado.id].find(d => d.tipo_documento === "comprobante_finiquito");
                              
                              if (docExistente) {
                                return (
                                  <div className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <p className="text-sm font-medium">{docExistente.nombre_archivo}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Subido: {new Date(docExistente.created_at).toLocaleDateString('es-MX')}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadDocument(docExistente)}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Descargar
                                    </Button>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Input para subir nuevo documento */}
                            <Input
                              id="finiquito_file"
                              type="file"
                              accept=".pdf"
                              onChange={(e) =>
                                handleTerminationFileChange("finiquito", e.target.files?.[0] || null)
                              }
                            />
                            {terminationFiles.finiquito && (
                              <p className="text-xs text-muted-foreground">
                                Archivo seleccionado: {terminationFiles.finiquito.name}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {formData.motivo_baja === "abandono" && (
                        <div className="border-t pt-4">
                          <p className="text-sm text-muted-foreground">
                            Para abandono de trabajo, puedes subir una carta usando el tipo de documento "Otro" en la sección de documentos.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingEmpleado ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, puesto o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Tabs value={activeTab} className="space-y-4" onValueChange={(v) => {
            setActiveTab(v);
            setFiltroPuesto(v as any);
          }}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="todos">
                Todos ({empleados.length})
              </TabsTrigger>
              <TabsTrigger value="secretaria">
                Secretaria ({getEmpleadosPorPuesto('Secretaria').length})
              </TabsTrigger>
              <TabsTrigger value="vendedor">
                Vendedor ({getEmpleadosPorPuesto('Vendedor').length})
              </TabsTrigger>
              <TabsTrigger value="chofer">
                Chofer ({getEmpleadosPorPuesto('Chofer').length})
              </TabsTrigger>
              <TabsTrigger value="almacenista">
                Almacenista ({getEmpleadosPorPuesto('Almacenista').length})
              </TabsTrigger>
              <TabsTrigger value="gerente de almacén">
                Gte. Almacén ({getEmpleadosPorPuesto('Gerente de Almacén').length})
              </TabsTrigger>
              <TabsTrigger value="ayudante de chofer">
                Ayudantes ({getEmpleadosPorPuesto('Ayudante de Chofer').length})
              </TabsTrigger>
            </TabsList>

            {/* Tabs para Todos, Secretaria, Almacenista, Gerente de Almacén, Ayudante de Chofer (sin columna de licencia) */}
            {['todos', 'secretaria', 'almacenista', 'gerente de almacén', 'ayudante de chofer'].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                <div className="flex gap-2">
                  <Select value={filtroActivo} onValueChange={(value: any) => setFiltroActivo(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="activos">Activos</SelectItem>
                      <SelectItem value="inactivos">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Vista móvil con cards */}
                {isMobile ? (
                  <div className="space-y-3">
                    {filteredEmpleados.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No se encontraron empleados</p>
                    ) : (
                      filteredEmpleados.map((empleado) => (
                        <EmpleadoCardMobile
                          key={empleado.id}
                          empleado={empleado}
                          documentos={documentos[empleado.id] || []}
                          documentosPendientes={documentosPendientes[empleado.id] || []}
                          onEdit={handleEdit}
                          onViewDocs={(empId) => {
                            setSelectedEmpleado(empId);
                            setIsDocDialogOpen(true);
                          }}
                          onAnalyzeExpediente={(emp) => {
                            // El análisis de expediente se accede desde el dialog de documentos
                            setSelectedEmpleado(emp.id);
                            setIsDocDialogOpen(true);
                          }}
                        />
                      ))
                    )}
                  </div>
                ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        {tab === 'todos' && <TableHead>Puesto</TableHead>}
                        <TableHead>Contacto</TableHead>
                        <TableHead>Fecha Ingreso</TableHead>
                        <TableHead>Usuario Sistema</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmpleados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={tab === 'todos' ? 9 : 8} className="text-center text-muted-foreground">
                            No se encontraron empleados
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmpleados.map((empleado) => (
                          <TableRow key={empleado.id}>
                            <TableCell className="font-medium">
                              {empleado.nombre_completo}
                            </TableCell>
                            {tab === 'todos' && <TableCell><Badge variant="outline">{empleado.puesto}</Badge></TableCell>}
                            <TableCell>
                              <div className="text-sm">
                                {empleado.telefono && <div>{empleado.telefono}</div>}
                                {empleado.email && (
                                  <div className="text-muted-foreground">{empleado.email}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {empleado.fecha_ingreso.split("-").reverse().join("/")}
                            </TableCell>
                            <TableCell>
                              {empleado.user_id ? (
                                <div className="flex flex-col items-start gap-1">
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">Con acceso</Badge>
                                  {isAdmin && (
                                    <button
                                      className="text-xs text-destructive hover:underline cursor-pointer"
                                      onClick={(e) => { e.stopPropagation(); handleQuitarAcceso(empleado); }}
                                    >
                                      Quitar acceso
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setAccesoEmpleado(empleado); setShowDarAcceso(true); }}>
                                  <UserPlus className="h-3 w-3 mr-1" />Dar acceso
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {(() => {
                                  if (!empleado.activo) {
                                    return (
                                      <>
                                        <Badge variant="secondary">Inactivo</Badge>
                                        {empleado.motivo_baja && (
                                          <div className="text-xs text-muted-foreground">
                                            {empleado.motivo_baja === "renuncia" && "Renuncia"}
                                            {empleado.motivo_baja === "despido" && "Despido"}
                                            {empleado.motivo_baja === "abandono" && "Abandono"}
                                          </div>
                                        )}
                                      </>
                                    );
                                  }
                                  const pp = getPeriodoPrueba(empleado);
                                  if (!pp || pp.tipo === "indefinido") {
                                    return <Badge variant="default">Activo</Badge>;
                                  }
                                  if (pp.tipo === "urgente") {
                                    return (
                                      <Badge variant="destructive" className="animate-pulse">
                                        Vence pronto {pp.fecha}
                                      </Badge>
                                    );
                                  }
                                  return (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                      En prueba — {pp.fecha}
                                    </Badge>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(empleado)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" title="Documentos">
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem disabled={!empleado.rfc || !empleado.curp || !empleado.sueldo_bruto} onClick={() => setFirmaFlowEmpleado(empleado)}>
                                      Firmar Contrato
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={!empleado.rfc || !empleado.curp || !empleado.sueldo_bruto} onClick={() => handleGenerarContrato(empleado)}>
                                      Contrato (vista previa)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleGenerarAviso(empleado)}>
                                      Aviso de Privacidad (vista previa)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={!empleado.rfc || !empleado.curp || !empleado.sueldo_bruto} onClick={() => handleGenerarTodos(empleado)}>
                                      Todos sin firma
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(empleado)}
                                    className="text-destructive hover:text-destructive"
                                    title="Eliminar empleado"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                )}
              </TabsContent>
            ))}

            {/* Tab especial para Vendedor con columna de vencimiento de licencia */}
            <TabsContent value="vendedor" className="space-y-4">
              <div className="flex gap-2">
                <Select value={filtroActivo} onValueChange={(value: any) => setFiltroActivo(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activos">Activos</SelectItem>
                    <SelectItem value="inactivos">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Vencimiento Licencia</TableHead>
                      <TableHead>Fecha Ingreso</TableHead>
                      <TableHead>Usuario Sistema</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmpleados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          No se encontraron vendedores
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmpleados.map((empleado) => {
                        const licenciaDoc = documentos[empleado.id]?.find(
                          doc => doc.tipo_documento === 'licencia_conducir'
                        );
                        const diasRestantes = licenciaDoc?.fecha_vencimiento 
                          ? Math.ceil((new Date(licenciaDoc.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                          : null;

                        return (
                          <TableRow key={empleado.id}>
                            <TableCell className="font-medium">
                              {empleado.nombre_completo}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {empleado.telefono && <div>{empleado.telefono}</div>}
                                {empleado.email && (
                                  <div className="text-muted-foreground">{empleado.email}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {licenciaDoc?.fecha_vencimiento ? (
                                  (() => {
                                    const esPermanente = licenciaDoc.fecha_vencimiento === "2099-12-31";
                                    if (esPermanente) {
                                      return (
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
                                          PERMANENTE
                                        </Badge>
                                      );
                                    }
                                    
                                    // Determinar color según estado
                                    let badgeClass = "";
                                    if (diasRestantes !== null && diasRestantes < 0) {
                                      // Vencida - Rojo
                                      badgeClass = "bg-red-500/10 text-red-700 border-red-500/20";
                                    } else if (diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30) {
                                      // Próxima a vencer - Amarillo
                                      badgeClass = "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
                                    } else {
                                      // Vigente - Verde
                                      badgeClass = "bg-green-500/10 text-green-700 border-green-500/20";
                                    }
                                    
                                    return (
                                      <Badge variant="secondary" className={badgeClass}>
                                        {new Date(licenciaDoc.fecha_vencimiento).toLocaleDateString('es-MX')}
                                        {diasRestantes !== null && diasRestantes < 0 && " (Vencida)"}
                                        {diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30 && ` (${diasRestantes}d)`}
                                      </Badge>
                                    );
                                  })()
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Sin licencia
                                  </Badge>
                                )}
                                {licenciaDoc && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditLicenseExpiry(licenciaDoc)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {empleado.fecha_ingreso.split("-").reverse().join("/")}
                            </TableCell>
                            <TableCell>
                              {empleado.user_id ? (
                                <div className="flex flex-col items-start gap-1">
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">Con acceso</Badge>
                                  {isAdmin && (
                                    <button
                                      className="text-xs text-destructive hover:underline cursor-pointer"
                                      onClick={(e) => { e.stopPropagation(); handleQuitarAcceso(empleado); }}
                                    >
                                      Quitar acceso
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setAccesoEmpleado(empleado); setShowDarAcceso(true); }}>
                                  <UserPlus className="h-3 w-3 mr-1" />Dar acceso
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {(() => {
                                  if (!empleado.activo) {
                                    return (
                                      <>
                                        <Badge variant="secondary">Inactivo</Badge>
                                        {empleado.motivo_baja && (
                                          <div className="text-xs text-muted-foreground">
                                            {empleado.motivo_baja === "renuncia" && "Renuncia"}
                                            {empleado.motivo_baja === "despido" && "Despido"}
                                            {empleado.motivo_baja === "abandono" && "Abandono"}
                                          </div>
                                        )}
                                      </>
                                    );
                                  }
                                  const pp = getPeriodoPrueba(empleado);
                                  if (!pp || pp.tipo === "indefinido") {
                                    return <Badge variant="default">Activo</Badge>;
                                  }
                                  if (pp.tipo === "urgente") {
                                    return (
                                      <Badge variant="destructive" className="animate-pulse">
                                        Vence pronto {pp.fecha}
                                      </Badge>
                                    );
                                  }
                                  return (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                      En prueba — {pp.fecha}
                                    </Badge>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(empleado)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" title="Documentos">
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem disabled={!empleado.rfc || !empleado.curp || !empleado.sueldo_bruto} onClick={() => setFirmaFlowEmpleado(empleado)}>
                                      Firmar Contrato
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={!empleado.rfc || !empleado.curp || !empleado.sueldo_bruto} onClick={() => handleGenerarContrato(empleado)}>
                                      Contrato (vista previa)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleGenerarAviso(empleado)}>
                                      Aviso de Privacidad (vista previa)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={!empleado.rfc || !empleado.curp || !empleado.sueldo_bruto} onClick={() => handleGenerarTodos(empleado)}>
                                      Todos sin firma
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(empleado)}
                                    className="text-destructive hover:text-destructive"
                                    title="Eliminar empleado"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab especial para Chofer con columna de vencimiento de licencia */}
            <TabsContent value="chofer" className="space-y-4">
              <div className="flex gap-2">
                <Select value={filtroActivo} onValueChange={(value: any) => setFiltroActivo(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activos">Activos</SelectItem>
                    <SelectItem value="inactivos">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Vencimiento Licencia</TableHead>
                      <TableHead>Fecha Ingreso</TableHead>
                      <TableHead>Usuario Sistema</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmpleados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          No se encontraron choferes
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmpleados.map((empleado) => {
                        const licenciaDoc = documentos[empleado.id]?.find(
                          doc => doc.tipo_documento === 'licencia_conducir'
                        );
                        const diasRestantes = licenciaDoc?.fecha_vencimiento 
                          ? Math.ceil((new Date(licenciaDoc.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                          : null;

                        return (
                          <TableRow key={empleado.id}>
                            <TableCell className="font-medium">
                              {empleado.nombre_completo}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {empleado.telefono && <div>{empleado.telefono}</div>}
                                {empleado.email && (
                                  <div className="text-muted-foreground">{empleado.email}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {licenciaDoc?.fecha_vencimiento ? (
                                  (() => {
                                    const esPermanente = licenciaDoc.fecha_vencimiento === "2099-12-31";
                                    if (esPermanente) {
                                      return (
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
                                          PERMANENTE
                                        </Badge>
                                      );
                                    }
                                    
                                    // Determinar color según estado
                                    let badgeClass = "";
                                    if (diasRestantes !== null && diasRestantes < 0) {
                                      // Vencida - Rojo
                                      badgeClass = "bg-red-500/10 text-red-700 border-red-500/20";
                                    } else if (diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30) {
                                      // Próxima a vencer - Amarillo
                                      badgeClass = "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
                                    } else {
                                      // Vigente - Verde
                                      badgeClass = "bg-green-500/10 text-green-700 border-green-500/20";
                                    }
                                    
                                    return (
                                      <Badge variant="secondary" className={badgeClass}>
                                        {new Date(licenciaDoc.fecha_vencimiento).toLocaleDateString('es-MX')}
                                        {diasRestantes !== null && diasRestantes < 0 && " (Vencida)"}
                                        {diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30 && ` (${diasRestantes}d)`}
                                      </Badge>
                                    );
                                  })()
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Sin licencia
                                  </Badge>
                                )}
                                {licenciaDoc && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditLicenseExpiry(licenciaDoc)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {empleado.fecha_ingreso.split("-").reverse().join("/")}
                            </TableCell>
                            <TableCell>
                              {empleado.user_id ? (
                                <div className="flex flex-col items-start gap-1">
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">Con acceso</Badge>
                                  {isAdmin && (
                                    <button
                                      className="text-xs text-destructive hover:underline cursor-pointer"
                                      onClick={(e) => { e.stopPropagation(); handleQuitarAcceso(empleado); }}
                                    >
                                      Quitar acceso
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setAccesoEmpleado(empleado); setShowDarAcceso(true); }}>
                                  <UserPlus className="h-3 w-3 mr-1" />Dar acceso
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {(() => {
                                  if (!empleado.activo) {
                                    return (
                                      <>
                                        <Badge variant="secondary">Inactivo</Badge>
                                        {empleado.motivo_baja && (
                                          <div className="text-xs text-muted-foreground">
                                            {empleado.motivo_baja === "renuncia" && "Renuncia"}
                                            {empleado.motivo_baja === "despido" && "Despido"}
                                            {empleado.motivo_baja === "abandono" && "Abandono"}
                                          </div>
                                        )}
                                      </>
                                    );
                                  }
                                  const pp = getPeriodoPrueba(empleado);
                                  if (!pp || pp.tipo === "indefinido") {
                                    return <Badge variant="default">Activo</Badge>;
                                  }
                                  if (pp.tipo === "urgente") {
                                    return (
                                      <Badge variant="destructive" className="animate-pulse">
                                        Vence pronto {pp.fecha}
                                      </Badge>
                                    );
                                  }
                                  return (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                      En prueba — {pp.fecha}
                                    </Badge>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(empleado)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" title="Documentos">
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem disabled={!empleado.rfc || !empleado.curp || !empleado.sueldo_bruto} onClick={() => setFirmaFlowEmpleado(empleado)}>
                                      Firmar Contrato
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={!empleado.rfc || !empleado.curp || !empleado.sueldo_bruto} onClick={() => handleGenerarContrato(empleado)}>
                                      Contrato (vista previa)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleGenerarAviso(empleado)}>
                                      Aviso de Privacidad (vista previa)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={!empleado.rfc || !empleado.curp || !empleado.sueldo_bruto} onClick={() => handleGenerarTodos(empleado)}>
                                      Todos sin firma
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(empleado)}
                                    className="text-destructive hover:text-destructive"
                                    title="Eliminar empleado"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </Card>


        {/* Dialog para análisis de expediente completo con IA */}
        {selectedEmpleado && (
          <ExpedienteAnalysisDialog
            open={isExpedienteDialogOpen}
            onOpenChange={(open) => {
              setIsExpedienteDialogOpen(open);
              if (!open) {
                setExpedientePdfBase64("");
                setExpedienteFileName("");
              }
            }}
            empleadoId={selectedEmpleado}
            empleadoNombre={empleados.find(e => e.id === selectedEmpleado)?.nombre_completo || ""}
            pdfBase64={expedientePdfBase64}
            fileName={expedienteFileName}
            onSuccess={() => {
              loadEmpleados();
            }}
          />
        )}
      </div>
      {accesoEmpleado && (
        <DarAccesoSistemaDialog
          open={showDarAcceso}
          onOpenChange={setShowDarAcceso}
          empleadoId={accesoEmpleado.id}
          empleadoNombre={accesoEmpleado.nombre_completo}
          empleadoEmail={accesoEmpleado.email}
          onCreated={() => { loadEmpleados(); loadUsuarios(); }}
        />
      )}

      {firmaFlowEmpleado && (
        <FirmaContratoFlow
          open={!!firmaFlowEmpleado}
          onClose={() => setFirmaFlowEmpleado(null)}
          onSigned={() => loadEmpleados()}
          empleado={{
            id: firmaFlowEmpleado.id,
            nombre_completo: firmaFlowEmpleado.nombre_completo,
            rfc: firmaFlowEmpleado.rfc || "",
            curp: firmaFlowEmpleado.curp || "",
            puesto: firmaFlowEmpleado.puesto,
            sueldo_bruto: firmaFlowEmpleado.sueldo_bruto || 0,
            fecha_ingreso: firmaFlowEmpleado.fecha_ingreso,
            email: firmaFlowEmpleado.email,
            direccion: (firmaFlowEmpleado as any).direccion || null,
            beneficiario: (firmaFlowEmpleado as any).beneficiario,
            premio_asistencia_semanal: (firmaFlowEmpleado as any).premio_asistencia_semanal,
          }}
          empresa={{
            representante_legal: "JOSE ANTONIO GOMEZ ORTEGA",
            razon_social: "ABARROTES LA MANITA, S.A. DE C.V.",
            rfc: "AMA 700701GI8",
            domicilio: "MELCHOR OCAMPO 59, MAGDALENA MIXIHUCA, VENUSTIANO CARRANZA, 15850, CIUDAD DE MEXICO",
          }}
        />
      )}
    </Layout>
  );
};

export default Empleados;
