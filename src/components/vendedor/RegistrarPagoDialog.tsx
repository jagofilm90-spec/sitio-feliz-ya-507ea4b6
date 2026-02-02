import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CreditCard, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  Upload,
  Loader2
} from "lucide-react";

interface Factura {
  id: string;
  folio: string;
  total: number;
  saldo_pendiente: number;
  fecha_vencimiento: string | null;
  dias_vencido: number;
  selected: boolean;
  monto_a_aplicar: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNombre: string;
  onPagoRegistrado: () => void;
}

export function RegistrarPagoDialog({ 
  open, 
  onOpenChange, 
  clienteId, 
  clienteNombre,
  onPagoRegistrado 
}: Props) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [montoTotal, setMontoTotal] = useState("");
  const [formaPago, setFormaPago] = useState<string>("");
  const [referencia, setReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [requiereValidacion, setRequiereValidacion] = useState(false);

  useEffect(() => {
    if (open && clienteId) {
      fetchFacturas();
    }
  }, [open, clienteId]);

  const fetchFacturas = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("facturas")
        .select("id, folio, total, fecha_vencimiento")
        .eq("cliente_id", clienteId)
        .eq("pagada", false)
        .order("fecha_vencimiento", { ascending: true });

      if (error) throw error;

      const hoy = new Date();
      const facturasFormateadas: Factura[] = (data || []).map(f => {
        const vencimiento = f.fecha_vencimiento ? new Date(f.fecha_vencimiento) : null;
        const diasVencido = vencimiento 
          ? Math.floor((hoy.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        return {
          id: f.id,
          folio: f.folio,
          total: f.total,
          saldo_pendiente: f.total, // Por ahora asumimos el total
          fecha_vencimiento: f.fecha_vencimiento,
          dias_vencido: diasVencido,
          selected: false,
          monto_a_aplicar: 0
        };
      });

      setFacturas(facturasFormateadas);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  };

  const toggleFactura = (facturaId: string) => {
    setFacturas(prev => prev.map(f => {
      if (f.id === facturaId) {
        const newSelected = !f.selected;
        return {
          ...f,
          selected: newSelected,
          monto_a_aplicar: newSelected ? f.saldo_pendiente : 0
        };
      }
      return f;
    }));
  };

  const updateMontoAplicar = (facturaId: string, monto: number) => {
    setFacturas(prev => prev.map(f => {
      if (f.id === facturaId) {
        return {
          ...f,
          monto_a_aplicar: Math.min(monto, f.saldo_pendiente)
        };
      }
      return f;
    }));
  };

  const facturasSeleccionadas = facturas.filter(f => f.selected);
  const totalAplicar = facturasSeleccionadas.reduce((sum, f) => sum + f.monto_a_aplicar, 0);
  const montoIngresado = parseFloat(montoTotal) || 0;
  const diferencia = montoIngresado - totalAplicar;

  const distribuirAutomaticamente = () => {
    let montoRestante = montoIngresado;
    
    setFacturas(prev => {
      // Ordenar por días vencido (más vencidos primero)
      const ordenadas = [...prev].sort((a, b) => b.dias_vencido - a.dias_vencido);
      
      return ordenadas.map(f => {
        if (montoRestante <= 0) {
          return { ...f, selected: false, monto_a_aplicar: 0 };
        }
        
        const aplicar = Math.min(montoRestante, f.saldo_pendiente);
        montoRestante -= aplicar;
        
        return {
          ...f,
          selected: aplicar > 0,
          monto_a_aplicar: aplicar
        };
      });
    });
  };

  const handleSubmit = async () => {
    if (!formaPago) {
      toast.error("Selecciona una forma de pago");
      return;
    }

    if (montoIngresado <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    if (facturasSeleccionadas.length === 0) {
      toast.error("Selecciona al menos una factura");
      return;
    }

    if (totalAplicar <= 0) {
      toast.error("El monto a aplicar debe ser mayor a 0");
      return;
    }

    try {
      setSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Crear el pago principal
      const { data: pago, error: pagoError } = await supabase
        .from("pagos_cliente")
        .insert({
          cliente_id: clienteId,
          monto_total: montoIngresado,
          monto_aplicado: totalAplicar,
          forma_pago: formaPago,
          referencia: referencia || null,
          status: requiereValidacion ? "pendiente" : "validado",
          requiere_validacion: requiereValidacion,
          registrado_por: user.id,
          notas: notas || null
        })
        .select()
        .single();

      if (pagoError) throw pagoError;

      // Crear los detalles (aplicación a facturas)
      const detalles = facturasSeleccionadas
        .filter(f => f.monto_a_aplicar > 0)
        .map(f => ({
          pago_id: pago.id,
          factura_id: f.id,
          monto_aplicado: f.monto_a_aplicar
        }));

      if (detalles.length > 0) {
        const { error: detalleError } = await supabase
          .from("pagos_cliente_detalle")
          .insert(detalles);

        if (detalleError) throw detalleError;
      }

      // Si no requiere validación, actualizar las facturas
      if (!requiereValidacion) {
        for (const factura of facturasSeleccionadas) {
          if (factura.monto_a_aplicar >= factura.saldo_pendiente) {
            // Marcar como pagada
            await supabase
              .from("facturas")
              .update({ pagada: true })
              .eq("id", factura.id);
          }
        }
      }

      toast.success(
        requiereValidacion 
          ? "Pago registrado (pendiente de validación)" 
          : "Pago registrado exitosamente"
      );
      
      onPagoRegistrado();
      onOpenChange(false);
      
      // Reset form
      setMontoTotal("");
      setFormaPago("");
      setReferencia("");
      setNotas("");
      setRequiereValidacion(false);
      setFacturas([]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al registrar el pago");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Registrar Cobro
          </DialogTitle>
          <DialogDescription>
            Registrar pago del cliente: <strong>{clienteNombre}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(90vh-220px)] pr-4">
            <div className="space-y-6">
              {/* Monto y forma de pago */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto recibido *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="monto"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={montoTotal}
                      onChange={(e) => setMontoTotal(e.target.value)}
                      className="pl-9 h-12 text-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Forma de pago *</Label>
                  <Select value={formaPago} onValueChange={setFormaPago}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="deposito">Depósito</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Referencia (para transferencias) */}
              {(formaPago === "transferencia" || formaPago === "deposito" || formaPago === "cheque") && (
                <div className="space-y-2">
                  <Label htmlFor="referencia">
                    Referencia / No. de operación
                  </Label>
                  <Input
                    id="referencia"
                    placeholder="Ej: 123456789"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="h-12"
                  />
                </div>
              )}

              {/* Facturas a aplicar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Aplicar a facturas</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={distribuirAutomaticamente}
                    disabled={montoIngresado <= 0}
                  >
                    Distribuir automáticamente
                  </Button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : facturas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Este cliente no tiene facturas pendientes
                  </div>
                ) : (
                  <div className="space-y-2 border rounded-lg p-3">
                    {facturas.map((factura) => (
                      <div 
                        key={factura.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          factura.selected 
                            ? "bg-primary/5 border-primary/30" 
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={factura.selected}
                            onCheckedChange={() => toggleFactura(factura.id)}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{factura.folio}</span>
                              {factura.dias_vencido > 0 ? (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Vencido {factura.dias_vencido}d
                                </Badge>
                              ) : factura.dias_vencido >= -7 ? (
                                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                  Por vencer
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Al corriente
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Vence: {factura.fecha_vencimiento 
                                ? format(new Date(factura.fecha_vencimiento), "d MMM yyyy", { locale: es })
                                : "Sin fecha"}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-semibold">
                              {formatCurrency(factura.saldo_pendiente)}
                            </div>
                            {factura.selected && (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={factura.saldo_pendiente}
                                value={factura.monto_a_aplicar || ""}
                                onChange={(e) => updateMontoAplicar(factura.id, parseFloat(e.target.value) || 0)}
                                className="w-28 h-8 mt-1 text-right text-sm"
                                placeholder="Monto"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumen */}
              {montoIngresado > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Monto recibido:</span>
                    <span className="font-semibold">{formatCurrency(montoIngresado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total a aplicar:</span>
                    <span className="font-semibold">{formatCurrency(totalAplicar)}</span>
                  </div>
                  {diferencia !== 0 && (
                    <div className={`flex justify-between ${diferencia > 0 ? "text-amber-600" : "text-destructive"}`}>
                      <span>{diferencia > 0 ? "Excedente:" : "Falta por aplicar:"}</span>
                      <span className="font-semibold">{formatCurrency(Math.abs(diferencia))}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notas">Notas (opcional)</Label>
                <Textarea
                  id="notas"
                  placeholder="Observaciones del pago..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Requiere validación */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Checkbox
                  id="validacion"
                  checked={requiereValidacion}
                  onCheckedChange={(checked) => setRequiereValidacion(!!checked)}
                />
                <div>
                  <Label htmlFor="validacion" className="font-medium cursor-pointer">
                    Requiere validación de tesorería
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    El pago quedará pendiente hasta que se confirme
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={submitting || facturasSeleccionadas.length === 0 || !formaPago}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
