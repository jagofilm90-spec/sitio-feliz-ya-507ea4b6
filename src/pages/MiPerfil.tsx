import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Lock } from "lucide-react";

const colors = ["#E24B4A", "#D85A30", "#BA7517", "#639922", "#1D9E75", "#378ADD", "#7F77DD", "#D4537E"];
const getColor = (n: string) => colors[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
const getInitials = (n: string) => { const p = n.split(" ").filter(Boolean); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.substring(0, 2).toUpperCase(); };

export default function MiPerfil() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [empleado, setEmpleado] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [showPassDialog, setShowPassDialog] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);

      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      setProfile(p);

      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      setRoles((r || []).map((x: any) => x.role));

      // Find linked employee
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?user_id=eq.${u.id}&select=*&limit=1`, {
          headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
        });
        const emps = await res.json();
        if (Array.isArray(emps) && emps[0]) {
          setEmpleado(emps[0]);
          // Try employee photo
          const { data: blob } = await supabase.storage.from("empleados-documentos").download(`${emps[0].id}/foto.jpg`);
          if (blob) setFotoUrl(URL.createObjectURL(blob));
        }
      }
    };
    load();
  }, []);

  const handleChangePassword = async () => {
    if (newPass.length < 6) { toast({ title: "Error", description: "Mínimo 6 caracteres", variant: "destructive" }); return; }
    if (newPass !== confirmPass) { toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" }); return; }
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setPassLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Contraseña actualizada" }); setShowPassDialog(false); setNewPass(""); setConfirmPass(""); }
  };

  const handleUploadFoto = async (file: File) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    try { await new Promise((res, rej) => { img.onload = res; img.onerror = rej; }); } catch { return; }
    const canvas = document.createElement("canvas"); canvas.width = 200; canvas.height = 200;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#FFF"; ctx.fillRect(0, 0, 200, 200);
    const sz = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - sz) / 2, (img.height - sz) / 2, sz, sz, 0, 0, 200, 200);
    URL.revokeObjectURL(img.src);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const path = empleado ? `${empleado.id}/foto.jpg` : `profiles/${user.id}/foto.jpg`;
      await supabase.storage.from("empleados-documentos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      setFotoUrl(URL.createObjectURL(blob));
      toast({ title: "Foto actualizada" });
    }, "image/jpeg", 0.85);
  };

  const nombre = profile?.full_name || empleado?.nombre_completo || user?.email || "";
  const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));

  let antiguedad = "";
  if (empleado?.fecha_ingreso) {
    const [iy, im, id] = empleado.fecha_ingreso.split("-").map(Number);
    const ingreso = new Date(iy, im - 1, id);
    const totalMeses = Math.floor((hoy.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const anos = Math.floor(totalMeses / 12), meses = totalMeses % 12;
    antiguedad = anos > 0 ? `${anos} año${anos !== 1 ? "s" : ""}${meses > 0 ? `, ${meses} mes${meses !== 1 ? "es" : ""}` : ""}` : `${meses} mes${meses !== 1 ? "es" : ""}`;
  }

  const ROLE_LABELS: Record<string, string> = { admin: "Administrador", secretaria: "Secretaria", vendedor: "Vendedor", chofer: "Chofer", almacen: "Almacenista", gerente_almacen: "Gerente Almacén", contadora: "Contadora" };

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative shrink-0">
                {fotoUrl ? (
                  <img src={fotoUrl} className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: getColor(nombre) }}>
                    {getInitials(nombre)}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-white border rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-sm">
                  <Pencil className="h-3.5 w-3.5 text-gray-600" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUploadFoto(e.target.files[0]); e.target.value = ""; }} />
                </label>
              </div>
              <div>
                <h2 className="text-xl font-bold">{nombre}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {roles.map(r => <Badge key={r} variant="outline" className="text-xs">{ROLE_LABELS[r] || r}</Badge>)}
                </div>
              </div>
            </div>

            {empleado && (
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Puesto</span><span className="font-medium">{empleado.puesto}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fecha de ingreso</span><span>{empleado.fecha_ingreso?.split("-").reverse().join("/")}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Antigüedad</span><span>{antiguedad}</span></div>
                {empleado.telefono && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Teléfono</span><span>{empleado.telefono}</span></div>}
                {empleado.email && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email personal</span><span className="break-all">{empleado.email}</span></div>}
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <Button variant="outline" className="w-full" onClick={() => setShowPassDialog(true)}>
                <Lock className="h-4 w-4 mr-2" /> Cambiar contraseña
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPassDialog} onOpenChange={setShowPassDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cambiar contraseña</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nueva contraseña</Label><Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
            <div><Label>Confirmar contraseña</Label><Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPassDialog(false)}>Cancelar</Button>
              <Button onClick={handleChangePassword} disabled={passLoading}>{passLoading ? "Guardando..." : "Cambiar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
