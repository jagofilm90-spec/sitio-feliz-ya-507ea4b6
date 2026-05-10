import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";

interface ClienteProtectedRouteProps {
  children: ReactNode;
}

/**
 * Protege rutas del Portal Cliente.
 * Verifica:
 * 1. Usuario autenticado en Supabase Auth
 * 2. Usuario vinculado a un registro en tabla clientes (clientes.user_id)
 * Si no cumple → redirect a /auth
 */
const ClienteProtectedRoute = ({ children }: ClienteProtectedRouteProps) => {
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");

  useEffect(() => {
    const checkClienteAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setStatus("unauthorized");
          return;
        }

        // Verificar que el usuario está vinculado a un cliente
        const { data: cliente } = await supabase
          .from("clientes")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cliente) {
          setStatus("authorized");
        } else {
          // Usuario autenticado pero NO es cliente — puede ser empleado
          // que accidentalmente llegó aquí
          setStatus("unauthorized");
        }
      } catch {
        setStatus("unauthorized");
      }
    };

    checkClienteAuth();

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setStatus("unauthorized");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <AlmasaLoading size={56} />
      </div>
    );
  }

  if (status === "unauthorized") {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ClienteProtectedRoute;
