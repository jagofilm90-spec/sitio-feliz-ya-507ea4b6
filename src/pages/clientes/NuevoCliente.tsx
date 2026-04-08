import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { PageContainer } from "@/components/ui/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import { PuntoEntregaCard, type PuntoEntrega } from "@/components/clientes/PuntoEntregaCard";
import { CSFUploader } from "@/components/clientes/CSFUploader";
import { REGIMENES_FISCALES } from "@/constants/catalogoSAT";
import { ChevronRight, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCurrencyWhileTyping, parseCurrency } from "@/lib/currency";
import type { CSFData } from "@/lib/csfParser";

const USOS_CFDI = [
  { clave: "G03", descripcion: "Gastos en general" },
  { clave: "G01", descripcion: "Adquisición de mercancías" },
  { clave: "S01", descripcion: "Sin efectos fiscales" },
];

const CREDITO_OPTIONS: { value: string; label: string; sub: string }[] = [
  { value: "contado", label: "Contado", sub: "0 días" },
  { value: "15_dias", label: "15 días", sub: "quincenal" },
  { value: "30_dias", label: "30 días", sub: "mensual" },
  { value: "60_dias", label: "60 días", sub: "extendido" },
];

function validateRFC(rfc: string): boolean {
  if (!rfc) return true; // allow empty
  const moral = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;
  const fisica = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
  const upper = rfc.toUpperCase().trim();
  return moral.test(upper) || fisica.test(upper);
}

const emptyPunto = (): PuntoEntrega => ({
  codigoSucursal: "",
  nombre: "",
  entregarEnFiscal: true,
  direccion: "",
  contacto: "",
  telefono: "",
  horarioEntrega: "",
});

export default function NuevoCliente() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRoles();
  const [saving, setSaving] = useState(false);
  const [nuevoCodigo, setNuevoCodigo] = useState<string | null>(null);

  // Section 1
  const [razonSocial, setRazonSocial] = useState("");
  const [rfc, setRfc] = useState("");
  const [direccionFiscal, setDireccionFiscal] = useState("");
  const [regimenFiscal, setRegimenFiscal] = useState("");
  const [usoCfdi, setUsoCfdi] = useState("G03");

  // Section 2
  const [vendedorAsignado, setVendedorAsignado] = useState("");
  const [sinLimite, setSinLimite] = useState(true);
  const [limiteCredito, setLimiteCredito] = useState("");
  const [terminoCredito, setTerminoCredito] = useState("contado");
  const [vendedores, setVendedores] = useState<{ id: string; nombre: string }[]>([]);

  // Section 3
  const [puntos, setPuntos] = useState<PuntoEntrega[]>([emptyPunto()]);

  // Section 4
  const [perteneceGrupo, setPerteneceGrupo] = useState(false);
  const [grupoId, setGrupoId] = useState("");
  const [grupos, setGrupos] = useState<{ id: string; nombre: string }[]>([]);

  // Pre-generate código
  useEffect(() => {
    const genCodigo = async () => {
      const { data } = await supabase.rpc("generar_codigo_cliente");
      if (data) setNuevoCodigo(data as string);
    };
    genCodigo();
  }, []);

  // Load vendedores
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, profiles:user_id(id, full_name)")
        .eq("role", "vendedor");
      if (data) {
        const vends = data
          .filter((d: any) => d.profiles)
          .map((d: any) => ({ id: d.profiles.id, nombre: d.profiles.full_name || "Sin nombre" }));
        setVendedores(vends);
      }
    };
    load();
  }, []);

  // Load grupos
  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nombre")
        .eq("es_grupo", true)
        .eq("activo", true)
        .order("nombre");
      if (data) setGrupos(data);
    };
    load();
  }, [isAdmin]);

  // CSF handlers
  const handleCSFData = useCallback((data: CSFData) => {
    setRazonSocial(data.razonSocial);
    setRfc(data.rfc);
    setDireccionFiscal(data.direccionFiscal.completa);

    // Map régimen fiscal code to select value
    if (data.regimenFiscal.codigo) {
      const match = REGIMENES_FISCALES.find(r => r.clave === data.regimenFiscal.codigo);
      if (match) setRegimenFiscal(match.clave);
    }

    toast({
      title: "✓ Datos extraídos del CSF",
      description: "Verifica que todo esté correcto antes de guardar",
    });
  }, [toast]);

  const handleCSFClear = useCallback(() => {
    setRazonSocial("");
    setRfc("");
    setDireccionFiscal("");
    setRegimenFiscal("");
  }, []);

  const rfcError = rfc.length > 0 && !validateRFC(rfc);

  const puntosValid = puntos.every(
    (p) => p.codigoSucursal.trim() || p.nombre.trim()
  );
  const puntosNeedAddress = puntos.every(
    (p) => p.entregarEnFiscal || p.direccion.trim()
  );

  const canSave =
    razonSocial.trim() &&
    rfc.trim() &&
    !rfcError &&
    direccionFiscal.trim() &&
    puntosValid &&
    puntosNeedAddress;

  const handlePuntoChange = (idx: number, field: keyof PuntoEntrega, value: string | boolean) => {
    setPuntos((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };
  const handlePuntoRemove = (idx: number) => {
    setPuntos((prev) => prev.filter((_, i) => i !== idx));
  };
  const addPunto = () => setPuntos((prev) => [...prev, emptyPunto()]);

  // Preview text
  const vendedorNombre = vendedores.find((v) => v.id === vendedorAsignado)?.nombre || "Cliente de la casa";
  const creditoLabel = CREDITO_OPTIONS.find((c) => c.value === terminoCredito)?.label || "Contado";
  const limiteLabel = sinLimite ? "sin límite" : `$${Number(limiteCredito || 0).toLocaleString("es-MX")}`;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const attemptInsert = async (retries = 2): Promise<any> => {
      // Use pre-generated code, or regenerate on retry
      let codigoToUse = nuevoCodigo;
      if (!codigoToUse) {
        const { data: codigoResult, error: codigoError } = await supabase.rpc("generar_codigo_cliente");
        if (codigoError) throw codigoError;
        codigoToUse = codigoResult as string;
      }

      const vendId = vendedorAsignado && vendedorAsignado !== "casa" ? vendedorAsignado : null;

      const clientData = {
        codigo: codigoToUse,
        nombre: razonSocial.trim(),
        razon_social: razonSocial.trim(),
        rfc: rfc.toUpperCase().trim(),
        direccion: direccionFiscal.trim(),
        regimen_capital: regimenFiscal || null,
        termino_credito: terminoCredito as "contado" | "8_dias" | "15_dias" | "30_dias" | "60_dias",
        limite_credito: sinLimite ? null : (Number(limiteCredito) || null),
        vendedor_asignado: vendId,
        es_grupo: false,
        grupo_cliente_id: perteneceGrupo && grupoId ? grupoId : null,
        activo: true,
        preferencia_facturacion: "variable" as const,
      };

      const { data: newCliente, error } = await supabase
        .from("clientes")
        .insert([clientData])
        .select()
        .single();

      if (error) {
        // Collision on codigo — regenerate and retry
        if (retries > 0 && error.message?.includes("clientes_codigo_key")) {
          const { data: freshCodigo } = await supabase.rpc("generar_codigo_cliente");
          setNuevoCodigo(freshCodigo as string);
          return attemptInsert(retries - 1);
        }
        throw error;
      }

      return newCliente;
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Validate duplicate RFC
      if (rfc.trim()) {
        const { data: existente } = await supabase
          .from("clientes")
          .select("id, razon_social")
          .eq("rfc", rfc.toUpperCase().trim())
          .maybeSingle();

        if (existente) {
          toast({
            title: "RFC duplicado",
            description: `Ya existe un cliente con RFC ${rfc.toUpperCase().trim()}: ${existente.razon_social}`,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      const newCliente = await attemptInsert();
      if (!newCliente) throw new Error("No se pudo crear el cliente");

      // Create sucursales
      const sucursalesData = puntos.map((p, i) => ({
        cliente_id: newCliente.id,
        codigo_sucursal: p.codigoSucursal.trim() || null,
        nombre: p.nombre.trim() || (p.entregarEnFiscal && i === 0 ? "Matriz" : (p.codigoSucursal.trim() ? `Sucursal ${p.codigoSucursal.trim()}` : "Principal")),
        direccion: p.entregarEnFiscal ? direccionFiscal.trim() : p.direccion.trim(),
        contacto: p.contacto.trim() || null,
        telefono: p.telefono.trim() || null,
        horario_entrega: p.horarioEntrega.trim() || null,
        activo: true,
      }));

      const { error: sucError } = await supabase
        .from("cliente_sucursales")
        .insert(sucursalesData);

      if (sucError) {
        console.error("Error creating sucursales:", sucError);
      }

      toast({
        title: `Cliente ${razonSocial.trim()} creado`,
        description: `Con ${puntos.length} punto(s) de entrega`,
      });

      navigate(`/clientes`);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error al crear cliente",
        description: err.message || "Intenta de nuevo",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Tip message
  const tipMessage = (() => {
    if (!razonSocial.trim()) return "Empieza llenando los datos del cliente";
    if (!rfc.trim()) return "El RFC valida el formato del SAT automáticamente";
    if (puntos.length === 1) return "Puedes agregar más puntos de entrega después de guardar";
    if (puntos.length >= 2) return "Cada punto puede tener su propio contacto y horario";
    return "Listo para guardar. Verifica el resumen arriba antes de continuar.";
  })();

  const tipFinal = canSave ? "Listo para guardar. Verifica el resumen arriba antes de continuar." : tipMessage;

  return (
    <Layout>
      <div className="flex flex-col min-h-[calc(100vh-64px)]">
        <div className="flex-1 overflow-y-auto">
          <PageContainer maxWidth="wide" className="py-8">
            {/* Breadcrumb + Header */}
            <div className="mb-8">
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <button onClick={() => navigate("/clientes")} className="hover:text-foreground transition-colors">
                  Clientes
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground">Nuevo cliente</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Nuevo cliente</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Captura los datos básicos. Lo demás se puede llenar después desde el detalle del cliente.
              </p>
            </div>

            {/* 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-7 xl:gap-10">
              {/* MAIN FORM COLUMN */}
              <main className="space-y-10">
                {/* CSF Uploader */}
                <CSFUploader onDataExtracted={handleCSFData} onClear={handleCSFClear} />

                {/* SECTION 1 — Datos del cliente */}
                <section className="space-y-4">
                  <div className="border-b border-border pb-2">
                    <h2 className="text-lg font-semibold text-foreground">Datos del cliente</h2>
                    <p className="text-xs text-muted-foreground">La razón social a la que se le va a facturar</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Razón social <span className="text-primary">*</span>
                      </label>
                      <Input
                        value={razonSocial}
                        onChange={(e) => setRazonSocial(e.target.value)}
                        placeholder="PAN ROLL S.A. DE C.V."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        RFC <span className="text-primary">*</span>
                      </label>
                      <Input
                        value={rfc}
                        onChange={(e) => setRfc(e.target.value.toUpperCase())}
                        placeholder="PRO921020PY4"
                        className={cn("mt-1", rfcError && "border-destructive")}
                        maxLength={13}
                      />
                      {rfcError && (
                        <p className="text-xs text-destructive mt-1">RFC no tiene formato válido</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Dirección fiscal <span className="text-primary">*</span>
                    </label>
                    <Textarea
                      value={direccionFiscal}
                      onChange={(e) => setDireccionFiscal(e.target.value)}
                      placeholder="Calle, número, colonia, delegación, CP, ciudad..."
                      className="mt-1 min-h-[60px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Régimen fiscal
                      </label>
                      <Select value={regimenFiscal} onValueChange={setRegimenFiscal}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Seleccionar régimen" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIMENES_FISCALES.map((r) => (
                            <SelectItem key={r.clave} value={r.clave}>
                              {r.clave} — {r.descripcion}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Uso de CFDI por defecto
                      </label>
                      <Select value={usoCfdi} onValueChange={setUsoCfdi}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USOS_CFDI.map((u) => (
                            <SelectItem key={u.clave} value={u.clave}>
                              {u.clave} — {u.descripcion}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                {/* SECTION 2 — Vendedor y crédito */}
                <section className="space-y-4">
                  <div className="border-b border-border pb-2">
                    <h2 className="text-lg font-semibold text-foreground">Vendedor y crédito</h2>
                    <p className="text-xs text-muted-foreground">Quién atiende este cliente y bajo qué condiciones</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Vendedor asignado
                    </label>
                    <Select value={vendedorAsignado} onValueChange={setVendedorAsignado}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="— Cliente de la casa —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casa">— Cliente de la casa —</SelectItem>
                        {vendedores.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Límite de crédito
                    </label>
                    <div className="flex gap-1 bg-muted rounded-md p-0.5 w-fit">
                      <button
                        type="button"
                        onClick={() => setSinLimite(false)}
                        className={cn(
                          "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                          !sinLimite ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                        )}
                      >
                        Con límite
                      </button>
                      <button
                        type="button"
                        onClick={() => setSinLimite(true)}
                        className={cn(
                          "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                          sinLimite ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                        )}
                      >
                        Sin límite
                      </button>
                    </div>
                    {!sinLimite && (
                      <div className="flex items-center gap-2 max-w-[260px]">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={limiteCredito ? formatCurrencyWhileTyping(parseCurrency(limiteCredito)) : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            const parts = raw.split('.');
                            const cleaned = parts[0] + (parts.length > 1 ? '.' + parts[1].slice(0, 2) : '');
                            setLimiteCredito(cleaned);
                          }}
                          onBlur={() => {
                            if (limiteCredito) {
                              const num = parseFloat(limiteCredito);
                              if (!isNaN(num)) setLimiteCredito(num.toFixed(2));
                            }
                          }}
                          placeholder="$0.00"
                          className="mt-1"
                        />
                        <span className="text-xs text-muted-foreground mt-1">MXN</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Plazo de crédito por defecto
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {CREDITO_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTerminoCredito(opt.value)}
                          className={cn(
                            "flex flex-col items-center px-4 py-2 rounded-md border text-sm transition-all",
                            terminoCredito === opt.value
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-foreground/30"
                          )}
                        >
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs text-muted-foreground">{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cada pedido individual puede sobreescribir este plazo si es necesario.
                    </p>
                  </div>
                </section>

                {/* SECTION 3 — Puntos de entrega */}
                <section className="space-y-4">
                  <div className="border-b border-border pb-2">
                    <h2 className="text-lg font-semibold text-foreground">Puntos de entrega</h2>
                    <p className="text-xs text-muted-foreground">
                      Uno o más lugares donde llega el camión — todos facturan con el mismo RFC
                    </p>
                  </div>

                  <div className="space-y-3">
                    {puntos.map((punto, i) => (
                      <PuntoEntregaCard
                        key={i}
                        punto={punto}
                        index={i}
                        total={puntos.length}
                        direccionFiscal={direccionFiscal}
                        onChange={handlePuntoChange}
                        onRemove={handlePuntoRemove}
                      />
                    ))}
                  </div>

                  <Button type="button" variant="outline" size="sm" onClick={addPunto} className="mt-2">
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar otro punto de entrega
                  </Button>
                </section>

                {/* SECTION 4 — Opciones avanzadas (admin only) */}
                {isAdmin && (
                  <section className="space-y-4">
                    <div className="border-b border-border pb-2">
                      <h2 className="text-lg font-semibold text-foreground">Opciones avanzadas</h2>
                      <p className="text-xs text-muted-foreground">
                        Solo para casos especiales — la mayoría de los clientes no necesitan esto
                      </p>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <Switch checked={perteneceGrupo} onCheckedChange={setPerteneceGrupo} />
                      <span className="text-sm">Este cliente pertenece a un grupo empresarial</span>
                    </label>

                    {perteneceGrupo && (
                      <div>
                        <Select value={grupoId} onValueChange={setGrupoId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar grupo" />
                          </SelectTrigger>
                          <SelectContent>
                            {grupos.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Solo el administrador puede crear y asignar grupos.
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {/* Mobile-only preview (below form on small screens) */}
                <div className="lg:hidden">
                  <PreviewPanel
                    nuevoCodigo={nuevoCodigo}
                    razonSocial={razonSocial}
                    rfc={rfc}
                    vendedorNombre={vendedorNombre}
                    creditoLabel={creditoLabel}
                    limiteLabel={limiteLabel}
                    puntos={puntos}
                    perteneceGrupo={perteneceGrupo}
                    grupoNombre={grupos.find(g => g.id === grupoId)?.nombre}
                    tipMessage={tipFinal}
                  />
                </div>

                {/* Spacer for sticky footer */}
                <div className="h-20" />
              </main>

              {/* SIDEBAR PREVIEW — desktop only */}
              <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
                <PreviewPanel
                  nuevoCodigo={nuevoCodigo}
                  razonSocial={razonSocial}
                  rfc={rfc}
                  vendedorNombre={vendedorNombre}
                  creditoLabel={creditoLabel}
                  limiteLabel={limiteLabel}
                  puntos={puntos}
                  perteneceGrupo={perteneceGrupo}
                  grupoNombre={grupos.find(g => g.id === grupoId)?.nombre}
                  tipMessage={tipFinal}
                />
              </aside>
            </div>
          </PageContainer>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 border-t border-border bg-background px-4 md:px-6 xl:px-8 py-3 shrink-0">
          <PageContainer maxWidth="wide" className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {puntos.length} punto(s) capturados
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/clientes")}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Crear cliente
              </Button>
            </div>
          </PageContainer>
        </div>
      </div>
    </Layout>
  );
}

/* ─── Preview Panel Component ─── */

interface PreviewPanelProps {
  razonSocial: string;
  rfc: string;
  vendedorNombre: string;
  creditoLabel: string;
  limiteLabel: string;
  puntos: PuntoEntrega[];
  perteneceGrupo: boolean;
  grupoNombre?: string;
  tipMessage: string;
}

function PreviewPanel({
  razonSocial, rfc, vendedorNombre, creditoLabel, limiteLabel,
  puntos, perteneceGrupo, grupoNombre, tipMessage,
}: PreviewPanelProps) {
  const puntosDisplay = puntos.map((p) => {
    const code = p.codigoSucursal?.trim();
    const name = p.nombre?.trim();
    if (code && name) return `#${code} ${name}`;
    if (code) return `#${code}`;
    if (name) return name;
    return "(sin identificador)";
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-2">Vista previa</p>
        <p className="text-lg font-semibold text-foreground leading-tight">
          {razonSocial.trim() || <span className="text-muted-foreground/50 italic">Sin razón social</span>}
        </p>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          {rfc.trim() || "—"}
        </p>
      </div>

      <div className="border-t border-border" />

      <div className="space-y-4">
        <PreviewItem label="Vendedor" value={vendedorNombre} />
        <PreviewItem label="Crédito" value={`${creditoLabel} · ${limiteLabel}`} />

        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-1">
            Puntos de entrega ({puntos.length})
          </p>
          {puntosDisplay.length > 0 ? (
            <ul className="space-y-0.5">
              {puntosDisplay.map((name, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>

        {perteneceGrupo && (
          <PreviewItem label="Grupo" value={grupoNombre || "—"} />
        )}
      </div>

      <div className="border-t border-border" />

      {/* Tip */}
      <div className="rounded-md bg-blue-500/[0.08] border-l-2 border-blue-500 p-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          💡 {tipMessage}
        </p>
      </div>
    </div>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}