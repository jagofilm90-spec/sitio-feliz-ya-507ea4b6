import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, AlertTriangle } from "lucide-react";
import { CpAutotransporte, usePermisoSICT, useUpsertAutotransporte } from "@/hooks/useCartaPorteWizard";
import { useSatCatalogos } from "@/hooks/useCartasPorte";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AutotransporteForm = Omit<CpAutotransporte, "id" | "carta_porte_id">;

interface Props {
  autotransporte: AutotransporteForm | null;
  setAutotransporte: (a: AutotransporteForm | null) => void;
  vehiculoId: string | null;
  cartaPorteId: string;
  onComplete: (complete: boolean) => void;
}

const EMPTY_AUTO: AutotransporteForm = {
  perm_sct: "",
  num_permiso_sct: "",
  config_vehicular: "",
  placa_vm: "",
  anio_modelo_vm: new Date().getFullYear(),
  asegura_resp_civil: "",
  poliza_resp_civil: "",
  asegura_med_ambiente: "",
  poliza_med_ambiente: "",
  asegura_carga: "",
  poliza_carga: "",
  prima_seguro: null,
  peso_bruto_vehicular: null,
};

export default function Paso3Autotransporte({ autotransporte, setAutotransporte, vehiculoId, cartaPorteId, onComplete }: Props) {
  const upsertMutation = useUpsertAutotransporte();
  const { data: permiso } = usePermisoSICT(vehiculoId);
  const { data: tiposPermiso } = useSatCatalogos("c_TipoPermiso");
  const { data: configVehicular } = useSatCatalogos("c_ConfigAutotransporte");

  // Fetch vehicle data for auto-fill
  const { data: vehiculo } = useQuery({
    queryKey: ["vehiculo-cp", vehiculoId],
    queryFn: async () => {
      if (!vehiculoId) return null;
      const { data, error } = await (supabase as any)
        .from("vehiculos")
        .select("id, nombre, placa, anio, peso_vehicular_ton, numero_serie")
        .eq("id", vehiculoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!vehiculoId,
  });

  // Auto-fill from vehicle + permiso
  useEffect(() => {
    if (!autotransporte && vehiculo) {
      setAutotransporte({
        ...EMPTY_AUTO,
        placa_vm: vehiculo.placa || "",
        anio_modelo_vm: vehiculo.anio || new Date().getFullYear(),
        peso_bruto_vehicular: vehiculo.peso_vehicular_ton ? vehiculo.peso_vehicular_ton * 1000 : null,
        perm_sct: permiso?.tipo_permiso || "",
        num_permiso_sct: permiso?.numero_permiso || "",
      });
    }
  }, [vehiculo, permiso]);

  useEffect(() => {
    if (!autotransporte) { onComplete(false); return; }
    const valid = !!(
      autotransporte.perm_sct &&
      autotransporte.num_permiso_sct &&
      autotransporte.config_vehicular &&
      autotransporte.placa_vm &&
      autotransporte.anio_modelo_vm &&
      autotransporte.asegura_resp_civil &&
      autotransporte.poliza_resp_civil
    );
    onComplete(valid);
  }, [autotransporte, onComplete]);

  const form = autotransporte || EMPTY_AUTO;
  const update = (field: keyof AutotransporteForm, value: any) => {
    setAutotransporte({ ...form, [field]: value });
  };

  const handleSave = () => {
    if (!autotransporte) return;
    upsertMutation.mutate({ ...autotransporte, carta_porte_id: cartaPorteId } as any);
  };

  const noPermiso = !permiso && vehiculoId;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" /> Autotransporte Federal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {noPermiso && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              Este vehículo no tiene permiso SICT registrado. Captura manualmente o registra uno en Vehículos.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Permiso */}
          <div>
            <Label className="text-xs">Tipo Permiso SCT*</Label>
            <Select value={form.perm_sct} onValueChange={(v) => update("perm_sct", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecciona tipo permiso" />
              </SelectTrigger>
              <SelectContent>
                {tiposPermiso?.map((t) => (
                  <SelectItem key={t.clave} value={t.clave}>
                    {t.clave} - {t.descripcion}
                  </SelectItem>
                ))}
                {!tiposPermiso?.length && (
                  <SelectItem value="TPAF01">TPAF01 - Carga General</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Número Permiso SCT*</Label>
            <Input
              value={form.num_permiso_sct}
              onChange={(e) => update("num_permiso_sct", e.target.value)}
              placeholder="Número de permiso"
              className="h-8 text-sm"
            />
          </div>

          {/* Config vehicular */}
          <div>
            <Label className="text-xs">Configuración Vehicular*</Label>
            <Select value={form.config_vehicular} onValueChange={(v) => update("config_vehicular", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecciona configuración" />
              </SelectTrigger>
              <SelectContent>
                {configVehicular?.map((c) => (
                  <SelectItem key={c.clave} value={c.clave}>
                    {c.clave} - {c.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Placa + Año */}
          <div>
            <Label className="text-xs">Placa VM*</Label>
            <Input
              value={form.placa_vm}
              onChange={(e) => update("placa_vm", e.target.value.toUpperCase())}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Año Modelo*</Label>
            <Input
              type="number"
              value={form.anio_modelo_vm || ""}
              onChange={(e) => update("anio_modelo_vm", parseInt(e.target.value) || 0)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Peso Bruto Vehicular (kg)</Label>
            <Input
              type="number"
              value={form.peso_bruto_vehicular ?? ""}
              onChange={(e) => update("peso_bruto_vehicular", parseFloat(e.target.value) || null)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Seguros */}
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Seguros</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Aseguradora Resp. Civil*</Label>
              <Input
                value={form.asegura_resp_civil}
                onChange={(e) => update("asegura_resp_civil", e.target.value)}
                placeholder="Nombre aseguradora"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Póliza Resp. Civil*</Label>
              <Input
                value={form.poliza_resp_civil}
                onChange={(e) => update("poliza_resp_civil", e.target.value)}
                placeholder="Número de póliza"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Aseguradora Medio Ambiente</Label>
              <Input
                value={form.asegura_med_ambiente}
                onChange={(e) => update("asegura_med_ambiente", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Póliza Medio Ambiente</Label>
              <Input
                value={form.poliza_med_ambiente}
                onChange={(e) => update("poliza_med_ambiente", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Aseguradora Carga</Label>
              <Input
                value={form.asegura_carga}
                onChange={(e) => update("asegura_carga", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Póliza Carga</Label>
              <Input
                value={form.poliza_carga}
                onChange={(e) => update("poliza_carga", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? "Guardando..." : "Guardar autotransporte"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
