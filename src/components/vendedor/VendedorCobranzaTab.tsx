import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { CreditCard, Phone, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Factura {
  id: string;
  folio: string;
  total: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  cliente: {
    id: string;
    nombre: string;
    telefono: string | null;
  };
  dias_vencido: number;
}

export function VendedorCobranzaTab() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [stats, setStats] = useState({
    total: 0,
    vencido: 0,
    porVencer: 0,
    alCorriente: 0
  });

  useEffect(() => {
    fetchFacturas();
  }, []);

  const fetchFacturas = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get my clients
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id")
        .eq("vendedor_asignado", user.id);

      if (!clientesData || clientesData.length === 0) {
        setFacturas([]);
        setLoading(false);
        return;
      }

      const clienteIds = clientesData.map(c => c.id);

      // Get unpaid invoices
      const { data, error } = await supabase
        .from("facturas")
        .select(`
          id, folio, total, fecha_emision, fecha_vencimiento,
          cliente:clientes(id, nombre, telefono)
        `)
        .in("cliente_id", clienteIds)
        .eq("pagada", false)
        .order("fecha_vencimiento", { ascending: true });

      if (error) throw error;

      const hoy = new Date();
      const facturasConDias: Factura[] = (data || []).map((f: any) => {
        const vencimiento = f.fecha_vencimiento ? new Date(f.fecha_vencimiento) : null;
        const diasVencido = vencimiento ? differenceInDays(hoy, vencimiento) : 0;
        return {
          ...f,
          cliente: f.cliente || { id: "", nombre: "Sin cliente", telefono: null },
          dias_vencido: diasVencido
        };
      });

      setFacturas(facturasConDias);

      // Calculate stats
      let total = 0, vencido = 0, porVencer = 0, alCorriente = 0;
      facturasConDias.forEach(f => {
        total += f.total;
        if (f.dias_vencido > 0) {
          vencido += f.total;
        } else if (f.dias_vencido >= -7) {
          porVencer += f.total;
        } else {
          alCorriente += f.total;
        }
      });

      setStats({ total, vencido, porVencer, alCorriente });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  };

  const facturasFiltradas = facturas.filter(f => {
    switch (filtro) {
      case "vencidas":
        return f.dias_vencido > 0;
      case "por_vencer":
        return f.dias_vencido <= 0 && f.dias_vencido >= -7;
      case "al_corriente":
        return f.dias_vencido < -7;
      default:
        return true;
    }
  });

  const getEstadoBadge = (diasVencido: number) => {
    if (diasVencido > 0) {
      return <Badge variant="destructive">Vencido {diasVencido}d</Badge>;
    } else if (diasVencido >= -7) {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Por vencer</Badge>;
    }
    return <Badge variant="outline" className="text-green-600">Al corriente</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CreditCard className="h-4 w-4" />
              <span className="text-xs">Por cobrar</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(stats.total)}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Vencido</span>
            </div>
            <p className="text-xl font-bold text-destructive">{formatCurrency(stats.vencido)}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Por vencer (7 días)</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{formatCurrency(stats.porVencer)}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Al corriente</span>
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(stats.alCorriente)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Select value={filtro} onValueChange={setFiltro}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas las facturas</SelectItem>
          <SelectItem value="vencidas">Solo vencidas</SelectItem>
          <SelectItem value="por_vencer">Por vencer (7 días)</SelectItem>
          <SelectItem value="al_corriente">Al corriente</SelectItem>
        </SelectContent>
      </Select>

      {/* Invoices List */}
      <ScrollArea className="h-[calc(100vh-480px)]">
        <div className="space-y-3">
          {facturasFiltradas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {filtro === "todas" 
                    ? "No tienes facturas pendientes de cobro" 
                    : "No hay facturas con este filtro"}
                </p>
              </CardContent>
            </Card>
          ) : (
            facturasFiltradas.map((factura) => (
              <Card key={factura.id} className={factura.dias_vencido > 0 ? "border-destructive/50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{factura.folio}</span>
                        {getEstadoBadge(factura.dias_vencido)}
                      </div>
                      <p className="text-sm text-muted-foreground">{factura.cliente.nombre}</p>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(factura.total)}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Vence: {factura.fecha_vencimiento 
                          ? format(new Date(factura.fecha_vencimiento), "d MMM yyyy", { locale: es })
                          : "Sin fecha"}
                      </span>
                    </div>
                    
                    {factura.cliente.telefono && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1"
                        onClick={() => {
                          const tel = factura.cliente.telefono?.replace(/\D/g, '');
                          window.open(`https://wa.me/52${tel}`, '_blank');
                        }}
                      >
                        <Phone className="h-3 w-3" />
                        Llamar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
