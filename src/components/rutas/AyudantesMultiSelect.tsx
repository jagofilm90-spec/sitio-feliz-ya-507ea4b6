import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Users, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Ayudante {
  id: string;
  nombre_completo: string;
}

interface AyudantesMultiSelectProps {
  selectedAyudantes: string[];
  onSelectionChange: (ayudantes: string[]) => void;
  excludeIds?: string[]; // IDs to exclude (e.g., selected chofer)
}

export const AyudantesMultiSelect = ({
  selectedAyudantes,
  onSelectionChange,
  excludeIds = [],
}: AyudantesMultiSelectProps) => {
  const [ayudantes, setAyudantes] = useState<Ayudante[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadAyudantes();
  }, []);

  const loadAyudantes = async () => {
    try {
      // Load from empleados table filtering by puesto exacto "Ayudante de Chofer"
      const { data, error } = await supabase
        .from("empleados")
        .select("id, nombre_completo")
        .eq("activo", true)
        .eq("puesto", "Ayudante de Chofer")
        .order("nombre_completo");

      if (!error && data) {
        setAyudantes(data);
      }
    } catch (err) {
      console.error("Error loading ayudantes:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAyudantes = ayudantes.filter(a => !excludeIds.includes(a.id));

  const toggleAyudante = (id: string) => {
    if (selectedAyudantes.includes(id)) {
      onSelectionChange(selectedAyudantes.filter(a => a !== id));
    } else {
      onSelectionChange([...selectedAyudantes, id]);
    }
  };

  const removeAyudante = (id: string) => {
    onSelectionChange(selectedAyudantes.filter(a => a !== id));
  };

  const getSelectedNames = () => {
    return selectedAyudantes
      .map(id => ayudantes.find(a => a.id === id)?.nombre_completo)
      .filter(Boolean);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-auto min-h-10"
            disabled={loading}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              {selectedAyudantes.length === 0 ? (
                <span className="text-muted-foreground">Sin ayudantes</span>
              ) : (
                <span>{selectedAyudantes.length} ayudante(s) seleccionado(s)</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Cargando ayudantes...
            </div>
          ) : filteredAyudantes.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No hay ayudantes registrados
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {filteredAyudantes.map((ayudante) => (
                <div
                  key={ayudante.id}
                  className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleAyudante(ayudante.id)}
                >
                  <Checkbox
                    checked={selectedAyudantes.includes(ayudante.id)}
                    onCheckedChange={() => toggleAyudante(ayudante.id)}
                  />
                  <span className="text-sm">{ayudante.nombre_completo}</span>
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected ayudantes chips */}
      {selectedAyudantes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getSelectedNames().map((name, idx) => (
            <Badge
              key={selectedAyudantes[idx]}
              variant="secondary"
              className="text-xs flex items-center gap-1"
            >
              {name}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeAyudante(selectedAyudantes[idx])}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
