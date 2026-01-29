import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DollarSign,
  Building2,
  Package,
  CheckCircle2,
  RotateCcw,
  Ban,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";

interface CreditoPendiente {
  id: string;
  proveedor_id: string | null;
  proveedor_nombre_manual: string | null;
  orden_compra_origen_id: string;
  producto_id: string | null;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  monto_total: number;
  motivo: string;
  status: string;
  notas: string | null;
  created_at: string;
  ordenes_compra: {
    folio: string;
  } | null;
  proveedores: {
    nombre: string;
  } | null;
}

interface ProveedorCreditos {
  proveedorNombre: string;
  totalCreditos: number;
  creditos: CreditoPendiente[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
};

const CreditosPendientesPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedProveedores, setExpandedProveedores] = useState<Set<string>>(new Set());
  const [selectedCredito, setSelectedCredito] = useState<CreditoPendiente | null>(null);
  const [resolucionDialogOpen, setResolucionDialogOpen] = useState(false);
  const [tipoResolucion, setTipoResolucion] = useState<string>("");
  const [resolucionNotas, setResolucionNotas] = useState("");
  const [modoReembolso, setModoReembolso] = useState<"ya_deposito" | "solicitar_deposito">("ya_deposito");
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  // Query créditos pendientes
  const { data: creditosPendientes = [], isLoading } = useQuery({
    queryKey: ["creditos-pendientes-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proveedor_creditos_pendientes")
        .select(`
          *,
          proveedores (nombre)
        `)
        .eq("status", "pendiente")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch OC folios separately to avoid relationship conflict
      const ocIds = [...new Set((data || []).map(c => c.orden_compra_origen_id))];
      const { data: ocs } = await supabase
        .from("ordenes_compra")
        .select("id, folio")
        .in("id", ocIds);
      
      const ocMap = new Map((ocs || []).map(oc => [oc.id, oc.folio]));
      
      return (data || []).map(c => ({
        ...c,
        ordenes_compra: { folio: ocMap.get(c.orden_compra_origen_id) || "—" }
      })) as CreditoPendiente[];
    },
    refetchInterval: 30000,
  });

  // Agrupar por proveedor
  const creditosPorProveedor = creditosPendientes.reduce((acc, credito) => {
    const nombre = credito.proveedores?.nombre || credito.proveedor_nombre_manual || "Sin proveedor";
    if (!acc[nombre]) {
      acc[nombre] = {
        proveedorNombre: nombre,
        totalCreditos: 0,
        creditos: [],
      };
    }
    acc[nombre].totalCreditos += credito.monto_total;
    acc[nombre].creditos.push(credito);
    return acc;
  }, {} as Record<string, ProveedorCreditos>);

  const proveedoresArray = Object.values(creditosPorProveedor).sort(
    (a, b) => b.totalCreditos - a.totalCreditos
  );

  const totalGeneral = creditosPendientes.reduce((sum, c) => sum + c.monto_total, 0);

  // Mutation para resolver crédito
  const resolverCredito = useMutation({
    mutationFn: async ({ 
      creditoId, 
      tipo, 
      notas, 
      solicitarDeposito 
    }: { 
      creditoId: string; 
      tipo: string; 
      notas: string;
      solicitarDeposito?: boolean;
    }) => {
      // Determinar el status según el tipo y si solicita depósito
      let nuevoStatus = "aplicado";
      if (tipo === "cancelar") {
        nuevoStatus = "cancelado";
      } else if (tipo === "reembolso_efectivo" && solicitarDeposito) {
        nuevoStatus = "deposito_solicitado";
      }

      const { error } = await supabase
        .from("proveedor_creditos_pendientes")
        .update({
          status: nuevoStatus,
          tipo_resolucion: tipo,
          resolucion_notas: notas,
          fecha_aplicacion: new Date().toISOString(),
        })
        .eq("id", creditoId);

      if (error) throw error;

      // Si es reembolso Y se solicitó enviar datos bancarios
      if (tipo === "reembolso_efectivo" && solicitarDeposito) {
        // Obtener datos del crédito para el email
        const { data: credito } = await supabase
          .from("proveedor_creditos_pendientes")
          .select(`
            *,
            proveedores (id, nombre, email)
          `)
          .eq("id", creditoId)
          .single();

        // Get OC folio separately
        let ocFolio = "—";
        if (credito?.orden_compra_origen_id) {
          const { data: oc } = await supabase
            .from("ordenes_compra")
            .select("folio")
            .eq("id", credito.orden_compra_origen_id)
            .single();
          ocFolio = oc?.folio || "—";
        }

        if (credito) {
          const { error: emailError } = await supabase.functions.invoke("notificar-solicitud-deposito", {
            body: {
              credito_id: creditoId,
              proveedor_id: credito.proveedor_id,
              proveedor_nombre: credito.proveedores?.nombre || credito.proveedor_nombre_manual || "Proveedor",
              proveedor_email: credito.proveedores?.email,
              monto: credito.monto_total,
              producto_nombre: credito.producto_nombre,
              oc_folio: ocFolio,
              motivo: credito.motivo
            }
          });

          if (emailError) {
            console.error("Error enviando email de solicitud de depósito:", emailError);
            throw new Error("Crédito actualizado pero falló el envío del email");
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      const esDeposito = variables.tipo === "reembolso_efectivo" && variables.solicitarDeposito;
      toast({
        title: esDeposito ? "Solicitud enviada" : "Crédito actualizado",
        description: esDeposito 
          ? "Se enviaron los datos bancarios al proveedor" 
          : "El crédito ha sido marcado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["creditos-pendientes-all"] });
      setResolucionDialogOpen(false);
      setSelectedCredito(null);
      setResolucionNotas("");
      setModoReembolso("ya_deposito");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el crédito",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const toggleProveedor = (nombre: string) => {
    const newSet = new Set(expandedProveedores);
    if (newSet.has(nombre)) {
      newSet.delete(nombre);
    } else {
      newSet.add(nombre);
    }
    setExpandedProveedores(newSet);
  };

  const handleResolucion = (credito: CreditoPendiente, tipo: string) => {
    setSelectedCredito(credito);
    setTipoResolucion(tipo);
    setModoReembolso("ya_deposito"); // Reset to default
    setResolucionDialogOpen(true);
  };

  const confirmarResolucion = () => {
    if (!selectedCredito) return;
    const solicitarDeposito = tipoResolucion === "reembolso_efectivo" && modoReembolso === "solicitar_deposito";
    resolverCredito.mutate({
      creditoId: selectedCredito.id,
      tipo: tipoResolucion,
      notas: resolucionNotas,
      solicitarDeposito,
    });
  };

  const getMotivoLabel = (motivo: string) => {
    switch (motivo) {
      case "faltante": return "No llegó";
      case "roto": return "Dañado";
      case "rechazado_calidad": return "Rechazado";
      case "devolucion": return "Devolución";
      case "saldo_oc_anticipada": return "Saldo OC Anticipada";
      case "saldo_final": return "Saldo Final";
      default: return motivo;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Cargando créditos pendientes...
        </CardContent>
      </Card>
    );
  }

  if (creditosPendientes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Créditos Pendientes por Cobrar
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <p>No hay créditos pendientes</p>
          <p className="text-sm mt-1">
            Los faltantes en OCs con pago anticipado aparecerán aquí
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Card */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Créditos Pendientes</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(totalGeneral)}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-amber-700 border-amber-300">
              {creditosPendientes.length} pendiente{creditosPendientes.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Lista por proveedor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-600" />
            Créditos Pendientes por Cobrar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {proveedoresArray.map((proveedor) => (
            <Collapsible
              key={proveedor.proveedorNombre}
              open={expandedProveedores.has(proveedor.proveedorNombre)}
              onOpenChange={() => toggleProveedor(proveedor.proveedorNombre)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    {expandedProveedores.has(proveedor.proveedorNombre) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{proveedor.proveedorNombre}</span>
                    <Badge variant="secondary">{proveedor.creditos.length}</Badge>
                  </div>
                  <span className="font-bold text-amber-600">
                    {formatCurrency(proveedor.totalCreditos)}
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OC Origen</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Cant.</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proveedor.creditos.map((credito) => (
                        <TableRow key={credito.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {credito.ordenes_compra?.folio || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">
                                {credito.producto_nombre}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {credito.cantidad}
                          </TableCell>
                          <TableCell className="text-right font-medium text-amber-600">
                            {formatCurrency(credito.monto_total)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                credito.motivo === "faltante" 
                                  ? "bg-orange-100 text-orange-700 border-orange-300" 
                                  : "bg-red-100 text-red-700 border-red-300"
                              }
                            >
                              {getMotivoLabel(credito.motivo)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(credito.created_at), "dd/MM/yy", { locale: es })}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                  Resolver ▼
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleResolucion(credito, "reembolso_efectivo")}
                                >
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Marcar como Reembolsado
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleResolucion(credito, "reposicion_producto")}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Marcar como Repuesto
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleResolucion(credito, "descuento_oc")}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Aplicado en Nueva OC
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleResolucion(credito, "cancelar")}
                                  className="text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Cancelar Crédito
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Dialog de confirmación */}
      <AlertDialog open={resolucionDialogOpen} onOpenChange={setResolucionDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tipoResolucion === "reembolso_efectivo" && "Solicitar Reembolso / Depósito"}
              {tipoResolucion === "reposicion_producto" && "Confirmar Reposición"}
              {tipoResolucion === "descuento_oc" && "Confirmar Aplicación en OC"}
              {tipoResolucion === "cancelar" && "Cancelar Crédito"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              {selectedCredito && (
                <div className="space-y-4 text-left">
                  {/* Info del crédito */}
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Crédito por:</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(selectedCredito.monto_total)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCredito.cantidad} × {selectedCredito.producto_nombre}
                    </p>
                  </div>

                  {/* Opciones para reembolso */}
                  {tipoResolucion === "reembolso_efectivo" && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">¿El proveedor ya realizó el depósito?</p>
                      <RadioGroup
                        value={modoReembolso}
                        onValueChange={(v) => setModoReembolso(v as "ya_deposito" | "solicitar_deposito")}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="ya_deposito" id="ya_deposito" />
                          <Label htmlFor="ya_deposito" className="flex-1 cursor-pointer">
                            <div className="font-medium">El proveedor YA depositó</div>
                            <div className="text-xs text-muted-foreground">
                              Marcar el crédito como resuelto
                            </div>
                          </Label>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="solicitar_deposito" id="solicitar_deposito" />
                          <Label htmlFor="solicitar_deposito" className="flex-1 cursor-pointer">
                            <div className="font-medium">Solicitar depósito por email</div>
                            <div className="text-xs text-muted-foreground">
                              Enviar datos bancarios al proveedor
                            </div>
                          </Label>
                          <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                      </RadioGroup>

                      {modoReembolso === "solicitar_deposito" && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-sm">
                          <p className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Se enviará un email con:
                          </p>
                          <ul className="mt-2 space-y-1 text-blue-700 dark:text-blue-400 text-xs">
                            <li>• Monto exacto a depositar</li>
                            <li>• Datos bancarios de ALMASA</li>
                            <li>• Instrucción de enviar comprobante a pagos@almasa.com.mx</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mensajes para otros tipos */}
                  {tipoResolucion === "reposicion_producto" && (
                    <p className="text-sm text-muted-foreground">
                      ¿Confirmas que el proveedor repuso {selectedCredito.cantidad} unidades de {selectedCredito.producto_nombre}?
                    </p>
                  )}
                  {tipoResolucion === "descuento_oc" && (
                    <p className="text-sm text-muted-foreground">
                      ¿Confirmas que este crédito fue aplicado como descuento en una nueva OC?
                    </p>
                  )}
                  {tipoResolucion === "cancelar" && (
                    <p className="text-sm text-destructive">
                      ¿Estás seguro de cancelar este crédito? Esta acción no se puede deshacer.
                    </p>
                  )}

                  {/* Notas */}
                  <div>
                    <Label className="text-sm font-medium">Notas (opcional):</Label>
                    <Textarea
                      value={resolucionNotas}
                      onChange={(e) => setResolucionNotas(e.target.value)}
                      placeholder={
                        tipoResolucion === "reembolso_efectivo" && modoReembolso === "ya_deposito"
                          ? "Ej: Referencia de transferencia #12345..."
                          : "Notas adicionales..."
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolverCredito.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarResolucion}
              disabled={resolverCredito.isPending}
              className={tipoResolucion === "cancelar" ? "bg-destructive text-destructive-foreground" : ""}
            >
              {resolverCredito.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {modoReembolso === "solicitar_deposito" ? "Enviando..." : "Procesando..."}
                </>
              ) : (
                <>
                  {tipoResolucion === "reembolso_efectivo" && modoReembolso === "solicitar_deposito" && (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {tipoResolucion === "reembolso_efectivo" && modoReembolso === "solicitar_deposito" 
                    ? "Enviar Solicitud" 
                    : "Confirmar"
                  }
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreditosPendientesPanel;
