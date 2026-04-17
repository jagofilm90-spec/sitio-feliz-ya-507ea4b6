import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { AlmasaLogoBoot } from "@/components/brand/AlmasaLogoBoot";
import { BootTransition } from "@/components/brand/BootTransition";
import { cn } from "@/lib/utils";

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
  const [animate, setAnimate] = useState(false);
  const [booted, setBooted] = useState(false);
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

      if (!info?.foto_url) {
        const { data: emp } = await supabase
          .from("empleados")
          .select("foto_url")
          .eq("email", email.trim().toLowerCase())
          .maybeSingle();
        if (emp?.foto_url) setUserFoto(emp.foto_url);
      }
    } catch {
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
    setAnimate(false);
    setStep(2);
    requestAnimationFrame(() => setAnimate(true));
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

  /* ── shared input style: border-bottom only ── */
  const inputClass = cn(
    "w-full bg-transparent px-0 py-3 text-[16px] text-ink-900 placeholder:text-ink-300",
    "border-0 border-b border-ink-200 rounded-none outline-none",
    "focus:border-b-[1.5px] focus:border-crimson-500 transition-colors duration-200",
    "font-['Inter_Tight',sans-serif]"
  );

  if (!booted) {
    return (
      <BootTransition onComplete={() => setBooted(true)} />
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white p-4">
      {/* ── Branding header ── */}
      <div className="text-center">
        <AlmasaLogoBoot size={130} className="almasa-logo-boot mx-auto mb-4" />
        <h1
          className="text-center"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '26px',
            fontWeight: 600,
            color: '#c41e3a',
            letterSpacing: '0.06em',
            lineHeight: 1,
          }}
        >
          ALMASA<span style={{ fontStyle: 'italic', fontWeight: 400, fontSize: '0.75em', marginLeft: '0.05em' }}>·OS</span>
        </h1>
        <p
          className="text-center"
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: '#6a6a6a',
            fontWeight: 500,
            marginTop: '12px',
          }}
        >
          Sistema operativo · Casa fundada en 1904
        </p>
      </div>

      {/* ── Form area — no card, no border, no shadow ── */}
      <div className="w-full max-w-[360px] mt-16">

        {/* ══════ STEP 1: Email ══════ */}
        {step === 1 && (
          <div>
            <label
              className="block mb-2"
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6a6a6a',
                fontWeight: 600,
              }}
            >
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleContinue(); }}
              autoFocus
              className={inputClass}
            />
            <button
              onClick={handleContinue}
              disabled={loading || !email}
              className="w-full mt-7 py-3 rounded-lg text-white text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                background: '#c41e3a',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { if (!loading && email) (e.target as HTMLButtonElement).style.background = '#a8182f'; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#c41e3a'; }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Continuar"}
            </button>
            <p
              className="text-center mt-5"
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: '12px',
                color: '#8a8a87',
              }}
            >
              ¿Necesitas acceso?{' '}
              <span className="text-[#c41e3a] font-medium cursor-pointer hover:underline">
                Contacta al administrador
              </span>
            </p>
          </div>
        )}

        {/* ══════ STEP 2: Photo + Name + Password ══════ */}
        {step === 2 && !showReset && (
          <form
            onSubmit={handleLogin}
            className={cn(
              "transition-all duration-300 ease-out",
              animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            )}
          >
            {/* Avatar */}
            <div className="flex justify-center">
              {userFoto ? (
                <img
                  src={userFoto}
                  className="w-24 h-24 sm:w-24 sm:h-24 rounded-full object-cover"
                  style={{
                    border: '3px solid white',
                    boxShadow: '0 4px 12px rgba(15,14,13,0.08)',
                  }}
                />
              ) : (
                <div
                  className="w-24 h-24 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                  style={{
                    backgroundColor: getColor(userName || email),
                    border: '3px solid white',
                    boxShadow: '0 4px 12px rgba(15,14,13,0.08)',
                  }}
                >
                  {getInitials(userName || email)}
                </div>
              )}
            </div>

            {/* Greeting */}
            <p
              className="text-center mt-6 italic"
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: '13px',
                color: '#6a6a6a',
              }}
            >
              Bienvenido de vuelta,
            </p>

            {/* Name — editorial Cormorant */}
            <h2
              className="text-center mt-1"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '32px',
                fontWeight: 500,
                color: '#1a1a1a',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}
            >
              {userName}
            </h2>

            {/* Role */}
            {userPuesto && (
              <p
                className="text-center mt-1.5"
                style={{
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: '13px',
                  color: '#6a6a6a',
                }}
              >
                {userPuesto}
              </p>
            )}

            {/* Separator */}
            <div className="flex justify-center mt-8">
              <div className="w-10 h-px bg-ink-200" />
            </div>

            {/* Password label */}
            <label
              className="block mt-8 mb-2"
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6a6a6a',
                fontWeight: 600,
              }}
            >
              Contraseña
            </label>

            {/* Password input */}
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className={inputClass}
            />

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-7 py-3 rounded-lg text-white text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                background: '#c41e3a',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = '#a8182f'; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#c41e3a'; }}
            >
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin inline" />Iniciando sesión...</> : "Iniciar sesión"}
            </button>

            {/* Bottom links */}
            <div className="flex justify-between mt-5">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-[12px] text-ink-500 hover:text-crimson-500 transition-colors"
                style={{ fontFamily: "'Inter Tight', sans-serif" }}
              >
                <ArrowLeft className="h-3 w-3" /> Cambiar cuenta
              </button>
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-[12px] text-[#c41e3a] hover:text-[#a8182f] transition-colors"
                style={{ fontFamily: "'Inter Tight', sans-serif" }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        )}

        {/* ══════ STEP 2: Reset password ══════ */}
        {step === 2 && showReset && (
          <div
            className={cn(
              "transition-all duration-300 ease-out",
              animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            )}
          >
            <p className="font-serif italic text-[18px] text-ink-400 mb-2">Recuperar contraseña</p>
            <p className="text-[12px] text-ink-500 mb-6" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              Enviaremos un enlace de recuperación a <strong className="text-ink-700">{email}</strong>
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowReset(false)}>
                Cancelar
              </Button>
              <button
                className="flex-1 py-2 rounded-lg text-white text-[14px] font-medium disabled:opacity-50"
                disabled={resetLoading}
                style={{
                  fontFamily: "'Inter Tight', sans-serif",
                  background: '#c41e3a',
                  cursor: resetLoading ? 'not-allowed' : 'pointer',
                }}
                onClick={async () => {
                  setResetLoading(true);
                  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
                  setResetLoading(false);
                  if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                  else { toast({ title: "Enlace enviado", description: "Revisa tu correo." }); setShowReset(false); }
                }}
              >
                {resetLoading ? "Enviando..." : "Enviar enlace"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <p
        className="fixed bottom-6 left-0 right-0 text-center"
        style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: '10px',
          color: '#a0a09e',
          letterSpacing: '0.05em',
        }}
      >
        ALMASA·OS · Phase 1 · Desde 1904
      </p>
    </div>
  );
};

export default Auth;
