import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Download, Eye, Printer, FileText } from "lucide-react";

interface StorageFile {
  name: string;
  created_at: string;
}

interface ExpedienteDigitalProps {
  empleadoId: string;
}

export function ExpedienteDigital({ empleadoId }: ExpedienteDigitalProps) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from("empleados-documentos")
        .list(empleadoId, { sortBy: { column: "created_at", order: "desc" } });

      if (!error && data) {
        setFiles(data.filter((f) => f.name.endsWith(".pdf")));
      }
      setLoading(false);
    };
    if (empleadoId) load();
  }, [empleadoId]);

  const getSignedUrl = async (fileName: string) => {
    const { data } = await supabase.storage
      .from("empleados-documentos")
      .createSignedUrl(`${empleadoId}/${fileName}`, 60 * 60); // 1 hour
    return data?.signedUrl || null;
  };

  const handleView = async (fileName: string) => {
    const url = await getSignedUrl(fileName);
    if (url) window.open(url, "_blank");
  };

  const handleDownload = async (fileName: string) => {
    const url = await getSignedUrl(fileName);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
    }
  };

  const handlePrint = async (fileName: string) => {
    const url = await getSignedUrl(fileName);
    if (url) {
      const win = window.open(url, "_blank");
      if (win) {
        win.addEventListener("load", () => { win.print(); });
      }
    }
  };

  const getDocLabel = (name: string) => {
    if (name.includes("contrato_firmado")) return "Contrato Individual (firmado)";
    if (name.includes("aviso_privacidad")) return "Aviso de Privacidad (firmado)";
    return name.replace(/_/g, " ").replace(".pdf", "");
  };

  const getDocDate = (name: string) => {
    // Extract date from filename like contrato_firmado_2026-03-27.pdf
    const match = name.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const [y, m, d] = match[1].split("-");
      return `${d}/${m}/${y}`;
    }
    return "";
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Expediente Digital
        </h3>
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Expediente Digital
        {files.length > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
            {files.length} documento{files.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </h3>

      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay documentos firmados. Use &quot;Firmar Contrato&quot; para generar los documentos.
        </p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getDocLabel(file.name)}</p>
                <p className="text-xs text-muted-foreground">{getDocDate(file.name)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => handleView(file.name)} title="Ver">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDownload(file.name)} title="Descargar">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handlePrint(file.name)} title="Imprimir">
                  <Printer className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to check if an employee has signed documents (for table indicator)
export async function checkExpedienteStatus(empleadoId: string): Promise<boolean> {
  const { data } = await supabase.storage
    .from("documentos-empleados")
    .list(empleadoId, { limit: 1 });
  return (data?.length ?? 0) > 0;
}
