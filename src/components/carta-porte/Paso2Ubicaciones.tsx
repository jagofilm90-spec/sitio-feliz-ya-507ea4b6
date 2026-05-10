import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wand2, MapPin } from "lucide-react";
import { CpUbicacion, RutaConEntregas, useSaveUbicaciones } from "@/hooks/useCartaPorteWizard";

type UbicacionForm = Omit<CpUbicacion, "id" | "carta_porte_id">;

interface Props {
  ubicaciones: UbicacionForm[];
  setUbicaciones: (u: UbicacionForm[]) => void;
  rutaData: RutaConEntregas | null | undefined;
  cartaPorteId: string;
  onComplete: (complete: boolean) => void;
}

const ALMASA_ORIGEN: UbicacionForm = {
  tipo: "Origen",
  orden_secuencia: 1,
  rfc: "AAL850101XXX", // RFC placeholder ALMASA
  nombre_remitente_destinatario: "Almacenes y Abastos Alimenticios SA de CV",
  calle: "",
  numero_exterior: "",
  numero_interior: "",
  colonia: "",
  localidad: "",
  municipio: "Hermosillo",
  estado: "SON",
  pais: "MEX",
  codigo_postal: "",
  fecha_hora_estimada: new Date().toISOString().slice(0, 16),
  distancia_recorrida: 0,
};

export default function Paso2Ubicaciones({ ubicaciones, setUbicaciones, rutaData, cartaPorteId, onComplete }: Props) {
  const saveMutation = useSaveUbicaciones();

  useEffect(() => {
    const hasOrigen = ubicaciones.some((u) => u.tipo === "Origen");
    const hasDestino = ubicaciones.some((u) => u.tipo === "Destino");
    const allValid = ubicaciones.every(
      (u) => u.rfc && u.codigo_postal && u.fecha_hora_estimada
    );
    onComplete(hasOrigen && hasDestino && allValid);
  }, [ubicaciones, onComplete]);

  const autoFillFromRuta = () => {
    if (!rutaData?.entregas?.length) return;

    const items: UbicacionForm[] = [{ ...ALMASA_ORIGEN }];
    const seenClientes = new Set<string>();

    for (const entrega of rutaData.entregas) {
      const cliente = entrega.pedidos?.clientes;
      if (!cliente || seenClientes.has(cliente.id)) continue;
      seenClientes.add(cliente.id);

      items.push({
        tipo: "Destino",
        orden_secuencia: items.length + 1,
        rfc: cliente.rfc || "",
        nombre_remitente_destinatario: cliente.razon_social || cliente.nombre,
        calle: "",
        numero_exterior: "",
        numero_interior: "",
        colonia: "",
        localidad: "",
        municipio: "",
        estado: "",
        pais: "MEX",
        codigo_postal: "",
        fecha_hora_estimada: new Date().toISOString().slice(0, 16),
        distancia_recorrida: null,
      });
    }
    setUbicaciones(items);
  };

  const addDestino = () => {
    const maxOrder = ubicaciones.length > 0 ? Math.max(...ubicaciones.map((u) => u.orden_secuencia)) : 0;
    setUbicaciones([
      ...ubicaciones,
      {
        tipo: "Destino",
        orden_secuencia: maxOrder + 1,
        rfc: "",
        nombre_remitente_destinatario: "",
        calle: "",
        numero_exterior: "",
        numero_interior: "",
        colonia: "",
        localidad: "",
        municipio: "",
        estado: "",
        pais: "MEX",
        codigo_postal: "",
        fecha_hora_estimada: new Date().toISOString().slice(0, 16),
        distancia_recorrida: null,
      },
    ]);
  };

  const addOrigen = () => {
    if (ubicaciones.some((u) => u.tipo === "Origen")) return;
    setUbicaciones([{ ...ALMASA_ORIGEN }, ...ubicaciones]);
  };

  const removeRow = (idx: number) => setUbicaciones(ubicaciones.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: keyof UbicacionForm, value: any) => {
    const updated = [...ubicaciones];
    updated[idx] = { ...updated[idx], [field]: value };
    setUbicaciones(updated);
  };

  const handleSave = () => {
    saveMutation.mutate({ cartaPorteId, ubicaciones });
  };

  const hasOrigen = ubicaciones.some((u) => u.tipo === "Origen");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Ubicaciones (Origen + Destinos)
          </CardTitle>
          <div className="flex items-center gap-2">
            {rutaData?.entregas?.length ? (
              <Button variant="outline" size="sm" onClick={autoFillFromRuta}>
                <Wand2 className="h-3 w-3 mr-1" /> Auto-llenar
              </Button>
            ) : null}
            {!hasOrigen && (
              <Button variant="outline" size="sm" onClick={addOrigen}>
                <Plus className="h-3 w-3 mr-1" /> Origen
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addDestino}>
              <Plus className="h-3 w-3 mr-1" /> Destino
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {ubicaciones.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>Agrega origen y al menos un destino.</p>
          </div>
        )}

        {ubicaciones.map((u, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-3 space-y-3 relative ${
              u.tipo === "Origen" ? "border-blue-200 bg-blue-50/30" : "border-orange-200 bg-orange-50/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase ${u.tipo === "Origen" ? "text-blue-700" : "text-orange-700"}`}>
                {u.tipo} #{u.orden_secuencia}
              </span>
              <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">RFC*</Label>
                <Input
                  value={u.rfc}
                  onChange={(e) => updateRow(idx, "rfc", e.target.value.toUpperCase())}
                  placeholder="RFC del remitente/destinatario"
                  className="h-8 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Nombre/Razón Social</Label>
                <Input
                  value={u.nombre_remitente_destinatario}
                  onChange={(e) => updateRow(idx, "nombre_remitente_destinatario", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Código Postal*</Label>
                <Input
                  value={u.codigo_postal}
                  onChange={(e) => updateRow(idx, "codigo_postal", e.target.value)}
                  placeholder="83000"
                  maxLength={5}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Estado</Label>
                <Input
                  value={u.estado}
                  onChange={(e) => updateRow(idx, "estado", e.target.value)}
                  placeholder="SON"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Municipio</Label>
                <Input
                  value={u.municipio}
                  onChange={(e) => updateRow(idx, "municipio", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Colonia</Label>
                <Input
                  value={u.colonia}
                  onChange={(e) => updateRow(idx, "colonia", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Calle</Label>
                <Input
                  value={u.calle}
                  onChange={(e) => updateRow(idx, "calle", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">No. Ext</Label>
                <Input
                  value={u.numero_exterior}
                  onChange={(e) => updateRow(idx, "numero_exterior", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Fecha/Hora Estimada*</Label>
                <Input
                  type="datetime-local"
                  value={u.fecha_hora_estimada?.slice(0, 16) || ""}
                  onChange={(e) => updateRow(idx, "fecha_hora_estimada", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Distancia (km)</Label>
                <Input
                  type="number"
                  value={u.distancia_recorrida ?? ""}
                  onChange={(e) => updateRow(idx, "distancia_recorrida", parseFloat(e.target.value) || null)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        ))}

        {ubicaciones.length > 0 && (
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar ubicaciones"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
