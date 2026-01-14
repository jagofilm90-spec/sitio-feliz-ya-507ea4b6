import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import logoAlmasa from "@/assets/logo-almasa.png";

const authSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await checkUserRoleAndRedirect(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        setTimeout(async () => {
          await checkUserRoleAndRedirect(session.user.id);
        }, 100);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUserRoleAndRedirect = async (userId: string, retries = 3): Promise<void> => {
    try {
      // Verificar si es cliente portal
      const { data: cliente } = await supabase
        .from("clientes")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (cliente) {
        navigate("/portal-cliente", { replace: true });
        return;
      }

      // Verificar roles del usuario con retry logic
      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      // Si hay error o no hay roles, reintentar
      if (error || !userRoles || userRoles.length === 0) {
        console.warn("Roles query issue, attempt:", 4 - retries, { error, userRoles });
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 500));
          return checkUserRoleAndRedirect(userId, retries - 1);
        }
        // Si agotamos reintentos, ir a dashboard
        console.warn("Exhausted retries, defaulting to dashboard");
        navigate("/dashboard", { replace: true });
        return;
      }

      const roles = userRoles.map(r => r.role);
      console.log("User roles for redirect:", roles);
      
      // Si tiene SOLO rol almacen, ir a tablet
      const isOnlyAlmacen = roles.length === 1 && roles[0] === "almacen";
      if (isOnlyAlmacen) {
        console.log("Redirecting to /almacen-tablet");
        navigate("/almacen-tablet", { replace: true });
        return;
      }

      // Solo chofer -> panel chofer
      const isOnlyChofer = roles.length === 1 && roles[0] === "chofer";
      if (isOnlyChofer) {
        console.log("Redirecting to /chofer");
        navigate("/chofer", { replace: true });
        return;
      }

      // Solo vendedor -> panel vendedor
      const isOnlyVendedor = roles.includes("vendedor") && 
        !roles.includes("admin") && !roles.includes("secretaria");
      if (isOnlyVendedor) {
        console.log("Redirecting to /vendedor");
        navigate("/vendedor", { replace: true });
        return;
      }

      // Solo secretaria (sin admin) -> panel secretaria
      const isOnlySecretaria = roles.includes("secretaria") && !roles.includes("admin");
      if (isOnlySecretaria) {
        console.log("Redirecting to /secretaria");
        navigate("/secretaria", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Error checking user role:", error);
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 500));
        return checkUserRoleAndRedirect(userId, retries - 1);
      }
      navigate("/dashboard", { replace: true });
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.safeParse({ email, password });

      if (!validation.success) {
        toast({
          title: "Error de validación",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Credenciales inválidas");
        }
        throw error;
      }

      toast({
        title: "Bienvenido",
        description: "Sesión iniciada correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error, intenta de nuevo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-8">
          <img src={logoAlmasa} alt="ALMASA" className="h-16 mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Abarrotes la Manita SA de CV</p>
          <p className="text-sm text-muted-foreground">Sistema de Gestión Empresarial</p>
        </div>
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-center">
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Cargando..." : "Iniciar Sesión"}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              ¿Necesitas acceso? Contacta al administrador del sistema
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
