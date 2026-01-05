import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Search, Plus, MapPin, Phone, Building2, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { VendedorNuevoClienteSheet } from "./VendedorNuevoClienteSheet";

interface Props {
  onClienteCreado: () => void;
}

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  saldo_pendiente: number | null;
  ultimo_pedido?: string | null;
  sucursales_count?: number;
}

export function VendedorMisClientesTab({ onClienteCreado }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("clientes")
        .select(`
          id, codigo, nombre, direccion, telefono, saldo_pendiente,
          sucursales:cliente_sucursales(count)
        `)
        .eq("vendedor_asignado", user.id)
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;

      // Get last order date for each client
      const clientesConUltimoPedido = await Promise.all(
        (data || []).map(async (cliente: any) => {
          const { data: ultimoPedido } = await supabase
            .from("pedidos")
            .select("fecha_pedido")
            .eq("cliente_id", cliente.id)
            .order("fecha_pedido", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...cliente,
            ultimo_pedido: ultimoPedido?.fecha_pedido || null,
            sucursales_count: cliente.sucursales?.[0]?.count || 0
          };
        })
      );

      setClientes(clientesConUltimoPedido);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClienteCreado = () => {
    setShowNuevoCliente(false);
    fetchClientes();
    onClienteCreado();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowNuevoCliente(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo
        </Button>
      </div>

      {/* Client List */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-3">
          {clientesFiltrados.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No se encontraron clientes" : "No tienes clientes asignados"}
                </p>
                <Button 
                  variant="link" 
                  onClick={() => setShowNuevoCliente(true)}
                  className="mt-2"
                >
                  Dar de alta tu primer cliente
                </Button>
              </CardContent>
            </Card>
          ) : (
            clientesFiltrados.map((cliente) => (
              <Card 
                key={cliente.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedCliente(selectedCliente?.id === cliente.id ? null : cliente)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{cliente.nombre}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {cliente.codigo}
                        </Badge>
                      </div>
                      
                      {cliente.direccion && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{cliente.direccion}</span>
                        </div>
                      )}
                      
                      {cliente.telefono && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <a 
                            href={`tel:${cliente.telefono}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cliente.telefono}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      {(cliente.saldo_pendiente || 0) > 0 && (
                        <p className="text-sm font-medium text-amber-600">
                          {formatCurrency(cliente.saldo_pendiente || 0)}
                        </p>
                      )}
                      {cliente.sucursales_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {cliente.sucursales_count} suc.
                        </Badge>
                      )}
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-2" />
                  </div>

                  {/* Expanded view */}
                  {selectedCliente?.id === cliente.id && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Último pedido:</span>
                          <p className="font-medium">
                            {cliente.ultimo_pedido 
                              ? new Date(cliente.ultimo_pedido).toLocaleDateString('es-MX')
                              : "Sin pedidos"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Saldo:</span>
                          <p className="font-medium">
                            {formatCurrency(cliente.saldo_pendiente || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (cliente.telefono) {
                              window.open(`https://wa.me/52${cliente.telefono.replace(/\D/g, '')}`, '_blank');
                            }
                          }}
                          disabled={!cliente.telefono}
                        >
                          WhatsApp
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to new order tab with this client
                            toast.info("Selecciona la pestaña 'Venta' y elige este cliente");
                          }}
                        >
                          Nuevo Pedido
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* New Client Sheet */}
      <VendedorNuevoClienteSheet
        open={showNuevoCliente}
        onOpenChange={setShowNuevoCliente}
        onClienteCreado={handleClienteCreado}
      />
    </div>
  );
}
