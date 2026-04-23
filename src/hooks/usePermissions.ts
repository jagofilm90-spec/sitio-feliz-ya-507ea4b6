import { useUserRoles } from '@/hooks/useUserRoles';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database["public"]["Enums"]["app_role"];

export type PermissionModule =
  | 'pedidos'
  | 'clientes'
  | 'productos'
  | 'empleados'
  | 'inventario'
  | 'compras'
  | 'asistencia'
  | 'rutas'
  | 'facturas'
  | 'configuracion';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'edit_price'
  | 'authorize'
  | 'adjust_stock'
  | 'manage_roles'
  | 'see_costs'
  | 'register_manual'
  | 'conciliate'
  | 'manage';

const PERMISSION_MATRIX: Record<PermissionModule, Partial<Record<PermissionAction, AppRole[]>>> = {
  pedidos: {
    view: ['admin', 'secretaria', 'vendedor', 'contadora'],
    create: ['admin', 'secretaria', 'vendedor'],
    edit: ['admin', 'secretaria', 'vendedor'],
    edit_price: ['admin'],
    authorize: ['admin', 'secretaria'],
    delete: ['admin', 'vendedor'],
  },
  clientes: {
    view: ['admin', 'secretaria', 'vendedor'],
    create: ['admin', 'secretaria', 'vendedor'],
    edit: ['admin', 'secretaria', 'vendedor'],
    delete: ['admin'],
  },
  productos: {
    view: ['admin', 'secretaria', 'contadora', 'almacen', 'gerente_almacen'],
    create: ['admin', 'secretaria'],
    edit: ['admin', 'secretaria'],
    see_costs: ['admin', 'secretaria', 'contadora'],
    delete: ['admin'],
  },
  empleados: {
    view: ['admin', 'secretaria', 'contadora'],
    create: ['admin', 'secretaria'],
    edit: ['admin', 'secretaria'],
    delete: ['admin'],
  },
  inventario: {
    view: ['admin', 'secretaria', 'almacen', 'gerente_almacen'],
    adjust_stock: ['admin', 'almacen', 'gerente_almacen'],
  },
  compras: {
    view: ['admin', 'secretaria', 'contadora'],
    create: ['admin', 'secretaria'],
    edit: ['admin', 'secretaria', 'contadora'],
    conciliate: ['admin', 'contadora'],
  },
  asistencia: {
    view: ['admin', 'secretaria'],
    register_manual: ['admin', 'gerente_almacen'],
    edit: ['admin', 'secretaria'],
  },
  rutas: {
    view: ['admin', 'secretaria', 'chofer'],
    manage: ['admin', 'secretaria'],
  },
  facturas: {
    view: ['admin', 'secretaria', 'contadora'],
    create: ['admin', 'secretaria', 'contadora'],
    edit: ['admin', 'contadora'],
  },
  configuracion: {
    view: ['admin'],
    manage_roles: ['admin'],
    edit: ['admin'],
  },
};

export function usePermissions(
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  const { hasAnyRole, isLoading } = useUserRoles();

  if (isLoading) return false;

  const allowedRoles = PERMISSION_MATRIX[module]?.[action];
  if (!allowedRoles || allowedRoles.length === 0) return false;

  return hasAnyRole(allowedRoles);
}
