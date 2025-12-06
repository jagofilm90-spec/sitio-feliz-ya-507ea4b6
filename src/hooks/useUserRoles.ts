import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UseUserRolesReturn {
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isSecretaria: boolean;
  isVendedor: boolean;
  isChofer: boolean;
  isAlmacen: boolean;
  isContadora: boolean;
  isCliente: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  canEditPrices: () => boolean;
  canViewPrices: () => boolean;
}

export const useUserRoles = (): UseUserRolesReturn => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      console.log("👤 [ROLES] fetchRoles iniciando...");
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log("👤 [ROLES] Usuario obtenido:", user?.email);
        
        if (!user) {
          console.log("👤 [ROLES] Sin usuario, roles vacíos");
          setRoles([]);
          setIsLoading(false);
          return;
        }

        console.log("👤 [ROLES] Consultando roles para user_id:", user.id);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ [ROLES] Error fetching user roles:', error);
          setRoles([]);
        } else {
          const userRoles = data?.map(r => r.role) || [];
          console.log("👤 [ROLES] Roles obtenidos:", userRoles);
          setRoles(userRoles);
        }
      } catch (error) {
        console.error('❌ [ROLES] Error in fetchRoles:', error);
        setRoles([]);
      } finally {
        setIsLoading(false);
        console.log("👤 [ROLES] fetchRoles completado, isLoading=false");
      }
    };

    fetchRoles();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchRoles();
      } else if (event === 'SIGNED_OUT') {
        setRoles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole): boolean => roles.includes(role);
  const hasAnyRole = (checkRoles: AppRole[]): boolean => 
    checkRoles.some(role => roles.includes(role));

  // Helper para verificar si el usuario puede editar precios
  const canEditPrices = (): boolean => {
    return hasAnyRole(['admin', 'secretaria']);
  };

  // Helper para verificar si el usuario puede ver precios
  const canViewPrices = (): boolean => {
    return hasAnyRole(['admin', 'secretaria', 'contadora', 'vendedor']);
  };

  return {
    roles,
    isLoading,
    isAdmin: hasRole('admin'),
    isSecretaria: hasRole('secretaria'),
    isVendedor: hasRole('vendedor'),
    isChofer: hasRole('chofer'),
    isAlmacen: hasRole('almacen'),
    isContadora: hasRole('contadora'),
    isCliente: hasRole('cliente'),
    hasRole,
    hasAnyRole,
    canEditPrices,
    canViewPrices,
  };
};

// Configuración de permisos por módulo (fallback si la BD no está disponible)
export const MODULE_PERMISSIONS: Record<string, AppRole[]> = {
  '/dashboard': ['admin', 'secretaria', 'vendedor', 'chofer', 'almacen', 'contadora'],
  '/productos': ['admin', 'secretaria', 'almacen'],
  '/fumigaciones': ['admin', 'secretaria', 'almacen'],
  '/clientes': ['admin', 'secretaria', 'vendedor'],
  '/pedidos': ['admin', 'secretaria', 'vendedor'],
  '/compras': ['admin', 'secretaria'],
  '/inventario': ['admin', 'secretaria', 'almacen'],
  '/rentabilidad': ['admin', 'contadora'],
  '/rutas': ['admin', 'secretaria', 'chofer'],
  '/facturas': ['admin', 'secretaria', 'contadora'],
  '/empleados': ['admin', 'secretaria', 'contadora'],
  '/usuarios': ['admin'],
  '/chat': ['admin', 'secretaria', 'vendedor', 'chofer', 'almacen', 'contadora'],
  '/correos': ['admin', 'secretaria'],
  '/generate-assets': ['admin'],
  '/permisos': ['admin'],
};

// Hook para verificar acceso a un módulo específico (usa permisos de BD con fallback)
export const useModuleAccess = (path: string): { hasAccess: boolean; isLoading: boolean } => {
  const { roles, isLoading: rolesLoading } = useUserRoles();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (rolesLoading) return;
      
      if (roles.length === 0) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      try {
        // Intentar obtener permisos de la BD
        const { data: permissionsData, error } = await supabase
          .from('module_permissions')
          .select('tiene_acceso')
          .eq('module_path', path)
          .in('role', roles)
          .eq('tiene_acceso', true);

        if (error) {
          // Si hay error en BD, usar fallback estático
          const allowedRoles = MODULE_PERMISSIONS[path] || [];
          setHasAccess(roles.some(role => allowedRoles.includes(role)));
        } else {
          // Usar permisos de BD
          setHasAccess((permissionsData?.length || 0) > 0);
        }
      } catch (err) {
        // Fallback a permisos estáticos
        const allowedRoles = MODULE_PERMISSIONS[path] || [];
        setHasAccess(roles.some(role => allowedRoles.includes(role)));
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [path, roles, rolesLoading]);

  return { hasAccess, isLoading };
};

// Hook para obtener todos los permisos de módulos para los roles del usuario
export const useUserModulePermissions = (): { 
  allowedPaths: string[]; 
  isLoading: boolean;
  checkAccess: (path: string) => boolean;
} => {
  const { roles, isLoading: rolesLoading } = useUserRoles();
  const [allowedPaths, setAllowedPaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (rolesLoading) return;
      
      if (roles.length === 0) {
        setAllowedPaths([]);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('module_permissions')
          .select('module_path')
          .in('role', roles)
          .eq('tiene_acceso', true);

        if (error) {
          // Fallback to static permissions
          const paths = Object.entries(MODULE_PERMISSIONS)
            .filter(([_, allowedRoles]) => roles.some(r => allowedRoles.includes(r)))
            .map(([path]) => path);
          setAllowedPaths(paths);
        } else {
          // Use unique paths from DB
          const uniquePaths = [...new Set(data?.map(p => p.module_path) || [])];
          setAllowedPaths(uniquePaths);
        }
      } catch (err) {
        // Fallback to static permissions
        const paths = Object.entries(MODULE_PERMISSIONS)
          .filter(([_, allowedRoles]) => roles.some(r => allowedRoles.includes(r)))
          .map(([path]) => path);
        setAllowedPaths(paths);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [roles, rolesLoading]);

  const checkAccess = useMemo(() => {
    return (path: string) => allowedPaths.includes(path);
  }, [allowedPaths]);

  return { allowedPaths, isLoading, checkAccess };
};
