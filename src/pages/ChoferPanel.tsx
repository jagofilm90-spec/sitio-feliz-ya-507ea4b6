import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Truck, MapPin, Package, User, LogOut, Navigation } from "lucide-react";
import { EntregaCard } from "@/components/chofer/EntregaCard";
import { ResumenRuta } from "@/components/chofer/ResumenRuta";

export default function ChoferPanel() {
  const navigate = useNavigate();
  const { isChofer, isAdmin, isLoading: rolesLoading } = useUserRoles();
  const [loading, setLoading] = useState(true);
  const [ruta, setRuta] = useState<any>(null);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [choferNombre, setChoferNombre] = useState("");
  const [showResumen, setShowResumen] = useState(false);

  useEffect(() => {
    if (!rolesLoading && !isChofer && !isAdmin) {
      toast.error("No tienes acceso a esta sección");
      navigate("/");
    }
  }, [rolesLoading, isChofer, isAdmin, navigate]);

  useEffect(() => {
    if (!rolesLoading && (isChofer || isAdmin)) {
      fetchRutaDelDia();
    }
  }, [rolesLoading, isChofer, isAdmin]);

  const fetchRutaDelDia = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: empleado } = await supabase
        .from("empleados")
        .select("id, nombre_completo")
        .eq("user_id", user.id)
        .maybeSingle();

      if (empleado) setChoferNombre(empleado.nombre_completo);

      const hoy = format(new Date(), "yyyy-MM-dd");

      let query = supabase
        .from("rutas")
        .select(`id, folio, fecha_ruta, status, tipo_ruta, distancia_total_km,
          vehiculo:vehiculos(id, nombre, placas),
          ayudante:empleados!rutas_ayudante_id_fkey(id, nombre_completo),
          ayudante_externo:ayudantes_externos(id, nombre_completo)`)
        .eq("fecha_ruta", hoy)
        .in("status", ["programada", "cargando", "cargada", "en_ruta"]);

      if (!isAdmin && empleado) query = query.eq("chofer_id", empleado.id);

      const { data: rutaData } = await query.limit(1).maybeSingle();
      if (!rutaData) { setRuta(null); setEntregas([]); setLoading(false); return; }

      setRuta(rutaData);

      const { data: entregasData } = await supabase
        .from("entregas")
        .select(`id, orden_entrega, entregado, status_entrega, nombre_receptor, firma_recibido, hora_entrega_real, notas,
          pedido:pedidos(id, folio, peso_total_kg, notas,
            cliente:clientes(id, nombre),
            sucursal:cliente_sucursales(id, nombre, direccion, latitud, longitud, telefono, contacto, horario_entrega),
            detalles:pedidos_detalles(id, cantidad, es_cortesia, producto:productos(id, nombre, unidad_comercial)))`)
        .eq("ruta_id", rutaData.id)
        .order("orden_entrega", { ascending: true });

      setEntregas(entregasData || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar la ruta");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizarRuta = async () => {
    if (!ruta) return;
    const { error } = await supabase.from("rutas").update({ status: "completada" }).eq("id", ruta.id);
    if (error) { toast.error("Error al finalizar"); return; }
    toast.success("¡Ruta finalizada!");
    setShowResumen(false);
    fetchRutaDelDia();
  };

  useEffect(() => {
    if (entregas.length > 0) {
      const todas = entregas.every(e => ["entregado", "rechazado", "parcial"].includes(e.status_entrega));
      if (todas) setShowResumen(true);
    }
  }, [entregas]);

  if (rolesLoading || loading) {
    return <div className="min-h-screen bg-background p-4"><Skeleton className="h-24 w-full mb-4" /><Skeleton className="h-40 w-full" /></div>;
  }

  const completadas = entregas.filter(e => ["entregado", "rechazado", "parcial"].includes(e.status_entrega)).length;
  const progreso = entregas.length > 0 ? Math.round((completadas / entregas.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8" />
            <div>
              <h1 className="text-lg font-bold">Panel del Chofer</h1>
              <p className="text-sm opacity-90">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { supabase.auth.signOut(); navigate("/auth"); }} className="text-primary-foreground hover:bg-primary-foreground/20">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        {choferNombre && <div className="flex items-center gap-2 mt-2 text-sm"><User className="h-4 w-4" /><span>{choferNombre}</span></div>}
      </header>

      <main className="p-4 pb-24">
        {!ruta ? (
          <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Truck className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sin ruta asignada</h2>
            <p className="text-muted-foreground">No tienes rutas programadas para hoy</p>
          </CardContent></Card>
        ) : (
          <>
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><Navigation className="h-5 w-5 text-primary" />Ruta {ruta.folio}</CardTitle>
                  <Badge variant={ruta.tipo_ruta === "foraneo" ? "secondary" : "outline"}>{ruta.tipo_ruta === "foraneo" ? "Foráneo" : "Local"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm"><Truck className="h-4 w-4 text-muted-foreground" /><span>{ruta.vehiculo?.nombre || "Sin vehículo"} {ruta.vehiculo?.placas && `(${ruta.vehiculo.placas})`}</span></div>
                {(ruta.ayudante || ruta.ayudante_externo) && <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span>Ayudante: {ruta.ayudante?.nombre_completo || ruta.ayudante_externo?.nombre_completo}</span></div>}
                {ruta.distancia_total_km && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{ruta.distancia_total_km} km</span></div>}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1"><span className="text-muted-foreground">Progreso</span><span className="font-medium">{completadas}/{entregas.length} entregas</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progreso}%` }} /></div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><Package className="h-5 w-5" />Entregas del día ({entregas.length})</h2>
              <ScrollArea className="h-[calc(100vh-380px)]">
                <div className="space-y-3 pr-2">
                  {entregas.map((entrega) => <EntregaCard key={entrega.id} entrega={entrega} onEntregaActualizada={fetchRutaDelDia} />)}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </main>

      {showResumen && ruta && <ResumenRuta ruta={ruta} entregas={entregas} onFinalizar={handleFinalizarRuta} onCerrar={() => setShowResumen(false)} />}
    </div>
  );
}
