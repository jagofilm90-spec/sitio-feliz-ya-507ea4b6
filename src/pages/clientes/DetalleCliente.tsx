import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { PageContainer } from "@/components/ui/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { SucursalFormModal } from "@/components/clientes/SucursalFormModal";

interface Zona {
  id: string;
  nombre: string;
  es_foranea?: boolean;
}

const emptySucursalForm = () => ({
  nombre: "",
  codigo_sucursal: "",
  cl: "",
  direccion: "",
  zona_id: "",
  telefono: "",
  contacto: "",
  notas: "",
  horario_entrega: "",
  restricciones_vehiculo: "",
  dias_sin_entrega: "",
  no_combinar_pedidos: false,
  es_rosticeria: false,
  rfc: "",
  razon_social: "",
  direccion_fiscal: "",
  email_facturacion: "",
  latitud: null as number | null,
  longitud: null as number | null,
  metadata_entrega: {},
  sucursal_hermana_id: "",
  sucursal_entrega_id: "",
});

export default function DetalleCliente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cliente, setCliente] = useState<any>(null);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [vendedorNombre, setVendedorNombre] = useState<string>("");
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete client dialog
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Delete punto dialog
  const [deletePuntoTarget, setDeletePuntoTarget] = useState<any>(null);

  // SucursalFormModal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSucursalId, setEditingSucursalId] = useState<string | null>(null);
  const [sucursalFormData, setSucursalFormData] = useState(emptySucursalForm());
  const [savingPunto, setSavingPunto] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [{ data: c }, { data: s }, { data: z }] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", id).single(),
      supabase.from("cliente_sucursales").select("*").eq("cliente_id", id).eq("activo", true).order("created_at"),
      supabase.from("zonas").select("id, nombre").eq("activo", true).order("nombre"),
    ]);
    setCliente(c);
    setSucursales(s || []);
    setZonas(z || []);

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
    setEditingSucursalId(s.id);
    setSucursalFormData({
      nombre: s.nombre || "",
      codigo_sucursal: s.codigo_sucursal || "",
      cl: s.cl || "",
      direccion: s.direccion || "",
      zona_id: s.zona_id || "",
      telefono: s.telefono || "",
      contacto: s.contacto || "",
      notas: s.notas || "",
      horario_entrega: s.horario_entrega || "",
      restricciones_vehiculo: s.restricciones_vehiculo || "",
      dias_sin_entrega: s.dias_sin_entrega || "",
      no_combinar_pedidos: s.no_combinar_pedidos || false,
      es_rosticeria: s.es_rosticeria || false,
      rfc: s.rfc || "",
      razon_social: s.razon_social || "",
      direccion_fiscal: s.direccion_fiscal || "",
      email_facturacion: s.email_facturacion || "",
      latitud: s.latitud || null,
      longitud: s.longitud || null,
      metadata_entrega: s.metadata_entrega || {},
      sucursal_hermana_id: s.sucursal_hermana_id || "",
      sucursal_entrega_id: s.sucursal_entrega_id || "",
    });
    setModalOpen(true);
  };

  const openNewPunto = () => {
    setEditingSucursalId(null);
    setSucursalFormData(emptySucursalForm());
    setModalOpen(true);
  };

  const handleSavePunto = async () => {
    setSavingPunto(true);
    try {
      const data: any = {
        codigo_sucursal: sucursalFormData.codigo_sucursal.trim() || null,
        nombre: sucursalFormData.nombre.trim() || "Principal",
        direccion: sucursalFormData.direccion.trim() || null,
        zona_id: sucursalFormData.zona_id || null,
        contacto: sucursalFormData.contacto.trim() || null,
        telefono: sucursalFormData.telefono.trim() || null,
        horario_entrega: sucursalFormData.horario_entrega || null,
        notas: sucursalFormData.notas.trim() || null,
        restricciones_vehiculo: sucursalFormData.restricciones_vehiculo || null,
        dias_sin_entrega: sucursalFormData.dias_sin_entrega || null,
        no_combinar_pedidos: sucursalFormData.no_combinar_pedidos,
        es_rosticeria: sucursalFormData.es_rosticeria,
        rfc: sucursalFormData.rfc.trim() || null,
        razon_social: sucursalFormData.razon_social.trim() || null,
        direccion_fiscal: sucursalFormData.direccion_fiscal.trim() || null,
        email_facturacion: sucursalFormData.email_facturacion.trim() || null,
        latitud: sucursalFormData.latitud,
        longitud: sucursalFormData.longitud,
        cl: sucursalFormData.cl.trim() || null,
        metadata_entrega: Object.keys(sucursalFormData.metadata_entrega).length > 0 ? sucursalFormData.metadata_entrega : null,
        sucursal_hermana_id: sucursalFormData.sucursal_hermana_id || null,
        sucursal_entrega_id: sucursalFormData.sucursal_entrega_id || null,
      };

      if (editingSucursalId) {
        const { error } = await supabase.from("cliente_sucursales").update(data).eq("id", editingSucursalId);
        if (error) throw error;
        toast({ title: "Punto actualizado" });
      } else {
        const { error } = await supabase.from("cliente_sucursales").insert({ ...data, cliente_id: id, activo: true });
        if (error) throw error;
        toast({ title: "Punto de entrega agregado" });
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingPunto(false);
    }
  };

  const handleDeletePuntoFromModal = async () => {
    if (!editingSucursalId) return;
    const { error } = await supabase
      .from("cliente_sucursales")
      .update({ activo: false })
      .eq("id", editingSucursalId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Punto de entrega eliminado" });
      setModalOpen(false);
      loadData();
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
      <PageContainer maxWidth="medium" className="py-4 space-y-8">
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
                          {s.es_rosticeria && (
                            <Badge variant="secondary" className="text-xs">🍗 Rosticería</Badge>
                          )}
                        </div>
                        {s.direccion && (
                          <p className="text-sm text-muted-foreground pl-6">{s.direccion}</p>
                        )}
                        <div className="flex gap-4 pl-6 text-xs text-muted-foreground flex-wrap">
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
                          {s.zona_id && zonas.find(z => z.id === s.zona_id) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {zonas.find(z => z.id === s.zona_id)?.nombre}
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
      </PageContainer>

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

      {/* SucursalFormModal — unified branch editor */}
      <SucursalFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        formData={sucursalFormData}
        setFormData={setSucursalFormData}
        zonas={zonas}
        isEditing={!!editingSucursalId}
        onSave={handleSavePunto}
        onCancel={() => setModalOpen(false)}
        onDelete={editingSucursalId ? handleDeletePuntoFromModal : undefined}
        clienteNombre={cliente?.razon_social || cliente?.nombre}
        grupoClienteId={cliente?.grupo_cliente_id}
      />
    </Layout>
  );
}
