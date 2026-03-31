import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Link2, Check, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface ZkRow { zk_user_id: string; dispositivo: string; registros: number; }
interface Mapeo { zk_user_id: string; dispositivo: string; empleado_id: string; }
interface Emp { id: string; nombre_completo: string; puesto: string; }

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sin sesión");
  return { "Content-Type": "application/json", "apikey": KEY, "Authorization": `Bearer ${session.access_token}` };
}

export function ZkMappingPanel() {
  const [zkRows, setZkRows] = useState<ZkRow[]>([]);
  const [mapeos, setMapeos] = useState<Mapeo[]>([]);
  const [empleados, setEmpleados] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const h = await getHeaders();

      // 1. Get distinct ZK IDs + dispositivo with count from asistencia
      const aRes = await fetch(`${API}/rest/v1/asistencia?select=zk_user_id,dispositivo`, { headers: h });
      const aData = await aRes.json();
      const counts = new Map<string, ZkRow>();
      if (Array.isArray(aData)) {
        for (const r of aData) {
          const key = `${r.zk_user_id}_${r.dispositivo || "desconocido"}`;
          if (!counts.has(key)) counts.set(key, { zk_user_id: r.zk_user_id, dispositivo: r.dispositivo || "desconocido", registros: 0 });
          counts.get(key)!.registros++;
        }
      }
      const rows = Array.from(counts.values()).sort((a, b) => Number(a.zk_user_id) - Number(b.zk_user_id) || a.dispositivo.localeCompare(b.dispositivo));
      setZkRows(rows);

      // 2. Get existing mappings from zk_mapeo
      const mRes = await fetch(`${API}/rest/v1/zk_mapeo?select=zk_user_id,dispositivo,empleado_id`, { headers: h });
      const mData = await mRes.json();
      setMapeos(Array.isArray(mData) ? mData : []);

      // 3. Get active employees
      const eRes = await fetch(`${API}/rest/v1/empleados?activo=eq.true&select=id,nombre_completo,puesto&order=nombre_completo`, { headers: h });
      const eData = await eRes.json();
      setEmpleados(Array.isArray(eData) ? eData : []);
    } catch (e: any) {
      console.error("Error loading ZK data:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const getMapeo = (zkId: string, disp: string) => mapeos.find(m => m.zk_user_id === zkId && m.dispositivo === disp);
  const getEmpName = (empId: string) => empleados.find(e => e.id === empId)?.nombre_completo || "—";
  const mappedEmpIds = new Set(mapeos.map(m => m.empleado_id));

  const handleVincular = async (zkId: string, disp: string) => {
    const key = `${zkId}_${disp}`;
    const empId = selections[key];
    if (!empId) return;
    setSaving(key);
    try {
      const h = await getHeaders();
      // Insert mapping (upsert)
      const res = await fetch(`${API}/rest/v1/zk_mapeo`, {
        method: "POST", headers: { ...h, "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ zk_user_id: zkId, dispositivo: disp, empleado_id: empId }),
      });
      if (!res.ok) throw new Error(await res.text());
      // Update empleado's zk_id field
      await fetch(`${API}/rest/v1/empleados?id=eq.${empId}`, {
        method: "PATCH", headers: { ...h, "Prefer": "return=minimal" },
        body: JSON.stringify({ zk_id: zkId }),
      });
      // Update asistencia records
      await fetch(`${API}/rest/v1/asistencia?zk_user_id=eq.${zkId}&dispositivo=eq.${disp}&empleado_id=is.null`, {
        method: "PATCH", headers: { ...h, "Prefer": "return=minimal" },
        body: JSON.stringify({ empleado_id: empId }),
      });
      toast({ title: "Vinculado", description: `ZK ${zkId} (${disp}) vinculado` });
      await loadData();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSaving(null); }
  };

  const handleDesvincular = async (zkId: string, disp: string) => {
    if (!confirm("¿Desvincular este empleado del checador?")) return;
    const key = `${zkId}_${disp}`;
    setSaving(key);
    try {
      const h = await getHeaders();
      await fetch(`${API}/rest/v1/zk_mapeo?zk_user_id=eq.${zkId}&dispositivo=eq.${disp}`, {
        method: "DELETE", headers: h,
      });
      await fetch(`${API}/rest/v1/asistencia?zk_user_id=eq.${zkId}&dispositivo=eq.${disp}`, {
        method: "PATCH", headers: { ...h, "Prefer": "return=minimal" },
        body: JSON.stringify({ empleado_id: null }),
      });
      toast({ title: "Desvinculado" });
      await loadData();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSaving(null); }
  };

  const linkedCount = zkRows.filter(r => !!getMapeo(r.zk_user_id, r.dispositivo)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5" />
          Mapeo ZKTeco → Empleado
          <Badge variant="secondary" className="ml-auto">{linkedCount}/{zkRows.length} vinculados</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : zkRows.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No hay registros de ZKTeco aún</p>
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
              {zkRows.map((r) => {
                const key = `${r.zk_user_id}_${r.dispositivo}`;
                const mapeo = getMapeo(r.zk_user_id, r.dispositivo);
                const isLinked = !!mapeo;
                return (
                  <TableRow key={key}>
                    <TableCell className="font-mono font-bold text-lg">{r.zk_user_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs capitalize ${r.dispositivo === "oficina" ? "bg-blue-50 text-blue-700 border-blue-300" : "bg-orange-50 text-orange-700 border-orange-300"}`}>
                        {r.dispositivo}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.registros}</TableCell>
                    <TableCell>
                      {isLinked ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{getEmpName(mapeo.empleado_id)}</span>
                          <button className="text-xs text-destructive hover:underline" onClick={() => handleDesvincular(r.zk_user_id, r.dispositivo)}>Desvincular</button>
                        </div>
                      ) : (
                        <Select value={selections[key] || ""} onValueChange={v => setSelections(prev => ({ ...prev, [key]: v }))}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Seleccionar empleado..." /></SelectTrigger>
                          <SelectContent>
                            {empleados.filter(e => !mappedEmpIds.has(e.id)).map(e => (
                              <SelectItem key={e.id} value={e.id}>{e.nombre_completo} ({e.puesto})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {isLinked ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200"><Check className="h-3 w-3 mr-1" />Vinculado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-200">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!isLinked && selections[key] && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleVincular(r.zk_user_id, r.dispositivo)} disabled={saving === key}>
                          {saving === key ? <Loader2 className="h-3 w-3 animate-spin" /> : "Vincular"}
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
