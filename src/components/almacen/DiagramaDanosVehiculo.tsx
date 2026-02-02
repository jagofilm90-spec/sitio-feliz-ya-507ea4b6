import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Trash2, MapPin, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { compressImageForUpload } from "@/lib/imageUtils";
import { toast } from "sonner";

export type TipoDano = "golpe" | "raspadura" | "grieta";
export type VistaCamion = "superior" | "lateral_izq" | "lateral_der" | "frontal" | "trasera";

export interface DanoMarcado {
  id: string;
  tipo: TipoDano;
  vista: VistaCamion;
  posicionX: number; // 0-100%
  posicionY: number; // 0-100%
  descripcion?: string;
  fotos?: string[]; // Storage paths for damage photos
}

interface DiagramaDanosVehiculoProps {
  danos: DanoMarcado[];
  onDanosChange: (danos: DanoMarcado[]) => void;
  disabled?: boolean;
  checkupId?: string; // For organizing photos in storage
}

const TIPO_CONFIG: Record<TipoDano, { label: string; color: string; bgColor: string; icon: string }> = {
  golpe: { label: "Golpe", color: "text-red-600", bgColor: "bg-red-500", icon: "🔴" },
  raspadura: { label: "Raspadura", color: "text-amber-600", bgColor: "bg-amber-500", icon: "🟡" },
  grieta: { label: "Grieta", color: "text-blue-600", bgColor: "bg-blue-500", icon: "🔵" },
};

const VISTA_CONFIG: Record<VistaCamion, { label: string; icon: string }> = {
  superior: { label: "Superior", icon: "⬆️" },
  lateral_izq: { label: "Lateral Izq", icon: "◀️" },
  lateral_der: { label: "Lateral Der", icon: "▶️" },
  frontal: { label: "Frontal", icon: "🔲" },
  trasera: { label: "Trasera", icon: "🔳" },
};

const MAX_PHOTOS_PER_DAMAGE = 3;

// Sub-component for loading photos with signed URLs
const DanoFotoThumbnail = ({ 
  path, 
  onRemove, 
  onPreview,
  disabled 
}: { 
  path: string; 
  onRemove: () => void; 
  onPreview: (url: string) => void;
  disabled?: boolean;
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUrl = async () => {
      try {
        const { data } = await supabase.storage
          .from("checkups-danos-fotos")
          .createSignedUrl(path, 3600); // 1 hour
        if (data?.signedUrl) setSignedUrl(data.signedUrl);
      } catch (error) {
        console.error("Error loading photo URL:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUrl();
  }, [path]);

  if (loading) {
    return <Skeleton className="w-12 h-12 rounded" />;
  }

  if (!signedUrl) {
    return <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">Error</div>;
  }

  return (
    <div className="relative group">
      <img
        src={signedUrl}
        alt="Evidencia de daño"
        className="w-12 h-12 object-cover rounded cursor-pointer border border-border hover:border-primary transition-colors"
        onClick={() => onPreview(signedUrl)}
      />
      {!disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
};

export const DiagramaDanosVehiculo = ({
  danos,
  onDanosChange,
  disabled = false,
  checkupId,
}: DiagramaDanosVehiculoProps) => {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoDano>("golpe");
  const [vistaActual, setVistaActual] = useState<VistaCamion>("lateral_izq");
  const [uploadingDanoId, setUploadingDanoId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedDanoIdRef = useRef<string | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (x < 0 || x > 100 || y < 0 || y > 100) return;

      const nuevoDano: DanoMarcado = {
        id: crypto.randomUUID(),
        tipo: tipoSeleccionado,
        vista: vistaActual,
        posicionX: Math.round(x * 10) / 10,
        posicionY: Math.round(y * 10) / 10,
      };

      onDanosChange([...danos, nuevoDano]);
    },
    [disabled, danos, onDanosChange, tipoSeleccionado, vistaActual]
  );

  const eliminarDano = async (id: string) => {
    const dano = danos.find(d => d.id === id);
    // Remove photos from storage if they exist
    if (dano?.fotos && dano.fotos.length > 0) {
      await supabase.storage.from("checkups-danos-fotos").remove(dano.fotos);
    }
    onDanosChange(danos.filter((d) => d.id !== id));
  };

  const limpiarTodos = async () => {
    // Remove all photos from storage
    const allPhotos = danos.flatMap(d => d.fotos || []);
    if (allPhotos.length > 0) {
      await supabase.storage.from("checkups-danos-fotos").remove(allPhotos);
    }
    onDanosChange([]);
  };

  // Photo capture handlers
  const handleAddPhoto = (danoId: string) => {
    selectedDanoIdRef.current = danoId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const danoId = selectedDanoIdRef.current;
    if (!file || !danoId) return;

    const dano = danos.find(d => d.id === danoId);
    if (dano && (dano.fotos?.length || 0) >= MAX_PHOTOS_PER_DAMAGE) {
      toast.error(`Máximo ${MAX_PHOTOS_PER_DAMAGE} fotos por daño`);
      e.target.value = "";
      return;
    }

    setUploadingDanoId(danoId);
    try {
      // Compress image
      const compressed = await compressImageForUpload(file, "evidence");

      // Generate unique path
      const timestamp = Date.now();
      const folderPath = checkupId || "temp";
      const storagePath = `${folderPath}/${danoId}/${timestamp}.jpg`;

      // Upload to storage
      const { error } = await supabase.storage
        .from("checkups-danos-fotos")
        .upload(storagePath, compressed);

      if (error) throw error;

      // Update damage with new photo path
      const newDanos = danos.map(d =>
        d.id === danoId
          ? { ...d, fotos: [...(d.fotos || []), storagePath] }
          : d
      );
      onDanosChange(newDanos);
      toast.success("Foto agregada");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Error al subir la foto");
    } finally {
      setUploadingDanoId(null);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = async (danoId: string, photoPath: string) => {
    try {
      // Remove from storage
      await supabase.storage.from("checkups-danos-fotos").remove([photoPath]);

      // Update local state
      const newDanos = danos.map(d =>
        d.id === danoId
          ? { ...d, fotos: d.fotos?.filter(f => f !== photoPath) }
          : d
      );
      onDanosChange(newDanos);
    } catch (error) {
      console.error("Error removing photo:", error);
      toast.error("Error al eliminar la foto");
    }
  };

  const getAreaLabel = (vista: VistaCamion, x: number, y: number): string => {
    switch (vista) {
      case "superior":
        if (x < 25) return "Cabina";
        return y < 50 ? "Caja Izq" : "Caja Der";
      case "lateral_izq":
      case "lateral_der":
        if (x < 20) return "Cabina";
        if (x < 40) return "Caja Frente";
        if (x < 70) return "Caja Centro";
        return "Caja Trasera";
      case "frontal":
        if (y < 30) return "Parabrisas";
        if (y < 60) return "Cofre";
        return x < 50 ? "Faro Izq" : "Faro Der";
      case "trasera":
        if (y < 70) return x < 50 ? "Puerta Izq" : "Puerta Der";
        return "Defensa";
      default:
        return "";
    }
  };

  const danosVistaActual = danos.filter(d => d.vista === vistaActual);
  const conteosPorVista = (Object.keys(VISTA_CONFIG) as VistaCamion[]).reduce((acc, vista) => {
    acc[vista] = danos.filter(d => d.vista === vista).length;
    return acc;
  }, {} as Record<VistaCamion, number>);

  // SVG Components for each view - Professional ALMASA truck diagrams
  const renderSVG = () => {
    const styles = {
      body: "fill-slate-200 stroke-slate-500",
      cabin: "fill-slate-300 stroke-slate-600",
      window: "fill-sky-200 stroke-slate-500",
      wheel: "fill-slate-700",
      wheelRim: "fill-slate-400",
      detail: "fill-slate-100 stroke-slate-400",
      curtain: "fill-slate-50 stroke-slate-300",
      curtainLine: "stroke-slate-300",
      bumper: "fill-slate-400 stroke-slate-600",
      light: "fill-amber-300 stroke-slate-500",
      tailLight: "fill-red-400 stroke-slate-500",
      fuelTank: "fill-slate-500 stroke-slate-600",
      text: "fill-slate-500 text-[7px] font-medium",
      brandText: "fill-red-600 text-[14px] font-bold",
      labelText: "fill-slate-400 text-[6px]",
    };

    switch (vistaActual) {
      case "superior":
        return (
          <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Shadow for depth */}
            <ellipse cx="200" cy="175" rx="180" ry="15" className="fill-slate-900/10" />
            
            {/* Cabina - Top view with realistic shape */}
            <rect x="15" y="55" width="80" height="90" rx="12" className={styles.cabin} strokeWidth="2" />
            
            {/* Techo cabina con AC */}
            <rect x="25" y="65" width="60" height="70" rx="8" className={styles.window} strokeWidth="1" />
            <rect x="40" y="58" width="30" height="8" rx="2" className={styles.detail} strokeWidth="1" />
            <text x="55" y="64" textAnchor="middle" className={styles.labelText}>A/C</text>
            
            {/* Espejos laterales grandes */}
            <rect x="5" y="75" width="12" height="25" rx="3" className={styles.detail} strokeWidth="1.5" />
            <rect x="93" y="75" width="12" height="25" rx="3" className={styles.detail} strokeWidth="1.5" />
            
            {/* Caja de carga - Top view */}
            <rect x="105" y="35" width="280" height="130" rx="4" className={styles.body} strokeWidth="2" />
            
            {/* Bordes superiores de la caja */}
            <rect x="105" y="35" width="280" height="8" rx="2" className={styles.bumper} strokeWidth="1" />
            <rect x="105" y="157" width="280" height="8" rx="2" className={styles.bumper} strokeWidth="1" />
            
            {/* Logo ALMASA centrado en la caja */}
            <rect x="200" y="85" width="100" height="30" rx="3" className="fill-white stroke-red-500" strokeWidth="1" />
            <text x="250" y="106" textAnchor="middle" className={styles.brandText}>ALMASA</text>
            
            {/* Línea central divisoria */}
            <line x1="105" y1="100" x2="385" y2="100" className="stroke-slate-400" strokeWidth="1" strokeDasharray="8,4" />
            
            {/* Etiquetas de zonas */}
            <text x="55" y="105" textAnchor="middle" className={styles.text}>CABINA</text>
            <text x="180" y="60" textAnchor="middle" className={styles.labelText}>LADO IZQUIERDO</text>
            <text x="180" y="148" textAnchor="middle" className={styles.labelText}>LADO DERECHO</text>
            
            {/* Indicador frontal con flecha */}
            <polygon points="55,30 45,48 65,48" className="fill-red-500" />
            <text x="55" y="23" textAnchor="middle" className="fill-red-600 text-[8px] font-bold">▲ FRENTE</text>
          </svg>
        );

      case "lateral_izq":
      case "lateral_der":
        const isLeft = vistaActual === "lateral_izq";
        return (
          <svg viewBox="0 0 420 190" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Ground shadow */}
            <ellipse cx="220" cy="178" rx="200" ry="8" className="fill-slate-900/10" />
            
            {/* === CABINA === */}
            {/* Cuerpo cabina con forma de camión */}
            <path 
              d="M15 150 L15 55 Q15 45 25 45 L55 30 Q60 28 65 30 L85 40 Q90 42 90 48 L90 150 Z" 
              className={styles.cabin} 
              strokeWidth="2" 
            />
            
            {/* Visera/Toldo superior */}
            <path d="M18 48 L52 28 L88 42 L88 50 L52 38 L18 55 Z" className={styles.bumper} strokeWidth="1" />
            
            {/* Parabrisas inclinado */}
            <path 
              d="M22 62 L52 35 L82 45 L82 62 Q82 65 78 65 L26 65 Q22 65 22 62 Z" 
              className={styles.window} 
              strokeWidth="1.5" 
            />
            
            {/* Ventana lateral */}
            <rect x="22" y="70" width="62" height="28" rx="4" className={styles.window} strokeWidth="1" />
            
            {/* Puerta con detalles */}
            <rect x="22" y="68" width="62" height="75" rx="3" className="fill-none stroke-slate-500" strokeWidth="1.5" />
            <circle cx="78" cy="108" r="4" className="fill-slate-400 stroke-slate-500" strokeWidth="1" />
            
            {/* Escalón */}
            <rect x="15" y="145" width="25" height="8" rx="1" className={styles.bumper} strokeWidth="1" />
            
            {/* Luces delanteras */}
            <rect x="12" y="130" width="8" height="12" rx="2" className={styles.light} strokeWidth="1" />
            
            {/* Tanque de combustible cilíndrico */}
            <ellipse cx="52" cy="152" rx="18" ry="8" className={styles.fuelTank} strokeWidth="1.5" />
            <ellipse cx="52" cy="152" rx="12" ry="5" className="fill-slate-600" />
            <text x="52" y="155" textAnchor="middle" className="fill-slate-300 text-[5px]">DIESEL</text>
            
            {/* Llanta delantera con detalle de rin */}
            <ellipse cx="52" cy="172" rx="28" ry="13" className={styles.wheel} />
            <ellipse cx="52" cy="172" rx="18" ry="8" className={styles.wheelRim} />
            <ellipse cx="52" cy="172" rx="8" ry="4" className="fill-slate-600" />
            
            {/* === CAJA DE CARGA CON CORTINAS === */}
            <rect x="100" y="25" width="305" height="130" rx="3" className={styles.body} strokeWidth="2" />
            
            {/* Marco superior de la caja */}
            <rect x="100" y="22" width="305" height="8" rx="2" className={styles.bumper} strokeWidth="1" />
            
            {/* Cortinas laterales con pliegues */}
            <rect x="105" y="30" width="295" height="118" className={styles.curtain} strokeWidth="1" />
            
            {/* Líneas de pliegue de cortina */}
            {Array.from({ length: 12 }).map((_, i) => (
              <g key={i}>
                <line 
                  x1={130 + i * 23} y1="30" 
                  x2={130 + i * 23} y2="148" 
                  className={styles.curtainLine} 
                  strokeWidth="0.5" 
                />
                {/* Sombras de pliegue */}
                <rect 
                  x={131 + i * 23} y="30" 
                  width="6" height="118" 
                  className="fill-slate-200/50" 
                />
              </g>
            ))}
            
            {/* Logo ALMASA en la caja */}
            <rect x="200" y="65" width="100" height="35" rx="4" className="fill-white/90 stroke-red-500" strokeWidth="1.5" />
            <text x="250" y="88" textAnchor="middle" className="fill-red-600 text-[16px] font-bold" style={{ fontFamily: 'Arial Black, sans-serif' }}>ALMASA</text>
            <text x="250" y="96" textAnchor="middle" className="fill-slate-500 text-[4px]">DISTRIBUIDORA DE ALIMENTOS</text>
            
            {/* Divisiones de secciones */}
            <line x1="170" y1="22" x2="170" y2="155" className="stroke-slate-400" strokeWidth="1.5" strokeDasharray="4,2" />
            <line x1="250" y1="22" x2="250" y2="155" className="stroke-slate-400" strokeWidth="1.5" strokeDasharray="4,2" />
            <line x1="330" y1="22" x2="330" y2="155" className="stroke-slate-400" strokeWidth="1.5" strokeDasharray="4,2" />
            
            {/* Etiquetas de secciones */}
            <text x="135" y="145" textAnchor="middle" className={styles.labelText}>FRENTE</text>
            <text x="210" y="145" textAnchor="middle" className={styles.labelText}>CENTRO-1</text>
            <text x="290" y="145" textAnchor="middle" className={styles.labelText}>CENTRO-2</text>
            <text x="365" y="145" textAnchor="middle" className={styles.labelText}>TRASERA</text>
            
            {/* Loderas traseras */}
            <path d="M310 155 L310 165 Q310 175 320 175 L390 175 Q400 175 400 165 L400 155 Z" className={styles.bumper} strokeWidth="1" />
            
            {/* Llantas traseras (dobles) */}
            <ellipse cx="335" cy="172" rx="26" ry="12" className={styles.wheel} />
            <ellipse cx="335" cy="172" rx="16" ry="7" className={styles.wheelRim} />
            <ellipse cx="335" cy="172" rx="6" ry="3" className="fill-slate-600" />
            
            <ellipse cx="375" cy="172" rx="26" ry="12" className={styles.wheel} />
            <ellipse cx="375" cy="172" rx="16" ry="7" className={styles.wheelRim} />
            <ellipse cx="375" cy="172" rx="6" ry="3" className="fill-slate-600" />
            
            {/* Calavera trasera */}
            <rect x="400" y="100" width="8" height="25" rx="2" className={styles.tailLight} strokeWidth="1" />
            
            {/* Indicador de dirección */}
            <g className="fill-red-500">
              <polygon points={isLeft ? "5,90 0,100 5,110" : "415,90 420,100 415,110"} />
              <text x={isLeft ? "3" : "417"} y="120" textAnchor="middle" className="text-[6px] fill-red-600 font-bold">
                {isLeft ? "IZQ" : "DER"}
              </text>
            </g>
            
            <text x="52" y="38" textAnchor="middle" className={styles.text}>CABINA</text>
          </svg>
        );

      case "frontal":
        return (
          <svg viewBox="0 0 220 240" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Ground shadow */}
            <ellipse cx="110" cy="225" rx="90" ry="10" className="fill-slate-900/10" />
            
            {/* Cabina principal */}
            <rect x="25" y="35" width="170" height="155" rx="12" className={styles.cabin} strokeWidth="2" />
            
            {/* Visera parasol */}
            <path d="M30 38 L190 38 L185 28 Q180 22 170 22 L50 22 Q40 22 35 28 Z" className={styles.bumper} strokeWidth="1.5" />
            <text x="110" y="32" textAnchor="middle" className="fill-slate-300 text-[5px]">VISERA</text>
            
            {/* Parabrisas grande */}
            <rect x="40" y="45" width="140" height="55" rx="6" className={styles.window} strokeWidth="1.5" />
            <line x1="110" y1="45" x2="110" y2="100" className="stroke-slate-400" strokeWidth="1" />
            <text x="110" y="78" textAnchor="middle" className={styles.text}>PARABRISAS</text>
            
            {/* Marco de parabrisas */}
            <rect x="40" y="45" width="140" height="55" rx="6" className="fill-none stroke-slate-600" strokeWidth="2" />
            
            {/* Parrilla con rejilla detallada */}
            <rect x="45" y="108" width="130" height="45" rx="5" className={styles.detail} strokeWidth="1.5" />
            {/* Rejilla horizontal */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} x1="50" y1={115 + i * 8} x2="170" y2={115 + i * 8} className="stroke-slate-400" strokeWidth="1.5" />
            ))}
            {/* Logo pequeño en parrilla */}
            <rect x="85" y="120" width="50" height="18" rx="2" className="fill-white stroke-red-500" strokeWidth="1" />
            <text x="110" y="133" textAnchor="middle" className="fill-red-600 text-[9px] font-bold">ALMASA</text>
            
            {/* Faros con detalle de reflector */}
            <g>
              <ellipse cx="55" cy="165" rx="20" ry="14" className="fill-slate-100 stroke-slate-500" strokeWidth="1.5" />
              <ellipse cx="55" cy="165" rx="12" ry="8" className={styles.light} strokeWidth="1" />
              <ellipse cx="55" cy="165" rx="5" ry="3" className="fill-white" />
            </g>
            <g>
              <ellipse cx="165" cy="165" rx="20" ry="14" className="fill-slate-100 stroke-slate-500" strokeWidth="1.5" />
              <ellipse cx="165" cy="165" rx="12" ry="8" className={styles.light} strokeWidth="1" />
              <ellipse cx="165" cy="165" rx="5" ry="3" className="fill-white" />
            </g>
            <text x="55" y="168" textAnchor="middle" className={styles.labelText}>FARO IZQ</text>
            <text x="165" y="168" textAnchor="middle" className={styles.labelText}>FARO DER</text>
            
            {/* Luces direccionales */}
            <rect x="30" y="155" width="12" height="8" rx="2" className="fill-amber-400 stroke-slate-500" strokeWidth="1" />
            <rect x="178" y="155" width="12" height="8" rx="2" className="fill-amber-400 stroke-slate-500" strokeWidth="1" />
            
            {/* Defensa con escalón */}
            <rect x="20" y="185" width="180" height="18" rx="4" className={styles.bumper} strokeWidth="1.5" />
            <rect x="80" y="188" width="60" height="8" rx="2" className="fill-slate-300 stroke-slate-500" strokeWidth="1" />
            <text x="110" y="195" textAnchor="middle" className={styles.labelText}>DEFENSA</text>
            
            {/* Espejos laterales grandes */}
            <rect x="5" y="55" width="18" height="35" rx="4" className={styles.detail} strokeWidth="1.5" />
            <rect x="197" y="55" width="18" height="35" rx="4" className={styles.detail} strokeWidth="1.5" />
            <text x="14" y="75" textAnchor="middle" className="fill-slate-400 text-[4px]">ESP</text>
            <text x="206" y="75" textAnchor="middle" className="fill-slate-400 text-[4px]">ESP</text>
            
            {/* Llantas con detalle */}
            <ellipse cx="50" cy="218" rx="25" ry="10" className={styles.wheel} />
            <ellipse cx="50" cy="218" rx="15" ry="6" className={styles.wheelRim} />
            <ellipse cx="170" cy="218" rx="25" ry="10" className={styles.wheel} />
            <ellipse cx="170" cy="218" rx="15" ry="6" className={styles.wheelRim} />
            
            {/* Título */}
            <text x="110" y="15" textAnchor="middle" className="fill-slate-600 text-[9px] font-bold">VISTA FRONTAL</text>
          </svg>
        );

      case "trasera":
        return (
          <svg viewBox="0 0 220 240" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Ground shadow */}
            <ellipse cx="110" cy="228" rx="100" ry="10" className="fill-slate-900/10" />
            
            {/* Caja trasera completa */}
            <rect x="15" y="15" width="190" height="165" rx="6" className={styles.body} strokeWidth="2" />
            
            {/* Marco superior de la caja */}
            <rect x="15" y="12" width="190" height="10" rx="3" className={styles.bumper} strokeWidth="1" />
            
            {/* Logo ALMASA en la parte superior */}
            <rect x="60" y="22" width="100" height="28" rx="3" className="fill-white stroke-red-500" strokeWidth="1.5" />
            <text x="110" y="42" textAnchor="middle" className="fill-red-600 text-[14px] font-bold" style={{ fontFamily: 'Arial Black, sans-serif' }}>ALMASA</text>
            
            {/* Puertas de carga con bisagras */}
            <rect x="22" y="55" width="85" height="118" rx="3" className={styles.curtain} strokeWidth="1.5" />
            <rect x="113" y="55" width="85" height="118" rx="3" className={styles.curtain} strokeWidth="1.5" />
            
            {/* Bisagras de puertas */}
            <rect x="22" y="70" width="5" height="15" rx="1" className="fill-slate-400" />
            <rect x="22" y="100" width="5" height="15" rx="1" className="fill-slate-400" />
            <rect x="22" y="130" width="5" height="15" rx="1" className="fill-slate-400" />
            <rect x="193" y="70" width="5" height="15" rx="1" className="fill-slate-400" />
            <rect x="193" y="100" width="5" height="15" rx="1" className="fill-slate-400" />
            <rect x="193" y="130" width="5" height="15" rx="1" className="fill-slate-400" />
            
            {/* Barras de seguridad verticales */}
            <line x1="45" y1="60" x2="45" y2="168" className="stroke-slate-400" strokeWidth="2" />
            <line x1="85" y1="60" x2="85" y2="168" className="stroke-slate-400" strokeWidth="2" />
            <line x1="135" y1="60" x2="135" y2="168" className="stroke-slate-400" strokeWidth="2" />
            <line x1="175" y1="60" x2="175" y2="168" className="stroke-slate-400" strokeWidth="2" />
            
            {/* Manijas centrales */}
            <rect x="100" y="95" width="8" height="35" rx="2" className="fill-slate-500 stroke-slate-600" strokeWidth="1" />
            <rect x="112" y="95" width="8" height="35" rx="2" className="fill-slate-500 stroke-slate-600" strokeWidth="1" />
            <circle cx="104" cy="130" r="3" className="fill-slate-300" />
            <circle cx="116" cy="130" r="3" className="fill-slate-300" />
            
            {/* Etiquetas puertas */}
            <text x="64" y="115" textAnchor="middle" className={styles.text}>PUERTA</text>
            <text x="64" y="125" textAnchor="middle" className={styles.text}>IZQUIERDA</text>
            <text x="156" y="115" textAnchor="middle" className={styles.text}>PUERTA</text>
            <text x="156" y="125" textAnchor="middle" className={styles.text}>DERECHA</text>
            
            {/* Calaveras con reflector */}
            <g>
              <rect x="20" y="182" width="30" height="15" rx="3" className={styles.tailLight} strokeWidth="1.5" />
              <rect x="25" y="185" width="8" height="9" rx="1" className="fill-red-300" />
              <rect x="37" y="185" width="8" height="9" rx="1" className="fill-amber-400" />
            </g>
            <g>
              <rect x="170" y="182" width="30" height="15" rx="3" className={styles.tailLight} strokeWidth="1.5" />
              <rect x="175" y="185" width="8" height="9" rx="1" className="fill-amber-400" />
              <rect x="187" y="185" width="8" height="9" rx="1" className="fill-red-300" />
            </g>
            <text x="35" y="193" textAnchor="middle" className="fill-white text-[4px]">CALAV</text>
            <text x="185" y="193" textAnchor="middle" className="fill-white text-[4px]">CALAV</text>
            
            {/* Placa con marco */}
            <rect x="75" y="182" width="70" height="15" rx="2" className="fill-white stroke-slate-600" strokeWidth="1.5" />
            <text x="110" y="193" textAnchor="middle" className="fill-slate-600 text-[7px] font-bold">ABC-1234</text>
            
            {/* Defensa trasera con antiderrapante */}
            <rect x="10" y="200" width="200" height="12" rx="3" className={styles.bumper} strokeWidth="1.5" />
            {/* Patrón antiderrapante */}
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={i} x1={20 + i * 10} y1="203" x2={25 + i * 10} y2="209" className="stroke-slate-500" strokeWidth="1" />
            ))}
            <text x="110" y="209" textAnchor="middle" className={styles.labelText}>DEFENSA</text>
            
            {/* Loderas */}
            <path d="M25 212 L25 220 Q25 225 35 225 L80 225 Q90 225 90 220 L90 212 Z" className={styles.bumper} strokeWidth="1" />
            <path d="M130 212 L130 220 Q130 225 140 225 L185 225 Q195 225 195 220 L195 212 Z" className={styles.bumper} strokeWidth="1" />
            
            {/* Llantas traseras dobles */}
            <ellipse cx="45" cy="225" rx="20" ry="8" className={styles.wheel} />
            <ellipse cx="45" cy="225" rx="12" ry="5" className={styles.wheelRim} />
            <ellipse cx="72" cy="225" rx="20" ry="8" className={styles.wheel} />
            <ellipse cx="72" cy="225" rx="12" ry="5" className={styles.wheelRim} />
            
            <ellipse cx="148" cy="225" rx="20" ry="8" className={styles.wheel} />
            <ellipse cx="148" cy="225" rx="12" ry="5" className={styles.wheelRim} />
            <ellipse cx="175" cy="225" rx="20" ry="8" className={styles.wheel} />
            <ellipse cx="175" cy="225" rx="12" ry="5" className={styles.wheelRim} />
            
            {/* Título */}
            <text x="110" y="8" textAnchor="middle" className="fill-slate-600 text-[9px] font-bold">VISTA TRASERA</text>
          </svg>
        );
    }
  };

  return (
    <div className="space-y-3">
      <Label className="font-semibold flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Diagrama de Daños - Camión (toca para marcar)
      </Label>

      {/* Tipo selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Tipo:</span>
        {(Object.keys(TIPO_CONFIG) as TipoDano[]).map((tipo) => (
          <Button
            key={tipo}
            type="button"
            variant={tipoSeleccionado === tipo ? "default" : "outline"}
            size="sm"
            onClick={() => setTipoSeleccionado(tipo)}
            disabled={disabled}
            className={`min-h-[44px] px-4 ${tipoSeleccionado === tipo ? TIPO_CONFIG[tipo].bgColor : ""}`}
          >
            <span className="mr-1">{TIPO_CONFIG[tipo].icon}</span>
            {TIPO_CONFIG[tipo].label}
          </Button>
        ))}
      </div>

      {/* Vista tabs */}
      <Tabs value={vistaActual} onValueChange={(v) => setVistaActual(v as VistaCamion)} className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {(Object.keys(VISTA_CONFIG) as VistaCamion[]).map((vista) => (
            <TabsTrigger 
              key={vista} 
              value={vista}
              className="min-h-[40px] px-3 flex-1 min-w-[70px] data-[state=active]:bg-background"
            >
              <span className="mr-1">{VISTA_CONFIG[vista].icon}</span>
              <span className="hidden sm:inline">{VISTA_CONFIG[vista].label}</span>
              {conteosPorVista[vista] > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {conteosPorVista[vista]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(VISTA_CONFIG) as VistaCamion[]).map((vista) => (
          <TabsContent key={vista} value={vista} className="mt-2">
            {/* Vehicle diagram container */}
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              className="relative w-full aspect-[2/1] max-w-lg mx-auto border-2 border-dashed border-muted-foreground/30 rounded-xl bg-muted/30 cursor-crosshair select-none overflow-hidden"
              style={{ touchAction: "none" }}
            >
              {renderSVG()}

              {/* Damage markers overlay */}
              {danosVistaActual.map((dano) => {
                const index = danos.findIndex(d => d.id === dano.id);
                return (
                  <div
                    key={dano.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto group"
                    style={{
                      left: `${dano.posicionX}%`,
                      top: `${dano.posicionY}%`,
                    }}
                  >
                    <div
                      className={`w-7 h-7 rounded-full ${TIPO_CONFIG[dano.tipo].bgColor} border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs animate-pulse`}
                    >
                      {index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarDano(dano.id);
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}

              {/* Touch hint */}
              {danosVistaActual.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground text-sm bg-background/80 px-3 py-1 rounded">
                    Toca para marcar daños en esta vista
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Damage list */}
      {danos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Daños marcados: {danos.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={limpiarTodos}
              disabled={disabled}
              className="text-destructive hover:text-destructive min-h-[40px]"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpiar todo
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
            {danos.map((dano, index) => (
              <div
                key={dano.id}
                className="p-2 rounded bg-muted/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TIPO_CONFIG[dano.tipo].icon}</span>
                    <div className="text-sm">
                      <span className="font-medium">
                        {index + 1}. {TIPO_CONFIG[dano.tipo].label}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {VISTA_CONFIG[dano.vista].label} - {getAreaLabel(dano.vista, dano.posicionX, dano.posicionY)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Camera button for adding photo */}
                    {!disabled && (dano.fotos?.length || 0) < MAX_PHOTOS_PER_DAMAGE && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddPhoto(dano.id)}
                        disabled={uploadingDanoId === dano.id}
                        className="h-8 w-8 p-0 text-primary"
                      >
                        {uploadingDanoId === dano.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarDano(dano.id)}
                      disabled={disabled}
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Photo gallery for this damage */}
                {dano.fotos && dano.fotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap pl-8">
                    {dano.fotos.map((photoPath) => (
                      <DanoFotoThumbnail
                        key={photoPath}
                        path={photoPath}
                        disabled={disabled}
                        onRemove={() => handleRemovePhoto(dano.id, photoPath)}
                        onPreview={(url) => setPreviewUrl(url)}
                      />
                    ))}
                    {(dano.fotos.length < MAX_PHOTOS_PER_DAMAGE) && !disabled && (
                      <button
                        type="button"
                        onClick={() => handleAddPhoto(dano.id)}
                        disabled={uploadingDanoId === dano.id}
                        className="w-12 h-12 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        {uploadingDanoId === dano.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary badges by view */}
      {danos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(VISTA_CONFIG) as VistaCamion[]).map((vista) => {
            const count = danos.filter((d) => d.vista === vista).length;
            if (count === 0) return null;
            return (
              <Badge key={vista} variant="outline" className="text-xs">
                {VISTA_CONFIG[vista].icon} {VISTA_CONFIG[vista].label}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Summary badges by type */}
      {danos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(TIPO_CONFIG) as TipoDano[]).map((tipo) => {
            const count = danos.filter((d) => d.tipo === tipo).length;
            if (count === 0) return null;
            return (
              <Badge key={tipo} variant="secondary" className={TIPO_CONFIG[tipo].color}>
                {TIPO_CONFIG[tipo].icon} {count} {TIPO_CONFIG[tipo].label}
                {count > 1 ? "s" : ""}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Hidden file input for camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Photo preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl p-1 overflow-x-hidden">
          {previewUrl && (
            <img 
              src={previewUrl} 
              alt="Evidencia de daño" 
              className="w-full h-auto rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
