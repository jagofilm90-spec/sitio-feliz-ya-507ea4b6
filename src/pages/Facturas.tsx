/**
 * ==========================================================
 * 🚨 MÓDULO CRÍTICO: FACTURACIÓN CFDI 4.0
 * ==========================================================
 * 
 * Este módulo maneja operaciones fiscales y legales.
 * Integración con Facturama para timbrado CFDI.
 * 
 * ⚠️ NO MODIFICAR sin validar en preview primero.
 * ⚠️ Cualquier error aquí tiene implicaciones legales/fiscales.
 * 
 * Última actualización: 2025-12-11
 * ==========================================================
 */

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBoundaryModule } from "@/components/ErrorBoundaryModule";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Search, Eye, MoreHorizontal, FileText, Download, 
  XCircle, CheckCircle, AlertCircle, Loader2, FileDown, Package 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NuevaFacturaDirectaDialog } from "@/components/facturas/NuevaFacturaDirectaDialog";
import { SolicitudesAlmacenTab } from "@/components/facturas/SolicitudesAlmacenTab";
import { useSolicitudesVenta } from "@/hooks/useSolicitudesVenta";

const FacturasContent = () => {
  const [facturas, setFacturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [timbrando, setTimbrando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [facturaToCancel, setFacturaToCancel] = useState<any>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("02");
  const [nuevaFacturaOpen, setNuevaFacturaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("facturas");
  const { toast } = useToast();
  const { pendingCount } = useSolicitudesVenta();

  useEffect(() => {
    loadFacturas();
  }, []);

  const loadFacturas = async () => {
    try {
      const { data, error } = await supabase
        .from("facturas")
        .select(`
          *,
          clientes (nombre, rfc),
          pedidos (folio)
        `)
        .order("fecha_emision", { ascending: false });

      if (error) throw error;
      setFacturas(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las facturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimbrar = async (factura: any) => {
    if (!factura.clientes?.rfc) {
      toast({
        title: "RFC requerido",
        description: "El cliente debe tener RFC configurado para timbrar",
        variant: "destructive",
      });
      return;
    }

    setTimbrando(factura.id);
    try {
      const { data, error } = await supabase.functions.invoke('timbrar-cfdi', {
        body: { factura_id: factura.id }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "CFDI Timbrado",
          description: `UUID: ${data.uuid}`,
        });
        loadFacturas();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error al timbrar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTimbrando(null);
    }
  };

  const openCancelDialog = (factura: any) => {
    setFacturaToCancel(factura);
    setMotivoCancelacion("02");
    setCancelDialogOpen(true);
  };

  const handleCancelar = async () => {
    if (!facturaToCancel) return;

    setCancelando(facturaToCancel.id);
    try {
      const { data, error } = await supabase.functions.invoke('cancelar-cfdi', {
        body: { 
          factura_id: facturaToCancel.id,
          motivo: motivoCancelacion
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "CFDI Cancelado",
          description: "La factura ha sido cancelada ante el SAT",
        });
        setCancelDialogOpen(false);
        loadFacturas();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error al cancelar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancelando(null);
    }
  };

  const handleDescargar = async (factura: any, formato: 'pdf' | 'xml') => {
    try {
      const { data, error } = await supabase.functions.invoke('descargar-cfdi', {
        body: { factura_id: factura.id, formato }
      });

      if (error) throw error;

      if (data.success && data.content) {
        // Decodificar base64 y descargar
        const byteCharacters = atob(data.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.contentType });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error(data.error || 'Error descargando archivo');
      }
    } catch (error: any) {
      toast({
        title: "Error al descargar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getCfdiStatusBadge = (factura: any) => {
    const estado = factura.cfdi_estado;
    
    if (estado === 'timbrada') {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Timbrada</Badge>;
    } else if (estado === 'cancelada') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Cancelada</Badge>;
    } else if (estado === 'error') {
      return (
        <Badge variant="destructive" title={factura.cfdi_error}>
          <AlertCircle className="h-3 w-3 mr-1" /> Error
        </Badge>
      );
    }
    return <Badge variant="outline">Sin timbrar</Badge>;
  };

  const getPaymentStatusBadge = (factura: any) => {
    return (
      <Badge variant={factura.pagada ? "default" : "secondary"}>
        {factura.pagada ? "Pagada" : "Pendiente"}
      </Badge>
    );
  };

  const filteredFacturas = facturas.filter(
    (f) =>
      f.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.clientes?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cfdi_uuid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Facturación CFDI 4.0</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Timbrado, descarga y cancelación de facturas</p>
          </div>
          <Button onClick={() => setNuevaFacturaOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Factura
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
            <TabsList className="inline-flex w-max gap-1">
              <TabsTrigger value="facturas" className="flex items-center gap-1.5 px-2 sm:px-3">
                <FileText className="h-4 w-4" />
                Facturas
              </TabsTrigger>
              <TabsTrigger value="solicitudes" className="relative flex items-center gap-1.5 px-2 sm:px-3">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Solicitudes Almacén</span>
                <span className="sm:hidden">Solic</span>
                {pendingCount > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-yellow-500"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="facturas" className="space-y-4 mt-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por folio, cliente o UUID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>RFC</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>CFDI</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredFacturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No hay facturas registradas
                  </TableCell>
                </TableRow>
              ) : (
                filteredFacturas.map((factura) => (
                  <TableRow key={factura.id}>
                    <TableCell className="font-medium">{factura.folio}</TableCell>
                    <TableCell>{factura.clientes?.nombre || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{factura.clientes?.rfc || "—"}</TableCell>
                    <TableCell>{factura.pedidos?.folio || "—"}</TableCell>
                    <TableCell>
                      {new Date(factura.fecha_emision).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(factura.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getCfdiStatusBadge(factura)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(factura)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            {timbrando === factura.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalle
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {factura.cfdi_estado !== 'timbrada' && factura.cfdi_estado !== 'cancelada' && (
                            <DropdownMenuItem 
                              onClick={() => handleTimbrar(factura)}
                              disabled={timbrando === factura.id}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Timbrar CFDI
                            </DropdownMenuItem>
                          )}
                          
                          {factura.cfdi_estado === 'timbrada' && (
                            <>
                              <DropdownMenuItem onClick={() => handleDescargar(factura, 'pdf')}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDescargar(factura, 'xml')}>
                                <Download className="h-4 w-4 mr-2" />
                                Descargar XML
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openCancelDialog(factura)}
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar CFDI
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {factura.cfdi_estado === 'error' && (
                            <DropdownMenuItem 
                              onClick={() => handleTimbrar(factura)}
                              disabled={timbrando === factura.id}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Reintentar timbrado
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* UUID mostrado debajo si existe */}
        {activeTab === 'facturas' && filteredFacturas.some(f => f.cfdi_uuid) && (
          <div className="text-xs text-muted-foreground">
            Tip: Puedes buscar por UUID del CFDI
          </div>
        )}
          </TabsContent>

          <TabsContent value="solicitudes" className="mt-4">
            <SolicitudesAlmacenTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de nueva factura directa */}
      <NuevaFacturaDirectaDialog
        open={nuevaFacturaOpen}
        onOpenChange={setNuevaFacturaOpen}
        onSuccess={loadFacturas}
      />

      {/* Dialog de cancelación */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar CFDI</DialogTitle>
            <DialogDescription>
              Esta acción cancelará la factura ante el SAT. Selecciona el motivo de cancelación.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Factura</Label>
              <p className="text-sm font-medium">{facturaToCancel?.folio}</p>
            </div>
            
            <div className="space-y-2">
              <Label>UUID</Label>
              <p className="text-sm font-mono">{facturaToCancel?.cfdi_uuid}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo de cancelación</Label>
              <Select value={motivoCancelacion} onValueChange={setMotivoCancelacion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">01 - Con relación (sustituye a otro)</SelectItem>
                  <SelectItem value="02">02 - Sin relación (error en datos)</SelectItem>
                  <SelectItem value="03">03 - No se llevó a cabo la operación</SelectItem>
                  <SelectItem value="04">04 - Operación nominativa en factura global</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelar}
              disabled={cancelando === facturaToCancel?.id}
            >
              {cancelando === facturaToCancel?.id ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelando...</>
              ) : (
                "Confirmar cancelación"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

/**
 * Componente principal envuelto en ErrorBoundary
 */
const Facturas = () => {
  return (
    <ErrorBoundaryModule moduleName="Facturación">
      <FacturasContent />
    </ErrorBoundaryModule>
  );
};

export default Facturas;
