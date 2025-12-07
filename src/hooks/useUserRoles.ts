import { useState, useEffect, useMemo, useRef } from 'react';
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
}

const DEFAULT_RETURN: UseUserRolesReturn = {
  roles: [],
  isLoading: false,
  isAdmin: false,
  isSecretaria: false,
  isVendedor: false,
  isChofer: false,
  isAlmacen: false,
  isContadora: false,
  isCliente: false,
  hasRole: () => false,
  hasAnyRole: () => false,
};

export const useUserRoles = (): UseUserRolesReturn => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchRoles = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error getting user:', userError);
          if (isMountedRef.current) {
            setRoles([]);
            setIsLoading(false);
          }
          return;
        }
        
        if (!user) {
          if (isMountedRef.current) {
            setRoles([]);
            setIsLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user roles:', error);
          if (isMountedRef.current) {
            setRoles([]);
          }
        } else {
          if (isMountedRef.current) {
            setRoles(data?.map(r => r.role) || []);
          }
        }
      } catch (error) {
        console.error('Error in fetchRoles:', error);
        if (isMountedRef.current) {
          setRoles([]);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchRoles();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchRoles();
      } else if (event === 'SIGNED_OUT') {
        if (isMountedRef.current) {
          setRoles([]);
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (role: AppRole): boolean => roles.includes(role);
  const hasAnyRole = (checkRoles: AppRole[]): boolean => 
    checkRoles.some(role => roles.includes(role));

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
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const checkAccess = async () => {
      if (rolesLoading) return;
      
      if (roles.length === 0) {
        if (isMountedRef.current) {
          setHasAccess(false);
          setIsLoading(false);
        }
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

        if (!isMountedRef.current) return;

        if (error) {
          // Si hay error en BD, usar fallback estático
          console.error('Error fetching module permissions:', error);
          const allowedRoles = MODULE_PERMISSIONS[path] || [];
          setHasAccess(roles.some(role => allowedRoles.includes(role)));
        } else {
          // Usar permisos de BD
          setHasAccess((permissionsData?.length || 0) > 0);
        }
      } catch (err) {
        console.error('Error in checkAccess:', err);
        // Fallback a permisos estáticos
        if (isMountedRef.current) {
          const allowedRoles = MODULE_PERMISSIONS[path] || [];
          setHasAccess(roles.some(role => allowedRoles.includes(role)));
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    checkAccess();
    
    return () => {
      isMountedRef.current = false;
    };
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
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchPermissions = async () => {
      if (rolesLoading) return;
      
      if (roles.length === 0) {
        if (isMountedRef.current) {
          setAllowedPaths([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('module_permissions')
          .select('module_path')
          .in('role', roles)
          .eq('tiene_acceso', true);

        if (!isMountedRef.current) return;

        if (error) {
          console.error('Error fetching module permissions:', error);
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
        console.error('Error in fetchPermissions:', err);
        // Fallback to static permissions
        if (isMountedRef.current) {
          const paths = Object.entries(MODULE_PERMISSIONS)
            .filter(([_, allowedRoles]) => roles.some(r => allowedRoles.includes(r)))
            .map(([path]) => path);
          setAllowedPaths(paths);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchPermissions();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [roles, rolesLoading]);

  const checkAccess = useMemo(() => {
    return (path: string) => allowedPaths.includes(path);
  }, [allowedPaths]);

  return { allowedPaths, isLoading, checkAccess };
};
