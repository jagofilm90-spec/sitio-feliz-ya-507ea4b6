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
  Loader2,
  FileUp,
  X
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

const FORMA_PAGO_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  deposito: "Depósito",
  cheque: "Cheque",
};

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
  const [fechaCheque, setFechaCheque] = useState("");
  const [notas, setNotas] = useState("");
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);

  useEffect(() => {
    if (open && clienteId) {
      fetchFacturas();
      // Reset form
      setMontoTotal("");
      setFormaPago("");
      setReferencia("");
      setFechaCheque("");
      setNotas("");
      setComprobanteFile(null);
    }
  }, [open, clienteId]);

  const fetchFacturas = async () => {
    try {
      setLoading(true);
      
      // Fetch unpaid facturas
      const { data: facturasData, error } = await supabase
        .from("facturas")
        .select("id, folio, total, fecha_vencimiento")
        .eq("cliente_id", clienteId)
        .eq("pagada", false)
        .order("fecha_vencimiento", { ascending: true });

      if (error) throw error;

      // Fetch existing payments applied per factura
      const facturaIds = (facturasData || []).map(f => f.id);
      let pagosMap: Record<string, number> = {};
      
      if (facturaIds.length > 0) {
        const { data: pagosDetalle } = await supabase
          .from("pagos_cliente_detalle")
          .select("factura_id, monto_aplicado, pago_id")
          .in("factura_id", facturaIds);

        if (pagosDetalle) {
          // Only count payments that aren't rejected
          const pagoIds = [...new Set(pagosDetalle.map(d => d.pago_id))];
          if (pagoIds.length > 0) {
            const { data: pagosStatus } = await supabase
              .from("pagos_cliente")
              .select("id, status")
              .in("id", pagoIds);
            
            const rejectedIds = new Set(
              (pagosStatus || []).filter(p => p.status === 'rechazado').map(p => p.id)
            );

            for (const d of pagosDetalle) {
              if (!rejectedIds.has(d.pago_id)) {
                pagosMap[d.factura_id] = (pagosMap[d.factura_id] || 0) + Number(d.monto_aplicado);
              }
            }
          }
        }
      }

      const hoy = new Date();
      const facturasFormateadas: Factura[] = (facturasData || []).map(f => {
        const vencimiento = f.fecha_vencimiento ? new Date(f.fecha_vencimiento) : null;
        const diasVencido = vencimiento 
          ? Math.floor((hoy.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        const totalPagado = pagosMap[f.id] || 0;
        const saldoReal = Math.max(f.total - totalPagado, 0);
        
        return {
          id: f.id,
          folio: f.folio,
          total: f.total,
          saldo_pendiente: saldoReal,
          fecha_vencimiento: f.fecha_vencimiento,
          dias_vencido: diasVencido,
          selected: false,
          monto_a_aplicar: 0
        };
      }).filter(f => f.saldo_pendiente > 0); // Only show facturas with remaining balance

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

  // Auto-determine validation requirement
  const requiereValidacion = formaPago === "transferencia" || formaPago === "deposito";

  const getReferenciaLabel = () => {
    if (formaPago === "cheque") return "Número de cheque *";
    if (formaPago === "transferencia") return "Número de referencia bancaria";
    if (formaPago === "deposito") return "Número de referencia";
    return "Referencia";
  };

  const distribuirAutomaticamente = () => {
    let montoRestante = montoIngresado;
    
    setFacturas(prev => {
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

    if (formaPago === "cheque" && !referencia.trim()) {
      toast.error("Ingresa el número de cheque");
      return;
    }

    try {
      setSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Upload comprobante if provided
      let comprobanteUrl: string | null = null;
      if (comprobanteFile) {
        const ext = comprobanteFile.name.split('.').pop();
        const filePath = `${clienteId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("comprobantes-pagos")
          .upload(filePath, comprobanteFile);
        
        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error("Error al subir comprobante, continuando sin él...");
        } else {
          const { data: urlData } = supabase.storage
            .from("comprobantes-pagos")
            .getPublicUrl(filePath);
          comprobanteUrl = urlData.publicUrl;
        }
      }

      // Build notas with cheque date if applicable
      let notasCompletas = notas || null;
      if (formaPago === "cheque" && fechaCheque) {
        const chequeInfo = `Fecha del cheque: ${fechaCheque}`;
        notasCompletas = notasCompletas ? `${chequeInfo} | ${notasCompletas}` : chequeInfo;
      }

      const pagoStatus = requiereValidacion ? "pendiente" : "validado";

      // Create main payment record
      const { data: pago, error: pagoError } = await supabase
        .from("pagos_cliente")
        .insert({
          cliente_id: clienteId,
          monto_total: montoIngresado,
          monto_aplicado: totalAplicar,
          forma_pago: formaPago,
          referencia: referencia || null,
          comprobante_url: comprobanteUrl,
          status: pagoStatus,
          requiere_validacion: requiereValidacion,
          registrado_por: user.id,
          notas: notasCompletas
        })
        .select()
        .single();

      if (pagoError) throw pagoError;

      // Create payment details (application to invoices)
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

      // If payment doesn't require validation, mark fully-paid invoices
      if (!requiereValidacion) {
        for (const factura of facturasSeleccionadas) {
          if (factura.monto_a_aplicar >= factura.saldo_pendiente) {
            await supabase
              .from("facturas")
              .update({ pagada: true, fecha_pago: new Date().toISOString() })
              .eq("id", factura.id);
          }
        }
      }

      toast.success(
        requiereValidacion 
          ? "Pago registrado — pendiente de validación" 
          : "Pago registrado y validado"
      );
      
      onPagoRegistrado();
      onOpenChange(false);
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
            Cliente: <strong>{clienteNombre}</strong>
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
                      <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                      <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                      <SelectItem value="deposito">🏧 Depósito</SelectItem>
                      <SelectItem value="cheque">📝 Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Auto-validation notice */}
              {formaPago && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  requiereValidacion 
                    ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800" 
                    : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                }`}>
                  {requiereValidacion ? (
                    <>
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Este pago quedará <strong>pendiente de validación</strong> por secretaría</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>Este pago se registrará como <strong>validado</strong> automáticamente</span>
                    </>
                  )}
                </div>
              )}

              {/* Referencia field */}
              {(formaPago === "transferencia" || formaPago === "deposito" || formaPago === "cheque") && (
                <div className="space-y-2">
                  <Label htmlFor="referencia">{getReferenciaLabel()}</Label>
                  <Input
                    id="referencia"
                    placeholder={formaPago === "cheque" ? "Ej: 001234" : "Ej: 123456789"}
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="h-12"
                  />
                </div>
              )}

              {/* Cheque date field */}
              {formaPago === "cheque" && (
                <div className="space-y-2">
                  <Label htmlFor="fecha_cheque">Fecha del cheque</Label>
                  <Input
                    id="fecha_cheque"
                    type="date"
                    value={fechaCheque}
                    onChange={(e) => setFechaCheque(e.target.value)}
                    className="h-12"
                  />
                </div>
              )}

              {/* Comprobante upload */}
              {(formaPago === "transferencia" || formaPago === "deposito") && (
                <div className="space-y-2">
                  <Label>Comprobante de pago (opcional)</Label>
                  {comprobanteFile ? (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                      <FileUp className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm truncate flex-1">{comprobanteFile.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setComprobanteFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-3 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Subir imagen o PDF del comprobante
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error("El archivo no debe superar 10MB");
                              return;
                            }
                            setComprobanteFile(file);
                          }
                        }}
                      />
                    </label>
                  )}
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
                                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                  Por vencer
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Al corriente
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Vence: {factura.fecha_vencimiento 
                                ? format(new Date(factura.fecha_vencimiento), "d MMM yyyy", { locale: es })
                                : "Sin fecha"}
                              {factura.total !== factura.saldo_pendiente && (
                                <span className="ml-2 text-xs">
                                  (Total: {formatCurrency(factura.total)})
                                </span>
                              )}
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
            {requiereValidacion ? "Registrar (pendiente validación)" : "Registrar Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
