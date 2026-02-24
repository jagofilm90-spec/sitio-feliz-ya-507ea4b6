import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { FileEdit, Trash2, ArrowRight, Store, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Borrador {
  id: string;
  folio: string;
  cliente_id: string;
  cliente_nombre: string;
  sucursal_nombre?: string;
  total: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
  num_productos: number;
}

interface Props {
  onContinuarBorrador: (pedidoId: string, clienteId: string) => void;
  onRefresh?: () => void;
}

export function VendedorBorradoresTab({ onContinuarBorrador, onRefresh }: Props) {
  const [borradores, setBorradores] = useState<Borrador[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchBorradores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id, folio, cliente_id, total, notas, created_at, updated_at,
          clientes!inner(nombre),
          cliente_sucursales(nombre),
          pedidos_detalles(id)
        `)
        .eq("vendedor_id", user.id)
        .eq("status", "borrador")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setBorradores(
        (data || []).map((p: any) => ({
          id: p.id,
          folio: p.folio,
          cliente_id: p.cliente_id,
          cliente_nombre: p.clientes?.nombre || "—",
          sucursal_nombre: p.cliente_sucursales?.nombre,
          total: p.total || 0,
          notas: p.notas,
          created_at: p.created_at,
          updated_at: p.updated_at,
          num_productos: p.pedidos_detalles?.length || 0,
        }))
      );
    } catch (err) {
      console.error("Error fetching borradores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorradores();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      // Delete details first
      await supabase.from("pedidos_detalles").delete().eq("pedido_id", deleteId);
      await supabase.from("pedidos").delete().eq("id", deleteId);
      setBorradores(prev => prev.filter(b => b.id !== deleteId));
      toast.success("Borrador eliminado");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      toast.error("Error al eliminar borrador");
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (borradores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileEdit className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold">Sin borradores</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Los pedidos guardados como borrador aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <FileEdit className="h-5 w-5" />
        Pedidos en Borrador
      </h2>

      {borradores.map(b => (
        <Card key={b.id} className="border-l-4 border-l-muted-foreground">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-semibold truncate">{b.cliente_nombre}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{b.folio}</span>
                  <span>·</span>
                  <span>{b.num_productos} producto{b.num_productos !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span className="font-semibold text-foreground">{formatCurrency(b.total)}</span>
                </div>
                {b.sucursal_nombre && (
                  <p className="text-xs text-muted-foreground mt-0.5">{b.sucursal_nombre}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(b.updated_at), { locale: es, addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onContinuarBorrador(b.id, b.cliente_id)}
                >
                  Continuar
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(b.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Eliminar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar borrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Este borrador se eliminará permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
