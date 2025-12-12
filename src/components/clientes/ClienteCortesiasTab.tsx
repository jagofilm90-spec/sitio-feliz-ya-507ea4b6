import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Gift, Plus, Search, Trash2, Loader2 } from "lucide-react";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string;
}

interface Cortesia {
  id: string;
  producto_id: string;
  cantidad: number;
  notas: string | null;
  producto: Producto;
}

interface ClienteCortesiasTabProps {
  clienteId: string;
  clienteNombre: string;
}

export const ClienteCortesiasTab = ({ clienteId, clienteNombre }: ClienteCortesiasTabProps) => {
  const [cortesias, setCortesias] = useState<Cortesia[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCortesias();
    loadProductos();
  }, [clienteId]);

  const loadCortesias = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cliente_cortesias_default")
      .select(`
        id,
        producto_id,
        cantidad,
        notas,
        producto:productos(id, codigo, nombre, unidad)
      `)
      .eq("cliente_id", clienteId)
      .eq("activo", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCortesias(data.map((c: any) => ({
        ...c,
        producto: c.producto as Producto
      })));
    }
    setLoading(false);
  };

  const loadProductos = async () => {
    const { data } = await supabase
      .from("productos")
      .select("id, codigo, nombre, unidad")
      .eq("activo", true)
      .order("nombre");

    if (data) {
      setProductos(data);
    }
  };

  const filteredProductos = productos.filter(p =>
    !cortesias.some(c => c.producto_id === p.id) &&
    (p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddCortesia = async (producto: Producto) => {
    const { data, error } = await supabase
      .from("cliente_cortesias_default")
      .insert({
        cliente_id: clienteId,
        producto_id: producto.id,
        cantidad: 1,
        activo: true,
      })
      .select(`
        id,
        producto_id,
        cantidad,
        notas,
        producto:productos(id, codigo, nombre, unidad)
      `)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar la cortesía",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setCortesias([...cortesias, {
        ...data,
        producto: data.producto as unknown as Producto
      }]);
      toast({
        title: "Cortesía agregada",
        description: `${producto.nombre} se enviará automáticamente en cada pedido`,
      });
    }
    setSearchTerm("");
    setShowSearch(false);
  };

  const handleUpdateCantidad = async (cortesiaId: string, cantidad: number) => {
    const { error } = await supabase
      .from("cliente_cortesias_default")
      .update({ cantidad })
      .eq("id", cortesiaId);

    if (!error) {
      setCortesias(cortesias.map(c => 
        c.id === cortesiaId ? { ...c, cantidad } : c
      ));
    }
  };

  const handleRemoveCortesia = async (cortesiaId: string) => {
    const { error } = await supabase
      .from("cliente_cortesias_default")
      .update({ activo: false })
      .eq("id", cortesiaId);

    if (!error) {
      setCortesias(cortesias.filter(c => c.id !== cortesiaId));
      toast({
        title: "Cortesía eliminada",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Cortesías Predeterminadas</h3>
          <Badge variant="secondary" className="text-xs">
            {cortesias.length} producto{cortesias.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSearch(!showSearch)}
          className="text-amber-600 border-amber-300 hover:bg-amber-50"
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar Cortesía
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Estos productos se agregarán automáticamente sin cargo a cada pedido de {clienteNombre}.
      </p>

      {showSearch && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto para agregar como cortesía..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          {searchTerm && (
            <ScrollArea className="max-h-48">
              {filteredProductos.length > 0 ? (
                <div className="space-y-1">
                  {filteredProductos.slice(0, 10).map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAddCortesia(p)}
                      className="w-full px-3 py-2 text-left hover:bg-amber-100 rounded flex justify-between items-center"
                    >
                      <span>
                        <span className="font-mono text-xs mr-2">{p.codigo}</span>
                        {p.nombre}
                      </span>
                      <Badge className="bg-amber-500 text-white">Agregar</Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No se encontraron productos
                </p>
              )}
            </ScrollArea>
          )}
        </div>
      )}

      {cortesias.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="w-32">Cantidad</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cortesias.map((c) => (
              <TableRow key={c.id} className="bg-amber-50/50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-amber-500" />
                    <span className="font-mono text-xs">{c.producto.codigo}</span>
                    <span>{c.producto.nombre}</span>
                    <Badge className="bg-amber-500 text-white text-xs">CORTESÍA</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={c.cantidad}
                      onChange={(e) => handleUpdateCantidad(c.id, Number(e.target.value))}
                      className="w-20 h-8"
                    />
                    <span className="text-sm text-muted-foreground">{c.producto.unidad}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCortesia(c.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 bg-muted/30 rounded-lg">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            No hay cortesías configuradas para este cliente
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Agrega productos que se enviarán sin cargo en cada pedido
          </p>
        </div>
      )}
    </div>
  );
};
