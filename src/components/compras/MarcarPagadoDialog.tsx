import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Upload, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MarcarPagadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: {
    id: string;
    folio: string;
    proveedor_nombre: string;
    total: number;
  } | null;
}

export function MarcarPagadoDialog({
  open,
  onOpenChange,
  orden,
}: MarcarPagadoDialogProps) {
  const queryClient = useQueryClient();
  const [fechaPago, setFechaPago] = useState<Date>(new Date());
  const [referenciaPago, setReferenciaPago] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const marcarPagadoMutation = useMutation({
    mutationFn: async () => {
      let comprobanteUrl: string | null = null;

      // Upload comprobante if provided
      if (comprobante) {
        setUploading(true);
        const fileExt = comprobante.name.split(".").pop();
        const fileName = `${orden?.id}-${Date.now()}.${fileExt}`;
        const filePath = `comprobantes-pago/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("ordenes-compra")
          .upload(filePath, comprobante);

        if (uploadError) {
          throw new Error("Error al subir comprobante: " + uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from("ordenes-compra")
          .getPublicUrl(filePath);

        comprobanteUrl = urlData.publicUrl;
        setUploading(false);
      }

      const { error } = await supabase
        .from("ordenes_compra")
        .update({
          status_pago: "pagado",
          fecha_pago: fechaPago.toISOString(),
          referencia_pago: referenciaPago,
          comprobante_pago_url: comprobanteUrl,
        })
        .eq("id", orden?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pago registrado correctamente");
      queryClient.invalidateQueries({ queryKey: ["ordenes-compra"] });
      resetAndClose();
    },
    onError: (error: Error) => {
      toast.error("Error al registrar pago: " + error.message);
      setUploading(false);
    },
  });

  const resetAndClose = () => {
    setFechaPago(new Date());
    setReferenciaPago("");
    setComprobante(null);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenciaPago.trim()) {
      toast.error("La referencia de pago es requerida");
      return;
    }
    marcarPagadoMutation.mutate();
  };

  if (!orden) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info de la orden */}
          <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Folio:</span>
              <span className="font-medium">{orden.folio}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proveedor:</span>
              <span className="font-medium">{orden.proveedor_nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-primary">
                ${orden.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Fecha de pago */}
          <div className="space-y-2">
            <Label>Fecha de pago *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fechaPago && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaPago
                    ? format(fechaPago, "PPP", { locale: es })
                    : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaPago}
                  onSelect={(date) => date && setFechaPago(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Referencia */}
          <div className="space-y-2">
            <Label htmlFor="referencia">Referencia de pago *</Label>
            <Input
              id="referencia"
              placeholder="Ej: Transferencia BBVA #123456"
              value={referenciaPago}
              onChange={(e) => setReferenciaPago(e.target.value)}
              required
            />
          </div>

          {/* Comprobante */}
          <div className="space-y-2">
            <Label>Comprobante (opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                className="text-sm"
              />
              {comprobante && (
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {comprobante.name}
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={marcarPagadoMutation.isPending || uploading}
            >
              {(marcarPagadoMutation.isPending || uploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
