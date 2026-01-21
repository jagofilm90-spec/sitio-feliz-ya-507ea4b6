import { Navigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

/**
 * Tercera capa de defensa: Proteger rutas por rol
 * Si el usuario no tiene el rol permitido, redirige inmediatamente
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  redirectTo = "/auth" 
}: ProtectedRouteProps) => {
  const { roles, isLoading } = useUserRoles();

  // Mientras carga, mostrar spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no hay roles permitidos especificados, solo verificar que esté autenticado
  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Verificar si tiene alguno de los roles permitidos
  const hasPermission = roles.some(role => allowedRoles.includes(role));

  if (!hasPermission) {
    // Redirigir según el rol del usuario
    const isOnlyAlmacen = roles.length === 1 && roles.includes("almacen");
    const isOnlyGerenteAlmacen = roles.length === 1 && roles.includes("gerente_almacen");
    const isOnlyChofer = roles.length === 1 && roles.includes("chofer");
    const isOnlySecretaria = roles.includes("secretaria") && !roles.includes("admin");
    
    if (isOnlyAlmacen || isOnlyGerenteAlmacen) {
      return <Navigate to="/almacen-tablet" replace />;
    }
    if (isOnlyChofer) {
      return <Navigate to="/chofer" replace />;
    }
    if (isOnlySecretaria) {
      return <Navigate to="/secretaria" replace />;
    }
    
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
