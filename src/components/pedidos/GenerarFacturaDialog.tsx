import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface GenerarFacturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: {
    id: string;
    folio: string;
    fecha_pedido: string;
    total: number;
    clientes: { id: string; nombre: string; rfc: string | null } | null;
    sucursal?: { 
      nombre: string; 
      rfc: string | null;
      razon_social: string | null;
    } | null;
  } | null;
  onSuccess?: () => void;
}

const USO_CFDI_OPTIONS = [
  { value: "G01", label: "G01 - Adquisición de mercancías" },
  { value: "G03", label: "G03 - Gastos en general" },
  { value: "P01", label: "P01 - Por definir" },
];

const FORMA_PAGO_OPTIONS = [
  { value: "01", label: "01 - Efectivo" },
  { value: "03", label: "03 - Transferencia electrónica" },
  { value: "04", label: "04 - Tarjeta de crédito" },
  { value: "28", label: "28 - Tarjeta de débito" },
  { value: "99", label: "99 - Por definir" },
];

const METODO_PAGO_OPTIONS = [
  { value: "PUE", label: "PUE - Pago en una sola exhibición" },
  { value: "PPD", label: "PPD - Pago en parcialidades o diferido" },
];

export default function GenerarFacturaDialog({
  open,
  onOpenChange,
  pedido,
  onSuccess,
}: GenerarFacturaDialogProps) {
  const [usoCfdi, setUsoCfdi] = useState("G03");
  const [formaPago, setFormaPago] = useState("99");
  const [metodoPago, setMetodoPago] = useState("PUE");
  const [generando, setGenerando] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!pedido) return null;

  // Determinar RFC a usar (sucursal si tiene, sino cliente)
  const rfcReceptor = pedido.sucursal?.rfc || pedido.clientes?.rfc;
  const razonSocialReceptor = pedido.sucursal?.razon_social || pedido.clientes?.nombre;
  const hasValidRfc = rfcReceptor && rfcReceptor.length >= 12;

  const handleGenerarFactura = async () => {
    if (!hasValidRfc) {
      toast({
        title: "RFC requerido",
        description: "El cliente debe tener un RFC válido para generar factura",
        variant: "destructive",
      });
      return;
    }

    setGenerando(true);
    try {
      // Generar folio automático
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Obtener último folio del mes
      const { data: lastFactura } = await supabase
        .from("facturas")
        .select("folio")
        .like("folio", `FAC-${yearMonth}-%`)
        .order("folio", { ascending: false })
        .limit(1)
        .single();

      let newNumber = 1;
      if (lastFactura?.folio) {
        const lastNum = parseInt(lastFactura.folio.split('-')[2]) || 0;
        newNumber = lastNum + 1;
      }

      const nuevoFolio = `FAC-${yearMonth}-${String(newNumber).padStart(4, '0')}`;

      // Crear registro en facturas
      const { data: nuevaFactura, error } = await supabase
        .from("facturas")
        .insert({
          folio: nuevoFolio,
          pedido_id: pedido.id,
          cliente_id: pedido.clientes!.id,
          subtotal: pedido.total / 1.16, // Aproximación, se recalcula en timbrado
          impuestos: pedido.total - (pedido.total / 1.16),
          total: pedido.total,
          uso_cfdi: usoCfdi,
          forma_pago: formaPago,
          metodo_pago: metodoPago,
          cfdi_estado: "pendiente",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Factura generada",
        description: `Folio ${nuevoFolio} creado. Ve a Facturas para timbrar.`,
      });

      onOpenChange(false);
      onSuccess?.();
      
      // Opción: navegar a facturas
      navigate("/facturas");
    } catch (error: any) {
      console.error("Error generando factura:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo generar la factura",
        variant: "destructive",
      });
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generar Factura
          </DialogTitle>
          <DialogDescription>
            Crear factura CFDI para el pedido {pedido.folio}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen del pedido */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Cliente:</span>{" "}
              <span className="font-medium">{pedido.clientes?.nombre}</span>
            </p>
            {pedido.sucursal && (
              <p className="text-sm">
                <span className="text-muted-foreground">Sucursal:</span>{" "}
                <span className="font-medium">{pedido.sucursal.nombre}</span>
              </p>
            )}
            <p className="text-sm">
              <span className="text-muted-foreground">RFC:</span>{" "}
              <span className="font-mono font-medium">
                {rfcReceptor || <span className="text-destructive">No configurado</span>}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Total:</span>{" "}
              <span className="font-mono font-bold">${formatCurrency(pedido.total)}</span>
            </p>
          </div>

          {!hasValidRfc && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                El cliente no tiene RFC configurado. Agrega el RFC en el módulo de Clientes antes de facturar.
              </AlertDescription>
            </Alert>
          )}

          {/* Selectores CFDI */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Uso CFDI</Label>
              <Select value={usoCfdi} onValueChange={setUsoCfdi}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USO_CFDI_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pago</Label>
              <Select value={formaPago} onValueChange={setFormaPago}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMA_PAGO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODO_PAGO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerarFactura}
            disabled={!hasValidRfc || generando}
          >
            {generando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generar Factura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
