import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Wand2, Package } from "lucide-react";
import { CpMercancia, RutaConEntregas, useSaveMercancias } from "@/hooks/useCartaPorteWizard";
import { useSatCatalogos } from "@/hooks/useCartasPorte";

type MercanciaForm = Omit<CpMercancia, "id" | "carta_porte_id">;

interface Props {
  mercancias: MercanciaForm[];
  setMercancias: (m: MercanciaForm[]) => void;
  rutaData: RutaConEntregas | null | undefined;
  cartaPorteId: string;
  onComplete: (complete: boolean) => void;
}

const EMPTY_MERCANCIA: MercanciaForm = {
  pedido_detalle_id: null,
  bienes_transp: "",
  descripcion: "",
  cantidad: 0,
  clave_unidad: "KGM",
  unidad: "Kilogramo",
  peso_en_kg: 0,
  material_peligroso: false,
  cve_material_peligroso: "",
  embalaje: "",
  descrip_embalaje: "",
};

export default function Paso1Mercancias({ mercancias, setMercancias, rutaData, cartaPorteId, onComplete }: Props) {
  const saveMutation = useSaveMercancias();
  const { data: unidadesSAT } = useSatCatalogos("c_ClaveUnidad");

  // Check completion
  useEffect(() => {
    const valid = mercancias.length > 0 && mercancias.every(
      (m) => m.bienes_transp && m.descripcion && m.cantidad > 0 && m.peso_en_kg > 0 && m.clave_unidad
    );
    onComplete(valid);
  }, [mercancias, onComplete]);

  const autoFillFromRuta = () => {
    if (!rutaData?.entregas?.length) return;

    const items: MercanciaForm[] = [];
    for (const entrega of rutaData.entregas) {
      const pedido = entrega.pedidos;
      if (!pedido?.pedidos_detalles) continue;
      for (const det of pedido.pedidos_detalles) {
        const prod = det.productos;
        if (!prod) continue;
        items.push({
          pedido_detalle_id: det.id,
          bienes_transp: prod.unidad_sat ? "" : "", // bienes_transp needs SAT code, user fills
          descripcion: prod.nombre,
          cantidad: det.cantidad,
          clave_unidad: prod.unidad_sat || "KGM",
          unidad: prod.unidad || "Kilogramo",
          peso_en_kg: (prod.peso_kg || 1) * det.cantidad,
          material_peligroso: false,
          cve_material_peligroso: "",
          embalaje: "",
          descrip_embalaje: "",
        });
      }
    }
    if (items.length > 0) setMercancias(items);
  };

  const addRow = () => setMercancias([...mercancias, { ...EMPTY_MERCANCIA }]);
  const removeRow = (idx: number) => setMercancias(mercancias.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: keyof MercanciaForm, value: any) => {
    const updated = [...mercancias];
    updated[idx] = { ...updated[idx], [field]: value };
    setMercancias(updated);
  };

  const handleSave = () => {
    saveMutation.mutate({ cartaPorteId, mercancias });
  };

  const pesoTotal = mercancias.reduce((acc, m) => acc + (m.peso_en_kg || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Mercancías Transportadas
          </CardTitle>
          <div className="flex items-center gap-2">
            {rutaData?.entregas?.length ? (
              <Button variant="outline" size="sm" onClick={autoFillFromRuta}>
                <Wand2 className="h-3 w-3 mr-1" /> Auto-llenar desde ruta
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-3 w-3 mr-1" /> Agregar
            </Button>
          </div>
        </div>
        {pesoTotal > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Peso total: <span className="font-medium">{pesoTotal.toFixed(2)} kg</span> · {mercancias.length} partida(s)
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {mercancias.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No hay mercancías. Agrega manualmente o auto-llena desde la ruta.</p>
          </div>
        )}

        {mercancias.map((m, idx) => (
          <div key={idx} className="border rounded-lg p-3 space-y-3 relative">
            <button
              onClick={() => removeRow(idx)}
              className="absolute top-2 right-2 text-red-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Clave BienesTransp (SAT)*</Label>
                <Input
                  value={m.bienes_transp}
                  onChange={(e) => updateRow(idx, "bienes_transp", e.target.value)}
                  placeholder="Ej: 10101500"
                  className="h-8 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Catálogo c_ClaveProdServCP</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Descripción*</Label>
                <Input
                  value={m.descripcion}
                  onChange={(e) => updateRow(idx, "descripcion", e.target.value)}
                  placeholder="Descripción de la mercancía"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs">Cantidad*</Label>
                <Input
                  type="number"
                  value={m.cantidad || ""}
                  onChange={(e) => updateRow(idx, "cantidad", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Clave Unidad*</Label>
                <Input
                  value={m.clave_unidad}
                  onChange={(e) => updateRow(idx, "clave_unidad", e.target.value)}
                  placeholder="KGM"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Unidad</Label>
                <Input
                  value={m.unidad}
                  onChange={(e) => updateRow(idx, "unidad", e.target.value)}
                  placeholder="Kilogramo"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Peso (kg)*</Label>
                <Input
                  type="number"
                  value={m.peso_en_kg || ""}
                  onChange={(e) => updateRow(idx, "peso_en_kg", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-1">
                  <Switch
                    checked={m.material_peligroso}
                    onCheckedChange={(v) => updateRow(idx, "material_peligroso", v)}
                  />
                  <Label className="text-xs">Mat. Peligroso</Label>
                </div>
              </div>
            </div>

            {m.material_peligroso && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cve Mat Peligroso</Label>
                  <Input
                    value={m.cve_material_peligroso}
                    onChange={(e) => updateRow(idx, "cve_material_peligroso", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Embalaje</Label>
                  <Input
                    value={m.embalaje}
                    onChange={(e) => updateRow(idx, "embalaje", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {mercancias.length > 0 && (
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar mercancías"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
