import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface ModulePermission {
  id: string;
  role: AppRole;
  module_path: string;
  module_name: string;
  tiene_acceso: boolean;
}

interface UseModulePermissionsReturn {
  permissions: ModulePermission[];
  isLoading: boolean;
  error: string | null;
  updatePermission: (id: string, tiene_acceso: boolean) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const useModulePermissions = (): UseModulePermissionsReturn => {
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('module_permissions')
        .select('*')
        .order('module_name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setPermissions(data || []);
    } catch (err) {
      console.error('Error fetching module permissions:', err);
      setError('Error al cargar permisos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const updatePermission = async (id: string, tiene_acceso: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('module_permissions')
        .update({ tiene_acceso })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setPermissions(prev => 
        prev.map(p => p.id === id ? { ...p, tiene_acceso } : p)
      );

      return true;
    } catch (err) {
      console.error('Error updating permission:', err);
      return false;
    }
  };

  return {
    permissions,
    isLoading,
    error,
    updatePermission,
    refetch: fetchPermissions,
  };
};

// Hook para verificar acceso dinámico a un módulo
export const useDynamicModuleAccess = (path: string): { hasAccess: boolean; isLoading: boolean } => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setHasAccess(false);
          setIsLoading(false);
          return;
        }

        // Get user roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const userRoles = rolesData?.map(r => r.role) || [];

        if (userRoles.length === 0) {
          setHasAccess(false);
          setIsLoading(false);
          return;
        }

        // Check permissions for user's roles
        const { data: permissionsData } = await supabase
          .from('module_permissions')
          .select('tiene_acceso')
          .eq('module_path', path)
          .in('role', userRoles)
          .eq('tiene_acceso', true);

        setHasAccess((permissionsData?.length || 0) > 0);
      } catch (err) {
        console.error('Error checking module access:', err);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [path]);

  return { hasAccess, isLoading };
};
