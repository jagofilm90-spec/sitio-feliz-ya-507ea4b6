import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileSpreadsheet, 
  Building2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from "xlsx";

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  razon_social: string | null;
  direccion: string | null;
  es_grupo: boolean;
  activo?: boolean;
}

interface SucursalImport {
  codigo: string;
  razonSocial: string;
  nombreSucursal: string;
  rfcEncontrado: string | null;
  clienteExistenteId: string | null;
  status: "ready" | "duplicate" | "no_match";
}

interface ImportarSucursalesExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientes: Cliente[];
  onSuccess: () => void;
}

export function ImportarSucursalesExcelDialog({
  open,
  onOpenChange,
  clientes,
  onSuccess,
}: ImportarSucursalesExcelDialogProps) {
  const [selectedGrupo, setSelectedGrupo] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<SucursalImport[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"select_grupo" | "upload" | "preview" | "importing">("select_grupo");
  const { toast } = useToast();

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedGrupo(null);
      setSearchTerm("");
      setFile(null);
      setParsedData([]);
      setStep("select_grupo");
    }
  }, [open]);

  // Get available groups
  const gruposDisponibles = clientes.filter((c) => c.es_grupo && c.activo !== false);
  
  const filteredGrupos = gruposDisponibles.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper function to parse combined format with multiple strategies
  const parseCombinedFormat = (text: string): { razonSocial: string; nombreSucursal: string } | null => {
    const trimmedText = text.trim();
    console.log("[Parser] Intentando parsear:", trimmedText);
    
    // Estrategia 1: Formato con "PERTENECE" al final
    // "ADMOINSA MEXICANA S.A DE C.V. SUC. SAN PEDRO PERTENECE..."
    const regexConPertenece = /^(.+?)\s+(SUC\.?\s+[\w\s\-\.]+?)\s+PERTENECE/i;
    let match = trimmedText.match(regexConPertenece);
    if (match) {
      console.log("[Parser] Match con PERTENECE:", match[1], "|", match[2]);
      return {
        razonSocial: match[1].trim(),
        nombreSucursal: match[2].trim(),
      };
    }
    
    // Estrategia 2: Formato sin "PERTENECE" pero con "SUC." seguido de nombre
    // "ADMOINSA MEXICANA S.A DE C.V. SUC. SAN PEDRO"
    const regexSinPertenece = /^(.+?)\s+(SUC\.?\s+[\w\s\-\.]+)$/i;
    match = trimmedText.match(regexSinPertenece);
    if (match) {
      console.log("[Parser] Match sin PERTENECE:", match[1], "|", match[2]);
      return {
        razonSocial: match[1].trim(),
        nombreSucursal: match[2].trim(),
      };
    }
    
    // Estrategia 3: Split simple por "SUC." (más flexible)
    // Busca cualquier variación de SUC., SUC , Suc.
    const sucIndex = trimmedText.toUpperCase().indexOf("SUC.");
    const sucIndexAlt = trimmedText.toUpperCase().indexOf("SUC ");
    const splitIndex = sucIndex !== -1 ? sucIndex : sucIndexAlt;
    
    if (splitIndex > 0) {
      const razonSocial = trimmedText.substring(0, splitIndex).trim();
      let nombreSucursal = trimmedText.substring(splitIndex).trim();
      
      // Limpiar "PERTENECE..." del final si existe
      const perteneceIndex = nombreSucursal.toUpperCase().indexOf("PERTENECE");
      if (perteneceIndex > 0) {
        nombreSucursal = nombreSucursal.substring(0, perteneceIndex).trim();
      }
      
      console.log("[Parser] Match por split SUC.:", razonSocial, "|", nombreSucursal);
      return { razonSocial, nombreSucursal };
    }
    
    console.log("[Parser] No se pudo parsear:", trimmedText);
    return null;
  };

  // Detect if the Excel uses combined format (razón social + sucursal in same column)
  // Más flexible: solo busca "SUC." sin requerir "PERTENECE"
  const detectCombinedFormat = (rows: any[][]): boolean => {
    for (const row of rows.slice(0, 15)) {
      if (!row || row.length < 2) continue;
      // Check columns for "SUC." pattern (con o sin "PERTENECE")
      for (let col = 0; col < Math.min(row.length, 6); col++) {
        const cellText = String(row[col] || "").toUpperCase();
        // Detectar si hay "SUC." o "SUC " en la celda
        if (cellText.includes("SUC.") || cellText.includes("SUC ")) {
          console.log("[Detector] Formato combinado detectado en fila, columna", col, ":", cellText.substring(0, 80));
          return true;
        }
      }
    }
    console.log("[Detector] Formato de columnas separadas detectado");
    return false;
  };

  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    setFile(uploadedFile);
    setLoading(true);

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Detect format type
      const isCombinedFormat = detectCombinedFormat(jsonData);
      console.log("Detected format:", isCombinedFormat ? "combined" : "separated columns");

      // Find first data row (looking for numeric code)
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row.length >= 2) {
          // Check if this looks like a data row with numeric code
          const hasNumericCode = row.some((cell: any) => typeof cell === 'number' && cell > 100);
          if (hasNumericCode) {
            headerRowIndex = i;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        throw new Error("No se encontró un formato válido en el Excel");
      }

      // Parse data rows
      const sucursalesImport: SucursalImport[] = [];
      
      for (let i = headerRowIndex; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 2) continue;

        let codigo = "";
        let razonSocial = "";
        let nombreSucursal = "";

        if (isCombinedFormat) {
          // Combined format: Find numeric code and combined text
          let codeColIndex = -1;
          let textColIndex = -1;
          
          for (let col = 0; col < Math.min(row.length, 6); col++) {
            const cell = row[col];
            if (typeof cell === 'number' && cell > 100 && codeColIndex === -1) {
              codeColIndex = col;
            }
            const cellText = String(cell || "").toUpperCase();
            // Buscar "SUC." o "SUC " (más flexible, sin requerir PERTENECE)
            if ((cellText.includes("SUC.") || cellText.includes("SUC ")) && textColIndex === -1) {
              textColIndex = col;
            }
          }

          if (codeColIndex === -1) {
            console.log("[Fila ignorada] Sin código numérico:", row.slice(0, 4));
            continue;
          }
          
          codigo = String(row[codeColIndex]).trim();
          
          // Si encontramos columna con texto combinado, parsearla
          if (textColIndex !== -1) {
            const combinedText = String(row[textColIndex]).trim();
            console.log("[Fila", i, "] Código:", codigo, "| Texto combinado:", combinedText.substring(0, 60));
            const parsed = parseCombinedFormat(combinedText);
            if (parsed) {
              razonSocial = parsed.razonSocial;
              nombreSucursal = parsed.nombreSucursal;
            }
          }
          
          // Fallback: si no encontró en la columna detectada, buscar en cualquier columna
          if (!razonSocial || !nombreSucursal) {
            for (let col = 0; col < row.length; col++) {
              const cellText = String(row[col] || "").trim();
              if (cellText.includes("SUC.") || cellText.includes("SUC ")) {
                const parsed = parseCombinedFormat(cellText);
                if (parsed) {
                  razonSocial = parsed.razonSocial;
                  nombreSucursal = parsed.nombreSucursal;
                  console.log("[Fallback] Encontrado en columna", col);
                  break;
                }
              }
            }
          }
        } else {
          // Traditional separated format: Try multiple column combinations
          // Estrategia 1: Columnas B-C-D (índices 1-2-3)
          codigo = String(row[1] || "").trim();
          razonSocial = String(row[2] || "").trim();
          nombreSucursal = String(row[3] || "").trim();
          
          // Estrategia 2: Si código no es numérico, probar A-B-C (índices 0-1-2)
          if (isNaN(Number(codigo))) {
            codigo = String(row[0] || "").trim();
            razonSocial = String(row[1] || "").trim();
            nombreSucursal = String(row[2] || "").trim();
          }
        }

        // Skip empty rows or header-like rows
        if (!codigo || !razonSocial || !nombreSucursal) {
          console.log("[Fila ignorada] Campos vacíos - código:", codigo, "| razón:", razonSocial?.substring(0, 20), "| suc:", nombreSucursal?.substring(0, 20));
          continue;
        }
        if (isNaN(Number(codigo))) {
          console.log("[Fila ignorada] Código no numérico:", codigo);
          continue;
        }

        // Look up existing client by código
        const clienteExistente = clientes.find(
          (c) => c.codigo === codigo || c.codigo === codigo.padStart(4, '0')
        );

        // Check if sucursal already exists
        const existingSucursal = await checkExistingSucursal(
          selectedGrupo?.id || "",
          nombreSucursal,
          codigo
        );

        sucursalesImport.push({
          codigo,
          razonSocial,
          nombreSucursal,
          rfcEncontrado: clienteExistente?.rfc || null,
          clienteExistenteId: clienteExistente?.id || null,
          status: existingSucursal ? "duplicate" : clienteExistente ? "ready" : "no_match",
        });
      }

      if (sucursalesImport.length === 0) {
        throw new Error("No se encontraron sucursales válidas en el Excel. Verifica que el archivo tenga el formato correcto.");
      }

      setParsedData(sucursalesImport);
      setStep("preview");
    } catch (error: any) {
      console.error("Error parsing Excel:", error);
      toast({
        title: "Error al leer el Excel",
        description: error.message || "No se pudo procesar el archivo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [clientes, selectedGrupo, toast]);

  const checkExistingSucursal = async (
    clienteId: string,
    nombre: string,
    codigo: string
  ): Promise<boolean> => {
    if (!clienteId) return false;
    
    const { data } = await supabase
      .from("cliente_sucursales")
      .select("id")
      .eq("cliente_id", clienteId)
      .or(`nombre.eq.${nombre},codigo_sucursal.eq.${codigo}`)
      .single();

    return !!data;
  };

  const handleImport = async () => {
    if (!selectedGrupo || parsedData.length === 0) return;

    setImporting(true);
    setStep("importing");

    try {
      let created = 0;
      let skipped = 0;
      let deactivated = 0;

      for (const sucursal of parsedData) {
        if (sucursal.status === "duplicate") {
          skipped++;
          continue;
        }

        // Create the sucursal
        const { error: insertError } = await supabase
          .from("cliente_sucursales")
          .insert({
            cliente_id: selectedGrupo.id,
            nombre: sucursal.nombreSucursal,
            codigo_sucursal: sucursal.codigo,
            razon_social: sucursal.razonSocial,
            rfc: sucursal.rfcEncontrado,
            activo: true,
          });

        if (insertError) {
          console.error("Error inserting sucursal:", insertError);
          continue;
        }

        created++;

        // Deactivate the original client if it exists
        if (sucursal.clienteExistenteId) {
          const { error: deactivateError } = await supabase
            .from("clientes")
            .update({ activo: false })
            .eq("id", sucursal.clienteExistenteId);

          if (!deactivateError) {
            deactivated++;
          }
        }
      }

      toast({
        title: "Importación completada",
        description: `${created} sucursales creadas, ${skipped} omitidas (duplicadas), ${deactivated} clientes desactivados`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error importing sucursales:", error);
      toast({
        title: "Error en la importación",
        description: error.message || "Ocurrió un error durante la importación",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const readyCount = parsedData.filter((s) => s.status === "ready").length;
  const duplicateCount = parsedData.filter((s) => s.status === "duplicate").length;
  const noMatchCount = parsedData.filter((s) => s.status === "no_match").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[85vh] overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Sucursales desde Excel
          </DialogTitle>
          <DialogDescription>
            Importa sucursales desde Excel. Detecta automáticamente formato combinado (ej: "RAZÓN SOCIAL SUC. NOMBRE PERTENECE...") o columnas separadas.
          </DialogDescription>
        </DialogHeader>

        {step === "select_grupo" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar grupo padre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Selecciona el grupo padre para las sucursales
            </Label>

            <ScrollArea className="h-[300px] border rounded-md p-2">
              {filteredGrupos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay grupos disponibles. Crea un grupo primero.
                </p>
              ) : (
                filteredGrupos.map((grupo) => (
                  <div
                    key={grupo.id}
                    onClick={() => setSelectedGrupo(grupo)}
                    className={`p-3 rounded-md cursor-pointer transition-colors mb-2 ${
                      selectedGrupo?.id === grupo.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">{grupo.nombre}</span>
                      </div>
                      <Badge variant="secondary">{grupo.codigo}</Badge>
                    </div>
                    {grupo.rfc && (
                      <p className="text-xs opacity-70 mt-1">RFC: {grupo.rfc}</p>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => setStep("upload")}
                disabled={!selectedGrupo}
              >
                Continuar
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium">Grupo seleccionado:</p>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">{selectedGrupo?.nombre}</span>
                <Badge variant="secondary">{selectedGrupo?.codigo}</Badge>
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                loading ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Procesando archivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Arrastra el archivo Excel aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Soporta formato combinado (SUC. en misma celda) o columnas separadas
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                    className="hidden"
                    id="excel-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="excel-upload" className="cursor-pointer">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Seleccionar archivo
                    </label>
                  </Button>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("select_grupo")}>
                Atrás
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {readyCount} listas
              </Badge>
              {duplicateCount > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {duplicateCount} duplicadas
                </Badge>
              )}
              {noMatchCount > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {noMatchCount} sin RFC
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[350px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Razón Social</TableHead>
                    <TableHead>RFC</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((sucursal, index) => (
                    <TableRow 
                      key={index}
                      className={sucursal.status === "duplicate" ? "opacity-50" : ""}
                    >
                      <TableCell className="font-mono text-sm">
                        {sucursal.codigo}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sucursal.nombreSucursal}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {sucursal.razonSocial}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sucursal.rfcEncontrado || "-"}
                      </TableCell>
                      <TableCell>
                        {sucursal.status === "ready" && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Lista
                          </Badge>
                        )}
                        {sucursal.status === "duplicate" && (
                          <Badge variant="secondary" className="text-xs">
                            <X className="h-3 w-3 mr-1" />
                            Duplicada
                          </Badge>
                        )}
                        {sucursal.status === "no_match" && (
                          <Badge variant="outline" className="text-xs">
                            Sin RFC
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p><strong>Grupo destino:</strong> {selectedGrupo?.nombre}</p>
              <p className="text-muted-foreground mt-1">
                Se crearán {readyCount + noMatchCount} sucursales y se desactivarán {readyCount} clientes duplicados.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Atrás
              </Button>
              <Button
                onClick={handleImport}
                disabled={readyCount + noMatchCount === 0}
              >
                Importar {readyCount + noMatchCount} sucursales
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Importando sucursales...</p>
            <p className="text-sm text-muted-foreground">
              Creando sucursales y desactivando clientes duplicados
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
