import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Link2, Check, Loader2 } from "lucide-react";

interface ZkMapping {
  zk_user_id: string;
  count: number;
  last_seen: string;
  empleado_id: string | null;
  empleado_nombre: string | null;
}

interface Empleado {
  id: string;
  nombre_completo: string;
  puesto: string;
  zk_id: string | null;
}

export function ZkMappingPanel() {
  const [mappings, setMappings] = useState<ZkMapping[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);

    // Get unique zk_user_ids with stats
    const { data: zkData } = await supabase
      .from("asistencia")
      .select("zk_user_id, empleado_id, created_at")
      .order("created_at", { ascending: false });

    // Get all active employees
    const { data: empData } = await (supabase as any)
      .from("empleados")
      .select("id, nombre_completo, puesto, zk_id")
      .eq("activo", true)
      .order("nombre_completo");

    const empleadosList = (empData || []) as Empleado[];
    setEmpleados(empleadosList);

    // Aggregate zk_user_ids
    const zkMap = new Map<string, ZkMapping>();
    const empleadoNames = new Map(empleadosList.map(e => [e.id, e.nombre_completo]));

    for (const row of zkData || []) {
      if (!zkMap.has(row.zk_user_id)) {
        zkMap.set(row.zk_user_id, {
          zk_user_id: row.zk_user_id,
          count: 0,
          last_seen: row.created_at,
          empleado_id: row.empleado_id,
          empleado_nombre: row.empleado_id ? (empleadoNames.get(row.empleado_id) || null) : null,
        });
      }
      zkMap.get(row.zk_user_id)!.count++;
    }

    // Also check empleados with zk_id set
    for (const emp of empleadosList) {
      if (emp.zk_id && !zkMap.has(emp.zk_id)) {
        zkMap.set(emp.zk_id, {
          zk_user_id: emp.zk_id,
          count: 0,
          last_seen: "",
          empleado_id: emp.id,
          empleado_nombre: emp.nombre_completo,
        });
      }
    }

    const sorted = Array.from(zkMap.values()).sort((a, b) => 
      Number(a.zk_user_id) - Number(b.zk_user_id)
    );
    setMappings(sorted);

    // Pre-populate selections from existing mappings
    const sels: Record<string, string> = {};
    for (const emp of empleadosList) {
      if (emp.zk_id) sels[emp.zk_id] = emp.id;
    }
    setSelections(sels);

    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (zkUserId: string) => {
    const empleadoId = selections[zkUserId];
    if (!empleadoId) return;

    setSaving(zkUserId);
    try {
      // Update empleado's zk_id
      const { error } = await (supabase as any)
        .from("empleados")
        .update({ zk_id: zkUserId })
        .eq("id", empleadoId);

      if (error) throw error;

      toast({ title: "Vinculado", description: `ZK ID ${zkUserId} vinculado exitosamente` });
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const assignedEmpIds = new Set(
    Object.values(selections).filter(Boolean)
  );

  const linkedCount = mappings.filter(m => m.empleado_id || selections[m.zk_user_id]).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5" />
          Mapeo ZKTeco → Empleado
          <Badge variant="secondary" className="ml-auto">
            {linkedCount}/{mappings.length} vinculados
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : mappings.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No hay registros de ZKTeco aún
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ZK ID</TableHead>
                <TableHead className="w-20">Registros</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead className="w-20">Estado</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m) => {
                const isLinked = !!empleados.find(e => e.zk_id === m.zk_user_id);
                return (
                  <TableRow key={m.zk_user_id}>
                    <TableCell className="font-mono font-bold">{m.zk_user_id}</TableCell>
                    <TableCell>{m.count}</TableCell>
                    <TableCell>
                      {isLinked ? (
                        <span className="text-sm font-medium">{m.empleado_nombre}</span>
                      ) : (
                        <Select
                          value={selections[m.zk_user_id] || ""}
                          onValueChange={(v) => setSelections(prev => ({ ...prev, [m.zk_user_id]: v }))}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Seleccionar empleado..." />
                          </SelectTrigger>
                          <SelectContent>
                            {empleados
                              .filter(e => !e.zk_id && !assignedEmpIds.has(e.id))
                              .map(e => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.nombre_completo} ({e.puesto})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {isLinked ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                          <Check className="h-3 w-3 mr-1" />
                          Vinculado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-200">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!isLinked && selections[m.zk_user_id] && (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleSave(m.zk_user_id)}
                          disabled={saving === m.zk_user_id}
                        >
                          {saving === m.zk_user_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : "Guardar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
