import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Search,
  MapPin,
  Users,
  User,
  BarChart3,
  Edit,
  Trash2,
  RotateCcw,
  Package,
  Store,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ClienteBase {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  es_grupo: boolean;
  grupo_cliente_id: string | null;
  activo: boolean;
  vendedor_asignado: string | null;
  saldo_pendiente: number | null;
  limite_credito: number | null;
  termino_credito: string;
  cliente_sucursales: { count: number }[];
  cliente_productos_frecuentes: { count: number }[];
  zona: { id: string; nombre: string } | null;
  grupo_padre: { id: string; nombre: string; codigo: string } | null;
}

interface SucursalMatch {
  id: string;
  nombre: string;
  codigo_sucursal: string | null;
  cliente_id: string;
  es_rosticeria: boolean | null;
}

interface Props {
  clientes: ClienteBase[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEdit: (cliente: any) => void;
  onDelete: (cliente: any) => void;
  onReactivar: (cliente: any) => void;
  onViewSucursales: (cliente: { id: string; nombre: string; grupo_cliente_id?: string | null }) => void;
  onViewHistorial: (cliente: { id: string; nombre: string }) => void;
  onViewProductos: (cliente: { id: string; nombre: string }) => void;
  getVendedorName: (id: string | null) => string | null;
  getCreditLabel: (term: string) => string;
}

export function ClientesListaJerarquica({
  clientes,
  loading,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
  onReactivar,
  onViewSucursales,
  onViewHistorial,
  onViewProductos,
  getVendedorName,
  getCreditLabel,
}: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sucursalMatches, setSucursalMatches] = useState<SucursalMatch[]>([]);
  const [searchingSucursales, setSearchingSucursales] = useState(false);

  // Search sucursales when searchTerm changes
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSucursalMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingSucursales(true);
      try {
        const { data } = await supabase
          .from("cliente_sucursales")
          .select("id, nombre, codigo_sucursal, cliente_id, es_rosticeria")
          .eq("activo", true)
          .or(`nombre.ilike.%${searchTerm}%,codigo_sucursal.ilike.%${searchTerm}%`)
          .limit(50);
        setSucursalMatches(data || []);
        
        // Auto-expand groups that contain matching sucursales
        if (data && data.length > 0) {
          const matchingClienteIds = new Set(data.map((s) => s.cliente_id));
          const groupsToExpand = new Set<string>();
          clientes.forEach((c) => {
            if (c.es_grupo) {
              const hasMatchingChild = clientes.some(
                (child) =>
                  child.grupo_cliente_id === c.id &&
                  (matchingClienteIds.has(child.id) ||
                    child.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    child.rfc?.toLowerCase().includes(searchTerm.toLowerCase()))
              );
              if (hasMatchingChild) groupsToExpand.add(c.id);
            }
          });
          if (groupsToExpand.size > 0) {
            setExpandedGroups((prev) => new Set([...prev, ...groupsToExpand]));
          }
        }
      } catch (err) {
        console.error("Error searching sucursales:", err);
      } finally {
        setSearchingSucursales(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, clientes]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Categorize clientes
  const { grupos, individuales } = useMemo(() => {
    const grupos: ClienteBase[] = [];
    const individuales: ClienteBase[] = [];

    // Build a set of cliente IDs that match sucursal searches
    const sucursalClienteIds = new Set(sucursalMatches.map((s) => s.cliente_id));

    clientes.forEach((c) => {
      const matchesName =
        !searchTerm ||
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.rfc?.toLowerCase().includes(searchTerm.toLowerCase());

      // A client matches if its name/rfc matches OR if a sucursal matches
      const matchesSucursal = sucursalClienteIds.has(c.id);

      if (c.es_grupo) {
        // For groups, check if any child matches
        const childMatches = clientes.some(
          (child) =>
            child.grupo_cliente_id === c.id &&
            (child.nombre.toLowerCase().includes(searchTerm?.toLowerCase() || "") ||
              child.rfc?.toLowerCase().includes(searchTerm?.toLowerCase() || "") ||
              sucursalClienteIds.has(child.id))
        );
        if (!searchTerm || matchesName || childMatches) {
          grupos.push(c);
        }
      } else if (!c.grupo_cliente_id) {
        if (!searchTerm || matchesName || matchesSucursal) {
          individuales.push(c);
        }
      }
    });

    return { grupos, individuales };
  }, [clientes, searchTerm, sucursalMatches]);

  // Get children for a group
  const getGroupChildren = (groupId: string) => {
    const sucursalClienteIds = new Set(sucursalMatches.map((s) => s.cliente_id));
    return clientes.filter((c) => {
      if (c.grupo_cliente_id !== groupId) return false;
      if (!searchTerm) return true;
      return (
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.rfc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sucursalClienteIds.has(c.id)
      );
    });
  };

  // Get group stats
  const getGroupStats = (groupId: string) => {
    const children = clientes.filter((c) => c.grupo_cliente_id === groupId);
    const totalSucursales = children.reduce(
      (sum, c) => sum + (c.cliente_sucursales?.[0]?.count || 0),
      0
    );
    // Count rosticerías from sucursal matches or estimate
    return {
      razonesSociales: children.length,
      totalSucursales,
    };
  };

  // Get sucursal matches for a specific client
  const getSucursalMatchesForClient = (clienteId: string) => {
    return sucursalMatches.filter((s) => s.cliente_id === clienteId);
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Cargando clientes...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, RFC o # sucursal (ej: 309)..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
        {searchingSucursales && (
          <span className="absolute right-3 top-3 text-xs text-muted-foreground animate-pulse">
            Buscando...
          </span>
        )}
      </div>

      {/* Groups section */}
      {grupos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            Grupos ({grupos.length})
          </h3>
          {grupos.map((grupo) => {
            const stats = getGroupStats(grupo.id);
            const isExpanded = expandedGroups.has(grupo.id);
            const children = getGroupChildren(grupo.id);

            return (
              <Collapsible
                key={grupo.id}
                open={isExpanded}
                onOpenChange={() => toggleGroup(grupo.id)}
              >
                <Card className="border-border/50 hover:border-primary/30 transition-colors">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-base">
                              {grupo.nombre}
                            </h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {stats.razonesSociales} razones sociales
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {stats.totalSucursales} sucursales
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-primary/5">
                            {stats.razonesSociales} RS
                          </Badge>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-4 pb-4 pt-2 space-y-1.5 max-h-[500px] overflow-y-auto">
                      {children.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No se encontraron razones sociales
                        </p>
                      ) : (
                        children.map((child) => {
                          const childSucMatches = getSucursalMatchesForClient(child.id);
                          return (
                            <div
                              key={child.id}
                              className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 cursor-pointer group transition-colors"
                              onClick={() => onViewSucursales({ id: child.id, nombre: child.nombre, grupo_cliente_id: child.grupo_cliente_id })}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="font-medium text-sm truncate">
                                    {child.nombre}
                                  </span>
                                  {!child.activo && (
                                    <Badge variant="destructive" className="text-[10px] h-4">
                                      Inactivo
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 ml-5">
                                  <span className="font-mono">{child.rfc || "Sin RFC"}</span>
                                  <span>{child.cliente_sucursales?.[0]?.count || 0} suc.</span>
                                  {getVendedorName(child.vendedor_asignado) && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-2.5 w-2.5" />
                                      {getVendedorName(child.vendedor_asignado)}
                                    </span>
                                  )}
                                </div>
                                {/* Show matched sucursales */}
                                {childSucMatches.length > 0 && searchTerm && (
                                  <div className="ml-5 mt-1 space-y-0.5">
                                    {childSucMatches.slice(0, 3).map((suc) => (
                                      <div
                                        key={suc.id}
                                        className="text-xs text-primary flex items-center gap-1"
                                      >
                                        <MapPin className="h-2.5 w-2.5" />
                                        {suc.codigo_sucursal && (
                                          <span className="font-mono font-bold">
                                            #{suc.codigo_sucursal}
                                          </span>
                                        )}
                                        {suc.nombre}
                                      </div>
                                    ))}
                                    {childSucMatches.length > 3 && (
                                      <span className="text-xs text-muted-foreground ml-3">
                                        +{childSucMatches.length - 3} más
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Individual clients section */}
      {individuales.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            Clientes Individuales ({individuales.length})
          </h3>
          {individuales.map((cliente) => {
            const clientSucMatches = getSucursalMatchesForClient(cliente.id);
            return (
              <Card
                key={cliente.id}
                className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => onEdit(cliente)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm truncate">
                            {cliente.nombre}
                          </h4>
                          {!cliente.activo && (
                            <Badge variant="destructive" className="text-[10px] h-4">
                              Inactivo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{cliente.rfc || "Sin RFC"}</span>
                          <span>{cliente.cliente_sucursales?.[0]?.count || 0} sucursales</span>
                          {cliente.zona && <span>{cliente.zona.nombre}</span>}
                          {getVendedorName(cliente.vendedor_asignado) && (
                            <span className="flex items-center gap-1">
                              <User className="h-2.5 w-2.5" />
                              {getVendedorName(cliente.vendedor_asignado)}
                            </span>
                          )}
                          {(cliente.saldo_pendiente || 0) > 0 && (
                            <span className="text-destructive font-medium">
                              Saldo: ${(cliente.saldo_pendiente || 0).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {/* Show matched sucursales */}
                        {clientSucMatches.length > 0 && searchTerm && (
                          <div className="mt-1 space-y-0.5">
                            {clientSucMatches.slice(0, 3).map((suc) => (
                              <div
                                key={suc.id}
                                className="text-xs text-primary flex items-center gap-1"
                              >
                                <MapPin className="h-2.5 w-2.5" />
                                {suc.codigo_sucursal && (
                                  <span className="font-mono font-bold">
                                    #{suc.codigo_sucursal}
                                  </span>
                                )}
                                {suc.nombre}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewSucursales({ id: cliente.id, nombre: cliente.nombre, grupo_cliente_id: cliente.grupo_cliente_id });
                        }}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewHistorial({ id: cliente.id, nombre: cliente.nombre });
                        }}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProductos({ id: cliente.id, nombre: cliente.nombre });
                        }}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      {cliente.activo ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(cliente);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReactivar(cliente);
                          }}
                        >
                          <RotateCcw className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {grupos.length === 0 && individuales.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron clientes
          {searchTerm && (
            <p className="text-sm mt-1">
              Intenta con otro término de búsqueda
            </p>
          )}
        </div>
      )}
    </div>
  );
}
