import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight, MapPin, Phone, Clock, User, ExternalLink,
  Plus, Edit, ArrowLeft, Trash2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

export default function DetalleCliente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cliente, setCliente] = useState<any>(null);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [vendedorNombre, setVendedorNombre] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Delete client dialog
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Delete punto dialog
  const [deletePuntoTarget, setDeletePuntoTarget] = useState<any>(null);

  // Edit/Add punto sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPunto, setEditingPunto] = useState<any>(null); // null = new

  // Punto form state
  const [pCodigo, setPCodigo] = useState("");
  const [pNombre, setPNombre] = useState("");
  const [pEntregarFiscal, setPEntregarFiscal] = useState(true);
  const [pDireccion, setPDireccion] = useState("");
  const [pContacto, setPContacto] = useState("");
  const [pTelefono, setPTelefono] = useState("");
  const [pHorario, setPHorario] = useState("");
  const [savingPunto, setSavingPunto] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", id).single(),
      supabase.from("cliente_sucursales").select("*").eq("cliente_id", id).eq("activo", true).order("created_at"),
    ]);
    setCliente(c);
    setSucursales(s || []);

    if (c?.vendedor_asignado) {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", c.vendedor_asignado)
        .single();
      setVendedorNombre(p?.full_name || "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteCliente = async () => {
    if (!id) return;
    const { error } = await supabase.from("clientes").update({ activo: false }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Cliente ${cliente?.razon_social || cliente?.nombre} marcado como inactivo` });
    navigate("/clientes");
  };

  const handleDeletePunto = async () => {
    if (!deletePuntoTarget) return;
    const { error } = await supabase
      .from("cliente_sucursales")
      .update({ activo: false })
      .eq("id", deletePuntoTarget.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Punto de entrega eliminado" });
      loadData();
    }
    setDeletePuntoTarget(null);
  };

  const openEditPunto = (s: any) => {
    setEditingPunto(s);
    setPCodigo(s.codigo_sucursal || "");
    setPNombre(s.nombre || "");
    setPEntregarFiscal(s.direccion === (cliente?.direccion || ""));
    setPDireccion(s.direccion || "");
    setPContacto(s.contacto || "");
    setPTelefono(s.telefono || "");
    setPHorario(s.horario_entrega || "");
    setSheetOpen(true);
  };

  const openNewPunto = () => {
    setEditingPunto(null);
    setPCodigo("");
    setPNombre("");
    setPEntregarFiscal(true);
    setPDireccion("");
    setPContacto("");
    setPTelefono("");
    setPHorario("");
    setSheetOpen(true);
  };

  const handleSavePunto = async () => {
    setSavingPunto(true);
    try {
      const data = {
        codigo_sucursal: pCodigo.trim() || null,
        nombre: pNombre.trim() || "Principal",
        direccion: pEntregarFiscal ? (cliente?.direccion || "") : pDireccion.trim(),
        contacto: pContacto.trim() || null,
        telefono: pTelefono.trim() || null,
        horario_entrega: pHorario.trim() || null,
      };

      if (editingPunto) {
        const { error } = await supabase.from("cliente_sucursales").update(data).eq("id", editingPunto.id);
        if (error) throw error;
        toast({ title: "Punto actualizado" });
      } else {
        const { error } = await supabase.from("cliente_sucursales").insert({ ...data, cliente_id: id, activo: true });
        if (error) throw error;
        toast({ title: "Punto de entrega agregado" });
      }
      setSheetOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingPunto(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!cliente) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Cliente no encontrado</div>
      </Layout>
    );
  }

  const creditLabel = {
    contado: "Contado",
    "8_dias": "8 días",
    "15_dias": "15 días",
    "30_dias": "30 días",
    "60_dias": "60 días",
  }[cliente.termino_credito as string] || cliente.termino_credito;

  return (
    <Layout>
      <div className="max-w-[760px] mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb */}
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <button onClick={() => navigate("/clientes")} className="hover:text-foreground transition-colors">
              Clientes
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">{cliente.nombre}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{cliente.razon_social || cliente.nombre}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {cliente.rfc && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {cliente.rfc}
                  </Badge>
                )}
                <Badge variant={cliente.activo ? "default" : "secondary"}>
                  {cliente.activo ? "Activo" : "Inactivo"}
                </Badge>
                {vendedorNombre && (
                  <Badge variant="outline">
                    <User className="h-3 w-3 mr-1" />
                    {vendedorNombre}
                  </Badge>
                )}
                <Badge variant="outline">{creditLabel}</Badge>
                {cliente.limite_credito ? (
                  <Badge variant="outline">${Number(cliente.limite_credito).toLocaleString("es-MX")}</Badge>
                ) : (
                  <Badge variant="outline">Sin límite</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => navigate(`/clientes/${id}/editar`)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/clientes")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver
              </Button>
            </div>
          </div>
        </div>

        {/* Info fiscal */}
        {cliente.direccion && (
          <div className="text-sm text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dirección fiscal</span>
            <p className="mt-0.5 text-foreground">{cliente.direccion}</p>
          </div>
        )}

        {/* Puntos de entrega */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Puntos de entrega</h2>
              <p className="text-xs text-muted-foreground">{sucursales.length} punto(s) registrados</p>
            </div>
          </div>

          <div className="space-y-3">
            {sucursales.map((s, i) => {
              const label = (() => {
                const code = s.codigo_sucursal?.trim();
                const name = s.nombre?.trim();
                if (code && name) return `#${code} ${name}`;
                if (code) return `#${code}`;
                return name || "Sin nombre";
              })();

              return (
                <Card key={s.id} className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-foreground">{label}</span>
                          {i === 0 && (
                            <Badge variant="outline" className="text-xs">Matriz</Badge>
                          )}
                        </div>
                        {s.direccion && (
                          <p className="text-sm text-muted-foreground pl-6">{s.direccion}</p>
                        )}
                        <div className="flex gap-4 pl-6 text-xs text-muted-foreground">
                          {s.contacto && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {s.contacto}
                            </span>
                          )}
                          {s.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {s.telefono}
                            </span>
                          )}
                          {s.horario_entrega && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {s.horario_entrega}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditPunto(s)}
                          title="Editar punto"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletePuntoTarget(s)}
                          title="Eliminar punto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {s.latitud && s.longitud && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`https://www.google.com/maps?q=${s.latitud},${s.longitud}`, "_blank")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {sucursales.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Este cliente no tiene puntos de entrega registrados.
            </p>
          )}

          <Button variant="outline" size="sm" onClick={openNewPunto}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar punto de entrega
          </Button>
        </section>
      </div>

      {/* Delete client dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por eliminar <strong>{cliente.razon_social || cliente.nombre}</strong>. Esta acción
              marcará el cliente como inactivo. Sus pedidos históricos NO se borrarán.
              Puedes reactivarlo después si lo necesitas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCliente} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete punto dialog */}
      <AlertDialog open={!!deletePuntoTarget} onOpenChange={(open) => !open && setDeletePuntoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar punto de entrega?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por eliminar <strong>{deletePuntoTarget?.nombre || "este punto"}</strong>.
              {sucursales.length <= 1 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Este es el único punto de entrega del cliente. El cliente quedará sin puntos.
                </span>
              )}
              {" "}Si tiene pedidos asociados, NO se borrarán. El punto se marcará como inactivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePunto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit/Add punto sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingPunto ? "Editar punto de entrega" : "Nuevo punto de entrega"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            {/* Checkbox entregar en fiscal */}
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={pEntregarFiscal}
                onCheckedChange={(checked) => setPEntregarFiscal(!!checked)}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium text-foreground">Entregar en la dirección fiscal</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  La dirección del RFC. Destildar si la entrega va a otro lado.
                </p>
              </div>
            </label>

            {!pEntregarFiscal && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Dirección de entrega <span className="text-primary">*</span>
                </label>
                <Textarea
                  value={pDireccion}
                  onChange={(e) => setPDireccion(e.target.value)}
                  placeholder="Calle, número, colonia, CP, ciudad..."
                  className="mt-1 min-h-[60px] resize-none"
                />
              </div>
            )}

            <div className="grid grid-cols-[100px_1fr] gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  # sucursal
                </label>
                <Input
                  value={pCodigo}
                  onChange={(e) => setPCodigo(e.target.value)}
                  placeholder="7"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nombre del punto
                </label>
                <Input
                  value={pNombre}
                  onChange={(e) => setPNombre(e.target.value)}
                  placeholder={pEntregarFiscal ? "Matriz" : "BOSQUES"}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Persona de contacto
                </label>
                <Input
                  value={pContacto}
                  onChange={(e) => setPContacto(e.target.value)}
                  placeholder="Sra. Lupita"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Teléfono
                </label>
                <Input
                  value={pTelefono}
                  onChange={(e) => setPTelefono(e.target.value)}
                  placeholder="55 1234 5678"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Horario de entrega
              </label>
              <Input
                value={pHorario}
                onChange={(e) => setPHorario(e.target.value)}
                placeholder="6am - 2pm"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
              <Button onClick={handleSavePunto} disabled={savingPunto}>
                {savingPunto ? "Guardando..." : (editingPunto ? "Guardar cambios" : "Agregar punto")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
