import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
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
  const puntosNombres = puntos
    .map((p) => {
      const code = p.codigoSucursal?.trim();
      const name = p.nombre?.trim();
      if (code && name) return `#${code} ${name}`;
      if (code) return `#${code}`;
      if (name) return name;
      return "(sin nombre)";
    })
    .join(", ");

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Generate codigo
      const { data: lastCliente } = await supabase
        .from("clientes")
        .select("codigo")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      const lastNum = lastCliente?.codigo ? parseInt(lastCliente.codigo.replace(/\D/g, "")) || 0 : 0;
      const newCodigo = `C${String(lastNum + 1).padStart(4, "0")}`;

      const vendId = vendedorAsignado && vendedorAsignado !== "casa" ? vendedorAsignado : null;

      const clientData = {
        codigo: newCodigo,
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

      if (error) throw error;

      // Create sucursales
      const sucursalesData = puntos.map((p, i) => ({
        cliente_id: newCliente.id,
        codigo_sucursal: p.codigoSucursal.trim() || null,
        nombre: p.nombre.trim() || (p.codigoSucursal.trim() ? `Sucursal ${p.codigoSucursal.trim()}` : "Principal"),
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

  return (
    <Layout>
      <div className="flex flex-col min-h-[calc(100vh-64px)]">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[760px] mx-auto px-4 py-8 space-y-10">
            {/* Breadcrumb */}
            <div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <button onClick={() => navigate("/clientes")} className="hover:text-foreground transition-colors">
                  Clientes
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground">Nuevo cliente</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">Nuevo cliente</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Captura los datos básicos. Lo demás se puede llenar después desde el detalle del cliente.
              </p>
            </div>

            {/* SECTION 1 — Datos del cliente */}
            <section className="space-y-4">
              <div className="border-b border-border pb-2">
                <h2 className="text-lg font-semibold text-foreground">Datos del cliente</h2>
                <p className="text-xs text-muted-foreground">La razón social a la que se le va a facturar</p>
              </div>

              <div className="grid grid-cols-[2fr_1fr] gap-3">
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

              <div className="grid grid-cols-2 gap-3">
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

              {/* Límite de crédito */}
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
                  <div className="max-w-[200px]">
                    <Input
                      type="number"
                      value={limiteCredito}
                      onChange={(e) => setLimiteCredito(e.target.value)}
                      placeholder="50,000"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Plazo de crédito */}
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

            {/* Vista previa */}
            {razonSocial.trim() && (
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Vista previa</h3>
                <p className="text-sm text-foreground">
                  Se creará el cliente <strong>{razonSocial.trim()}</strong> con RFC{" "}
                  <strong>{rfc.trim() || "—"}</strong>, vendedor{" "}
                  <strong>{vendedorNombre}</strong>, crédito{" "}
                  <strong>{creditoLabel} · {limiteLabel}</strong>, con{" "}
                  <strong>{puntos.length}</strong> punto(s) de entrega: {puntosNombres}.
                </p>
              </div>
            )}

            {/* Spacer for sticky footer */}
            <div className="h-20" />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3 shrink-0">
          <div className="max-w-[760px] mx-auto flex items-center justify-between">
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
