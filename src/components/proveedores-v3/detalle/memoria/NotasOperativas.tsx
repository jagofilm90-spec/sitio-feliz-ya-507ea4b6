import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  useNotasOperativas,
  useUpdateNotasOperativas,
} from "@/hooks/useProveedorMemoria";

interface Props {
  proveedorId: string;
}

const PLACEHOLDER = `Captura aquí lo que el sistema nunca aprenderá:

· Quién toma los pedidos (dueño, hijo, secretaria)
· Horarios para llamar
· Días NUNCA pedir
· Patrones de comportamiento
· Cualquier cosa importante de la relación`;

export function NotasOperativas({ proveedorId }: Props) {
  const { data: initial, isLoading } = useNotasOperativas(proveedorId);
  const update = useUpdateNotasOperativas(proveedorId);

  const [value, setValue] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hidratar desde la query
  useEffect(() => {
    if (initial !== undefined) {
      setValue(initial || "");
      setOriginalValue(initial || "");
    }
  }, [initial]);

  // Re-render cada 30s para refrescar "hace X"
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const dirty = value !== originalValue;

  const doSave = (val: string) => {
    update.mutate(val, {
      onSuccess: () => {
        setOriginalValue(val);
        setLastSavedAt(new Date());
      },
    });
  };

  // Autosave debounce 3s
  useEffect(() => {
    if (!dirty) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSave(value);
    }, 3000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleManualSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSave(value);
  };

  const renderStatus = () => {
    if (update.isPending) {
      return <span className="font-serif italic text-ink-500">Guardando…</span>;
    }
    if (update.isError) {
      return <span className="text-red-700">⚠ Error al guardar</span>;
    }
    if (lastSavedAt) {
      return (
        <span className="font-serif italic text-ink-500">
          Guardado {formatDistanceToNow(lastSavedAt, { locale: es, addSuffix: true })}
          {/* tick para forzar refresco */}
          <span className="hidden">{tick}</span>
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className="rounded-xl border border-warm-200 p-6"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--warm-100)), hsl(var(--warm-50)))",
      }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div className="text-[11px] font-medium tracking-[0.12em] uppercase text-ink-700">
          📝 Notas operativas
        </div>
        <div className="text-xs">{renderStatus()}</div>
      </div>

      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={PLACEHOLDER}
        disabled={isLoading}
        className="min-h-[280px] bg-white border-ink-100 p-4 leading-relaxed text-ink-900"
        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17 }}
      />

      <div className="mt-3 flex items-center justify-end">
        <Button
          size="sm"
          onClick={handleManualSave}
          disabled={!dirty || update.isPending}
        >
          💾 Guardar ahora
        </Button>
      </div>
    </div>
  );
}
