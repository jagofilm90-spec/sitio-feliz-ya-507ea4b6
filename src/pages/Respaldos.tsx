/**
 * MÓDULO CRÍTICO: Sistema de Respaldos
 * 
 * Permite exportar datos críticos del ERP a Excel/CSV
 * para respaldo externo manual.
 * 
 * Acceso: Solo Admin
 */

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { ErrorBoundaryModule } from "@/components/ErrorBoundaryModule";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  MapPin,
  Package,
  ShoppingCart,
  Layers,
  Building2,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Shield,
  Loader2,
} from "lucide-react";
import {
  exportToExcel,
  exportToCSV,
  clientesColumns,
  sucursalesColumns,
  productosColumns,
  pedidosColumns,
  lotesColumns,
  proveedoresColumns,
} from "@/utils/exportData";

interface EntityStats {
  clientes: number;
  sucursales: number;
  productos: number;
  pedidos: number;
  lotes: number;
  proveedores: number;
}

interface ExportEntity {
  key: keyof EntityStats;
  label: string;
  icon: React.ElementType;
  description: string;
}

const entities: ExportEntity[] = [
  { key: 'clientes', label: 'Clientes', icon: Users, description: 'Datos de clientes, RFC, crédito' },
  { key: 'sucursales', label: 'Sucursales', icon: MapPin, description: 'Direcciones, zonas, coordenadas' },
  { key: 'productos', label: 'Productos', icon: Package, description: 'Catálogo, precios, stock' },
  { key: 'pedidos', label: 'Pedidos', icon: ShoppingCart, description: 'Historial de ventas' },
  { key: 'lotes', label: 'Inventario (Lotes)', icon: Layers, description: 'Stock por lote, caducidades' },
  { key: 'proveedores', label: 'Proveedores', icon: Building2, description: 'Datos de proveedores' },
];

const RespaldosContent = () => {
  const [stats, setStats] = useState<EntityStats>({
    clientes: 0,
    sucursales: 0,
    productos: 0,
    pedidos: 0,
    lotes: 0,
    proveedores: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [clientesRes, sucursalesRes, productosRes, pedidosRes, lotesRes, proveedoresRes] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('cliente_sucursales').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('productos').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('pedidos').select('id', { count: 'exact', head: true }),
        supabase.from('inventario_lotes').select('id', { count: 'exact', head: true }).gt('cantidad_disponible', 0),
        supabase.from('proveedores').select('id', { count: 'exact', head: true }).eq('activo', true),
      ]);

      setStats({
        clientes: clientesRes.count || 0,
        sucursales: sucursalesRes.count || 0,
        productos: productosRes.count || 0,
        pedidos: pedidosRes.count || 0,
        lotes: lotesRes.count || 0,
        proveedores: proveedoresRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (entity: keyof EntityStats, format: 'excel' | 'csv') => {
    setExporting(`${entity}-${format}`);
    
    try {
      let data: any[] = [];
      let columns: any[] = [];
      let fileName = '';

      switch (entity) {
        case 'clientes':
          const { data: clientesData } = await supabase
            .from('clientes')
            .select('*')
            .eq('activo', true)
            .order('nombre');
          data = clientesData || [];
          columns = clientesColumns;
          fileName = 'clientes';
          break;

        case 'sucursales':
          const { data: sucursalesData } = await supabase
            .from('cliente_sucursales')
            .select(`
              *,
              cliente:clientes(nombre),
              zona:zonas(nombre)
            `)
            .eq('activo', true)
            .order('nombre');
          data = sucursalesData || [];
          columns = sucursalesColumns;
          fileName = 'sucursales';
          break;

        case 'productos':
          const { data: productosData } = await supabase
            .from('productos')
            .select('*')
            .eq('activo', true)
            .order('nombre');
          data = productosData || [];
          columns = productosColumns;
          fileName = 'productos';
          break;

        case 'pedidos':
          const { data: pedidosData } = await supabase
            .from('pedidos')
            .select(`
              *,
              cliente:clientes(nombre),
              sucursal:cliente_sucursales(nombre)
            `)
            .order('fecha_pedido', { ascending: false });
          data = pedidosData || [];
          columns = pedidosColumns;
          fileName = 'pedidos';
          break;

        case 'lotes':
          const { data: lotesData } = await supabase
            .from('inventario_lotes')
            .select(`
              *,
              producto:productos(codigo, nombre),
              bodega:bodegas(nombre)
            `)
            .gt('cantidad_disponible', 0)
            .order('fecha_caducidad');
          data = lotesData || [];
          columns = lotesColumns;
          fileName = 'inventario_lotes';
          break;

        case 'proveedores':
          const { data: proveedoresData } = await supabase
            .from('proveedores')
            .select('*')
            .eq('activo', true)
            .order('nombre');
          data = proveedoresData || [];
          columns = proveedoresColumns;
          fileName = 'proveedores';
          break;
      }

      if (data.length === 0) {
        toast({
          title: "Sin datos",
          description: `No hay datos de ${entity} para exportar`,
          variant: "destructive",
        });
        return;
      }

      if (format === 'excel') {
        exportToExcel(data, fileName, columns, entity.charAt(0).toUpperCase() + entity.slice(1));
      } else {
        exportToCSV(data, fileName, columns);
      }

      toast({
        title: "Exportación exitosa",
        description: `${data.length} registros exportados a ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error de exportación",
        description: "No se pudo exportar los datos",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Respaldos y Exportación</h1>
            <p className="text-muted-foreground">
              Exporta tus datos críticos a Excel o CSV para respaldo externo
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Backups Automáticos Activos</AlertTitle>
          <AlertDescription>
            Lovable Cloud realiza backups automáticos diarios de tu base de datos.
            Utiliza esta página para crear respaldos externos adicionales que puedas
            almacenar en tu computadora o Google Drive.
          </AlertDescription>
        </Alert>

        {/* Export Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map((entity) => {
            const Icon = entity.icon;
            const count = stats[entity.key];
            const isExportingExcel = exporting === `${entity.key}-excel`;
            const isExportingCSV = exporting === `${entity.key}-csv`;

            return (
              <Card key={entity.key} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{entity.label}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {loading ? '...' : count.toLocaleString()}
                    </Badge>
                  </div>
                  <CardDescription>{entity.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleExport(entity.key, 'excel')}
                      disabled={loading || exporting !== null}
                    >
                      {isExportingExcel ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                      )}
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleExport(entity.key, 'csv')}
                      disabled={loading || exporting !== null}
                    >
                      {isExportingCSV ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recommendation */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5" />
              Recomendación de Respaldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Para mayor seguridad, exporta tus datos críticos al menos <strong>una vez por semana</strong>.
              Guarda los archivos en una ubicación segura como Google Drive, OneDrive, o un disco externo.
              Los archivos incluyen la fecha de exportación en el nombre para fácil organización.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

const Respaldos = () => (
  <ErrorBoundaryModule moduleName="Respaldos">
    <RespaldosContent />
  </ErrorBoundaryModule>
);

export default Respaldos;
