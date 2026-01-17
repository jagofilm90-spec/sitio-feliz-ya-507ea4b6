import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Phone, MessageCircle, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface ClienteMoroso {
  id: string;
  nombre: string;
  codigo: string;
  telefono: string | null;
  saldoPendiente: number;
  montoVencido: number;
  diasVencido: number;
  limiteCredito: number | null;
  excedeCredito: boolean;
}

interface FacturaVencida {
  total: number;
  fecha_vencimiento: string;
  cliente_id: string;
}

interface ClienteData {
  id: string;
  nombre: string;
  codigo: string;
  telefono: string | null;
  saldo_pendiente: number | null;
  limite_credito: number | null;
}

// Helper function to avoid TypeScript deep instantiation error
async function fetchFacturasVencidas(hoy: string): Promise<FacturaVencida[]> {
  // Use any to break the type chain
  const result = await (supabase as any)
    .from("facturas")
    .select("total, fecha_vencimiento, cliente_id")
    .lt("fecha_vencimiento", hoy)
    .eq("status", "vigente");
  return (result.data || []) as FacturaVencida[];
}

async function fetchClientesByIds(ids: string[]): Promise<ClienteData[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("clientes")
    .select("id, nombre, codigo, telefono, saldo_pendiente, limite_credito")
    .in("id", ids);
  return (data || []) as ClienteData[];
}

export const CobranzaCriticaPanel = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<ClienteMoroso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMorosos();
  }, []);

  const loadMorosos = async () => {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      const facturas = await fetchFacturasVencidas(hoy);
      const clienteIds = [...new Set(facturas.map(f => f.cliente_id))];
      
      if (clienteIds.length === 0) {
        setClientes([]);
        setLoading(false);
        return;
      }

      const clientesData = await fetchClientesByIds(clienteIds);
      const clientesMap = new Map<string, ClienteMoroso>();

      facturas.forEach(f => {
        const cliente = clientesData.find(c => c.id === f.cliente_id);
        if (!cliente) return;

        const diasVencido = Math.floor(
          (Date.now() - new Date(f.fecha_vencimiento).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (clientesMap.has(cliente.id)) {
          const existing = clientesMap.get(cliente.id)!;
          existing.montoVencido += f.total || 0;
          existing.diasVencido = Math.max(existing.diasVencido, diasVencido);
        } else {
          clientesMap.set(cliente.id, {
            id: cliente.id,
            nombre: cliente.nombre,
            codigo: cliente.codigo,
            telefono: cliente.telefono,
            saldoPendiente: cliente.saldo_pendiente || 0,
            montoVencido: f.total || 0,
            diasVencido,
            limiteCredito: cliente.limite_credito,
            excedeCredito: !!(cliente.limite_credito && cliente.saldo_pendiente && cliente.saldo_pendiente > cliente.limite_credito)
          });
        }
      });

      const sorted = Array.from(clientesMap.values())
        .sort((a, b) => b.montoVencido - a.montoVencido)
        .slice(0, 10);

      setClientes(sorted);
    } catch (error) {
      console.error("Error loading morosos:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const handleWhatsApp = (telefono: string, nombre: string) => {
    const mensaje = encodeURIComponent(`Hola ${nombre}, le contactamos de Almasa respecto a su saldo pendiente.`);
    window.open(`https://wa.me/52${telefono.replace(/\D/g, '')}?text=${mensaje}`, '_blank');
  };

  const getBadgeVariant = (dias: number): "destructive" | "default" | "secondary" => 
    dias > 30 ? "destructive" : dias > 15 ? "default" : "secondary";

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Cobranza Crítica
        </CardTitle>
        <CardDescription>Top 10 clientes con facturas vencidas</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {clientes.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Sin clientes morosos</p>
            </div>
          ) : (
            <div className="divide-y">
              {clientes.map((cliente) => (
                <div key={cliente.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{cliente.nombre}</span>
                        <span className="text-xs text-muted-foreground">{cliente.codigo}</span>
                        {cliente.excedeCredito && (
                          <Badge variant="destructive" className="text-xs">Crédito excedido</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className="text-destructive font-semibold">
                          Vencido: {formatCurrency(cliente.montoVencido)}
                        </span>
                        <Badge variant={getBadgeVariant(cliente.diasVencido)}>
                          {cliente.diasVencido} días
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Saldo total: {formatCurrency(cliente.saldoPendiente)}
                        {cliente.limiteCredito && (
                          <span> • Límite: {formatCurrency(cliente.limiteCredito)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {cliente.telefono && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`tel:${cliente.telefono}`, '_blank')}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600"
                            onClick={() => handleWhatsApp(cliente.telefono!, cliente.nombre)}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/clientes?id=${cliente.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
