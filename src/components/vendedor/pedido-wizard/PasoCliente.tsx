import { useState, useEffect, useMemo } from "react";
import { Store, ChevronRight, MapPin, Loader2, AlertTriangle, CheckCircle, Clock, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { ClienteConFrecuencia, Sucursal } from "./types";

type SemaforoColor = "verde" | "amarillo" | "rojo";

interface SemaforoData {
  color: SemaforoColor;
  label: string;
  saldoPendiente: number;
  facturasVencidas: number;
}

interface PasoClienteProps {
  clientes: ClienteConFrecuencia[];
  sucursales: Sucursal[];
  selectedClienteId: string;
  selectedSucursalId: string;
  loading: boolean;
  onClienteChange: (clienteId: string) => void;
  onSucursalChange: (sucursalId: string) => void;
  onNext: () => void;
}

export function PasoCliente({
  clientes,
  sucursales,
  selectedClienteId,
  selectedSucursalId,
  loading,
  onClienteChange,
  onSucursalChange,
  onNext,
}: PasoClienteProps) {
  const [search, setSearch] = useState("");
  const [semaforos, setSemaforos] = useState<Record<string, SemaforoData>>({});
  const [loadingSemaforos, setLoadingSemaforos] = useState(false);

  const selectedCliente = clientes.find((c) => c.id === selectedClienteId);
  const canContinue = selectedClienteId && (sucursales.length === 0 || selectedSucursalId);

  // Fetch credit semaphores for all clients once
  useEffect(() => {
    if (clientes.length === 0) return;
    const load = async () => {
      setLoadingSemaforos(true);
      try {
        const hoy = new Date().toISOString().split("T")[0];
        const clienteIds = clientes.map((c) => c.id);

        // Batch: saldos
        const { data: clientesData } = await supabase
          .from("clientes")
          .select("id, saldo_pendiente")
          .in("id", clienteIds);

        // Batch: facturas vencidas
        const { data: facturasData } = await supabase
          .from("facturas")
          .select("cliente_id")
          .in("cliente_id", clienteIds)
          .eq("pagada", false)
          .lt("fecha_vencimiento", hoy);

        const saldoMap = new Map((clientesData || []).map((c) => [c.id, c.saldo_pendiente || 0]));
        const vencidasMap = new Map<string, number>();
        (facturasData || []).forEach((f) => {
          vencidasMap.set(f.cliente_id, (vencidasMap.get(f.cliente_id) || 0) + 1);
        });

        const result: Record<string, SemaforoData> = {};
        for (const c of clientes) {
          const saldo = saldoMap.get(c.id) || 0;
          const vencidas = vencidasMap.get(c.id) || 0;
          let color: SemaforoColor = "verde";
          let label = "Al corriente";
          if (vencidas > 0) {
            color = "rojo";
            label = `${vencidas} vencida${vencidas > 1 ? "s" : ""}`;
          } else if (saldo > 0) {
            color = "amarillo";
            label = "Saldo pendiente";
          }
          result[c.id] = { color, label, saldoPendiente: saldo, facturasVencidas: vencidas };
        }
        setSemaforos(result);
      } catch (err) {
        console.error("Error loading semaforos:", err);
      } finally {
        setLoadingSemaforos(false);
      }
    };
    load();
  }, [clientes]);

  // Split clients: frequent (top with orders) vs rest
  const { frecuentes, filteredClientes } = useMemo(() => {
    const q = search.toLowerCase().trim();
    const all = q
      ? clientes.filter((c) => c.nombre.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q))
      : clientes;

    const withOrders = all.filter((c) => c.numPedidos > 0).sort((a, b) => b.numPedidos - a.numPedidos);
    const topFrec = withOrders.slice(0, 8);
    const frecIds = new Set(topFrec.map((c) => c.id));
    const rest = all.filter((c) => !frecIds.has(c.id));

    return { frecuentes: topFrec, filteredClientes: rest };
  }, [clientes, search]);

  const semaforoDot = (color: SemaforoColor) =>
    color === "rojo" ? "bg-red-500" : color === "amarillo" ? "bg-amber-400" : "bg-emerald-500";

  const renderClienteCard = (cliente: ClienteConFrecuencia, isFrecuente: boolean) => {
    const isSelected = cliente.id === selectedClienteId;
    const sem = semaforos[cliente.id];
    const direccion = cliente.direccion || cliente.zona?.nombre || null;

    return (
      <button
        key={cliente.id}
        type="button"
        onClick={() => onClienteChange(isSelected ? "" : cliente.id)}
        className={cn(
          "w-full text-left rounded-lg border p-3 transition-all",
          isSelected
            ? "border-crimson-500 bg-crimson-50/50 ring-1 ring-crimson-500/30"
            : "border-ink-100 bg-white hover:border-ink-200 hover:bg-ink-50/30"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {isFrecuente && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
              <span className="font-semibold text-sm truncate text-ink-900">{cliente.nombre}</span>
            </div>
            {direccion && (
              <p className="text-xs text-ink-500 mt-0.5 truncate flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {direccion}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-400 flex-wrap">
              {cliente.ultimoPedidoFecha && (
                <span>
                  Último pedido {formatDistanceToNow(new Date(cliente.ultimoPedidoFecha), { locale: es, addSuffix: true })}
                </span>
              )}
              {sem && sem.saldoPendiente > 0 && (
                <span>· Saldo {formatCurrency(sem.saldoPendiente)}</span>
              )}
            </div>
            {sem?.color === "rojo" && (
              <div className="flex items-center gap-1 mt-1 text-[11px] text-red-600 font-medium">
                <AlertTriangle className="h-3 w-3" />
                Tiene saldo vencido
              </div>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-2 pt-1">
            {sem && <div className={cn("w-2.5 h-2.5 rounded-full", semaforoDot(sem.color))} />}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="font-serif text-2xl font-light text-ink-900">
          ¿Quién <em className="italic text-crimson-500">compra?</em>
        </h2>
        <p className="text-sm text-ink-500">Selecciona el cliente</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
        <Input
          placeholder="Buscar cliente por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Frequent clients */}
      {frecuentes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            Tus clientes frecuentes
          </div>
          <div className="space-y-1.5">
            {frecuentes.map((c) => renderClienteCard(c, true))}
          </div>
        </div>
      )}

      {/* Rest of clients */}
      {filteredClientes.length > 0 && (
        <div className="space-y-2">
          {frecuentes.length > 0 && (
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Todos los clientes
            </div>
          )}
          <div className="space-y-1.5">
            {filteredClientes.map((c) => renderClienteCard(c, false))}
          </div>
        </div>
      )}

      {clientes.length === 0 && !loading && (
        <div className="text-center py-8 text-ink-400">
          <Store className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No tienes clientes asignados</p>
        </div>
      )}

      {/* Sucursal selector (if client has multiple) */}
      {selectedCliente && sucursales.length > 1 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            Sucursal de entrega
          </Label>
          <Select value={selectedSucursalId} onValueChange={onSucursalChange}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Seleccionar sucursal..." />
            </SelectTrigger>
            <SelectContent>
              {sucursales.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-base py-2">
                  <span className="font-medium">{s.nombre}</span>
                  {s.direccion && <span className="text-muted-foreground text-sm ml-2">{s.direccion}</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Continue button */}
      {selectedCliente && canContinue && (
        <Button
          onClick={onNext}
          size="lg"
          className="w-full h-14 text-base font-semibold bg-crimson-500 hover:bg-crimson-600 text-white"
        >
          Continuar con {selectedCliente.nombre}
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      )}
    </div>
  );
}
