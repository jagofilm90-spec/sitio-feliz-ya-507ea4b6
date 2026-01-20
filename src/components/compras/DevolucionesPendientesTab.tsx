import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Package, 
  Search, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Mail,
  Eye,
  FileText
} from "lucide-react";
import { EvidenciasGallery } from "./EvidenciasGallery";
import EnviarEvidenciasProveedorDialog from "./EnviarEvidenciasProveedorDialog";

interface Devolucion {
  id: string;
  cantidad_devuelta: number;
  motivo: string;
  notas: string | null;
  status: string;
  fecha_resolucion: string | null;
  resolucion_notas: string | null;
  created_at: string;
  orden_compra_id: string;
  orden_compra_entrega_id: string | null;
  producto_id: string;
  productos: { nombre: string; codigo: string } | null;
  ordenes_compra: {
    id: string;
    folio: string;
    proveedores: { id: string; nombre: string; email: string | null } | null;
    proveedor_nombre_manual: string | null;
  } | null;
}

const DevolucionesPendientesTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pendiente");
  const [resolverDialogOpen, setResolverDialogOpen] = useState(false);
  const [devolucionSeleccionada, setDevolucionSeleccionada] = useState<Devolucion | null>(null);
  const [resolucionNotas, setResolucionNotas] = useState("");
  const [evidenciasGalleryOpen, setEvidenciasGalleryOpen] = useState(false);
  const [ordenIdEvidencias, setOrdenIdEvidencias] = useState<string>("");
  const [enviarEvidenciasOpen, setEnviarEvidenciasOpen] = useState(false);
  const [devolucionParaEnviar, setDevolucionParaEnviar] = useState<Devolucion | null>(null);

  // Fetch all devoluciones with related data
  const { data: devoluciones = [], isLoading } = useQuery({
    queryKey: ["devoluciones-proveedor", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("devoluciones_proveedor")
        .select(`
          *,
          productos (nombre, codigo),
          ordenes_compra (
            id,
            folio,
            proveedores (id, nombre, email),
            proveedor_nombre_manual
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "todas") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Devolucion[];
    },
  });

  // Fetch evidence counts per devolucion
  const { data: evidenciasCounts = {} } = useQuery({
    queryKey: ["devoluciones-evidencias-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devoluciones_proveedor_evidencias")
        .select("devolucion_id");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(e => {
        counts[e.devolucion_id] = (counts[e.devolucion_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Mutation to resolve devolucion
  const resolverMutation = useMutation({
    mutationFn: async ({ id, notas }: { id: string; notas: string }) => {
      const { error } = await supabase
        .from("devoluciones_proveedor")
        .update({
          status: "resuelta",
          fecha_resolucion: new Date().toISOString(),
          resolucion_notas: notas,
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devoluciones-proveedor"] });
      toast({
        title: "Devolución resuelta",
        description: "La devolución ha sido marcada como resuelta",
      });
      setResolverDialogOpen(false);
      setDevolucionSeleccionada(null);
      setResolucionNotas("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter by search term
  const devolucionesFiltradas = devoluciones.filter(d => {
    const searchLower = searchTerm.toLowerCase();
    const folio = d.ordenes_compra?.folio?.toLowerCase() || "";
    const proveedor = (d.ordenes_compra?.proveedores?.nombre || d.ordenes_compra?.proveedor_nombre_manual || "").toLowerCase();
    const producto = (d.productos?.nombre || "").toLowerCase();
    const codigo = (d.productos?.codigo || "").toLowerCase();
    
    return folio.includes(searchLower) || 
           proveedor.includes(searchLower) || 
           producto.includes(searchLower) ||
           codigo.includes(searchLower);
  });

  const handleVerEvidencias = (devolucion: Devolucion) => {
    setOrdenIdEvidencias(devolucion.orden_compra_id);
    setEvidenciasGalleryOpen(true);
  };

  const handleEnviarEvidencias = (devolucion: Devolucion) => {
    setDevolucionParaEnviar(devolucion);
    setEnviarEvidenciasOpen(true);
  };

  const handleResolver = (devolucion: Devolucion) => {
    setDevolucionSeleccionada(devolucion);
    setResolverDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente":
        return <Badge variant="destructive" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pendiente</Badge>;
      case "resuelta":
        return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Resuelta</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendientesCount = devoluciones.filter(d => d.status === "pendiente").length;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Devoluciones a Proveedores
              {pendientesCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendientesCount} pendientes
                </Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona las devoluciones y comunícate con los proveedores
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio, proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="resuelta">Resueltas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : devolucionesFiltradas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No hay devoluciones {statusFilter === "pendiente" ? "pendientes" : ""}</p>
            <p className="text-sm">Las devoluciones registradas por almacén aparecerán aquí</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>OC / Proveedor</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-center">Evidencias</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devolucionesFiltradas.map((devolucion) => {
                  const proveedorNombre = devolucion.ordenes_compra?.proveedores?.nombre || 
                                          devolucion.ordenes_compra?.proveedor_nombre_manual || 
                                          "Sin proveedor";
                  const proveedorEmail = devolucion.ordenes_compra?.proveedores?.email;
                  const evidenciasCount = evidenciasCounts[devolucion.id] || 0;
                  
                  return (
                    <TableRow key={devolucion.id}>
                      <TableCell className="text-sm">
                        {format(new Date(devolucion.created_at), "dd/MM/yyyy", { locale: es })}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(devolucion.created_at), "HH:mm")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="outline" className="font-mono text-xs">
                            {devolucion.ordenes_compra?.folio || "N/A"}
                          </Badge>
                          <p className="text-sm font-medium mt-1">{proveedorNombre}</p>
                          {proveedorEmail && (
                            <p className="text-xs text-muted-foreground">{proveedorEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{devolucion.productos?.nombre || "Producto"}</p>
                          <p className="text-xs text-muted-foreground">{devolucion.productos?.codigo}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                          {devolucion.cantidad_devuelta} unidades
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm max-w-[200px] truncate" title={devolucion.motivo}>
                          {devolucion.motivo}
                        </p>
                        {devolucion.notas && (
                          <p className="text-xs text-muted-foreground truncate" title={devolucion.notas}>
                            {devolucion.notas}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {evidenciasCount > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerEvidencias(devolucion)}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <Camera className="h-4 w-4 mr-1" />
                            {evidenciasCount}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin fotos</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(devolucion.status)}
                        {devolucion.fecha_resolucion && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(devolucion.fecha_resolucion), "dd/MM/yy")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {proveedorEmail && devolucion.status === "pendiente" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEnviarEvidencias(devolucion)}
                              title="Enviar evidencias al proveedor"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          {devolucion.status === "pendiente" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolver(devolucion)}
                              title="Marcar como resuelta"
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {devolucion.status === "resuelta" && devolucion.resolucion_notas && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDevolucionSeleccionada(devolucion);
                                setResolverDialogOpen(true);
                              }}
                              title="Ver resolución"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog para resolver devolución */}
      <Dialog open={resolverDialogOpen} onOpenChange={setResolverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {devolucionSeleccionada?.status === "resuelta" ? (
                <>
                  <Eye className="h-5 w-5 text-green-600" />
                  Resolución de Devolución
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Marcar Devolución como Resuelta
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {devolucionSeleccionada?.ordenes_compra?.folio} - {devolucionSeleccionada?.productos?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
              <p><strong>Cantidad devuelta:</strong> {devolucionSeleccionada?.cantidad_devuelta} unidades</p>
              <p><strong>Motivo:</strong> {devolucionSeleccionada?.motivo}</p>
              {devolucionSeleccionada?.notas && (
                <p><strong>Notas:</strong> {devolucionSeleccionada.notas}</p>
              )}
            </div>

            {devolucionSeleccionada?.status === "resuelta" ? (
              <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Notas de resolución:</p>
                <p className="text-sm">{devolucionSeleccionada?.resolucion_notas || "Sin notas"}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Resuelta el {devolucionSeleccionada?.fecha_resolucion && 
                    format(new Date(devolucionSeleccionada.fecha_resolucion), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="resolucion-notas">Notas de resolución</Label>
                <Textarea
                  id="resolucion-notas"
                  value={resolucionNotas}
                  onChange={(e) => setResolucionNotas(e.target.value)}
                  placeholder="Ej: Proveedor envió reposición, se aplicó nota de crédito, etc."
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolverDialogOpen(false)}>
              {devolucionSeleccionada?.status === "resuelta" ? "Cerrar" : "Cancelar"}
            </Button>
            {devolucionSeleccionada?.status !== "resuelta" && (
              <Button
                onClick={() => {
                  if (devolucionSeleccionada) {
                    resolverMutation.mutate({
                      id: devolucionSeleccionada.id,
                      notas: resolucionNotas,
                    });
                  }
                }}
                disabled={resolverMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {resolverMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Marcar como Resuelta
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Galería de evidencias */}
      <EvidenciasGallery
        ordenCompraId={ordenIdEvidencias}
        open={evidenciasGalleryOpen}
        onOpenChange={setEvidenciasGalleryOpen}
      />

      {/* Dialog para enviar evidencias al proveedor */}
      {devolucionParaEnviar && (
        <EnviarEvidenciasProveedorDialog
          open={enviarEvidenciasOpen}
          onOpenChange={setEnviarEvidenciasOpen}
          devolucion={devolucionParaEnviar}
        />
      )}
    </Card>
  );
};

export default DevolucionesPendientesTab;
