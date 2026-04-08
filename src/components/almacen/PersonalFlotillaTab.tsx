import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Phone, User, Truck, AlertTriangle, CheckCircle, Clock, Users, RefreshCw, Pencil, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";

interface Empleado {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  puesto: string;
  activo: boolean;
}

interface EmpleadoConVehiculo extends Empleado {
  vehiculo_asignado?: { vehiculo_id: string; vehiculo_nombre: string; vehiculo_placa: string } | null;
  licencia_vencimiento?: string | null;
}

interface Vehiculo {
  id: string;
  nombre: string;
  placa: string | null;
  chofer_asignado_id: string | null;
}

const PersonalFlotillaTab = () => {
  const [empleados, setEmpleados] = useState<EmpleadoConVehiculo[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("choferes");

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [choferEditar, setChoferEditar] = useState<EmpleadoConVehiculo | null>(null);
  const [editTelefono, setEditTelefono] = useState("");
  const [editVehiculoId, setEditVehiculoId] = useState("ninguno");
  const [editFechaLicencia, setEditFechaLicencia] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Toggle active
  const [toggleTarget, setToggleTarget] = useState<EmpleadoConVehiculo | null>(null);

  const { toast } = useToast();

  useEffect(() => { loadPersonal(); }, []);

  const loadPersonal = async () => {
    setLoading(true);
    try {
      const [empRes, licRes, vehRes] = await Promise.all([
        supabase.from("empleados").select("id, nombre_completo, telefono, puesto, activo").in("puesto", ["Chofer", "Ayudante de Chofer"]).order("nombre_completo"),
        supabase.from("empleados_documentos").select("empleado_id, fecha_vencimiento").eq("tipo_documento", "licencia_conducir"),
        supabase.from("vehiculos").select("id, nombre, placa, chofer_asignado_id").eq("activo", true),
      ]);

      if (empRes.error) throw empRes.error;
      setVehiculos(vehRes.data || []);

      const mapped = (empRes.data || []).map(emp => {
        const veh = vehRes.data?.find(v => v.chofer_asignado_id === emp.id);
        const lic = licRes.data?.find(l => l.empleado_id === emp.id);
        return {
          ...emp,
          vehiculo_asignado: veh ? { vehiculo_id: veh.id, vehiculo_nombre: veh.nombre, vehiculo_placa: veh.placa || "" } : null,
          licencia_vencimiento: lic?.fecha_vencimiento || null,
        };
      });
      setEmpleados(mapped);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "No se pudo cargar el personal", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getExpirationBadge = (fecha: string | null) => {
    if (!fecha) return <Badge variant="secondary">Sin fecha</Badge>;
    const dias = differenceInDays(parseISO(fecha), new Date());
    if (dias < 0) return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Vencida</Badge>;
    if (dias <= 30) return <Badge variant="outline" className="border-destructive text-destructive"><Clock className="h-3 w-3 mr-1" />{dias}d</Badge>;
    if (dias <= 60) return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{dias}d</Badge>;
    return <Badge variant="outline" className="border-primary text-primary"><CheckCircle className="h-3 w-3 mr-1" />Vigente</Badge>;
  };

  // Open edit dialog
  const openEdit = (emp: EmpleadoConVehiculo) => {
    setChoferEditar(emp);
    setEditTelefono(emp.telefono || "");
    setEditVehiculoId(emp.vehiculo_asignado?.vehiculo_id || "ninguno");
    setEditFechaLicencia(emp.licencia_vencimiento || "");
    setEditDialogOpen(true);
  };

  // Save edit
  const handleGuardar = async () => {
    if (!choferEditar) return;
    setGuardando(true);
    try {
      // 1. Update phone
      await supabase.from("empleados").update({ telefono: editTelefono || null }).eq("id", choferEditar.id);

      // 2. Update vehicle assignment
      const oldVehId = choferEditar.vehiculo_asignado?.vehiculo_id;
      const newVehId = editVehiculoId === "ninguno" ? null : editVehiculoId;

      if (oldVehId !== newVehId) {
        // Unassign old
        if (oldVehId) await supabase.from("vehiculos").update({ chofer_asignado_id: null }).eq("id", oldVehId);
        // Assign new
        if (newVehId) await supabase.from("vehiculos").update({ chofer_asignado_id: choferEditar.id }).eq("id", newVehId);
      }

      // 3. Update license (only for choferes)
      if (choferEditar.puesto === "Chofer" && editFechaLicencia) {
        const { data: existing } = await supabase
          .from("empleados_documentos")
          .select("id")
          .eq("empleado_id", choferEditar.id)
          .eq("tipo_documento", "licencia_conducir")
          .maybeSingle();

        if (existing) {
          await supabase.from("empleados_documentos").update({ fecha_vencimiento: editFechaLicencia }).eq("id", existing.id);
        } else {
          await supabase.from("empleados_documentos").insert({
            empleado_id: choferEditar.id,
            tipo_documento: "licencia_conducir",
            nombre_archivo: "licencia_conducir",
            ruta_storage: "",
            fecha_vencimiento: editFechaLicencia,
          });
        }
      }

      toast({ title: "Datos actualizados" });
      setEditDialogOpen(false);
      loadPersonal();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  };

  // Toggle active
  const handleToggleActivo = async () => {
    if (!toggleTarget) return;
    try {
      await supabase.from("empleados").update({ activo: !toggleTarget.activo }).eq("id", toggleTarget.id);
      toast({ title: toggleTarget.activo ? "Empleado desactivado" : "Empleado reactivado" });
      setToggleTarget(null);
      loadPersonal();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Data
  const choferes = empleados.filter(e => e.puesto === "Chofer");
  const ayudantes = empleados.filter(e => e.puesto === "Ayudante de Chofer");
  const filtered = (list: EmpleadoConVehiculo[]) => list.filter(e => e.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()));

  const choferesActivos = choferes.filter(e => e.activo).length;
  const ayudantesActivos = ayudantes.filter(e => e.activo).length;
  const licProximas = choferes.filter(c => c.licencia_vencimiento && differenceInDays(parseISO(c.licencia_vencimiento), new Date()) >= 0 && differenceInDays(parseISO(c.licencia_vencimiento), new Date()) <= 30).length;
  const licVencidas = choferes.filter(c => c.licencia_vencimiento && differenceInDays(parseISO(c.licencia_vencimiento), new Date()) < 0).length;

  // Available vehicles for select (not assigned to someone else)
  const vehiculosDisponibles = vehiculos.filter(v => !v.chofer_asignado_id || v.chofer_asignado_id === choferEditar?.id);

  if (loading) return <div className="flex items-center justify-center h-64"><AlmasaLoading size={48} /></div>;

  const renderTable = (list: EmpleadoConVehiculo[], isChofer: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Teléfono</TableHead>
          {isChofer && <TableHead>Vehículo</TableHead>}
          {isChofer && <TableHead>Licencia</TableHead>}
          <TableHead>Estado</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.length === 0 ? (
          <TableRow><TableCell colSpan={isChofer ? 6 : 4} className="text-center py-8 text-muted-foreground">No se encontraron</TableCell></TableRow>
        ) : list.map(emp => (
          <TableRow key={emp.id} className={!emp.activo ? "opacity-50" : ""}>
            <TableCell>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{emp.nombre_completo}</span>
              </div>
            </TableCell>
            <TableCell>
              {emp.telefono ? (
                <a href={`tel:${emp.telefono}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Phone className="h-3 w-3" />{emp.telefono}
                </a>
              ) : <span className="text-muted-foreground">—</span>}
            </TableCell>
            {isChofer && (
              <TableCell>
                {emp.vehiculo_asignado ? (
                  <div className="flex items-center gap-1">
                    <Truck className="h-4 w-4 text-primary" />
                    <span>{emp.vehiculo_asignado.vehiculo_nombre}</span>
                    {emp.vehiculo_asignado.vehiculo_placa && <Badge variant="secondary" className="ml-1 text-xs">{emp.vehiculo_asignado.vehiculo_placa}</Badge>}
                  </div>
                ) : <span className="text-muted-foreground">Sin asignar</span>}
              </TableCell>
            )}
            {isChofer && (
              <TableCell>
                <div className="flex flex-col gap-1">
                  {getExpirationBadge(emp.licencia_vencimiento)}
                  {emp.licencia_vencimiento && <span className="text-xs text-muted-foreground">{format(parseISO(emp.licencia_vencimiento), "dd/MM/yyyy")}</span>}
                </div>
              </TableCell>
            )}
            <TableCell>
              <Badge
                variant={emp.activo ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setToggleTarget(emp)}
              >
                {emp.activo ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => openEdit(emp)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Personal de Flotilla</h2>
          <p className="text-sm text-muted-foreground">Choferes y ayudantes asignados a rutas</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPersonal}><RefreshCw className="h-4 w-4 mr-2" />Actualizar</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-primary/5"><CardContent className="p-3"><div className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Choferes Activos</p><p className="text-xl font-bold">{choferesActivos}</p></div></div></CardContent></Card>
        <Card className="bg-secondary/50"><CardContent className="p-3"><div className="flex items-center gap-2"><Users className="h-5 w-5" /><div><p className="text-xs text-muted-foreground">Ayudantes Activos</p><p className="text-xl font-bold">{ayudantesActivos}</p></div></div></CardContent></Card>
        <Card className="bg-accent/50"><CardContent className="p-3"><div className="flex items-center gap-2"><Clock className="h-5 w-5" /><div><p className="text-xs text-muted-foreground">Lic. por Vencer</p><p className="text-xl font-bold">{licProximas}</p></div></div></CardContent></Card>
        <Card className="bg-destructive/10"><CardContent className="p-3"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /><div><p className="text-xs text-muted-foreground">Lic. Vencidas</p><p className="text-xl font-bold">{licVencidas}</p></div></div></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="choferes"><Truck className="h-4 w-4 mr-2" />Choferes ({choferes.length})</TabsTrigger>
          <TabsTrigger value="ayudantes"><Users className="h-4 w-4 mr-2" />Ayudantes ({ayudantes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="choferes"><Card><CardContent className="p-0">{renderTable(filtered(choferes), true)}</CardContent></Card></TabsContent>
        <TabsContent value="ayudantes"><Card><CardContent className="p-0">{renderTable(filtered(ayudantes), false)}</CardContent></Card></TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Editar: {choferEditar?.nombre_completo}</DialogTitle>
          </DialogHeader>
          {choferEditar && (
            <div className="space-y-5 py-2">
              {/* Phone */}
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={editTelefono} onChange={e => setEditTelefono(e.target.value)} placeholder="55 1234 5678" className="h-12 text-lg" />
              </div>

              {/* Vehicle (choferes only) */}
              {choferEditar.puesto === "Chofer" && (
                <div className="space-y-2">
                  <Label>Vehículo asignado</Label>
                  <Select value={editVehiculoId} onValueChange={setEditVehiculoId}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguno">Sin vehículo</SelectItem>
                      {vehiculosDisponibles.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            {v.nombre} {v.placa ? `(${v.placa})` : ""}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* License (choferes only) */}
              {choferEditar.puesto === "Chofer" && (
                <div className="space-y-2">
                  <Label>Vencimiento de licencia</Label>
                  <Input type="date" value={editFechaLicencia} onChange={e => setEditFechaLicencia(e.target.value)} className="h-12" />
                  {editFechaLicencia && (
                    <div className="mt-1">{getExpirationBadge(editFechaLicencia)}</div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col items-stretch gap-2">
            <Button className="h-12" onClick={handleGuardar} disabled={guardando}>
              {guardando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : "Guardar Cambios"}
            </Button>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={guardando}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Active Confirmation */}
      <AlertDialog open={!!toggleTarget} onOpenChange={open => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggleTarget?.activo ? "¿Desactivar" : "¿Reactivar"} a {toggleTarget?.nombre_completo}?</AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.activo
                ? "No podrá ser asignado a rutas mientras esté inactivo."
                : "Volverá a estar disponible para asignación de rutas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActivo} className={toggleTarget?.activo ? "bg-destructive text-destructive-foreground" : ""}>
              {toggleTarget?.activo ? "Desactivar" : "Reactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PersonalFlotillaTab;
