import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProveedorLite, TipoPlazo } from "./types";

interface Props {
  proveedor: ProveedorLite | null;
  setProveedor: (p: ProveedorLite | null) => void;
  plazoTipo: TipoPlazo | null;
  setPlazoTipo: (t: TipoPlazo) => void;
  plazoOtroDias: number;
  setPlazoOtroDias: (n: number) => void;
  metodoAnticipado: string;
  setMetodoAnticipado: (m: string) => void;
  fechaPagoAnticipado: string;
  setFechaPagoAnticipado: (s: string) => void;
}

const PLAZO_OPTIONS: { id: TipoPlazo; label: string; dias: number | null }[] = [
  { id: "contado", label: "Contado", dias: 0 },
  { id: "8", label: "8 días", dias: 8 },
  { id: "15", label: "15 días", dias: 15 },
  { id: "30", label: "30 días", dias: 30 },
  { id: "anticipado", label: "Anticipado", dias: 0 },
  { id: "otro", label: "Otro", dias: null },
];

// Mapea termino_pago del proveedor a TipoPlazo sugerido
function sugerirPlazo(termino: string | null | undefined): TipoPlazo | null {
  if (!termino) return null;
  const t = termino.toLowerCase();
  if (t.includes("contado") || t.includes("entrega")) return "contado";
  if (t.includes("anticip")) return "anticipado";
  if (t.includes("8")) return "8";
  if (t.includes("15")) return "15";
  if (t.includes("30")) return "30";
  return null;
}

export default function SeccionProveedor(props: Props) {
  const {
    proveedor,
    setProveedor,
    plazoTipo,
    setPlazoTipo,
    plazoOtroDias,
    setPlazoOtroDias,
    metodoAnticipado,
    setMetodoAnticipado,
    fechaPagoAnticipado,
    setFechaPagoAnticipado,
  } = props;

  const [open, setOpen] = useState(false);
  const [proveedores, setProveedores] = useState<ProveedorLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("proveedores")
        .select("id, nombre, rfc, termino_pago")
        .eq("activo", true)
        .order("nombre");
      if (!error && data) setProveedores(data as ProveedorLite[]);
      setLoading(false);
    })();
  }, []);

  const sugerido = sugerirPlazo(proveedor?.termino_pago);

  return (
    <section className="rounded-xl border border-ink-100 bg-white p-8 shadow-xs-soft">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-400 font-medium">Sección 1</p>
        <h2 className="font-serif italic text-2xl text-ink-900 mt-1">A quién le compras.</h2>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Proveedor</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between mt-2 h-11 font-normal"
                disabled={loading}
              >
                {proveedor ? (
                  <span className="truncate">
                    <span className="text-ink-900">{proveedor.nombre}</span>
                    {proveedor.rfc && <span className="text-ink-400 ml-2">· {proveedor.rfc}</span>}
                  </span>
                ) : (
                  <span className="text-ink-400">{loading ? "Cargando..." : "Seleccionar proveedor..."}</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover" align="start">
              <Command>
                <CommandInput placeholder="Buscar proveedor..." />
                <CommandList>
                  <CommandEmpty>No se encontraron proveedores.</CommandEmpty>
                  <CommandGroup>
                    {proveedores.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.nombre} ${p.rfc ?? ""}`}
                        onSelect={() => {
                          setProveedor(p);
                          setOpen(false);
                          // Auto-sugerir plazo
                          const s = sugerirPlazo(p.termino_pago);
                          if (s && !plazoTipo) setPlazoTipo(s);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", proveedor?.id === p.id ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col">
                          <span>{p.nombre}</span>
                          {p.rfc && <span className="text-xs text-ink-400">{p.rfc}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Plazo de pago</Label>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {PLAZO_OPTIONS.map((opt) => {
              const active = plazoTipo === opt.id;
              const isSugerido = sugerido === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPlazoTipo(opt.id)}
                  className={cn(
                    "relative rounded-lg border px-3 py-3 text-sm transition-all",
                    active
                      ? "border-crimson-500 bg-crimson-50 text-crimson-700 ring-1 ring-crimson-500/20"
                      : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-bg-soft",
                  )}
                >
                  {opt.label}
                  {isSugerido && (
                    <span className="absolute -top-2 -right-2 text-[9px] bg-ink-900 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                      sugerido
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {plazoTipo === "otro" && (
          <div className="max-w-xs">
            <Label className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Días</Label>
            <Input
              type="number"
              min={0}
              value={plazoOtroDias || ""}
              onChange={(e) => setPlazoOtroDias(Number(e.target.value) || 0)}
              className="mt-2"
              placeholder="ej. 45"
            />
          </div>
        )}

        {plazoTipo === "anticipado" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Fecha de pago</Label>
              <Input
                type="date"
                value={fechaPagoAnticipado}
                onChange={(e) => setFechaPagoAnticipado(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Método</Label>
              <Select value={metodoAnticipado} onValueChange={setMetodoAnticipado}>
                <SelectTrigger className="mt-2 h-11">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
