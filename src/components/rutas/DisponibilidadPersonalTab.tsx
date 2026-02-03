import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { 
  CalendarIcon, 
  Users, 
  Truck, 
  UserCheck, 
  UserX,
  Save,
  Loader2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Empleado {
  id: string;
  nombre_completo: string;
  puesto: string;
  activo: boolean;
}

interface Disponibilidad {
  id?: string;
  empleado_id: string;
  fecha: string;
  disponible: boolean;
  hora_entrada: string | null;
  hora_salida: string | null;
  notas: string | null;
}

const DisponibilidadPersonalTab = () => {
  const [fecha, setFecha] = useState<Date>(new Date());
  const [choferes, setChoferes] = useState<Empleado[]>([]);
  const [ayudantes, setAyudantes] = useState<Empleado[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Map<string, Disponibilidad>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [fecha]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load employees (choferes and ayudantes)
      const { data: empleadosData, error: empleadosError } = await supabase
        .from("empleados")
        .select("id, nombre_completo, puesto, activo")
        .eq("activo", true)
        .or("puesto.ilike.%chofer%,puesto.ilike.%ayudante%")
        .order("puesto", { ascending: true })
        .order("nombre_completo");

      if (empleadosError) throw empleadosError;

      const choferesData = empleadosData?.filter(e => 
        e.puesto.toLowerCase().includes("chofer") &&
        !e.puesto.toLowerCase().includes("ayudante")
      ) || [];
      const ayudantesData = empleadosData?.filter(e => 
        e.puesto.toLowerCase().includes("ayudante")
      ) || [];

      setChoferes(choferesData);
      setAyudantes(ayudantesData);

      // Load existing disponibilidades for selected date
      const fechaStr = format(fecha, "yyyy-MM-dd");
      const { data: dispData, error: dispError } = await supabase
        .from("disponibilidad_personal")
        .select("*")
        .eq("fecha", fechaStr);

      if (dispError) throw dispError;

      const dispMap = new Map<string, Disponibilidad>();
      
      // Initialize all employees as available by default
      [...choferesData, ...ayudantesData].forEach(emp => {
        dispMap.set(emp.id, {
          empleado_id: emp.id,
          fecha: fechaStr,
          disponible: true,
          hora_entrada: "08:00",
          hora_salida: "19:00",
          notas: null,
        });
      });

      // Override with saved data
      dispData?.forEach(d => {
        dispMap.set(d.empleado_id, {
          id: d.id,
          empleado_id: d.empleado_id,
          fecha: d.fecha,
          disponible: d.disponible,
          hora_entrada: d.hora_entrada,
          hora_salida: d.hora_salida,
          notas: d.notas,
        });
      });

      setDisponibilidades(dispMap);
      setPendingChanges(new Set());
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDisponibilidad = (empleadoId: string, field: keyof Disponibilidad, value: any) => {
    setDisponibilidades(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(empleadoId);
      if (current) {
        newMap.set(empleadoId, { ...current, [field]: value });
      }
      return newMap;
    });
    setPendingChanges(prev => new Set(prev).add(empleadoId));
  };

  const saveDisponibilidades = async () => {
    setSaving(true);
    try {
      const fechaStr = format(fecha, "yyyy-MM-dd");
      const toUpsert = Array.from(pendingChanges).map(empleadoId => {
        const disp = disponibilidades.get(empleadoId);
        return {
          empleado_id: empleadoId,
          fecha: fechaStr,
          disponible: disp?.disponible ?? true,
          hora_entrada: disp?.hora_entrada || null,
          hora_salida: disp?.hora_salida || null,
          notas: disp?.notas || null,
        };
      });

      if (toUpsert.length > 0) {
        const { error } = await supabase
          .from("disponibilidad_personal")
          .upsert(toUpsert, { onConflict: "fecha,empleado_id" });

        if (error) throw error;
      }

      toast({ title: "Disponibilidad guardada" });
      setPendingChanges(new Set());
      loadData(); // Refresh to get IDs
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const choferesDisponibles = choferes.filter(c => disponibilidades.get(c.id)?.disponible);
  const ayudantesDisponibles = ayudantes.filter(a => disponibilidades.get(a.id)?.disponible);

  const renderEmpleadoRow = (emp: Empleado, tipo: "chofer" | "ayudante") => {
    const disp = disponibilidades.get(emp.id);
    const isDisponible = disp?.disponible ?? true;

    return (
      <div
        key={emp.id}
        className={cn(
          "flex items-center gap-4 p-3 border rounded-lg transition-colors",
          isDisponible ? "bg-green-500/5 border-green-500/20" : "bg-muted/50 border-muted"
        )}
      >
        <Checkbox
          checked={isDisponible}
          onCheckedChange={(checked) => updateDisponibilidad(emp.id, "disponible", checked)}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {tipo === "chofer" ? (
              <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className={cn("font-medium truncate", !isDisponible && "text-muted-foreground")}>
              {emp.nombre_completo}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{emp.puesto}</p>
        </div>

        {isDisponible && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <Input
                type="time"
                value={disp?.hora_entrada || "08:00"}
                onChange={(e) => updateDisponibilidad(emp.id, "hora_entrada", e.target.value)}
                className="w-24 h-8 text-xs"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="time"
                value={disp?.hora_salida || "19:00"}
                onChange={(e) => updateDisponibilidad(emp.id, "hora_salida", e.target.value)}
                className="w-24 h-8 text-xs"
              />
            </div>
          </div>
        )}

        <Badge variant={isDisponible ? "default" : "secondary"} className="flex-shrink-0">
          {isDisponible ? "Disponible" : "No disponible"}
        </Badge>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold">Disponibilidad de Personal</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona quién está disponible para trabajar cada día
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(fecha, "EEEE d MMM", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={fecha}
                onSelect={(d) => d && setFecha(d)}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>

          {pendingChanges.size > 0 && (
            <Button onClick={saveDisponibilidades} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar ({pendingChanges.size})
            </Button>
          )}
        </div>
      </div>

      {/* Quick navigation */}
      <div className="flex gap-2">
        {[-1, 0, 1, 2, 3, 4, 5, 6].map(offset => {
          const d = addDays(new Date(), offset);
          const isSelected = format(d, "yyyy-MM-dd") === format(fecha, "yyyy-MM-dd");
          return (
            <Button
              key={offset}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => setFecha(d)}
              className="flex-1"
            >
              <div className="flex flex-col items-center">
                <span className="text-xs font-normal">
                  {format(d, "EEE", { locale: es })}
                </span>
                <span className="font-medium">{format(d, "d")}</span>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{choferesDisponibles.length}</p>
            <p className="text-xs text-muted-foreground">Choferes disponibles</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{ayudantesDisponibles.length}</p>
            <p className="text-xs text-muted-foreground">Ayudantes disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <UserX className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{choferes.length - choferesDisponibles.length}</p>
            <p className="text-xs text-muted-foreground">Choferes ausentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <UserX className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{ayudantes.length - ayudantesDisponibles.length}</p>
            <p className="text-xs text-muted-foreground">Ayudantes ausentes</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Choferes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Choferes ({choferes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {choferes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay choferes registrados. 
                  Agrega empleados con puesto "Chofer" en el módulo de Empleados.
                </p>
              ) : (
                choferes.map(c => renderEmpleadoRow(c, "chofer"))
              )}
            </CardContent>
          </Card>

          {/* Ayudantes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ayudantes de Chofer ({ayudantes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ayudantes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay ayudantes registrados.
                  Agrega empleados con puesto "Ayudante de Chofer" en el módulo de Empleados.
                </p>
              ) : (
                ayudantes.map(a => renderEmpleadoRow(a, "ayudante"))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DisponibilidadPersonalTab;
