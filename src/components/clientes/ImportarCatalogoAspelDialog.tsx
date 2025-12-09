import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Filter,
  Loader2,
  Building2,
  MapPin,
  BarChart3,
  RefreshCw,
  ShieldCheck,
  Eye,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  parseAspelExcel,
  detectarDuplicados,
  ClienteImportado,
  ClienteExistente,
  generarReporteCalidad,
  obtenerMuestraAleatoria,
  ReporteCalidad,
  ClienteConAnomalias,
} from "@/utils/aspelImporter";

interface ImportarCatalogoAspelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

type ImportStep = "upload" | "validation" | "preview" | "importing" | "complete";

export function ImportarCatalogoAspelDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportarCatalogoAspelDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<ImportStep>("upload");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Datos parseados
  const [clientesParsed, setClientesParsed] = useState<ClienteImportado[]>([]);
  const [erroresParseo, setErroresParseo] = useState<string[]>([]);

  // Filtros
  const [filtroSoloActivos, setFiltroSoloActivos] = useState(true);
  const [filtroActividadReciente, setFiltroActividadReciente] = useState(true);
  const [filtroExcluirMostrador, setFiltroExcluirMostrador] = useState(true);
  const [omitirDuplicados, setOmitirDuplicados] = useState(true);

  // Validación pre-importación
  const [reporteCalidad, setReporteCalidad] = useState<ReporteCalidad | null>(null);
  const [muestraAleatoria, setMuestraAleatoria] = useState<ClienteConAnomalias[]>([]);
  const [validacionRevisada, setValidacionRevisada] = useState(false);

  // Progreso de importación
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    importados: number;
    omitidos: number;
    errores: number;
  }>({ importados: 0, omitidos: 0, errores: 0 });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // Parsear Excel de ASPEL
      const resultado = parseAspelExcel(workbook);
      setErroresParseo(resultado.errores);

      // Obtener clientes existentes CON conteo de sucursales para detectar grupos
      const { data: existentes } = await supabase
        .from("clientes")
        .select(`
          id, 
          codigo, 
          nombre, 
          rfc,
          cliente_sucursales(count)
        `);

      const clientesExistentes: ClienteExistente[] = (existentes || []).map(
        (c: any) => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          rfc: c.rfc,
          cantidadSucursales: c.cliente_sucursales?.[0]?.count || 0,
        })
      );

      // Detectar duplicados (ahora incluye grupos con sucursales)
      const clientesConDuplicados = detectarDuplicados(
        resultado.clientes,
        clientesExistentes
      );

      setClientesParsed(clientesConDuplicados);
      
      // Generar reporte de calidad y muestra aleatoria
      const reporte = generarReporteCalidad(clientesConDuplicados);
      const muestra = obtenerMuestraAleatoria(clientesConDuplicados, 15);
      setReporteCalidad(reporte);
      setMuestraAleatoria(muestra);
      setValidacionRevisada(false);
      
      setStep("validation");

      toast({
        title: "Archivo procesado",
        description: `Se detectaron ${resultado.totalDetectados} clientes. Revisa la validación.`,
      });
    } catch (error: any) {
      console.error("Error processing file:", error);
      toast({
        title: "Error al procesar archivo",
        description: error.message || "No se pudo leer el archivo Excel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls") ||
        file.name.endsWith(".csv")
      ) {
        processFile(file);
      } else {
        toast({
          title: "Formato no soportado",
          description: "Por favor sube un archivo Excel (.xlsx, .xls) o CSV",
          variant: "destructive",
        });
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  // Aplicar filtros
  const clientesFiltrados = clientesParsed.filter((c) => {
    if (filtroSoloActivos && !c.activo) return false;
    if (filtroActividadReciente && !c.tieneActividadReciente) return false;
    if (filtroExcluirMostrador && c.codigo === "0000") return false;
    if (omitirDuplicados && c.esDuplicado) return false;
    return true;
  });

  const duplicados = clientesParsed.filter((c) => c.esDuplicado);
  const gruposConSucursales = duplicados.filter((c) => c.esGrupoConSucursales);
  const inactivos = clientesParsed.filter((c) => !c.activo);

  const handleImport = async () => {
    if (clientesFiltrados.length === 0) {
      toast({
        title: "Sin clientes para importar",
        description: "Ajusta los filtros para incluir clientes",
        variant: "destructive",
      });
      return;
    }

    setStep("importing");
    setImportProgress(0);

    let importados = 0;
    let omitidos = 0;
    let errores = 0;

    const batchSize = 50;
    const totalBatches = Math.ceil(clientesFiltrados.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const batch = clientesFiltrados.slice(
        i * batchSize,
        (i + 1) * batchSize
      );

      const clientesToInsert = batch.map((c) => ({
        codigo: c.codigo,
        nombre: c.nombre,
        razon_social: c.razon_social || null,
        rfc: c.rfc,
        direccion: c.direccion,
        tipo_vialidad: c.tipo_vialidad,
        nombre_vialidad: c.nombre_vialidad,
        numero_exterior: c.numero_exterior,
        numero_interior: c.numero_interior,
        nombre_colonia: c.nombre_colonia,
        codigo_postal: c.codigo_postal,
        telefono: c.telefono,
        termino_credito: c.termino_credito,
        limite_credito: c.limite_credito,
        activo: c.activo,
        preferencia_facturacion: "variable" as const,
        prioridad_entrega_default: "flexible" as const,
      }));

      try {
        const { data, error } = await supabase
          .from("clientes")
          .upsert(clientesToInsert, {
            onConflict: "codigo",
            ignoreDuplicates: true,
          })
          .select("id");

        if (error) {
          console.error("Batch error:", error);
          errores += batch.length;
        } else {
          importados += data?.length || 0;
          omitidos += batch.length - (data?.length || 0);
        }
      } catch (err) {
        console.error("Batch exception:", err);
        errores += batch.length;
      }

      setImportProgress(Math.round(((i + 1) / totalBatches) * 100));
    }

    setImportResults({ importados, omitidos, errores });
    setStep("complete");
  };

  const handleClose = () => {
    setStep("upload");
    setClientesParsed([]);
    setErroresParseo([]);
    setImportProgress(0);
    setImportResults({ importados: 0, omitidos: 0, errores: 0 });
    setReporteCalidad(null);
    setMuestraAleatoria([]);
    setValidacionRevisada(false);
    onOpenChange(false);

    if (step === "complete" && importResults.importados > 0) {
      onImportComplete();
    }
  };

  const regenerarMuestra = () => {
    const muestra = obtenerMuestraAleatoria(clientesParsed, 15);
    setMuestraAleatoria(muestra);
  };

  const getCalidadBadge = (calidad: 'completo' | 'parcial' | 'incompleto') => {
    switch (calidad) {
      case 'completo':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">✓ Completo</Badge>;
      case 'parcial':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">⚠ Parcial</Badge>;
      case 'incompleto':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">✗ Incompleto</Badge>;
    }
  };

  const getPorcentajeColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-red-600';
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

  const formatDireccionPreview = (c: ClienteImportado) => {
    const parts: string[] = [];
    if (c.tipo_vialidad) parts.push(c.tipo_vialidad);
    if (c.nombre_vialidad) parts.push(c.nombre_vialidad);
    if (c.numero_exterior) parts.push(`#${c.numero_exterior}`);
    if (c.numero_interior) parts.push(`Int. ${c.numero_interior}`);
    if (c.nombre_colonia) parts.push(`Col. ${c.nombre_colonia}`);
    if (c.codigo_postal) parts.push(`C.P. ${c.codigo_postal}`);
    return parts.join(' ') || c.direccion || '-';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Catálogo ASPEL
          </DialogTitle>
        <DialogDescription>
            {step === "upload" && "Sube el archivo Excel del catálogo de clientes de ASPEL SAE"}
            {step === "validation" && "Revisa la calidad del parseo antes de continuar"}
            {step === "preview" && "Revisa y filtra los clientes antes de importar"}
            {step === "importing" && "Importando clientes..."}
            {step === "complete" && "Importación completada"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Procesando archivo...</p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  Arrastra el archivo Excel aquí
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  o haz clic para seleccionar
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  id="aspel-file-input"
                  onChange={handleFileInput}
                />
                <Button asChild variant="outline">
                  <label htmlFor="aspel-file-input" className="cursor-pointer">
                    Seleccionar archivo
                  </label>
                </Button>
              </>
            )}
          </div>
        )}

        {step === "validation" && reporteCalidad && (
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Resumen de Calidad */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Calidad del Parseo de Direcciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <div className={`text-lg font-bold ${getPorcentajeColor(reporteCalidad.porcentajes.rfc)}`}>
                      {reporteCalidad.porcentajes.rfc}%
                    </div>
                    <div className="text-xs text-muted-foreground">RFC válido</div>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <div className={`text-lg font-bold ${getPorcentajeColor(reporteCalidad.porcentajes.cp)}`}>
                      {reporteCalidad.porcentajes.cp}%
                    </div>
                    <div className="text-xs text-muted-foreground">C.P.</div>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <div className={`text-lg font-bold ${getPorcentajeColor(reporteCalidad.porcentajes.vialidad)}`}>
                      {reporteCalidad.porcentajes.vialidad}%
                    </div>
                    <div className="text-xs text-muted-foreground">Vialidad</div>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <div className={`text-lg font-bold ${getPorcentajeColor(reporteCalidad.porcentajes.numExt)}`}>
                      {reporteCalidad.porcentajes.numExt}%
                    </div>
                    <div className="text-xs text-muted-foreground">No. Ext</div>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <div className={`text-lg font-bold ${getPorcentajeColor(reporteCalidad.porcentajes.colonia)}`}>
                      {reporteCalidad.porcentajes.colonia}%
                    </div>
                    <div className="text-xs text-muted-foreground">Colonia</div>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <div className={`text-lg font-bold ${getPorcentajeColor(reporteCalidad.porcentajes.telefono)}`}>
                      {reporteCalidad.porcentajes.telefono}%
                    </div>
                    <div className="text-xs text-muted-foreground">Teléfono</div>
                  </div>
                </div>
                
                {reporteCalidad.direccionesNoParseables > 0 && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-700">
                      {reporteCalidad.direccionesNoParseables} direcciones no se pudieron parsear
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Muestra Aleatoria */}
            <div className="flex-1 min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Muestra Aleatoria ({muestraAleatoria.length} registros)
                </h4>
                <Button variant="outline" size="sm" onClick={regenerarMuestra} className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Nueva muestra
                </Button>
              </div>
              
              <ScrollArea className="h-[200px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Código</TableHead>
                      <TableHead className="w-32">Nombre</TableHead>
                      <TableHead>Dirección Original</TableHead>
                      <TableHead>Campos Parseados</TableHead>
                      <TableHead className="w-24">Calidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {muestraAleatoria.map((c, idx) => (
                      <TableRow key={`muestra-${c.codigo}-${idx}`}>
                        <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                        <TableCell className="text-xs truncate max-w-[120px]">{c.nombre}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {c.direccion || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="space-y-0.5">
                            {c.nombre_vialidad && <span className="block">{c.tipo_vialidad} {c.nombre_vialidad}</span>}
                            {c.numero_exterior && <span className="block">#{c.numero_exterior}</span>}
                            {c.nombre_colonia && <span className="block text-muted-foreground">Col. {c.nombre_colonia}</span>}
                            {c.codigo_postal && <span className="block text-muted-foreground">C.P. {c.codigo_postal}</span>}
                            {!c.nombre_vialidad && !c.numero_exterior && !c.nombre_colonia && (
                              <span className="text-red-500">No parseado</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getCalidadBadge(c.calidadParseo)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Anomalías Detectadas */}
            {reporteCalidad.anomalias.length > 0 && (
              <Card className="border-yellow-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
                    <AlertTriangle className="h-4 w-4" />
                    Anomalías Detectadas ({reporteCalidad.anomalias.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[100px]">
                    <div className="space-y-1">
                      {reporteCalidad.anomalias.slice(0, 20).map((c, idx) => (
                        <div key={`anomalia-${c.codigo}-${idx}`} className="flex items-center gap-2 text-xs">
                          <span className="font-mono">{c.codigo}</span>
                          <span className="truncate flex-1">{c.nombre}</span>
                          <div className="flex gap-1">
                            {c.anomalias.map((a, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-700">
                                {a}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      {reporteCalidad.anomalias.length > 20 && (
                        <p className="text-muted-foreground text-xs">
                          ... y {reporteCalidad.anomalias.length - 20} más
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Confirmación */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Checkbox 
                id="validacion-revisada" 
                checked={validacionRevisada}
                onCheckedChange={(v) => setValidacionRevisada(!!v)}
              />
              <Label htmlFor="validacion-revisada" className="text-sm cursor-pointer">
                He revisado la calidad del parseo y entiendo que algunos campos pueden requerir corrección manual
              </Label>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={() => setStep("preview")} 
                disabled={!validacionRevisada}
                className="gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                Continuar a Filtros
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <>
            {/* Estadísticas */}
            <div className="grid grid-cols-5 gap-3 mb-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{clientesParsed.length}</div>
                <div className="text-xs text-muted-foreground">Total detectados</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {clientesFiltrados.length}
                </div>
                <div className="text-xs text-muted-foreground">A importar</div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {duplicados.length}
                </div>
                <div className="text-xs text-muted-foreground">Duplicados</div>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {gruposConSucursales.length}
                </div>
                <div className="text-xs text-muted-foreground">Grupos</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {inactivos.length}
                </div>
                <div className="text-xs text-muted-foreground">Inactivos</div>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/30 rounded-lg mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filtro-activos"
                  checked={filtroSoloActivos}
                  onCheckedChange={(v) => setFiltroSoloActivos(!!v)}
                />
                <Label htmlFor="filtro-activos" className="text-sm cursor-pointer">
                  Solo activos
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filtro-actividad"
                  checked={filtroActividadReciente}
                  onCheckedChange={(v) => setFiltroActividadReciente(!!v)}
                />
                <Label htmlFor="filtro-actividad" className="text-sm cursor-pointer">
                  Actividad últimos 12 meses
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filtro-mostrador"
                  checked={filtroExcluirMostrador}
                  onCheckedChange={(v) => setFiltroExcluirMostrador(!!v)}
                />
                <Label htmlFor="filtro-mostrador" className="text-sm cursor-pointer">
                  Excluir mostrador
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="omitir-duplicados"
                  checked={omitirDuplicados}
                  onCheckedChange={(v) => setOmitirDuplicados(!!v)}
                />
                <Label htmlFor="omitir-duplicados" className="text-sm cursor-pointer">
                  Omitir duplicados
                </Label>
              </div>
            </div>

            {/* Tabs con tabla de clientes */}
            <Tabs defaultValue="importar" className="flex-1 min-h-0">
              <TabsList>
                <TabsTrigger value="importar" className="gap-2">
                  <Users className="h-4 w-4" />
                  A importar ({clientesFiltrados.length})
                </TabsTrigger>
                <TabsTrigger value="duplicados" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Duplicados ({duplicados.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="importar" className="flex-1 mt-4">
                <ScrollArea className="h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Código</TableHead>
                        <TableHead className="w-[200px]">Nombre</TableHead>
                        <TableHead className="w-32">RFC</TableHead>
                        <TableHead>Dirección Parseada</TableHead>
                        <TableHead className="w-24">Crédito</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientesFiltrados.slice(0, 100).map((cliente, idx) => (
                        <TableRow key={`${cliente.codigo}-${idx}`}>
                          <TableCell className="font-mono text-xs">
                            {cliente.codigo}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {cliente.nombre}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {cliente.rfc || "-"}
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[300px] truncate">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    {formatDireccionPreview(cliente)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-sm">
                                  <div className="text-xs space-y-1">
                                    <p><strong>Original:</strong> {cliente.direccion || '-'}</p>
                                    <div className="border-t pt-1 mt-1">
                                      {cliente.tipo_vialidad && <p><strong>Tipo:</strong> {cliente.tipo_vialidad}</p>}
                                      {cliente.nombre_vialidad && <p><strong>Vialidad:</strong> {cliente.nombre_vialidad}</p>}
                                      {cliente.numero_exterior && <p><strong>No. Ext:</strong> {cliente.numero_exterior}</p>}
                                      {cliente.numero_interior && <p><strong>No. Int:</strong> {cliente.numero_interior}</p>}
                                      {cliente.nombre_colonia && <p><strong>Colonia:</strong> {cliente.nombre_colonia}</p>}
                                      {cliente.codigo_postal && <p><strong>C.P.:</strong> {cliente.codigo_postal}</p>}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getCreditLabel(cliente.termino_credito)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {clientesFiltrados.length > 100 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            ... y {clientesFiltrados.length - 100} más
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="duplicados" className="flex-1 mt-4">
                <ScrollArea className="h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Código</TableHead>
                        <TableHead>Nombre ASPEL</TableHead>
                        <TableHead>Coincide con</TableHead>
                        <TableHead className="w-40">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duplicados.map((cliente, idx) => (
                        <TableRow key={`dup-${cliente.codigo}-${idx}`}>
                          <TableCell className="font-mono text-xs">
                            {cliente.codigo}
                          </TableCell>
                          <TableCell>{cliente.nombre}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {cliente.duplicadoCon}
                          </TableCell>
                          <TableCell>
                            {cliente.esGrupoConSucursales ? (
                              <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600">
                                <Building2 className="h-3 w-3" />
                                Grupo ({cliente.cantidadSucursales} suc.)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600">
                                Duplicado simple
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {duplicados.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground py-8"
                          >
                            No se detectaron duplicados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Advertencia de grupos */}
            {gruposConSucursales.length > 0 && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-700">
                      {gruposConSucursales.length} cliente(s) ya existen como grupos con sucursales
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Estos clientes no se importarán para evitar duplicar la estructura de sucursales existente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={clientesFiltrados.length === 0}>
                Importar {clientesFiltrados.length} clientes
              </Button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg">Importando clientes...</span>
            </div>
            <Progress value={importProgress} className="w-full" />
            <p className="text-center text-muted-foreground">
              {importProgress}% completado
            </p>
          </div>
        )}

        {step === "complete" && (
          <div className="py-8 space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-500/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-600">
                  {importResults.importados}
                </div>
                <div className="text-sm text-muted-foreground">Importados</div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-yellow-600">
                  {importResults.omitidos}
                </div>
                <div className="text-sm text-muted-foreground">Omitidos</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-red-600">
                  {importResults.errores}
                </div>
                <div className="text-sm text-muted-foreground">Errores</div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700">
                    Datos fiscales pendientes
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Los siguientes campos no están en ASPEL y deberán capturarse 
                    manualmente para CFDI 4.0: <strong>Régimen Fiscal</strong>, 
                    <strong> Email de facturación</strong>, <strong>Uso de CFDI</strong>.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Usa la herramienta de <strong>Auditoría Fiscal</strong> en el 
                    módulo de Clientes para completar esta información.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
