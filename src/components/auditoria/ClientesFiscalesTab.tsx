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
} from "lucide-react";

type CompletitudStatus = "completo" | "parcial" | "incompleto";

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  razon_social: string | null;
  nombre_vialidad: string | null;
  numero_exterior: string | null;
  numero_interior: string | null;
  codigo_postal: string | null;
  nombre_colonia: string | null;
  nombre_municipio: string | null;
  nombre_entidad_federativa: string | null;
  regimen_capital: string | null;
}

const evaluarCompletitud = (cliente: Cliente): CompletitudStatus => {
  const tieneRfc = !!cliente.rfc;
  const tieneRazonSocial = !!cliente.razon_social;
  const tieneDireccionEstructurada =
    !!cliente.nombre_vialidad &&
    !!cliente.codigo_postal &&
    !!cliente.nombre_colonia;

  if (!tieneRfc || !tieneRazonSocial) return "incompleto";
  if (!tieneDireccionEstructurada) return "parcial";
  return "completo";
};

const getCamposFaltantes = (cliente: Cliente): string[] => {
  const faltantes: string[] = [];
  if (!cliente.rfc) faltantes.push("RFC");
  if (!cliente.razon_social) faltantes.push("Razón Social");
  if (!cliente.nombre_vialidad) faltantes.push("Vialidad");
  if (!cliente.codigo_postal) faltantes.push("C.P.");
  if (!cliente.nombre_colonia) faltantes.push("Colonia");
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

export const ClientesFiscalesTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [expandedCliente, setExpandedCliente] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Cliente>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes-auditoria-fiscal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select(
          `id, codigo, nombre, rfc, razon_social, nombre_vialidad, 
           numero_exterior, numero_interior, codigo_postal, nombre_colonia, 
           nombre_municipio, nombre_entidad_federativa, regimen_capital`
        )
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      return data as Cliente[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Cliente> }) => {
      const { error } = await supabase
        .from("clientes")
        .update(data.updates)
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes-auditoria-fiscal"] });
      toast({
        title: "Datos actualizados",
        description: "Los datos fiscales se han guardado correctamente",
      });
      setExpandedCliente(null);
      setEditForm({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    },
  });

  const clientesConStatus = clientes.map((cliente) => ({
    ...cliente,
    status: evaluarCompletitud(cliente),
    camposFaltantes: getCamposFaltantes(cliente),
  }));

  const filteredClientes = clientesConStatus.filter((cliente) => {
    const matchesSearch =
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "todos" || cliente.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Ordenar: incompletos primero, luego parciales, luego completos
  const sortedClientes = [...filteredClientes].sort((a, b) => {
    const order = { incompleto: 0, parcial: 1, completo: 2 };
    return order[a.status] - order[b.status];
  });

  const stats = {
    total: clientes.length,
    completo: clientesConStatus.filter((c) => c.status === "completo").length,
    parcial: clientesConStatus.filter((c) => c.status === "parcial").length,
    incompleto: clientesConStatus.filter((c) => c.status === "incompleto").length,
  };

  const handleExpand = (cliente: Cliente) => {
    if (expandedCliente === cliente.id) {
      setExpandedCliente(null);
      setEditForm({});
    } else {
      setExpandedCliente(cliente.id);
      setEditForm({
        rfc: cliente.rfc || "",
        razon_social: cliente.razon_social || "",
        nombre_vialidad: cliente.nombre_vialidad || "",
        numero_exterior: cliente.numero_exterior || "",
        numero_interior: cliente.numero_interior || "",
        codigo_postal: cliente.codigo_postal || "",
        nombre_colonia: cliente.nombre_colonia || "",
        nombre_municipio: cliente.nombre_municipio || "",
        nombre_entidad_federativa: cliente.nombre_entidad_federativa || "",
        regimen_capital: cliente.regimen_capital || "",
      });
    }
  };

  const handleSave = (clienteId: string) => {
    updateMutation.mutate({
      id: clienteId,
      updates: editForm,
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
            <p className="text-sm text-muted-foreground">Total Clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.completo}</div>
            <p className="text-sm text-muted-foreground">Completos</p>
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
            <p className="text-sm text-muted-foreground">Incompletos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="incompleto">Solo Incompletos</SelectItem>
            <SelectItem value="parcial">Solo Parciales</SelectItem>
            <SelectItem value="completo">Solo Completos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes ({sortedClientes.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedClientes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No se encontraron clientes con los filtros seleccionados
            </p>
          ) : (
            sortedClientes.map((cliente) => (
              <Collapsible
                key={cliente.id}
                open={expandedCliente === cliente.id}
                onOpenChange={() => handleExpand(cliente)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {expandedCliente === cliente.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <div className="font-medium">{cliente.nombre}</div>
                          <div className="text-sm text-muted-foreground">
                            {cliente.codigo}
                            {cliente.camposFaltantes.length > 0 && (
                              <span className="ml-2">
                                • Falta: {cliente.camposFaltantes.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={cliente.status} />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t p-4 bg-muted/30 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`rfc-${cliente.id}`}>RFC *</Label>
                          <Input
                            id={`rfc-${cliente.id}`}
                            value={editForm.rfc || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, rfc: e.target.value.toUpperCase() })
                            }
                            placeholder="ABC123456XYZ"
                            maxLength={13}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`razon-${cliente.id}`}>Razón Social *</Label>
                          <Input
                            id={`razon-${cliente.id}`}
                            value={editForm.razon_social || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, razon_social: e.target.value })
                            }
                            placeholder="Nombre legal de la empresa"
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Dirección Fiscal Estructurada</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2 col-span-2">
                            <Label>Vialidad</Label>
                            <Input
                              value={editForm.nombre_vialidad || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, nombre_vialidad: e.target.value })
                              }
                              placeholder="Av. Insurgentes"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>No. Exterior</Label>
                            <Input
                              value={editForm.numero_exterior || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, numero_exterior: e.target.value })
                              }
                              placeholder="123"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>No. Interior</Label>
                            <Input
                              value={editForm.numero_interior || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, numero_interior: e.target.value })
                              }
                              placeholder="A"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>C.P. *</Label>
                            <Input
                              value={editForm.codigo_postal || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, codigo_postal: e.target.value })
                              }
                              placeholder="06600"
                              maxLength={5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Colonia *</Label>
                            <Input
                              value={editForm.nombre_colonia || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, nombre_colonia: e.target.value })
                              }
                              placeholder="Roma Norte"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Municipio</Label>
                            <Input
                              value={editForm.nombre_municipio || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, nombre_municipio: e.target.value })
                              }
                              placeholder="Cuauhtémoc"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Estado</Label>
                            <Input
                              value={editForm.nombre_entidad_federativa || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  nombre_entidad_federativa: e.target.value,
                                })
                              }
                              placeholder="Ciudad de México"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => handleSave(cliente.id)}
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
