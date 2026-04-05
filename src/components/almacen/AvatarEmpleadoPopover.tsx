import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CreditCard, Loader2, User, Phone, Mail, Calendar, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { compressImageForUpload } from "@/lib/imageUtils";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays, differenceInYears, differenceInMonths } from "date-fns";
import { es } from "date-fns/locale";

interface AvatarEmpleadoPopoverProps {
  empleadoId: string | null;
  empleadoNombre: string;
  empleadoPuesto: string;
  empleadoEmail?: string;
  fotoUrl: string | null;
  onFotoUpdated: (newUrl: string) => void;
}

const getInitials = (name: string): string => {
  if (!name) return "??";
  return name.split(' ').filter(w => w.length > 0).map(w => w[0]).slice(0, 2).join('').toUpperCase();
};

const getAvatarColor = (name: string): string => {
  const colors = ["bg-red-600", "bg-blue-600", "bg-green-600", "bg-purple-600", "bg-orange-600", "bg-teal-600", "bg-pink-600", "bg-indigo-600"];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const fmt$ = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

interface EmpleadoDetalle {
  id: string;
  nombre_completo: string;
  puesto: string;
  activo: boolean;
  fecha_ingreso: string | null;
  sueldo_bruto: number | null;
  premio_asistencia_semanal: number | null;
  telefono: string | null;
  email: string | null;
  curp: string | null;
  rfc: string | null;
  numero_seguro_social: string | null;
  beneficiario: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  
  licencia_numero: string | null;
  licencia_tipo: string | null;
  licencia_vencimiento: string | null;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-muted/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right break-all min-w-0">{value}</span>
    </div>
  );
}

export const AvatarEmpleadoPopover = ({
  empleadoId,
  empleadoNombre,
  empleadoPuesto,
  empleadoEmail,
  fotoUrl,
  onFotoUpdated
}: AvatarEmpleadoPopoverProps) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showTarjeta, setShowTarjeta] = useState(false);
  const [empleadoDetalle, setEmpleadoDetalle] = useState<EmpleadoDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const initials = getInitials(empleadoNombre);
  const avatarColor = getAvatarColor(empleadoNombre);

  // Load employee details when tarjeta opens
  useEffect(() => {
    if (!showTarjeta || !empleadoId) return;
    const load = async () => {
      setLoadingDetalle(true);
      const { data } = await supabase
        .from("empleados")
        .select("id, nombre_completo, puesto, activo, fecha_ingreso, sueldo_bruto, premio_asistencia_semanal, telefono, email, curp, rfc, numero_seguro_social, beneficiario, contacto_emergencia_nombre, contacto_emergencia_telefono, licencia_numero, licencia_tipo, licencia_vencimiento")
        .eq("id", empleadoId)
        .single();
      setEmpleadoDetalle(data as EmpleadoDetalle | null);
      setLoadingDetalle(false);
    };
    load();
  }, [showTarjeta, empleadoId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !empleadoId) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Archivo inválido", description: "Selecciona una imagen (JPG, PNG, WEBP)" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
    setIsUploading(true);
    try {
      const compressedFile = await compressImageForUpload(file, 'thumbnail');
      const fileName = `${empleadoId}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('empleados-fotos').upload(fileName, compressedFile, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('empleados-fotos').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('empleados').update({ foto_url: publicUrl }).eq('id', empleadoId);
      if (updateError) throw updateError;
      onFotoUpdated(publicUrl);
      setPreviewUrl(null);
      toast({ title: "Foto actualizada" });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo subir la foto." });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl || fotoUrl;

  // Compute antigüedad
  const getAntiguedad = (fecha: string | null) => {
    if (!fecha) return null;
    const ingreso = new Date(fecha);
    const hoy = new Date();
    const years = differenceInYears(hoy, ingreso);
    const months = differenceInMonths(hoy, ingreso) % 12;
    if (years > 0) return `${years} año${years > 1 ? 's' : ''}${months > 0 ? `, ${months} mes${months > 1 ? 'es' : ''}` : ''}`;
    return `${months} mes${months > 1 ? 'es' : ''}`;
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full transition-transform hover:scale-105 cursor-pointer">
            <Avatar className="h-12 w-12 border-2 border-white/20">
              {displayUrl ? <AvatarImage src={displayUrl} alt={empleadoNombre} /> : null}
              <AvatarFallback className={cn("text-white font-semibold text-base", avatarColor)}>{initials}</AvatarFallback>
            </Avatar>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-4" side="right" align="start" sideOffset={12}>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-slate-200">
                {displayUrl ? <AvatarImage src={displayUrl} alt={empleadoNombre} /> : null}
                <AvatarFallback className={cn("text-white font-bold text-2xl", avatarColor)}>{initials}</AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">{empleadoNombre}</h3>
              <p className="text-sm text-muted-foreground">{empleadoPuesto}</p>
              {empleadoEmail && <p className="text-xs text-muted-foreground">{empleadoEmail}</p>}
            </div>

            <div className="w-full border-t border-border" />

            <div className="w-full space-y-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <Button variant="outline" className="w-full justify-start gap-2 cursor-pointer" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !empleadoId}>
                <Camera className="h-4 w-4" /> {fotoUrl ? "Cambiar foto" : "Agregar foto"}
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 cursor-pointer" onClick={() => { setOpen(false); setShowTarjeta(true); }}>
                <User className="h-4 w-4" /> Ver mi tarjeta de trabajador
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 cursor-pointer" onClick={() => { setOpen(false); navigate('/tarjeta'); }}>
                <CreditCard className="h-4 w-4" /> Tarjeta digital
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Tarjeta de trabajador — Dialog */}
      <Dialog open={showTarjeta} onOpenChange={setShowTarjeta}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {loadingDetalle ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : empleadoDetalle ? (
            <div className="space-y-4">
              {/* Header con foto */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-slate-200">
                  {displayUrl ? <AvatarImage src={displayUrl} alt={empleadoDetalle.nombre_completo} /> : null}
                  <AvatarFallback className={cn("text-white font-bold text-2xl", avatarColor)}>
                    {getInitials(empleadoDetalle.nombre_completo)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-bold text-lg leading-tight">{empleadoDetalle.nombre_completo}</h2>
                  <p className="text-sm text-muted-foreground">{empleadoDetalle.puesto}</p>
                  <Badge variant={empleadoDetalle.activo ? "default" : "destructive"} className="mt-1 text-xs">
                    {empleadoDetalle.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>

              {/* Info básica */}
              <div className="space-y-0">
                <InfoRow label="Fecha ingreso" value={empleadoDetalle.fecha_ingreso ? format(new Date(empleadoDetalle.fecha_ingreso), "dd/MM/yyyy") : null} />
                <InfoRow label="Antigüedad" value={getAntiguedad(empleadoDetalle.fecha_ingreso)} />
                {empleadoDetalle.sueldo_bruto && <InfoRow label="Sueldo bruto" value={fmt$(empleadoDetalle.sueldo_bruto)} />}
                {empleadoDetalle.premio_asistencia_semanal && <InfoRow label="Premio semanal" value={fmt$(empleadoDetalle.premio_asistencia_semanal)} />}
                <InfoRow label="Teléfono" value={empleadoDetalle.telefono} />
                <InfoRow label="Email" value={empleadoDetalle.email} />
                <InfoRow label="Beneficiario" value={empleadoDetalle.beneficiario} />
                <InfoRow label="CURP" value={empleadoDetalle.curp} />
                <InfoRow label="RFC" value={empleadoDetalle.rfc} />
                <InfoRow label="NSS" value={empleadoDetalle.numero_seguro_social} />
              </div>

              {/* Emergencia */}
              {empleadoDetalle.contacto_emergencia_nombre && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Contacto de emergencia</p>
                  <InfoRow label="Nombre" value={empleadoDetalle.contacto_emergencia_nombre} />
                  <InfoRow label="Teléfono" value={empleadoDetalle.contacto_emergencia_telefono} />
                  <InfoRow label="Parentesco" value={empleadoDetalle.emergencia_parentesco} />
                </div>
              )}

              {/* Licencia */}
              {empleadoDetalle.licencia_numero && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Licencia de conducir</p>
                  <InfoRow label="Número" value={empleadoDetalle.licencia_numero} />
                  <InfoRow label="Tipo" value={empleadoDetalle.licencia_tipo} />
                  {empleadoDetalle.licencia_vencimiento && (
                    <div className="flex justify-between gap-3 py-1.5">
                      <span className="text-xs text-muted-foreground">Vencimiento</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{format(new Date(empleadoDetalle.licencia_vencimiento), "dd/MM/yyyy")}</span>
                        {(() => {
                          const dias = differenceInDays(new Date(empleadoDetalle.licencia_vencimiento), new Date());
                          if (dias < 0) return <Badge variant="destructive" className="text-[10px]">VENCIDA</Badge>;
                          if (dias < 30) return <Badge className="text-[10px] bg-amber-500">Vence en {dias}d</Badge>;
                          return null;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No se encontró información</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
