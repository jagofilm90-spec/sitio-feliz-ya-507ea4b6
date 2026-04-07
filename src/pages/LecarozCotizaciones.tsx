import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Cotizacion {
  id: string;
  mes: number;
  anio: number;
  tipo: string;
  version: number;
  estado: string;
  notas: string | null;
  lineas_count?: number;
}

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const GRUPO_LECAROZ_ID = "aaaaaaaa-1eca-4047-aaaa-aaaaaaaaaaaa";

const tipoBadge = (tipo: string) => {
  switch (tipo) {
    case "avio_panaderias": return <Badge className="bg-blue-600 text-white">AVÍO PANADERÍAS</Badge>;
    case "avio_rosticerias": return <Badge className="bg-purple-600 text-white">AVÍO ROSTICERÍAS</Badge>;
    case "azucar": return <Badge className="bg-amber-600 text-white">AZÚCAR</Badge>;
    default: return <Badge>{tipo}</Badge>;
  }
};

const estadoBadge = (estado: string) => {
  const colors: Record<string, string> = {
    vigente: "bg-green-600 text-white",
    borrador: "bg-yellow-500 text-black",
    enviada: "bg-blue-500 text-white",
    historica: "bg-gray-500 text-white",
    rechazada: "bg-red-600 text-white",
  };
  return <Badge className={colors[estado] || ""}>{estado.toUpperCase()}</Badge>;
};

const LecarozCotizaciones = () => {
  const navigate = useNavigate();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTipo, setNewTipo] = useState("avio_panaderias");
  const [newMes, setNewMes] = useState(new Date().getMonth() + 1);
  const [newAnio, setNewAnio] = useState(new Date().getFullYear());
  const [creating, setCreating] = useState(false);

  const fetchCotizaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cotizaciones_lecaroz")
      .select("id, mes, anio, tipo, version, estado, notas")
      .eq("cliente_grupo_id", GRUPO_LECAROZ_ID)
      .order("anio", { ascending: false })
      .order("mes", { ascending: false });

    if (error) {
      toast.error("Error cargando cotizaciones");
      setLoading(false);
      return;
    }

    // Get line counts
    const ids = (data || []).map(c => c.id);
    let lineaCounts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: lineas } = await supabase
        .from("cotizacion_lecaroz_lineas")
        .select("cotizacion_id")
        .in("cotizacion_id", ids);
      if (lineas) {
        lineas.forEach(l => {
          lineaCounts[l.cotizacion_id] = (lineaCounts[l.cotizacion_id] || 0) + 1;
        });
      }
    }

    setCotizaciones((data || []).map(c => ({ ...c, lineas_count: lineaCounts[c.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { fetchCotizaciones(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    // Check max version for this combo
    const { data: existing } = await supabase
      .from("cotizaciones_lecaroz")
      .select("version")
      .eq("cliente_grupo_id", GRUPO_LECAROZ_ID)
      .eq("mes", newMes)
      .eq("anio", newAnio)
      .eq("tipo", newTipo)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;

    const { data, error } = await supabase
      .from("cotizaciones_lecaroz")
      .insert({
        cliente_grupo_id: GRUPO_LECAROZ_ID,
        mes: newMes,
        anio: newAnio,
        tipo: newTipo,
        version: nextVersion,
        estado: "borrador",
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Error al crear cotización");
    } else if (data) {
      toast.success("Cotización creada");
      setShowNew(false);
      navigate(`/lecaroz/cotizaciones/${data.id}`);
    }
    setCreating(false);
  };

  // Group by year
  const byYear = cotizaciones.reduce<Record<number, Cotizacion[]>>((acc, c) => {
    (acc[c.anio] = acc[c.anio] || []).push(c);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cotizaciones Lecaroz</h1>
            <p className="text-muted-foreground text-sm">Gestión de cotizaciones mensuales para Grupo Lecaroz</p>
          </div>
          <Button onClick={() => setShowNew(true)} className="bg-[#C41E3A] hover:bg-[#a01830]">
            <Plus className="h-4 w-4 mr-2" /> Nueva cotización
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : cotizaciones.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No hay cotizaciones</CardContent></Card>
        ) : (
          Object.keys(byYear).sort((a, b) => Number(b) - Number(a)).map(year => (
            <div key={year} className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">{year}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {byYear[Number(year)].map(cot => (
                  <Card
                    key={cot.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/lecaroz/cotizaciones/${cot.id}`)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold">{MESES[cot.mes - 1]} {cot.anio}</span>
                        <span className="text-sm text-muted-foreground">v{cot.version}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {tipoBadge(cot.tipo)}
                        {estadoBadge(cot.estado)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {cot.lineas_count} productos
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Modal nueva cotización */}
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva cotización Lecaroz</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Select value={newTipo} onValueChange={setNewTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avio_panaderias">Avío Panaderías</SelectItem>
                    <SelectItem value="avio_rosticerias">Avío Rosticerías</SelectItem>
                    <SelectItem value="azucar">Azúcar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mes</Label>
                  <Select value={String(newMes)} onValueChange={v => setNewMes(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Año</Label>
                  <Input type="number" value={newAnio} onChange={e => setNewAnio(Number(e.target.value))} min={2024} max={2050} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating} className="bg-[#C41E3A] hover:bg-[#a01830]">
                {creating ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default LecarozCotizaciones;
