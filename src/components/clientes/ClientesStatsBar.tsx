import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  grupos: number;
  razonesSociales: number;
  sucursales: number;
  geocodificadasPct: number;
}

export function ClientesStatsBar() {
  const [stats, setStats] = useState<Stats>({ grupos: 0, razonesSociales: 0, sucursales: 0, geocodificadasPct: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [gruposRes, razonesRes, sucursalesRes, geoRes] = await Promise.all([
      supabase.from("clientes").select("id", { count: "exact", head: true }).eq("es_grupo", true),
      supabase.from("clientes").select("id", { count: "exact", head: true }).or("es_grupo.eq.false,es_grupo.is.null"),
      supabase.from("cliente_sucursales").select("id", { count: "exact", head: true }).eq("activo", true),
      supabase.from("cliente_sucursales").select("id", { count: "exact", head: true }).eq("activo", true).not("latitud", "is", null),
    ]);

    const totalSuc = sucursalesRes.count || 0;
    const totalGeo = geoRes.count || 0;

    setStats({
      grupos: gruposRes.count || 0,
      razonesSociales: razonesRes.count || 0,
      sucursales: totalSuc,
      geocodificadasPct: totalSuc > 0 ? Math.round((totalGeo / totalSuc) * 100) : 0,
    });
  };

  const items = [
    { label: "Grupos", value: stats.grupos, icon: Building2 },
    { label: "Razones Sociales", value: stats.razonesSociales, icon: Users },
    { label: "Sucursales", value: stats.sucursales, icon: MapPin },
    { label: "Geocodificadas", value: `${stats.geocodificadasPct}%`, icon: Navigation },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <item.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
