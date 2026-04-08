import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { AlmasaLogoBoot } from "@/components/brand/AlmasaLogoBoot";

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
      const { data, error } = await supabase.functions.invoke("lookup-login-user", {
        body: { email },
      });
      if (error) throw error;

      const info = data as { nombre?: string; puesto?: string | null; foto_url?: string | null } | null;
      setUserName(info?.nombre || email.split("@")[0]);
      setUserPuesto(info?.puesto || "");
      setUserFoto(info?.foto_url || null);

      // Fallback: if Edge Function didn't return a photo, try querying empleados directly
      if (!info?.foto_url) {
        const { data: emp } = await supabase
          .from("empleados")
          .select("foto_url")
          .eq("email", email.trim().toLowerCase())
          .maybeSingle();
        if (emp?.foto_url) setUserFoto(emp.foto_url);
      }
    } catch {
      // Edge Function failed entirely — try direct DB lookup
      try {
        const { data: emp } = await supabase
          .from("empleados")
          .select("nombre_completo, puesto, foto_url")
          .eq("email", email.trim().toLowerCase())
          .maybeSingle();
        if (emp) {
          setUserName(emp.nombre_completo || email.split("@")[0]);
          setUserPuesto(emp.puesto || "");
          if (emp.foto_url) setUserFoto(emp.foto_url);
        } else {
          setUserName(email.split("@")[0]);
        }
      } catch {
        setUserName(email.split("@")[0]);
      }
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
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-sm" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Branding */}
        <div className="text-center">
          <AlmasaLogoBoot size={80} className="almasa-logo-boot mx-auto mb-2" />
          <h1 className="boot-wordmark text-center mb-3"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '56px',
                fontWeight: 600,
                color: '#c41e3a',
                letterSpacing: '0.03em',
                lineHeight: 1
              }}>
            ALMASA<span style={{
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: '0.75em',
              marginLeft: '0.05em'
            }}>·OS</span>
          </h1>
          <p className="boot-tagline text-center"
             style={{
               fontFamily: "'Inter Tight', sans-serif",
               fontSize: '11px',
               textTransform: 'uppercase',
               letterSpacing: '0.22em',
               color: '#6a6a6a',
               fontWeight: 500,
               marginTop: '16px',
               marginBottom: '48px'
             }}>
            Sistema operativo · Casa fundada en 1904
          </p>
        </div>

        <div className="boot-card"
             style={{
               background: 'hsl(var(--card))',
               border: '0.5px solid hsl(var(--border))',
               borderRadius: '16px',
               padding: '40px',
               width: '100%',
               maxWidth: '400px',
               margin: '0 auto',
               boxShadow: '0 16px 48px rgba(10,10,10,0.06)'
             }}>
            {step === 1 && (
              <div>
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleContinue(); }}
                  autoFocus
                  className="auth-input"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#faf9f6',
                    border: '0.5px solid #d4d4d0',
                    borderRadius: '8px',
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: '15px',
                    color: 'hsl(var(--foreground))',
                    outline: 'none',
                    marginBottom: '20px'
                  }}
                />
                <button
                  onClick={handleContinue}
                  disabled={loading || !email}
                  className="disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: '#c41e3a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: loading || !email ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.01em',
                    boxShadow: '0 1px 2px rgba(132,18,36,0.18)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Continuar"}
                </button>
                <p style={{
                  textAlign: 'center',
                  marginTop: '20px',
                  fontSize: '13px',
                  color: '#6a6a6a',
                  fontFamily: "'Inter Tight', sans-serif"
                }}>
                  ¿Necesitas acceso? <span style={{ color: '#c41e3a', cursor: 'pointer' }}>Contacta al administrador</span>
                </p>
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
                  {userPuesto && <p className="text-sm text-muted-foreground">{userPuesto}</p>}
                </div>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  className="auth-input"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#faf9f6',
                    border: '0.5px solid #d4d4d0',
                    borderRadius: '8px',
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: '15px',
                    color: 'hsl(var(--foreground))',
                    outline: 'none',
                    marginBottom: '20px'
                  }}
                />
                <button type="submit" disabled={loading}
                  className="disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: '#c41e3a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.01em',
                    boxShadow: '0 1px 2px rgba(132,18,36,0.18)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin inline" />Iniciando sesión...</> : "Iniciar Sesión"}
                </button>
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
                  <button className="flex-1 disabled:opacity-60" disabled={resetLoading}
                    style={{
                      padding: '8px 16px',
                      background: '#c41e3a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: resetLoading ? 'not-allowed' : 'pointer',
                      flex: 1
                    }}
                    onClick={async () => {
                    setResetLoading(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
                    setResetLoading(false);
                    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                    else { toast({ title: "Enlace enviado", description: "Revisa tu correo." }); setShowReset(false); }
                  }}>
                    {resetLoading ? "Enviando..." : "Enviar enlace"}
                  </button>
                </div>
              </div>
            )}
          </div>

      </div>
    </div>
  );
};

export default Auth;
