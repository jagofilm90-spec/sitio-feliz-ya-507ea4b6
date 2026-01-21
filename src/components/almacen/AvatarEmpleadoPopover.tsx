import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Camera, CreditCard, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { compressImageForUpload } from "@/lib/imageUtils";
import { toast } from "@/hooks/use-toast";

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
  return name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const getAvatarColor = (name: string): string => {
  const colors = [
    "bg-red-600",
    "bg-blue-600", 
    "bg-green-600",
    "bg-purple-600",
    "bg-orange-600",
    "bg-teal-600",
    "bg-pink-600",
    "bg-indigo-600"
  ];
  
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

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

  const initials = getInitials(empleadoNombre);
  const avatarColor = getAvatarColor(empleadoNombre);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !empleadoId) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Archivo inválido",
        description: "Por favor selecciona una imagen (JPG, PNG, WEBP)"
      });
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);

    try {
      // Comprimir imagen
      const compressedFile = await compressImageForUpload(file, 'thumbnail');
      
      // Generar nombre único
      const fileName = `${empleadoId}-${Date.now()}.jpg`;
      
      // Subir a storage
      const { error: uploadError } = await supabase.storage
        .from('empleados-fotos')
        .upload(fileName, compressedFile, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('empleados-fotos')
        .getPublicUrl(fileName);

      // Actualizar empleado con la URL
      const { error: updateError } = await supabase
        .from('empleados')
        .update({ foto_url: publicUrl })
        .eq('id', empleadoId);

      if (updateError) throw updateError;

      onFotoUpdated(publicUrl);
      setPreviewUrl(null);
      
      toast({
        title: "Foto actualizada",
        description: "Tu foto de perfil se ha actualizado correctamente"
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo subir la foto. Intenta de nuevo."
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenTarjeta = () => {
    setOpen(false);
    navigate('/tarjeta-digital');
  };

  const displayUrl = previewUrl || fotoUrl;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full transition-transform hover:scale-105">
          <Avatar className="h-10 w-10 border-2 border-slate-600 cursor-pointer">
            {displayUrl ? (
              <AvatarImage src={displayUrl} alt={empleadoNombre} />
            ) : null}
            <AvatarFallback className={cn("text-white font-semibold text-sm", avatarColor)}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-72 p-4" 
        side="right" 
        align="start"
        sideOffset={12}
      >
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar grande */}
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-slate-200">
              {displayUrl ? (
                <AvatarImage src={displayUrl} alt={empleadoNombre} />
              ) : null}
              <AvatarFallback className={cn("text-white font-bold text-2xl", avatarColor)}>
                {initials}
              </AvatarFallback>
            </Avatar>
            
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Información */}
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-lg">{empleadoNombre}</h3>
            <p className="text-sm text-muted-foreground">{empleadoPuesto}</p>
            {empleadoEmail && (
              <p className="text-xs text-muted-foreground">{empleadoEmail}</p>
            )}
          </div>

          {/* Separador */}
          <div className="w-full border-t border-border" />

          {/* Acciones */}
          <div className="w-full space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !empleadoId}
            >
              <Camera className="h-4 w-4" />
              {fotoUrl ? "Cambiar foto" : "Agregar foto"}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleOpenTarjeta}
            >
              <CreditCard className="h-4 w-4" />
              Ver mi tarjeta digital
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
