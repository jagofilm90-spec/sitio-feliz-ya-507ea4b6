import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useModulePermissions, ModulePermission } from "@/hooks/useModulePermissions";
import { Shield, Check, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "secretaria", label: "Secretaria" },
  { value: "vendedor", label: "Vendedor" },
  { value: "almacen", label: "Almacén" },
  { value: "gerente_almacen", label: "Gerente Almacén" },
  { value: "chofer", label: "Chofer" },
  { value: "contadora", label: "Contadores" },
  { value: "cliente", label: "Cliente" },
];

const MODULES = [
  { path: "/dashboard", name: "Dashboard" },
  { path: "/productos", name: "Productos" },
  { path: "/fumigaciones", name: "Fumigaciones" },
  { path: "/clientes", name: "Clientes" },
  { path: "/pedidos", name: "Pedidos" },
  { path: "/compras", name: "Compras" },
  { path: "/inventario", name: "Inventario" },
  { path: "/rentabilidad", name: "Rentabilidad" },
  { path: "/rutas", name: "Rutas" },
  { path: "/facturas", name: "Facturas" },
  { path: "/empleados", name: "Empleados" },
  { path: "/usuarios", name: "Usuarios" },
  { path: "/chat", name: "Chat" },
  { path: "/correos", name: "Correos" },
  { path: "/permisos", name: "Permisos" },
  { path: "/precios", name: "Precios" },
  { path: "/almacen-tablet", name: "Almacén Tablet" },
  { path: "/chofer", name: "Panel Chofer" },
  { path: "/vendedor", name: "Panel Vendedor" },
  { path: "/secretaria", name: "Panel Secretaria" },
  { path: "/configuracion", name: "Configuración" },
  { path: "/respaldos", name: "Respaldos" },
];

export function PermisosContent() {
  const { permissions, isLoading, updatePermission, refetch } = useModulePermissions();
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const getPermission = (modulePath: string, role: string): ModulePermission | undefined => {
    return permissions.find(p => p.module_path === modulePath && p.role === role);
  };

  const handleToggle = async (permission: ModulePermission | undefined, modulePath: string, role: string) => {
    if (!permission) return;

    // Prevent disabling admin's access to permisos (would lock out admin)
    if (role === "admin" && modulePath === "/permisos") {
      toast.error("No puedes quitar el acceso de Admin a Permisos");
      return;
    }

    setUpdatingIds(prev => new Set(prev).add(permission.id));
    
    const success = await updatePermission(permission.id, !permission.tiene_acceso);
    
    if (success) {
      toast.success(
        permission.tiene_acceso 
          ? `Acceso removido para ${role} en ${modulePath}`
          : `Acceso otorgado para ${role} en ${modulePath}`
      );
    } else {
      toast.error("Error al actualizar permiso");
    }

    setUpdatingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(permission.id);
      return newSet;
    });
  };

  const countAccessByRole = (role: string): number => {
    return permissions.filter(p => p.role === role && p.tiene_acceso).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Administración de Permisos</h1>
            <p className="text-muted-foreground">
              Configura qué roles tienen acceso a cada módulo del sistema
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {ROLES.map(role => (
          <Card key={role.value} className="bg-card/50">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">{role.label}</p>
              <p className="text-2xl font-bold text-primary">
                {isLoading ? "-" : countAccessByRole(role.value)}
              </p>
              <p className="text-xs text-muted-foreground">módulos</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Permisos</CardTitle>
          <CardDescription>
            Activa o desactiva el acceso de cada rol a los módulos del sistema. Los cambios se guardan automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px] font-bold">Módulo</TableHead>
                    {ROLES.map(role => (
                      <TableHead key={role.value} className="text-center min-w-[100px]">
                        <span className="text-xs font-semibold">{role.label}</span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULES.map(module => (
                    <TableRow key={module.path}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{module.name}</span>
                          <span className="text-xs text-muted-foreground">{module.path}</span>
                        </div>
                      </TableCell>
                      {ROLES.map(role => {
                        const permission = getPermission(module.path, role.value);
                        const isUpdating = permission ? updatingIds.has(permission.id) : false;
                        const hasAccess = permission?.tiene_acceso ?? false;
                        const isProtected = role.value === "admin" && module.path === "/permisos";

                        return (
                          <TableCell key={role.value} className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Switch
                                checked={hasAccess}
                                onCheckedChange={() => handleToggle(permission, module.path, role.value)}
                                disabled={isUpdating || isProtected}
                                className="data-[state=checked]:bg-green-600"
                              />
                              {hasAccess ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                                  <Check className="h-3 w-3" />
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 text-xs">
                                  <X className="h-3 w-3" />
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <Check className="h-3 w-3" />
              </Badge>
              <span className="text-muted-foreground">Tiene acceso</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                <X className="h-3 w-3" />
              </Badge>
              <span className="text-muted-foreground">Sin acceso</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-yellow-500" />
              <span className="text-muted-foreground">El acceso de Admin a Permisos está protegido</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
