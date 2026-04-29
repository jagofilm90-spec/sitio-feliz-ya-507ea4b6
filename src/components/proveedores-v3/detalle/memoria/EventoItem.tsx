import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getTipoEventoIcon,
  getTipoEventoTone,
  toneClasses,
  type EventoProveedor,
} from "@/lib/eventos-proveedor-utils";
import { useDeleteEvento } from "@/hooks/useProveedorMemoria";

interface Props {
  evento: EventoProveedor;
  proveedorId: string;
}

export function EventoItem({ evento, proveedorId }: Props) {
  const [open, setOpen] = useState(false);
  const del = useDeleteEvento(proveedorId);
  const isManual = evento.origen === "manual";
  const tone = getTipoEventoTone(evento.tipo_evento);
  const icon = getTipoEventoIcon(evento.tipo_evento);

  const dateRel = formatDistanceToNow(new Date(evento.created_at), {
    locale: es,
    addSuffix: true,
  });
  const dateFull = format(new Date(evento.created_at), "d 'de' MMMM yyyy, HH:mm", {
    locale: es,
  });

  return (
    <div className="group grid grid-cols-[auto_1fr_auto] gap-3.5 items-start rounded-lg border border-ink-100 bg-white px-[18px] py-3.5">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${toneClasses[tone]}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[13px] text-ink-900 leading-snug">{evento.titulo}</div>
        {evento.descripcion && (
          <div className="text-xs text-ink-700 mt-0.5">{evento.descripcion}</div>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-500">
          <Badge variant={isManual ? "secondary" : "info"} className="!text-[10px] !py-0 !px-2 uppercase tracking-wider">
            {isManual ? "Manual" : "Auto"}
          </Badge>
          <span>{isManual ? "Registrado manualmente" : "Detectado por el sistema"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 whitespace-nowrap">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[11px] italic text-ink-500" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {dateRel}
              </span>
            </TooltipTrigger>
            <TooltipContent>{dateFull}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {isManual && (
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-ink-500 hover:text-red-700"
                aria-label="Eliminar evento"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este evento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => del.mutate(evento.id)}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
