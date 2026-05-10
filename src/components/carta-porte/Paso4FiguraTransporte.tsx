import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, AlertTriangle } from "lucide-react";
import { CpFigura, useUpsertFigura } from "@/hooks/useCartaPorteWizard";
import { useSatCatalogos } from "@/hooks/useCartasPorte";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type FiguraForm = Omit<CpFigura, "id" | "carta_porte_id">;

interface Props {
  figura: FiguraForm | null;
  setFigura: (f: FiguraForm | null) => void;
  choferId: string | null;
  cartaPorteId: string;
  onComplete: (complete: boolean) => void;
}

const EMPTY_FIGURA: FiguraForm = {
  tipo_figura: "01",
  rfc_figura: "",
  num_licencia: "",
  nombre_figura: "",
  residencia_fiscal: "MEX",
};

export default function Paso4FiguraTransporte({ figura, setFigura, choferId, cartaPorteId, onComplete }: Props) {
  const upsertMutation = useUpsertFigura();
  const { data: tiposFigura } = useSatCatalogos("c_FiguraTransporte");

  // Fetch chofer data
  const { data: chofer } = useQuery({
    queryKey: ["chofer-cp", choferId],
    queryFn: async () => {
      if (!choferId) return null;
      const { data, error } = await (supabase as any)
        .from("empleados")
        .select("id, nombre_completo, rfc, licencia_numero, licencia_tipo")
        .eq("id", choferId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!choferId,
  });

  // Auto-fill from chofer
  useEffect(() => {
    if (!figura && chofer) {
      setFigura({
        tipo_figura: "01",
        rfc_figura: chofer.rfc || "",
        num_licencia: chofer.licencia_numero || "",
        nombre_figura: chofer.nombre_completo || "",
        residencia_fiscal: "MEX",
      });
    }
  }, [chofer]);

  useEffect(() => {
    if (!figura) { onComplete(false); return; }
    const valid = !!(
      figura.tipo_figura &&
      figura.rfc_figura &&
      figura.num_licencia &&
      figura.nombre_figura
    );
    onComplete(valid);
  }, [figura, onComplete]);

  const form = figura || EMPTY_FIGURA;
  const update = (field: keyof FiguraForm, value: any) => {
    setFigura({ ...form, [field]: value });
  };

  const handleSave = () => {
    if (!figura) return;
    upsertMutation.mutate({ ...figura, carta_porte_id: cartaPorteId } as any);
  };

  const missingLicense = choferId && chofer && !chofer.licencia_numero;
  const missingRFC = choferId && chofer && !chofer.rfc;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" /> Figura del Transporte (Operador)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(missingLicense || missingRFC) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              {missingRFC && "RFC no registrado en empleados. "}
              {missingLicense && "Licencia no registrada en empleados. "}
              Captura manualmente aquí o actualiza el registro del empleado.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Tipo de Figura*</Label>
            <Select value={form.tipo_figura} onValueChange={(v) => update("tipo_figura", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Tipo figura" />
              </SelectTrigger>
              <SelectContent>
                {tiposFigura?.map((t) => (
                  <SelectItem key={t.clave} value={t.clave}>
                    {t.clave} - {t.descripcion}
                  </SelectItem>
                ))}
                {!tiposFigura?.length && (
                  <>
                    <SelectItem value="01">01 - Operador</SelectItem>
                    <SelectItem value="02">02 - Propietario</SelectItem>
                    <SelectItem value="03">03 - Arrendador</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">RFC*</Label>
            <Input
              value={form.rfc_figura}
              onChange={(e) => update("rfc_figura", e.target.value.toUpperCase())}
              placeholder="RFC del operador"
              className="h-8 text-sm"
              maxLength={13}
            />
          </div>
          <div>
            <Label className="text-xs">Nombre Completo*</Label>
            <Input
              value={form.nombre_figura}
              onChange={(e) => update("nombre_figura", e.target.value)}
              placeholder="Nombre del operador"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Número de Licencia*</Label>
            <Input
              value={form.num_licencia}
              onChange={(e) => update("num_licencia", e.target.value)}
              placeholder="Número de licencia federal"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Residencia Fiscal</Label>
            <Input
              value={form.residencia_fiscal}
              onChange={(e) => update("residencia_fiscal", e.target.value.toUpperCase())}
              placeholder="MEX"
              maxLength={3}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? "Guardando..." : "Guardar operador"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
