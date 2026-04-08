import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { ClientesMapaTab } from "@/components/clientes/ClientesMapaTab";
import { ClientesStatsBar } from "@/components/clientes/ClientesStatsBar";
import { ClientesListaJerarquica } from "@/components/clientes/ClientesListaJerarquica";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, MapPin, BarChart3, ClipboardList, FileSpreadsheet, Users, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AuditoriaFiscalSheet } from "@/components/clientes/AuditoriaFiscalSheet";
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
import ClienteHistorialAnalytics from "@/components/analytics/ClienteHistorialAnalytics";
import { ClienteProductosDialog } from "@/components/clientes/ClienteProductosDialog";
import { useUserRoles } from "@/hooks/useUserRoles";
import { ImportarCatalogoAspelDialog } from "@/components/clientes/ImportarCatalogoAspelDialog";
import { AgruparClientesDialog } from "@/components/clientes/AgruparClientesDialog";
import { DetectarGruposDialog } from "@/components/clientes/DetectarGruposDialog";
import { ImportarSucursalesExcelDialog } from "@/components/clientes/ImportarSucursalesExcelDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Vendedor {
  user_id: string;
  nombre: string;
  nombre_corto: string;
}

const Clientes = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState<"lista" | "mapa">("lista");
  const [searchTerm, setSearchTerm] = useState("");
  const [historialDialogOpen, setHistorialDialogOpen] = useState(false);
  const [selectedClienteForHistorial, setSelectedClienteForHistorial] = useState<{ id: string; nombre: string } | null>(null);
  const [productosDialogOpen, setProductosDialogOpen] = useState(false);
  const [selectedClienteForProductos, setSelectedClienteForProductos] = useState<{ id: string; nombre: string } | null>(null);
  const [auditoriaSheetOpen, setAuditoriaSheetOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [agruparDialogOpen, setAgruparDialogOpen] = useState(false);
  const [detectarGruposDialogOpen, setDetectarGruposDialogOpen] = useState(false);
  const [importSucursalesDialogOpen, setImportSucursalesDialogOpen] = useState(false);
  const [sucursalesConRfcCount, setSucursalesConRfcCount] = useState(0);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [filterActivo, setFilterActivo] = useState<"activos" | "inactivos" | "todos">("activos");
  const { toast } = useToast();
  const { isAdmin } = useUserRoles();

  useEffect(() => {
    loadClientes();
    loadSucursalesConRfcCount();
    loadVendedores();
  }, []);

  const loadVendedores = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name
          )
        `)
        .eq("role", "vendedor");

      if (error) throw error;
      const mapped: Vendedor[] = (data || [])
        .filter((d: any) => d.profiles?.full_name)
        .map((d: any) => ({
          user_id: d.user_id,
          nombre: d.profiles.full_name,
          nombre_corto: d.profiles.full_name.split(" ")[0],
        }));
      setVendedores(mapped);
    } catch (error) {
      console.error("Error loading vendedores:", error);
    }
  };

  const loadSucursalesConRfcCount = async () => {
    try {
      const { count, error } = await supabase
        .from("cliente_sucursales")
        .select("*", { count: "exact", head: true })
        .not("rfc", "is", null)
        .neq("rfc", "")
        .eq("activo", true)
        .or("razon_social.is.null,razon_social.eq.,direccion_fiscal.is.null,direccion_fiscal.eq.,email_facturacion.is.null,email_facturacion.eq.");

      if (!error) {
        setSucursalesConRfcCount(count || 0);
      }
    } catch (error) {
      console.error("Error counting sucursales:", error);
    }
  };

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select(`
          *,
          zona:zona_id (id, nombre),
          cliente_sucursales (count),
          cliente_productos_frecuentes (count),
          grupo_padre:grupo_cliente_id (id, nombre, codigo)
        `)
        .order("nombre");

      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from("clientes")
        .update({ activo: false })
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast({ title: `"${deleteTarget.nombre}" desactivado` });
      loadClientes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleReactivar = async (cliente: any) => {
    try {
      const { error } = await supabase
        .from("clientes")
        .update({ activo: true })
        .eq("id", cliente.id);

      if (error) throw error;
      toast({ title: `"${cliente.nombre}" reactivado` });
      loadClientes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getCreditLabel = (term: string) => {
    const labels: Record<string, string> = {
      contado: "Contado",
      "8_dias": "8 días",
      "15_dias": "15 días",
      "30_dias": "30 días",
    };
    return labels[term] || term;
  };

  const getVendedorName = (vendedor_asignado: string | null) => {
    if (!vendedor_asignado) return null;
    const vendedor = vendedores.find(v => v.user_id === vendedor_asignado);
    return vendedor?.nombre_corto || null;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header - responsive para móvil */}
        {isMobile ? (
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold">Clientes</h1>
                <p className="text-xs text-muted-foreground">Gestión de clientes</p>
              </div>
              <Button size="sm" onClick={() => navigate("/clientes/nuevo")}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetectarGruposDialogOpen(true)}
              >
                <Search className="h-4 w-4 mr-1" />
                Detectar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuditoriaSheetOpen(true)}
              >
                <ClipboardList className="h-4 w-4 mr-1" />
                Auditoría
                {sucursalesConRfcCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {sucursalesConRfcCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Clientes</h1>
              <p className="text-muted-foreground">Gestión de clientes y créditos</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDetectarGruposDialogOpen(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Detectar Grupos
              </Button>
              <Button
                variant="outline"
                onClick={() => setAgruparDialogOpen(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Agrupar
              </Button>
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar ASPEL
              </Button>
              <Button
                variant="outline"
                onClick={() => setImportSucursalesDialogOpen(true)}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Importar Sucursales
              </Button>
              <Button
                variant="outline"
                onClick={() => setAuditoriaSheetOpen(true)}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Auditoría Fiscal
                {sucursalesConRfcCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {sucursalesConRfcCount}
                  </Badge>
                )}
              </Button>
              <Button onClick={() => navigate("/clientes/nuevo")}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </div>
          </div>
        )}

        {/* Vista selector: Lista | Mapa */}
        <div className="flex gap-2 border-b pb-3 flex-wrap">
          <Button variant={vistaActiva === "lista" ? "default" : "outline"} size="sm" onClick={() => setVistaActiva("lista")} className="cursor-pointer">
            Lista
          </Button>
          <Button variant={vistaActiva === "mapa" ? "default" : "outline"} size="sm" onClick={() => setVistaActiva("mapa")} className="cursor-pointer">
            <MapPin className="h-4 w-4 mr-1.5" />
            Mapa
          </Button>
          <div className="ml-auto flex gap-1 bg-muted rounded-md p-0.5">
            {(["activos", "inactivos", "todos"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFilterActivo(opt)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize",
                  filterActivo === opt ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {vistaActiva === "mapa" ? (
          <ClientesMapaTab />
        ) : (
        <>
          <ClientesStatsBar />
          <ClientesListaJerarquica
            clientes={clientes}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onEdit={(c) => navigate(`/clientes/${c.id}`)}
            onDelete={(c) => setDeleteTarget(c)}
            onReactivar={handleReactivar}
            onViewSucursales={(c) => navigate(`/clientes/${c.id}`)}
            onViewHistorial={(c) => {
              setSelectedClienteForHistorial(c);
              setHistorialDialogOpen(true);
            }}
            onViewProductos={(c) => {
              setSelectedClienteForProductos(c);
              setProductosDialogOpen(true);
            }}
            getVendedorName={getVendedorName}
            getCreditLabel={getCreditLabel}
          />
        </>
        )}
      </div>

      <Dialog open={historialDialogOpen} onOpenChange={setHistorialDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Historial de {selectedClienteForHistorial?.nombre}
            </DialogTitle>
          </DialogHeader>
          {selectedClienteForHistorial && (
            <ClienteHistorialAnalytics
              clienteId={selectedClienteForHistorial.id}
              clienteNombre={selectedClienteForHistorial.nombre}
            />
          )}
        </DialogContent>
      </Dialog>

      <ClienteProductosDialog
        open={productosDialogOpen}
        onOpenChange={setProductosDialogOpen}
        cliente={selectedClienteForProductos}
      />

      <AuditoriaFiscalSheet
        open={auditoriaSheetOpen}
        onOpenChange={(open) => {
          setAuditoriaSheetOpen(open);
          if (!open) loadSucursalesConRfcCount();
        }}
      />

      <ImportarCatalogoAspelDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={loadClientes}
      />

      <AgruparClientesDialog
        open={agruparDialogOpen}
        onOpenChange={setAgruparDialogOpen}
        clientes={clientes.map(c => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          rfc: c.rfc,
          direccion: c.direccion,
          telefono: c.telefono,
          grupo_cliente_id: c.grupo_cliente_id,
          es_grupo: c.es_grupo || false,
        }))}
        onSuccess={loadClientes}
      />

      <DetectarGruposDialog
        open={detectarGruposDialogOpen}
        onOpenChange={setDetectarGruposDialogOpen}
        onSuccess={loadClientes}
      />

      <ImportarSucursalesExcelDialog
        open={importSucursalesDialogOpen}
        onOpenChange={setImportSucursalesDialogOpen}
        clientes={clientes.map(c => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          rfc: c.rfc,
          razon_social: c.razon_social,
          direccion: c.direccion,
          es_grupo: c.es_grupo || false,
          activo: c.activo,
        }))}
        onSuccess={loadClientes}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Desactivar "{deleteTarget?.nombre}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              El cliente dejará de aparecer en ventas pero se conservará su historial de pedidos y pagos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={confirmDelete}
            >
              Sí, desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Clientes;
