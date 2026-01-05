import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { CreditCard, Phone, Calendar, AlertTriangle, CheckCircle, Clock, MessageCircle } from "lucide-react";
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
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vencido {diasVencido}d
        </Badge>
      );
    } else if (diasVencido >= -7) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Por vencer
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-green-600 border-green-300 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Al corriente
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats - Larger Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Por cobrar</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencido</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.vencido)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-amber-500/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Por vencer</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.porVencer)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-500/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Al corriente</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.alCorriente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter - Larger */}
      <Select value={filtro} onValueChange={setFiltro}>
        <SelectTrigger className="h-14 text-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas" className="text-base py-3">Todas las facturas</SelectItem>
          <SelectItem value="vencidas" className="text-base py-3">Solo vencidas</SelectItem>
          <SelectItem value="por_vencer" className="text-base py-3">Por vencer (7 días)</SelectItem>
          <SelectItem value="al_corriente" className="text-base py-3">Al corriente</SelectItem>
        </SelectContent>
      </Select>

      {/* Invoices List - Larger Items */}
      <ScrollArea className="h-[calc(100vh-520px)] lg:h-[calc(100vh-480px)]">
        <div className="space-y-4">
          {facturasFiltradas.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Sin facturas pendientes</h3>
                <p className="text-muted-foreground">
                  {filtro === "todas" 
                    ? "No tienes facturas pendientes de cobro" 
                    : "No hay facturas con este filtro"}
                </p>
              </CardContent>
            </Card>
          ) : (
            facturasFiltradas.map((factura) => (
              <Card 
                key={factura.id} 
                className={`hover:shadow-md transition-shadow ${
                  factura.dias_vencido > 0 ? "border-destructive/50 bg-destructive/5" : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-semibold text-lg">{factura.folio}</span>
                        {getEstadoBadge(factura.dias_vencido)}
                      </div>
                      <p className="text-base font-medium truncate">{factura.cliente.nombre}</p>
                    </div>
                    <p className="text-2xl font-bold shrink-0">{formatCurrency(factura.total)}</p>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Vence: {factura.fecha_vencimiento 
                          ? format(new Date(factura.fecha_vencimiento), "d 'de' MMMM yyyy", { locale: es })
                          : "Sin fecha"}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      {factura.cliente.telefono && (
                        <>
                          <Button
                            size="default"
                            variant="outline"
                            className="h-11 gap-2"
                            onClick={() => {
                              window.open(`tel:${factura.cliente.telefono}`, '_blank');
                            }}
                          >
                            <Phone className="h-4 w-4" />
                            <span className="hidden sm:inline">Llamar</span>
                          </Button>
                          <Button
                            size="default"
                            variant="default"
                            className="h-11 gap-2"
                            onClick={() => {
                              const tel = factura.cliente.telefono?.replace(/\D/g, '');
                              const mensaje = `Hola, le escribo respecto a la factura ${factura.folio} por ${formatCurrency(factura.total)}. ¿Podría ayudarme con el cobro?`;
                              window.open(`https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`, '_blank');
                            }}
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </Button>
                        </>
                      )}
                    </div>
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
