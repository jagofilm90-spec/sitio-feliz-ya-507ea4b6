import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AsociacionFormData } from "@/hooks/useAsociarProducto";

interface Props {
  form: AsociacionFormData;
  onChange: (patch: Partial<AsociacionFormData>) => void;
  porKilo: boolean | null;
}

const Label = ({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="block text-xs uppercase tracking-wider text-ink-500 font-medium mb-1.5">
    {children}
    {required && <span className="text-crimson-700"> *</span>}
  </label>
);

const Sub = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] italic text-ink-500 mt-1">{children}</p>
);

export const CamposAsociacion = ({ form, onChange, porKilo }: Props) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const isFija = form.tipo_carga_default === "fija";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif text-lg text-ink-900">Términos comerciales</h3>
        <p className="font-serif italic text-sm text-ink-500">
          Define cómo te lo vende este proveedor
        </p>
      </div>

      {/* ROW 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Costo del proveedor</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.costo_proveedor ?? ""}
              onChange={(e) =>
                onChange({
                  costo_proveedor: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="0.00"
              className="pl-7"
            />
          </div>
          <Sub>{porKilo ? "/ kg" : "/ bulto"}</Sub>
        </div>

        <div>
          <Label>Código del proveedor</Label>
          <Input
            value={form.codigo_proveedor ?? ""}
            onChange={(e) =>
              onChange({ codigo_proveedor: e.target.value.toUpperCase() })
            }
            style={{ textTransform: "uppercase" }}
            placeholder="EJ. AZ-50KG-2024"
          />
          <Sub>Código interno del proveedor para este producto</Sub>
        </div>
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Tipo de carga default</Label>
          <Select
            value={form.tipo_carga_default}
            onValueChange={(v: "libre" | "fija") => onChange({ tipo_carga_default: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="libre">Libre</SelectItem>
              <SelectItem value="fija">Fija</SelectItem>
            </SelectContent>
          </Select>
          <Sub>Libre = peso variable. Fija = peso exacto por bulto</Sub>
        </div>

        <div>
          <Label>¿Precio por kilo?</Label>
          <div className="flex items-start gap-2 mt-2.5">
            <Checkbox
              id="precio-kilo"
              checked={form.precio_por_kilo_compra}
              onCheckedChange={(v) => onChange({ precio_por_kilo_compra: !!v })}
            />
            <label htmlFor="precio-kilo" className="text-sm text-ink-900 cursor-pointer">
              El precio del proveedor es por kilo (no por bulto)
            </label>
          </div>
          <Sub>Solo aplica para productos que se compran a granel</Sub>
        </div>
      </div>

      {/* ROW 3 — solo fija */}
      {isFija && (
        <div className="space-y-4 p-4 bg-bg-warm rounded-lg border border-ink-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Tipo vehículo estándar</Label>
              <Input
                value={form.tipo_vehiculo_estandar ?? ""}
                onChange={(e) =>
                  onChange({ tipo_vehiculo_estandar: e.target.value.toUpperCase() })
                }
                style={{ textTransform: "uppercase" }}
                placeholder="EJ. CAMIONETA 3.5 TON"
              />
            </div>
            <div>
              <Label>Capacidad bultos</Label>
              <Input
                type="number"
                min="0"
                value={form.capacidad_vehiculo_bultos ?? ""}
                onChange={(e) =>
                  onChange({
                    capacidad_vehiculo_bultos:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="Ej. 200"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Capacidad kg</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.capacidad_vehiculo_kg ?? ""}
                onChange={(e) =>
                  onChange({
                    capacidad_vehiculo_kg:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="Ej. 5000"
              />
            </div>
            <div>
              <Label>&nbsp;</Label>
              <div className="flex items-start gap-2 h-11 items-center">
                <Checkbox
                  id="permite-comb"
                  checked={form.permite_combinacion}
                  onCheckedChange={(v) => onChange({ permite_combinacion: !!v })}
                />
                <label htmlFor="permite-comb" className="text-sm text-ink-900 cursor-pointer">
                  Permite combinación con otros productos
                </label>
              </div>
              <Sub>Si el camión puede traer este producto + otros</Sub>
            </div>
          </div>
        </div>
      )}

      {/* ROW 4 — Advanced */}
      <div className="border-t border-ink-100 pt-4">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-700 font-medium hover:text-ink-900 transition-colors"
        >
          {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Configuración avanzada de lotes
        </button>

        {advancedOpen && (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-2">
              <Checkbox
                id="dividir-lotes"
                checked={form.dividir_en_lotes_recepcion}
                onCheckedChange={(v) => onChange({ dividir_en_lotes_recepcion: !!v })}
              />
              <label htmlFor="dividir-lotes" className="text-sm text-ink-900 cursor-pointer">
                Dividir en lotes al recibir
              </label>
            </div>

            {form.dividir_en_lotes_recepcion && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
                <div>
                  <Label>Cantidad de lotes default</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.cantidad_lotes_default ?? ""}
                    onChange={(e) =>
                      onChange({
                        cantidad_lotes_default:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Ej. 3"
                  />
                </div>
                <div>
                  <Label>Unidades por lote</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.unidades_por_lote_default ?? ""}
                    onChange={(e) =>
                      onChange({
                        unidades_por_lote_default:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Ej. 50"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
