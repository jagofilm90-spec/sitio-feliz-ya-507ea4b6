import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGIMENES_FISCALES, type ProveedorForm } from "@/lib/proveedor-form-utils";

interface Props {
  form: ProveedorForm;
  errors: Record<string, string>;
  onChange: (patch: Partial<ProveedorForm>) => void;
}

export const SeccionFiscal = ({ form, errors, onChange }: Props) => {
  return (
    <section className="px-8 py-6 border-t border-ink-100">
      <h3 className="font-serif text-lg text-ink-900">Información fiscal</h3>
      <p className="font-serif italic text-xs text-ink-500 mb-4">
        Necesaria para facturas y declaraciones
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-ink-500">RFC *</Label>
          <Input
            value={form.rfc}
            onChange={(e) => onChange({ rfc: e.target.value.toUpperCase() })}
            maxLength={13}
            placeholder="ABC123456ABC"
            className={`uppercase ${errors.rfc ? "border-red-500" : ""}`}
          />
          {errors.rfc && <p className="text-xs text-red-600 mt-1">{errors.rfc}</p>}
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs uppercase tracking-wider text-ink-500">
            Régimen fiscal
          </Label>
          <Select
            value={form.regimen_fiscal || "_none"}
            onValueChange={(v) => onChange({ regimen_fiscal: v === "_none" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="(Opcional)" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="_none">(Sin especificar)</SelectItem>
              {REGIMENES_FISCALES.map((r) => (
                <SelectItem key={r.codigo} value={r.codigo}>
                  {r.codigo} — {r.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-ink-500">Dirección</Label>
          <Input
            value={form.direccion}
            onChange={(e) => onChange({ direccion: e.target.value })}
            maxLength={200}
            placeholder="Calle, número, colonia, CP"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-ink-500">Municipio</Label>
            <Input
              value={form.municipio}
              onChange={(e) => onChange({ municipio: e.target.value })}
              maxLength={100}
              placeholder="Ej. Ecatepec"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-ink-500">Estado</Label>
            <Input
              value={form.estado}
              onChange={(e) => onChange({ estado: e.target.value })}
              maxLength={100}
              placeholder="Ej. Edo. México"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
