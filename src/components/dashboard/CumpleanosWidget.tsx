import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Cake, Gift, CheckCircle } from "lucide-react";

const LOGO = "https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png";
const HEADER = `<tr><td style="padding:28px 36px;border-bottom:1px solid #eee;text-align:center"><p style="margin:0;color:#999;font-size:11px;font-style:italic;letter-spacing:1px">Desde 1904</p><img src="${LOGO}" alt="ALMASA" width="180" style="display:inline-block;max-width:180px;height:auto"/><p style="margin:4px 0 0;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:2px;font-weight:600">Trabajando por un México mejor</p></td></tr>`;
const FOOTER = `<tr><td style="padding:16px 36px;border-top:1px solid #eee"><p style="margin:0;color:#999;font-size:10px">Abarrotes La Manita, S.A. de C.V. | Melchor Ocampo #59, CDMX | Tel: 55 5552-0168</p></td></tr>`;
const WRAP = (body: string) => `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0">${HEADER}<tr><td style="padding:32px 36px">${body}</td></tr>${FOOTER}</table></td></tr></table>`;
const FIRMA = `<p style="color:#222;font-size:14px;margin:0 0 4px">Con aprecio,</p><p style="color:#222;font-size:14px;font-weight:700;margin:0 0 2px">José Antonio Gómez Ortega</p><p style="color:#888;font-size:12px;margin:0">Director General</p><p style="color:#888;font-size:12px;margin:0">Abarrotes La Manita, S.A. de C.V.</p>`;

interface EmpleadoCumple {
  id: string; nombre_completo: string; puesto: string; email: string | null;
  fecha_nacimiento: string; fecha_ingreso: string;
  diasParaCumple: number; cumpleHoy: boolean;
  aniversario?: { anos: number; cumpleHoy: boolean; dias: number };
}

function getMexicoDate(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
}

function diasHasta(m: number, d: number, hoy: Date): number {
  const este = new Date(hoy.getFullYear(), m - 1, d);
  if (este < hoy) este.setFullYear(este.getFullYear() + 1);
  const diff = Math.ceil((este.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 365 ? 0 : diff;
}

function lsKey(type: string, id: string) {
  const d = getMexicoDate().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  return `${type}_${id}_${d}`;
}

export function CumpleanosWidget() {
  const [empleados, setEmpleados] = useState<EmpleadoCumple[]>([]);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const autoSentRef = useRef(false);

  useEffect(() => {
    // Load already-sent
    const keys = Object.keys(localStorage).filter(k => k.startsWith("cumple_") || k.startsWith("aniv_"));
    const sent = new Set<string>();
    const hoyStr = getMexicoDate().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    keys.forEach(k => { if (k.endsWith(hoyStr)) sent.add(k); });
    setEnviados(sent);

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
        const [, m, d] = emp.fecha_nacimiento.split("-").map(Number);
        const dias = diasHasta(m, d, hoy);

        let aniversario: EmpleadoCumple["aniversario"] = undefined;
        if (emp.fecha_ingreso) {
          const [iy, im, id] = emp.fecha_ingreso.split("-").map(Number);
          const diasAniv = diasHasta(im, id, hoy);
          if (diasAniv <= 14) {
            const anos = diasAniv === 0 ? hoy.getFullYear() - iy : hoy.getFullYear() - iy + (new Date(hoy.getFullYear(), im - 1, id) < hoy ? 1 : 0);
            if (anos > 0) aniversario = { anos, cumpleHoy: diasAniv === 0, dias: diasAniv };
          }
        }

        if (dias <= 14 || aniversario) {
          resultado.push({ ...emp, diasParaCumple: dias, cumpleHoy: dias === 0, aniversario });
        }
      }
      resultado.sort((a, b) => a.diasParaCumple - b.diasParaCumple);
      setEmpleados(resultado);
    };
    load();
  }, []);

  // Auto-send emails for today's birthdays and anniversaries
  useEffect(() => {
    if (autoSentRef.current || empleados.length === 0) return;
    autoSentRef.current = true;

    const autoSend = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      for (const emp of empleados) {
        // Auto-send birthday
        if (emp.cumpleHoy && !localStorage.getItem(lsKey("cumple", emp.id))) {
          try {
            if (emp.email) {
              await supabase.functions.invoke("gmail-api", {
                body: {
                  action: "send", email: "1904@almasa.com.mx", to: emp.email,
                  subject: `¡Feliz cumpleaños, ${emp.nombre_completo}! — ALMASA`,
                  body: WRAP(`<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Estimado/a <strong>${emp.nombre_completo}</strong>,</p><p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">En nombre de toda la familia ALMASA, te deseamos un muy feliz cumpleaños.</p><p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Agradecemos tu esfuerzo y dedicación como <strong>${emp.puesto}</strong>. Esperamos que este día esté lleno de alegría y que sigas cosechando éxitos con nosotros.</p><p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 28px">¡Muchas felicidades!</p>${FIRMA}`),
                },
              });
            }
            // Notify all other employees
            const allRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?activo=eq.true&select=email&email=not.is.null&id=neq.${emp.id}`, {
              headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
            });
            const allEmps = await allRes.json();
            if (Array.isArray(allEmps)) {
              for (const other of allEmps) {
                if (!other.email) continue;
                await supabase.functions.invoke("gmail-api", {
                  body: {
                    action: "send", email: "1904@almasa.com.mx", to: other.email,
                    subject: `¡Hoy es cumpleaños de ${emp.nombre_completo}! — ALMASA`,
                    body: WRAP(`<p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 16px">¡Hoy <strong>${emp.nombre_completo}</strong> de <strong>${emp.puesto}</strong> cumple años! Felicítalo/a.</p><p style="color:#888;font-size:12px;margin:0">Abarrotes La Manita, S.A. de C.V.</p>`),
                  },
                });
              }
            }
            localStorage.setItem(lsKey("cumple", emp.id), "1");
            setEnviados(prev => new Set([...prev, lsKey("cumple", emp.id)]));
          } catch (e) { console.warn("Error auto-send cumple:", e); }
        }

        // Auto-send anniversary
        if (emp.aniversario?.cumpleHoy && !localStorage.getItem(lsKey("aniv", emp.id))) {
          try {
            if (emp.email) {
              await supabase.functions.invoke("gmail-api", {
                body: {
                  action: "send", email: "1904@almasa.com.mx", to: emp.email,
                  subject: `¡Feliz aniversario, ${emp.nombre_completo}! — ${emp.aniversario.anos} años en ALMASA`,
                  body: WRAP(`<p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Estimado/a <strong>${emp.nombre_completo}</strong>,</p><p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Hoy cumples <strong>${emp.aniversario.anos} años</strong> formando parte de la familia ALMASA. Agradecemos profundamente tu lealtad, compromiso y dedicación durante todo este tiempo.</p><p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 20px">Tu trabajo como <strong>${emp.puesto}</strong> ha sido fundamental para el crecimiento de nuestra empresa.</p><p style="color:#444;font-size:14px;line-height:1.8;margin:0 0 28px">¡Felicidades y que vengan muchos años más!</p>${FIRMA}`),
                },
              });
            }
            localStorage.setItem(lsKey("aniv", emp.id), "1");
            setEnviados(prev => new Set([...prev, lsKey("aniv", emp.id)]));
          } catch (e) { console.warn("Error auto-send aniv:", e); }
        }
      }
    };
    autoSend();
  }, [empleados]);

  if (empleados.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Cake className="h-4 w-4" />
        Cumpleaños y aniversarios
      </h3>
      <div className="space-y-2">
        {empleados.map((emp) => (
          <div key={emp.id} className={`flex items-center justify-between p-3 rounded-md ${emp.cumpleHoy ? "bg-amber-50 border border-amber-200" : "bg-muted/50"}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`truncate ${emp.cumpleHoy ? "text-amber-900 font-bold text-base" : "font-medium text-sm"}`}>
                  {emp.nombre_completo}
                </span>
                {emp.cumpleHoy && <Badge className="bg-amber-500 text-white text-xs shrink-0">Hoy</Badge>}
              </div>
              <div className={`text-xs ${emp.cumpleHoy ? "text-amber-700" : "text-muted-foreground"}`}>
                {emp.puesto}
                {emp.cumpleHoy ? " — ¡Cumple años hoy!" : ` — Cumple el ${emp.fecha_nacimiento.split("-")[2]}/${emp.fecha_nacimiento.split("-")[1]} (en ${emp.diasParaCumple} días)`}
              </div>
              {emp.aniversario && (
                <div className={`text-xs flex items-center gap-1 ${emp.aniversario.cumpleHoy ? "text-amber-700 font-medium" : "text-muted-foreground"}`}>
                  <Gift className="h-3 w-3" />
                  {emp.aniversario.cumpleHoy
                    ? `¡Cumple ${emp.aniversario.anos} años en ALMASA!`
                    : `${emp.aniversario.anos} años en ALMASA (en ${emp.aniversario.dias} días)`}
                </div>
              )}
            </div>
            <div className="shrink-0 ml-2">
              {emp.cumpleHoy && enviados.has(lsKey("cumple", emp.id)) && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Enviado
                </Badge>
              )}
              {emp.aniversario?.cumpleHoy && enviados.has(lsKey("aniv", emp.id)) && !emp.cumpleHoy && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Enviado
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
