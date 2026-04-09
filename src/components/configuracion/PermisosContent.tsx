import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useModulePermissions, ModulePermission } from "@/hooks/useModulePermissions";
import { Shield } from "lucide-react";
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

interface PermisosContentProps {
  onRefetch?: (refetch: () => void) => void;
  isLoadingOut?: (loading: boolean) => void;
}

export function PermisosContent({ onRefetch, isLoadingOut }: PermisosContentProps) {
  const { permissions, isLoading, updatePermission, refetch } = useModulePermissions();
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Expose refetch and loading to parent
  useState(() => {
    onRefetch?.(refetch);
    isLoadingOut?.(isLoading);
  });

  const getPermission = (modulePath: string, role: string): ModulePermission | undefined => {
    return permissions.find(p => p.module_path === modulePath && p.role === role);
  };

  const handleToggle = async (permission: ModulePermission | undefined, modulePath: string, role: string) => {
    if (!permission) return;

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
      {/* Summary Cards — editorial style */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {ROLES.map(role => (
          <div
            key={role.value}
            className="bg-white border border-ink-100 rounded-xl px-5 py-4 text-center transition-colors hover:border-ink-300"
          >
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-500 font-medium">
              {role.label}
            </p>
            <p className="font-serif text-[32px] leading-tight text-ink-900 tabular-nums mt-1">
              {isLoading ? "–" : countAccessByRole(role.value)}
            </p>
            <p className="text-[12px] text-ink-500">módulos</p>
          </div>
        ))}
      </div>

      {/* Permissions Matrix */}
      <div className="rounded-xl border border-ink-100 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100">
          <h3 className="text-sm font-semibold text-ink-900">Matriz de Permisos</h3>
          <p className="text-xs text-ink-500 mt-0.5">
            Los cambios se guardan automáticamente.
          </p>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-warm-50 hover:bg-warm-50">
                  <TableHead className="w-[180px] uppercase text-[10px] font-semibold text-ink-500 tracking-wider sticky top-0 bg-warm-50">
                    Módulo
                  </TableHead>
                  {ROLES.map(role => (
                    <TableHead
                      key={role.value}
                      className="text-center min-w-[90px] uppercase text-[10px] font-semibold text-ink-500 tracking-wider sticky top-0 bg-warm-50"
                    >
                      {role.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODULES.map(module => (
                  <TableRow key={module.path} className="border-ink-100 hover:bg-warm-50 transition-colors">
                    <TableCell className="font-medium text-ink-900">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{module.name}</span>
                        <span className="text-[10px] text-ink-400">{module.path}</span>
                      </div>
                    </TableCell>
                    {ROLES.map(role => {
                      const permission = getPermission(module.path, role.value);
                      const isUpdating = permission ? updatingIds.has(permission.id) : false;
                      const hasAccess = permission?.tiene_acceso ?? false;
                      const isProtected = role.value === "admin" && module.path === "/permisos";

                      return (
                        <TableCell key={role.value} className="text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={hasAccess}
                              onCheckedChange={() => handleToggle(permission, module.path, role.value)}
                              disabled={isUpdating || isProtected}
                              className="data-[state=checked]:bg-green-600"
                            />
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
      </div>

      {/* Legend — minimal */}
      <div className="flex items-center gap-4 text-xs text-ink-500 px-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-green-600" />
          <span>Con acceso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-ink-200" />
          <span>Sin acceso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="h-3 w-3 text-amber-500" />
          <span>Admin → Permisos protegido</span>
        </div>
      </div>
    </div>
  );
}
