import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ChevronUp, ChevronDown, Check, Clock } from "lucide-react";
import { formatCurrency } from "@/hooks/useListaPrecios";
import { redondear } from "@/lib/calculos";
import { notificarCambioPrecio } from "@/lib/notificarVendedores";

interface RevisionesPrecioPanelProps {
  onPriceApplied?: () => void;
  notifyOnApply?: boolean;
}

export function RevisionesPrecioPanel({ onPriceApplied, notifyOnApply = false }: RevisionesPrecioPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewPanelOpen, setReviewPanelOpen] = useState(true);
  const [parcialMode, setParcialMode] = useState<Record<string, boolean>>({});
  const [parcialPrecio, setParcialPrecio] = useState<Record<string, string>>({});

  const { data: revisionesPendientes = [], refetch: refetchRevisiones } = useQuery({
    queryKey: ["revisiones-precio-pendientes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("productos_revision_precio")
        .select("*, productos:producto_id(id, codigo, nombre, unidad, precio_por_kilo, peso_kg)")
        .in("status", ["pendiente", "parcial"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const applyReviewMutation = useMutation({
    mutationFn: async ({ reviewId, productoId, nuevoPrecio, tipo }: { reviewId: string; productoId: string; nuevoPrecio: number; tipo: "completado" | "parcial" | "ignorado" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      if (tipo !== "ignorado") {
        const { data: prodData } = await supabase.from("productos").select("precio_venta").eq("id", productoId).single();
        const precioAnterior = prodData?.precio_venta ?? 0;
        await supabase.from("productos").update({ precio_venta: nuevoPrecio }).eq("id", productoId);
        if (precioAnterior !== nuevoPrecio) {
          await supabase.from("productos_historial_precios").insert({
            producto_id: productoId, precio_anterior: precioAnterior, precio_nuevo: nuevoPrecio, usuario_id: user.id,
          });
          if (notifyOnApply) {
            const review = revisionesPendientes.find((r: any) => r.id === reviewId);
            notificarCambioPrecio({ productoNombre: review?.productos?.nombre || "", precioAnterior, precioNuevo: nuevoPrecio, roles: ["secretaria", "vendedor"] });
          }
        }
      }

      const review = revisionesPendientes.find((r: any) => r.id === reviewId);
      const pendienteRestante = tipo === "parcial" && review ? redondear(review.precio_venta_sugerido - nuevoPrecio) : 0;

      await (supabase as any).from("productos_revision_precio").update({
        status: tipo,
        ajuste_aplicado: tipo !== "ignorado" ? redondear(nuevoPrecio - (review?.precio_venta_actual || 0)) : 0,
        pendiente_ajuste: pendienteRestante,
        resuelto_por: user.id,
        resuelto_at: new Date().toISOString(),
      }).eq("id", reviewId);
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.tipo === "completado" ? "Precio actualizado" : vars.tipo === "parcial" ? "Precio parcialmente actualizado" : "Revisión pospuesta" });
      queryClient.invalidateQueries({ queryKey: ["lista-precios"] });
      refetchRevisiones();
      onPriceApplied?.();
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  if (revisionesPendientes.length === 0) return null;

  return (
    <Collapsible open={reviewPanelOpen} onOpenChange={setReviewPanelOpen}>
      <div className="mb-4 border border-orange-300 rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 bg-orange-50 cursor-pointer hover:bg-orange-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-800">
                {revisionesPendientes.length} producto(s) con ajuste de precio pendiente
              </span>
            </div>
            {reviewPanelOpen ? <ChevronUp className="h-4 w-4 text-orange-600" /> : <ChevronDown className="h-4 w-4 text-orange-600" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 space-y-3 max-h-[400px] overflow-auto">
            {revisionesPendientes.map((rev: any) => {
              const prod = rev.productos;
              const isParcialMode = parcialMode[rev.id];
              const margenInput = parseFloat(parcialPrecio[rev.id] || "") || 0;
              return (
                <div key={rev.id} className="p-3 border rounded-lg bg-background space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{prod?.nombre || "Producto"}</span>
                      <span className="text-xs text-muted-foreground ml-2">{prod?.codigo}</span>
                    </div>
                    {rev.status === "parcial" && <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">Parcial</Badge>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Costo:</span> <span className="font-medium">{formatCurrency(rev.costo_anterior)}&rarr;{formatCurrency(rev.costo_nuevo)}</span></div>
                    <div><span className="text-muted-foreground">Precio actual:</span> <span className="font-medium">{formatCurrency(rev.precio_venta_actual)}</span></div>
                    <div><span className="text-muted-foreground">Sugerido:</span> <span className="font-semibold text-orange-600">{formatCurrency(rev.precio_venta_sugerido)}</span></div>
                    <div><span className="text-muted-foreground">Pendiente:</span> <span className="font-medium">+{formatCurrency(rev.pendiente_ajuste)}</span></div>
                  </div>
                  {isParcialMode ? (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs shrink-0">Precio:</Label>
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                        <Input type="number" step="0.01" className="pl-6 h-8 text-xs" value={parcialPrecio[rev.id] || ""} onChange={e => setParcialPrecio(p => ({ ...p, [rev.id]: e.target.value }))} />
                      </div>
                      <Button size="sm" className="h-8 text-xs" disabled={!margenInput || applyReviewMutation.isPending}
                        onClick={() => applyReviewMutation.mutate({ reviewId: rev.id, productoId: rev.producto_id, nuevoPrecio: margenInput, tipo: "parcial" })}>Aplicar</Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setParcialMode(p => ({ ...p, [rev.id]: false }))}>Cancelar</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" className="h-7 text-xs" disabled={applyReviewMutation.isPending}
                        onClick={() => applyReviewMutation.mutate({ reviewId: rev.id, productoId: rev.producto_id, nuevoPrecio: rev.precio_venta_sugerido, tipo: "completado" })}>
                        <Check className="h-3 w-3 mr-1" /> Aplicar completo
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => { setParcialMode(p => ({ ...p, [rev.id]: true })); setParcialPrecio(p => ({ ...p, [rev.id]: rev.precio_venta_actual.toString() })); }}>
                        Aplicar parcial
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={applyReviewMutation.isPending}
                        onClick={() => applyReviewMutation.mutate({ reviewId: rev.id, productoId: rev.producto_id, nuevoPrecio: 0, tipo: "ignorado" })}>
                        <Clock className="h-3 w-3 mr-1" /> Después
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
