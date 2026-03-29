import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Download, Printer, FileText, Mail, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StorageFile {
  name: string;
  created_at: string;
  fullPath: string;
}

interface ExpedienteDigitalProps {
  empleadoId: string;
  isAdmin?: boolean;
}

export function ExpedienteDigital({ empleadoId, isAdmin }: ExpedienteDigitalProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailDialog, setEmailDialog] = useState<{ open: boolean; fileName: string }>({ open: false, fileName: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendingMulti, setSendingMulti] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // List root (signed contracts/aviso) + docs subfolder (checklist uploads)
      const [rootRes, docsRes] = await Promise.all([
        supabase.storage.from("empleados-documentos").list(empleadoId, { sortBy: { column: "created_at", order: "desc" } }),
        supabase.storage.from("empleados-documentos").list(`${empleadoId}/docs`, { sortBy: { column: "created_at", order: "desc" } }),
      ]);
      const rootFiles = (rootRes.data || []).filter(f => f.name.endsWith(".pdf") || f.name.endsWith(".jpg") || f.name.endsWith(".png")).map(f => ({ ...f, fullPath: f.name }));
      const docsFiles = (docsRes.data || []).filter(f => f.name && !f.name.startsWith(".")).map(f => ({ ...f, fullPath: `docs/${f.name}` }));
      setFiles([...rootFiles, ...docsFiles] as any);
      setLoading(false);
    };
    if (empleadoId) load();
  }, [empleadoId]);

  const getSignedUrl = async (fileName: string): Promise<string | null> => {
    const path = `${empleadoId}/${fileName}`;
    const { data, error } = await supabase.storage
      .from("empleados-documentos")
      .createSignedUrl(path, 60 * 60);
    console.log("[Expediente] signedUrl for", path, ":", data?.signedUrl ? "OK" : error?.message);
    return data?.signedUrl || null;
  };

  const getFileBlob = async (fullPath: string): Promise<Blob | null> => {
    const path = `${empleadoId}/${fullPath}`;
    const { data, error } = await supabase.storage
      .from("empleados-documentos")
      .download(path);
    if (error || !data) return null;
    return data;
  };

  const handleDownload = async (fileName: string) => {
    const blob = await getFileBlob(fileName);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } else {
      toast({ title: "Error", description: "No se pudo descargar el documento", variant: "destructive" });
    }
  };

  const handleDelete = async (fullPath: string, label: string) => {
    if (!confirm(`¿Eliminar "${label}"? No se puede deshacer.`)) return;
    const { error } = await supabase.storage.from("empleados-documentos").remove([`${empleadoId}/${fullPath}`]);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Eliminado" }); loadDocs(); }
  };

  const loadDocs = () => {
    // Re-trigger the load effect
    setLoading(true);
    Promise.all([
      supabase.storage.from("empleados-documentos").list(empleadoId, { sortBy: { column: "created_at", order: "desc" } }),
      supabase.storage.from("empleados-documentos").list(`${empleadoId}/docs`, { sortBy: { column: "created_at", order: "desc" } }),
    ]).then(([rootRes, docsRes]) => {
      const rootFiles = (rootRes.data || []).filter(f => f.name.endsWith(".pdf") || f.name.endsWith(".jpg") || f.name.endsWith(".png")).map(f => ({ ...f, fullPath: f.name }));
      const docsFiles = (docsRes.data || []).filter(f => f.name && !f.name.startsWith(".")).map(f => ({ ...f, fullPath: `docs/${f.name}` }));
      setFiles([...rootFiles, ...docsFiles] as any);
      setLoading(false);
    });
  };

  const handlePrint = async (fileName: string) => {
    await handleDownload(fileName);
    toast({ title: "Documento descargado", description: "Abre el PDF descargado e imprímelo desde ahí." });
  };

  const toggleSelect = (fp: string) => {
    const s = new Set(selected);
    s.has(fp) ? s.delete(fp) : s.add(fp);
    setSelected(s);
  };

  const handleSendMulti = async () => {
    if (selected.size === 0) return;
    const emailTo = prompt("¿A qué correo enviar los documentos seleccionados?");
    if (!emailTo?.trim()) return;
    setSendingMulti(true);
    try {
      const attachments: Array<{ filename: string; content: string; mimeType: string }> = [];
      for (const fp of selected) {
        const blob = await getFileBlob(fp);
        if (!blob) continue;
        const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onloadend = () => res((r.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
        const name = fp.includes("/") ? fp.split("/").pop()! : fp;
        attachments.push({ filename: name, content: b64, mimeType: "application/pdf" });
      }
      await supabase.functions.invoke("gmail-api", {
        body: { action: "send", email: "1904@almasa.com.mx", to: emailTo.trim(), subject: `Documentos del expediente — ALMASA`, body: `<p>Adjunto ${attachments.length} documento${attachments.length > 1 ? "s" : ""} del expediente.</p><p style="color:#888">Abarrotes La Manita, S.A. de C.V.</p>`, attachments },
      });
      toast({ title: "Enviado", description: `${attachments.length} documento(s) enviado(s) a ${emailTo}` });
      setSelected(new Set());
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSendingMulti(false); }
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim() || !emailDialog.fileName) return;
    setSending(true);
    try {
      const blob = await getFileBlob(emailDialog.fileName);
      if (!blob) throw new Error("No se pudo obtener el archivo");

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const docLabel = getDocLabel(emailDialog.fileName);
      const { error } = await supabase.functions.invoke("gmail-api", {
        body: {
          action: "send",
          email: "1904@almasa.com.mx",
          to: emailTo.trim(),
          subject: `Documento — ${docLabel} — ALMASA`,
          body: `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0">
<tr><td style="padding:28px 36px;border-bottom:1px solid #eee;text-align:center"><p style="margin:0;color:#999;font-size:11px;font-style:italic;letter-spacing:1px">Desde 1904</p><img src="https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png" alt="ALMASA" width="180" style="display:inline-block;max-width:180px;height:auto"/></td></tr>
<tr><td style="padding:28px 36px">
<p style="color:#444;font-size:14px;margin:0 0 16px">Adjunto el documento solicitado: <strong>${docLabel}</strong></p>
<p style="color:#888;font-size:13px;margin:0">Abarrotes La Manita, S.A. de C.V.</p>
</td></tr>
</table></td></tr></table>`,
          attachments: [{
            filename: emailDialog.fileName,
            content: base64,
            mimeType: "application/pdf",
          }],
        },
      });

      if (error) throw error;
      toast({ title: "Enviado", description: `Documento enviado a ${emailTo}` });
      setEmailDialog({ open: false, fileName: "" });
      setEmailTo("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const getDocLabel = (name: string) => {
    const base = name.replace("docs/", "");
    if (base.includes("contrato_firmado")) return "Contrato Individual (firmado)";
    if (base.includes("aviso_privacidad")) return "Aviso de Privacidad (firmado)";
    if (base.includes("addendum")) return "Addendum de sueldo";
    if (base.startsWith("ine_")) return "INE";
    if (base.startsWith("curp_")) return "CURP";
    if (base.startsWith("rfc_")) return "RFC";
    if (base.startsWith("acta_nacimiento_")) return "Acta de nacimiento";
    if (base.startsWith("comprobante_domicilio_")) return "Comprobante de domicilio";
    if (base.startsWith("nss_")) return "NSS/IMSS";
    if (base.startsWith("cuenta_bancaria_")) return "Cuenta bancaria";
    if (base.startsWith("fotos_")) return "Fotografías";
    if (base.startsWith("carta_recomendacion_")) return "Carta de recomendación";
    if (base.startsWith("comprobante_estudios_")) return "Comprobante de estudios";
    return base.replace(/_/g, " ").replace(/\.\w+$/, "");
  };

  const getDocDate = (name: string) => {
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
    <>
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

        {selected.size > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <Button size="sm" variant="outline" onClick={handleSendMulti} disabled={sendingMulti}>
              {sendingMulti ? "Enviando..." : `Enviar seleccionados (${selected.size})`}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Deseleccionar</Button>
          </div>
        )}

        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay documentos firmados. Use &quot;Firmar Contrato&quot; para generar los documentos.
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.name} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <input type="checkbox" className="shrink-0 mr-2" checked={selected.has(file.fullPath)} onChange={() => toggleSelect(file.fullPath)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getDocLabel(file.name)}</p>
                  <p className="text-xs text-muted-foreground">{getDocDate(file.name)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(file.fullPath)} title="Descargar">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handlePrint(file.fullPath)} title="Imprimir">
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEmailDialog({ open: true, fileName: file.fullPath }); setEmailTo(""); }} title="Enviar por correo">
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(file.fullPath, getDocLabel(file.name))} title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <Dialog open={emailDialog.open} onOpenChange={(o) => { if (!o) setEmailDialog({ open: false, fileName: "" }); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar documento por correo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{getDocLabel(emailDialog.fileName)}</p>
          <Input
            type="email"
            placeholder="correo@ejemplo.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSendEmail(); }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEmailDialog({ open: false, fileName: "" })}>Cancelar</Button>
            <Button onClick={handleSendEmail} disabled={!emailTo.trim() || sending}>
              {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</> : "Enviar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export async function checkExpedienteStatus(empleadoId: string): Promise<boolean> {
  const { data } = await supabase.storage
    .from("empleados-documentos")
    .list(empleadoId, { limit: 1 });
  return (data?.length ?? 0) > 0;
}
