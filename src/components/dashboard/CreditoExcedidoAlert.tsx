import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, AlertOctagon, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

interface ClienteCreditoExcedido {
  id: string;
  nombre: string;
  codigo: string;
  saldoPendiente: number;
  limiteCredito: number;
  exceso: number;
  porcentaje: number;
}

export const CreditoExcedidoAlert = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<ClienteCreditoExcedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientesCreditoExcedido();
  }, []);

  const loadClientesCreditoExcedido = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre, codigo, saldo_pendiente, limite_credito")
        .not("limite_credito", "is", null)
        .gt("limite_credito", 0)
        .gt("saldo_pendiente", 0);

      if (error) throw error;

      const excedidos = data
        ?.filter(c => c.saldo_pendiente > c.limite_credito)
        .map(c => ({
          id: c.id,
          nombre: c.nombre,
          codigo: c.codigo,
          saldoPendiente: c.saldo_pendiente,
          limiteCredito: c.limite_credito,
          exceso: c.saldo_pendiente - c.limite_credito,
          porcentaje: Math.round((c.saldo_pendiente / c.limite_credito) * 100)
        }))
        .sort((a, b) => b.exceso - a.exceso) || [];

      setClientes(excedidos);
    } catch (error) {
      console.error("Error loading clientes crédito excedido:", error);
    } finally {
      setLoading(false);
    }
  };

  const fmtCurrency = (value: number) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <Card className="border-orange-200 dark:border-orange-900/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clientes.length === 0) {
    return (
      <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-emerald-700 dark:text-emerald-400">
            <CreditCard className="h-5 w-5" />
            Límites de Crédito
          </CardTitle>
          <CardDescription className="text-emerald-600 dark:text-emerald-500">
            ✓ Todos los clientes dentro de su límite
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 dark:border-orange-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertOctagon className="h-5 w-5 text-orange-500" />
          Crédito Excedido
          <Badge variant="destructive" className="ml-2">
            {clientes.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Clientes que superan su límite de crédito
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="divide-y">
            {clientes.map((cliente) => (
              <div
                key={cliente.id}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cliente.nombre}</span>
                      <span className="text-xs text-muted-foreground">{cliente.codigo}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/clientes?id=${cliente.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Límite:</span>
                    <span>{fmtCurrency(cliente.limiteCredito)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Saldo:</span>
                    <span className="font-semibold">{formatCurrency(cliente.saldoPendiente)}</span>
                  </div>
                  
                  <Progress 
                    value={Math.min(cliente.porcentaje, 200)} 
                    max={200}
                    className="h-2"
                  />
                  
                  <div className="flex justify-between items-center">
                    <Badge variant="destructive" className="text-xs">
                      Excede: {formatCurrency(cliente.exceso)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {cliente.porcentaje}% del límite
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
