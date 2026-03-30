import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLES = [
  { value: "vendedor", label: "Vendedor" },
  { value: "secretaria", label: "Secretaria" },
  { value: "almacen", label: "Almacenista" },
  { value: "gerente_almacen", label: "Gerente Almacén" },
  { value: "chofer", label: "Chofer" },
  { value: "contadora", label: "Contadora" },
  { value: "admin", label: "Administrador" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleadoId: string;
  empleadoNombre: string;
  empleadoEmail: string | null;
  empleadoPuesto?: string;
  onCreated: () => void;
}

const PUESTO_TO_ROLE: Record<string, string> = {
  "Vendedor": "vendedor", "Secretaria": "secretaria", "Chofer": "chofer",
  "Almacenista": "almacen", "Gerente de Almacén": "gerente_almacen",
  "Ayudante de Chofer": "chofer",
};

export const DarAccesoSistemaDialog = ({ open, onOpenChange, empleadoId, empleadoNombre, empleadoEmail, empleadoPuesto, onCreated }: Props) => {
  const [email, setEmail] = useState(empleadoEmail || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(empleadoPuesto ? (PUESTO_TO_ROLE[empleadoPuesto] || "vendedor") : "vendedor");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Reset when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEmail(empleadoEmail || "");
      setPassword("");
      setRole(empleadoPuesto ? (PUESTO_TO_ROLE[empleadoPuesto] || "vendedor") : "vendedor");
    }
    onOpenChange(open);
  };

  const handleCrear = async () => {
    if (!email || !password || !role) {
      toast({ variant: "destructive", title: "Error", description: "Completa todos los campos" });
      return;
    }
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión expirada");

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email,
          password,
          full_name: empleadoNombre,
          role,
          empleado_id: empleadoId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Acceso creado", description: `${empleadoNombre} ahora puede acceder como ${ROLES.find(r => r.value === role)?.label}` });
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al crear acceso", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Dar acceso al sistema
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">Crear cuenta de acceso para <strong>{empleadoNombre}</strong></p>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Email de acceso al sistema</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@almasa.com.mx" />
            <p className="text-xs text-muted-foreground">Puede ser diferente al email personal del empleado</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contraseña</Label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleCrear} disabled={saving || !email || !password}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Crear acceso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
