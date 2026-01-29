import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, PackageX, DollarSign } from "lucide-react";
import DevolucionesPendientesTab from "./DevolucionesPendientesTab";
import FaltantesPendientesTab from "./FaltantesPendientesTab";
import CreditosPendientesPanel from "./CreditosPendientesPanel";

type Vista = "devoluciones" | "faltantes" | "creditos";

const DevolucionesFaltantesTab = () => {
  const [vista, setVista] = useState<Vista>("devoluciones");

  // Fetch count of pending devoluciones
  const { data: devolucionesCount = 0 } = useQuery({
    queryKey: ["devoluciones-pendientes-count-internal"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("devoluciones_proveedor")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendiente");

      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Fetch count of pending faltantes
  const { data: faltantesCount = 0 } = useQuery({
    queryKey: ["faltantes-pendientes-count-internal"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ordenes_compra_entregas")
        .select("*", { count: "exact", head: true })
        .eq("origen_faltante", true)
        .in("status", ["programada", "pendiente"]);

      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Fetch count of pending credits
  const { data: creditosCount = 0 } = useQuery({
    queryKey: ["creditos-pendientes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("proveedor_creditos_pendientes")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendiente");

      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const handleVistaChange = (value: string) => {
    if (value) {
      setVista(value as Vista);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle interno para cambiar entre vistas */}
      <div className="flex justify-center">
        <ToggleGroup 
          type="single" 
          value={vista} 
          onValueChange={handleVistaChange}
          className="bg-muted/50 p-1 rounded-lg"
        >
          <ToggleGroupItem 
            value="devoluciones" 
            className="flex items-center gap-2 px-4 py-2 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Devoluciones</span>
            {devolucionesCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {devolucionesCount}
              </Badge>
            )}
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="faltantes" 
            className="flex items-center gap-2 px-4 py-2 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <PackageX className="h-4 w-4 text-orange-500" />
            <span>Faltantes</span>
            {faltantesCount > 0 && (
              <Badge className="ml-1 h-5 min-w-5 px-1.5 text-xs bg-orange-500 text-white">
                {faltantesCount}
              </Badge>
            )}
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="creditos" 
            className="flex items-center gap-2 px-4 py-2 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <DollarSign className="h-4 w-4 text-amber-600" />
            <span>Créditos</span>
            {creditosCount > 0 && (
              <Badge className="ml-1 h-5 min-w-5 px-1.5 text-xs bg-amber-500 text-white">
                {creditosCount}
              </Badge>
            )}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Contenido condicional */}
      {vista === "devoluciones" && <DevolucionesPendientesTab />}
      {vista === "faltantes" && <FaltantesPendientesTab />}
      {vista === "creditos" && <CreditosPendientesPanel />}
    </div>
  );
};

export default DevolucionesFaltantesTab;
