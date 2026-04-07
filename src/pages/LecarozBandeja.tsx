import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { invokeGmailApi } from "@/lib/gmailApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  RefreshCw, Upload, ClipboardPaste, Plus, Lock, Eye, Zap, 
  ChevronDown, ChevronRight, Mail, Package
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { parseLecarozText, type ParseResult } from "@/lib/lecarozParser";
import LecarozPreviewModal from "@/components/lecaroz/LecarozPreviewModal";

const GRUPO_LECAROZ_ID = "aaaaaaaa-1eca-4047-aaaa-aaaaaaaaaaaa";
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

interface Tanda {
  id: string;
  numero: number;
  nombre: string | null;
  estado: string;
  total_pedidos: number;
  total_monto: number;
  abierta_en: string;
  cerrada_en: string | null;
}

interface EmailLog {
  id: string;
  asunto: string | null;
  remitente: string | null;
  recibido_en: string | null;
  detectado_en: string;
  tanda_id: string | null;
  estado: string;
  num_sucursales_detectadas: number | null;
  num_productos_detectados: number | null;
  parser_output: any;
  origen: string;
}

const LecarozBandeja = () => {
  const now = new Date();
  const [mes] = useState(now.getMonth() + 1);
  const [anio] = useState(now.getFullYear());
  const [tandas, setTandas] = useState<Tanda[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [openTandas, setOpenTandas] = useState<Record<string, boolean>>({});
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showNewTanda, setShowNewTanda] = useState(false);
  const [newTandaNombre, setNewTandaNombre] = useState("");
  const [closingTanda, setClosingTanda] = useState<Tanda | null>(null);
  const [closeNotes, setCloseNotes] = useState("");
  
  // Preview state
  const [previewData, setPreviewData] = useState<ParseResult | null>(null);
  const [previewEmailId, setPreviewEmailId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tandasRes, emailsRes] = await Promise.all([
      supabase.from("tandas_lecaroz")
        .select("*")
        .eq("cliente_grupo_id", GRUPO_LECAROZ_ID)
        .eq("mes", mes).eq("anio", anio)
        .order("numero"),
      supabase.from("email_log_lecaroz")
        .select("*")
        .order("detectado_en", { ascending: false }),
    ]);
    setTandas((tandasRes.data || []) as unknown as Tanda[]);
    setEmails((emailsRes.data || []) as unknown as EmailLog[]);
    // Auto-open first tanda
    if (tandasRes.data && tandasRes.data.length > 0) {
      setOpenTandas(prev => {
        const next = { ...prev };
        tandasRes.data!.forEach(t => { if (next[t.id] === undefined) next[t.id] = true; });
        return next;
      });
    }
    setLoading(false);
  }, [mes, anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Use existing Gmail API to search for Lecaroz emails
      const result = await invokeGmailApi<any>({
        action: "search",
        cuenta_email: "pedidos@almasa.com.mx",
        query: `from:no-reply@lecarozint.com after:${anio}/${String(mes).padStart(2, "0")}/01`,
        maxResults: 50,
      });

      if (result.error) {
        toast.error("Error sincronizando Gmail");
        setSyncing(false);
        return;
      }

      const messages = result.data?.messages || [];
      let newCount = 0;

      for (const msg of messages) {
        const gmailId = msg.id;
        // Check if already logged
        const { data: existing } = await supabase
          .from("email_log_lecaroz")
          .select("id")
          .eq("gmail_id", gmailId)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Get message details
        const detail = await invokeGmailApi<any>({
          action: "get_message",
          cuenta_email: "pedidos@almasa.com.mx",
          message_id: gmailId,
        });

        if (detail.data) {
          const headers = detail.data.headers || {};
          await supabase.from("email_log_lecaroz").insert({
            gmail_id: gmailId,
            asunto: headers.subject || msg.snippet || "Sin asunto",
            remitente: headers.from || "no-reply@lecarozint.com",
            recibido_en: headers.date ? new Date(headers.date).toISOString() : new Date().toISOString(),
            estado: "detectado",
            origen: "gmail",
          });
          newCount++;
        }
      }

      toast.success(`${newCount} emails nuevos detectados`);
      fetchData();
    } catch (err) {
      toast.error("Error al sincronizar");
    }
    setSyncing(false);
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;

    // Parse the text
    const parsed = parseLecarozText(pasteText);

    // Save to email_log
    const { data: emailEntry, error } = await supabase
      .from("email_log_lecaroz")
      .insert({
        asunto: `Pegado manual — ${parsed.sucursales.length} sucursales`,
        remitente: "manual",
        estado: "detectado",
        origen: "paste",
        parser_output: parsed as any,
        num_sucursales_detectadas: parsed.sucursales.length,
        num_productos_detectados: parsed.sucursales.reduce((s, suc) => s + suc.productos.length, 0),
        formato_detectado: parsed.tipo_cotizacion,
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Error guardando texto");
    } else {
      toast.success(`Texto procesado: ${parsed.sucursales.length} sucursales detectadas`);
      setShowPaste(false);
      setPasteText("");
      fetchData();
    }
  };

  const handleNewTanda = async () => {
    const maxNum = tandas.reduce((m, t) => Math.max(m, t.numero), 0);
    const { error } = await supabase.from("tandas_lecaroz").insert({
      cliente_grupo_id: GRUPO_LECAROZ_ID,
      mes, anio,
      numero: maxNum + 1,
      nombre: newTandaNombre || `Tanda ${maxNum + 1}`,
      estado: "abierta",
    });
    if (error) toast.error("Error creando tanda");
    else { toast.success("Tanda creada"); fetchData(); }
    setShowNewTanda(false);
    setNewTandaNombre("");
  };

  const handleCloseTanda = async () => {
    if (!closingTanda) return;
    const { error } = await supabase
      .from("tandas_lecaroz")
      .update({
        estado: "cerrada",
        cerrada_en: new Date().toISOString(),
        notas_cierre: closeNotes || null,
      })
      .eq("id", closingTanda.id);

    if (error) toast.error("Error cerrando tanda");
    else {
      // Mark all pedidos of this tanda as pendiente
      await supabase
        .from("pedidos")
        .update({ status: "pendiente" })
        .eq("tanda_id", closingTanda.id)
        .eq("status", "borrador");
      toast.success("Tanda cerrada");
      fetchData();
    }
    setClosingTanda(null);
    setCloseNotes("");
  };

  const handlePreview = async (email: EmailLog) => {
    let parsed = email.parser_output as ParseResult | null;
    if (!parsed) {
      toast.error("Este email no tiene datos parseados aún. Usa 'Pegar texto' para emails manuales.");
      return;
    }
    setPreviewData(parsed);
    setPreviewEmailId(email.id);
    setShowPreview(true);
  };

  const handleProcessComplete = () => {
    setShowPreview(false);
    setPreviewData(null);
    setPreviewEmailId(null);
    fetchData();
  };

  const emailsForTanda = (tandaId: string) => emails.filter(e => e.tanda_id === tandaId);
  const emailsSinTanda = emails.filter(e => !e.tanda_id);

  const estadoBadge = (estado: string) => {
    const c: Record<string, string> = {
      detectado: "bg-yellow-500 text-black",
      preview: "bg-blue-500 text-white",
      procesado: "bg-green-600 text-white",
      ignorado: "bg-gray-500 text-white",
      error: "bg-red-600 text-white",
    };
    return <Badge className={c[estado] || ""}>{estado}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Bandeja Lecaroz</h1>
            <p className="text-lg text-muted-foreground">{MESES[mes - 1]} {anio}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar Gmail"}
            </Button>
            <Button variant="outline" disabled>
              <Upload className="h-4 w-4 mr-2" /> Subir archivo
            </Button>
            <Button variant="outline" onClick={() => setShowPaste(true)}>
              <ClipboardPaste className="h-4 w-4 mr-2" /> Pegar texto
            </Button>
            <Button onClick={() => setShowNewTanda(true)} className="bg-[#C41E3A] hover:bg-[#a01830]">
              <Plus className="h-4 w-4 mr-2" /> Nueva tanda
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tandas */}
            {tandas.map(tanda => (
              <Collapsible
                key={tanda.id}
                open={openTandas[tanda.id] ?? true}
                onOpenChange={open => setOpenTandas(prev => ({ ...prev, [tanda.id]: open }))}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
                        {openTandas[tanda.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <CardTitle className="text-base">
                          Tanda {tanda.numero} {tanda.nombre && `— ${tanda.nombre}`}
                        </CardTitle>
                        <Badge className={tanda.estado === "abierta" ? "bg-green-600 text-white" : "bg-gray-500 text-white"}>
                          {tanda.estado}
                        </Badge>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          <Package className="h-4 w-4 inline mr-1" />{tanda.total_pedidos} pedidos
                        </span>
                        {tanda.estado === "abierta" && (
                          <Button size="sm" variant="outline" onClick={() => setClosingTanda(tanda)}>
                            <Lock className="h-4 w-4 mr-1" /> Cerrar tanda
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      {emailsForTanda(tanda.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No hay emails en esta tanda aún
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {emailsForTanda(tanda.id).map(email => (
                            <div key={email.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{email.asunto || "Sin asunto"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {email.recibido_en ? new Date(email.recibido_en).toLocaleString() : "—"} ·
                                    {email.num_sucursales_detectadas ?? "?"} sucursales
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {estadoBadge(email.estado)}
                                {email.estado === "detectado" && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => handlePreview(email)}>
                                      <Eye className="h-4 w-4 mr-1" /> Preview
                                    </Button>
                                    <Button size="sm" className="bg-[#C41E3A] hover:bg-[#a01830]">
                                      <Zap className="h-4 w-4 mr-1" /> Procesar
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}

            {/* Emails sin tanda */}
            {emailsSinTanda.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-muted-foreground">Emails sin tanda asignada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {emailsSinTanda.map(email => (
                    <div key={email.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{email.asunto || "Sin asunto"}</p>
                          <p className="text-xs text-muted-foreground">
                            {email.detectado_en ? new Date(email.detectado_en).toLocaleString() : "—"} ·
                            {email.num_sucursales_detectadas ?? "?"} sucursales ·
                            <Badge variant="outline" className="ml-1 text-xs">{email.origen}</Badge>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {estadoBadge(email.estado)}
                        {email.estado === "detectado" && email.parser_output && (
                          <Button size="sm" variant="outline" onClick={() => handlePreview(email)}>
                            <Eye className="h-4 w-4 mr-1" /> Preview
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {tandas.length === 0 && emailsSinTanda.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No hay tandas ni emails para {MESES[mes - 1]} {anio}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Paste modal */}
      <Dialog open={showPaste} onOpenChange={setShowPaste}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pegar texto de pedido Lecaroz</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Pega aquí el texto del email de Lecaroz..."
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPaste(false); setPasteText(""); }}>Cancelar</Button>
            <Button onClick={handlePasteSubmit} disabled={!pasteText.trim()} className="bg-[#C41E3A] hover:bg-[#a01830]">
              Procesar texto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New tanda modal */}
      <Dialog open={showNewTanda} onOpenChange={setShowNewTanda}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva tanda</DialogTitle></DialogHeader>
          <Input
            placeholder="Nombre (ej: Complemento)"
            value={newTandaNombre}
            onChange={e => setNewTandaNombre(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTanda(false)}>Cancelar</Button>
            <Button onClick={handleNewTanda} className="bg-[#C41E3A] hover:bg-[#a01830]">Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close tanda confirmation */}
      <AlertDialog open={!!closingTanda} onOpenChange={open => { if (!open) setClosingTanda(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Cerrar Tanda {closingTanda?.numero} — {closingTanda?.nombre}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {closingTanda?.total_pedidos} pedidos · Una vez cerrada no podrás agregar más emails.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Notas de cierre (opcional)"
            value={closeNotes}
            onChange={e => setCloseNotes(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseTanda} className="bg-[#C41E3A] hover:bg-[#a01830]">
              Confirmar cierre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview modal */}
      {showPreview && previewData && (
        <LecarozPreviewModal
          open={showPreview}
          onClose={() => { setShowPreview(false); setPreviewData(null); }}
          parseResult={previewData}
          emailLogId={previewEmailId!}
          tandas={tandas.filter(t => t.estado === "abierta")}
          mes={mes}
          anio={anio}
          onProcessed={handleProcessComplete}
        />
      )}
    </Layout>
  );
};

export default LecarozBandeja;
