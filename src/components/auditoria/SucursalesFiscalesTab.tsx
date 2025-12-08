import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Save,
  Search,
  Loader2,
  Copy,
  Building2,
} from "lucide-react";

type CompletitudStatus = "completo" | "parcial" | "incompleto";

interface Sucursal {
  id: string;
  nombre: string;
  rfc: string | null;
  razon_social: string | null;
  direccion_fiscal: string | null;
  email_facturacion: string | null;
  direccion: string | null;
  cliente_id: string;
  cliente?: {
    id: string;
    nombre: string;
    codigo: string;
  };
}

const evaluarCompletitudSucursal = (sucursal: Sucursal): CompletitudStatus | null => {
  if (!sucursal.rfc) return null; // No tiene facturación propia

  const tieneRazonSocial = !!sucursal.razon_social;
  const tieneDirFiscal = !!sucursal.direccion_fiscal;
  const tieneEmailFact = !!sucursal.email_facturacion;

  if (!tieneRazonSocial) return "incompleto";
  if (!tieneDirFiscal || !tieneEmailFact) return "parcial";
  return "completo";
};

const getCamposFaltantesSucursal = (sucursal: Sucursal): string[] => {
  const faltantes: string[] = [];
  if (!sucursal.razon_social) faltantes.push("Razón Social");
  if (!sucursal.direccion_fiscal) faltantes.push("Dir. Fiscal");
  if (!sucursal.email_facturacion) faltantes.push("Email Facturación");
  return faltantes;
};

const StatusBadge = ({ status }: { status: CompletitudStatus }) => {
  switch (status) {
    case "completo":
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completo
        </Badge>
      );
    case "parcial":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Parcial
        </Badge>
      );
    case "incompleto":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Incompleto
        </Badge>
      );
  }
};

export const SucursalesFiscalesTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterCliente, setFilterCliente] = useState<string>("todos");
  const [expandedSucursal, setExpandedSucursal] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Sucursal>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sucursales = [], isLoading } = useQuery({
    queryKey: ["sucursales-auditoria-fiscal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_sucursales")
        .select(
          `id, nombre, rfc, razon_social, direccion_fiscal, email_facturacion, 
           direccion, cliente_id, cliente:clientes(id, nombre, codigo)`
        )
        .eq("activo", true)
        .not("rfc", "is", null)
        .order("nombre");

      if (error) throw error;
      return data as Sucursal[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Sucursal> }) => {
      const { error } = await supabase
        .from("cliente_sucursales")
        .update(data.updates)
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sucursales-auditoria-fiscal"] });
      toast({
        title: "Datos actualizados",
        description: "Los datos fiscales de la sucursal se han guardado correctamente",
      });
      setExpandedSucursal(null);
      setEditForm({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    },
  });

  const sucursalesConStatus = sucursales.map((sucursal) => ({
    ...sucursal,
    status: evaluarCompletitudSucursal(sucursal),
    camposFaltantes: getCamposFaltantesSucursal(sucursal),
  })).filter((s) => s.status !== null);

  // Obtener lista única de clientes para el filtro
  const clientesUnicos = [...new Map(
    sucursalesConStatus.map((s) => [s.cliente_id, s.cliente])
  ).values()].filter(Boolean);

  const filteredSucursales = sucursalesConStatus.filter((sucursal) => {
    const matchesSearch =
      sucursal.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sucursal.rfc?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "todos" || sucursal.status === filterStatus;
    const matchesCliente =
      filterCliente === "todos" || sucursal.cliente_id === filterCliente;
    return matchesSearch && matchesFilter && matchesCliente;
  });

  // Ordenar: incompletos primero, luego parciales, luego completos
  const sortedSucursales = [...filteredSucursales].sort((a, b) => {
    const order = { incompleto: 0, parcial: 1, completo: 2 };
    return order[a.status!] - order[b.status!];
  });

  // Agrupar por cliente
  const groupedByCliente = sortedSucursales.reduce((acc, sucursal) => {
    const clienteId = sucursal.cliente_id;
    if (!acc[clienteId]) {
      acc[clienteId] = {
        cliente: sucursal.cliente,
        sucursales: [],
      };
    }
    acc[clienteId].sucursales.push(sucursal);
    return acc;
  }, {} as Record<string, { cliente: Sucursal["cliente"]; sucursales: typeof sortedSucursales }>);

  const stats = {
    total: sucursalesConStatus.length,
    completo: sucursalesConStatus.filter((c) => c.status === "completo").length,
    parcial: sucursalesConStatus.filter((c) => c.status === "parcial").length,
    incompleto: sucursalesConStatus.filter((c) => c.status === "incompleto").length,
  };

  const handleExpand = (sucursal: Sucursal) => {
    if (expandedSucursal === sucursal.id) {
      setExpandedSucursal(null);
      setEditForm({});
    } else {
      setExpandedSucursal(sucursal.id);
      setEditForm({
        rfc: sucursal.rfc || "",
        razon_social: sucursal.razon_social || "",
        direccion_fiscal: sucursal.direccion_fiscal || "",
        email_facturacion: sucursal.email_facturacion || "",
      });
    }
  };

  const handleCopyDireccion = (sucursal: Sucursal) => {
    if (sucursal.direccion) {
      setEditForm({ ...editForm, direccion_fiscal: sucursal.direccion });
      toast({
        title: "Dirección copiada",
        description: "La dirección de entrega se copió a dirección fiscal",
      });
    }
  };

  const handleSave = (sucursalId: string) => {
    updateMutation.mutate({
      id: sucursalId,
      updates: {
        razon_social: editForm.razon_social,
        direccion_fiscal: editForm.direccion_fiscal,
        email_facturacion: editForm.email_facturacion,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Sucursales con RFC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.completo}</div>
            <p className="text-sm text-muted-foreground">Completas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.parcial}</div>
            <p className="text-sm text-muted-foreground">Parciales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.incompleto}</div>
            <p className="text-sm text-muted-foreground">Incompletas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o RFC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los clientes</SelectItem>
            {clientesUnicos.map((cliente) => (
              <SelectItem key={cliente?.id} value={cliente?.id || ""}>
                {cliente?.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="incompleto">Solo Incompletas</SelectItem>
            <SelectItem value="parcial">Solo Parciales</SelectItem>
            <SelectItem value="completo">Solo Completas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista agrupada por cliente */}
      {Object.keys(groupedByCliente).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No se encontraron sucursales con facturación propia
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByCliente).map(([clienteId, { cliente, sucursales }]) => (
          <Card key={clienteId}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                {cliente?.nombre || "Cliente desconocido"}
                <Badge variant="secondary" className="ml-2">
                  {sucursales.length} sucursales
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sucursales.map((sucursal) => (
                <Collapsible
                  key={sucursal.id}
                  open={expandedSucursal === sucursal.id}
                  onOpenChange={() => handleExpand(sucursal)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {expandedSucursal === sucursal.id ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <div className="font-medium">{sucursal.nombre}</div>
                            <div className="text-sm text-muted-foreground">
                              RFC: {sucursal.rfc}
                              {sucursal.camposFaltantes.length > 0 && (
                                <span className="ml-2">
                                  • Falta: {sucursal.camposFaltantes.join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={sucursal.status!} />
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t p-4 bg-muted/30 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>RFC</Label>
                            <Input value={sucursal.rfc || ""} disabled className="bg-muted" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`razon-${sucursal.id}`}>Razón Social *</Label>
                            <Input
                              id={`razon-${sucursal.id}`}
                              value={editForm.razon_social || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, razon_social: e.target.value })
                              }
                              placeholder="Nombre legal de la sucursal"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`dirfiscal-${sucursal.id}`}>
                              Dirección Fiscal *
                            </Label>
                            {sucursal.direccion && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyDireccion(sucursal)}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copiar dir. de entrega
                              </Button>
                            )}
                          </div>
                          <Input
                            id={`dirfiscal-${sucursal.id}`}
                            value={editForm.direccion_fiscal || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, direccion_fiscal: e.target.value })
                            }
                            placeholder="Dirección completa para facturación"
                          />
                          {sucursal.direccion && (
                            <p className="text-xs text-muted-foreground">
                              Dir. entrega: {sucursal.direccion}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`email-${sucursal.id}`}>
                            Email de Facturación *
                          </Label>
                          <Input
                            id={`email-${sucursal.id}`}
                            type="email"
                            value={editForm.email_facturacion || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, email_facturacion: e.target.value })
                            }
                            placeholder="facturas@empresa.com"
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button
                            onClick={() => handleSave(sucursal.id)}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Guardar cambios
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
