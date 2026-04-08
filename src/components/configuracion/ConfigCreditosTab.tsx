import { useState, useEffect } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Save, 
  Loader2, 
  Plus, 
  Trash2,
  AlertCircle 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PlazoCredito {
  tipo_producto: string;
  dias_credito: number;
}

const CREDIT_TERMS = [
  { value: "contado", label: "Contado", days: 0 },
  { value: "8_dias", label: "8 días", days: 8 },
  { value: "15_dias", label: "15 días", days: 15 },
  { value: "30_dias", label: "30 días", days: 30 },
  { value: "45_dias", label: "45 días", days: 45 },
  { value: "60_dias", label: "60 días", days: 60 },
];

export function ConfigCreditosTab() {
  const [plazos, setPlazos] = useState<PlazoCredito[]>([]);
  const [plazoDefault, setPlazoDefault] = useState("30_dias");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTipo, setNewTipo] = useState("");
  const [newDias, setNewDias] = useState("8");
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracion_empresa")
        .select("clave, valor")
        .in("clave", ["plazos_credito", "plazo_credito_default"]);

      if (error) throw error;

      data?.forEach((item) => {
        if (item.clave === "plazos_credito" && item.valor) {
          setPlazos((item.valor as unknown as PlazoCredito[]) || []);
        }
        if (item.clave === "plazo_credito_default" && item.valor) {
          setPlazoDefault((item.valor as unknown as string) || "30_dias");
        }
      });
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { clave: "plazos_credito", valor: plazos as unknown as Json },
        { clave: "plazo_credito_default", valor: plazoDefault as unknown as Json },
      ];

      for (const update of updates) {
        const { data: existing } = await supabase
          .from("configuracion_empresa")
          .select("id")
          .eq("clave", update.clave)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("configuracion_empresa")
            .update({ valor: update.valor })
            .eq("clave", update.clave);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("configuracion_empresa")
            .insert({ clave: update.clave, valor: update.valor });
          if (error) throw error;
        }
      }

      toast({
        title: "Guardado",
        description: "Configuración de créditos actualizada",
      });
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPlazo = () => {
    if (!newTipo.trim()) {
      toast({
        title: "Error",
        description: "Ingresa el tipo de producto",
        variant: "destructive",
      });
      return;
    }

    const exists = plazos.some(
      (p) => p.tipo_producto.toLowerCase() === newTipo.toLowerCase()
    );
    if (exists) {
      toast({
        title: "Error",
        description: "Ya existe una regla para este tipo de producto",
        variant: "destructive",
      });
      return;
    }

    setPlazos([
      ...plazos,
      { tipo_producto: newTipo.trim(), dias_credito: parseInt(newDias) },
    ]);
    setNewTipo("");
    setNewDias("8");
  };

  const handleRemovePlazo = (index: number) => {
    setPlazos(plazos.filter((_, i) => i !== index));
  };

  const handleUpdateDias = (index: number, dias: number) => {
    setPlazos(
      plazos.map((p, i) => (i === index ? { ...p, dias_credito: dias } : p))
    );
  };

  if (loading) {
    return (
      <AlmasaLoading size={48} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Términos de Crédito
          </h2>
          <p className="text-sm text-muted-foreground">
            Configura los plazos de pago por defecto y por tipo de producto
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>

      <Separator />

      {/* Default Term */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plazo por Defecto</CardTitle>
          <CardDescription>
            Se aplica a nuevos clientes y productos sin regla específica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={plazoDefault} onValueChange={setPlazoDefault}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_TERMS.map((term) => (
                  <SelectItem key={term.value} value={term.value}>
                    {term.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              para todos los productos sin regla específica
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Product-specific Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reglas por Tipo de Producto</CardTitle>
          <CardDescription>
            Define plazos especiales para categorías de productos (ej: Azúcar Refinada = 8 días)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new rule */}
          <div className="flex gap-2 items-end p-4 rounded-lg bg-muted/50">
            <div className="flex-1 space-y-2">
              <Label>Tipo de Producto</Label>
              <Input
                value={newTipo}
                onChange={(e) => setNewTipo(e.target.value)}
                placeholder="Ej: Azúcar Refinada, Aceite, etc."
              />
            </div>
            <div className="w-32 space-y-2">
              <Label>Días</Label>
              <Input
                type="number"
                min="0"
                max="90"
                value={newDias}
                onChange={(e) => setNewDias(e.target.value)}
              />
            </div>
            <Button onClick={handleAddPlazo}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </div>

          {/* Existing rules */}
          {plazos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Producto</TableHead>
                  <TableHead>Días de Crédito</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plazos.map((plazo, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {plazo.tipo_producto}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="90"
                          value={plazo.dias_credito}
                          onChange={(e) =>
                            handleUpdateDias(index, parseInt(e.target.value) || 0)
                          }
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">días</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePlazo(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay reglas específicas configuradas</p>
              <p className="text-xs">
                Se usará el plazo por defecto para todos los productos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="rounded-lg border p-4 bg-muted/50">
        <h4 className="font-medium text-sm mb-2">¿Cómo funciona la jerarquía?</h4>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>
            <strong>Excepción cliente-producto:</strong> Si existe una excepción específica 
            para un cliente y producto, se usa esa.
          </li>
          <li>
            <strong>Regla por tipo de producto:</strong> Si no hay excepción, se busca 
            una regla para el tipo de producto.
          </li>
          <li>
            <strong>Plazo del cliente:</strong> Si no hay regla de producto, se usa 
            el término de crédito configurado en el cliente.
          </li>
          <li>
            <strong>Plazo por defecto:</strong> Como último recurso, se usa el plazo 
            por defecto del sistema.
          </li>
        </ol>
      </div>
    </div>
  );
}
