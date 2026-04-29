import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PLAZOS_PAGO,
  PLAZOS_PAGO_VALUES,
  METODOS_PAGO_OPCIONES,
  type ProveedorForm,
} from "@/lib/proveedor-form-utils";

interface Props {
  form: ProveedorForm;
  errors: Record<string, string>;
  onChange: (patch: Partial<ProveedorForm>) => void;
}

export const SeccionCondiciones = ({ form, onChange }: Props) => {
  const valorActual = form.termino_pago || "";
  const esLegacy = valorActual !== "" && !PLAZOS_PAGO_VALUES.includes(valorActual);
  const valorSelect = esLegacy ? "" : valorActual;

  const toggleMetodo = (metodo: string) => {
    const set = new Set(form.metodos_pago_aceptados);
    if (set.has(metodo)) set.delete(metodo);
    else set.add(metodo);
    onChange({ metodos_pago_aceptados: Array.from(set) });
  };

  return (
    <section className="px-8 py-6 border-t border-ink-100">
      <h3 className="font-serif text-lg text-ink-900">Condiciones comerciales</h3>
      <p className="font-serif italic text-xs text-ink-500 mb-4">
        Plazo de pago default y notas operativas
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-ink-500">
            Plazo de pago default *
          </Label>
          <Select
            value={valorSelect}
            onValueChange={(v) => onChange({ termino_pago: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un plazo" />
            </SelectTrigger>
            <SelectContent>
              {PLAZOS_PAGO.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {esLegacy && (
            <p className="text-xs text-amber-600 mt-1">
              Plazo anterior no estándar ("{valorActual}"), selecciona uno.
            </p>
          )}
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-ink-500">
            Forma de pago preferida
          </Label>
          <div className="flex flex-wrap gap-3 mt-2">
            {METODOS_PAGO_OPCIONES.map((m) => (
              <label key={m} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={form.metodos_pago_aceptados.includes(m)}
                  onCheckedChange={() => toggleMetodo(m)}
                />
                {m}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-ink-500">
          Notas operativas
        </Label>
        <Textarea
          value={form.notas_operativas}
          onChange={(e) => onChange({ notas_operativas: e.target.value })}
          placeholder="Ej. 'Llamar antes de las 10am', 'No pedir lunes', 'Mejor precio en azúcar'…"
          className="min-h-[100px] font-serif text-base leading-relaxed"
        />
        <p className="font-serif italic text-xs text-ink-500 mt-1">
          Captura aquí lo que el sistema nunca aprenderá. Esta info aparecerá en el tab Memoria del proveedor.
        </p>
      </div>
    </section>
  );
};
