import { Button } from "@/components/ui/button";
import { ContactoRow } from "./ContactoRow";
import type { ContactoForm, ProveedorForm } from "@/lib/proveedor-form-utils";

interface Props {
  form: ProveedorForm;
  errors: Record<string, string>;
  onChange: (patch: Partial<ProveedorForm>) => void;
}

export const SeccionContactos = ({ form, errors, onChange }: Props) => {
  const contactos = form.contactos;
  const vivos = contactos.filter((c) => !c._toDelete);
  const indicesVivos = contactos
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !c._toDelete);
  const firstVivoIdx = indicesVivos[0]?.i;

  const updateAt = (i: number, patch: Partial<ContactoForm>) => {
    const next = [...contactos];
    next[i] = { ...next[i], ...patch };
    onChange({ contactos: next });
  };

  const setPrincipal = (i: number) => {
    const next = contactos.map((c, idx) => ({ ...c, es_principal: idx === i }));
    onChange({ contactos: next });
  };

  const deleteAt = (i: number) => {
    const next = [...contactos];
    if (next[i].id) {
      next[i] = { ...next[i], _toDelete: true };
    } else {
      next.splice(i, 1);
    }
    // Si eliminamos el principal, marcar el primer vivo como principal
    const aliveAfter = next.filter((c) => !c._toDelete);
    if (!aliveAfter.some((c) => c.es_principal) && aliveAfter.length > 0) {
      const firstAliveIdx = next.findIndex((c) => !c._toDelete);
      if (firstAliveIdx >= 0) next[firstAliveIdx] = { ...next[firstAliveIdx], es_principal: true };
    }
    onChange({ contactos: next });
  };

  const addContacto = () => {
    if (vivos.length >= 5) return;
    onChange({
      contactos: [
        ...contactos,
        {
          nombre: "",
          puesto: "",
          telefono: "",
          email: "",
          es_principal: false,
          _isNew: true,
        },
      ],
    });
  };

  return (
    <section className="px-8 py-6 border-t border-ink-100">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-serif text-lg text-ink-900">Contactos</h3>
          <p className="font-serif italic text-xs text-ink-500">
            Las personas con las que tratas. Mínimo uno.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addContacto}
          disabled={vivos.length >= 5}
        >
          + Agregar contacto
        </Button>
      </div>

      {errors.contactos && (
        <p className="text-xs text-red-600 mb-2">{errors.contactos}</p>
      )}

      <div className="flex flex-col gap-3">
        {contactos.map((c, i) =>
          c._toDelete ? null : (
            <ContactoRow
              key={c.id || `new-${i}`}
              contacto={c}
              index={i}
              canDelete={i !== firstVivoIdx}
              errors={errors}
              onChange={(p) => updateAt(i, p)}
              onDelete={() => deleteAt(i)}
              onSetPrincipal={() => setPrincipal(i)}
            />
          )
        )}
      </div>
    </section>
  );
};
