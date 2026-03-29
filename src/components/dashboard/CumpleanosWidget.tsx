import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Cake, Gift, Send } from "lucide-react";

interface EmpleadoCumple {
  id: string;
  nombre_completo: string;
  puesto: string;
  email: string | null;
  fecha_nacimiento: string;
  fecha_ingreso: string;
  diasParaCumple: number;
  cumpleHoy: boolean;
  aniversario?: { anos: number; cumpleHoy: boolean; dias: number };
}

function getMexicoDate(): Date {
  const now = new Date();
  const mx = new Date(now.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  return mx;
}

function diasHasta(mesRef: number, diaRef: number, hoy: Date): number {
  const este = new Date(hoy.getFullYear(), mesRef - 1, diaRef);
  if (este < hoy) este.setFullYear(este.getFullYear() + 1);
  const diff = Math.ceil((este.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return diff === 365 || diff === 366 ? 0 : diff;
}

export function CumpleanosWidget() {
  const { toast } = useToast();
  const [empleados, setEmpleados] = useState<EmpleadoCumple[]>([]);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    // Load already-sent from localStorage
    const hoyKey = getMexicoDate().toISOString().split("T")[0];
    const stored = localStorage.getItem(`cumple_enviados_${hoyKey}`);
    if (stored) setEnviados(new Set(JSON.parse(stored)));

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?activo=eq.true&select=id,nombre_completo,puesto,email,fecha_nacimiento,fecha_ingreso`, {
        headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const hoy = getMexicoDate();
      hoy.setHours(0, 0, 0, 0);

      const resultado: EmpleadoCumple[] = [];
      for (const emp of data) {
        if (!emp.fecha_nacimiento) continue;
        const [y, m, d] = emp.fecha_nacimiento.split("-").map(Number);
        const dias = diasHasta(m, d, hoy);
        const cumpleHoy = dias === 0;

        // Aniversario de ingreso
        let aniversario: EmpleadoCumple["aniversario"] = undefined;
        if (emp.fecha_ingreso) {
          const [iy, im, id] = emp.fecha_ingreso.split("-").map(Number);
          const diasAniv = diasHasta(im, id, hoy);
          if (diasAniv <= 14) {
            const anos = hoy.getFullYear() - iy + (diasAniv === 0 ? 0 : (new Date(hoy.getFullYear(), im - 1, id) < hoy ? 1 : 0));
            aniversario = { anos: diasAniv === 0 ? hoy.getFullYear() - iy : anos, cumpleHoy: diasAniv === 0, dias: diasAniv };
          }
        }

        if (dias <= 14 || aniversario) {
          resultado.push({ ...emp, diasParaCumple: dias, cumpleHoy, aniversario });
        }
      }

      resultado.sort((a, b) => a.diasParaCumple - b.diasParaCumple);
      setEmpleados(resultado);
    };
    load();
  }, []);

  const handleEnviarFelicitacion = async (emp: EmpleadoCumple) => {
    setSending(emp.id);
    try {
      // Email 1: Al cumpleañero
      if (emp.email) {
        await supabase.functions.invoke("gmail-api", {
          body: {
            action: "send", email: "1904@almasa.com.mx", to: emp.email,
            subject: `¡Feliz cumpleaños, ${emp.nombre_completo}! — ALMASA`,
            body: `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0">
<tr><td style="padding:28px 36px;border-bottom:1px solid #eee;text-align:center"><p style="margin:0;color:#999;font-size:11px;font-style:italic;letter-spacing:1px">Desde 1904</p><img src="https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png" alt="ALMASA" width="180" style="display:inline-block;max-width:180px;height:auto"/></td></tr>
<tr><td style="padding:32px 36px">
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Estimado/a <strong>${emp.nombre_completo}</strong>,</p>
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">En nombre de toda la familia ALMASA, te deseamos un muy feliz cumpleaños.</p>
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Agradecemos tu esfuerzo y dedicación como <strong>${emp.puesto}</strong>. Esperamos que este día esté lleno de alegría y que sigas cosechando éxitos con nosotros.</p>
<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 28px">¡Muchas felicidades!</p>
<p style="color:#222;font-size:14px;margin:0 0 4px">Con aprecio,</p>
<p style="color:#222;font-size:14px;font-weight:700;margin:0 0 2px">José Antonio Gómez Ortega</p>
<p style="color:#888;font-size:12px;margin:0">Director General</p>
<p style="color:#888;font-size:12px;margin:0">Abarrotes La Manita, S.A. de C.V.</p>
</td></tr>
<tr><td style="padding:16px 36px;border-top:1px solid #eee"><p style="margin:0;color:#999;font-size:10px">Abarrotes La Manita, S.A. de C.V. | Melchor Ocampo #59, CDMX</p></td></tr>
</table></td></tr></table>`,
          },
        });
      }

      // Email 2: A todos los demás empleados con email
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const allRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?activo=eq.true&email=neq.null&id=neq.${emp.id}&select=email`, {
          headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
        });
        const allEmps = await allRes.json();
        if (Array.isArray(allEmps)) {
          const emails = allEmps.map((e: any) => e.email).filter(Boolean);
          for (const to of emails) {
            await supabase.functions.invoke("gmail-api", {
              body: {
                action: "send", email: "1904@almasa.com.mx", to,
                subject: `¡Hoy es cumpleaños de ${emp.nombre_completo}! — ALMASA`,
                body: `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0">
<tr><td style="padding:28px 36px">
<p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 16px">Hoy <strong>${emp.nombre_completo}</strong> de <strong>${emp.puesto}</strong> cumple años. ¡Felicítalo/a!</p>
<p style="color:#888;font-size:12px;margin:0">Abarrotes La Manita, S.A. de C.V.</p>
</td></tr>
</table></td></tr></table>`,
              },
            });
          }
        }
      }

      // Mark as sent
      const hoyKey = getMexicoDate().toISOString().split("T")[0];
      const newSet = new Set(enviados);
      newSet.add(emp.id);
      setEnviados(newSet);
      localStorage.setItem(`cumple_enviados_${hoyKey}`, JSON.stringify([...newSet]));

      toast({ title: "Felicitaciones enviadas", description: `Email enviado a ${emp.nombre_completo} y al equipo.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  if (empleados.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Cake className="h-4 w-4" />
        Cumpleaños y aniversarios
      </h3>
      <div className="space-y-2">
        {empleados.map((emp) => (
          <div key={emp.id} className={`flex items-center justify-between p-2 rounded-md text-sm ${emp.cumpleHoy ? "bg-yellow-50 border border-yellow-200" : "bg-muted/50"}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{emp.nombre_completo}</span>
                {emp.cumpleHoy && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">Hoy</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {emp.puesto}
                {emp.cumpleHoy ? " — ¡Cumple años hoy!" : ` — Cumple el ${emp.fecha_nacimiento.split("-")[2]}/${emp.fecha_nacimiento.split("-")[1]} (en ${emp.diasParaCumple} días)`}
              </div>
              {emp.aniversario && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  {emp.aniversario.cumpleHoy
                    ? `¡Cumple ${emp.aniversario.anos} años en ALMASA!`
                    : `${emp.aniversario.anos} años en ALMASA (en ${emp.aniversario.dias} días)`}
                </div>
              )}
            </div>
            {emp.cumpleHoy && !enviados.has(emp.id) && (
              <Button size="sm" variant="outline" className="shrink-0 text-xs" disabled={sending === emp.id}
                onClick={() => handleEnviarFelicitacion(emp)}>
                <Send className="h-3 w-3 mr-1" />
                {sending === emp.id ? "Enviando..." : "Felicitar"}
              </Button>
            )}
            {emp.cumpleHoy && enviados.has(emp.id) && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-300">Enviado</Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
