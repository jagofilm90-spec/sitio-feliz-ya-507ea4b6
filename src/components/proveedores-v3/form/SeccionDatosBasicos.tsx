import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS_PROVEEDOR, type ProveedorForm } from "@/lib/proveedor-form-utils";

interface Props {
  form: ProveedorForm;
  errors: Record<string, string>;
  onChange: (patch: Partial<ProveedorForm>) => void;
}

export const SeccionDatosBasicos = ({ form, errors, onChange }: Props) => {
  const isOtra = form.categoria && !CATEGORIAS_PROVEEDOR.includes(form.categoria);
  return (
    <section className="px-8 py-6">
      <h3 className="font-serif text-lg text-ink-900">Datos básicos</h3>
      <p className="font-serif italic text-xs text-ink-500 mb-4">
        Información comercial del proveedor
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-ink-500">
            Nombre / Razón social *
          </Label>
          <Input
            value={form.nombre}
            onChange={(e) => onChange({ nombre: e.target.value })}
            maxLength={200}
            placeholder="Ej. Abarrotes Centrales SA de CV"
            className={errors.nombre ? "border-red-500" : ""}
          />
          {errors.nombre && (
            <p className="text-xs text-red-600 mt-1">{errors.nombre}</p>
          )}
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-ink-500">
            Nombre comercial
          </Label>
          <Input
            value={form.nombre_comercial}
            onChange={(e) => onChange({ nombre_comercial: e.target.value })}
            maxLength={100}
            placeholder="Ej. Distribuidora Central"
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-ink-500">
            Categoría *
          </Label>
          <Select
            value={isOtra ? "Otra" : form.categoria}
            onValueChange={(v) => onChange({ categoria: v === "Otra" ? "" : v })}
          >
            <SelectTrigger className={errors.categoria ? "border-red-500" : ""}>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS_PROVEEDOR.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(isOtra || form.categoria === "") && form.categoria !== "" && (
            <Input
              className="mt-2"
              value={form.categoria}
              onChange={(e) => onChange({ categoria: e.target.value })}
              placeholder="Especifica la categoría"
            />
          )}
          {isOtra && (
            <Input
              className="mt-2"
              value={form.categoria}
              onChange={(e) => onChange({ categoria: e.target.value })}
              placeholder="Especifica la categoría"
            />
          )}
          {errors.categoria && (
            <p className="text-xs text-red-600 mt-1">{errors.categoria}</p>
          )}
        </div>
      </div>
    </section>
  );
};
