import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

export function CumpleanosBanner() {
  const [nombre, setNombre] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = async () => {
      // Check if already dismissed today
      const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
      if (sessionStorage.getItem(`cumple_banner_${hoy}`)) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Find empleado linked to this user
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?user_id=eq.${user.id}&activo=eq.true&select=nombre_completo,fecha_nacimiento`, {
        headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
      });
      const emps = await res.json();
      if (!Array.isArray(emps) || !emps[0]?.fecha_nacimiento) return;

      const emp = emps[0];
      const [, m, d] = emp.fecha_nacimiento.split("-").map(Number);
      const mx = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
      if (mx.getMonth() + 1 === m && mx.getDate() === d) {
        setNombre(emp.nombre_completo);
        setVisible(true);
      }
    };
    check();
  }, []);

  const dismiss = () => {
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    sessionStorage.setItem(`cumple_banner_${hoy}`, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-b border-yellow-200 px-4 py-3 flex items-center justify-between">
      <p className="text-sm font-medium text-yellow-900">
        ¡Feliz cumpleaños, <strong>{nombre}</strong>! La familia ALMASA te desea un excelente día.
      </p>
      <button onClick={dismiss} className="text-yellow-700 hover:text-yellow-900 p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
