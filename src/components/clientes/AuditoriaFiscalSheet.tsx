import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Save, ChevronRight, ChevronDown, ChevronUp, Search, Check, AlertCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SucursalFiscal {
  id: string;
  nombre: string;
  codigo_sucursal: string | null;
  rfc: string | null;
  razon_social: string | null;
  direccion_fiscal: string | null;
  email_facturacion: string | null;
  direccion: string | null; // Dirección de entrega para copiar
  cliente_id: string;
  cliente_nombre?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FilterType = "todas" | "incompletas" | "completas";

export function AuditoriaFiscalSheet({ open, onOpenChange }: Props) {
  const [sucursales, setSucursales] = useState<SucursalFiscal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("incompletas");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [editingData, setEditingData] = useState<Record<string, Partial<SucursalFiscal>>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSucursales();
    }
  }, [open]);

  const loadSucursales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cliente_sucursales")
        .select(`
          id,
          nombre,
          codigo_sucursal,
          rfc,
          razon_social,
          direccion_fiscal,
          email_facturacion,
          direccion,
          cliente_id,
          clientes!inner (nombre)
        `)
        .not("rfc", "is", null)
        .neq("rfc", "")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;

      const mapped = (data || []).map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        codigo_sucursal: s.codigo_sucursal,
        rfc: s.rfc,
        razon_social: s.razon_social,
        direccion_fiscal: s.direccion_fiscal,
        email_facturacion: s.email_facturacion,
        direccion: s.direccion,
        cliente_id: s.cliente_id,
        cliente_nombre: s.clientes?.nombre || "Sin cliente",
      }));

      setSucursales(mapped);
      
      // Expandir todos los clientes por defecto
      const clientIds = new Set(mapped.map((s: SucursalFiscal) => s.cliente_id));
      setExpandedClients(clientIds);
    } catch (error: any) {
      console.error("Error loading sucursales:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las sucursales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompletionStatus = (s: SucursalFiscal): "completo" | "parcial" | "incompleto" => {
    const fields = [s.razon_social, s.direccion_fiscal, s.email_facturacion];
    const filled = fields.filter(f => f && f.trim() !== "").length;
    if (filled === 3) return "completo";
    if (filled > 0) return "parcial";
    return "incompleto";
  };

  const getEditValue = (sucursalId: string, field: keyof SucursalFiscal, original: string | null) => {
    return editingData[sucursalId]?.[field] ?? original ?? "";
  };

  const setEditValue = (sucursalId: string, field: keyof SucursalFiscal, value: string) => {
    setEditingData(prev => ({
      ...prev,
      [sucursalId]: {
        ...prev[sucursalId],
        [field]: value,
      }
    }));
  };

  const handleCopyAddress = (sucursalId: string, direccion: string | null) => {
    if (direccion) {
      setEditValue(sucursalId, "direccion_fiscal", direccion);
      toast({ title: "Dirección copiada" });
    }
  };

  const handleSave = async (sucursalId: string) => {
    const changes = editingData[sucursalId];
    if (!changes) return;

    setSaving(sucursalId);
    try {
      const { error } = await supabase
        .from("cliente_sucursales")
        .update({
          razon_social: changes.razon_social,
          direccion_fiscal: changes.direccion_fiscal,
          email_facturacion: changes.email_facturacion,
        })
        .eq("id", sucursalId);

      if (error) throw error;

      // Actualizar estado local
      setSucursales(prev => prev.map(s => 
        s.id === sucursalId 
          ? { 
              ...s, 
              razon_social: changes.razon_social ?? s.razon_social,
              direccion_fiscal: changes.direccion_fiscal ?? s.direccion_fiscal,
              email_facturacion: changes.email_facturacion ?? s.email_facturacion,
            } 
          : s
      ));

      // Limpiar datos de edición para esta sucursal
      setEditingData(prev => {
        const { [sucursalId]: _, ...rest } = prev;
        return rest;
      });

      toast({ title: "Guardado correctamente" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo guardar",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAndNext = async (sucursalId: string) => {
    await handleSave(sucursalId);
    
    // Encontrar la siguiente sucursal incompleta
    const currentIndex = filteredSucursales.findIndex(s => s.id === sucursalId);
    const nextIncomplete = filteredSucursales.slice(currentIndex + 1).find(s => 
      getCompletionStatus(s) !== "completo"
    );
    
    if (nextIncomplete) {
      // Scroll to next element
      const element = document.getElementById(`sucursal-${nextIncomplete.id}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const hasChanges = (sucursalId: string) => {
    return !!editingData[sucursalId] && Object.keys(editingData[sucursalId]).length > 0;
  };

  // Filtrar sucursales
  const filteredSucursales = sucursales.filter(s => {
    // Filtro por estado
    const status = getCompletionStatus(s);
    if (filter === "incompletas" && status === "completo") return false;
    if (filter === "completas" && status !== "completo") return false;

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        s.nombre.toLowerCase().includes(term) ||
        s.codigo_sucursal?.toLowerCase().includes(term) ||
        s.cliente_nombre?.toLowerCase().includes(term) ||
        s.rfc?.toLowerCase().includes(term) ||
        s.razon_social?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Agrupar por cliente
  const groupedByClient = filteredSucursales.reduce((acc, s) => {
    if (!acc[s.cliente_id]) {
      acc[s.cliente_id] = {
        clienteNombre: s.cliente_nombre || "Sin cliente",
        sucursales: [],
      };
    }
    acc[s.cliente_id].sucursales.push(s);
    return acc;
  }, {} as Record<string, { clienteNombre: string; sucursales: SucursalFiscal[] }>);

  // Estadísticas
  const stats = {
    total: sucursales.length,
    completas: sucursales.filter(s => getCompletionStatus(s) === "completo").length,
    parciales: sucursales.filter(s => getCompletionStatus(s) === "parcial").length,
    incompletas: sucursales.filter(s => getCompletionStatus(s) === "incompleto").length,
  };

  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2">
            📋 Auditoría de Datos Fiscales
          </SheetTitle>
          
          {/* Estadísticas */}
          <div className="flex gap-2 text-sm flex-wrap">
            <Badge variant="outline">{stats.total} con RFC</Badge>
            <Badge className="bg-green-500/20 text-green-700 border-green-300">
              ✓ {stats.completas}
            </Badge>
            <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300">
              ⚠ {stats.parciales}
            </Badge>
            <Badge className="bg-red-500/20 text-red-700 border-red-300">
              ✗ {stats.incompletas}
            </Badge>
          </div>
        </SheetHeader>

        {/* Filtros */}
        <div className="p-4 border-b flex gap-2 flex-wrap">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={filter === "incompletas" ? "default" : "outline"}
              onClick={() => setFilter("incompletas")}
            >
              Incompletas
            </Button>
            <Button
              size="sm"
              variant={filter === "todas" ? "default" : "outline"}
              onClick={() => setFilter("todas")}
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant={filter === "completas" ? "default" : "outline"}
              onClick={() => setFilter("completas")}
            >
              Completas
            </Button>
          </div>
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        {/* Lista de sucursales */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando...
              </div>
            ) : Object.keys(groupedByClient).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay sucursales que mostrar
              </div>
            ) : (
              Object.entries(groupedByClient).map(([clientId, { clienteNombre, sucursales: clientSucursales }]) => (
                <Collapsible 
                  key={clientId} 
                  open={expandedClients.has(clientId)}
                  onOpenChange={() => toggleClient(clientId)}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                      <span className="font-medium">{clienteNombre}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{clientSucursales.length}</Badge>
                        {expandedClients.has(clientId) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 mt-2">
                    {clientSucursales.map((sucursal) => {
                      const status = getCompletionStatus(sucursal);
                      const statusIcon = status === "completo" ? "✓" : status === "parcial" ? "⚠" : "✗";
                      const statusColor = status === "completo" 
                        ? "border-green-300 bg-green-50" 
                        : status === "parcial" 
                          ? "border-yellow-300 bg-yellow-50" 
                          : "border-red-300 bg-red-50";

                      return (
                        <div
                          key={sucursal.id}
                          id={`sucursal-${sucursal.id}`}
                          className={`border rounded-lg p-3 space-y-3 ${statusColor}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{statusIcon}</span>
                              {sucursal.codigo_sucursal && (
                                <Badge variant="secondary" className="text-xs font-mono">
                                  Sucursal: {sucursal.codigo_sucursal}
                                </Badge>
                              )}
                              <span className="font-medium">{sucursal.nombre}</span>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs">
                              {sucursal.rfc}
                            </Badge>
                          </div>

                          <div className="grid gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Razón Social</Label>
                              <Input
                                value={getEditValue(sucursal.id, "razon_social", sucursal.razon_social)}
                                onChange={(e) => setEditValue(sucursal.id, "razon_social", e.target.value)}
                                placeholder="Razón social..."
                                className="h-8 text-sm"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground">Dirección Fiscal</Label>
                                {sucursal.direccion && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 text-xs px-1"
                                    onClick={() => handleCopyAddress(sucursal.id, sucursal.direccion)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copiar entrega
                                  </Button>
                                )}
                              </div>
                              <Input
                                value={getEditValue(sucursal.id, "direccion_fiscal", sucursal.direccion_fiscal)}
                                onChange={(e) => setEditValue(sucursal.id, "direccion_fiscal", e.target.value)}
                                placeholder="Dirección fiscal..."
                                className="h-8 text-sm"
                              />
                            </div>

                            <div>
                              <Label className="text-xs text-muted-foreground">Email Facturación</Label>
                              <Input
                                type="email"
                                value={getEditValue(sucursal.id, "email_facturacion", sucursal.email_facturacion)}
                                onChange={(e) => setEditValue(sucursal.id, "email_facturacion", e.target.value)}
                                placeholder="email@ejemplo.com"
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>

                          {hasChanges(sucursal.id) && (
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                onClick={() => handleSave(sucursal.id)}
                                disabled={saving === sucursal.id}
                                className="flex-1"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Guardar
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSaveAndNext(sucursal.id)}
                                disabled={saving === sucursal.id}
                                className="flex-1"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Guardar y Siguiente
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
