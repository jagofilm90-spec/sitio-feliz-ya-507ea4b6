import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Circle, Upload, Download, AlertCircle } from "lucide-react";

const DOCUMENTOS_REQUERIDOS = [
  { key: "ine", nombre: "Identificación oficial (INE)", obligatorio: true },
  { key: "curp", nombre: "CURP", obligatorio: true },
  { key: "rfc", nombre: "RFC (Constancia de Situación Fiscal)", obligatorio: true },
  { key: "acta_nacimiento", nombre: "Acta de nacimiento", obligatorio: true },
  { key: "comprobante_domicilio", nombre: "Comprobante de domicilio", obligatorio: true },
  { key: "nss", nombre: "Número de Seguro Social (NSS/IMSS)", obligatorio: true },
  { key: "cuenta_bancaria", nombre: "Cuenta bancaria (carátula o estado de cuenta)", obligatorio: true },
  { key: "fotos", nombre: "2 fotografías tamaño infantil", obligatorio: true },
  { key: "carta_recomendacion", nombre: "Carta de recomendación", obligatorio: false },
  { key: "comprobante_estudios", nombre: "Comprobante de estudios", obligatorio: false },
];

interface Props {
  empleadoId: string;
  empleadoNombre: string;
}

interface DocFile {
  key: string;
  fileName: string;
  createdAt: string;
}

export function DocumentosChecklist({ empleadoId, empleadoNombre }: Props) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadDocs = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("empleados-documentos")
      .list(`${empleadoId}/docs`, { sortBy: { column: "created_at", order: "desc" } });

    if (!error && data) {
      const parsed: DocFile[] = data
        .filter(f => f.name && !f.name.startsWith("."))
        .map(f => {
          const key = f.name.split("_")[0];
          return { key, fileName: f.name, createdAt: f.created_at || "" };
        });
      setDocs(parsed);
    }
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, [empleadoId]);

  const getDocForKey = (key: string) => docs.find(d => d.key === key);

  const handleUpload = async (key: string, file: File) => {
    setUploading(key);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const ts = Date.now();
      const path = `${empleadoId}/docs/${key}_${ts}.${ext}`;
      const { error } = await supabase.storage.from("empleados-documentos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      toast({ title: "Documento subido", description: `${file.name} guardado correctamente.` });
      await loadDocs();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleDownload = async (fileName: string) => {
    const { data, error } = await supabase.storage
      .from("empleados-documentos")
      .download(`${empleadoId}/docs/${fileName}`);
    if (error || !data) {
      toast({ title: "Error", description: "No se pudo descargar.", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const obligatorios = DOCUMENTOS_REQUERIDOS.filter(d => d.obligatorio);
  const entregados = obligatorios.filter(d => getDocForKey(d.key));
  const progreso = obligatorios.length > 0 ? Math.round((entregados.length / obligatorios.length) * 100) : 0;

  if (loading) return <p className="text-sm text-muted-foreground p-4">Cargando documentos...</p>;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">{entregados.length}/{obligatorios.length} documentos obligatorios</p>
          <Badge variant={progreso === 100 ? "default" : "secondary"} className="text-xs">
            {progreso === 100 ? "Completo" : `${progreso}%`}
          </Badge>
        </div>
        <Progress value={progreso} className="h-2" />
      </div>

      <div className="space-y-1">
        {DOCUMENTOS_REQUERIDOS.map((doc) => {
          const archivo = getDocForKey(doc.key);
          const falta = !archivo;
          return (
            <div key={doc.key} className={`flex items-center justify-between p-2 rounded-md ${archivo ? "bg-green-50/50" : doc.obligatorio ? "bg-red-50/30" : "bg-muted/30"}`}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {archivo ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                ) : doc.obligatorio ? (
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={`text-sm truncate ${archivo ? "text-green-800" : falta && doc.obligatorio ? "text-red-700" : "text-muted-foreground"}`}>
                    {doc.nombre}
                    {!doc.obligatorio && <span className="text-xs text-muted-foreground ml-1">(opcional)</span>}
                  </p>
                  {archivo && (
                    <p className="text-xs text-muted-foreground truncate">{archivo.fileName}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {archivo ? (
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(archivo.fileName)} title="Descargar">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <>
                    <input
                      ref={el => { fileRefs.current[doc.key] = el; }}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/heic"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(doc.key, f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      disabled={uploading === doc.key}
                      onClick={() => fileRefs.current[doc.key]?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {uploading === doc.key ? "Subiendo..." : "Subir"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper: count missing obligatory docs for an employee
export async function contarDocsFaltantes(empleadoId: string): Promise<number> {
  const { data } = await supabase.storage.from("empleados-documentos").list(`${empleadoId}/docs`, { limit: 100 });
  const keys = new Set((data || []).map(f => f.name.split("_")[0]));
  const obligatorios = DOCUMENTOS_REQUERIDOS.filter(d => d.obligatorio);
  return obligatorios.filter(d => !keys.has(d.key)).length;
}
