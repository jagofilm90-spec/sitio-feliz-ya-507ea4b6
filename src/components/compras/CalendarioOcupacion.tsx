import { useState, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EntregaOcupacion {
  id: string;
  fecha_programada: string;
  cantidad_bultos: number;
  numero_entrega: number;
  ordenes_compra: {
    folio: string;
    proveedor_id: string;
    proveedores: {
      nombre: string;
    };
  };
}

interface OcupacionDia {
  count: number;
  entregas: EntregaOcupacion[];
}

interface CalendarioOcupacionProps {
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  initialMonth?: Date;
  className?: string;
}

export function CalendarioOcupacion({
  selectedDate,
  onDateSelect,
  initialMonth,
  className,
}: CalendarioOcupacionProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth || new Date());
  
  // Fetch scheduled deliveries from the database
  const { data: entregasProgramadas = [], isLoading } = useQuery({
    queryKey: ["entregas-ocupacion-calendario", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const monthStart = startOfMonth(subMonths(currentMonth, 1));
      const monthEnd = endOfMonth(addMonths(currentMonth, 2));
      
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select(`
          id, fecha_programada, cantidad_bultos, numero_entrega,
          ordenes_compra!inner (
            folio, 
            proveedor_id, 
            proveedores (nombre)
          )
        `)
        .in("status", ["programada", "pendiente", "en_descarga"])
        .gte("fecha_programada", format(monthStart, "yyyy-MM-dd"))
        .lte("fecha_programada", format(monthEnd, "yyyy-MM-dd"));
      
      if (error) {
        console.error("Error loading scheduled deliveries:", error);
        return [];
      }
      
      return data as unknown as EntregaOcupacion[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });
  
  // Group by date for occupancy display
  const ocupacionPorFecha = useMemo(() => {
    const mapa: Record<string, OcupacionDia> = {};
    
    for (const entrega of entregasProgramadas) {
      if (!entrega.fecha_programada) continue;
      
      const key = entrega.fecha_programada;
      if (!mapa[key]) {
        mapa[key] = { count: 0, entregas: [] };
      }
      mapa[key].count++;
      mapa[key].entregas.push(entrega);
    }
    
    return mapa;
  }, [entregasProgramadas]);
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);
  
  const getOccupancyColor = (count: number): string => {
    if (count === 0) return "";
    if (count <= 2) return "bg-green-500";
    if (count <= 4) return "bg-amber-500";
    return "bg-red-500";
  };
  
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("border rounded-lg bg-background", className)}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-semibold capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </span>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0 border-b">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0 p-1">
          {calendarDays.map((day, i) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const ocupacion = ocupacionPorFecha[dateStr];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
            const dayIsToday = isToday(day);
            
            const dayButton = (
              <button
                key={i}
                type="button"
                onClick={() => !isPast && onDateSelect(day)}
                disabled={isPast}
                className={cn(
                  "relative h-10 w-full flex items-center justify-center text-sm rounded-md transition-colors",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isCurrentMonth && !isPast && "hover:bg-accent",
                  isPast && "text-muted-foreground/30 cursor-not-allowed",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                  dayIsToday && !isSelected && "bg-accent font-semibold"
                )}
              >
                <span>{format(day, "d")}</span>
                
                {/* Occupancy badge */}
                {ocupacion && ocupacion.count > 0 && (
                  <span
                    className={cn(
                      "absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center",
                      getOccupancyColor(ocupacion.count),
                      isSelected && "ring-2 ring-background"
                    )}
                  >
                    {ocupacion.count}
                  </span>
                )}
              </button>
            );
            
            // Wrap with tooltip if there are deliveries
            if (ocupacion && ocupacion.count > 0) {
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    {dayButton}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {ocupacion.count} entrega{ocupacion.count !== 1 ? "s" : ""} programada{ocupacion.count !== 1 ? "s" : ""}
                      </p>
                      <div className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
                        {ocupacion.entregas.slice(0, 5).map((e) => (
                          <div key={e.id} className="text-muted-foreground">
                            • {e.ordenes_compra?.proveedores?.nombre || "Sin proveedor"} 
                            <span className="opacity-70"> ({e.ordenes_compra?.folio})</span>
                          </div>
                        ))}
                        {ocupacion.entregas.length > 5 && (
                          <div className="text-muted-foreground italic">
                            +{ocupacion.entregas.length - 5} más...
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            return dayButton;
          })}
        </div>
        
        {/* Legend */}
        <div className="p-3 border-t flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span>1-2</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span>3-4</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span>5+</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
