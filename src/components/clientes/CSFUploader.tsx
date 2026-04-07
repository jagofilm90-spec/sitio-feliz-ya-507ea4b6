import { useState, useRef, useCallback } from "react";
import { Loader2, FileCheck, FileWarning, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseCSF, type CSFData } from "@/lib/csfParser";
import { cn } from "@/lib/utils";

interface CSFUploaderProps {
  onDataExtracted: (data: CSFData) => void;
  onClear: () => void;
}

type UploaderState = "idle" | "loading" | "success" | "error";

export function CSFUploader({ onDataExtracted, onClear }: CSFUploaderProps) {
  const [state, setState] = useState<UploaderState>("idle");
  const [data, setData] = useState<CSFData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setErrorMsg("Solo se aceptan archivos PDF");
      setState("error");
      return;
    }
    setState("loading");
    try {
      const result = await parseCSF(file);
      setData(result);
      setState("success");
      onDataExtracted(result);
    } catch (err: any) {
      console.error("CSF parse error:", err);
      setErrorMsg(err.message || "No pude leer este PDF");
      setState("error");
    }
  }, [onDataExtracted]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }, [processFile]);

  const reset = useCallback(() => {
    setState("idle");
    setData(null);
    setErrorMsg("");
    onClear();
  }, [onClear]);

  if (state === "success" && data) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <FileCheck className="h-5 w-5 text-green-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              CSF procesada · {data.razonSocial}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              RFC {data.rfc}
              {data.regimenFiscal.codigo && ` · Régimen ${data.regimenFiscal.codigo}`}
              {` · Situación: ${data.situacion}`}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="shrink-0 text-muted-foreground hover:text-foreground text-xs"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Quitar y capturar manual
        </Button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 space-y-3">
        <div className="flex items-start gap-3">
          <FileWarning className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">{errorMsg}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Verifica que sea una Constancia de Situación Fiscal descargada directamente del SAT (no escaneada).
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-8">
          <Button variant="outline" size="sm" onClick={() => { setState("idle"); setErrorMsg(""); }}>
            Reintentar
          </Button>
          <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
            Capturar manual
          </Button>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Leyendo PDF…</p>
        <p className="text-xs text-muted-foreground/60">No cierres la ventana</p>
      </div>
    );
  }

  // idle
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "rounded-lg border border-dashed px-4 py-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
        dragOver
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/20 hover:border-muted-foreground/40"
      )}
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">
        Subir Constancia de Situación Fiscal
      </p>
      <p className="text-xs text-muted-foreground text-center">
        Arrastra el PDF aquí o haz click para elegir
      </p>
      <p className="text-xs text-muted-foreground/60 text-center">
        Los datos fiscales se llenarán automáticamente
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
