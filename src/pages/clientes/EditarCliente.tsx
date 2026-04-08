import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { formatCurrencyWhileTyping, parseCurrency } from "@/lib/currency";
import type { CSFData } from "@/lib/csfParser";

const USOS_CFDI = [
  { clave: "G03", descripcion: "Gastos en general" },
  { clave: "G01", descripcion: "Adquisición de mercancías" },
  { clave: "S01", descripcion: "Sin efectos fiscales" },
];

const CREDITO_OPTIONS = [
  { value: "contado", label: "Contado", sub: "0 días" },
  { value: "15_dias", label: "15 días", sub: "quincenal" },
  { value: "30_dias", label: "30 días", sub: "mensual" },
  { value: "60_dias", label: "60 días", sub: "extendido" },
];

function validateRFC(rfc: string): boolean {
  if (!rfc) return true;
  const moral = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;
  const fisica = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
  const upper = rfc.toUpperCase().trim();
  return moral.test(upper) || fisica.test(upper);
}

interface SucursalWithId extends PuntoEntrega {
  dbId?: string; // existing DB record id
}

const emptyPunto = (): SucursalWithId => ({
  codigoSucursal: "",
  nombre: "",
  entregarEnFiscal: true,
  direccion: "",
  contacto: "",
  telefono: "",
  horarioEntrega: "",
});

export default function EditarCliente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRoles();
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Original sucursal IDs to compare for deletes
  const [originalSucursalIds, setOriginalSucursalIds] = useState<string[]>([]);

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
  const [puntos, setPuntos] = useState<SucursalWithId[]>([]);

  // Section 4
  const [perteneceGrupo, setPerteneceGrupo] = useState(false);
  const [grupoId, setGrupoId] = useState("");
  const [grupos, setGrupos] = useState<{ id: string; nombre: string }[]>([]);

  // Load client data
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from("clientes").select("*").eq("id", id).single(),
        supabase.from("cliente_sucursales").select("*").eq("cliente_id", id).eq("activo", true).order("created_at"),
      ]);

      if (!c) {
        navigate("/clientes");
        return;
      }

      setRazonSocial(c.razon_social || c.nombre || "");
      setRfc(c.rfc || "");
      setDireccionFiscal(c.direccion || "");
      setRegimenFiscal(c.regimen_capital || "");
      setTerminoCredito(c.termino_credito || "contado");
      setVendedorAsignado(c.vendedor_asignado || "casa");

      if (c.limite_credito !== null && c.limite_credito !== undefined) {
        setSinLimite(false);
        setLimiteCredito(Number(c.limite_credito).toFixed(2));
      } else {
        setSinLimite(true);
        setLimiteCredito("");
      }

      if (c.grupo_cliente_id) {
        setPerteneceGrupo(true);
        setGrupoId(c.grupo_cliente_id);
      }

      const mapped: SucursalWithId[] = (s || []).map((suc: any) => ({
        dbId: suc.id,
        codigoSucursal: suc.codigo_sucursal || "",
        nombre: suc.nombre || "",
        entregarEnFiscal: suc.direccion === (c.direccion || ""),
        direccion: suc.direccion || "",
        contacto: suc.contacto || "",
        telefono: suc.telefono || "",
        horarioEntrega: suc.horario_entrega || "",
      }));

      setPuntos(mapped.length > 0 ? mapped : [emptyPunto()]);
      setOriginalSucursalIds((s || []).map((suc: any) => suc.id));
      setLoadingData(false);
    };
    load();
  }, [id, navigate]);

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

  const handleSave = async () => {
    if (!canSave || !id) return;
    setSaving(true);
    try {
      const vendId = vendedorAsignado && vendedorAsignado !== "casa" ? vendedorAsignado : null;

      const clientData = {
        nombre: razonSocial.trim(),
        razon_social: razonSocial.trim(),
        rfc: rfc.toUpperCase().trim(),
        direccion: direccionFiscal.trim(),
        regimen_capital: regimenFiscal || null,
        termino_credito: terminoCredito as "contado" | "8_dias" | "15_dias" | "30_dias" | "60_dias",
        limite_credito: sinLimite ? null : (Number(limiteCredito) || null),
        vendedor_asignado: vendId,
        grupo_cliente_id: perteneceGrupo && grupoId ? grupoId : null,
      };

      const { error } = await supabase
        .from("clientes")
        .update(clientData)
        .eq("id", id);

      if (error) throw error;

      // Handle sucursales
      const currentDbIds = puntos.filter(p => (p as SucursalWithId).dbId).map(p => (p as SucursalWithId).dbId!);
      const removedIds = originalSucursalIds.filter(oid => !currentDbIds.includes(oid));

      // Soft delete removed
      if (removedIds.length > 0) {
        await supabase
          .from("cliente_sucursales")
          .update({ activo: false })
          .in("id", removedIds);
      }

      // Update existing + insert new
      for (const p of puntos) {
        const suc = p as SucursalWithId;
        const data = {
          codigo_sucursal: suc.codigoSucursal.trim() || null,
          nombre: suc.nombre.trim() || (suc.entregarEnFiscal ? "Matriz" : "Principal"),
          direccion: suc.entregarEnFiscal ? direccionFiscal.trim() : suc.direccion.trim(),
          contacto: suc.contacto.trim() || null,
          telefono: suc.telefono.trim() || null,
          horario_entrega: suc.horarioEntrega.trim() || null,
        };

        if (suc.dbId) {
          await supabase.from("cliente_sucursales").update(data).eq("id", suc.dbId);
        } else {
          await supabase.from("cliente_sucursales").insert({ ...data, cliente_id: id, activo: true });
        }
      }

      toast({
        title: "Cliente actualizado",
        description: `${razonSocial.trim()} guardado correctamente`,
      });

      navigate(`/clientes/${id}`);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error al guardar",
        description: err.message || "Intenta de nuevo",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

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
                <button onClick={() => navigate(`/clientes/${id}`)} className="hover:text-foreground transition-colors">
                  {razonSocial || "Cliente"}
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground">Editar</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Editar cliente</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Modifica los datos del cliente y sus puntos de entrega.
              </p>
            </div>

            <main className="space-y-10">
              {/* SECTION 1 — Datos del cliente */}
              <section className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h2 className="text-lg font-semibold text-foreground">Datos del cliente</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Razón social <span className="text-primary">*</span>
                    </label>
                    <Input
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(e.target.value)}
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
                </div>
              </section>

              {/* SECTION 3 — Puntos de entrega */}
              <section className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h2 className="text-lg font-semibold text-foreground">Puntos de entrega</h2>
                </div>

                <div className="space-y-3">
                  {puntos.map((punto, i) => (
                    <PuntoEntregaCard
                      key={(punto as SucursalWithId).dbId || `new-${i}`}
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
                    </div>
                  )}
                </section>
              )}

              <div className="h-20" />
            </main>
          </PageContainer>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 border-t border-border bg-background px-4 md:px-6 py-3 shrink-0">
          <PageContainer maxWidth="wide" className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {puntos.length} punto(s) de entrega
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/clientes/${id}`)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Guardar cambios
              </Button>
            </div>
          </PageContainer>
        </div>
      </div>
    </Layout>
  );
}
