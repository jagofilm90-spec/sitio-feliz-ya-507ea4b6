import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Phone, 
  User, 
  Truck, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Empleado {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  puesto: string;
  activo: boolean;
}

interface EmpleadoDocumento {
  fecha_vencimiento: string | null;
}

interface VehiculoAsignacion {
  vehiculo_id: string;
  vehiculo_nombre: string;
  vehiculo_placa: string;
}

interface EmpleadoConVehiculo extends Empleado {
  vehiculo_asignado?: VehiculoAsignacion | null;
  licencia_vencimiento?: string | null;
}

const PersonalFlotillaTab = () => {
  const [empleados, setEmpleados] = useState<EmpleadoConVehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("choferes");
  const { toast } = useToast();

  useEffect(() => {
    loadPersonal();
  }, []);

  const loadPersonal = async () => {
    setLoading(true);
    try {
      // Cargar empleados con puesto de Chofer o Ayudante de Chofer
      const { data: empleadosData, error: empError } = await supabase
        .from("empleados")
        .select("id, nombre_completo, telefono, puesto, activo")
        .in("puesto", ["Chofer", "Ayudante de Chofer"])
        .order("nombre_completo");

      if (empError) throw empError;

      // Cargar licencias de conducir
      const { data: licenciasData, error: licError } = await supabase
        .from("empleados_documentos")
        .select("empleado_id, fecha_vencimiento")
        .eq("tipo_documento", "licencia_conducir");

      if (licError) throw licError;

      // Cargar asignaciones actuales de vehículos
      const { data: vehiculosData, error: vehError } = await supabase
        .from("vehiculos")
        .select("id, nombre, placa, chofer_asignado_id")
        .eq("activo", true);

      if (vehError) throw vehError;

      // Mapear vehículos y licencias a cada empleado
      const empleadosConVehiculo = (empleadosData || []).map((emp) => {
        const vehiculoAsignado = vehiculosData?.find(
          (v) => v.chofer_asignado_id === emp.id
        );
        const licencia = licenciasData?.find(
          (l) => l.empleado_id === emp.id
        );
        return {
          ...emp,
          vehiculo_asignado: vehiculoAsignado
            ? {
                vehiculo_id: vehiculoAsignado.id,
                vehiculo_nombre: vehiculoAsignado.nombre,
                vehiculo_placa: vehiculoAsignado.placa || "",
              }
            : null,
          licencia_vencimiento: licencia?.fecha_vencimiento || null,
        };
      });

      setEmpleados(empleadosConVehiculo);
    } catch (error) {
      console.error("Error loading personal:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el personal de flotilla",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getExpirationBadge = (fechaVencimiento: string | null) => {
    if (!fechaVencimiento) {
      return <Badge variant="secondary">Sin fecha</Badge>;
    }

    const fecha = parseISO(fechaVencimiento);
    const diasRestantes = differenceInDays(fecha, new Date());

    if (diasRestantes < 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vencida
        </Badge>
      );
    } else if (diasRestantes <= 30) {
      return (
        <Badge variant="outline" className="border-destructive text-destructive flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {diasRestantes} días
        </Badge>
      );
    } else if (diasRestantes <= 60) {
      return (
        <Badge variant="outline" className="border-accent-foreground/50 text-accent-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {diasRestantes} días
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="border-primary text-primary flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Vigente
        </Badge>
      );
    }
  };

  const choferes = empleados.filter((e) => e.puesto === "Chofer");
  const ayudantes = empleados.filter((e) => e.puesto === "Ayudante de Chofer");

  const filteredChoferes = choferes.filter((e) =>
    e.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAyudantes = ayudantes.filter((e) =>
    e.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const choferesActivos = choferes.filter((e) => e.activo).length;
  const ayudantesActivos = ayudantes.filter((e) => e.activo).length;
  const licenciasProximasVencer = choferes.filter((c) => {
    if (!c.licencia_vencimiento) return false;
    const dias = differenceInDays(parseISO(c.licencia_vencimiento), new Date());
    return dias >= 0 && dias <= 30;
  }).length;
  const licenciasVencidas = choferes.filter((c) => {
    if (!c.licencia_vencimiento) return false;
    return differenceInDays(parseISO(c.licencia_vencimiento), new Date()) < 0;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Personal de Flotilla</h2>
          <p className="text-sm text-muted-foreground">
            Choferes y ayudantes asignados a rutas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPersonal}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Choferes Activos</p>
                <p className="text-xl font-bold">{choferesActivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Ayudantes Activos</p>
                <p className="text-xl font-bold">{ayudantesActivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-accent/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Licencias por Vencer</p>
                <p className="text-xl font-bold">{licenciasProximasVencer}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Licencias Vencidas</p>
                <p className="text-xl font-bold">{licenciasVencidas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="choferes" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Choferes ({choferes.length})
          </TabsTrigger>
          <TabsTrigger value="ayudantes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ayudantes ({ayudantes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="choferes">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Lista de Choferes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Vehículo Asignado</TableHead>
                    <TableHead>Licencia</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChoferes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No se encontraron choferes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredChoferes.map((chofer) => (
                      <TableRow key={chofer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{chofer.nombre_completo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {chofer.telefono ? (
                            <a
                              href={`tel:${chofer.telefono}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {chofer.telefono}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {chofer.vehiculo_asignado ? (
                            <div className="flex items-center gap-1">
                              <Truck className="h-4 w-4 text-primary" />
                              <span>{chofer.vehiculo_asignado.vehiculo_nombre}</span>
                              {chofer.vehiculo_asignado.vehiculo_placa && (
                                <Badge variant="secondary" className="ml-1 text-xs">
                                  {chofer.vehiculo_asignado.vehiculo_placa}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getExpirationBadge(chofer.licencia_vencimiento)}
                            {chofer.licencia_vencimiento && (
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(chofer.licencia_vencimiento), "dd/MM/yyyy", { locale: es })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={chofer.activo ? "default" : "secondary"}>
                            {chofer.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ayudantes">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Lista de Ayudantes de Chofer</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAyudantes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No se encontraron ayudantes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAyudantes.map((ayudante) => (
                      <TableRow key={ayudante.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{ayudante.nombre_completo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {ayudante.telefono ? (
                            <a
                              href={`tel:${ayudante.telefono}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {ayudante.telefono}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ayudante.activo ? "default" : "secondary"}>
                            {ayudante.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonalFlotillaTab;
