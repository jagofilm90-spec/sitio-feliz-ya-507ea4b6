import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import logoAlmasa from "@/assets/logo-almasa.png";

const colors = ["#E24B4A", "#D85A30", "#BA7517", "#639922", "#1D9E75", "#378ADD", "#7F77DD", "#D4537E"];
const getColor = (n: string) => colors[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
const getInitials = (n: string) => { const p = n.split(" ").filter(Boolean); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.substring(0, 2).toUpperCase(); };

const Auth = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPuesto, setUserPuesto] = useState("");
  const [userFoto, setUserFoto] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) await checkUserRoleAndRedirect(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        setTimeout(async () => { await checkUserRoleAndRedirect(session.user.id); }, 100);
      }
      if (!session && event !== "SIGNED_OUT" && event !== "INITIAL_SESSION") {
        await supabase.auth.signOut();
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUserRoleAndRedirect = async (userId: string, retries = 3): Promise<void> => {
    try {
      const { data: cliente } = await supabase.from("clientes").select("id").eq("user_id", userId).maybeSingle();
      if (cliente) { navigate("/portal-cliente", { replace: true }); return; }
      const { data: userRoles, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (error || !userRoles || userRoles.length === 0) {
        if (retries > 0) { await new Promise(r => setTimeout(r, 500)); return checkUserRoleAndRedirect(userId, retries - 1); }
        navigate("/dashboard", { replace: true }); return;
      }
      const roles = userRoles.map(r => r.role);
      if (roles.length === 1 && (roles[0] === "almacen" || roles[0] === "gerente_almacen")) { navigate("/almacen-tablet", { replace: true }); return; }
      if (roles.length === 1 && roles[0] === "chofer") { navigate("/chofer", { replace: true }); return; }
      if (roles.includes("vendedor") && !roles.includes("admin") && !roles.includes("secretaria")) { navigate("/vendedor", { replace: true }); return; }
      if (roles.includes("secretaria") && !roles.includes("admin")) { navigate("/secretaria", { replace: true }); return; }
      navigate("/dashboard", { replace: true });
    } catch {
      if (retries > 0) { await new Promise(r => setTimeout(r, 500)); return checkUserRoleAndRedirect(userId, retries - 1); }
      navigate("/dashboard", { replace: true });
    }
  };

  const handleContinue = async () => {
    if (!email || !email.includes("@")) { toast({ title: "Email inválido", variant: "destructive" }); return; }
    setLoading(true);
    setUserFoto(null); setUserName(""); setUserPuesto("");
    try {
      const { data: result } = await supabase.rpc("lookup_employee_by_email", { p_email: email });
      if (result) {
        const info = result as { nombre: string; puesto: string | null; empleado_id: string | null; foto_url: string | null };
        setUserName(info.nombre || email.split("@")[0]);
        setUserPuesto(info.puesto || "");
        if (info.empleado_id) {
          const { data: blob } = await supabase.storage.from("empleados-documentos").download(`${info.empleado_id}/foto.jpg`);
          if (blob) setUserFoto(URL.createObjectURL(blob));
          else if (info.foto_url) setUserFoto(info.foto_url);
        }
      } else {
        setUserName(email.split("@")[0]);
      }
    } catch {
      setUserName(email.split("@")[0]);
    }
    setLoading(false);
    setStep(2);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) throw new Error("Credenciales inválidas");
        throw error;
      }
      toast({ title: "Bienvenido", description: "Sesión iniciada correctamente" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1); setPassword(""); setUserFoto(null); setUserName(""); setUserPuesto(""); setShowReset(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-white to-gray-50 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Branding */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground tracking-widest uppercase">Desde 1904</p>
          <img src={logoAlmasa} alt="ALMASA" className="h-20 mx-auto my-2" />
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Trabajando por un México mejor</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="pt-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleContinue(); }}
                    autoFocus
                    className="h-11"
                  />
                </div>
                <Button className="w-full h-11" onClick={handleContinue} disabled={loading || !email}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">¿Necesitas acceso? Contacta al administrador</p>
              </div>
            )}

            {step === 2 && !showReset && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="text-center mb-4">
                  {userFoto ? (
                    <img src={userFoto} className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />
                  ) : (
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3" style={{ backgroundColor: getColor(userName || email) }}>
                      {getInitials(userName || email)}
                    </div>
                  )}
                  <p className="text-lg font-semibold text-muted-foreground">Bienvenido</p>
                  <p className="font-bold text-xl">{userName}</p>
                  <p className="text-sm text-muted-foreground">{userPuesto || email}</p>
                </div>
                <Input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  className="h-11"
                />
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Iniciando sesión...</> : "Iniciar Sesión"}
                </Button>
                <div className="flex justify-between text-xs">
                  <button type="button" className="text-muted-foreground hover:text-foreground flex items-center gap-1" onClick={handleBack}>
                    <ArrowLeft className="h-3 w-3" /> Cambiar cuenta
                  </button>
                  <button type="button" className="text-primary hover:underline" onClick={() => setShowReset(true)}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </form>
            )}

            {step === 2 && showReset && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Recuperar contraseña</p>
                <p className="text-xs text-muted-foreground">Enviaremos un enlace a <strong>{email}</strong></p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowReset(false)}>Cancelar</Button>
                  <Button size="sm" className="flex-1" disabled={resetLoading} onClick={async () => {
                    setResetLoading(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
                    setResetLoading(false);
                    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                    else { toast({ title: "Enlace enviado", description: "Revisa tu correo." }); setShowReset(false); }
                  }}>
                    {resetLoading ? "Enviando..." : "Enviar enlace"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Auth;
