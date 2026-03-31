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
  dispositivo: string;
  key: string; // zk_user_id + dispositivo
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
  zk_dispositivo: string | null;
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

    // Get unique zk_user_ids with dispositivo
    const { data: zkData } = await supabase
      .from("asistencia")
      .select("zk_user_id, dispositivo, empleado_id, created_at")
      .order("created_at", { ascending: false });

    // Get all active employees via direct fetch (bypass schema cache for zk_dispositivo)
    const { data: { session } } = await supabase.auth.getSession();
    let empData: any[] | null = null;
    if (session) {
      const empRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?activo=eq.true&select=id,nombre_completo,puesto,zk_id,zk_dispositivo&order=nombre_completo`, {
        headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
      });
      empData = await empRes.json();
      if (!Array.isArray(empData)) empData = null;
    }

    const empleadosList = (empData || []) as Empleado[];
    setEmpleados(empleadosList);

    // Aggregate by zk_user_id + dispositivo
    const zkMap = new Map<string, ZkMapping>();
    const empleadoNames = new Map(empleadosList.map(e => [e.id, e.nombre_completo]));

    for (const row of zkData || []) {
      const disp = row.dispositivo || "desconocido";
      const key = `${row.zk_user_id}_${disp}`;
      if (!zkMap.has(key)) {
        zkMap.set(key, {
          zk_user_id: row.zk_user_id,
          dispositivo: disp,
          key,
          count: 0,
          last_seen: row.created_at,
          empleado_id: row.empleado_id,
          empleado_nombre: row.empleado_id ? (empleadoNames.get(row.empleado_id) || null) : null,
        });
      }
      zkMap.get(key)!.count++;
    }

    // Also check empleados with zk_id set
    for (const emp of empleadosList) {
      if (emp.zk_id) {
        const disp = emp.zk_dispositivo || "oficina";
        const key = `${emp.zk_id}_${disp}`;
        if (!zkMap.has(key)) {
          zkMap.set(key, {
            zk_user_id: emp.zk_id,
            dispositivo: disp,
            key,
            count: 0,
            last_seen: "",
            empleado_id: emp.id,
            empleado_nombre: emp.nombre_completo,
          });
        }
      }
    }

    const sorted = Array.from(zkMap.values()).sort((a, b) =>
      Number(a.zk_user_id) - Number(b.zk_user_id) || a.dispositivo.localeCompare(b.dispositivo)
    );
    setMappings(sorted);

    // Pre-populate selections from existing mappings
    const sels: Record<string, string> = {};
    for (const emp of empleadosList) {
      // Compatible with old data (no zk_dispositivo) — match any dispositivo
      if (emp.zk_id) {
        if (emp.zk_dispositivo) {
          sels[`${emp.zk_id}_${emp.zk_dispositivo}`] = emp.id;
        } else {
          // Old data without dispositivo — try to match any existing key
          for (const mapping of sorted) {
            if (mapping.zk_user_id === emp.zk_id) sels[mapping.key] = emp.id;
          }
        }
      }
    }
    setSelections(sels);

    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (mapping: ZkMapping) => {
    const empleadoId = selections[mapping.key];
    if (!empleadoId) return;

    setSaving(mapping.key);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) throw new Error("Sin sesión");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?id=eq.${empleadoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${s.access_token}`, "Prefer": "return=minimal" },
        body: JSON.stringify({ zk_id: mapping.zk_user_id, zk_dispositivo: mapping.dispositivo }),
      });
      if (!res.ok) throw new Error(await res.text());

      toast({ title: "Vinculado", description: `ZK ID ${mapping.zk_user_id} (${mapping.dispositivo}) vinculado` });
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleUnlink = async (empId: string, zkId: string) => {
    if (!confirm("¿Desvincular este empleado del checador?")) return;
    setSaving(zkId);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) throw new Error("Sin sesión");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?id=eq.${empId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${s.access_token}`, "Prefer": "return=minimal" },
        body: JSON.stringify({ zk_id: null, zk_dispositivo: null }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Desvinculado" });
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
                <TableHead className="w-20">ZK ID</TableHead>
                <TableHead className="w-24">Dispositivo</TableHead>
                <TableHead className="w-20">Registros</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead className="w-20">Estado</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m) => {
                const linkedEmp = empleados.find(e => e.zk_id === m.zk_user_id && (e.zk_dispositivo === m.dispositivo || !e.zk_dispositivo));
                const isLinked = !!linkedEmp;
                return (
                  <TableRow key={m.key}>
                    <TableCell className="font-mono font-bold text-lg">{m.zk_user_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs capitalize ${m.dispositivo === "oficina" ? "bg-blue-50 text-blue-700 border-blue-300" : "bg-orange-50 text-orange-700 border-orange-300"}`}>
                        {m.dispositivo}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.count}</TableCell>
                    <TableCell>
                      {isLinked ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{linkedEmp?.nombre_completo || m.empleado_nombre}</span>
                          <button className="text-xs text-destructive hover:underline" onClick={() => handleUnlink(linkedEmp!.id, m.zk_user_id)}>Desvincular</button>
                        </div>
                      ) : (
                        <Select
                          value={selections[m.key] || ""}
                          onValueChange={(v) => setSelections(prev => ({ ...prev, [m.key]: v }))}
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
                      {!isLinked && selections[m.key] && (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleSave(m)}
                          disabled={saving === m.key}
                        >
                          {saving === m.key ? (
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
