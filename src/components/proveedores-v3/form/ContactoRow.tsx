import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
import { Trash2 } from "lucide-react";
import type { ContactoForm } from "@/lib/proveedor-form-utils";

interface Props {
  contacto: ContactoForm;
  index: number;
  canDelete: boolean;
  errors: Record<string, string>;
  onChange: (patch: Partial<ContactoForm>) => void;
  onDelete: () => void;
  onSetPrincipal: () => void;
}

export const ContactoRow = ({
  contacto,
  index,
  canDelete,
  errors,
  onChange,
  onDelete,
  onSetPrincipal,
}: Props) => {
  const eN = errors[`contacto_${index}_nombre`];
  const eT = errors[`contacto_${index}_telefono`];

  return (
    <div className="bg-bg-warm border border-ink-100 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.2fr] gap-3">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-ink-500">
              Nombre *
            </Label>
            <Input
              value={contacto.nombre}
              onChange={(e) => onChange({ nombre: e.target.value.toUpperCase() })}
              maxLength={100}
              placeholder="EJ. ROBERTO GUTIÉRREZ"
              style={{ textTransform: 'uppercase' }}
              className={`h-9 ${eN ? "border-red-500" : ""}`}
            />
            <Input
              value={contacto.puesto}
              onChange={(e) => onChange({ puesto: e.target.value.toUpperCase() })}
              maxLength={50}
              placeholder="ROL (OPCIONAL): DUEÑO, HIJO, ENCARGADO…"
              style={{ textTransform: 'uppercase' }}
              className="h-8 mt-1.5 text-xs"
            />
            {eN && <p className="text-xs text-red-600 mt-1">{eN}</p>}
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-ink-500">
              Teléfono *
            </Label>
            <Input
              value={contacto.telefono}
              onChange={(e) => onChange({ telefono: e.target.value })}
              maxLength={20}
              placeholder="55-1234-5678"
              className={`h-9 ${eT ? "border-red-500" : ""}`}
            />
            {eT && <p className="text-xs text-red-600 mt-1">{eT}</p>}
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-ink-500">
              Email
            </Label>
            <Input
              type="email"
              value={contacto.email}
              onChange={(e) => onChange({ email: e.target.value })}
              maxLength={100}
              placeholder="contacto@ejemplo.com"
              className="h-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={contacto.es_principal}
              onCheckedChange={() => onSetPrincipal()}
            />
            <span className="text-xs text-ink-700">Principal</span>
          </label>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este contacto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción se aplicará al guardar los cambios.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
};
